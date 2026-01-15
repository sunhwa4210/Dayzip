import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, Text, View } from "react-native";
import InputField from "../../components/InputField";
import TopBar from "../../components/topBar";
import { auth, db } from "../../firebase";
import DayView from "./home/DayView";
import MonthView from "./home/MonthView";
import WeekView from "./home/WeekView";

// [수정] Firestore에서 가져올 챕터 데이터의 전체 타입을 정의합니다. (ID와 이름 포함)
type Chapter = {
  id: string;
  name: string;
};

export default function HomeScreen() {
  // --- 상태 관리 수정 ---

  // [수정] Firestore에서 가져온 챕터 객체({id, name}) 전체를 저장할 상태입니다.
  const [chapters, setChapters] = useState<Chapter[]>([]);
  
  // [수정] 현재 선택된 챕터의 'ID'를 저장하는 상태입니다. 이름이 아닌 ID를 기준으로 관리합니다.
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const [isLoadingTabs, setIsLoadingTabs] = useState(true);
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'day'>('week');
  
  const uid = auth.currentUser?.uid;

  // --- 데이터 로직 수정 ---
  useEffect(() => {
    if (!uid) {
      setIsLoadingTabs(false);
      return;
    }

    const chaptersRef = collection(db, "users", uid, "chapters");
    // [참고] 챕터 순서가 있다면 'order'로 정렬하는 것이 좋습니다. 없다면 'createdAt'도 괜찮습니다.
    const q = query(chaptersRef, orderBy("order", "asc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      // [수정] 문서의 id와 name을 모두 포함하는 객체 배열로 데이터를 가공합니다.
      const fetchedChapters = snapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name as string,
      }));
      setChapters(fetchedChapters);

      // [수정] 처음 로드될 때, 첫 번째 챕터의 'ID'를 기본 선택값으로 설정합니다.
      if (fetchedChapters.length > 0 && !selectedChapterId) {
        setSelectedChapterId(fetchedChapters[0].id);
      } else if (fetchedChapters.length === 0) {
        setSelectedChapterId(null);
      }
      
      setIsLoadingTabs(false);
    });

    return () => unsubscribe();
  }, [uid]); // selectedChapterId를 의존성 배열에서 제거하여 무한 루프를 방지합니다.

  // [추가] TopBar UI에 필요한 값들을 파생시키는 로직입니다.
  // 1. TopBar에 표시할 챕터 '이름' 목록
  const chapterNames = useMemo(() => chapters.map(c => c.name), [chapters]);

  // 2. 현재 선택된 'ID'에 해당하는 챕터 '이름' (선택된 탭을 하이라이트하기 위함)
  const selectedChapterName = useMemo(() => {
    return chapters.find(c => c.id === selectedChapterId)?.name || "";
  }, [chapters, selectedChapterId]);

  // [추가] TopBar에서 탭(이름)이 선택되었을 때, 해당하는 'ID'를 찾아 상태를 업데이트하는 함수입니다.
  const handleSelectChapter = (chapterName: string) => {
    const foundChapter = chapters.find(c => c.name === chapterName);
    if (foundChapter) {
      setSelectedChapterId(foundChapter.id);
    }
  };

  // --- 렌더링 로직 ---
  const renderView = () => {
    // [수정] 로딩 및 선택 여부를 'selectedChapterId' 기준으로 판단합니다.
    if (isLoadingTabs || !selectedChapterId) {
       return (
         <View style={styles.emptyContainer}>
           <Text style={styles.emptyText}>
             {isLoadingTabs ? '챕터를 불러오는 중...' : '챕터를 생성해주세요.'}
           </Text>
         </View>
       );
    }
    
    switch (viewMode) {
      // [수정] MonthView, WeekView, DayView에는 반드시 'ID'를 전달합니다.
      case 'month': return <MonthView selectedChapter={selectedChapterId} />;
      case 'week': return <WeekView selectedChapter={selectedChapterId} />;
      case 'day': return <DayView selectedChapter={selectedChapterId} />;
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {isLoadingTabs ? (
        <View style={{height: 51, justifyContent: 'center'}}>
            <ActivityIndicator />
        </View>
      ) : (
        <TopBar 
          // [수정] TopBar에는 UI 표시에 필요한 '이름' 관련 값들을 전달합니다.
          selectedTab={selectedChapterName}
          setSelectedTab={handleSelectChapter}
          tabs={chapterNames} 
        />
      )}
      
      <InputField currentView={viewMode} onChangeView={setViewMode} />
      
      {renderView()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    color: '#888',
    fontSize: 16,
  }
});
