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
  View
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
const NUM_COLUMNS = 7;
const ITEM_MARGIN = 2;
const ITEM_WIDTH = Math.round(
  (screenWidth - ITEM_MARGIN * (NUM_COLUMNS + 1)) / NUM_COLUMNS
); // 소수점 반올림 추가

const MAX_LISTEN_MONTHS = 12;
const KEEP_ALIVE_MS = 180_000;

interface MonthViewProps {
  selectedChapter: string | null;
}

type MonthItem = {
  id: string;
  day: number;
  imageUrl: string | null;
  currentMonth: boolean;
};

type CacheEntry = {
  items: MonthItem[];
  unsub?: () => void;
};

function extractObjectPath(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return m[1];
  }
}

function dateKey(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}
function monthKeyFromDate(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}
function shallowEqualMonthItems(a: MonthItem[], b: MonthItem[]) {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const x = a[i],
      y = b[i];
    if (
      x.id !== y.id ||
      x.day !== y.day ||
      x.currentMonth !== y.currentMonth ||
      x.imageUrl !== y.imageUrl
    )
      return false;
  }
  return true;
}

export default function MonthView({ selectedChapter }: MonthViewProps) {
  const [data, setData] = useState<MonthItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [anchor, setAnchor] = useState(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), 1);
  });

  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const animatingRef = useRef(false);

  const monthCacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const mountedRef = useRef(true);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const year = anchor.getFullYear();
  const month = anchor.getMonth();

  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  const leading = firstOfMonth.getDay();
  const totalCells = Math.ceil((leading + daysInMonth) / 7) * 7;
  const trailing = totalCells - (leading + daysInMonth);
  const gridStart = new Date(year, month, 1 - leading);
  const gridEndExclusive = new Date(year, month, daysInMonth + trailing + 1);

  const baseSkeleton: MonthItem[] = useMemo(() => {
    const arr: MonthItem[] = [];
    for (let i = 0; i < totalCells; i++) {
      const d = new Date(gridStart);
      d.setDate(gridStart.getDate() + i);
      arr.push({
        id: dateKey(d),
        day: d.getDate(),
        imageUrl: null,
        currentMonth: d.getMonth() === month,
      });
    }
    return arr;
  }, [totalCells, gridStart, month]);

  const slideToMonth = (dir: 1 | -1) => {
    if (animatingRef.current) return;
    animatingRef.current = true;
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: -dir * 80,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
      translateX.setValue(dir * 80);
      Animated.parallel([
        Animated.timing(translateX, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start(() => {
        animatingRef.current = false;
      });
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dx) > 18 && Math.abs(g.dy) < 12,
      onPanResponderRelease: (_, g) => {
        if (g.dx <= -60) slideToMonth(1);
        else if (g.dx >= 60) slideToMonth(-1);
      },
    })
  ).current;

  const touch = (k: string) => {
    const v = monthCacheRef.current.get(k);
    if (!v) return;
    monthCacheRef.current.delete(k);
    monthCacheRef.current.set(k, v);
  };

  const pruneIfNeeded = (currentKey: string) => {
    while (monthCacheRef.current.size > MAX_LISTEN_MONTHS) {
      let victim: string | undefined;
      for (const k of monthCacheRef.current.keys()) {
        if (k !== currentKey) {
          victim = k;
          break;
        }
      }
      if (!victim) break;
      const entry = monthCacheRef.current.get(victim);
      entry?.unsub?.();
      monthCacheRef.current.delete(victim);
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

      const monthKey = monthKeyFromDate(anchor);
      const cacheKey = `${monthKey}_${selectedChapter}`;

      const cached = monthCacheRef.current.get(cacheKey)?.items;
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
        monthCacheRef.current.set(cacheKey, { items: baseSkeleton });
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
        setLoading(false);
        return () => {};
      }

      if (!monthCacheRef.current.get(cacheKey)?.unsub) {
        const colRef = collection(db, 'users', user.uid, 'diaries');
        const qy = query(
          colRef,
          where('chapterId', '==', selectedChapter),
          where('diaryDate', '>=', Timestamp.fromDate(new Date(gridStart))),
          where('diaryDate', '<', Timestamp.fromDate(new Date(gridEndExclusive))),
          orderBy('diaryDate', 'asc')
        );

        const unsub = onSnapshot(
          qy,
          async (snap) => {
            const rawByDateKey = new Map<string, string>();
            snap.forEach((doc) => {
              const d = doc.data() as any;
              const ts: Timestamp | undefined = d.diaryDate;
              const url: string | undefined = d.imageUrl;
              if (!ts || !url) return;
              rawByDateKey.set(dateKey(ts.toDate()), url);
            });

            const promises: Promise<[string, string | null]>[] = [];
            rawByDateKey.forEach((rawUrl, key) => {
              const path = extractObjectPath(rawUrl);
              if (!path) {
                promises.push(Promise.resolve([key, null]));
              } else {
                promises.push(
                  getDownloadURL(ref(storage, path))
                    .then((good) => [key, good] as [string, string])
                    .catch(() => [key, null] as [string, null])
                );
              }
            });

            const resolved = await Promise.all(promises);
            const byDateKey = new Map<string, string>();
            resolved.forEach(([k, v]) => {
              if (v) byDateKey.set(k, v);
            });

            const filled = baseSkeleton.map((cell) => ({
              ...cell,
              imageUrl: byDateKey.get(cell.id) ?? null,
            }));

            const prev = monthCacheRef.current.get(cacheKey)?.items;
            if (!prev || !shallowEqualMonthItems(prev, filled)) {
              monthCacheRef.current.set(cacheKey, { items: filled, unsub });
              touch(cacheKey);
              pruneIfNeeded(cacheKey);
              if (mountedRef.current) setData(filled);
            } else {
              monthCacheRef.current.set(cacheKey, { items: prev, unsub });
              touch(cacheKey);
              pruneIfNeeded(cacheKey);
            }
            if (mountedRef.current) setLoading(false);
          },
          (err) => {
            console.warn('MonthView snapshot error:', err);
            const fallback =
              monthCacheRef.current.get(cacheKey)?.items ?? baseSkeleton;
            monthCacheRef.current.set(cacheKey, { items: fallback, unsub });
            touch(cacheKey);
            pruneIfNeeded(cacheKey);
            if (mountedRef.current) {
              setData(fallback);
              setLoading(false);
            }
          }
        );

        const current = monthCacheRef.current.get(cacheKey);
        monthCacheRef.current.set(cacheKey, {
          items: current?.items ?? baseSkeleton,
          unsub,
        });
        touch(cacheKey);
        pruneIfNeeded(cacheKey);
      }

      return () => {
        if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
        blurTimerRef.current = setTimeout(() => {
          monthCacheRef.current.forEach((entry, key) => {
            entry.unsub?.();
            monthCacheRef.current.set(key, {
              items: entry.items,
              unsub: undefined,
            });
          });
        }, KEEP_ALIVE_MS);
      };
    }, [anchor, baseSkeleton, gridStart, gridEndExclusive, selectedChapter])
  );

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
        blurTimerRef.current = null;
      }
      monthCacheRef.current.forEach((v) => v.unsub?.());
      monthCacheRef.current.clear();
    };
  }, []);

  const renderItem = ({ item }: { item: MonthItem }) => (
    <Pressable
      style={[styles.item, !item.currentMonth && styles.nonCurrentItem]}
      onPress={() => {
        if (!item.imageUrl) {
          return;
        }
        router.push({
          pathname: '/home/detail',
          params: { date: item.id, chapterId: selectedChapter },
        });
      }}
      android_ripple={{ borderless: false }}
    >
      {item.imageUrl ? (
        <Image
          source={item.imageUrl}
          style={styles.image}
          contentFit="cover"
          cachePolicy="disk"
          transition={200}
        />
      ) : (
        <View style={styles.emptyImage} />
      )}
      <Text style={styles.dayText}>{item.day}</Text>
    </Pressable>
  );

  
  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom', ]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>
          {year}. {String(month + 1).padStart(2, '0')}
        </Text>
      </View>

      <Animated.View
        style={{ flex: 1, transform: [{ translateX }], opacity }}
        {...panResponder.panHandlers}
      >
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={NUM_COLUMNS}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingTop: 0, paddingBottom: 10 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            loading ? <ActivityIndicator style={{ paddingVertical: 40 }} /> : null
          }
        />
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 8,
  },
  header: {
    height: 32,
    justifyContent: 'flex-end',
    paddingBottom: 2,
    paddingLeft: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    includeFontPadding: false,
    lineHeight: 22,
  },
  row: { marginBottom: ITEM_MARGIN, justifyContent: 'space-between' },
  item: {
    width: ITEM_WIDTH,
    aspectRatio: 0.45,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#EEE',
    position: 'relative',
  },
  nonCurrentItem: { opacity: 0.35 },
  image: { width: '100%', height: '100%' },
  emptyImage: { flex: 1, backgroundColor: '#FFF0E6'},
  dayText: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: 'rgba(0,0,0,0.4)',
    color: '#FFF',
    fontSize: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
    overflow: 'hidden',
  },
});
