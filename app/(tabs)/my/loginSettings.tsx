import CustomModal from '@/components/CustomModal';
import { useNavigation } from '@react-navigation/native';
import React, { useEffect, useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { auth, db } from '@/firebase';
import { deleteUser } from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

export default function SocialLoginSettingsScreen() {
  const navigation = useNavigation();
  const [showModal, setShowModal] = useState(false);

  // ✅ 로그인된 사용자 정보 상태
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');

  // ✅ 로그인된 유저 정보 불러오기
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      setDisplayName(user.displayName || '');
      setEmail(user.email || '');
    }
  }, []);

  const handleLeave = async () => {
    setShowModal(false);
  
    const user = auth.currentUser;
    if (!user) {
      Alert.alert('오류', '로그인 정보가 없습니다.');
      return;
    }
  
    try {
      // 1) Firestore 사용자 문서 삭제 (먼저 지우는 게 안전)
      await deleteDoc(doc(db, 'users', user.uid));
  
      // 2) Firebase Auth 계정 삭제
      await deleteUser(user);
  
      // 3) 완료 안내 + 온보딩으로 이동
      Alert.alert('탈퇴 완료', '정상적으로 탈퇴 처리되었습니다.', [
        {
          text: '확인',
          onPress: () => {
            // 세션은 삭제되지만 네비 상태 초기화
            // (혹시 모를 잔여 스택 제거)
            navigation.reset({
              index: 0,
              routes: [{ name: 'onboarding' as never }],
            });
          },
        },
      ]);
    } catch (e: any) {
      // 보안상 "최근 로그인 필요" 에러 빈번
      if (e?.code === 'auth/requires-recent-login') {
        Alert.alert(
          '다시 로그인 필요',
          '보안을 위해 최근 인증이 필요합니다. 다시 로그인한 뒤 탈퇴를 진행해주세요.'
        );
      } else {
        console.log('delete error:', e?.code, e?.message);
        Alert.alert('오류', '탈퇴 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.');
      }
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.back}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>소셜 로그인 설정</Text>
      </View>

      {/* 내용 */}
      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>이름</Text>
        <Text style={styles.infoValue}>{displayName || '-'}</Text>
      </View>

      <View style={styles.infoRow}>
        <Text style={styles.infoLabel}>이메일</Text>
        <Text style={styles.infoValue}>{email || '-'}</Text>
      </View>

      {/* 탈퇴 버튼 */}
      <TouchableOpacity onPress={() => setShowModal(true)} style={styles.leaveButton}>
        <Text style={styles.leaveText}>회원 탈퇴하기</Text>
      </TouchableOpacity>

      {/* 모달 */}
      <CustomModal
        visible={showModal}
        title="모든 기록을 삭제하고 탈퇴할까요?"
        message="모든 기록이 삭제되며, 복원할 수 없습니다. 탈퇴 후 재가입은 불가능합니다."
        cancelText="취소"
        confirmText="탈퇴하기"
        onCancel={() => setShowModal(false)}
        onConfirm={handleLeave}
        cancelButtonStyle={{ backgroundColor: '#f2f2f2' }}
        cancelTextStyle={{ color: '#555', fontWeight: '600' }}
        confirmButtonStyle={{ backgroundColor: '#FF4444' }}
        confirmTextStyle={{ color: '#fff', fontWeight: '600' }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  /* 기존 스타일 그대로 */
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14 },
  back: { fontSize: 24, color: '#000', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#000' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 20 },
  infoLabel: { fontSize: 16, color: '#666' },
  infoValue: { fontSize: 16, color: '#222' },
  leaveButton: { marginTop: 10, paddingHorizontal: 24, paddingVertical: 16, borderTopWidth: 8, borderTopColor: '#F5F5F5' },
  leaveText: { color: '#FF3B30', fontSize: 16, fontWeight: '600' },
});
