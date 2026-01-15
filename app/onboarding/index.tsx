import CustomBottomSheet from '@/components/CustomBottomSheet';
import { auth, db } from '@/firebase';
import { Feather } from '@expo/vector-icons';
import BottomSheet from '@gorhom/bottom-sheet';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';

export default function LoginSignupScreen() {
  // 상태 관리
  const [isLoginMode, setIsLoginMode] = useState(true); // true: 로그인, false: 회원가입
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const bottomSheetRef = useRef<BottomSheet>(null);

  // 입력 유효성 검사
  const validateForm = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('알림', '이메일과 비밀번호를 입력해주세요.');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert('알림', '올바른 이메일 형식을 입력해주세요.');
      return false;
    }

    if (password.length < 6) {
      Alert.alert('알림', '비밀번호는 6자 이상 입력해주세요.');
      return false;
    }

    if (!isLoginMode) {
      if (!name.trim()) {
        Alert.alert('알림', '이름을 입력해주세요.');
        return false;
      }
      if (password !== confirmPassword) {
        Alert.alert('알림', '비밀번호가 일치하지 않습니다.');
        return false;
      }
    }

    return true;
  };

  // 폼이 유효한지 확인 (버튼 활성화 여부)
  const isFormValid = () => {
    if (isLoginMode) {
      return !!(email.trim() && password.trim());
    } else {
      return !!(name.trim() && email.trim() && password.trim() && confirmPassword.trim());
    }
  };

  // 로그인 처리
