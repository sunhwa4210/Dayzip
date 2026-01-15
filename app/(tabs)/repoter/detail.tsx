// app/report/detail.tsx
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { collection, doc, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Firestore 쿼리용 추가
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  LayoutChangeEvent, // ✨ 추가
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import WordCloud from "rn-wordcloud";
import MonthStack from "../../../components/graph/MonthStack";
import { auth, db, storage } from "../../../firebase";
import { Mood, MoodDetail, TagStat, useReport, Word } from "../../../hooks/useReport";



async function ensureDownloadUrl(u?: string | null): Promise<string | null> {
  if (!u) return null;
  try {
    const r = ref(storage, u); // gs:// 또는 https:// 모두 허용
    const https = await getDownloadURL(r);
    return https;
  } catch {
    if (u.startsWith("https://")) return u;
    return null;
  }
}

const MOOD_BG: Record<Mood, string> = {
  joy:"rgba(246, 212, 127, 1)",
  love:"rgba(242, 203, 223, 1)",
  calm:"rgba(207, 242, 212, 1)",
  sad:"rgba(176, 164, 200, 1)",
  anger:"rgba(185, 96, 114, 1)",
  fear:"rgba(161, 164, 213, 1)",
  confused:"rgba(162, 217, 174, 1)",
  neutral:"rgba(224, 224, 224, 1)",
  overwhelmed:"rgba(215, 137, 82, 1)",
};

const MOOD_LABEL: Record<Mood, string> = {
  joy:"기쁨", love:"사랑", calm:"평온", sad:"슬픔", anger:"분노",
  fear:"두려움", confused:"혼란", neutral:"무감정", overwhelmed:"벅참",
};

const MOOD_EMOJI: Record<Mood, string> = {
  joy:"😁", love:"😍", calm:"😌", sad:"😢", anger:"😡",
  fear:"😨", confused:"😕", neutral:"😶", overwhelmed:"🤯",
};

export default function Detail() {
  const router = useRouter();
  const uid = auth.currentUser?.uid || "REPLACE_WITH_UID";
  const { y, m } = useLocalSearchParams<{ y?: string; m?: string }>();
  const initialKey = useMemo(() => {
    const now = new Date();
    const yy = y ? Number(y) : now.getFullYear();
    const mm = m ? Number(m) : now.getMonth() + 1;
    return `${yy}-${String(mm).padStart(2, "0")}`;
  }, [y, m]);

  const [selectedMonthKey, setSelectedMonthKey] = useState<string>(initialKey);
  useEffect(() => { setSelectedMonthKey(initialKey); }, [initialKey]);

  const [retroText, setRetroText] = useState("");
  const [headerReport, setHeaderReport] = useState<any>(null);
  const [headerReportImage, setHeaderReportImage] = useState<string | null>(null);
  const [selYear, selMonth] = useMemo(() => {
    const [yy, mm] = selectedMonthKey.split("-");
    return [Number(yy), Number(mm)];
  }, [selectedMonthKey]);

  useEffect(() => {
    if (!uid) return;
    const monthKey = `${selYear}-${String(selMonth).padStart(2, "0")}`;
    const refDoc = doc(db, "users", uid, "reports", monthKey);
    const unsub = onSnapshot(refDoc, (s) => setHeaderReport(s.exists() ? s.data() : null));
    
    return () => unsub();
  }, [uid, selYear, selMonth]);

  // ✨ headerReport.imageUrl → https 변환
  useEffect(() => {
    let mounted = true;
    (async () => {
      const https = await ensureDownloadUrl(headerReport?.imageUrl);
      if (mounted) setHeaderReportImage(https);
    })();
    return () => { mounted = false; };
  }, [headerReport?.imageUrl]);

  const {
    loading, err,
    monthly, calendar, timeDist, topActs, wordCloud, headerStats, lastPhotoCard,
    activeMonthKey, selectedStats,
    topChapters, topTags,
  } = useReport(uid, selectedMonthKey);

  

  const titleNode = useMemo(() => {
    const mood = selectedStats?.topMood;
    if (!mood) return <Text style={styles.title}>이 달의 감정</Text>;
    return (
      <Text style={styles.title}>
        <Text style={{ color: "#FF7A00", fontWeight: "800" }}>{MOOD_LABEL[mood]}</Text>
        이 가장 많았어요
      </Text>
    );
  }, [selectedStats]);

  const [cloudSize, setCloudSize] = useState({ w: 0, h: 0 });
  const onCloudLayout = (e: LayoutChangeEvent) => {
    setCloudSize({ w: e.nativeEvent.layout.width, h: 200 });
  };

  const [minVal, maxVal] = (() => {
    if (!wordCloud || wordCloud.length === 0) return [0, 1];
    const vs = wordCloud.map(w => Number(w.value) || 0);
    return [Math.min(...vs), Math.max(...vs)];
  })();

  const colorByValue = (v: number) => {
    const t = (v - minVal) / Math.max(1, maxVal - minVal);
    const lightness = 70 - t * 35;
    return `hsl(225, 25%, ${Math.round(lightness)}%)`;
  };

  const styledWords = (wordCloud ?? []).map((w: Word) => ({ ...w, color: colorByValue(w.value) }));

  const goGenerate = () => {
    if (!retroText.trim()) {
      Alert.alert("회고를 입력해주세요");
      return;
    }
    router.push({
      pathname: "/repoter/lodding",
      params: { y: String(selYear), m: String(selMonth), userText: retroText },
    });
  };

  const [lastPhotoHttps, setLastPhotoHttps] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    (async () => {
      const https = await ensureDownloadUrl(lastPhotoCard?.photoUrl);
      if (mounted) setLastPhotoHttps(https);
    })();
    return () => { mounted = false; };
  }, [lastPhotoCard?.photoUrl]);

  // ✨ 키보드 회피 및 스크롤 제어
  const scrollRef = useRef<ScrollView>(null); // ✨

  // ✅ 이 달에 '이미지가 있는' 엔트리들
