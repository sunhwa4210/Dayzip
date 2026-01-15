// app/home/detail/index.tsx
import { Feather } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as MediaLibrary from 'expo-media-library';
import { router, useLocalSearchParams } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, Pressable, Share as RNShare, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';

// [수정] BottomSheetScrollView와 BottomSheetBackdrop를 추가로 import 합니다.
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView, BottomSheetTextInput } from '@gorhom/bottom-sheet';

// CustomBottomSheet 컴포넌트를 import 합니다.
import CustomBottomSheet from '../../../../components/CustomBottomSheet';
import CustomModal from '../../../../components/CustomModal';

import { auth, db, storage } from '@/firebase';
import {
  Timestamp,
  collection,
  deleteDoc,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref } from 'firebase/storage';

import { getFunctions, httpsCallable } from 'firebase/functions';
const fun = getFunctions(undefined, 'asia-northeast3');

import BookmarkIcon from '../../../../components/icons/Bookmark';
import BookmarkIconFocus from '../../../../components/icons/BookmarkFocus';
import EditIcon from '../../../../components/icons/Edit';
import HeartIcon from '../../../../components/icons/Heart';
import HeartIconFocus from '../../../../components/icons/HeartFocus';

const BackIcon = () => <Text style={styles.icon}>←</Text>;
const MoreIcon = () => <Text style={styles.icon}>⋯</Text>;
const UserIcon = () => <Text style={styles.userEmoji}>👤</Text>;

const KEEP_ALIVE_MS = 180_000;
const MAX_LISTEN_KEYS = 64;

type DiaryDoc = {
  content?: string;
  emotion?: string;
  imageUrl?: string;
  diaryDate?: Timestamp;
  aiComment?: string;
  aiCommentAt?: Timestamp;
  userComment?: string;
  tags?: string[];
  isLiked?: boolean;
  isBookmarked?: boolean;
};

type CacheEntry = {
  entry: DiaryDoc | null;
  docId?: string | null;
  unsub?: () => void;
};

