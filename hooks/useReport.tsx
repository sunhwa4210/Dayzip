import dayjs from "dayjs";
import { collection, getDocs, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { db } from "../firebase";

// 감정 타입
export type Mood =
  | "joy" | "love" | "calm" | "sad" | "anger" | "fear" | "confused" | "neutral" | "overwhelmed";

const MOODS: Mood[] = [
  "joy","love","calm","sad","anger","fear","confused","neutral","overwhelmed"
];

// 챕터 및 태그 통계 타입
export type ChapterStat = { name: string; count: number };
export type TagStat = { tag: string; count: number };
export type Word = { text: string; value: number };
export type TimeBucket = "morning" | "afternoon" | "evening" | "night";
const TIMES: TimeBucket[] = ["morning", "afternoon", "evening", "night"];

// [추가] 훅 내부에서 가공하여 사용할 일기 데이터의 타입을 명확하게 정의합니다.
type ProcessedRow = {
  id: string;
  uid: string;
  date: dayjs.Dayjs;
  mood: Mood;
  timeOfDay: TimeBucket;
  noteTokens: string[];
  imageUrl: string | null;
  rawEmotion: string;
  content: string;
  chapterId: string | null;
  tags: string[];
};

// [추가] 감정 분포 상세 데이터의 타입을 정의합니다.
export type MoodDetail = {
  mood: Mood;
  count: number;
  percent: number;
};

// [수정] useReport 훅이 반환하는 전체 데이터 객체의 타입을 명확하게 정의합니다.
export interface ReportData {
  loading: boolean;
  err: string;
  monthly: any[];
  calendar: Record<number, Mood>;
  timeDist: { bucket: TimeBucket; count: number }[];
  topActs: { name: string; count: number }[];
  wordCloud: Word[];
  headerStats: { days: number; tokens: number; tags: number } | null;
  lastPhotoCard: { dateLabel: string; mood: Mood; photoUrl: string | null; excerpt: string } | null;
  activeMonthKey: string;
  selectedStats: {
    month: string;
    total: number;
    details: MoodDetail[]; // ⬅️ 타입을 명확히 지정
    topMood: Mood | undefined;
  } | null;
  topChapters: ChapterStat[];
  topTags: TagStat[];
}

const normalizeMood = (raw: string): Mood => {
  const s = (raw || "").toLowerCase();
  if (s.includes("기쁨") || s.includes("😁")) return "joy";
  if (s.includes("사랑") || s.includes("😍")) return "love";
  if (s.includes("평온") || s.includes("😌")) return "calm";
  if (s.includes("슬픔") || s.includes("😢")) return "sad";
  if (s.includes("분노") || s.includes("😡")) return "anger";
  if (s.includes("두려움") || s.includes("😨")) return "fear";
  if (s.includes("혼란") || s.includes("😕")) return "confused";
  if (s.includes("무감정") || s.includes("😶")) return "neutral";
  if (s.includes("벅참") || s.includes("🤯")) return "overwhelmed";
  return "calm";
};
const bucketTime = (d: dayjs.Dayjs): TimeBucket => {
  const h = d.hour();
  if (h >= 5 && h < 12)  return "morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 22) return "evening";
  return "night";
};
const tokenize = (text: string): string[] => (text || "").replace(/[^\p{L}\p{N}\s#]/gu, " ").split(/\s+/).filter(Boolean).slice(0, 100);

export function useReport(uid: string, selectedMonthKey?: string): ReportData {
  const [loading, setLoading] = useState(true);
  // [수정] rows 상태의 타입을 any[] 대신 ProcessedRow[]로 명확하게 지정합니다.
  const [rows, setRows] = useState<ProcessedRow[]>([]);
  const [err, setErr] = useState("");
  const [chapters, setChapters] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!uid) return;
    const ref = collection(db, `users/${uid}/chapters`);
    const q = query(ref, orderBy("order", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      const arr = snap.docs.map(doc => ({ id: doc.id, name: doc.data().name as string }));
      setChapters(arr);
    });
    return () => unsub();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        setLoading(true); setErr("");
        const end = dayjs();
        const start = end.subtract(5, "month").startOf("month");
        const ref = collection(db, `users/${uid}/diaries`);
        const q = query(ref, where("diaryDate", ">=", start.toDate()), where("diaryDate", "<=", end.endOf("month").toDate()), orderBy("diaryDate", "asc"));
        const snap = await getDocs(q);
        const arr: ProcessedRow[] = []; // [수정] 배열 타입 지정
        snap.forEach(doc => {
          const x: any = doc.data();
          const d = dayjs(x.diaryDate?.toDate?.() ?? x.diaryDate);
          arr.push({
            id: doc.id, uid: x.uid, date: d,
            mood: normalizeMood(String(x.emotionCode || x.emotion || "")),
            timeOfDay: bucketTime(d),
            noteTokens: tokenize(String(x.content || "")),
            imageUrl: x.imageUrl || null, rawEmotion: x.emotion || "",
            content: x.content || "", chapterId: x.chapterId || null,
            tags: x.tags || [],
          });
        });
        setRows(arr);
      } catch (e: any) { setErr(e?.message || "load failed"); }
      finally { setLoading(false); }
    })();
  }, [uid]);

  const monthly = useMemo(() => {
    const map: Record<string, any> = {};
    for (let i = 5; i >= 0; i--) {
      const key = dayjs().subtract(i, "month").format("YYYY-MM");
      map[key] = { month: key, ...Object.fromEntries(MOODS.map(m => [m, 0])) };
    }
    rows.forEach(r => {
      const key = r.date.format("YYYY-MM");
      if (map[key]) map[key][r.mood] = (map[key][r.mood] || 0) + 1;
    });
    return Object.values(map);
  }, [rows]);

  const activeMonthKey = useMemo(() => selectedMonthKey || dayjs().format("YYYY-MM"), [selectedMonthKey]);

  const rowsForActiveMonth = useMemo(() => {
    return rows.filter(r => r.date.format("YYYY-MM") === activeMonthKey);
  }, [rows, activeMonthKey]);

  const selectedStats = useMemo(() => {
    const base = monthly.find(m => m.month === activeMonthKey);
    if (!base) return null;
    const total = MOODS.reduce((s, k) => s + (base[k] || 0), 0) || 1;
    // [수정] details 배열의 타입을 MoodDetail[]로 명확히 합니다.
    const details: MoodDetail[] = MOODS.map(k => ({
      mood: k, count: base[k] || 0,
      percent: Math.round(((base[k] || 0) / total) * 100),
    })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);
    const topMood = details[0]?.mood;
    return { month: activeMonthKey, total, details, topMood };
  }, [monthly, activeMonthKey]);

