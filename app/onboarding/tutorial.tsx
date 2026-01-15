// app/onboarding/tutorial.tsx
import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import { router } from 'expo-router';
import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const SOURCES = [
  require('../../assets/videos/tutorial1.mov'),
  require('../../assets/videos/tutorial2.mov'),
  require('../../assets/videos/tutorial3.mov'),
];

export default function Tutorial() {
  const insets = useSafeAreaInsets();
  const vref = useRef<Video>(null);
  const [idx, setIdx] = useState(0);

  const isLast = idx === SOURCES.length - 1;

  const onBack = () => {
    if (idx > 0) setIdx((i) => i - 1);
    else router.back(); // 첫 장에서는 이전 화면으로
  };

  const onSkip = () => {
    router.replace('/onboarding'); // 로그인 화면으로
  };

  const onNext = () => {
    if (!isLast) setIdx((i) => i + 1);
    else router.replace('/onboarding');
  };

  return (
    <View style={styles.container}>
      {/* 비디오 영역 (배경 전면) */}
      <Video
        key={idx}
        ref={vref}
        source={SOURCES[idx]}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}   // 안 잘리게
        shouldPlay
        isLooping                         // 반복
      />

      {/* 상단 바 */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#111" />
        </TouchableOpacity>

        <TouchableOpacity onPress={onSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      {/* 하단 “다음” 버튼 */}
      <View style={[styles.bottomWrap, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.8}>
          <Text style={styles.nextText}>{isLast ? '시작하기' : '다음'}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const ORANGE = '#FA6400';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  video: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,backgroundColor: '#fff' },

  topBar: {
    width: '100%',
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  backBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
  },
  skipText: { color: ORANGE, fontSize: 15, fontWeight: '700' },

  headerBlock: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111',
    lineHeight: 34,
    marginBottom: 8,
  },
  progress: { color: '#8E8E93', fontSize: 13 },

  // (선택) 중앙 기기 프레임/이미지 배치 영역
  frame: { width: '100%', height: '48%', marginTop: 12 },

  bottomWrap: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16,
  },
  nextBtn: {
    height: 54, borderRadius: 14,
    backgroundColor: '#111',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, elevation: 2,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
