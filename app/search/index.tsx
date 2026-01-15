// app/search/index.tsx
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth, db } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

const { width } = Dimensions.get('window');

// 아이콘
const BackIcon = () => <Feather name="chevron-left" size={22} color="#666" />;
const SearchIcon = () => <Feather name="search" size={16} color="#666" />;

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
  for (const emoji of EMOTION_EMOJIS) {
    if (s.includes(emoji)) return emoji;
  }
  return null;
};

const cleanLabel = (s: string): string => {
  if (!s) return '';
  let cleaned = s;
  EMOTION_EMOJIS.forEach((emoji) => {
    cleaned = cleaned.replace(emoji, '');
  });
  return cleaned.trim();
};

type EmotionItem = { emoji: string; label: string; count: number };
type TagItem = { label: string; count: number };

export default function SearchPage() {
  const [searchText, setSearchText] = useState('');
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [emotions, setEmotions] = useState<EmotionItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Firestore에서 현재 유저의 감정/태그 집계
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setEmotions([]);
        setTags([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const colRef = collection(db, 'users', user.uid, 'diaries');
        const firestoreQuery = query(colRef, orderBy('diaryDate', 'desc'));
        const snapshot = await getDocs(firestoreQuery);

        const emotionCounts: Record<string, EmotionItem> = {};
        const tagCounts: Record<string, number> = {};

        snapshot.forEach((doc) => {
          const data = doc.data() as any;

          // --- 감정 집계 ---
          const raw = (data?.emotion ?? '').toString();
          if (raw) {
            const savedEmoji = extractEmoji(raw);
            const labelOnly = cleanLabel(raw);

            let finalLabel = '';
            let finalEmoji = '';

            const knownEmotion = Object.keys(EMOJI_MAP).find(
              (key) => labelOnly.includes(key) || raw.includes(key)
            );

            if (knownEmotion) {
              finalLabel = knownEmotion;
              finalEmoji = EMOJI_MAP[knownEmotion];
            } else if (labelOnly) {
              finalLabel = labelOnly;
              finalEmoji = savedEmoji || '🙂';
            } else if (savedEmoji) {
              finalLabel = '감정';
              finalEmoji = savedEmoji;
            }

            if (finalLabel) {
              if (!emotionCounts[finalLabel]) {
                emotionCounts[finalLabel] = {
                  emoji: finalEmoji,
                  label: finalLabel,
                  count: 0,
                };
              }
              emotionCounts[finalLabel].count += 1;
            }
          }

          // --- 태그 집계 ---
          const docTags = Array.isArray(data?.tags) ? (data.tags as string[]) : [];
          for (const t of docTags) {
            let normalized = String(t ?? '').trim().replace(/^#/, '').toLowerCase();
            if (!normalized) continue;
            tagCounts[normalized] = (tagCounts[normalized] ?? 0) + 1;
          }
        });

        const sortedEmotions = Object.values(emotionCounts).sort((a, b) => b.count - a.count);
        setEmotions(sortedEmotions);

        const sortedTags = Object.entries(tagCounts)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count);
        setTags(sortedTags); // 실데이터
      } catch (error) {
        console.error('감정/태그 데이터 로딩 실패:', error);
        setEmotions([]);
        setTags([]);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const handleSearch = () => {
    if (searchText.trim()) {
      router.push({
        pathname: '/search/text_results',
        params: { query: searchText.trim() },
      });
    }
  };

  const handleEmotionPress = (emotion: EmotionItem) => {
    router.push({
      pathname: '/search/tag_results',
      params: {
        query: emotion.label,
        type: 'emotion',
        emoji: emotion.emoji,
      },
    });
  };

  const handleTagPress = (tag: TagItem) => {
    router.push({
      pathname: '/search/tag_results',
      params: {
        query: tag.label,
        type: 'tag',
      },
    });
  };

  const renderEmotionSection = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#666" />
          <Text style={styles.loadingText}>감정 데이터를 불러오는 중...</Text>
        </View>
      );
    }

    if (emotions.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>아직 작성한 일기가 없어요</Text>
          <Text style={styles.emptySubText}>일기를 작성하면 감정별로 검색할 수 있어요</Text>
        </View>
      );
    }

    return (
      <View style={styles.emotionGrid}>
        {emotions.map((item, idx) => (
          <TouchableOpacity
            key={`${item.label}-${idx}`}
            style={styles.emotionItem}
            onPress={() => handleEmotionPress(item)}
            activeOpacity={0.7}
          >
            <Text style={styles.emotionEmoji}>{item.emoji}</Text>
            <Text style={styles.emotionLabel}>
              {item.label} {item.count}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
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
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* 감정 섹션 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>감정</Text>
          {renderEmotionSection()}
        </View>

        {/* 태그 섹션 (실데이터만 표시) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>태그</Text>
          {tags.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>태그가 아직 없어요</Text>
              <Text style={styles.emptySubText}>일기에 태그를 추가하면 여기서 검색할 수 있어요</Text>
            </View>
          ) : (
            <View style={styles.tagGrid}>
              {tags.map((item, index) => (
                <TouchableOpacity
                  key={`${item.label}-${index}`}
                  style={styles.tagItem}
                  onPress={() => handleTagPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.tagImagePlaceholder}>
                    <Text style={styles.tagImageText}>{item.label[0]}</Text>
                  </View>
                  <Text style={styles.tagLabel}>
                    {item.label} {item.count}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 3,
    backgroundColor: 'white',
    marginTop: 35
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginLeft: 12,
    height: 40,
  },
  searchInput: { flex: 1, fontSize: 13, marginLeft: 8, color: '#333' },
  content: { flex: 1, backgroundColor: 'white' },
  section: { paddingHorizontal: 16, paddingVertical: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16 },

  loadingContainer: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { fontSize: 14, color: '#666', marginTop: 8 },

  emptyContainer: { alignItems: 'center', paddingVertical: 20 },
  emptyText: { fontSize: 16, color: '#999', marginBottom: 4 },
  emptySubText: { fontSize: 14, color: '#bbb', textAlign: 'center' },

  emotionGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  emotionItem: {
    width: (width - 48) / 5,
    alignItems: 'center',
    marginBottom: 20,
    paddingVertical: 4,
  },
  emotionEmoji: { fontSize: 32, marginBottom: 8 },
  emotionLabel: { fontSize: 12, color: '#666', textAlign: 'center' },

  tagGrid: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', rowGap: 16 },
  tagItem: { alignItems: 'center', width: (width - 64) / 3 },
  tagImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#deb887',
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tagImageText: { fontSize: 20, fontWeight: 'bold', color: '#8B4513' },
  tagLabel: { fontSize: 12, color: '#666', textAlign: 'center' },
});
