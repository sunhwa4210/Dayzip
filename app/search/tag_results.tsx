// app/search/tag_results.tsx
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { auth, db, storage } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

const BackIcon = () => <Text style={styles.backIcon}>←</Text>;
const HeartIcon = () => <Text style={styles.icon}>🧡</Text>;
const BookmarkIcon = () => <Text style={styles.icon}>🔖</Text>;
const MoreIcon = () => <Text style={styles.icon}>⋯</Text>;

// 앱에서 사용하는 감정 이모지들
const EMOTION_EMOJIS = ['😊', '😍', '😌', '😭', '😠', '😰', '😕', '😐', '🤯'];
const EMOJI_MAP: Record<string, string> = {
  기쁨: '😊', 사랑: '😍', 평온: '😌', 슬픔: '😭', 분노: '😠', 두려움: '😰', 혼란: '😕', 무감정: '😐', 벅참: '🤯',
};

const extractEmoji = (s: string): string | null => {
  if (!s) return null;
  for (const emoji of EMOTION_EMOJIS) if (s.includes(emoji)) return emoji;
  return null;
};

const cleanLabel = (s: string): string => {
  if (!s) return '';
  let cleaned = s;
  EMOTION_EMOJIS.forEach((e) => { cleaned = cleaned.replace(e, ''); });
  return cleaned.trim();
};

/** downloadURL에서 storage object path 추출 (generated-images/xxx.png) */
const toObjectPath = (u?: string | null) => {
  if (!u) return null;
  const m = u.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};

type Post = {
  id: string;
  dateStr: string;
  emotionEmoji: string;
  emotionLabel: string;
  imageUrl?: string | null;
  content?: string;
  /** 화면 표시용 태그(원본을 정규화해서 # 없이 소문자) */
  tags: string[];
  /** 필터링용 정규화 태그 */
  tagsNorm: string[];
  originalEmotion?: string;
};

