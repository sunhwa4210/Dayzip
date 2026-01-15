import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { auth, db, storage } from '@/firebase';
import { Feather } from '@expo/vector-icons';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

const BackIcon = () => <Feather name="chevron-left" size={22} color="#666" />;
const SearchIcon = () => <Feather name="search" size={16} color="#666" />;
const CloseIcon = () => <Text style={styles.icon}>×</Text>;
const HeartIcon = () => <Text style={styles.icon}>🧡</Text>;
const TagIcon = () => <Text style={styles.icon}>#</Text>;
const EmojiIcon = () => <Text style={styles.icon}>😊</Text>;
const MicIcon = () => <Text style={styles.icon}>🎤</Text>;

// Firebase에서 가져온 일기 데이터 타입
interface DiaryData {
  id: string;
  content: string;
  emotion: string;
  diaryDate: any; // Firestore Timestamp
  imageUrl: string;
  createdAt: any;
}

// 화면에 표시할 검색 결과 타입
interface SearchResult {
  id: string;
  title: string;
  content: string;
  date: string;
  emotion: string;
  emotionEmoji: string;
  emotionLabel: string;
  imageUrl?: string;
}

interface FilterData {
  label: string;
  active: boolean;
  type: 'content' | 'emotion' | 'date' | 'all';
}

// 앱에서 사용하는 감정 이모지들
const EMOTION_EMOJIS = ['😊', '😍', '😌', '😭', '😠', '😰', '😕', '😐', '🤯'];

// 감정 이모지 매핑
const EMOJI_MAP: Record<string, string> = {
  기쁨: '😊',
  사랑: '😍', 
  평온: '😌',
  슬픔: '😭',
  분노: '😠',
  두려움: '😰',
  혼란: '😕',
  무감정: '😐',
  벅참: '🤯',
};

// 앱에서 사용하는 이모지만 추출
const extractEmoji = (s: string): string | null => {
  if (!s) return null;
  
  // 앱에서 사용하는 이모지 중 첫 번째로 발견되는 것 반환
  for (const emoji of EMOTION_EMOJIS) {
    if (s.includes(emoji)) {
      return emoji;
    }
  }
  return null;
};

const cleanLabel = (s: string): string => {
  if (!s) return '';
  let cleaned = s;
  // 앱에서 사용하는 이모지들 제거
  EMOTION_EMOJIS.forEach(emoji => {
    cleaned = cleaned.replace(emoji, '');
  });
  return cleaned.trim();
};

// Storage URL에서 경로 추출
const toObjectPath = (url?: string | null) => {
  if (!url) return null;
  const match = url.match(/\/o\/([^?]+)/);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
};

