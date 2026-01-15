import { useFocusEffect } from '@react-navigation/native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db, storage } from '@/firebase';
import {
  Timestamp,
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

const screenWidth = Dimensions.get('window').width;
const NUM_COLUMNS = 2;
const HORIZONTAL_PADDING = 16;
const GRID_SPACING = 5;
const ITEM_WIDTH = Math.round(
  (screenWidth - HORIZONTAL_PADDING * 2 - GRID_SPACING) / NUM_COLUMNS
);

const MAX_LISTEN_WEEKS = 12;
const KEEP_ALIVE_MS = 180_000;

interface WeekViewProps {
  selectedChapter: string | null;
}

type WeekItem = {
  id: string;
  day: number;
  imageUrl: string | null;
  currentMonth: boolean;
};

type CacheEntry = {
  items: WeekItem[];
  unsub?: () => void;
};

const toObjectPath = (u?: string | null) => {
  if (!u) return null;
  const m = u.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const dateKey = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

const startOfWeekSun = (d: Date) => {
  const t = startOfDay(d);
  const dow = t.getDay();
  return addDays(t, -dow);
};

const weekKeyFromStart = (weekStart: Date) => `W-${dateKey(weekStart)}`;

const ordinal = (n: number) => {
  const s = ['th','st','nd','rd'], v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};

function shallowEqualWeekItems(a: WeekItem[], b: WeekItem[]) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i], y = b[i];
    if (x.id !== y.id || x.day !== y.day || x.currentMonth !== y.currentMonth || x.imageUrl !== y.imageUrl) {
      return false;
    }
  }
  return true;
}