const normalizeTag = (t: string) =>
  String(t ?? '').trim().replace(/^#/, '').toLowerCase();

export default function TagResultsPage() {
  const params = useLocalSearchParams();
  const rawSearchQuery = Array.isArray(params.query) ? params.query[0] : params.query;
  const rawType = Array.isArray(params.type) ? params.type[0] : params.type;
  const rawEmoji = Array.isArray(params.emoji) ? params.emoji[0] : params.emoji;

  const selectedLabel = (rawSearchQuery || '').toString();
  const selectedEmoji = (rawEmoji || '').toString();
  const isEmotion = rawType === 'emotion';
  const selectedTagNorm = normalizeTag(selectedLabel);

  const [loading, setLoading] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);

  const headerTitle = useMemo(() => {
    if (isEmotion && selectedEmoji) return `${selectedEmoji} ${selectedLabel}`;
    return selectedLabel ? `#${selectedLabel}` : '결과';
  }, [isEmotion, selectedEmoji, selectedLabel]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { setPosts([]); setLoading(false); return; }

      try {
        setLoading(true);

        // 유저의 모든 일기(최신순) 가져오기
        const colRef = collection(db, 'users', u.uid, 'diaries');
        const firestoreQuery = query(colRef, orderBy('diaryDate', 'desc'));
        const snap = await getDocs(firestoreQuery);

        // 일단 가볍게 변환
        const candidates = snap.docs.map((doc) => {
          const d = doc.data() as any;

          // 감정 가공
          const raw = (d?.emotion ?? '').toString();
          const emoji = extractEmoji(raw) || '';
          const label = cleanLabel(raw) || raw || '';

          // 날짜
          const ts = d?.diaryDate?.toDate?.();
          const dateStr = ts
            ? `${ts.getFullYear()}. ${String(ts.getMonth() + 1).padStart(2, '0')}. ${String(ts.getDate()).padStart(2, '0')}.`
            : '';

          // 태그(배열) 정규화
          const tagsArray: string[] = Array.isArray(d?.tags) ? d.tags : [];
          const tagsNorm = tagsArray.map(normalizeTag).filter(Boolean);

          return {
            id: doc.id,
            rawUrl: d?.imageUrl as string | undefined,
            dateStr,
            emotionEmoji: emoji || '🙂',
            emotionLabel: label || '감정',
            content: d?.content || '',
            tags: tagsNorm,      // 화면에도 소문자/#제거 버전 사용
            tagsNorm,            // 필터용 동일 데이터
            originalEmotion: raw,
          } as Post & { rawUrl?: string };
        });

        // ★ 필터: 감정 or 태그
        const matches = (p: Post) => {
          if (isEmotion) {
            const e = p.emotionEmoji || '';
            const l = p.emotionLabel || '';
            if (selectedEmoji && e === selectedEmoji) return true;
            if (selectedLabel && (l === selectedLabel || l.includes(selectedLabel))) return true;
            return false;
          } else {
            // 태그 필터: 정규화된 태그에 정확히 포함
            if (!selectedTagNorm) return true;
            return p.tagsNorm?.some((t) => t === selectedTagNorm) ?? false;
          }
        };

        const filtered = candidates.filter(matches);

        // 이미지 URL 재발급
        const final = await Promise.all(
          filtered.map(async (p) => {
            const path = toObjectPath((p as any).rawUrl);
            if (!path) return { ...p, imageUrl: (p as any).rawUrl ?? null };
            try {
              const good = await getDownloadURL(ref(storage, path));
              return { ...p, imageUrl: good };
            } catch {
              return { ...p, imageUrl: (p as any).rawUrl ?? null };
            }
          })
        );

        setPosts(final);
      } catch (e) {
        console.warn('TagResults load error:', e);
        setPosts([]);
      } finally {
        setLoading(false);
      }
    });

    return unsub;
  }, [isEmotion, selectedEmoji, selectedLabel, selectedTagNorm]);

  // 일기 카드 클릭 시 상세화면
  const handlePostPress = (post: Post) => {
    const formatSimpleDate = (dateStr: string): string => {
      try {
        const parts = dateStr.split('.');
        if (parts.length >= 3) {
          const year = parseInt(parts[0]);
          const month = parseInt(parts[1]);
          const day = parseInt(parts[2]);
          return `${year}년 ${month}월 ${day}일`;
        }
        return dateStr;
      } catch {
        return dateStr;
      }
    };

    router.push({
      pathname: '/(tabs)/home/detail', // 프로젝트 라우트에 맞게 유지
      params: {
        diaryId: post.id,
        diaryContent: post.content || '',
        diaryEmotion: post.originalEmotion || post.emotionLabel,
        diaryDate: formatSimpleDate(post.dateStr),
        diaryImageUrl: post.imageUrl || '',
        diaryEmotionEmoji: post.emotionEmoji,
        diaryEmotionLabel: post.emotionLabel,
      },
    });
  };

  const renderPost = (post: Post) => (
    <TouchableOpacity
      key={post.id}
      style={styles.postCard}
      onPress={() => handlePostPress(post)}
      activeOpacity={0.7}
    >
      {/* 이미지 */}
      <View style={styles.imageContainer}>
        {post.imageUrl ? (
          <Image
            source={post.imageUrl}
            style={styles.image}
            contentFit="cover"
            cachePolicy="disk"
            transition={200}
          />
        ) : (
          <View style={styles.imagePlaceholder} />
        )}

        {/* 이미지 오버레이: 날짜 & 감정 */}
        <View style={styles.imageOverlay}>
          <View style={styles.dateContainer}>
            <Text style={styles.dateText}>{post.dateStr}</Text>
          </View>
          <View style={styles.emotionContainer}>
            <Text style={styles.emotionIcon}>{post.emotionEmoji}</Text>
            <Text style={styles.emotionText}>{post.emotionLabel}</Text>
          </View>
        </View>
      </View>

      {/* 태그 */}
      <View style={styles.tagsContainer}>
        {(post.tags || []).map((tag, i) => (
          <TouchableOpacity key={`${post.id}-tag-${i}`} style={styles.tag}>
            <Text style={styles.tagText}>#{tag}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 액션 버튼들 */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity style={styles.actionButton}><HeartIcon /></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><BookmarkIcon /></TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}><MoreIcon /></TouchableOpacity>
      </View>

      {/* 내용 미리보기 */}
      {post.content ? (
        <View style={styles.contentContainer}>
          <Text style={styles.contentText} numberOfLines={3}>
            {post.content}
          </Text>
        </View>
      ) : null}
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 콘텐츠 */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF8C42" />
          <Text style={styles.loadingText}>일기를 불러오는 중...</Text>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {posts.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {isEmotion ? '해당 감정의 일기가 없어요.' : '해당 태그의 일기가 없어요.'}
              </Text>
            </View>
          ) : (
            posts.map(renderPost)
          )}
          <View style={{ height: 16 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#e9ecef',
  },
  backButton: {
    padding: 8, marginRight: 8, borderRadius: 20,
    minWidth: 40, minHeight: 40, justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#212529', marginLeft: 12 },
  headerSpacer: { flex: 1 },

  content: { flex: 1, backgroundColor: 'white', paddingHorizontal: 16, paddingTop: 16 },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 16, color: '#666' },

  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { color: '#999', fontSize: 16 },

  postCard: {
    backgroundColor: 'white', borderRadius: 16, marginBottom: 16,
    overflow: 'hidden', borderWidth: 1, borderColor: '#f1f3f4',
  },
  imageContainer: { position: 'relative', height: 280 },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#B8C5A6' },

  imageOverlay: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  dateContainer: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dateText: { color: 'white', fontSize: 14, fontWeight: '600' },

  emotionContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  emotionIcon: { fontSize: 16, marginRight: 4 },
  emotionText: { color: 'white', fontSize: 12, fontWeight: '600' },

  tagsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, flexWrap: 'wrap' },
  tag: { backgroundColor: '#e3f2fd', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, marginBottom: 8 },
  tagText: { fontSize: 12, color: '#1976d2', fontWeight: '600' },

  actionsContainer: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 12 },
  actionButton: { marginLeft: 16, padding: 4 },

  contentContainer: { paddingHorizontal: 16, paddingBottom: 16 },
  contentText: { fontSize: 14, color: '#495057', lineHeight: 22 },

  icon: { fontSize: 20, color: '#495057' },
  backIcon: { fontSize: 24, color: '#333', fontWeight: 'bold' },
});
