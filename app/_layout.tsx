// app/_layout.tsx
import 'react-native-reanimated'; // ⚠️ 반드시 최상단

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack } from 'expo-router';
import React, { useEffect } from 'react';
import { Platform, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// ✅ 전역 알림 핸들러 (앱 전체에서 한 번만 등록)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,   // 포그라운드에서도 알림 배너 표시
    shouldPlaySound: true,   // 소리 재생
    shouldSetBadge: true,    // 배지 카운트 적용
  }),
});

export default function RootLayout() {
  const [loaded] = useFonts({
    neurimbo: require('../assets/fonts/neurimboGothicRegular.otf'),
  });

  // ✅ 앱 실행 시 알림 권한 요청 & Android 채널 생성
  useEffect(() => {
    (async () => {
      // 권한 요청
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      // Android 채널 생성 (Expo Go에서도 작동)
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('reminders', {
          name: 'Reminders',
          importance: Notifications.AndroidImportance.DEFAULT,
          sound: 'default',
          vibrationPattern: [0, 250, 250, 250],
          lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        });
      }
    })();
  }, []);

  // 폰트 로딩 중일 때 기본 View 반환
  if (!loaded) return <View style={{ flex: 1, backgroundColor: '#fff' }} />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <BottomSheetModalProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="chapter" />
          <Stack.Screen name="search" />
          <Stack.Screen name="+not-found" options={{ headerShown: true }} />
        </Stack>
      </BottomSheetModalProvider>
    </GestureHandlerRootView>
  );
}
