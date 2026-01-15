import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import DraggableFlatList, { RenderItemParams } from 'react-native-draggable-flatlist';
import { SafeAreaView } from 'react-native-safe-area-context';

// ✅ Firebase 모듈 import
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  writeBatch,
} from 'firebase/firestore';
import { auth, db } from '../../firebase'; // 경로 확인 필요

// svg
import BackIcon from '../../components/icons/Back';
import DragIcon from '../../components/icons/Drag';
import PlusIcon from '../../components/icons/Plus';

// ✅ Firestore 문서 타입을 정의합니다.
type Chapter = {
  id: string;
  name: string;
  description: string;
  // 'order' 필드는 순서 저장을 위해 사용되지만, UI 상태에서는 필수는 아님
};

export default function ChapterList() {
  const router = useRouter();
  // ✅ Firestore에서 불러온 데이터를 저장할 상태
  const [data, setData] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Firestore에서 챕터 목록을 실시간으로 불러옵니다.
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoading(false);
      return; // 로그인하지 않은 경우
    }

    const chaptersRef = collection(db, 'users', uid, 'chapters');
    // 'order' 필드를 기준으로 정렬합니다. 이 필드가 없다면 createdAt으로 정렬할 수 있습니다.
    const q = query(chaptersRef, orderBy('order', 'asc'));

    // onSnapshot으로 실시간 변경사항을 감지합니다.
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chaptersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name,
        description: doc.data().description,
      }));
      setData(chaptersData);
      setLoading(false);
    });

    // 화면이 사라질 때 리스너를 정리합니다.
    return () => unsubscribe();
  }, []);

  // ✅ 드래그가 끝났을 때 호출되어 변경된 순서를 Firestore에 저장합니다.
  const handleDragEnd = async ({ data: newData }: { data: Chapter[] }) => {
    // UI는 즉시 업데이트
    setData(newData);

    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // writeBatch를 사용해 여러 문서를 한 번에 효율적으로 업데이트합니다.
    const batch = writeBatch(db);
    const chaptersRef = collection(db, 'users', uid, 'chapters');

    newData.forEach((item, index) => {
      const docRef = doc(chaptersRef, item.id);
      batch.update(docRef, { order: index }); // 각 문서의 'order' 필드를 새 인덱스로 업데이트
    });

    try {
      await batch.commit();
    } catch (error) {
      console.error("Error updating chapter order: ", error);
      // 필요하다면 에러 처리 (예: 토스트 메시지)
    }
  };

  const renderItem = ({ item, drag }: RenderItemParams<Chapter>) => (
    <Pressable
      style={styles.itemContainer}
      onPress={() =>
        router.push({
          pathname: '/chapter/edit/[id]',
          params: {
            id: item.id,
            name: item.name,
            description: item.description ?? '',
          },
        })
      }
    >
      <View style={styles.itemContent}>
        <Text style={styles.itemText}>{item.name}</Text>
        <Pressable onPressIn={drag}>
          <DragIcon width={24} height={24} />
        </Pressable>
      </View>
    </Pressable>
  );
  
  // ❌ params를 통해 데이터를 받던 useEffect들은 이제 필요 없으므로 삭제합니다.

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator />
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
       {/*상단헤더*/}
        <View style={styles.headerWrapper}>
        <View style={styles.headerWrapperLeft}>
          <Pressable onPress={() => router.push('/(tabs)')}>
            <BackIcon />
          </Pressable>
          <Text style={styles.headerText}>챕터</Text>
        </View>

        <View style={styles.headerWrapperRight}>
          <Pressable onPress={() => router.push('/chapter/new')}>
            <PlusIcon width={24} height={24} />
          </Pressable>
        </View>
      </View>

       {/*챕터리스트*/}
      <DraggableFlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onDragEnd={handleDragEnd} // ✅ 드래그 완료 후 순서 저장 함수 연결
        contentContainerStyle={{ gap: 12 }}
      />
    </SafeAreaView>
  );
}

export const options = {
  headerShown: false,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerWrapper: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
    headerWrapperLeft: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12
  },
  headerWrapperRight:{

  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  plusIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  itemContainer: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  itemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemText: {
    fontSize: 16,
    color: '#222',
  },
  dragIcon: {
    width: 18,
    height: 18,
    resizeMode: 'contain',
    opacity: 0.5,
  },
});