const calendar = useMemo(() => {
  const ret: Record<number, Mood> = {};
  rowsForActiveMonth.forEach(r => {
    ret[r.date.date()] = r.mood;
  });
  return ret;
}, [rowsForActiveMonth]);

const timeDist = useMemo(() => {
  const c: Record<TimeBucket, number> = { morning: 0, afternoon: 0, evening: 0, night: 0 };
  rowsForActiveMonth.forEach(r => c[r.timeOfDay]++);
  return TIMES.map(t => ({ bucket: t, count: c[t] }));
}, [rowsForActiveMonth]);
  
  const topActs = useMemo(() => { return []; }, [rows]);

  const wordCloud = useMemo<Word[]>(() => {
    const f: Record<string, number> = {};
    rowsForActiveMonth.forEach(r => r.noteTokens.forEach((w: string) => {
      f[w] = (f[w] || 0) + 1;
    }));
    return Object.entries(f).map(([text, value]) => ({ text, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 30);
  }, [rowsForActiveMonth]);
  
  const topChapters = useMemo<ChapterStat[]>(() => {
    if (!rowsForActiveMonth.length || !chapters.length) return [];
    const chapterIdToName: Record<string, string> =
      Object.fromEntries(chapters.map(c => [c.id, c.name]));
    const counts: Record<string, number> = {};
    rowsForActiveMonth.forEach(r => {
      if (r.chapterId) counts[r.chapterId] = (counts[r.chapterId] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([id, count]) => ({ name: chapterIdToName[id] || "미분류", count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [rowsForActiveMonth, chapters]);

const topTags = useMemo<TagStat[]>(() => {
  if (!rowsForActiveMonth.length) return [];
  const counts: Record<string, number> = {};
  rowsForActiveMonth.forEach(r => {
    r.tags.forEach((tag: string) => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  return Object.entries(counts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}, [rowsForActiveMonth]);

const headerStats = useMemo(() => {
  if (!rowsForActiveMonth.length) return null;
  const daySet = new Set<string>();
  const tagSet = new Set<string>();
  let tokenCount = 0;
  rowsForActiveMonth.forEach(r => {
    daySet.add(r.date.format("YYYY-MM-DD"));
    tokenCount += r.noteTokens.length;
    r.tags.forEach((tag: string) => tagSet.add(tag));
  });
  return { days: daySet.size, tokens: tokenCount, tags: tagSet.size };
}, [rowsForActiveMonth]);

  const lastPhotoCard = useMemo(() => {
    if (!rows.length) return null;
    const photoRows = rows.filter(r => r.imageUrl);
    const last = photoRows.length > 0 ? photoRows[photoRows.length - 1] : rows[rows.length - 1];
    return {
      dateLabel: last.date.format("YYYY. M. D."), mood: last.mood,
      photoUrl: last.imageUrl, excerpt: last.content.slice(0, 50),
    };
  }, [rows]);

  return {
    loading, err, monthly, calendar, timeDist, topActs, wordCloud, headerStats, lastPhotoCard,
    activeMonthKey, selectedStats, topChapters, topTags,
  };

  
}