export default function WeekView({ selectedChapter }: WeekViewProps) {
  const [data, setData] = useState<WeekItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [anchor, setAnchor] = useState(() => startOfWeekSun(new Date()));

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity    = useRef(new Animated.Value(1)).current;
  const animatingRef = useRef(false);

  const weekCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const mountedRef = useRef(true);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const weekStart = useMemo(() => startOfWeekSun(anchor), [anchor]);
  const weekEndExclusive = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const anchorMonth = anchor.getMonth();
  const anchorYear  = anchor.getFullYear();

  const midOfWeek = addDays(weekStart, 3);
  const displayYear = midOfWeek.getFullYear();
  const displayMonth = midOfWeek.getMonth();
  const firstOfDisplayMonth = new Date(displayYear, displayMonth, 1);
  const leading = firstOfDisplayMonth.getDay();
  const dayInMonth = midOfWeek.getDate();
  const cellIndex = leading + (dayInMonth - 1);
  const weekIndex0 = Math.floor(cellIndex / 7);

  const title = `${displayYear}.${String(displayMonth + 1).padStart(2, '0')}`;
  const weekLabel = `${ordinal(weekIndex0 + 1)} week`;

  const baseSkeleton: WeekItem[] = useMemo(() => {
    const arr: WeekItem[] = [];
    for (let i = 0; i < 7; i++) {
      const d = addDays(weekStart, i);
      arr.push({
        id: dateKey(d),
        day: d.getDate(),
        imageUrl: null,
        currentMonth: d.getMonth() === anchorMonth && d.getFullYear() === anchorYear,
      });
    }
    return arr;
  }, [weekStart, anchorMonth, anchorYear]);

  const slideToWeek = (dir: 1 | -1) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Animated.parallel([
      Animated.timing(translateX, { toValue: -dir * 80, duration: 150, useNativeDriver: true }),
      Animated.timing(opacity,    { toValue: 0,        duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setAnchor((prev) => addDays(prev, dir * 7));
      translateX.setValue(dir * 80);
      Animated.parallel([
        Animated.timing(translateX, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(opacity,    { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start(() => { animatingRef.current = false; });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 18 && Math.abs(g.dy) < 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -60) slideToWeek(1);
        else if (g.dx >= 60) slideToWeek(-1);
      },
    })
  ).current;

  const touch = (k: string) => {
    const v = weekCacheRef.current.get(k);
    if (!v) return;
    weekCacheRef.current.delete(k);
    weekCacheRef.current.set(k, v);
  };

  const pruneIfNeeded = (currentKey: string) => {
    while (weekCacheRef.current.size > MAX_LISTEN_WEEKS) {
      let victim: string | undefined;
      for (const k of weekCacheRef.current.keys()) {
        if (k !== currentKey) { victim = k; break; }
      }
      if (!victim) break;
      const entry = weekCacheRef.current.get(victim);
      entry?.unsub?.();
      weekCacheRef.current.delete(victim);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }

      if (!selectedChapter) {
        setData([]);
        setLoading(false);
        return;
      }

      const weekKey = weekKeyFromStart(weekStart);
      const cacheKey = `${weekKey}_${selectedChapter}`;

      const cached = weekCacheRef.current.get(cacheKey)?.items;
      if (cached) {
        setData(cached);
        setLoading(false);
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
      } else {
        setData(baseSkeleton);
        setLoading(true);
      }

      const user = auth.currentUser;
      if (!user) {
        weekCacheRef.current.set(cacheKey, { items: baseSkeleton });
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
        setLoading(false);
        return () => {};
      }

      if (!weekCacheRef.current.get(cacheKey)?.unsub) {
        const colRef = collection(db, 'users', user.uid, 'diaries');
        const qy = query(
          colRef,
          where('chapterId', '==', selectedChapter),
          where('diaryDate', '>=', Timestamp.fromDate(weekStart)),
          where('diaryDate', '<',  Timestamp.fromDate(weekEndExclusive)),
          orderBy('diaryDate', 'asc')
        );

        const unsub = onSnapshot(
          qy,
          async (snap) => {
            const rawByKey = new Map<string, string>();
            snap.forEach((doc) => {
              const d = doc.data() as any;
              const ts: Timestamp | undefined = d.diaryDate;
              const url: string | undefined = d.imageUrl;
              if (!ts || !url) return;
              rawByKey.set(dateKey(ts.toDate()), url);
            });

            const resolved = await Promise.all(
              baseSkeleton.map(async (cell) => {
                const raw = rawByKey.get(cell.id);
                if (!raw) return [cell.id, null] as const;
                const path = toObjectPath(raw);
                if (!path) return [cell.id, null] as const;
                try {
                  const good = await getDownloadURL(ref(storage, path));
                  return [cell.id, good] as const;
                } catch {
                  return [cell.id, null] as const;
                }
              })
            );

            const byKey = new Map<string, string>();
            resolved.forEach(([k, v]) => { if (v) byKey.set(k, v); });

            const filled = baseSkeleton.map((cell) => ({
              ...cell,
              imageUrl: byKey.get(cell.id) ?? null,
            }));

            const prev = weekCacheRef.current.get(cacheKey)?.items;
            if (!prev || !shallowEqualWeekItems(prev, filled)) {
              weekCacheRef.current.set(cacheKey, { items: filled, unsub });
              touch(cacheKey);
              pruneIfNeeded(cacheKey);
              if (mountedRef.current) setData(filled);
            } else {
              weekCacheRef.current.set(cacheKey, { items: prev, unsub });
              touch(cacheKey);
              pruneIfNeeded(cacheKey);
            }
            if (mountedRef.current) setLoading(false);
          },
          (err) => {
            console.warn('WeekView snapshot error:', err);
            const fallback = weekCacheRef.current.get(cacheKey)?.items ?? baseSkeleton;
            weekCacheRef.current.set(cacheKey, { items: fallback, unsub });
            touch(cacheKey);
            pruneIfNeeded(cacheKey);
            if (mountedRef.current) {
              setData(fallback);
              setLoading(false);
            }
          }
        );

        const current = weekCacheRef.current.get(cacheKey);
        weekCacheRef.current.set(cacheKey, { items: current?.items ?? baseSkeleton, unsub });
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
      }

      return () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        blurTimerRef.current = setTimeout(() => {
          weekCacheRef.current.forEach((entry, key) => {
            entry.unsub?.();
            weekCacheRef.current.set(key, { items: entry.items, unsub: undefined });
          });
        }, KEEP_ALIVE_MS);
      };
    }, [weekStart, weekEndExclusive, baseSkeleton, selectedChapter])
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      weekCacheRef.current.forEach(v => v.unsub?.());
      weekCacheRef.current.clear();
    };
  }, []);

  const renderItem = ({ item, index }: { item: WeekItem; index: number }) => (
    <Pressable
      style={[styles.item, index % NUM_COLUMNS === 0 && styles.itemLeftSpacing]}
      onPress={() => {
        if (!item.imageUrl) {
          return;
        }
        router.push({
          pathname: '/home/detail',
          params: {
            date: item.id,
            day: String(item.day),
            chapterId: selectedChapter,
          },
        });
      }}
      android_ripple={{ borderless: false }}
      hitSlop={6}
    >
      {item.imageUrl ? (
        <Image
          source={item.imageUrl}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
          recyclingKey={`${item.id}-${item.imageUrl.slice(-16)}`}
        />
      ) : (
        <View style={styles.emptyImage} />
      )}
      <Text
        style={[
          styles.dayText,
          !item.currentMonth && { backgroundColor: 'rgba(0,0,0,0.22)' },
        ]}
      >
        {item.day}
      </Text>
    </Pressable>
  );

  const AnimatedBody = (
    <Animated.View
      style={{ flex: 1, transform: [{ translateX }], opacity }}
      {...panResponder.panHandlers}
    >
      {loading ? (
        <ActivityIndicator style={{ paddingTop: 24 }} />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={7}
          maxToRenderPerBatch={7}
          windowSize={3}
          removeClippedSubviews
        />
      )}
    </Animated.View>
  );

  // ✔ 상단 Safe Area 패딩 제거 (기기별 -50 같은 마이너스 마진 불필요)
  return (
    <SafeAreaView style={styles.container} edges={['left','right','bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{weekLabel}</Text>
      </View>
      {AnimatedBody}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  // 상단 여백은 SafeArea top을 끄고, 고정 값으로만 관리
  container: { flex: 1, backgroundColor: '#FFFFFF', paddingHorizontal: HORIZONTAL_PADDING, paddingTop: 20 },
  // 헤더 높이/라인 고정 → 폰트 패딩 변화에 영향 안 받음
  header: { height: 56, justifyContent: 'flex-end', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', lineHeight: 28, includeFontPadding: false },
  subtitle: { fontSize: 18, fontWeight: '600', lineHeight: 24, color: '#666', marginTop: 4, includeFontPadding: false },

  listContent: { paddingBottom: 40 },
  row: { flexDirection: 'row', justifyContent: 'flex-start', marginBottom: GRID_SPACING },

  item: {
    width: ITEM_WIDTH,
    aspectRatio: 1,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#EEE',
    position: 'relative',
  },
  itemLeftSpacing: {
    marginRight: GRID_SPACING,
  },
  image: { width: '100%', height: '100%' },
  emptyImage: { flex: 1, backgroundColor: '#FFF0E6' },
  dayText: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
});