type EntryWithPhoto = { day: number; photoUrl: string; mood?: Mood };
const [photoEntries, setPhotoEntries] = useState<EntryWithPhoto[]>([]);

// ✅ 추천 카드 상태
const [randomCard, setRandomCard] = useState<{ dateLabel: string; mood: Mood; photoUrl: string } | null>(null);
const [randomPhotoHttps, setRandomPhotoHttps] = useState<string | null>(null);
const lastRandomDayRef = useRef<number | null>(null);

// ✅ 선택한 월의 이미지 있는 엔트리만 수집 (문서 ID가 "YYYY-MM-DD" 라고 가정)
// ✅ 선택한 월의 "이미지가 있는" diaries만 수집 (diaryDate 필드 기반)
useEffect(() => {
  let cancelled = false;
  (async () => {
    try {
      // 이번 달 1일 ~ 다음 달 1일(미만)
      const start = new Date(selYear, selMonth - 1, 1, 0, 0, 0, 0);
      const end   = new Date(selYear, selMonth, 1, 0, 0, 0, 0);

      const colRef = collection(db, "users", uid, "diaries");
      const qRef = query(
        colRef,
        where("diaryDate", ">=", start),
        where("diaryDate", "<", end)
      );

      const snap = await getDocs(qRef);
      const items: EntryWithPhoto[] = [];

      snap.forEach((docSnap) => {
        const data = docSnap.data() ?? {};
        const imageRaw = pickDiaryImageUrl(data);
        if (!imageRaw) return;

        // diaryDate: Firestore Timestamp 또는 Date
        const dateObj: Date | null =
          data.diaryDate?.toDate?.() ? data.diaryDate.toDate()
          : (data.diaryDate instanceof Date ? data.diaryDate : null);
        if (!dateObj) return;

        const day = dateObj.getDate();
        const mood: Mood | undefined = (data.mood as Mood) ?? calendar?.[day];
        items.push({ day, photoUrl: imageRaw, mood });
      });

      if (!cancelled) setPhotoEntries(items);
    } catch (e) {
      console.warn("fetch diaries with image failed:", e);
      if (!cancelled) setPhotoEntries([]);
    }
  })();
  return () => { cancelled = true; };
}, [db, uid, selYear, selMonth, calendar]);


