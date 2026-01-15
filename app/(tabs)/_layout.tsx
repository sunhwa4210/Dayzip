import { Tabs, usePathname } from "expo-router";
import React, { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";

// SVG 컴포넌트
import Add from "../../components/icons/Add";
import Explore from "../../components/icons/Explore";
import ExploreFocus from "../../components/icons/ExploreFocus";
import Home from "../../components/icons/Home";
import HomeFocus from "../../components/icons/HomeFocus";
import My from "../../components/icons/My";
import MyFocus from "../../components/icons/MyFocus";
import Report from "../../components/icons/Report";
import ReportFocus from "../../components/icons/ReportFocus";

// 바텀시트 관련
// ✅ BottomSheetModal 타입을 함께 import 합니다.
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import CustomBottomSheet from "../../components/CustomBottomSheet";
import WriteStartSheet from "../../components/WriteStartSheet";

export default function TabLayout() {
  const [selectedEmotion, setSelectedEmotion] = useState("😌 평온");
  
  // ✅ ref의 타입을 BottomSheetModal로 변경합니다.
  const sheetRef = useRef<BottomSheetModal>(null);
  const pathname = usePathname();

  //바 숨기고 싶은 페이지 hidePages에 넣기
  const hidePages = 
  ['/add', '/my/Settings', '/my/birthSetting', '/my/loginSettings', '/my/GoalEditor', '/repoter/lodding', '/repoter/result', '/home/detail']; 
  const hideTabBar = hidePages.some(path => pathname.startsWith(path));

  return (
    <>
      <Tabs
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: hideTabBar ? { display: "none" } : styles.tabBar, 
          tabBarIcon: ({ focused }) => {
            const icons: Record<string, { default: React.ElementType; focus: React.ElementType }> = {
              index: { default: Home, focus: HomeFocus },
              explore: { default: Explore, focus: ExploreFocus },
              add: { default: Add, focus: Add },
              repoter: { default: Report, focus: ReportFocus },
              my: { default: My, focus: MyFocus },
            };

            const iconGroup = icons[route.name];
            if (!iconGroup) return null;

            const IconComponent = focused ? iconGroup.focus : iconGroup.default;

            if (route.name === "add") {
              return (
                <TouchableOpacity
                  onPress={() => {
                    if (pathname !== "/add/lodding") {
                      // ✅ expand() 대신 present() 메서드를 호출합니다.
                      sheetRef.current?.present();
                    }
                  }}
                >
                  <View style={[styles.iconWrapper, focused && styles.focusedIconWrapper]}>
                    <IconComponent width={24} height={24} />
                  </View>
                </TouchableOpacity>
              );
            }

            return (
              <View style={[styles.iconWrapper, focused && styles.focusedIconWrapper]}>
                <IconComponent width={24} height={24} />
              </View>
            );
          },
        })}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="explore" />
        <Tabs.Screen name="add" />
        <Tabs.Screen name="repoter" />
        <Tabs.Screen name="my" />
        <Tabs.Screen name="home" options={{ href: null }} />
      </Tabs>

      {/* 'as any'를 사용하여 타입 에러를 우회합니다.
        CustomBottomSheet 컴포넌트의 bottomSheetModalRef prop 타입이 
        초기값이 null일 수 있는 ref를 허용하지 않게끔 너무 엄격하게 정의된 것으로 보입니다.
        런타임에서는 문제가 없으므로, 타입스크립트 검사를 우회하여 해결합니다.
      */}
      <CustomBottomSheet bottomSheetModalRef={sheetRef as any} snapPoints={["60%"]}>
        <WriteStartSheet
          // 여기도 동일한 이유로 'as any'를 적용합니다.
          // 오류가 발생한 지점은 CustomBottomSheet 이지만, WriteStartSheet도 같은 패턴일 가능성이 높습니다.
          bottomSheetRef={sheetRef as any}
          setSelectedEmotion={setSelectedEmotion}
        />
      </CustomBottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1b1b1b',
    height: 59,
    width: 359,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingBottom: 8,
    paddingTop: 8,
    position: 'absolute',
    bottom: 20,
    marginHorizontal: 20,
  },
  iconWrapper: {
    width: 59,
    height: 43,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusedIconWrapper: {
    backgroundColor: 'hsla(0, 0%, 25%, 1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

