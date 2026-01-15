// app/add/Lodding.tsx
import { uploadImageToFirebase } from '@/uploadImagetoFirebase';
import { router, useLocalSearchParams } from 'expo-router';
import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

// Firebase Functions (callable)
import { functions } from '@/firebase';
import { httpsCallable } from 'firebase/functions';

const messages = ['일기를 분석하고 있어요', '영감을 떠올리고 있어요', '열심히 그림을 그리고 있어요', '거의 다왔어요!'];

// 안전한 문자열 변환 헬퍼
const toStr = (v: unknown, fallback = ''): string =>
  typeof v === 'string' && v.length > 0 ? v : fallback;

export default function Lodding() {
  // useLocalSearchParams의 값은 string | string[] | undefined 일 수 있음
  const params = useLocalSearchParams();
  const userText = toStr(params.userText);
  const selectedEmotion = toStr(params.selectedEmotion);
  const selectedDate = toStr(params.selectedDate);

  const [index, setIndex] = useState(0);
  const translateY = useRef(new Animated.Value(20)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const generateImage = async () => {
      try {
        if (!userText) return;

        console.log('call payload →', { userText, selectedEmotion, selectedDate });

        // ⚠️ 백엔드가 onRequest(HTTP)면 fetch
        // onCall을 쓰려면 functions 쪽도 onCall로 만들어야 합니다.
        // 여기는 "callable" 유지 버전 예시:
        const callable = httpsCallable(functions, 'generateDiaryImage'); // 서버가 onCall일 때만 OK
        const res: any = await callable({ userText });
      

        // 서버의 응답 스키마에 맞춰 안전하게 꺼내기
        const imageUrlFromServer: unknown = res?.data?.imageUrl;
        const imageUrl = toStr(imageUrlFromServer);

        
        if (!imageUrl) return;

        // 업로드 함수가 string | null 반환 가능하다면 null 가드
        const uploadedUrl = await uploadImageToFirebase(imageUrl, `image-${Date.now()}.png`);
        if (!uploadedUrl) {
          console.error('이미지 업로드 실패: 반환값이 null/빈 문자열');
          return;
        }

        // router params는 string | number | boolean만 허용
        router.push({
          pathname: '/add/diaryresult',
          params: {
            imageUrl: encodeURIComponent(uploadedUrl),   // string 확정
            content: userText,                           // string 확정
            selectedEmotion,                             // string 확정
            selectedDate,                                // string 확정
          },
        });
      } catch (err) {
        console.error('이미지 생성 실패:', err);
      }
    };

    generateImage();
  }, [userText, selectedEmotion, selectedDate]);

  const animateText = () => {
    translateY.setValue(20);
    opacity.setValue(0);
    Animated.parallel([
      Animated.timing(translateY, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    animateText();
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % messages.length);
      animateText();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.Text}>AI 그림 생성중...</Text>
      <Animated.Text style={[styles.Text2, { transform: [{ translateY }], opacity }]}>
        {messages[index]}
      </Animated.Text>
      <LottieView
        source={require('@/assets/animations/loading.json')}
        autoPlay
        loop
        style={styles.loddingimage}
      />
    </View>
  );
}

export const options = { headerShown: false };

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' },
  loddingimage: { width: 306, height: 306, justifyContent: 'center' },
  Text: { fontSize: 25, fontWeight: '600', justifyContent: 'center', alignContent: 'center' },
  Text2: { fontSize: 16, fontWeight: '400', justifyContent: 'center', alignContent: 'center', color: '#71717A', paddingTop: 30 },
});
