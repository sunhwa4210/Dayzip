import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
// BottomSheetBackdrop, BottomSheetView 추가
import { BottomSheetBackdrop, BottomSheetModal, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { useNavigation } from '@react-navigation/native';
import React from 'react';
import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';


import CustomConfirmModal from '@/components/CustomModal';
import CustomSnack from '@/components/Snackbar';

import { cancelAllReminders, rescheduleFromFirestore } from '@/lib/notifications';
import * as Clipboard from 'expo-clipboard';
import { Linking } from 'react-native';

import * as SecureStore from 'expo-secure-store';



import { auth, db } from '@/firebase';
import {
  collection,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch
} from 'firebase/firestore';

import { addEventAndIncrement, saveReminder } from '@/lib/firestore';

type Sticker = 'checked' | 'crossed' | 'none';

type ChecklistItem = {
  id: string;
  label: string;
  status: 'none' | 'checked' | 'crossed';
  history: Sticker[];   // 리스트에서 보여줄 “최근 4개 스택”
  dates: string[];      // history와 index 맞춤
  createdAtText?: string;
  checkedCount?: number;
  crossedCount?: number;
};

//목표 바텀시트
function GoalFooter({
  onChecked,
  onCrossed,
}: {
  onChecked: () => void;
  onCrossed: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 12 + insets.bottom, // 안전영역
        backgroundColor: '#fff',
      }}
    >
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <TouchableOpacity style={styles.ghostBtn} onPress={onCrossed}>
          <Ionicons name="ban-outline" size={18} color="#1B1B1B" style={{ marginRight: 6 }} />
          <Text style={styles.ghostBtnText}>아쉬워요</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.primaryBtn} onPress={onChecked}>
          <Ionicons name="checkmark-done" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.primaryBtnText}>참 잘했어요</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ACTION_H = 64;