// 기존 handleLogin 교체
const handleLogin = async () => {
  if (!validateForm()) return;
  setIsLoading(true);
  try {
    await signInWithEmailAndPassword(auth, email.trim(), password);
    await SecureStore.setItemAsync('remember_me', rememberMe ? '1' : '0');
    setIsLoading(false);
    router.replace('/(tabs)');
  } catch (error: any) {
    setIsLoading(false);
    let msg = '로그인에 실패했습니다. 다시 시도해주세요.';
    if (error?.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않습니다.';
    else if (error?.code === 'auth/wrong-password') msg = '이메일 또는 비밀번호가 올바르지 않습니다.';
    else if (error?.code === 'auth/user-not-found') msg = '가입된 계정을 찾을 수 없습니다.';
    else if (error?.code === 'auth/too-many-requests') msg = '잠시 후 다시 시도해주세요. (시도 과다)';
    Alert.alert('오류', msg);
  }
};


  // 회원가입 처리
// 기존 handleSignup 교체
const handleSignup = async () => {
  if (!validateForm()) return;
  setIsLoading(true);
  try {
    // 1) Auth 계정 생성
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);

    // 2) 표시 이름 세팅 (입력한 이름, 없으면 이메일 앞부분)
    const displayName = name.trim() || email.trim().split('@')[0];
    await updateProfile(cred.user, { displayName });

    // 3) Firestore users/{uid} 문서 생성
    await setDoc(doc(db, 'users', cred.user.uid), {
      uid: cred.user.uid,
      email: cred.user.email,
      name: displayName,
      provider: 'password',
      createdAt: serverTimestamp(),
    });

    setIsLoading(false);
    Alert.alert('성공', '회원가입이 완료되었습니다!', [
      { text: '확인', onPress: () => router.replace('/onboarding/tutorial') },
    ]);
  } catch (error: any) {
    console.log('⚠️ signup error', error?.code, error?.message); // ← 추가
    setIsLoading(false);
    let msg = '회원가입에 실패했습니다. 다시 시도해주세요.';
    if (error?.code === 'auth/email-already-in-use') msg = '이미 사용 중인 이메일입니다.';
    else if (error?.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않습니다.';
    else if (error?.code === 'auth/weak-password') msg = '비밀번호가 너무 약합니다. (6자 이상 권장)';
    else if (error?.code === 'auth/network-request-failed') msg = '네트워크 오류입니다. 인터넷 연결을 확인해주세요.';
    else if (error?.code === 'auth/operation-not-allowed') msg = '이메일/비밀번호 로그인이 비활성화되어 있습니다.';
    Alert.alert('오류', msg);
  }
};


  // 소셜 로그인 처리
  const handleSocialLogin = (provider: string) => {
    Alert.alert('알림', `${provider} 로그인 기능은 준비 중입니다.`);
    bottomSheetRef.current?.close();
  };

  // 자동로그인
  const [rememberMe, setRememberMe] = useState(true);

  // 비밀번호 찾기
// 기존 handleForgotPassword 교체(선택)
const handleForgotPassword = () => {
  if (!email.trim()) {
    Alert.alert('알림', '상단 이메일 입력란에 이메일을 입력한 뒤 진행해주세요.');
    return;
  }
  Alert.alert('비밀번호 재설정', `${email} 로 재설정 메일을 보낼까요?`, [
    { text: '취소', style: 'cancel' },
    {
      text: '전송',
      onPress: async () => {
        try {
          await sendPasswordResetEmail(auth, email.trim());
          Alert.alert('전송 완료', '이메일의 링크를 확인해주세요.');
        } catch (error: any) {
          let msg = '메일 전송에 실패했습니다.';
          if (error?.code === 'auth/user-not-found') msg = '가입된 계정을 찾을 수 없습니다.';
          else if (error?.code === 'auth/invalid-email') msg = '이메일 형식이 올바르지 않습니다.';
          Alert.alert('오류', msg);
        }
      },
    },
  ]);
};


  // 모드 전환 시 폼 초기화
  const switchMode = () => {
    setIsLoginMode(!isLoginMode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setName('');
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* 헤더 */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => bottomSheetRef.current?.expand()}>
            <Text style={styles.socialLoginText}>소셜 로그인</Text>
          </TouchableOpacity>
        </View>

        {/* 메인 컨텐츠 */}
        <View style={styles.content}>
          {/* 앱 로고 및 이름 */}
          <View style={styles.logoContainer}>
            <Image 
              source={require('@/assets/images/logo.png')} 
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>Day.zip</Text>
          </View>

          {/* 입력 폼 */}
          <View style={styles.formContainer}>
            {/* 이름 입력 (회원가입 시에만) */}
            {!isLoginMode && (
              <TextInput
                style={styles.input}
                placeholder="이름"
                value={name}
                onChangeText={setName}
                placeholderTextColor="#aaa"
                autoCapitalize="words"
              />
            )}

            {/* 이메일 입력 */}
            <TextInput
              style={styles.input}
              placeholder="이메일"
              value={email}
              onChangeText={setEmail}
              placeholderTextColor="#aaa"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* 비밀번호 입력 */}
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholderTextColor="#aaa"
              secureTextEntry
              autoCapitalize="none"
            />

            {/* 비밀번호 확인 (회원가입 시에만) */}
            {!isLoginMode && (
              <TextInput
                style={styles.input}
                placeholder="비밀번호 확인"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholderTextColor="#aaa"
                secureTextEntry
                autoCapitalize="none"
              />
            )}

            {/* 자동 로그인 체크박스 (로그인 모드에서만 노출) */}
            {isLoginMode && (
              <TouchableOpacity
                style={styles.rememberRow}
                onPress={() => setRememberMe(!rememberMe)}
                activeOpacity={0.8}
              >
                <View style={styles.checkbox}>
                  {rememberMe && <Feather name="check" size={18} color="#FA6400" />} 
                </View>
                <Text style={styles.rememberText}>자동 로그인</Text>
              </TouchableOpacity>
            )}


            {/* 로그인/회원가입 버튼 */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                isFormValid() ? styles.submitButtonActive : styles.submitButtonInactive
              ]}
              onPress={isFormValid() ? (isLoginMode ? handleLogin : handleSignup) : undefined}
              disabled={isLoading || !isFormValid()}
              activeOpacity={isFormValid() ? 0.8 : 1}
            >
              <Text
                style={[
                  styles.submitButtonText,
                  isFormValid() ? styles.submitButtonTextActive : styles.submitButtonTextInactive
                ]}
              >
                {isLoginMode ? '로그인' : '회원가입'}
              </Text>
            </TouchableOpacity>

            {/* 비밀번호 찾기 (로그인 모드에서만 노출) */}
            {isLoginMode && (
              <TouchableOpacity
                style={styles.forgotRow}
                onPress={handleForgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotText}>비밀번호찾기</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>

        {/* 하단 모드 전환 */}
        <View style={styles.bottom}>
          {isLoginMode ? (
            <View style={styles.switchModeContainer}>
              <Text style={styles.switchModeText}>계정이 없으신가요? </Text>
              <TouchableOpacity onPress={switchMode}>
                <Text style={styles.switchModeButton}>회원가입</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.switchModeContainer}>
              <Text style={styles.switchModeText}>이미 계정이 있으신가요? </Text>
              <TouchableOpacity onPress={switchMode}>
                <Text style={styles.switchModeButton}>로그인</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* 소셜 로그인 바텀시트 */}
        <CustomBottomSheet
          bottomSheetModalRef={bottomSheetRef}
          enablePanDownToClose
          snapPoints={['30%']} // 높이를 더 줄임
        >
          <View style={styles.sheetContent}>
            <Text style={styles.sheetTitle}>소셜 로그인</Text>
            
            <TouchableOpacity
              style={[
                styles.submitButton,
                styles.submitButtonActive
              ]}
              onPress={() => handleSocialLogin('Google')}
              activeOpacity={0.8}
            >
              <Text style={[styles.submitButtonText, styles.submitButtonTextActive]}>
                Google로 로그인
              </Text>
            </TouchableOpacity>
          </View>
        </CustomBottomSheet>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    width: '100%',
    alignItems: 'flex-end',
    paddingTop: 48,
    paddingRight: 24,
    paddingBottom: 20,
  },
  socialLoginText: {
    color: '#FA6400',
    fontSize: 16,
    fontWeight: 'bold',
    padding: 8,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  logoContainer: {
    marginBottom: 50,
    alignItems: 'center',
  },
  logo: {
    width: 160,
    height: 160,
    marginBottom: 2,
  },
  appName: {
    fontSize: 38,
    fontWeight: 'bold',
    color: '#000',
    fontFamily: 'neurimboGothicRegular',
  },
  formContainer: {
    width: '100%',
    maxWidth: 320,
  },
  input: {
    width: '100%',
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: '#000',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontFamily: 'SpaceMono-Regular',
  },
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitButtonActive: {
    backgroundColor: '#000',
  },
  submitButtonInactive: {
    backgroundColor: '#ccc',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
  },
  submitButtonTextActive: {
    color: '#fff',
  },
  submitButtonTextInactive: {
    color: '#888',
  },
  bottom: {
    width: '100%',
    paddingBottom: 50,
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  switchModeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchModeText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'SpaceMono-Regular',
  },
  switchModeButton: {
    color: '#FA6400',
    fontSize: 14,
    fontWeight: 'bold',
    fontFamily: 'SpaceMono-Regular',
  },
  sheetContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 24,
    paddingTop: 30,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#000',
    fontFamily: 'SpaceMono-Regular',
  },
  forgotRow: {
    alignSelf: 'flex-end',
    marginTop: 12,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  forgotText: {
    color: '#666',
    fontSize: 14,
    fontFamily: 'SpaceMono-Regular',
    textDecorationLine: 'underline',
  },

  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    marginRight: 8,
  },
  checkboxBoxChecked: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  checkboxTick: {
    width: 12,
    height: 12,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  checkboxLabel: {
    color: '#333',
    fontSize: 14,
    fontFamily: 'SpaceMono-Regular',
  },
  rememberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderRadius: 6,
    borderColor: '#FFFFF', // 주황색 테두리
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    backgroundColor: 'transparent', // 투명 배경
  },
  rememberText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FA6400', // 주황색 글자
  },
  
});