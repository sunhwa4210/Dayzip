// app/explore/index.tsx
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  ActivityIndicator, Image, NativeScrollEvent, NativeSyntheticEvent,
  Pressable, ScrollView, StyleSheet, Text, TextInput, View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import CustomButton from "../../../components/CustomButton";
import Tag from "../../../components/Tag";
/* 아이콘 */
import BookIcon from "../../../components/icons/Bookmark";
import BookIconFocus from "../../../components/icons/BookmarkFocus";
import DotIcon from "../../../components/icons/Dot";
import HartIcon from "../../../components/icons/Heart";
import HartIconFocus from "../../../components/icons/HeartFocus";
import SearchIcon from "../../../components/icons/Search";
/* 바텀시트 */
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
/* Firebase */
import {
  collection, doc, DocumentData, getDocs,
  limit,
  onSnapshot, orderBy, query, QueryDocumentSnapshot, startAfter, Timestamp, updateDoc, where
} from "firebase/firestore";
import { auth, db } from "../../../firebase";

/* ===== 상수 ===== */
const TAG_CANDIDATES = ["북마크", "좋아요"];
const EMOTIONS = [
  { key: "joy", label: "기쁨", emoji: "😁" },
  { key: "love", label: "사랑", emoji: "😍" },
  { key: "calm", label: "평온", emoji: "😌" },
  { key: "sad", label: "슬픔", emoji: "😢" },
  { key: "anger", label: "분노", emoji: "😡" },
  { key: "fear", label: "두려움", emoji: "😨" },
  { key: "confused", label: "혼란", emoji: "😕" },
  { key: "neutral", label: "무감정", emoji: "😶" },
  { key: "overwhelmed", label: "벅참", emoji: "🤯" },
];

/* 타입 */
type FeedItem = {
  id: string;
  content: string;
  imageUrl?: string;
  chapterId?: string;
  tags?: string[];
  isLiked?: boolean;
  isBookmarked?: boolean;
  createdAt?: Timestamp | string;
  diaryDate?: Timestamp | string;
  emotion?: string;
};

type Chapter = {
  id: string;
  name: string;
};

const QUERY_LIMIT = 40;
const openDiary = (item: FeedItem) => {
  router.push({
    pathname: "/home/detail",   // app/home/detail/index.tsx
    params: { diaryId: item.id }
  });
};

const ensureNFC = (value: string): string => {
  try {
    return value.normalize("NFC");
  } catch {
    return value;
  }
};

const ensureNfcArray = (values: string[] = []): string[] => values.map(ensureNFC);

const toMillis = (v?: Timestamp | string) => {
  if (!v) return 0;
  if (typeof v === "string") {
    const t = Date.parse(v);
    return Number.isNaN(t) ? 0 : t;
  }
  try {
    return (v as Timestamp).toMillis();
  } catch {
    return 0;
  }
};

const normalizeBucketName = (bucket: string) =>
  bucket.endsWith(".firebasestorage.app")
    ? bucket.replace(".firebasestorage.app", ".appspot.com")
    : bucket;

const toHttpStorageUrl = (value?: string | null) => {
  if (!value) return value ?? undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("gs://")) {
    const pathWithoutScheme = value.slice(5); // remove 'gs://'
    const slashIndex = pathWithoutScheme.indexOf("/");
    if (slashIndex === -1) return value;
    const bucket = normalizeBucketName(pathWithoutScheme.slice(0, slashIndex));
    const objectPath = pathWithoutScheme.slice(slashIndex + 1);
    if (!bucket || !objectPath) return value;
    const encodedPath = encodeURIComponent(objectPath);
    return `https://firebasestorage.googleapis.com/v0/b/${bucket}/o/${encodedPath}?alt=media`;
  }
  return value;
};

type SortOrder = "latest" | "oldest";
type TagKey = "sort" | "tag" | "emotion" | "chapter";