export default function MyPage() {

  const [copiedToastVisible, setCopiedToastVisible] = React.useState(false);
  
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [writingDays, setWritingDays] = React.useState(0);
  const [diaryCount, setDiaryCount] = React.useState(0);

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    (async () => {
      try {
        const firstQ = query(
          collection(db, 'users', uid, 'diaries'),
          orderBy('createdAt', 'asc'),
          limit(1)
        );
        const firstSnap = await getDocs(firstQ);
        if (!firstSnap.empty) {
          const created = firstSnap.docs[0].data().createdAt?.toDate?.();
          if (created instanceof Date) {
            const ms = Date.now() - created.getTime();
            const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
            setWritingDays(days);
          } else {
            setWritingDays(0);
          }
        } else {
          setWritingDays(0);
        }

        const diariesColl = collection(db, 'users', uid, 'diaries');
        const agg = await getCountFromServer(diariesColl);
        setDiaryCount(agg.data().count || 0);
      } catch {
        setWritingDays(0);
        setDiaryCount(0);
      }
    })();
  }, []);

  const [logoutModalVisible, setLogoutModalVisible] = React.useState(false);

  // 리마인더
  const [reminderOn, setReminderOn] = React.useState(false);
  const reminderSheetRef = React.useRef<BottomSheetModal>(null);
  const [selectedDays, setSelectedDays] = React.useState<string[]>([]);
  const [selectedTime, setSelectedTime] = React.useState(new Date());
  const [showTimePicker, setShowTimePicker] = React.useState(false);

  const toggleDay = (d: string) =>
    setSelectedDays(prev => (prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]));
  
  // ✅ present()로 시트를 엽니다.
  const openReminderSheet = () => reminderSheetRef.current?.present();
  const handleToggleReminder = async (v: boolean) => {
    setReminderOn(v);
    if (v) {
      openReminderSheet();
    } else {
      // 리마인더 해제 시: 예약 모두 취소 (권장)
      await cancelAllReminders();
      // 서버에도 비활성화 저장하고 싶으면 아래처럼:
      // await saveReminder([], '');
    }
  };
  
  
  // ✅ dismiss()로 시트를 닫습니다.
  const onCancelReminder = () => reminderSheetRef.current?.dismiss();
  const onSaveReminderPress = async () => {
    const hh = selectedTime.getHours().toString().padStart(2, '0');
    const mm = selectedTime.getMinutes().toString().padStart(2, '0');
    const timeStr = `${hh}:${mm}`;
  
    try {
      // 1) 파이어베이스 저장
      await saveReminder(selectedDays, timeStr);
  
      // 2) 디바이스(로컬) 알림 스케줄 등록/갱신
      await rescheduleFromFirestore(selectedDays, timeStr, {
        title: '오늘의 일기',
        body: '하루를 기록할 시간이에요 ✍️',
      });
    } finally {
      reminderSheetRef.current?.dismiss();
    }
  };

  const [checklist, setChecklist] = React.useState<ChecklistItem[]>([]);

  const handleOpenFeedback = async () => {
    const email = 'support@dayzip.app'; //  실제 건의 메일 주소로 변경 가능
    const subject = encodeURIComponent('[DayZip] 건의하기');
    const body = encodeURIComponent(
      '안녕하세요,\n\n아래에 건의/문의 내용을 작성해주세요.\n\n- 앱 버전: 1.0.0\n- OS: \n- 내용: \n'
    );
    const url = `mailto:${email}?subject=${subject}&body=${body}`;
  
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
        return;
      }
  
      // 메일 앱이 없을 경우 → 이메일 복사 + 토스트 표시
      await Clipboard.setStringAsync(email);
      setCopiedToastVisible(true);
      setTimeout(() => setCopiedToastVisible(false), 2000);
    } catch {
      await Clipboard.setStringAsync(email);
      setCopiedToastVisible(true);
      setTimeout(() => setCopiedToastVisible(false), 2000);
    }
  };
  

  React.useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const qGoals = query(collection(db, 'users', uid, 'goals'), orderBy('created_at', 'desc'));
    const unsub = onSnapshot(qGoals, async (snap) => {
      const baseItems: ChecklistItem[] = snap.docs.map(d => {
        const data: any = d.data();
        const created =
          data.created_at?.toDate?.() instanceof Date ? data.created_at.toDate() : undefined;
        return {
          id: d.id,
          label: data.label ?? '',
          status: 'none',
          history: [],
          dates: [],
          createdAtText: created
            ? `${created.getFullYear()}. ${created.getMonth() + 1}. ${created.getDate()} 생성됨`
            : undefined,
          checkedCount: data.checkedCount ?? 0,
          crossedCount: data.crossedCount ?? 0,
        };
      });

      const filled = await Promise.all(
        baseItems.map(async (it) => {
          try {
            const qEv = query(
              collection(db, 'users', uid, 'goals', it.id, 'events'),
              orderBy('created_at', 'desc'),
              limit(4)
            );
            const evSnap = await getDocs(qEv);
            const hist: Sticker[] = [];
            const dates: string[] = [];
            evSnap.forEach(d => {
              const ev: any = d.data();
              const t: Date =
                ev.occurred_at?.toDate?.() instanceof Date ? ev.occurred_at.toDate() : new Date();
              hist.push(ev.status);
              dates.push(`${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}`);
            });
            return { ...it, history: hist, dates };
          } catch {
            return it;
          }
        })
      );

      setChecklist(filled);
    });

    return () => unsub();
  }, []);

  const goalSheetRef = React.useRef<BottomSheetModal>(null);
  const [selectedItem, setSelectedItem] = React.useState<ChecklistItem | null>(null);

  const openGoalSheet = async (item: ChecklistItem) => {
    setSelectedItem(item);
    goalSheetRef.current?.present();

    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      const qEv = query(
        collection(db, 'users', uid, 'goals', item.id, 'events'),
        orderBy('created_at', 'desc')
      );
      const snap = await getDocs(qEv);
      const hist: Sticker[] = [];
      const dates: string[] = [];
      snap.forEach(d => {
        const ev: any = d.data();
        const t: Date =
          ev.occurred_at?.toDate?.() instanceof Date ? ev.occurred_at.toDate() : new Date();
        hist.push(ev.status);
        dates.push(`${t.getFullYear()}. ${t.getMonth() + 1}. ${t.getDate()}`);
      });
      setSelectedItem(cur => (cur && cur.id === item.id ? { ...cur, history: hist, dates } : cur));
    } catch {}
  };

  const [lastStatusChange, setLastStatusChange] = React.useState<{ id: string; status: 'checked' | 'crossed' } | null>(null);
  const [confirmVisible, setConfirmVisible] = React.useState(false);
  const [deletingItemId, setDeletingItemId] = React.useState<string | null>(null);
  const [SnackType, setSnackType] = React.useState<'delete' | 'status' | null>(null);
  const [SnackVisible, setSnackVisible] = React.useState(false);
  const [SnackMessage, setSnackMessage] = React.useState('');

  const handleStatusChange = async (status: 'checked' | 'crossed') => {
    if (!selectedItem) return;

    const today = new Date();
    const d = `${today.getFullYear()}. ${today.getMonth() + 1}. ${today.getDate()}`;
    const goalId = selectedItem.id;

    setChecklist(prev =>
      prev.map(it =>
        it.id === goalId
          ? {
              ...it,
              status,
              history: [status, ...it.history].slice(0, 4),
              dates: [d, ...it.dates].slice(0, 4),
            }
          : it
      )
    );
    goalSheetRef.current?.dismiss();
    setSnackType('status');
    setSnackMessage('스티커를 추가했어요');
    setSnackVisible(true);

    try {
      await addEventAndIncrement(goalId, status, today);
      setLastStatusChange({ id: goalId, status });
    } catch {
      setChecklist(prev =>
        prev.map(it =>
          it.id === goalId
            ? {
                ...it,
                history: it.history.slice(1),
                dates: it.dates.slice(1),
                status: it.history.length > 1 ? it.history[1] : 'none',
              }
            : it
        )
      );
      setLastStatusChange(null);
      setSnackMessage('저장에 실패했어요');
    } finally {
      setTimeout(() => setSnackVisible(false), 3000);
    }
  };

  const confirmDeleteItem = (id?: string) => { if (!id) return; setDeletingItemId(id); setConfirmVisible(true); };

  const deletedCacheRef = React.useRef<{
    goalId: string;
    goalDoc: any;
    events: Array<{ id: string; data: any }>;
  } | null>(null);

  const handleConfirmDelete = async () => {
    if (!deletingItemId) return;
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const goalId = deletingItemId;
    setConfirmVisible(false);
    goalSheetRef.current?.dismiss();

    try {
      const goalRef = doc(db, 'users', uid, 'goals', goalId);
      const goalSnap = await getDoc(goalRef);
      const goalDoc = goalSnap.exists() ? goalSnap.data() : null;

      const evSnap = await getDocs(collection(db, 'users', uid, 'goals', goalId, 'events'));
      const events = evSnap.docs.map(d => ({ id: d.id, data: d.data() }));

      deletedCacheRef.current = { goalId, goalDoc, events };

      const batch = writeBatch(db);
      events.forEach(ev => batch.delete(doc(db, 'users', uid, 'goals', goalId, 'events', ev.id)));
      batch.delete(goalRef);
      await batch.commit();

      setChecklist(prev => prev.filter(it => it.id !== goalId));

      setSnackType('delete');
      setSnackMessage('목표를 삭제했어요');
      setSnackVisible(true);
      setTimeout(() => setSnackVisible(false), 3000);
    } finally {
      setDeletingItemId(null);
    }
  };

  const handleUndoDelete = async () => {
    const cache = deletedCacheRef.current;
    const uid = auth.currentUser?.uid;
    if (!cache || !uid) return;

    const { goalId, goalDoc, events } = cache;
    try {
      if (goalDoc) {
        await setDoc(doc(db, 'users', uid, 'goals', goalId), {
          ...goalDoc,
          created_at: goalDoc.created_at ?? serverTimestamp(),
          last_event_at: goalDoc.last_event_at ?? null,
        }, { merge: false });
      }
      if (events?.length) {
        const batch = writeBatch(db);
        events.forEach(ev => batch.set(doc(db, 'users', uid, 'goals', goalId, 'events', ev.id), ev.data));
        await batch.commit();
      }
      setChecklist(prev => {
        if (prev.some(it => it.id === goalId)) return prev;
        const created =
          goalDoc?.created_at?.toDate?.() instanceof Date ? goalDoc.created_at.toDate() : new Date();
        return [{
          id: goalId,
          label: goalDoc?.label ?? '',
          status: 'none',
          history: [], dates: [],
          createdAtText: `${created.getFullYear()}. ${created.getMonth() + 1}. ${created.getDate()} 생성됨`,
          checkedCount: goalDoc?.checkedCount ?? 0,
          crossedCount: goalDoc?.crossedCount ?? 0,
        }, ...prev];
      });
    } finally {
      deletedCacheRef.current = null;
    }
  };

  // ✅ explore/index.tsx와 동일하게 backdrop 렌더링 함수 추가
  const renderBackdrop = (props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" />
  );

  return (
    // 화면 컨텐츠와 바텀시트를 분리하기 위해 최상위 뷰 추가
    <View style={{ flex: 1 }}>
      {/* --- 기존 화면 컨텐츠 --- */}
      <View style={styles.container}>
      <View style={styles.header}>
      <Image
        source={require('../../../assets/images/myzip.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
          {/* 카드 1: 내 목표 */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>내 목표</Text>
              <TouchableOpacity
                style={styles.iconBtn}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('GoalEditor' as never)}
              >
                <MaterialIcons name="add" size={22} color="#1B1B1B" />
              </TouchableOpacity>
            </View>

            {checklist.map(item => (
              <TouchableOpacity key={item.id} onPress={() => openGoalSheet(item)} activeOpacity={0.7} style={styles.goalRow}>
                <View style={styles.goalLeft}>
                  <View style={styles.radio} />
                  <Text style={styles.goalText}>{item.label}</Text>
                </View>
                <View style={styles.badgeStack}>
                  {item.history.map((h, i) => (
                    <View
                      key={`${item.id}-${i}`}
                      style={[
                        styles.badge,
                        h === 'crossed' && styles.badgeDashed,
                        h === 'checked' && styles.badgeCheck,
                        { marginLeft: i === 0 ? 0 : -8 }
                      ]}
                    >
                      {h === 'checked' && <Text style={styles.badgeCheckMark}>✓</Text>}
                      {h === 'crossed' && <Text style={[styles.badgeCheckMark, { color: '#E74C3C' }]}>×</Text>}
                    </View>
                  ))}
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* 카드 2: 통계 */}
          <View style={styles.card}>
            <View style={styles.statsRow}>
              <View style={styles.statBox}><Text style={styles.statNumber}>D+{writingDays}</Text><Text style={styles.statLabel}>작성일</Text></View>
              <View style={styles.statBox}><Text style={styles.statNumber}>{diaryCount}</Text><Text style={styles.statLabel}>작성 일기</Text></View>
            </View>
          </View>

          {/* 카드 3: 설정 리스트 */}
          <View style={styles.card}>
            <ListItem left={<Ionicons name="person-outline" size={20} color="#555" />} label="소셜 로그인 설정"
              right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />} onPress={() => navigation.navigate('loginSettings' as never)} />
            <ListItem left={<Ionicons name="time-outline" size={20} color="#555" />} label="리마인더 설정"
              right={<Switch value={reminderOn} onValueChange={handleToggleReminder} />} onPress={openReminderSheet} />
          </View>

          {/* 카드 4: 기타 */}
          <View style={styles.card}>
          <ListItem
            left={<MaterialIcons name="info-outline" size={20} color="#555" />}
            label="FAQ (자주 묻는 질문)"
            right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
            onPress={() => {
              Linking.openURL("https://brazen-learning-68e.notion.site/AI-DAY-ZIP-2992a244b9a280a5aa3fe19d6ead2a11?source=copy_link");
            }}
          />

            <ListItem
              left={<FontAwesome name="envelope-o" size={20} color="#555" />}
              label="건의하기"
              right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
              onPress={handleOpenFeedback}
            />

            <ListItem
              left={<MaterialIcons name="logout" size={20} color="#555" />}
              label="로그아웃"
              right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
              isLast
              onPress={() => setLogoutModalVisible(true)} 
            />
          </View>
        </ScrollView>
      </View>
      
      {/* --- 바텀시트, 스낵바, 모달 등 오버레이 UI --- */}
      {/* ✅ 바텀시트들을 ScrollView 밖으로 이동 */}
      
      <BottomSheetModal
        ref={goalSheetRef}
        index={0}
        snapPoints={['45%']}            // 고정: 화면 높이의 45%
        enableDynamicSizing={false}     // 내용 길이와 무관하게 고정
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        // handleStyle, style 등은 건드리지 않아 원래 느낌 유지
      >
        {/* 전체 스크롤 (패딩 중복 방지: 좌우 패딩 X) */}
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{
            paddingBottom: 12 + insets.bottom, // 하단 여유 + 안전영역만 추가
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.sheetWrap}>
            {/* 헤더 (스크롤됨) */}
            <View style={styles.grabber} />
            <View style={styles.sheetHeaderRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitleText}>{selectedItem?.label ?? ''}</Text>
                <Text style={styles.sheetSubText}>{selectedItem?.createdAtText ?? ''}</Text>
              </View>
              <TouchableOpacity onPress={() => confirmDeleteItem(selectedItem?.id)}>
                <Text style={styles.deleteText}>삭제</Text>
              </TouchableOpacity>
            </View>

            {/* 버튼 (스크롤됨) */}
            <GoalFooter
              onChecked={() => handleStatusChange('checked')}
              onCrossed={() => handleStatusChange('crossed')}
            />

            {/* 히스토리 (스크롤됨) */}
            {selectedItem?.history?.map((status, idx) => {
              const date = selectedItem?.dates?.[idx] || '';
              return (
                <View key={idx} style={styles.historyRow}>
                  {status === 'checked'
                    ? <Ionicons name="checkmark-circle-outline" size={22} color="#2ECC71" style={{ marginRight: 10 }} />
                    : <View style={styles.dashedCircle} />
                  }
                  <Text style={styles.historyDate}>{date}</Text>
                </View>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>

      {/* 리마인더 바텀시트: 항상 45%, 전체 스크롤 */}
<BottomSheetModal
  ref={reminderSheetRef}
  index={0}
  snapPoints={['45%']}            // 고정: 화면 높이의 45%
  enableDynamicSizing={false}     // 내용 길이와 무관하게 고정
  enablePanDownToClose
  backdropComponent={renderBackdrop}
>
  <BottomSheetScrollView
    style={{ flex: 1 }}
    contentContainerStyle={{
      padding: 24,
      paddingBottom: 24 + insets.bottom, // 하단 여유 + 안전영역
    }}
    showsVerticalScrollIndicator={false}
  >
    <Text style={styles.sheetHeaderTitle}>리마인더 설정</Text>
    <Text style={styles.sheetDescription}>
      꾸준한 일기쓰기를 위해 푸시 알림을 보낼게요
    </Text>

    <View style={styles.daySelector}>
      {['월','화','수','목','금','토','일'].map(day => {
        const selected = selectedDays.includes(day);
        return (
          <TouchableOpacity
            key={day}
            style={[styles.dayButton, selected && styles.dayButtonSelected]}
            onPress={() => toggleDay(day)}
            activeOpacity={0.8}
          >
            <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
              {day}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>

    <TouchableOpacity
      onPress={() => setShowTimePicker(true)}
      style={styles.timeButton}
      activeOpacity={0.8}
    >
      <Text>
        선택된 시간:{' '}
        {selectedTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </TouchableOpacity>

    <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
      <TouchableOpacity style={styles.ghostBtn} onPress={onCancelReminder}>
        <Text style={styles.ghostBtnText}>취소</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.primaryBtn} onPress={onSaveReminderPress}>
        <Text style={styles.primaryBtnText}>저장</Text>
      </TouchableOpacity>
    </View>
  </BottomSheetScrollView>
</BottomSheetModal>




      {/* --- 기타 오버레이 UI (위치 변경 없음) --- */}
      <DateTimePickerModal
        isVisible={showTimePicker}
        mode="time"
        date={selectedTime}
        onConfirm={(date) => { setSelectedTime(date); setShowTimePicker(false); }}
        onCancel={() => setShowTimePicker(false)}
        is24Hour={false}
      />
      
      <CustomConfirmModal
        visible={confirmVisible}
        title="이 목표를 삭제할까요?"
        message="삭제한 목표는 복구할 수 없습니다."
        cancelText="취소"
        confirmText="삭제"
        onCancel={() => { setConfirmVisible(false); setDeletingItemId(null); }}
        onConfirm={handleConfirmDelete}
      />

      <CustomConfirmModal
        visible={logoutModalVisible}
        title="정말 로그아웃할까요?"
        message="언제든지 다시 로그인할 수 있어요"
        cancelText="취소"
        confirmText="로그아웃"
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={async () => {
          try {
            // 🔹 Firebase Auth 로그아웃
            await auth.signOut();
        
            // 🔹 자동 로그인 플래그 삭제
            await SecureStore.deleteItemAsync('remember_me');
        
            // 🔹 알림 예약 취소 (있으면)
            await cancelAllReminders();
        
            // 🔹 화면 이동 (온보딩으로)
            setLogoutModalVisible(false);
            navigation.reset({
              index: 0,
              routes: [{ name: 'onboarding' as never }],
            });
          } catch (error) {
            console.log('로그아웃 실패:', error);
          }
        }}
        
        cancelButtonStyle={{ backgroundColor: '#f2f2f2' }}
        cancelTextStyle={{ color: '#555', fontWeight: '600' }}
        confirmButtonStyle={{ backgroundColor: '#FF4444' }}
        confirmTextStyle={{ color: '#fff', fontWeight: '600' }}
      />


      {SnackVisible && SnackType === 'delete' && (
        <CustomSnack
          message={SnackMessage}
          actionText="실행 취소"
          style={{ bottom: 100 }}
          onAction={() => { handleUndoDelete(); setSnackVisible(false); }}
          onClose={() => setSnackVisible(false)}
        />
      )}
      {SnackVisible && SnackType === 'status' && (
        <CustomSnack
          message={SnackMessage}
          actionText="실행 취소"
          style={{ bottom: 100 }}
          onAction={() => {
            if (lastStatusChange) {
              const { id: goalId } = lastStatusChange;
              setChecklist(prev =>
                prev.map(it =>
                  it.id === goalId
                    ? {
                        ...it,
                        history: it.history.slice(1),
                        dates: it.dates.slice(1),
                        status: it.history.length > 1 ? it.history[1] : 'none',
                      }
                    : it
                )
              );
              setLastStatusChange(null);
            }
            setSnackVisible(false);
          }}
          onClose={() => setSnackVisible(false)}
        />
      )}
    </View>
  );
}

// ListItem 컴포넌트와 styles는 변경사항이 없으므로 생략합니다.
// 기존 코드를 그대로 사용하시면 됩니다.

function ListItem({ left, label, right, onPress, isLast }: {
  left: React.ReactNode; label: string; right?: React.ReactNode; onPress?: () => void; isLast?: boolean;
}) {
  return (
    <TouchableOpacity activeOpacity={onPress ? 0.7 : 1} onPress={onPress}
      style={[styles.listItem, isLast && { borderBottomWidth: 0 }]}>
      <View style={styles.listLeft}>
        <View style={{ width: 26, alignItems: 'center' }}>{left}</View>
        <Text style={styles.listLabel}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );
}

const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5', paddingTop: 48 },
  header: { paddingHorizontal: 20, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: '#1B1B1B' },
  logo: { width: 96, height: 28 },

  card: {
    backgroundColor: '#FFF', borderRadius: CARD_RADIUS,
    paddingHorizontal: 16, paddingVertical: 16,
    marginHorizontal: 16, marginTop: 12,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 10, elevation: 2,
    position: 'relative',
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#222' },
  iconBtn: {
    marginLeft: 'auto', width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6E6E6',
    alignItems: 'center', justifyContent: 'center',
  },

  goalRow: { paddingVertical: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  goalLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: '#D9D9D9', marginRight: 10, backgroundColor: '#FFF' },
  goalText: { fontSize: 15, color: '#333' },

  badgeStack: { flexDirection: 'row' },
  badge: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#2ECC71', backgroundColor: '#E9F8EE',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeDashed: { borderStyle: 'dashed', borderColor: '#E74C3C', backgroundColor: '#FFF0F0' },
  badgeCheck: { borderColor: '#2ECC71', backgroundColor: '#E9F8EE' },
  badgeCheckMark: { color: '#2ECC71', fontWeight: '700', fontSize: 12 },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#1B1B1B' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#666' },

  listItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  listLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  listLabel: { fontSize: 15, color: '#333', marginLeft: 6 },

  /* --- 목표 바텀시트 --- */
  sheetWrap: { paddingTop: 8, paddingHorizontal: 20, paddingBottom: 12, flex:1 },
  grabber: { alignSelf: 'center', width: 64, height: 6, borderRadius: 3, backgroundColor: '#EAEAEA', marginBottom: 12 },
  sheetHeaderRow: { flexDirection: 'row', alignItems: 'center' },
  sheetTitleText: { fontSize: 20, fontWeight: '800', color: '#1B1B1B' },
  sheetSubText: { marginTop: 6, color: '#8E8E93', fontSize: 13 },
  deleteText: { color: '#FF6F3F', fontWeight: '700', fontSize: 14, padding: 6 },

  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  dashedCircle: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderStyle: 'dashed', borderColor: '#E74C3C',
    marginRight: 10,
  },
  historyDate: { fontSize: 16, color: '#444' },

  bottomActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  ghostBtn: {
    flex: 1, height: 64, borderRadius: 18,
    backgroundColor: '#EFEFF0',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },
  primaryBtn: {
    flex: 1, height: 64, borderRadius: 18,
    backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
  },

  ghostBtnText: { fontSize: 15, fontWeight: '700', color: '#1B1B1B' },
  primaryBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  /* 리마인더 */
  sheetContent: { flex: 1, padding: 24 },
  sheetHeaderTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  sheetDescription: { fontSize: 14, color: '#7c7c7c', marginBottom: 16 },
  daySelector: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 12 },
  dayButton: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: '#FFA654', marginRight: 8 },
  dayButtonSelected: { backgroundColor: '#FFA654' },
  dayText: { color: '#FFA654', fontWeight: '500' },
  dayTextSelected: { color: '#fff' },
  timeButton: { padding: 12, borderWidth: 1, borderColor: '#ccc', borderRadius: 8, alignItems: 'center', marginVertical: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingHorizontal: 24, marginTop: 16 },
});
