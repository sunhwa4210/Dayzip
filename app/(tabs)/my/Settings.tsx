// app/mypage/MyPage.tsx
import { FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function MyPage() {
  const [reminderOn, setReminderOn] = useState(false);

  // 예시 값 (원하면 실제 데이터로 교체)
  const writingDays = 102; // D+102
  const diaryCount = 34;   // 작성 일기 34

  return (
    <View style={styles.container}>
      {/* 상단 타이틀 */}
      <View style={styles.header}>
        <Text style={styles.title}>My .zip</Text>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 카드 1: 내 목표 */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>내 목표</Text>

            {/* 우측 상단 + 아이콘 버튼 (MaterialIcons) */}
            <TouchableOpacity style={styles.iconBtn} activeOpacity={0.8} onPress={() => {}}>
              <MaterialIcons name="add" size={22} color="#1B1B1B" />
            </TouchableOpacity>
          </View>

          {/* 오른쪽 ‘핸들’ 도트 */}
          <View style={styles.sideHandle} />

          {/* 목표 아이템들 */}
          <GoalRow label="후회할 일 줄이기" badges={['dashed','solid','solid','check']} />
          <GoalRow label="친절하기" badges={['solid','check']} />
          <GoalRow label="당 보충용 아이템 챙겨다니기" badges={['solid','check']} />
        </View>

        {/* 카드 2: 통계  */}
        <View style={styles.card}>
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>D+{writingDays}</Text>
              <Text style={styles.statLabel}>작성일</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>{diaryCount}</Text>
              <Text style={styles.statLabel}>작성 일기</Text>
            </View>
          </View>
        </View>

        {/* 카드 3: 설정 리스트 (아이콘 = SettingsScreen과 동일 계열) */}
        <View style={styles.card}>
          <ListItem
            left={<Ionicons name="person-outline" size={20} color="#555" />}
            label="소셜 로그인 설정"
            right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
            onPress={() => {}}
          />
          <ListItem
            left={<Ionicons name="time-outline" size={20} color="#555" />}
            label="리마인더 설정"
            right={<Switch value={reminderOn} onValueChange={setReminderOn} />}
          />
          <ListItem
            left={<Ionicons name="calendar-outline" size={20} color="#555" />}
            label="생년월일 설정"
            right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
            isLast
            onPress={() => {}}
          />
        </View>

        {/* 카드 4: 기타 */}
        <View style={styles.card}>
          <ListItem
            left={<MaterialIcons name="info-outline" size={20} color="#555" />}
            label="FAQ (자주 묻는 질문)"
            right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
            onPress={() => {}}
          />
          <ListItem
            left={<FontAwesome name="envelope-o" size={20} color="#555" />}
            label="건의하기"
            right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
            onPress={() => {}}
          />
          <ListItem
            left={<MaterialIcons name="logout" size={20} color="#555" />}
            label="로그아웃"
            right={<MaterialIcons name="keyboard-arrow-right" size={24} color="#888" />}
            isLast
            onPress={() => {}}
          />
        </View>
      </ScrollView>
    </View>
  );
}

/** --- 작은 컴포넌트들 --- */
function GoalRow({ label, badges }: { label: string; badges: Array<'solid'|'dashed'|'check'> }) {
  return (
    <View style={styles.goalRow}>
      <View style={styles.goalLeft}>
        <View style={styles.radio} />
        <Text style={styles.goalText}>{label}</Text>
      </View>
      <View style={styles.badgeStack}>
        {badges.map((t, i) => (
          <View
            key={`${label}-${i}`}
            style={[
              styles.badge,
              t === 'dashed' && styles.badgeDashed,
              t === 'check'  && styles.badgeCheck,
            ]}
          >
            {t === 'check' && <Text style={styles.badgeCheckMark}>✓</Text>}
          </View>
        ))}
      </View>
    </View>
  );
}

function ListItem({
  left,
  label,
  right,
  onPress,
  isLast,
}: {
  left: React.ReactNode;
  label: string;
  right?: React.ReactNode;
  onPress?: () => void;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity
      activeOpacity={onPress ? 0.7 : 1}
      onPress={onPress}
      style={[styles.listItem, isLast && { borderBottomWidth: 0 }]}
    >
      <View style={styles.listLeft}>
        <View style={{ width: 26, alignItems: 'center' }}>{left}</View>
        <Text style={styles.listLabel}>{label}</Text>
      </View>
      {right}
    </TouchableOpacity>
  );
}

/** --- 스타일 --- */
const CARD_RADIUS = 16;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingTop: 48,
  },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1B1B1B',
  },

  card: {
    backgroundColor: '#FFF',
    borderRadius: CARD_RADIUS,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
  },

  /* 내 목표 */
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  iconBtn: {
    marginLeft: 'auto',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E6E6E6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  sideHandle: {
    position: 'absolute',
    right: -8,
    top: 56,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#DADADA',
  },

  goalRow: {
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  goalLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  radio: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: '#D9D9D9', marginRight: 10,
    backgroundColor: '#FFF',
  },
  goalText: { fontSize: 15, color: '#333' },

  badgeStack: { flexDirection: 'row' },
  badge: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: '#2ECC71',
    backgroundColor: '#E9F8EE',
    marginLeft: -8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeDashed: {
    borderStyle: 'dashed',
    borderColor: '#E74C3C',
    backgroundColor: '#FFF0F0',
  },
  badgeCheck: {
    borderColor: '#2ECC71',
    backgroundColor: '#E9F8EE',
  },
  badgeCheckMark: { color: '#2ECC71', fontWeight: '700', fontSize: 12 },

  /* 통계 */
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  statBox: { alignItems: 'center', flex: 1 },
  statNumber: { fontSize: 22, fontWeight: '800', color: '#1B1B1B' },
  statLabel: { marginTop: 4, fontSize: 12, color: '#666' },

  /* 리스트 */
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  listLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  listLabel: { fontSize: 15, color: '#333', marginLeft: 6 },
});
