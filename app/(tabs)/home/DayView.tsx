import { auth, db } from '@/firebase';
import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
// [추가] 페이지 이동을 위해 expo-router의 router를 import합니다.
import { router, useLocalSearchParams } from 'expo-router';
import { Timestamp, collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  PanResponder,
  // [추가] 터치 이벤트를 처리하기 위해 Pressable을 import합니다.
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface DayViewProps {
  selectedChapter: string | null;
}

type Diary = {
  content?: string;
  imageUrl?: string;
  emotion?: string;
  diaryDate?: Timestamp;
  tags?: string[];
};

// 날짜 유틸
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
const addDays    = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const fmt        = (d: Date) => `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
const dateKey    = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const MAX_LISTEN_DAYS = 31;
type CacheEntry = { entry: Diary | null; unsub?: () => void };
const KEEP_ALIVE_MS = 180_000;

function shallowEqualDiary(a: Diary | null, b: Diary | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  const aT = a.diaryDate?.toMillis?.() ?? a.diaryDate;
  const bT = b.diaryDate?.toMillis?.() ?? b.diaryDate;
  return a.content === b.content &&
         a.imageUrl === b.imageUrl &&
         a.emotion  === b.emotion  &&
         JSON.stringify(a.tags) === JSON.stringify(b.tags) &&
         aT === bT;
}

export default function DayView({ selectedChapter }: DayViewProps) {
  const { date } = useLocalSearchParams<{ date?: string }>();
  const initialDate = useMemo(() => (date ? new Date(date) : new Date()), [date]);

  const [currentDate, setCurrentDate] = useState<Date>(startOfDay(initialDate));
  const [entry, setEntry] = useState<Diary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;

  const dayCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const mountedRef  = useRef(true);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const swipeTo = (dir: 1 | -1) => {
    Animated.parallel([
      Animated.timing(translateX, { toValue: -dir * 80, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,         duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setCurrentDate(prev => addDays(prev, dir));
      translateX.setValue(dir * 80);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dy) < 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -60) swipeTo(1);
        else if (g.dx >= 60) swipeTo(-1);
      },
    })
  ).current;

  const touch = (k: string) => {
    const v = dayCacheRef.current.get(k);
    if (!v) return;
    dayCacheRef.current.delete(k);
    dayCacheRef.current.set(k, v);
  };

  const pruneIfNeeded = (currentKey: string) => {
    while (dayCacheRef.current.size > MAX_LISTEN_DAYS) {
      let victim: string | undefined;
      for (const k of dayCacheRef.current.keys()) {
        if (k !== currentKey) { victim = k; break; }
      }
      if (!victim) break;
      const ce = dayCacheRef.current.get(victim);
      ce?.unsub?.();
      dayCacheRef.current.delete(victim);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }

      if (!selectedChapter) {
        setEntry(null);
        setLoading(false);
        return;
      }

      const k = dateKey(currentDate);
      const cacheKey = `${k}_${selectedChapter}`;

      const cached = dayCacheRef.current.get(cacheKey)?.entry ?? null;
      if (cached) {
        setEntry(cached);
        setLoading(false);
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
      } else {
        setEntry(null);
        setLoading(true);
      }

      const u = auth.currentUser;
      if (!u) {
        dayCacheRef.current.set(cacheKey, { entry: null });
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
        setLoading(false);
        return () => {};
      }

      if (!dayCacheRef.current.get(cacheKey)?.unsub) {
        const col = collection(db, 'users', u.uid, 'diaries');
        const qy = query(
          col,
          where('chapterId', '==', selectedChapter),
          where('diaryDate', '>=', Timestamp.fromDate(startOfDay(currentDate))),
          where('diaryDate', '<',  Timestamp.fromDate(endOfDay(currentDate))),
          orderBy('diaryDate', 'desc'),
          limit(1)
        );

        const unsub = onSnapshot(
          qy,
          (snap) => {
            const doc = snap.docs[0];
            const next = doc ? (doc.data() as Diary) : null;
            
            const prev = dayCacheRef.current.get(cacheKey)?.entry ?? null;
            if (!shallowEqualDiary(prev, next)) {
              dayCacheRef.current.set(cacheKey, { entry: next, unsub });
              touch(cacheKey);
              pruneIfNeeded(cacheKey);
              if (mountedRef.current) setEntry(next);
            } else {
              dayCacheRef.current.set(cacheKey, { entry: prev, unsub });
              touch(cacheKey);
              pruneIfNeeded(cacheKey);
            }
            if (mountedRef.current) setLoading(false);
          },
          (err) => {
            console.warn('DayView snapshot error:', err);
            const fallback = dayCacheRef.current.get(cacheKey)?.entry ?? null;
            dayCacheRef.current.set(cacheKey, { entry: fallback, unsub });
            touch(cacheKey);
            pruneIfNeeded(cacheKey);
            if (mountedRef.current) {
              setEntry(fallback);
              setLoading(false);
            }
          }
        );

        const current = dayCacheRef.current.get(cacheKey);
        dayCacheRef.current.set(cacheKey, { entry: current?.entry ?? null, unsub });
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
      }

      return () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        blurTimerRef.current = setTimeout(() => {
          dayCacheRef.current.forEach((ce, key) => {
            ce.unsub?.();
            dayCacheRef.current.set(key, { entry: ce.entry, unsub: undefined });
          });
        }, KEEP_ALIVE_MS);
      };
    }, [currentDate, selectedChapter])
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      dayCacheRef.current.forEach(v => v.unsub?.());
      dayCacheRef.current.clear();
    };
  }, []);

  return (
    <ScrollView style={styles.container} {...panResponder.panHandlers}>
      <Animated.View style={{ transform: [{ translateX }], opacity }}>
        {/* [수정] 이미지를 Pressable로 감싸서 터치 이벤트를 처리하도록 변경합니다. */}
        <Pressable
          style={{ borderRadius: 12, overflow: 'hidden' }}
          // [추가] 이미지를 누르면 상세 페이지로 이동하는 함수를 연결합니다.
          onPress={() => {
            // 챕터가 선택되지 않은 경우에는 이동하지 않도록 방어 코드를 추가합니다.
            if (!selectedChapter) return;
            // 상세 페이지로 이동하면서, 현재 날짜와 선택된 챕터 ID를 파라미터로 전달합니다.
            router.push({
              pathname: '/home/detail',
              params: {
                date: dateKey(currentDate),
                chapterId: selectedChapter,
              }
            });
          }}
        >
          {entry?.imageUrl ? (
            <Image
              source={entry.imageUrl}
              style={styles.image}
              contentFit="cover"
              cachePolicy="disk"
              transition={150}
            />
          ) : (
            <View style={[styles.image, { backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ color: '#999' }}>
                {loading ? '불러오는 중…' : '이 날의 이미지가 없어요'}
              </Text>
            </View>
          )}
        </Pressable>

        <View style={{ marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.dateText}>{fmt(currentDate)}</Text>
          {!!entry?.emotion && (
            <View style={styles.emotionPill}>
              <Text style={{ color: '#333', fontWeight: '600' }}>{entry.emotion}</Text>
            </View>
          )}
        </View>

        <View style={styles.tagContainer}>
          {(entry?.tags && entry.tags.length > 0) ? (
            entry.tags.map((tag) => (
              <Text key={tag} style={styles.tag}>#{tag}</Text>
            ))
          ) : (
             !loading && <Text style={styles.tagPlaceholder}># 태그 없음</Text>
          )}
        </View>

        <Text style={styles.description}>
          {entry?.content || (loading ? '' : '이 날의 일기가 없습니다. 스와이프해서 다른 날을 확인해 보세요.')}
        </Text>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#F9F9F9', flex: 1 },
  image: { width: '100%', height: 240, marginBottom: 16 }, // [수정] borderRadius는 부모 Pressable로 이동
  dateText: { fontSize: 20, fontWeight: 'bold' },
  emotionPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14, backgroundColor: '#F3F4F6' },
  tagContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12, marginTop: 8 },
  tag: { backgroundColor: '#eee', color: '#555', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, fontSize: 12 },
  tagPlaceholder: {
    backgroundColor: 'transparent',
    color: '#999',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    fontSize: 12,
  },
  description: { fontSize: 14, color: '#333', lineHeight: 22 },
});