export default function Explore() {
  const [selectedFilter, setSelectedFilter] = useState<TagKey | null>(null);
  const [sortOrder, setSortOrder] = useState<SortOrder>("latest");
  // 활성화된 필터 (UI에 반영하고, 쿼리 우선순위를 시각화)
  const [activeFilter, setActiveFilter] = useState<TagKey>("sort"); 
  const [tagInput, setTagInput] = useState("");
  // **[핵심 필터 상태]**
  const [selectedTagChips, setSelectedTagChips] = useState<string[]>([]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  const [selectedChapters, setSelectedChapters] = useState<string[]>([]);
  // ---
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [allUserTags, setAllUserTags] = useState<string[]>([]);
  const [items, setItems] = useState<FeedItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const canPaginateRef = useRef(true);
  // 쿼리/데이터 로드 요청의 무결성을 보장하기 위한 버전 관리
  const listVersionRef = useRef(0); 
  const uid = auth.currentUser?.uid || null;
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ["55%", "85%"], []);
  
  // UI 라벨 계산
  const tagFilterLabel = useMemo(() => {
    if (selectedTagChips.length === 0) return "태그";
    if (selectedTagChips.length === 1) return selectedTagChips[0];
    return `${selectedTagChips[0]} 외 ${selectedTagChips.length - 1}`;
  }, [selectedTagChips]);
  const normalizedTagFilters = useMemo(() => ensureNfcArray(selectedTagChips), [selectedTagChips]);
  const emotionMap = useMemo(() => {
    const map = new Map<string, { label: string; display: string }>();
    EMOTIONS.forEach((emotion) => {
      map.set(emotion.key, { label: emotion.label, display: `${emotion.emoji} ${emotion.label}` });
    });
    return map;
  }, []);
  const selectedEmotionDisplays = useMemo(
    () => selectedEmotions.map((key) => emotionMap.get(key)?.display ?? key),
    [selectedEmotions, emotionMap]
  );
  const selectedEmotionLabels = useMemo(
    () => selectedEmotions.map((key) => emotionMap.get(key)?.label ?? key),
    [selectedEmotions, emotionMap]
  );
  const emotionFilterLabel = useMemo(() => {
    if (selectedEmotions.length === 0) return "감정";
    const first = selectedEmotions[0];
    const emotion = emotionMap.get(first);
    if (!emotion) return "감정";
    if (selectedEmotions.length === 1) return emotion.display;
    return `${emotion.display} 외 ${selectedEmotions.length - 1}`;
  }, [selectedEmotions, emotionMap]);
  const chapterFilterLabel = useMemo(() => {
    if (selectedChapters.length === 0) return "챕터";
    const first = selectedChapters[0];
    const chapter = chapters.find((c) => c.id === first);
    const base = chapter?.name ?? "챕터";
    if (selectedChapters.length === 1) return base;
    return `${base} 외 ${selectedChapters.length - 1}`;
  }, [selectedChapters, chapters]);
  
  const tagConfigs = useMemo(
    () => ([
      {
        key: "sort" as const,
        label: sortOrder === "latest" ? "최신 순" : "오래된 순",
        // 활성 필터가 'sort'이거나, 다른 필터가 선택되지 않았을 때 'sort'가 기본 활성 필터가 됨.
        active: activeFilter === "sort", 
      },
      {
        key: "tag" as const,
        label: tagFilterLabel,
        active: activeFilter === "tag",
      },
      {
        key: "emotion" as const,
        label: emotionFilterLabel,
        active: activeFilter === "emotion",
      },
      {
        key: "chapter" as const,
        label: chapterFilterLabel,
        active: activeFilter === "chapter",
      },
    ]),
    [sortOrder, activeFilter, tagFilterLabel, emotionFilterLabel, chapterFilterLabel],
  );
  
  // 클라이언트 측 필터링을 위한 상세 정보
  const tagFilterDetails = useMemo(() => {
    const requiresLike = normalizedTagFilters.includes("좋아요");
    const requiresBookmark = normalizedTagFilters.includes("북마크");
    const keywords = normalizedTagFilters.filter((tag) => tag !== "좋아요" && tag !== "북마크");
    return {
      requiresLike,
      requiresBookmark,
      keywords,
      keywordSet: new Set(keywords),
    };
  }, [normalizedTagFilters]);
  
  const emotionDisplaySet = useMemo(() => new Set(selectedEmotionDisplays), [selectedEmotionDisplays]);
  const emotionLabelSet = useMemo(() => new Set(selectedEmotionLabels), [selectedEmotionLabels]);
  const chapterSet = useMemo(() => new Set(selectedChapters), [selectedChapters]);
  
  // 정렬 기준 값 추출
  const getSortValue = useCallback((item: FeedItem) => {
    const diaryMillis = toMillis(item.diaryDate);
    const createdMillis = toMillis(item.createdAt);
    return diaryMillis || createdMillis || 0;
  }, []);
  
  // 클라이언트 측 필터링 로직 (Firestore 쿼리 제한으로 인해 서버에서 처리하지 못한 부분을 처리)
  const matchesFilters = useCallback((item: FeedItem) => {
    if (selectedEmotions.length > 0 && activeFilter === "emotion") {
      const emotionValue = typeof item.emotion === "string" ? item.emotion : "";
      if (!emotionDisplaySet.has(emotionValue) && !emotionLabelSet.has(emotionValue)) {
        return false;
      }
    }

    if (selectedChapters.length > 0 && activeFilter === "chapter") {
      if (!item.chapterId || !chapterSet.has(item.chapterId)) {
        return false;
      }
    }

    if (selectedTagChips.length > 0 && activeFilter === "tag") {
      if (tagFilterDetails.requiresLike && item.isLiked !== true) {
        return false;
      }
      if (tagFilterDetails.requiresBookmark && item.isBookmarked !== true) {
        return false;
      }
      if (tagFilterDetails.keywords.length > 0) {
        const itemTags = ensureNfcArray(item.tags ?? []);
        const hasKeyword = itemTags.some((tag) => tagFilterDetails.keywordSet.has(tag));
        if (!hasKeyword) {
          return false;
        }
      }
    }

    return true;
  }, [emotionDisplaySet, emotionLabelSet, chapterSet, tagFilterDetails, selectedEmotions, selectedChapters, selectedTagChips, activeFilter]);
  
  // 정렬 로직
  const compareBySort = useCallback((a: FeedItem, b: FeedItem) => {
    const diff = getSortValue(a) - getSortValue(b);
    if (diff === 0) return a.id.localeCompare(b.id);
    return sortOrder === "oldest" ? diff : -diff;
  }, [getSortValue, sortOrder]);
  
  const sortItems = useCallback((itemsToSort: FeedItem[]) => {
    return [...itemsToSort].sort(compareBySort);
  }, [compareBySort]);
  
  // BottomSheet 핸들러
  const openTagSheet = (tag: TagKey) => { setSelectedFilter(tag); bottomSheetRef.current?.present(); };
  const closeTagSheet = () => {
    bottomSheetRef.current?.dismiss();
    setSelectedFilter(null);
  };
  const handleSheetDismiss = useCallback(() => setSelectedFilter(null), []);
  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
  );

  // 챕터 목록 로드
  useEffect(() => {
    if (!uid) return;
    const chaptersRef = collection(db, "users", uid, "chapters");
    const q = query(chaptersRef, orderBy("order", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chaptersData = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
      }));
      setChapters(chaptersData);
    });
    return () => unsubscribe();
  }, [uid]);

  // 사용자가 작성한 모든 태그 로드 (태그 필터 선택지 제공용)
  useEffect(() => {
    if (!uid) return;
    const diariesRef = collection(db, "users", uid, "diaries");
    const q = query(diariesRef, orderBy("createdAt", "desc"), limit(50));
    getDocs(q).then((snapshot) => {
      const fetchedTags = new Set<string>();
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.tags && Array.isArray(data.tags)) {
          // 태그를 NFC로 정규화하여 저장
          data.tags.forEach((tag: string) => fetchedTags.add(ensureNFC(tag))); 
        }
      });
      setAllUserTags(Array.from(fetchedTags));
    }).catch(error => {
      console.warn("사용자 태그를 불러오는 중 오류 발생:", error);
    });
  }, [uid]);

  // Firestore 쿼리 빌더
  const buildQueries = useCallback((opts?: { after?: QueryDocumentSnapshot<DocumentData> | null }) => {
    if (!uid) return null;
    const base = collection(db, "users", uid, "diaries");
    const dir: "asc" | "desc" = sortOrder === "oldest" ? "asc" : "desc";
    const filters: any[] = [];
    
    // **[핵심 로직]** Firestore 쿼리 제한(하나의 'in' 또는 'array-contains-any'만 사용 가능)을 피하기 위해, 
    // UI에서 활성화된 필터 1개에 대해서만 서버 쿼리를 구성합니다.
    
    if (activeFilter === "emotion" && selectedEmotions.length > 0) {
      // 감정 필터링 (IN 연산자, 최대 10개)
      filters.push(where("emotion", "in", selectedEmotionDisplays.slice(0, 10)));
    } else if (activeFilter === "chapter" && selectedChapters.length > 0) {
      // 챕터 필터링 (IN 연산자, 최대 10개)
      filters.push(where("chapterId", "in", selectedChapters.slice(0, 10)));
    } else if (activeFilter === "tag" && selectedTagChips.length > 0) {
      // 태그 필터링
      const normalizedChips = ensureNfcArray(selectedTagChips);
      const remainingTags: string[] = [];
      let needsLikeFilter = false;
      let needsBookmarkFilter = false;

      normalizedChips.forEach((chip) => {
        if (chip === "좋아요") {
          needsLikeFilter = true;
        } else if (chip === "북마크") {
          needsBookmarkFilter = true;
        } else {
          remainingTags.push(chip);
        }
      });

      if (needsLikeFilter) {
        filters.push(where("isLiked", "==", true)); // 단순 동등
      }

      if (needsBookmarkFilter) {
        filters.push(where("isBookmarked", "==", true)); // 단순 동등
      }

      if (remainingTags.length > 0) {
        // 일반 태그 필터링 (array-contains-any 연산자, 최대 10개)
        filters.push(where("tags", "array-contains-any", remainingTags.slice(0, 10)));
      }
    }
    
    // 정렬 및 페이지네이션
    const partsAfter = opts?.after ? [startAfter(opts.after)] : [];
    
    // Firestore는 정렬 필드와 페이지네이션 커서를 사용해야 하므로, 두 개의 쿼리를 사용합니다.
    // 1. createdAt 기준으로 쿼리 (페이지네이션을 위해)
    const q1 = query(base, ...filters, orderBy("createdAt", dir), ...partsAfter, limit(QUERY_LIMIT));
    // 2. diaryDate 기준으로 쿼리 (만약 createdAt이 없는 경우 또는 백업 정렬)
    const q2 = query(base, ...filters, orderBy("diaryDate", dir), ...partsAfter, limit(QUERY_LIMIT));
    
    return { q1, q2, base };
  }, [uid, sortOrder, activeFilter, selectedEmotions, selectedEmotionDisplays, selectedChapters, selectedTagChips]);

  // Firestore 문서 -> FeedItem 타입으로 변환
  const mapDocs = useCallback((docs: QueryDocumentSnapshot<DocumentData>[]) =>
    docs.map((d) => {
      const data = d.data() as any;
      const normalizedTags = Array.isArray(data.tags) ? ensureNfcArray(data.tags) : undefined;
      const rawImage = data.imageUrl;
      let imageUrl: string | undefined;
      if (typeof rawImage === "string") {
        const resolved = toHttpStorageUrl(rawImage);
        imageUrl = typeof resolved === "string" ? resolved : undefined;
      } else if (Array.isArray(rawImage)) {
        const firstString = rawImage.find((item: any) => typeof item === "string");
        if (typeof firstString === "string") {
          const resolved = toHttpStorageUrl(firstString);
          imageUrl = typeof resolved === "string" ? resolved : undefined;
        }
      }
      return {
        id: d.id,
        ...data,
        ...(normalizedTags ? { tags: normalizedTags } : {}),
        ...(imageUrl !== undefined ? { imageUrl } : {}),
      } as FeedItem;
    }),
  []);

  // 페이지 상태 업데이트 및 클라이언트 필터링 적용
  const setPageState = useCallback((docs: QueryDocumentSnapshot<DocumentData>[], append = false) => {
    const rows = mapDocs(docs);
    // 서버 쿼리 이후, activeFilter가 'tag', 'emotion', 'chapter'일 때만 matchesFilters를 적용합니다.
    const filteredRows = activeFilter !== "sort" ? rows.filter(matchesFilters) : rows; 
    
    if (append) {
      setItems((prev) => {
        const merged = new Map<string, FeedItem>();
        prev.forEach((item) => merged.set(item.id, item));
        filteredRows.forEach((item) => merged.set(item.id, item));
        return sortItems(Array.from(merged.values()));
      });
    } else {
      setItems(sortItems(filteredRows));
    }
    
    cursorRef.current = docs.length ? docs[docs.length - 1] : null;
    // 쿼리 제한만큼 가져왔다면 페이지네이션 가능성이 있음
    canPaginateRef.current = docs.length === QUERY_LIMIT; 
  }, [mapDocs, matchesFilters, sortItems, activeFilter]);

  // 초기 데이터 로드
  const loadInitial = useCallback(async () => {
    if (!uid) {
      setItems([]);
      return;
    }
    const myVersion = ++listVersionRef.current;
    cursorRef.current = null;
    canPaginateRef.current = false;
    setLoading(true);
    
    try {
      let queries = buildQueries();
      if (!queries) {
        setItems([]);
        return;
      }
      
      let snap = await getDocs(queries.q1);
      // q1이 비어있으면 q2 시도
      if (snap.empty) snap = await getDocs(queries.q2); 
      
      let attempts = 0;
      const maxAttempts = 5; // 클라이언트 필터링으로 인해 데이터가 거의 없을 때의 최대 재시도 횟수
      
      // 유효한 결과를 찾거나, 더 이상 서버에서 가져올 데이터가 없을 때까지 반복
      while (!snap.empty) {
        if (myVersion !== listVersionRef.current) return;
        
        const rows = mapDocs(snap.docs);
        // 서버에서 필터링되지 않은 경우에만 클라이언트 필터링 적용
        const filteredRows = activeFilter !== "sort" ? rows.filter(matchesFilters) : rows; 
        
        // 1. 유효한 행을 찾았거나,
        // 2. 서버에서 QUERY_LIMIT보다 적게 가져왔다면(더 이상 데이터 없음)
        if (filteredRows.length > 0 || snap.docs.length < QUERY_LIMIT) {
          setPageState(snap.docs, false);
          return;
        }
        
        // QUERY_LIMIT만큼 가져왔지만 filteredRows.length가 0이라면,
        // 다음 페이지를 시도 (클라이언트 필터링 비효율성 처리)
        if (snap.docs.length < QUERY_LIMIT) break; 
        
        const lastDoc = snap.docs[snap.docs.length - 1];
        if (!lastDoc) break;
        
        queries = buildQueries({ after: lastDoc });
        if (!queries) break;
        
        snap = await getDocs(queries.q1);
        if (snap.empty) snap = await getDocs(queries.q2);
        
        attempts += 1;
        if (attempts >= maxAttempts) break;
      }
      
      if (myVersion === listVersionRef.current) {
        // 루프를 돌았는데도 결과가 없으면 빈 목록으로 설정
        setItems([]); 
        cursorRef.current = null;
        canPaginateRef.current = false;
      }
    } finally {
      if (myVersion === listVersionRef.current) setLoading(false);
    }
  }, [uid, buildQueries, mapDocs, matchesFilters, setPageState, activeFilter]);

  useEffect(() => { loadInitial(); }, [loadInitial]);

  // 추가 데이터 로드 (페이지네이션)
  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !cursorRef.current || !canPaginateRef.current) return;
    
    const myVersion = listVersionRef.current;
    setLoadingMore(true);
    
    try {
      let lastDoc: QueryDocumentSnapshot<DocumentData> | null = cursorRef.current;
      let queries = buildQueries({ after: lastDoc });
      let attempts = 0;
      const maxAttempts = 5; 
      
      while (queries) {
        let snap = await getDocs(queries.q1);
        if (snap.empty) snap = await getDocs(queries.q2);
        
        if (myVersion !== listVersionRef.current) return;
        
        if (snap.empty) {
          cursorRef.current = null;
          canPaginateRef.current = false;
          return;
        }
        
        const rows = mapDocs(snap.docs);
        const filteredRows = activeFilter !== "sort" ? rows.filter(matchesFilters) : rows; 
        
        if (filteredRows.length > 0) {
          setPageState(snap.docs, true); // 새로운 데이터 추가
          return;
        }
        
        // QUERY_LIMIT보다 적게 가져왔다면 더 이상 서버 데이터가 없는 것으로 판단
        if (snap.docs.length < QUERY_LIMIT) { 
          cursorRef.current = null;
          canPaginateRef.current = false;
          return;
        }
        
        // QUERY_LIMIT만큼 가져왔지만 유효한 데이터가 없으므로 다음 페이지 시도
        lastDoc = snap.docs[snap.docs.length - 1];
        cursorRef.current = lastDoc;
        queries = buildQueries({ after: lastDoc });
        
        attempts += 1;
        if (attempts >= maxAttempts) {
          return;
        }
      }
    } finally {
      if (myVersion === listVersionRef.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, buildQueries, mapDocs, matchesFilters, setPageState, activeFilter]);

  // 스크롤 이벤트 핸들러 (바닥 감지)
  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
    // 바닥에서 180px 이내에 도달했을 때
    const nearBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 180; 
    if (nearBottom) loadMore();
  }, [loadMore]);

  // 좋아요/북마크 토글
  const toggleLike = async (item: FeedItem) => {
    const uid2 = auth.currentUser?.uid; if (!uid2) return;
    const ref = doc(db, "users", uid2, "diaries", item.id);
    const newLikedState = !item.isLiked;
    await updateDoc(ref, { isLiked: newLikedState });
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, isLiked: newLikedState } : it));
  };

  const toggleBookmark = async (item: FeedItem) => {
    const uid2 = auth.currentUser?.uid; if (!uid2) return;
    const ref = doc(db, "users", uid2, "diaries", item.id);
    const newBookmarkedState = !item.isBookmarked;
    await updateDoc(ref, { isBookmarked: newBookmarkedState });
    setItems((prev) => prev.map((it) => it.id === item.id ? { ...it, isBookmarked: newBookmarkedState } : it));
  };

  // 배열 토글 유틸리티
  const toggleInArray = (arr: string[], v: string) => (arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v]);
  
  // 태그 입력 후 추가
  const onAddTag = () => {
    const normalized = ensureNFC(tagInput.trim());
    if (!normalized) return;
    setSelectedTagChips((prev) => {
      const normalizedPrev = prev.map(ensureNFC);
      // 이미 존재하는 태그는 추가하지 않음
      return normalizedPrev.includes(normalized) ? normalizedPrev : [...normalizedPrev, normalized]; 
    });
    // 새 태그를 추가하면 다른 필터는 자동으로 초기화
    setSelectedEmotions([]); 
    setSelectedChapters([]);
    setTagInput("");
  };
  const handleTagInputChange = useCallback((value: string) => {
    setTagInput(ensureNFC(value));
  }, [setTagInput]);
  
  // 태그 선택 토글 (시트 내부)
  const toggleTagSelection = useCallback((tagValue: string) => {
    const normalized = ensureNFC(tagValue);
    setSelectedTagChips((prev) => {
      const normalizedPrev = prev.map(ensureNFC);
      return normalizedPrev.includes(normalized)
        ? normalizedPrev.filter((item) => item !== normalized)
        : [...normalizedPrev, normalized];
    });
    // **[핵심 수정 반영]** 태그 선택 시 다른 필터 초기화
    setSelectedEmotions([]); 
    setSelectedChapters([]);
  }, [setSelectedChapters, setSelectedEmotions, setSelectedTagChips]);
  
  // BottomSheet에서 '완료' 버튼 클릭 시
  const onApplySheet = async () => {
    const currentFilter = selectedFilter;
    let nextActiveFilter: TagKey = "sort";

    if (currentFilter === "sort") {
      // 정렬만 변경하는 경우
    } else if (currentFilter === "tag") {
      // 태그가 하나라도 선택되면 'tag' 활성화, 아니면 'sort'
      nextActiveFilter = selectedTagChips.length > 0 ? "tag" : "sort"; 
    } else if (currentFilter === "emotion") {
      // 감정이 하나라도 선택되면 'emotion' 활성화, 아니면 'sort'
      nextActiveFilter = selectedEmotions.length > 0 ? "emotion" : "sort"; 
    } else if (currentFilter === "chapter") {
      // 챕터가 하나라도 선택되면 'chapter' 활성화, 아니면 'sort'
      nextActiveFilter = selectedChapters.length > 0 ? "chapter" : "sort"; 
    }
    
    // 최종 활성 필터 설정
    setActiveFilter(nextActiveFilter);
    
    // 새로운 필터 조건으로 데이터 로드 시작
    await loadInitial(); 
    closeTagSheet();
  };
  
  // BottomSheet에서 '초기화' 버튼 클릭 시 (Sheet 내부 필터 상태만 초기화)
  const onResetSheet = () => {
    setSelectedTagChips([]);
    setSelectedEmotions([]);
    setSelectedChapters([]);
    setSortOrder("latest");
    // 초기화 버튼을 누르면 'sort' 필터가 활성화된 상태로 설정 준비
    setActiveFilter("sort"); 
  };
  
  // 전체 사용 가능한 태그 목록 (고정 태그 + 사용자 태그 + 현재 선택된 태그)
  const allAvailableTags = useMemo(() => {
    const combined = [...TAG_CANDIDATES, ...allUserTags, ...selectedTagChips];
    return Array.from(new Set(combined.map(ensureNFC)));
  }, [allUserTags, selectedTagChips]);


  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={16}>
      <View style={styles.topContainer}>
        <Text style={styles.title}>Discover</Text>
        <Pressable onPress={() => router.push('/search')} hitSlop={10}>
          <SearchIcon height={24} width={24} />
        </Pressable>
      </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagScroll}>
          {tagConfigs.map((tag) => (
            <CustomButton
              key={tag.key}
              label={tag.label}
              variant="tag"
              selected={selectedFilter === tag.key || tag.active}
              onPress={() => openTagSheet(tag.key)}
              style={{ marginRight: 6 }}
            />
          ))}
        </ScrollView>

        {loading ? (
          <View style={{ paddingVertical: 32, alignItems: "center" }}><ActivityIndicator /></View>
        ) : items.length === 0 ? (
          <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}><Text style={{ color: "#777" }}>표시할 일기가 없어요.</Text></View>
        ) : (
          items.map((item) => {
            const liked = item.isLiked === true;
            const bookmarked = item.isBookmarked === true;
            
            return (
              <Pressable
                key={item.id}
                style={styles.content1_container}
                onPress={() => openDiary(item)}
                android_ripple={{ borderless: false }}
              >

                <Image
                  style={styles.content1_img}
                  source={item.imageUrl ? { uri: item.imageUrl } : require("../../../assets/images/search_content1.png")}
                />
                <View style={styles.tagSection}>
                  <View style={styles.tagDisplayWrap}>
                    {(item.tags && item.tags.length > 0) ? (
                      item.tags.map((tag, index) => (
                        <Tag key={`${tag}-${index}`} label={`#${tag}`} />
                      ))
                    ) : (
                      <Tag label="태그 없음" />
                    )}
                    {item.emotion ? (
                      <Tag label={item.emotion} />
                    ) : null}
                  </View>
                  <View style={styles.iconGroup}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <Pressable onPress={() => toggleLike(item)}>
                        {liked ? <HartIconFocus width={24} height={24} /> : <HartIcon width={24} height={24} />}
                      </Pressable>
                      <Pressable onPress={() => toggleBookmark(item)}>
                        {bookmarked ? <BookIconFocus width={24} height={24} /> : <BookIcon width={24} height={24} />}
                      </Pressable>
                      <DotIcon width={24} height={24} />
                    </View>
                  </View>
                </View>
                <View style={styles.contentTextWrap}>
                  <Text style={styles.contentText}>{item.content || "내용 없음"}</Text>
                </View>
                </Pressable>
            );
          })
        )}

        {loadingMore ? <View style={{ paddingVertical: 14 }}><ActivityIndicator /></View> : null}
      </ScrollView>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        backdropComponent={renderBackdrop}
        enablePanDownToClose
        onDismiss={handleSheetDismiss}
      >
        <BottomSheetView style={{ flex: 1 }}>
          {selectedFilter === "tag" && (
            <View style={styles.sheetWrap}>
              <Text style={styles.sheetTitle}>태그</Text>
              <View style={styles.inputRow}>
                <TextInput
                  value={tagInput}
                  onChangeText={handleTagInputChange}
                  placeholder="새 태그 추가"
                  placeholderTextColor="#BDBDBD"
                  autoCorrect={false}
                  autoCapitalize="none"
                  style={styles.input}
                />
                <Pressable style={[styles.addBtn, !tagInput.trim() && styles.addBtnDisabled]} onPress={onAddTag} disabled={!tagInput.trim()}>
                  <Text style={[styles.addBtnText, !tagInput.trim() && { color: "#D6D6D6" }]}>추가</Text>
                </Pressable>
              </View>
              <View style={styles.chipsWrap}>
                {allAvailableTags.map((t, i) => {
                  const selected = selectedTagChips.includes(t);
                  return (
                    <Pressable
                      key={`${t}-${i}`}
                      onPress={() => toggleTagSelection(t)}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{t}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.sheetActions}>
                <Pressable style={styles.resetBtn} onPress={onResetSheet}><Text style={styles.resetText}>초기화</Text></Pressable>
                <Pressable style={styles.applyBtn} onPress={onApplySheet}><Text style={styles.applyText}>완료</Text></Pressable>
              </View>
            </View>
          )}

          {selectedFilter === "emotion" && (
            <View style={styles.sheetWrap}>
              <Text style={styles.sheetTitle}>감정</Text>
              <View style={styles.chipsWrap}>
                {EMOTIONS.map((e) => {
                  const selected = selectedEmotions.includes(e.key);
                  return (
                    <Pressable
                      key={e.key}
                      onPress={() => {
                        setSelectedEmotions((prev) => toggleInArray(prev, e.key));
                        // **[핵심 수정]** 감정을 선택하면 다른 필터 초기화
                        setSelectedTagChips([]); 
                        setSelectedChapters([]);
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{e.emoji} {e.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.sheetActions}>
                <Pressable style={styles.resetBtn} onPress={onResetSheet}><Text style={styles.resetText}>초기화</Text></Pressable>
                <Pressable style={styles.applyBtn} onPress={onApplySheet}><Text style={styles.applyText}>완료</Text></Pressable>
              </View>
            </View>
          )}

          {selectedFilter === "chapter" && (
            <View style={styles.sheetWrap}>
              <Text style={styles.sheetTitle}>챕터</Text>
              <View style={styles.chipsWrap}>
                {chapters.map((c) => {
                  const selected = selectedChapters.includes(c.id);
                  return (
                    <Pressable
                      key={c.id}
                      onPress={() => {
                        setSelectedChapters((prev) => toggleInArray(prev, c.id));
                        // **[핵심 수정]** 챕터를 선택하면 다른 필터 초기화
                        setSelectedTagChips([]); 
                        setSelectedEmotions([]);
                      }}
                      style={[styles.chip, selected && styles.chipSelected]}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{c.name}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <View style={styles.sheetActions}>
                <Pressable style={styles.resetBtn} onPress={onResetSheet}><Text style={styles.resetText}>초기화</Text></Pressable>
                <Pressable style={styles.applyBtn} onPress={onApplySheet}><Text style={styles.applyText}>완료</Text></Pressable>
              </View>
            </View>
          )}

          {selectedFilter === "sort" && (
            <View style={styles.sheetWrap}>
              <Text style={styles.sheetTitle}>정렬 순서</Text>
              <Pressable style={styles.sortRow} onPress={() => setSortOrder("latest")}>
                <Text style={styles.sortLabel}>최신 순</Text>
                <Text style={[styles.checkMark, sortOrder === "latest" ? styles.checkActive : styles.checkInactive]}>✓</Text>
              </Pressable>
              <Pressable style={styles.sortRow} onPress={() => setSortOrder("oldest")}>
                <Text style={styles.sortLabel}>오래된 순</Text>
                <Text style={[styles.checkMark, sortOrder === "oldest" ? styles.checkActive : styles.checkInactive]}>✓</Text>
              </Pressable>
              <View style={styles.sheetActions}>
                <Pressable
                  style={styles.resetBtn}
                  onPress={() => {
                    setSortOrder("latest");
                    // 정렬 초기화는 필터 초기화와 동시에 진행 (다른 필터 초기화는 onResetSheet에서 이미 처리됨)
                  }}
                >
                  <Text style={styles.resetText}>초기화</Text>
                </Pressable>
                <Pressable style={styles.applyBtn} onPress={onApplySheet}><Text style={styles.applyText}>완료</Text></Pressable>
              </View>
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    title: { fontSize: 24, fontFamily: "neurimbo", marginBottom: 8, marginLeft: 16 },
    topContainer: { justifyContent: "space-between", flexDirection: "row", marginRight: 16, alignItems: "center" },
    tagScroll: { marginLeft: 16, paddingVertical: 8, flexDirection: "row" },
    content1_container: { paddingHorizontal: 16, flexDirection: "column", alignItems: "center", paddingBottom: 32 },
    content1_img: { width: "100%", height: 345, borderRadius: 20, marginVertical: 12, resizeMode: "cover" },
    tagSection: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginVertical: 12 },
    iconGroup: { flexDirection: "row", gap: 8 },
    tagDisplayWrap: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      marginRight: 8,
    },
    contentTextWrap: { width: "100%", alignSelf: "stretch" },
    contentText: { fontSize: 14, fontWeight: "400" as any, textAlign: "left", lineHeight: 20 },
    sheetWrap: { padding: 20, paddingBottom: 24 },
    sheetTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12 },
    inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F3F3F3", borderRadius: 12, paddingHorizontal: 12, height: 44, marginBottom: 12 },
    input: { flex: 1, fontSize: 15, paddingVertical: 0 },
    addBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: "#EFEFEF" },
    addBtnDisabled: { backgroundColor: "#F5F5F5" },
    addBtnText: { fontWeight: "700", color: "#4A4A4A" },
    chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8, marginBottom: 16 },
    chip: { height: 34, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: "#E1E1E1", backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" },
    chipSelected: { borderColor: "#FF7A00", backgroundColor: "#FFF4ED" },
    chipText: { fontSize: 14, color: "#3F3F3F", fontWeight: "500" },
    chipTextSelected: { color: "#FF7A00", fontWeight: "700" },
    sheetActions: { flexDirection: "row", gap: 12, marginTop: 4 },
    resetBtn: { flex: 1, height: 48, borderRadius: 999, backgroundColor: "#EFEFEF", alignItems: "center", justifyContent: "center" },
    resetText: { fontSize: 16, fontWeight: "700", color: "#444" },
    applyBtn: { flex: 1, height: 48, borderRadius: 999, backgroundColor: "#111", alignItems: "center", justifyContent: "center" },
    applyText: { fontSize: 16, fontWeight: "700", color: "#fff" },
    sortRow: { height: 52, paddingHorizontal: 4, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderBottomColor: "#EFEFEF", borderBottomWidth: 1 },
    sortLabel: { fontSize: 16, color: "#222" },
    checkMark: { fontSize: 18, fontWeight: "900" },
    checkActive: { color: "#FF7A00" },
    checkInactive: { color: "#CFCFCF" },
  });
