import React from "react";
import { TouchableOpacity, View } from "react-native";
import Happy from "../graph/Happy"; // 너의 Happy 경로에 맞춰 수정

const MOOD_COLOR: Record<string, string> = {
  joy:"rgba(246, 212, 127, 1)", love:"rgba(242, 203, 223, 1)", calm:"rgba(207, 242, 212, 1)", sad:"rgba(176, 164, 200, 1)",
  anger:"rgba(185, 96, 114, 1)", fear:"rgba(161, 164, 213, 1)", confused:"rgba(162, 217, 174, 1)", neutral:"rgba(224, 224, 224, 1)", overwhelmed:"rgba(215, 137, 82, 1)",
};

const BAR_TOTAL = 200;

export default function MonthStack({
  data, isActive, onPress,
}: {
  data: any;
  isActive?: boolean;
  onPress?: () => void;
}) {
  const total = Object.keys(MOOD_COLOR).reduce((s, k) => s + (data[k] || 0), 0);
  const segs = Object.keys(MOOD_COLOR)
    .map(k => ({ key: k, h: total ? Math.max(0, (data[k] || 0) / total * BAR_TOTAL) : 0 }))
    .filter(s => s.h > 0);

  const wrapStyle = {
    opacity: isActive ? 1 : 0.35,
    transform: [{ translateY: isActive ? 0 : 4 }],
    shadowColor: "#000",
    shadowOpacity: isActive ? 0.1 : 0,
    shadowRadius: isActive ? 8 : 0,
    elevation: isActive ? 2 : 0,
  } as const;

  const content = (
    <View style={[{ flexDirection: "column", gap: 3, paddingHorizontal: 10 }, wrapStyle]}>
      {segs.map((s, idx) => (
        <Happy
          key={s.key}
          height={s.h}
          fill={MOOD_COLOR[s.key]}
          radius={10}
          top={idx === 0}
          bottom={idx === segs.length - 1}
        />
      ))}
    </View>
  );

  return onPress ? (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
      {content}
    </TouchableOpacity>
  ) : content;
}