// '이미지 있는' 후보 중에서만 랜덤 추천 (같은 날 연속 회피)
const pickRandomWithPhoto = useCallback(async () => {
  if (!photoEntries || photoEntries.length === 0) {
    setRandomCard(null);
    setRandomPhotoHttps(null);
    lastRandomDayRef.current = null;
    return;
  }

  let entry = photoEntries[Math.floor(Math.random() * photoEntries.length)];
  let tries = 0;
  while (photoEntries.length > 1 && lastRandomDayRef.current === entry.day && tries < 5) {
    entry = photoEntries[Math.floor(Math.random() * photoEntries.length)];
    tries++;
  }
  lastRandomDayRef.current = entry.day;

  const dateLabel = `${selYear}.${String(selMonth).padStart(2, "0")}.${String(entry.day).padStart(2, "0")}`;
  const mood = (entry.mood as Mood) ?? "neutral";

  const https = await ensureDownloadUrl(entry.photoUrl); // gs:// → https 변환
  setRandomCard({ dateLabel, mood, photoUrl: entry.photoUrl });
  setRandomPhotoHttps(https);
}, [photoEntries, selYear, selMonth]);

// ✅ 월 데이터가 준비/변경될 때 한 번
useEffect(() => {
  pickRandomWithPhoto();
}, [pickRandomWithPhoto]);

// ✅ 리포트 탭에 들어올 때마다 새로 추천
useFocusEffect(
  useCallback(() => {
    pickRandomWithPhoto();
  }, [pickRandomWithPhoto])
);

  return (
    <SafeAreaView style={styles.safe}>
      {/* ✨ 키보드가 올라오면 화면을 밀어 올려줍니다. */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0} // 헤더가 있다면 수치 조정
      >
        
        <ScrollView
          ref={scrollRef} // ✨
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"     // ✨ 인풋 탭 유지
          keyboardDismissMode="interactive"       // ✨ iOS에서 자연스러운 dismiss
        >
          
          {headerReport?.completed && (
            <View style={{ padding:16, paddingTop:24 }}>
              <View style={{ borderRadius:24, overflow:"hidden" }}>
                {!!headerReportImage ? (
                  <Image source={{ uri: headerReportImage }} style={{ width:"100%", height:260 }} />
                ) : (
                  <View style={{ width:"100%", height:260, backgroundColor:"#F2F2F2" }} />
                )}
              </View>
              <Text style={{ textAlign:"center", fontSize:22, fontWeight:"800", marginTop:16 }}>
                {`${selMonth}월의 이미지`}
              </Text>

              {!!headerReport.summary && (
                <Text style={{ textAlign:"center", color:"#8A8A8A", fontSize:15, lineHeight:22, marginTop:10, paddingHorizontal:24 }}>
                  {headerReport.summary}
                </Text>
              )}
            </View>
          )}

          <View style={styles.summaryRow}>
            <SummaryItem label="기록한 일기" value={`${headerStats?.days ?? 0}일`} />
            <SummaryItem label="단어(토큰)" value={`${headerStats?.tokens ?? 0}개`} />
            <SummaryItem label="추가한 태그" value={`${headerStats?.tags ?? 0}개`} />
          </View>

          {titleNode}

          <View style={styles.graphSection}>
            {monthly.map((m: any) => (
              <MonthStack
                key={m.month}
                data={m}
                isActive={m.month === activeMonthKey}
                onPress={() => setSelectedMonthKey(m.month)}
              />
            ))}
          </View>

          {selectedStats && (
            <View style={[styles.card, { marginTop: 12 }]}>
              {selectedStats.details.map((item: MoodDetail) => (
                <View key={item.mood} style={styles.row}>
                  <View style={[styles.badge, { backgroundColor: MOOD_BG[item.mood] }]}>
                    <Text style={styles.emoji}>{MOOD_EMOJI[item.mood]}</Text>
                  </View>
                  <Text style={{ flex: 1, marginLeft: 8 }}>
                    {MOOD_LABEL[item.mood]} <Text style={{ color: "#777" }}>{item.percent}%</Text>
                  </Text>
                  <Text>{item.count}건</Text>
                </View>
              ))}
            </View>
          )}

          <View style={styles.devider} />

          <View style={styles.card}>
            <Text style={styles.cardTitle}>감정 캘린더</Text>
            <Text style={styles.subTitle}>감정 추이를 확인해보세요</Text>
            <CalendarEmoji emojiMap={calendar} year={selYear} month={selMonth} />
          </View>

          {topChapters && topChapters.length > 0 && (
            <>
              <View style={styles.devider} />
              <View style={styles.card}>
                <Text style={styles.cardTitle}><Text style={{color:'#FF7A00'}}>{topChapters[0].name }</Text>에 기록을 자주 했어요</Text>
                <ChapterStackedBar data={topChapters} colors={CHAPTER_COLORS} />
                <ChapterStatList data={topChapters} colors={CHAPTER_COLORS} />
              </View>
            </>
          )}

          {topTags && topTags.length > 0 && (
            <>
              <View style={styles.devider} />
              <View style={styles.card}>
                <TagBarChartHeader topTag={topTags[0].tag} />
                <TagBarChart data={topTags} />
              </View>
            </>
          )}

          <View style={styles.devider} />

          <View style={[styles.card]} onLayout={onCloudLayout}>
            <Text style={styles.cardTitle}>자주 쓴 단어</Text>
            {cloudSize.w > 0 && styledWords.length > 0 ? (
              <WordCloud
                options={{
                  words: styledWords,
                  minFont: 14,
                  maxFont: 48,
                  fontOffset: 1,
                  width: cloudSize.w,
                  height: cloudSize.h,
                }}
              />
            ) : (
              <Text style={styles.dim}>아직 단어가 없어요.</Text>
            )}
          </View>

          {(randomCard && randomPhotoHttps) && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>다시 훑어보기</Text>
              <View style={styles.photoSection}>
                <View style={styles.photoCard}>
                  <Image source={{ uri: randomPhotoHttps }} style={styles.photo} />
                  <Text style={styles.photoDate}>{randomCard.dateLabel}</Text>
                  <View style={styles.moodBadge}>
                    <Text style={{ fontSize: 18 }}>{MOOD_EMOJI[randomCard.mood]}</Text>
                    <Text style={{ marginLeft: 4, fontSize: 13, fontWeight: "600" }}>
                      {MOOD_LABEL[randomCard.mood]}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={{ paddingHorizontal:16, paddingTop:24, paddingBottom: Platform.OS === 'ios' ? 24 : 16 }}>
            <Text style={{ fontSize:18, fontWeight:"700", marginBottom:8 }}>
              {selMonth}월 회고하기
            </Text>
            <TextInput
              value={retroText}
              onChangeText={setRetroText}
              placeholder="이번 달은 어땠나요?"
              style={{ borderWidth:1, borderColor:"#eee", borderRadius:12, padding:12, fontSize:16 }}
              onFocus={() => scrollRef.current?.scrollToEnd({ animated: true })} // ✨ 포커스 시 자동 스크롤
              returnKeyType="done"
              blurOnSubmit
            />
            <TouchableOpacity
              onPress={goGenerate}
              style={{ marginTop:12, backgroundColor:"#111", borderRadius:999, paddingVertical:14, alignItems:"center" }}>
              <Text style={{ color:"#fff", fontWeight:"700" }}>이달의 이미지 생성하기</Text>
            </TouchableOpacity>
          </View>

          {loading ? <Text style={styles.dim}>불러오는 중…</Text> : null}
          {err ? <Text style={[styles.dim, { color: "#f55" }]}>{err}</Text> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ===== 보조 컴포넌트 ===== */
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ color: "#777", fontSize: 12 }}>{label}</Text>
      <Text style={{ fontWeight: "700", fontSize: 16 }}>{value}</Text>
    </View>
  );
}

