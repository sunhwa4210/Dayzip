import { useRouter } from "expo-router";
import React from "react"; // useState는 이제 부모에서 관리하므로 제거합니다.
import { Pressable, StyleSheet, Text, View } from "react-native";

//svg 컴포넌트 관련
import ChapterIcon from '../components/icons/Chapter';

// TopBar가 받을 props 타입을 정의합니다.
interface TopBarProps {
  selectedTab: string;
  setSelectedTab: (tab: string) => void;
  tabs: string[];
}

// props를 받도록 함수 시그니처를 수정합니다.
const TopBar = ({ selectedTab, setSelectedTab, tabs }: TopBarProps) => {
  const router = useRouter();

  return (
    <View style={styles.topBar}>
      {/* 왼쪽 탭 */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setSelectedTab(tab)} // 부모로부터 받은 함수를 호출합니다.
            style={[
              styles.tabButton,
              selectedTab === tab && styles.selectedTabButton,
            ]}
          >
            <Text
              style={[
                styles.tabText,
                selectedTab === tab && styles.selectedTabText,
              ]}
            >
              {tab}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 우측 메뉴 아이콘 */}
      <Pressable
        style={styles.iconWrapper}
        onPress={() => router.push("/chapter")} // '챕터 관리' 화면으로 이동
      >
        <ChapterIcon width={24} height={24} />
      </Pressable>
    </View>
  );
};

// 스타일은 변경 없음
const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 16,
    paddingRight: 12,
    backgroundColor: "white",
    marginTop: 35
  },
  tabContainer: {
    flexDirection: "row",
    gap: 6,
  },
  tabButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#E0E0E0",
    backgroundColor: "#fff",
  },
  selectedTabButton: {
    backgroundColor: "#1B1B1B",
    borderColor: "#1B1B1B",
  },
  tabText: {
    textAlign: "center",
    fontSize: 14,
    color: "#3F3F3F",
    fontWeight: "500",
  },
  selectedTabText: {
    textAlign: "center",
    color: "#fff",
    fontWeight: "600",
  },
  iconWrapper: {
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default TopBar;

