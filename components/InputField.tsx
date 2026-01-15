import { router } from "expo-router"; // ⬅️ 추가
import React, { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";

//svg 컴포넌트 관련 
import { Feather } from '@expo/vector-icons';
import DayIcon from '../components/icons/Day';
import DayFocusIcon from '../components/icons/DayFocus';
import MonthIcon from '../components/icons/Month';
import MonthFocusIcon from '../components/icons/MonthFocus';
import WeekIcon from '../components/icons/Week';
import WeekFocusIcon from '../components/icons/WeekFocus';

type ViewMode = 'month' | 'week' | 'day';

type InputFieldProps = {
  currentView: ViewMode;
  onChangeView: (mode: ViewMode) => void;
};

const iconMap: Record<ViewMode, { on: React.FC<any>; off: React.FC<any> }> = {
  month: { on: MonthFocusIcon, off: MonthIcon },
  week: { on: WeekFocusIcon, off: WeekIcon },
  day: { on: DayFocusIcon, off: DayIcon },
};

function InputField({ currentView, onChangeView }: InputFieldProps) {
  const [text, setText] = useState('');

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
      <Feather name="search" size={14} color="#666" /> 
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="검색"
          style={styles.input}
          editable={false}          // 키보드 방지
          pointerEvents="none"      // 터치는 아래 Pressable이 처리
        />
        {/* 전체 영역 터치 시 /search 이동 */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => router.push('/search')}
          android_ripple={{ borderless: false }}
        />
      </View>

      <View style={styles.listview}>
        {(['month', 'week', 'day'] as const).map((mode) => {
          const selected = currentView === mode;
          const IconComponent = selected ? iconMap[mode].on : iconMap[mode].off;
          return (
            <Pressable key={mode} onPress={() => onChangeView(mode)} hitSlop={8}>
              <IconComponent width={24} height={24} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: 'white',
    flexDirection: "row",
  },
  input: {
    fontSize: 14,
    height: 36,
    flex: 1,                // ← 고정폭 대신 유연 레이아웃 권장
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 0,
    paddingHorizontal: 12,
    justifyContent: "center",
  },
  searchContainer: {
    height: 36,
    width: 215,             // 필요하면 flex:1 로 변경
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingVertical: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    position: 'relative',   // ⬅️ 오버레이를 위해 필요
  },
  listview: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    height: 40,
    width: 96,
    backgroundColor: "white",
    marginRight: 12,
  },
  icon: {
    width: 24,
    height: 24,
    marginHorizontal: 4,
  },
});

export default InputField;
