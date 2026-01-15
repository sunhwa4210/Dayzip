import CustomBottomSheet from '@/components/CustomBottomSheet';
import CustomButton from '@/components/CustomButton';
import BookIcon from '../../../components/icons/Bookmark';
import BookIconFocus from '../../../components/icons/BookmarkFocus';
import HeartIcon from '../../../components/icons/Heart';
import HeartFocusIcon from '../../../components/icons/HeartFocus';

import { BottomSheetModal, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import { router, useLocalSearchParams } from 'expo-router';
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, Timestamp } from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  ImageErrorEventData,
  Keyboard,
  KeyboardAvoidingView,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from 'react-native';

import { auth, db, storage } from '@/firebase';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';

import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Share as RNShare } from 'react-native'; // (옵션) fallback
import ViewShot from 'react-native-view-shot';


function extractObjectPathFromDownloadURL(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

function extractStoragePathFlexible(url?: string | null): string | null {
  if (!url) return null;
  if (url.startsWith('gs://')) {
    const idx = url.indexOf('/', 'gs://'.length);
    return idx > -1 ? url.slice(idx + 1) : null;
  }
  return extractObjectPathFromDownloadURL(url);
}

async function toHttpsDownloadURLMaybe(input?: string | null): Promise<string | null> {
  const v = (input ?? '').trim();
  if (!v) return null;
  if (!v.startsWith('gs://')) return v;
  const path = extractStoragePathFlexible(v);
  if (!path) return null;
  const fileRef = storageRef(storage, path);
  const url = await getDownloadURL(fileRef);
  return url?.trim() ?? null;
}



type Chapter = {
  id: string;
  name: string;
};

export default function DiaryResult() {
  const navigation = useNavigation();
  const hasReset = useRef(false);
  const chapterSheetRef = useRef<BottomSheetModal>(null);
  const tagSheetRef = useRef<BottomSheetModal>(null);

  const viewShotRef = useRef<ViewShot>(null); //이미지 스냅샷

  const { content, imageUrl, selectedEmotion, selectedDate } = useLocalSearchParams() as {
    content?: string;
    imageUrl?: string;
    selectedEmotion?: string | string[];
    selectedDate?: string | string[];
  };

  const safeselectedEmotion = typeof selectedEmotion === 'string' ? selectedEmotion : '';
  const safeselectedDate = typeof selectedDate === 'string' ? selectedDate : '';

  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadingChapters, setLoadingChapters] = useState(true);

  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');

  // [추가] 좋아요 상태를 관리하기 위한 상태 변수를 선언합니다. (기본값: false)
  const [isLiked, setIsLiked] = useState<boolean>(false);
  // [추가] 북마크 상태를 관리하기 위한 상태 변수를 선언합니다. (기본값: false)
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);

  const tagSheetSnapPoints = useMemo(() => ['45%'], []);

  useEffect(() => {
    const unsubscribe = (navigation as any).addListener('beforeRemove', (e: any) => {
      if (hasReset.current) return;
      e.preventDefault();
      hasReset.current = true;
      (navigation as any).reset({ index: 0, routes: [{ name: '(tabs)' }] });
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const httpsUrl = await toHttpsDownloadURLMaybe(imageUrl);
      if (mounted) setResolvedImageUrl(httpsUrl);
    })();
    return () => { mounted = false; };
  }, [imageUrl]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setLoadingChapters(false);
      return;
    }
    const chaptersRef = collection(db, 'users', uid, 'chapters');
    const q = query(chaptersRef, orderBy('order', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chaptersData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name as string,
      }));
      setChapters(chaptersData);
      setLoadingChapters(false);
    });
    return () => unsubscribe();
  }, []);

  const savingRef = useRef(false);

  // [수정] handleSaveDiary 함수에 isLiked와 isBookmarked 상태를 함께 저장하도록 수정합니다.
  const handleSaveDiary = async (chapterId: string) => {
    if (savingRef.current) return;
    savingRef.current = true;

    chapterSheetRef.current?.dismiss();

    try {
      const user = auth.currentUser;
      if (!user) {
        Alert.alert('알림', '로그인이 필요합니다.');
        return;
      }

      const rawDate = Array.isArray(selectedDate) ? selectedDate[0] : (selectedDate as string | undefined);
      const diaryDate = rawDate ? new Date(rawDate) : new Date();

      const emotion = Array.isArray(selectedEmotion) ? selectedEmotion[0] : (selectedEmotion as string | undefined);
      const normalizedImageUrl = (resolvedImageUrl ?? imageUrl ?? '').trim();
      const storagePath = extractStoragePathFlexible(imageUrl) ?? extractStoragePathFlexible(normalizedImageUrl) ?? '';

      const payload = {
        uid: user.uid,
        content: (content as string) || '',
        emotion: emotion || '',
        diaryDate: Timestamp.fromDate(diaryDate),
        imageUrl: normalizedImageUrl,
        storagePath,
        chapterId: chapterId,
        tags: tags,
        isLiked: isLiked,           // [추가] 좋아요 상태(boolean)를 payload에 포함합니다.
        isBookmarked: isBookmarked, // [추가] 북마크 상태(boolean)를 payload에 포함합니다.
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        isDeleted: false,
      };

      await addDoc(collection(db, 'users', user.uid, 'diaries'), payload);

      Alert.alert('저장 완료!', '일기를 저장했습니다.');
      
      router.replace('/(tabs)');

    } catch (e: any) {
      console.log('diary save error:', e?.code, e?.message);
      let msg = '저장 중 문제가 발생했어요. 잠시 후 다시 시도해주세요.';
      if (e?.code === 'permission-denied') msg = '권한 오류입니다. Firestore 규칙을 확인해주세요.';
      if (e?.code === 'unavailable') msg = '네트워크 상태를 확인해주세요.';
      Alert.alert('오류', msg);
    } finally {
      savingRef.current = false;
    }
  };
  
  const openTagSheet = () => {
    tagSheetRef.current?.present();
  };

  const handleAddTag = useCallback(() => {
    const finalized = newTag.normalize('NFC').trim();
    if (finalized && !tags.includes(finalized)) {
      setTags(prev => [...prev, finalized]);
      setNewTag('');
    }
  }, [newTag, tags]);

  const handleTagChange = useCallback((t: string) => {
    setNewTag(t);
  }, []);

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagSheetSave = () => {
    tagSheetRef.current?.dismiss();
    Keyboard.dismiss();
  };

  const openChapterSheet = () => {
    chapterSheetRef.current?.present();
  };

  const handleCreateNewChapter = () => {
    chapterSheetRef.current?.dismiss();
    router.push('/chapter/new');
  };

  // [추가] 좋아요 상태를 반전시키는 함수입니다.
  const toggleLike = useCallback(() => {
    setIsLiked(prev => !prev);
  }, []);

  // [추가] 북마크 상태를 반전시키는 함수입니다.
  const toggleBookmark = useCallback(() => {
    setIsBookmarked(prev => !prev);
  }, []);
  

  const hasImage = typeof resolvedImageUrl === 'string' && resolvedImageUrl.trim().length > 0 && /^https?:\/\//.test(resolvedImageUrl);

  const handleCaptureAndSave = async () => {
    try {
      // 1) 권한 확인/요청
      const perm = await MediaLibrary.requestPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('권한 필요', '사진 보관함 접근 권한이 필요합니다.');
        return;
      }
  
      // 2) 캡처 실행 (tmpfile URI 반환)
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) {
        Alert.alert('오류', '캡처에 실패했어요.');
        return;
      }
  
      // 3) 앨범에 저장
      const asset = await MediaLibrary.createAssetAsync(uri);
      // 존재하는 앨범에 넣거나 없으면 생성
      await MediaLibrary.createAlbumAsync('Diary Captures', asset, false);
  
      Alert.alert('저장 완료', '갤러리에 이미지가 저장되었습니다.');
    } catch (e: any) {
      console.log('capture/save error:', e?.message);
      Alert.alert('오류', '이미지를 저장하는 중 문제가 발생했어요.');
    }
  };
  
  const handleCaptureAndShare = async () => {
    try {
      // 1) 뷰 캡처 (임시 파일 URI 반환)
      const uri = await viewShotRef.current?.capture?.({ format: 'png', quality: 1 });
      if (!uri) {
        Alert.alert('오류', '캡처에 실패했어요.');
        return;
      }
  
      // 2) Sharing 사용 가능 여부 체크 (웹/특정 플랫폼 대비)
      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(uri, {
          dialogTitle: '일기 이미지 공유',
          mimeType: 'image/png', // iOS/Android 모두 안전
        });
      } else {
        // (옵션) expo-sharing 미지원 환경 대비: RN 기본 Share로 fallback
        await RNShare.share({
          url: uri,
          message: '내 일기 이미지',
        });
      }
    } catch (e: any) {
      console.log('capture/share error:', e?.message);
      Alert.alert('오류', '이미지를 공유하는 중 문제가 발생했어요.');
    }
  };

  
  return (
    <View style={styles.container}>
      {/* 상단 UI 영역 */}
      <View style={styles.buttonRow1}>
        <CustomButton
          variant='close'
          imageSource={require('@/assets/images/close.png')}
          onPress={() => router.push("/")}
        />
        <View style={styles.centerRow}>
          <CustomButton variant='emotion' label={safeselectedEmotion} />
          <CustomButton variant='date2' label={safeselectedDate} />
          <View style={{ flex: 1 }} />
        </View>
      </View>


      <ScrollView style={styles.DairyText}>
                {/* 이미지 및 일기 내용 영역 */}
        <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }} // 고화질 PNG
            style={{ backgroundColor: 'white' }}   // 투명 배경 회피용(권장)
          >
          <View style={styles.ImageView}>
            {hasImage ? (
              <Image
                key={resolvedImageUrl}
                source={{ uri: resolvedImageUrl! }}
                style={styles.Image}
                onError={(e: NativeSyntheticEvent<ImageErrorEventData>) => { 
                  console.error('이미지 로딩 실패', e.nativeEvent); 
                }}
              />
            ) : (
              <View style={[styles.Image, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#999' }}>이미지 불러오는 중…</Text>
              </View>
            )}

            <View style={styles.textalign}>
              <Text style={styles.content}>{content}</Text>
              
              {/* [수정] 태그와 아이콘을 한 줄에 배치하기 위한 새로운 UI 구조입니다. */}
              <View style={styles.TagSection}>
                <View style={styles.tagcontainer}>
                  <Pressable style={styles.tagDisplayContainer} onPress={openTagSheet}>
                    {tags.length > 0 ? (
                      tags.map(tag => (
                        <Text key={tag} style={styles.tagText}>#{tag}</Text>
                      ))
                    ) : (
                      <Text style={styles.tagPlaceholder}># 태그 없음</Text>
                    )}
                  </Pressable>
                </View>
                <View style={styles.iconActionsContainer}>
                  <Pressable onPress={toggleLike}>
                    {isLiked ? <HeartFocusIcon width={24} height={24} /> : <HeartIcon width={24} height={24} />}
                  </Pressable>
                  <Pressable onPress={toggleBookmark}>
                    {isBookmarked ? <BookIconFocus width={24} height={24} /> : <BookIcon width={24} height={24} />}
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </ViewShot>
      </ScrollView>

      {/* 하단 버튼 영역 */}
            <View style={styles.buttonRow2}>
        <CustomButton
          variant='BottomButton'
          imageSource={require('@/assets/images/Share.png')}
          onPress={handleCaptureAndShare}   // ✅ 추가
        />
        
        <CustomButton
          variant='BottomButton'
          imageSource={require('@/assets/images/Download.png')}
          onPress={handleCaptureAndSave}
        />
        <CustomButton
          variant='save'
          label='저장하기'
          onPress={openChapterSheet}
        />
      </View>

      {/* 챕터 선택 바텀시트 */}
      <CustomBottomSheet bottomSheetModalRef={chapterSheetRef} enablePanDownToClose>
        <View style={styles.sheetContainer}>
          <Text style={styles.sheetTitle}>어디에 저장할까요?</Text>
          {loadingChapters ? (
            <ActivityIndicator />
          ) : (
            <FlatList
              data={chapters}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Pressable style={styles.sheetItem} onPress={() => handleSaveDiary(item.id)}>
                  <Text style={styles.sheetItemText}>{item.name}</Text>
                  <Text style={styles.sheetItemArrow}>{'>'}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
          <View style={styles.separator} />
          <Pressable style={styles.sheetItem} onPress={handleCreateNewChapter}>
            <Text style={styles.sheetItemText}>새로 만들기</Text>
            <Text style={styles.sheetItemArrow}>{'+'}</Text>
          </Pressable>
        </View>
      </CustomBottomSheet>

      {/* 태그 편집 바텀시트 */}
      <CustomBottomSheet bottomSheetModalRef={tagSheetRef} snapPoints={tagSheetSnapPoints} enablePanDownToClose>
        <View style={styles.sheetContainer}>
          <KeyboardAvoidingView 
            style={styles.keyboardAvoidingContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
          >
            <ScrollView style={styles.tagScrollContainer} keyboardShouldPersistTaps="handled">
              <View style={styles.tagSheetHeader}>
                  <Text style={styles.tagSheetTitle}>태그</Text>
                  <Pressable onPress={handleTagSheetSave}>
                      <Text style={styles.tagSheetSaveButtonText}>저장</Text>
                  </Pressable>
              </View>
              
              <View style={styles.tagListContainer}>
                {tags.map(tag => (
                  <View key={tag} style={styles.tagItem}>
                    <Text style={styles.tagItemTextValue}>#{tag}</Text>
                    <Pressable onPress={() => handleRemoveTag(tag)} style={styles.tagRemoveButton}>
                      <Text style={styles.tagRemoveButtonText}>×</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            </ScrollView>
            
            <View style={styles.tagInputContainer}>
              <BottomSheetTextInput
                style={styles.tagInput}
                placeholder="새 태그 추가"
                placeholderTextColor="#A0A0A0"
                value={newTag}
                onChangeText={handleTagChange}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
                autoCorrect={false}
                autoCapitalize="none"
                importantForAutofill="no"
                spellCheck={false}
                keyboardType="default"
                {...(Platform.OS === 'android' ? { textBreakStrategy: 'simple' as const } : {})}
              />
              <Pressable 
                style={[
                  styles.tagAddButton, 
                  !newTag.trim() && styles.tagAddButtonDisabled
                ]} 
                onPress={handleAddTag} 
                disabled={!newTag.trim()}
              >
                <Text style={styles.tagAddButtonText}>추가</Text>
              </Pressable>
            </View>
          </KeyboardAvoidingView>
        </View>
      </CustomBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white", paddingTop: 50, justifyContent: 'center' },
  buttonRow1: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginTop: 16 },
  centerRow: { flexDirection: 'row', alignItems: 'center', gap: 0 },
  Image: { width: 350, height: 350, backgroundColor: "lightgray" },
  ImageView: { justifyContent: 'center', alignItems: 'center', width: '100%', marginTop: 20 },
  DairyText: { flex: 1 },
  content: { fontSize: 16, color: '#333', fontWeight: '400', marginTop: 16 },
  textalign: { width: '100%', alignItems: 'flex-start', paddingHorizontal: 30 },
  buttonRow2: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 24, marginBottom: 30 },
  sheetContainer: {
    flex: 1,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  sheetItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  sheetItemText: {
    fontSize: 16,
  },
  sheetItemArrow: {
    fontSize: 16,
    color: '#888',
  },
  separator: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 24,
  },
  
  // [추가] 태그와 아이콘을 한 줄에 배치하기 위한 새로운 스타일들입니다.
  TagSection:{
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // 왼쪽(태그)과 오른쪽(아이콘)을 양 끝으로 분리
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#F0F0F0',
  },
  tagcontainer: {
    flex: 1, // 아이콘을 제외한 나머지 공간을 모두 차지하도록 설정
  },
  iconActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16, // 아이콘 사이의 간격
    paddingLeft: 16, // 태그와의 최소 간격 확보
  },
  
  keyboardAvoidingContainer: {
    flex: 1,
  },
  // [수정] tagDisplayContainer는 이제 TagSection 안에 위치하므로, 불필요한 스타일을 제거합니다.
  tagDisplayContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagText: {
    color: '#8E8E93', 
    fontSize: 14,
  },
  tagPlaceholder: {
    color: '#8E8E93', 
    fontSize: 14,
  },
  tagScrollContainer: {
    flex: 1,
  },
  tagSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  tagSheetTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  tagSheetSaveButtonText: {
    color: '#FF9500', 
    fontSize: 16,
    fontWeight: '600',
  },
  tagListContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  tagItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  tagItemTextValue: {
    fontSize: 14,
    color: '#333',
  },
  tagRemoveButton: {
    marginLeft: 8,
    padding: 2,
  },
  tagRemoveButtonText: {
    color: '#8E8E93',
    fontWeight: 'bold',
    fontSize: 16,
  },
  tagInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  tagInput: {
    flex: 1,
    borderWidth: 0,
    backgroundColor: '#F0F0F0',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    fontSize: 16,
    color: '#000',
  },
  tagAddButton: {
    backgroundColor: '#1B1B1B',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginLeft: 12,
  },
  tagAddButtonDisabled: {
    backgroundColor: '#D1D1D6',
  },
  tagAddButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});