import { auth, db } from '@/firebase';
import { useRouter } from 'expo-router';
import { Timestamp, collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GAP = 10;
const RADIUS = 14;
const IMAGE_H = 180;

type MonthCard = {
  year: number;
  month: number;
  title: string;
  date: Date;       // 대표 날짜(가장 최근)
  images: string[]; // 고정 랜덤 4장
};

/** YYYY-MM 문자열을 시드로 고정 셔플 (Fisher–Yates with xorshift32) */
function seededShuffle<T>(arr: T[], seedStr: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) seed = (seed * 31 + seedStr.charCodeAt(i)) >>> 0;
  const rand = () => {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    return ((seed >>> 0) / 0xffffffff);
  };
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Report() {
  const router = useRouter();
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);
  const [cards, setCards] = useState<MonthCard[]>([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setCards([]); setLoading(false); return; }

    setLoading(true);

    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);

    // 경로를 users/{uid}/diaries 로 변경
    const ref = collection(db, 'users', uid, 'diaries');
    const q = query(
      ref,
      where('diaryDate', '>=', Timestamp.fromDate(start)),
      where('diaryDate', '<',  Timestamp.fromDate(end)),
      orderBy('diaryDate', 'desc')
    );

    const unsub = onSnapshot(q, (snap) => {
      // 1) 원자료 정규화
      const items = snap.docs.map(d => {
        const data = d.data() as any;
        const date: Date = data.diaryDate?.toDate ? data.diaryDate.toDate() : new Date(data.diaryDate);

        // 이미지: images 배열 OR imageUrl 단일 필드 모두 지원
        const imgs: string[] = Array.isArray(data.images)
          ? data.images.filter(Boolean)
          : (data.imageUrl ? [String(data.imageUrl)] : []);

        // 타이틀: title 없으면 content 앞부분으로 대체
        const title: string = (data.title && String(data.title).trim())
          ? String(data.title).trim()
          : (data.content ? String(data.content).trim().slice(0, 20) + (String(data.content).length > 20 ? '…' : '') : '');

        return { title, images: imgs, date };
      });

      // 2) 월별 그룹핑
      const map = new Map<string, { latestTitle: string; latestDate: Date; pool: string[] }>();
      for (const it of items) {
        const y = it.date.getFullYear();
        const m = it.date.getMonth() + 1;
        const key = `${y}-${String(m).padStart(2,'0')}`;
        const cur = map.get(key);
        if (!cur) {
          map.set(key, { latestTitle: it.title || `${m}월의 기록`, latestDate: it.date, pool: [...it.images] });
        } else {
          map.set(key, { ...cur, pool: cur.pool.concat(it.images) });
        }
      }

      // 3) 월별 이미지 풀 → 중복 제거 → 시드 셔플 → 4장
      const monthCards: MonthCard[] = [];
      for (const [key, val] of map) {
        const [yStr, mStr] = key.split('-');
        const y = Number(yStr), m = Number(mStr);
        const unique = Array.from(new Set(val.pool));  // 중복 제거
        const shuffled = seededShuffle(unique, key);
        const pick4 = shuffled.slice(0, 4);
        monthCards.push({
          year: y,
          month: m,
          title: val.latestTitle || `${m}월의 기록`,
          date: val.latestDate,
          images: pick4,
        });
      }

      // 4) 최신 월 → 과거 월
      monthCards.sort((a, b) => b.year - a.year || b.month - a.month);
      setCards(monthCards);
      setLoading(false);
    }, (e) => {
      console.log('FIRESTORE_ERR:', e.code, e.message);
      setLoading(false);
    });

    return () => unsub();
  }, [year]);

  return (
    <View style={st.container}>
      {/* 상단: 연도 셀렉터 */}
      <View style={st.yearRow}>
        <TouchableOpacity  onPress={() => setYear(y => y - 1)}></TouchableOpacity>
        <Text style={st.yearText}>{year}</Text>
        <TouchableOpacity onPress={() => setYear(y => y + 1)}></TouchableOpacity>
      </View>

      {loading ? (
        <View style={{flex:1, alignItems:'center', justifyContent:'center'}}><ActivityIndicator/></View>
      ) : (
        <ScrollView contentContainerStyle={{paddingBottom:40}}>
          {cards.map(card => (
            <TouchableOpacity
              key={`${card.year}-${card.month}`}
              style={st.card}
              activeOpacity={0.9}
              onPress={() => router.push({ pathname: '/repoter/detail', params: { y: String(card.year), m: String(card.month) } })}
            >
              <View style={st.row}>
                <View style={st.mainWrap}>
                  {card.images[0]
                    ? <Image source={{ uri: card.images[0] }} style={st.main} />
                    : <View style={[st.main, st.placeholder]} />
                  }
                </View>
                <View style={st.sideCol}>
                  {[card.images[1], card.images[2], card.images[3]].map((u, i) =>
                    u
                      ? <Image key={i} source={{ uri: u }} style={st.side} />
                      : <View key={i} style={[st.side, st.placeholder]} />
                  )}
                </View>
              </View>
              <Text style={st.title}>{card.title.replace(/\s+$/, '') || `${card.month}월의 기록`}</Text>
              <Text style={st.dateTxt}>{`${card.year}. ${card.month}. ${String(card.date.getDate()).padStart(2,'0')}`}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container:{ flex:1, backgroundColor:'#fff', paddingTop:48 },
  yearRow:{ flexDirection:'row', justifyContent:'center', alignItems:'center', gap:8, marginBottom:6 },
  yearBtn:{ backgroundColor:'#f3f3f4', paddingHorizontal:10, paddingVertical:6, borderRadius:10 },
  yearText:{ fontSize:20, fontWeight:'700', color:'#111' },

  card:{ width:SCREEN_WIDTH, paddingHorizontal:16, paddingVertical:14 },
  row:{ flexDirection:'row', height:IMAGE_H, gap:GAP },
  mainWrap:{ flex:2, borderRadius:RADIUS, overflow:'hidden' },
  main:{ width:'100%', height:'100%', borderRadius:RADIUS },
  sideCol:{ flex:1, justifyContent:'space-between' },
  side:{ width:'100%', height:(IMAGE_H - GAP*2)/3, borderRadius:12 },
  placeholder:{ backgroundColor:'#e9e9ea' },

  title:{ marginTop:12, fontSize:16, fontWeight:'700', color:'#222' },
  dateTxt:{ marginTop:4, fontSize:13, color:'#8b8b8b' },
});