export default function TextSearchResultsPage() {
  const params = useLocalSearchParams();
  const { query: searchQuery } = params;
  
  const [searchText, setSearchText] = useState(searchQuery as string || '');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allDiaries, setAllDiaries] = useState<DiaryData[]>([]);
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [activeFilter, setActiveFilter] = useState<'content' | 'emotion' | 'date' | 'all'>('all');

  // 필터 데이터
  const filters: FilterData[] = [
    { label: '전체', active: activeFilter === 'all', type: 'all' },
    { label: '내용', active: activeFilter === 'content', type: 'content' },
    { label: '감정', active: activeFilter === 'emotion', type: 'emotion' },
    { label: '날짜', active: activeFilter === 'date', type: 'date' },
  ];

  // Firebase에서 사용자 일기 데이터 가져오기
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setAllDiaries([]);
        setSearchResults([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const colRef = collection(db, 'users', user.uid, 'diaries');
        const q = query(colRef, orderBy('diaryDate', 'desc'));
        const snapshot = await getDocs(q);

        const diaries: DiaryData[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data() as any;
          diaries.push({
            id: doc.id,
            content: data.content || '',
            emotion: data.emotion || '',
            diaryDate: data.diaryDate,
            imageUrl: data.imageUrl || '',
            createdAt: data.createdAt,
          });
        });

        setAllDiaries(diaries);
      } catch (error) {
        console.error('일기 데이터 로딩 실패:', error);
        setAllDiaries([]);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // 검색 수행
  useEffect(() => {
    if (!searchText.trim() || allDiaries.length === 0) {
      setSearchResults([]);
      return;
    }

    performSearch(searchText, activeFilter);
  }, [searchText, allDiaries, activeFilter]);

  const performSearch = async (searchQueryText: string, filterType: 'content' | 'emotion' | 'date' | 'all') => {
    if (!searchQueryText.trim()) {
      setSearchResults([]);
      return;
    }

    const query_lower = searchQueryText.toLowerCase();
    
    // 필터에 따른 검색
    const filtered = allDiaries.filter((diary) => {
      switch (filterType) {
        case 'content':
          return diary.content.toLowerCase().includes(query_lower);
        case 'emotion':
          const emotionLabel = cleanLabel(diary.emotion).toLowerCase();
          return emotionLabel.includes(query_lower);
        case 'date':
          const dateStr = formatDate(diary.diaryDate);
          return dateStr.includes(searchQueryText);
        case 'all':
        default:
          const contentMatch = diary.content.toLowerCase().includes(query_lower);
          const emotionMatch = cleanLabel(diary.emotion).toLowerCase().includes(query_lower);
          const dateMatch = formatDate(diary.diaryDate).includes(searchQueryText);
          return contentMatch || emotionMatch || dateMatch;
      }
    });

    // 이미지 URL 처리 및 결과 변환
    const results = await Promise.all(
      filtered.map(async (diary) => {
        let processedImageUrl = diary.imageUrl;
        
        // Storage URL 재발급
        if (diary.imageUrl) {
          const path = toObjectPath(diary.imageUrl);
          if (path) {
            try {
              processedImageUrl = await getDownloadURL(ref(storage, path));
            } catch {
              processedImageUrl = diary.imageUrl; // 실패시 원본 URL 사용
            }
          }
        }

        const emotionEmoji = extractEmoji(diary.emotion) || '😊';
        const emotionLabel = cleanLabel(diary.emotion) || '감정';
        const dateStr = formatDate(diary.diaryDate);
        
        return {
          id: diary.id,
          title: diary.content.length > 30 
            ? diary.content.substring(0, 30) + '...' 
            : diary.content,
          content: diary.content,
          date: dateStr,
          emotion: diary.emotion,
          emotionEmoji,
          emotionLabel,
          imageUrl: processedImageUrl,
        };
      })
    );

    setSearchResults(results);
  };

  const formatDate = (timestamp: any): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const day = date.getDate();
      return `${year}년 ${month}월 ${day}일`;
    } catch {
      return '';
    }
  };

  const handleSearch = () => {
    if (searchText.trim()) {
      performSearch(searchText, activeFilter);
    }
  };

  const handleFilterPress = (filter: FilterData) => {
    setActiveFilter(filter.type);
  };

  const handleResultPress = (item: SearchResult) => {
    // 일기 상세보기로 이동 - 안전한 데이터 전달
    router.push({
      pathname: '/(tabs)/home/detail',
      params: { 
        diaryId: item.id, // id 대신 diaryId로 변경하여 충돌 방지
        diaryContent: item.content,
        diaryEmotion: item.emotion,
        diaryDate: item.date, // 이미 포맷된 문자열 전달
        diaryImageUrl: item.imageUrl || '',
        diaryEmotionEmoji: item.emotionEmoji,
        diaryEmotionLabel: item.emotionLabel,
      }
    });
  };

  const renderResultItem = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={styles.resultItem}
      onPress={() => handleResultPress(item)}
    >
      <View style={styles.resultImageContainer}>
        {item.imageUrl ? (
          <Image
            source={item.imageUrl}
            style={styles.resultImage}
            contentFit="cover"
            cachePolicy="disk"
          />
        ) : (
          <View style={styles.resultImagePlaceholder} />
        )}
      </View>
      <View style={styles.resultContent}>
        <Text style={styles.resultTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.resultSubtitle} numberOfLines={2}>
          {item.content}
        </Text>
        <View style={styles.resultMeta}>
          <Text style={styles.resultDate}>
            {item.date} • {item.emotionEmoji} {item.emotionLabel}
          </Text>
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.actionButton}>
              <HeartIcon />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
              <TagIcon />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>
        {searchText ? `"${searchText}"에 대한 검색 결과가 없습니다` : '검색어를 입력해주세요'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
    
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity 
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <BackIcon />
          </TouchableOpacity>
          <View style={styles.searchContainer}>
            <SearchIcon />
            <TextInput
              style={styles.searchInput}
              value={searchText}
              onChangeText={setSearchText}
              placeholder="일기 내용, 감정, 날짜 검색..."
              onSubmitEditing={handleSearch}
              onFocus={() => setIsSearchFocused(true)}
              onBlur={() => setIsSearchFocused(false)}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => setSearchText('')}>
                <CloseIcon />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* 필터 */}
        <View style={styles.filterContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {filters.map((filter, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.filterChip,
                  filter.active && styles.activeFilterChip
                ]}
                onPress={() => handleFilterPress(filter)}
              >
                <Text style={[
                  styles.filterText,
                  filter.active && styles.activeFilterText
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* 검색 결과 */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF8C42" />
            <Text style={styles.loadingText}>일기를 불러오는 중...</Text>
          </View>
        ) : (
          <FlatList
            data={searchResults}
            renderItem={renderResultItem}
            keyExtractor={(item) => item.id}
            style={styles.resultsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={searchResults.length === 0 ? styles.emptyContainer : undefined}
          />
        )}
        
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
    borderRadius: 20,
    minWidth: 40,
    minHeight: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginLeft: 12,
    height: 36,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 8,
    color: '#333',
  },
  filterContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  activeFilterChip: {
    backgroundColor: '#FF8C42',
    borderColor: '#FF8C42',
  },
  filterText: {
    fontSize: 14,
    color: '#495057',
  },
  activeFilterText: {
    color: 'white',
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  resultsList: {
    flex: 1,
    backgroundColor: 'white',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  resultItem: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f3f4',
  },
  resultImageContainer: {
    marginRight: 12,
  },
  resultImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  resultImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#B8C5A6',
    borderRadius: 8,
  },
  resultContent: {
    flex: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 4,
    lineHeight: 22,
  },
  resultSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 8,
    lineHeight: 20,
  },
  resultMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultDate: {
    fontSize: 12,
    color: '#6c757d',
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    marginLeft: 12,
    padding: 4,
  },
  keyboard: {
    backgroundColor: '#d1d3d6',
    paddingVertical: 8,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 6,
  },
  key: {
    width: 28,
    height: 36,
    backgroundColor: 'white',
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  specialKey: {
    width: 36,
    height: 36,
    backgroundColor: '#aeb2b8',
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  spaceKey: {
    flex: 1,
    height: 36,
    backgroundColor: 'white',
    margin: 2,
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  keyText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  bottomBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#d1d3d6',
  },
  bottomIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  icon: {
    fontSize: 18,
    color: '#666',
  },
  backIcon: {
    fontSize: 24,
    color: '#333',
    fontWeight: 'bold',
  },
});