const toObjectPath = (u?: string | null) => {
  if (!u) return null;
  const m = u.match(/\/o\/([^?]+)/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
};
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDay   = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
const fmt = (d: Date) => `${d.getFullYear()}. ${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getDate()).padStart(2, '0')}.`;
const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

function shallowEqualDiary(a: DiaryDoc | null, b: DiaryDoc | null) {
  if (a === b) return true;
  if (!a || !b) return false;
  const aT = a.diaryDate instanceof Timestamp ? a.diaryDate.toMillis() : (a.diaryDate as any);
  const bT = b.diaryDate instanceof Timestamp ? b.diaryDate.toMillis() : (b.diaryDate as any);
  return a.content === b.content && a.imageUrl === b.imageUrl && a.emotion  === b.emotion  && a.aiComment === b.aiComment && aT === bT;
}

export default function DiaryDetailPage() {
  const params = useLocalSearchParams();
  const { date, day, diaryId, chapterId } = params as { date?: string; day?: string; diaryId?: string; chapterId?: string };
  const isFromSearch = !!diaryId;
  const targetDate = useMemo(() => {
    if (date) return new Date(date);
    const now = new Date();
    const d = Number(day || now.getDate());
    return new Date(now.getFullYear(), now.getMonth(), d);
  }, [date, day]);

  const [tags, setTags] = useState<string[]>([]);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState<boolean>(!isFromSearch);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [emotion, setEmotion] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [docIdState, setDocIdState] = useState<string | null>(isFromSearch ? (diaryId || null) : null);
  const [aiComment, setAiComment] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [chapters, setChapters] = useState<Array<{ id: string; title: string }>>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCommentDeleteModal, setShowCommentDeleteModal] = useState(false);
  const [userComment, setUserComment] = useState('');
  const [savedUserComment, setSavedUserComment] = useState<string | null>(null);
  const lastUpsertedIdRef = useRef<string | null>(null);
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const mountedRef = useRef(true);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const moreOptionsSheetRef = useRef<BottomSheetModal>(null);
  const tagSheetRef = useRef<BottomSheetModal>(null);
  const chapterMoveSheetRef = useRef<BottomSheetModal>(null);
  const tagSheetSnapPoints = useMemo(() => ['45%'], []);
  const chapterMoveSnapPoints = useMemo(() => ['50%'], []);
  const key = isFromSearch ? `ID:${diaryId}` : `DATE:${dateKey(targetDate)}_CHAPTER:${chapterId}`;

  const viewShotRef = useRef<ViewShot>(null);


  const touch = (k: string) => {
    const v = cacheRef.current.get(k); if (!v) return;
    cacheRef.current.delete(k); cacheRef.current.set(k, v);
  };
  const pruneIfNeeded = (currentKey: string) => {
    while (cacheRef.current.size > MAX_LISTEN_KEYS) {
      let victim: string | undefined;
      for (const k of cacheRef.current.keys()) { if (k !== currentKey) { victim = k; break; } }
      if (!victim) break;
      const ce = cacheRef.current.get(victim);
      ce?.unsub?.(); cacheRef.current.delete(victim);
    }
  };
  const fetchAndUpsertAiComment = async (id: string, body: string) => {
    try {
      if (!id || !body || lastUpsertedIdRef.current === id) return;
      setAiLoading(true); setAiError(null);
      const call = httpsCallable(fun, 'upsertDiaryAIComment');
      const res = await call({ diaryId: id, content: body });
      const data = (res?.data || {}) as { aiComment?: string };
      if (!data.aiComment) throw new Error('Empty aiComment');
      setAiComment(data.aiComment); lastUpsertedIdRef.current = id;
      const u = auth.currentUser;
      if (u) {
        await updateDoc(doc(db, 'users', u.uid, 'diaries', id), {
          aiComment: data.aiComment, aiCommentAt: serverTimestamp(),
        });
      }
    } catch (e: any) { setAiError('AI 코멘트를 불러오지 못했습니다.'); }
    finally { setAiLoading(false); }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // 챕터 목록 가져오기
  useEffect(() => {
    const u = auth.currentUser;
    if (!u) return;
    
    const chaptersRef = collection(db, 'users', u.uid, 'chapters');
    const q = query(chaptersRef, orderBy('order', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chapterList = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().name || '제목 없음'
      }));
      setChapters(chapterList);
    });
    
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); blurTimerRef.current = null; }
    if (!isFromSearch && !chapterId) {
      setLoading(false); setContent('챕터 정보가 없어 일기를 불러올 수 없습니다.'); return;
    }
    const cached = cacheRef.current.get(key)?.entry ?? null;
    if (cached) {
      setLoading(false); setDocIdState(cacheRef.current.get(key)?.docId ?? null);
      setEmotion(cached.emotion ?? null); setContent(cached.content ?? null); setAiComment(cached.aiComment ?? null);
      setImageUrl(cached.imageUrl ?? null); setTags(cached.tags || []);
      setIsLiked(cached.isLiked || false); setIsBookmarked(cached.isBookmarked || false);
      setSavedUserComment(cached.userComment ?? null);
    } else {
      if (!isFromSearch) setLoading(true); setAiComment(null);
    }
    const u = auth.currentUser; if (!u) { setLoading(false); return; }
    if (cacheRef.current.get(key)?.unsub) { touch(key); pruneIfNeeded(key); return; }
    let unsub: (() => void) | undefined;
    const processSnapshot = async (snap: any, id?: string) => {
      const docId = id || snap?.id;
      const d = snap?.exists() ? (snap.data() as DiaryDoc) : null;
      let url = d?.imageUrl ?? null;
      const path = toObjectPath(url);
      if (path) { try { url = await getDownloadURL(ref(storage, path)); } catch {} }
      const next = d ? { ...d, imageUrl: url ?? d.imageUrl } : null;
      const prev = cacheRef.current.get(key)?.entry ?? null;
      if (!shallowEqualDiary(prev, next) || cacheRef.current.get(key)?.docId !== docId) {
        cacheRef.current.set(key, { entry: next, docId, unsub });
        if (mountedRef.current) {
          setDocIdState(docId); setEmotion(next?.emotion ?? null); setContent(next?.content ?? null);
          setAiComment(next?.aiComment ?? null); setImageUrl(next?.imageUrl ?? null);
          setTags(next?.tags || []); setIsLiked(next?.isLiked || false); setIsBookmarked(next?.isBookmarked || false);
          setSavedUserComment(next?.userComment ?? null);
        }
      }
      touch(key); pruneIfNeeded(key);
      if (mountedRef.current) setLoading(false);
      if (mountedRef.current && docId && next?.content && !next.aiComment) {
        fetchAndUpsertAiComment(docId, next.content);
      }
    };
    if (isFromSearch && diaryId) {
      const refDoc = doc(db, 'users', u.uid, 'diaries', diaryId);
      unsub = onSnapshot(refDoc, (snap) => processSnapshot(snap, diaryId), console.warn);
    } else {
      const col = collection(db, 'users', u.uid, 'diaries');
      const qy = query(col, where('chapterId', '==', chapterId), where('diaryDate', '>=', Timestamp.fromDate(startOfDay(targetDate))), where('diaryDate', '<', Timestamp.fromDate(endOfDay(targetDate))), orderBy('diaryDate', 'desc'), limit(1));
      unsub = onSnapshot(qy, (snap) => processSnapshot(snap.docs[0]), console.warn);
    }
    cacheRef.current.set(key, { entry: cacheRef.current.get(key)?.entry ?? null, unsub });
    touch(key); pruneIfNeeded(key);
    return () => {
      if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
      blurTimerRef.current = setTimeout(() => {
        cacheRef.current.forEach((ce, k) => { ce.unsub?.(); cacheRef.current.set(k, { ...ce, unsub: undefined }); });
      }, KEEP_ALIVE_MS);
    };
  }, [key, isFromSearch, targetDate, chapterId]);

  const handleLike = useCallback(async () => {
    if (!docIdState || !auth.currentUser) return;
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
    await updateDoc(docRef, { isLiked: newLikedState });
  }, [isLiked, docIdState]);

  const handleBookmark = useCallback(async () => {
    if (!docIdState || !auth.currentUser) return;
    const newBookmarkedState = !isBookmarked;
    setIsBookmarked(newBookmarkedState);
    const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
    await updateDoc(docRef, { isBookmarked: newBookmarkedState });
  }, [isBookmarked, docIdState]);

  const handleMore = () => {
    console.log('More button pressed');
    console.log('moreOptionsSheetRef.current:', moreOptionsSheetRef.current);
    moreOptionsSheetRef.current?.present();
  };
  
  const handleShare = async () => {
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

  const handleDownloadImage = async () => {
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
  
  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
  ), []);

  const handleEditDiary = () => {
    moreOptionsSheetRef.current?.dismiss();
    router.push({
      pathname: '/(tabs)/add/writescreen',
      params: { 
        diaryId: docIdState,
        mode: 'edit',
        content: content || '',
        imageUrl: imageUrl || '',
        emotion: emotion || '',
        chapterId: chapterId || '',
        date: targetDate.toISOString(),
      }
    });
  };

  const openChapterMoveSheet = () => {
    moreOptionsSheetRef.current?.dismiss();
    chapterMoveSheetRef.current?.present();
  };

  const handleMoveToChapter = async (newChapterId: string) => {
    if (!docIdState || !auth.currentUser) return;
    
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
      await updateDoc(docRef, { chapterId: newChapterId });
      
      chapterMoveSheetRef.current?.dismiss();
      Alert.alert('챕터 이동 완료', '일기가 새로운 챕터로 이동되었습니다.');
      router.back();
    } catch (error) {
      Alert.alert('오류', '챕터 이동에 실패했습니다.');
    }
  };

  const handleSaveComment = async () => {
    if (!docIdState || !auth.currentUser || !userComment.trim()) return;
    
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
      await updateDoc(docRef, {
        userComment: userComment.trim(),
        updatedAt: serverTimestamp(),
      });
      setSavedUserComment(userComment.trim());
      setUserComment('');
      Keyboard.dismiss();
    } catch (error) {
      console.error('댓글 저장 실패:', error);
      Alert.alert('오류', '댓글 저장에 실패했습니다.');
    }
  };

  const openTagSheet = () => {
    setTempTags([...tags]);
    moreOptionsSheetRef.current?.dismiss();
    tagSheetRef.current?.present();
  };

  const handleDelete = () => {
    moreOptionsSheetRef.current?.dismiss();
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!docIdState || !auth.currentUser) return;
    
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
      await deleteDoc(docRef);
      router.back();
    } catch (error) {
      Alert.alert('오류', '일기 삭제에 실패했습니다.');
    }
  };

  const confirmCommentDelete = async () => {
    setShowCommentDeleteModal(false);
    if (!docIdState || !auth.currentUser) return;
    
    try {
      const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
      await updateDoc(docRef, {
        userComment: null,
        updatedAt: serverTimestamp(),
      });
      setSavedUserComment(null);
    } catch (error) {
      Alert.alert('오류', '회고 삭제에 실패했습니다.');
    }
  };

  const handleAddTag = useCallback(() => {
    const finalized = newTag.normalize('NFC').trim();
    if (finalized && !tempTags.includes(finalized)) {
      setTempTags(prev => [...prev, finalized]);
      setNewTag('');
    }
  }, [newTag, tempTags]);

  const handleRemoveTag = (tagToRemove: string) => {
    setTempTags(tempTags.filter(tag => tag !== tagToRemove));
  };
  
  const handleTagSheetSave = async () => {
    if (!docIdState || !auth.currentUser) return;
    setTags(tempTags);
    const docRef = doc(db, 'users', auth.currentUser.uid, 'diaries', docIdState);
    await updateDoc(docRef, { tags: tempTags });
    tagSheetRef.current?.dismiss();
    Keyboard.dismiss();
  };

  useEffect(() => {
    return () => {
      if (blurTimerRef.current) { clearTimeout(blurTimerRef.current); }
      cacheRef.current.forEach(v => v.unsub?.());
      cacheRef.current.clear();
    };
  }, []);

  const shareAreaRef = useRef<View>(null);

  return (
<SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}><BackIcon /></TouchableOpacity>
          <View style={styles.headerSpacer} />
          <TouchableOpacity onPress={handleMore} style={styles.headerButton}><MoreIcon /></TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <ViewShot
            ref={viewShotRef}
            options={{ format: 'png', quality: 1 }} // 고화질 PNG
            style={{ backgroundColor: 'white' }}   // 투명 배경 회피용(권장)
        >
          <View style={styles.imageContainer}>
            {imageUrl ? (
              <Image source={imageUrl} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="disk" transition={180}/>
            ) : (
              <View style={styles.imagePlaceholder}><Text style={{ color: '#666' }}>{loading ? '이미지 불러오는 중…' : '이미지가 없습니다'}</Text></View>
            )}
            <View style={styles.imageOverlay}>
              <View style={styles.dateContainer}><Text style={styles.dateText}>{fmt(new Date(targetDate))}</Text></View>
              {!!emotion && (<View style={styles.emotionContainer}><Text style={styles.emotionText}>{emotion}</Text></View>)}
            </View>
          </View>

          <View style={styles.actionBar}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.leftActions}>
              {(tags.length > 0) ? (
                tags.map(tag => (<View key={tag} style={styles.tagButton}><Text style={styles.tagText}>#{tag}</Text></View>))
              ) : (<Text style={styles.tagPlaceholder}># 태그 없음</Text>)}
            </ScrollView>
            {/* [수정] EditIcon을 누르면 태그 수정 바텀시트가 열리도록 onPress를 연결합니다. */}
            <TouchableOpacity style={styles.editIconContainer} onPress={openTagSheet}>
              <EditIcon width={24} height={24} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.iconBar}>
            <View style={{ flex: 1 }} />
            <TouchableOpacity onPress={handleLike} style={styles.actionButton}>
              {isLiked ? <HeartIconFocus width={24} height={24} /> : <HeartIcon width={24} height={24} />}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleBookmark} style={styles.actionButton}>
              {isBookmarked ? <BookmarkIconFocus width={24} height={24} /> : <BookmarkIcon width={24} height={24} />}
            </TouchableOpacity>
            <TouchableOpacity
                onPress={handleShare}
                style={styles.actionButton}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                accessibilityRole="button"
                accessibilityLabel="공유"
              >
                <Feather name="share-2" size={24} color="#495057" />
              </TouchableOpacity>
            </View>
          <View style={styles.contentContainer}><Text style={styles.contentText}>{content ?? (loading ? '' : '내용이 없습니다.')}</Text></View>
        </ViewShot>
        
        <View style={styles.commentsSection}>
          <TouchableOpacity style={styles.commentHeader} onPress={() => setShowComments(v => !v)}>
          <Image
            source={require('@/assets/images/aicomment.png')}
            style={{ width: 36, height: 36 }}
            contentFit="contain"
          />
            <View style={styles.commentInfo}>
              <Text style={styles.commentUser}>AI 코멘트</Text>
              <Text style={styles.commentTime}>{aiLoading ? '생성 중…' : (aiComment ? '업데이트 완료' : '대기 중')}</Text>
            </View>
          </TouchableOpacity>
          {showComments && (
            <View style={styles.commentContent}>
              {aiLoading && <Text style={styles.commentText}>코멘트 생성 중…</Text>}
              {!!aiError && !aiLoading && <Text style={[styles.commentText, { color: '#d00' }]}>{aiError}</Text>}
              {!!aiComment && !aiLoading && !aiError && <Text style={styles.commentText}>{aiComment}</Text>}
              {!aiComment && !aiLoading && !aiError && <Text style={styles.commentText}>코멘트를 준비 중입니다.</Text>}
            </View>
          )}
        </View>

        {/* 사용자 회고 표시 */}
        {savedUserComment && (
          <View style={styles.commentsSection}>
            <View style={styles.reflectionHeader}>
              <View style={styles.reflectionLeft}>
                <Image
                  source={require('@/assets/images/Subtract.png')}
                  style={{ width: 36, height: 36 }}
                  contentFit="contain"
                />
                <View style={styles.commentInfo}>
                  <Text style={styles.commentUser}>나의 회고</Text>
                </View>
              </View>
              <View style={styles.reflectionActions}>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => {
                    // 저장된 회고를 입력창으로 불러와서 수정 가능하게 함
                    setUserComment(savedUserComment);
                  }}
                >
                  <Feather name="edit-2" size={20} color="#495057" />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.iconButton}
                  onPress={() => setShowCommentDeleteModal(true)}
                >
                  <Feather name="trash-2" size={20} color="#495057" />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.commentContent}>
              <Text style={styles.commentText}>{savedUserComment}</Text>
            </View>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* 댓글 입력 영역 (하단 고정) */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.commentInputContainer}>
          <TextInput
            style={styles.commentInput}
            placeholder="회고를 입력해주세요"
            placeholderTextColor="#999"
            value={userComment}
            onChangeText={setUserComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity 
            style={[
              styles.commentSaveButton,
              !userComment.trim() && styles.commentSaveButtonDisabled
            ]}
            onPress={handleSaveComment}
            disabled={!userComment.trim()}
          >
            <Text style={[
              styles.commentSaveButtonText,
              !userComment.trim() && styles.commentSaveButtonTextDisabled
            ]}>저장</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* '더보기' 바텀시트 */}
      <CustomBottomSheet
        bottomSheetModalRef={moreOptionsSheetRef}
        snapPoints={['40%']}
        enablePanDownToClose
      >
        <View style={styles.moreSheetContainer}>
          {/* 수정 */}
          <Pressable style={styles.moreSheetItem} onPress={handleEditDiary}>
            <View style={styles.moreSheetIconContainer}>
              <Feather name="edit-3" size={20} color="#333" />
            </View>
            <Text style={styles.moreSheetItemText}>수정</Text>
          </Pressable>

          {/* 챕터 이동 */}
          <Pressable style={styles.moreSheetItem} onPress={openChapterMoveSheet}>
            <View style={styles.moreSheetIconContainer}>
              <Feather name="folder" size={20} color="#333" />
            </View>
            <Text style={styles.moreSheetItemText}>챕터 이동</Text>
          </Pressable>

          {/* 이미지 다운로드 */}
          <Pressable style={styles.moreSheetItem} onPress={handleDownloadImage}>
            <View style={styles.moreSheetIconContainer}>
              <Feather name="download" size={20} color="#333" />
            </View>
            <Text style={styles.moreSheetItemText}>이미지 다운로드</Text>
          </Pressable>


          {/* 삭제 */}
          <Pressable style={[styles.moreSheetItem, styles.moreSheetItemLast]} onPress={handleDelete}>
            <View style={styles.moreSheetIconContainer}>
              <Feather name="trash-2" size={20} color="#d32f2f" />
            </View>
            <Text style={[styles.moreSheetItemText, styles.moreSheetItemTextDanger]}>삭제</Text>
          </Pressable>
        </View>
      </CustomBottomSheet>
      

      <CustomBottomSheet
        bottomSheetModalRef={tagSheetRef}
        snapPoints={tagSheetSnapPoints}
        enablePanDownToClose
        contentComponent={BottomSheetScrollView} // 이 prop이 자모 분리 현상을 해결합니다.
      >
        <KeyboardAvoidingView style={styles.keyboardAvoidingContainer} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.tagSheetHeader}>
            <Text style={styles.tagSheetTitle}>태그</Text>
            <Pressable onPress={handleTagSheetSave}><Text style={styles.tagSheetSaveButtonText}>저장</Text></Pressable>
          </View>
          {/* ScrollView는 contentComponent로 대체되었으므로 제거하고, 내부 컨텐츠만 남깁니다. */}
          <View style={styles.tagListContainer}>
            {tempTags.map(tag => (
              <View key={tag} style={styles.tagItem}>
                <Text style={styles.tagItemTextValue}>#{tag}</Text>
                <Pressable onPress={() => handleRemoveTag(tag)} style={styles.tagRemoveButton}><Text style={styles.tagRemoveButtonText}>×</Text></Pressable>
              </View>
            ))}
          </View>
          
          {/* 입력창을 KeyboardAvoidingView의 하단에 위치시킵니다. */}
          <View style={{ flex: 1 }} /> 
          <View style={styles.tagInputContainer}>
            <BottomSheetTextInput style={styles.tagInput} placeholder="새 태그 추가" value={newTag} onChangeText={setNewTag} onSubmitEditing={handleAddTag} returnKeyType="done"/>
            <Pressable style={[styles.tagAddButton, !newTag.trim() && styles.tagAddButtonDisabled]} onPress={handleAddTag} disabled={!newTag.trim()}><Text style={styles.tagAddButtonText}>추가</Text></Pressable>
          </View>
        </KeyboardAvoidingView>
      </CustomBottomSheet>

      {/* 챕터 이동 바텀시트 */}
      <CustomBottomSheet
        bottomSheetModalRef={chapterMoveSheetRef}
        snapPoints={chapterMoveSnapPoints}
        enablePanDownToClose
        contentComponent={BottomSheetScrollView}
      >
        <View style={styles.chapterMoveContainer}>
          <Text style={styles.chapterMoveTitle}>어디로 옮길까요?</Text>
          
          <Pressable 
            style={styles.newChapterButton}
            onPress={() => {
              chapterMoveSheetRef.current?.dismiss();
              router.push('/chapter/new');
            }}
          >
            <View style={styles.newChapterIconContainer}>
              <Text style={styles.newChapterIcon}>+</Text>
            </View>
            <Text style={styles.newChapterText}>새로 만들기</Text>
          </Pressable>

          {chapters.length > 0 && (
            <>
              <View style={styles.chapterDivider} />
              {chapters.map((chapter) => (
                <Pressable 
                  key={chapter.id}
                  style={styles.chapterItem}
                  onPress={() => handleMoveToChapter(chapter.id)}
                >
                  <Text style={styles.chapterItemText}>{chapter.title}</Text>
                  <Text style={styles.chapterItemArrow}>›</Text>
                </Pressable>
              ))}
            </>
          )}
        </View>
      </CustomBottomSheet>

      {/* 삭제 확인 모달 */}
      <CustomModal
        visible={showDeleteModal}
        title="이 일기를 삭제할까요?"
        message="삭제된 일기는 복구할 수 없습니다."
        cancelText="취소"
        confirmText="삭제"
        onCancel={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        cancelButtonStyle={{ backgroundColor: '#f2f2f2' }}
        cancelTextStyle={{ color: '#555', fontWeight: '600' }}
        confirmButtonStyle={{ backgroundColor: '#FF3B30' }}
        confirmTextStyle={{ color: '#fff', fontWeight: '600' }}
      />

      {/* 댓글 삭제 확인 모달 */}
      <CustomModal
        visible={showCommentDeleteModal}
        title="이 회고를 삭제할까요?"
        message="삭제된 회고는 복구할 수 없습니다."
        cancelText="취소"
        confirmText="삭제"
        onCancel={() => setShowCommentDeleteModal(false)}
        onConfirm={confirmCommentDelete}
        cancelButtonStyle={{ backgroundColor: '#f2f2f2' }}
        cancelTextStyle={{ color: '#555', fontWeight: '600' }}
        confirmButtonStyle={{ backgroundColor: '#FF3B30' }}
        confirmTextStyle={{ color: '#fff', fontWeight: '600' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  headerButton: { padding: 8 },
  headerSpacer: { flex: 1 },
  content: { flex: 1 },
  imageContainer: { height: 300, marginBottom: 16 },
  imagePlaceholder: { width: '100%', height: '100%', backgroundColor: '#EEE', alignItems: 'center', justifyContent: 'center' },
  imageOverlay: { position: 'absolute', bottom: 16, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateContainer: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  dateText: { color: 'white', fontSize: 14, fontWeight: '600' },
  emotionContainer: { backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  emotionText: { color: 'white', fontSize: 12, fontWeight: '600' },
  actionBar: { flexDirection: 'row', alignItems: 'center', paddingLeft: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f3f4' },
  leftActions: { flex: 1, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  tagButton: { backgroundColor: '#f0f0f0', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, marginRight: 8 },
  tagText: { fontSize: 14, color: '#333' },
  tagPlaceholder: { fontSize: 14, color: '#888' },
  editIconContainer: { paddingHorizontal: 16 },
  iconBar: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 12, },
  rightActions: { flexDirection: 'row', alignItems: 'center', paddingRight: 8 },
  actionButton: { paddingHorizontal: 8 },
  contentContainer: { paddingHorizontal: 16, paddingVertical: 20 },
  contentText: { fontSize: 16, color: '#333', lineHeight: 24 },
  commentsSection: { paddingHorizontal: 16, paddingVertical: 16, borderTopWidth: 1, borderTopColor: '#f1f3f4' },
  commentHeader: { flexDirection: 'row', alignItems: 'center' },
  commentInfo: { flex: 1, marginLeft: 12 },
  commentUser: { fontSize: 14, fontWeight: '600' },
  commentTime: { fontSize: 12, color: '#666' },
  aiBadge: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  aiBadgeText: { fontSize: 12, color: 'white', fontWeight: 'bold' },
  commentContent: { marginTop: 12, paddingLeft: 44 },
  commentText: { fontSize: 14, color: '#495057', lineHeight: 20 },
  bottomSpacing: { height: 40 },
  icon: { fontSize: 24, color: '#495057' },
  userEmoji: { fontSize: 24 },
  
  // 더보기 바텀시트 스타일
  moreSheetContainer: { 
    flex: 1, 
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  moreSheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: '#000000',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },
  moreSheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  moreSheetItemLast: {
    borderBottomWidth: 0,
  },
  moreSheetIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  moreSheetIcon: {
    fontSize: 20,
  },
  moreSheetItemText: {
    fontSize: 16,
    color: '#1F1F1F',
    fontWeight: '500',
  },
  moreSheetItemTextDanger: {
    color: '#FF3B30',
  },
  
  keyboardAvoidingContainer: { flex: 1, },
  tagSheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 20, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  tagSheetTitle: { fontSize: 20, fontWeight: 'bold' },
  tagSheetSaveButtonText: { color: '#FF9500', fontSize: 16, fontWeight: '600' },
  tagListContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 24 },
  tagItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F0F0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8 },
  tagItemTextValue: { fontSize: 14, color: '#333' },
  tagRemoveButton: { marginLeft: 8 },
  tagRemoveButtonText: { color: '#8E8E93', fontSize: 16 },
  tagInputContainer: { flexDirection: 'row', alignItems: 'center', padding: 24, borderTopWidth: 1, borderTopColor: '#E5E5E5' },
  tagInput: { flex: 1, backgroundColor: '#F0F0F0', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 8, fontSize: 16 },
  tagAddButton: { backgroundColor: '#1B1B1B', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 8, marginLeft: 12 },
  tagAddButtonDisabled: { backgroundColor: '#D1D1D6' },
  tagAddButtonText: { color: '#fff', fontWeight: 'bold' },
  
  // 챕터 이동 바텀시트 스타일
  chapterMoveContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  chapterMoveTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  chapterMoveSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 12,
  },
  newChapterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  newChapterIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  newChapterIcon: {
    fontSize: 24,
    color: '#1F1F1F',
  },
  newChapterText: {
    fontSize: 16,
    color: '#1F1F1F',
    fontWeight: '500',
  },
  chapterDivider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 16,
  },
  chapterItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  chapterItemText: {
    fontSize: 16,
    color: '#1F1F1F',
  },
  chapterItemArrow: {
    fontSize: 20,
    color: '#C7C7CC',
  },
  
  // 댓글 입력 관련 스타일
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  commentInput: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 100,
    marginRight: 8,
  },
  commentSaveButton: {
    backgroundColor: '#1B1B1B',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  commentSaveButtonDisabled: {
    backgroundColor: '#F0F0F0',
  },
  commentSaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  commentSaveButtonTextDisabled: {
    color: '#D1D1D6',
  },
  
  // 회고 헤더 관련 스타일
  reflectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reflectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reflectionActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 4,
  },
});