function CalendarEmoji({ emojiMap, year, month }: { emojiMap: Record<number, Mood>; year: number; month: number }) {
  const WEEK = ["일", "월", "화", "수", "목", "금", "토"];
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const first = start.getDay();
  const days = end.getDate();
  const cells: { day?: number; emoji?: Mood }[] = [];
  for (let i = 0; i < first; i++) cells.push({});
  for (let d = 1; d <= days; d++) cells.push({ day: d, emoji: emojiMap[d] });
  const rows: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return (
    <View>
      <View style={styles.weekHeader}>
        {WEEK.map((w) => <Text key={w} style={styles.weekHeadText}>{w}</Text>)}
      </View>
      {rows.map((r, idx) => (
        <View key={idx} style={styles.weekRow}>
          {r.map((c, i) => (
            <View key={i} style={styles.dayCell}>
              <Text style={styles.dayEmoji}>
                {c.emoji ? (MOOD_EMOJI[c.emoji] ?? "") : ""}
              </Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

function TagBarChartHeader({ topTag }: { topTag: string }) {
  const [includeDeleted, setIncludeDeleted] = useState(false);
  return (
    <View>
      <Text style={styles.cardTitle}>
        <Text style={{ color: '#FF9500' }}>#{topTag}</Text>를 많이 썼어요
      </Text>
      <View style={styles.legendContainer}>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#FFB572' }]} /><Text style={styles.legendText}>태그 추가 횟수</Text></View>
        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#E0E0E0' }]} /><Text style={styles.legendText}>삭제 횟수</Text></View>
        <View style={{ flex: 1 }} />
        <Text style={styles.legendText}>삭제 포함</Text>
        <Switch value={includeDeleted} onValueChange={setIncludeDeleted} trackColor={{ false: "#E9E9EA", true: "#FF9500" }} thumbColor={"#f4f3f4"} ios_backgroundColor="#E9E9EA" style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}/>
      </View>
    </View>
  );
}

function TagBarChart({ data }: { data: TagStat[] }) {
  const maxCount = useMemo(() => Math.max(...data.map(item => item.count), 0), [data]);
  if (maxCount === 0) return null;

  return (
    <View style={styles.tagChartContainer}>
      {data.map((item) => {
        const barHeight = (item.count / maxCount) * 100;
        return (
          <View key={item.tag} style={styles.tagBarItem}>
            <View style={[styles.tagBar, { height: `${barHeight}%` }]}>
              <View style={styles.tagBarFill} />
              <View style={styles.tagBarDeleted} />
            </View>
            <Text style={styles.tagBarLabel} numberOfLines={1}>{item.tag}</Text>
            <Text style={styles.tagBarCount}>{item.count}건</Text>
          </View>
        );
      })}
    </View>
  );
}

// 다이어리 문서에서 이미지 URL/경로 추출 (imageUrl, photoUrl, images[0] 등 폭넓게 대응)
function pickDiaryImageUrl(data: any): string | null {
  if (!data) return null;
  if (typeof data.imageUrl === "string" && data.imageUrl.trim()) return data.imageUrl;
  if (typeof data.photoUrl === "string" && data.photoUrl.trim()) return data.photoUrl;

  if (data.image && typeof data.image === "object") {
    if (typeof data.image.url === "string" && data.image.url.trim()) return data.image.url;
    if (typeof data.image.path === "string" && data.image.path.trim()) return data.image.path;
  }
  if (data.photo && typeof data.photo === "object") {
    if (typeof data.photo.url === "string" && data.photo.url.trim()) return data.photo.url;
    if (typeof data.photo.path === "string" && data.photo.path.trim()) return data.photo.path;
  }

  if (Array.isArray(data.images) && data.images.length) {
    const first = data.images[0];
    if (typeof first === "string" && first.trim()) return first;
    if (first && typeof first.url === "string" && first.url.trim()) return first.url;
    if (first && typeof first.path === "string" && first.path.trim()) return first.path;
  }
  if (Array.isArray(data.photos) && data.photos.length) {
    const first = data.photos[0];
    if (typeof first === "string" && first.trim()) return first;
    if (first && typeof first.url === "string" && first.url.trim()) return first.url;
    if (first && typeof first.path === "string" && first.path.trim()) return first.path;
  }

  return null;
}


const CHAPTER_COLORS = [
  "rgba(246, 212, 127, 1)", "rgba(207, 242, 212, 1)", "rgba(176, 164, 200, 1)",
 "#ffeaf8ff", "#BCEAD5",
];

function ChapterStackedBar({ data, colors }: { data: { name: string; count: number }[], colors: string[] }) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);
  if (total === 0) return null;
  return (
    <View style={styles.stackedBarContainer}>
      {data.map((item, index) => (
        <View key={item.name} style={{ flex: item.count, backgroundColor: colors[index % colors.length], }} />
      ))}
    </View>
  );
}

function ChapterStatList({ data, colors }: { data: { name: string; count: number }[], colors: string[] }) {
  const total = useMemo(() => data.reduce((sum, item) => sum + item.count, 0), [data]);
  if (total === 0) return null;
  return (
    <View style={{ marginTop: 20, gap: 16 }}>
      {data.map((item, index) => {
        const percentage = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <View key={item.name} style={styles.chapterStatRow}>
            <View style={[styles.statDot, { backgroundColor: colors[index % colors.length] }]} />
            <Text style={styles.chapterStatLabel}>{item.name}</Text>
            <Text style={styles.chapterStatCount}>{item.count}건</Text>
            <Text style={styles.chapterStatArrow}>〉</Text>
          </View>
        );
      })}
    </View>
  );
}

/* ===== 스타일 ===== */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#fff" },
  scrollContent: { paddingBottom: 24 },
  title: { paddingHorizontal: 16, marginTop: 24, fontSize: 20, fontWeight: "700", marginBottom: 12 },
  summaryRow: { flexDirection: "row", gap: 8, marginTop: 12, backgroundColor: "rgba(245, 245, 245, 1)", height: 79, alignContent:"center", justifyContent: "center", padding:16 },
  graphSection: { paddingHorizontal: 16, flexDirection: "row", alignItems: "flex-end", justifyContent: "center" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 10 },
  badge: { width: 32, height: 32, borderRadius: 20, alignItems: "center", justifyContent: "center", elevation: 2 },
  emoji: { fontSize: 16, lineHeight: 18 },
  card: { marginTop: 16, padding: 16, borderRadius: 12, backgroundColor: '#fff', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 2 },
  cardTitle: { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  subTitle: { fontSize: 14, fontWeight: "400", color:" rgba(124, 124, 124, 1)", marginBottom: 24 },
  weekHeader: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, marginBottom: 6 },
  weekHeadText: { width: 36, textAlign: "center", fontSize: 12, color: "#666" },
  weekRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4, paddingHorizontal: 6 },
  dayCell: { width: 36, height: 42, alignItems: "center", justifyContent: "center" },
  dayEmoji: { fontSize: 16 },
  devider: { backgroundColor: "rgba(245, 245, 245, 1)", height: 8 },
  dim: { color: "#888", paddingVertical: 8, textAlign: 'center' },
  photoSection: { alignItems: "center" },
  photoCard: { position: "relative", borderRadius: 16, overflow: "hidden", height: 301, width: 301, marginBottom:30, marginTop: 20 },
  photo: { width: '100%', height: '100%' },
  photoDate: { position: "absolute", bottom: 12, left: 12, color: "#fff", fontWeight: "700", fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  moodBadge: { position: "absolute", bottom: 12, right: 12, flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2 },
  statRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F7F7F7', borderRadius: 8, overflow: 'hidden', height: 44, },
  statBarContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, },
  statBar: { height: '100%', backgroundColor: '#D9D9D9', borderRadius: 8, },
  statLabel: { flex: 1, paddingVertical: 10, paddingHorizontal: 12, fontSize: 14, fontWeight: '500', color: '#333', zIndex: 1, },
  statCount: { paddingHorizontal: 12, fontSize: 14, color: '#888', zIndex: 1, },
  statArrow: { paddingRight: 12, fontSize: 14, color: '#888', zIndex: 1, },
  stackedBarContainer: { flexDirection: 'row', height: 32, borderRadius: 12, overflow:'hidden', marginTop: 24, marginBottom: 20,  gap: 2, },
  chapterStatRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, },
  statDot: { width: 14, height: 14, borderRadius: 6, marginRight: 12, },
  chapterStatLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#333', },
  chapterStatPercent: { width: 50, textAlign: 'right', fontSize: 15, color: '#888', },
  chapterStatCount: { width: 50, textAlign: 'right', fontSize: 15, color: '#333', fontWeight: '600', },
  chapterStatArrow: { width: 30, textAlign: 'center', fontSize: 15, color: '#888', },
  legendContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 3, marginBottom: 30, },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 16, },
  legendDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6, },
  legendText: { fontSize: 12, color: '#888' },
  tagChartContainer: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 200, marginTop: 24, marginBottom: 8, },
  tagBarItem: { alignItems: 'center', width: '15%', height: '100%', justifyContent: 'flex-end' },
  tagBar: { width: '100%', borderRadius: 8, overflow: 'hidden' },
  tagBarFill: { flex: 0.7, backgroundColor: '#FFB572' },
  tagBarDeleted: { flex: 0.3, backgroundColor: '#E0E0E0' },
  tagBarLabel: { marginTop: 8, fontSize: 14, fontWeight: '500', color: '#333', width: '100%', textAlign: 'center' },
  tagBarCount: { marginTop: 4, fontSize: 12, color: '#888' },
});
