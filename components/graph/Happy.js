import * as React from "react";
import Svg, { Path } from "react-native-svg";

const Happy = ({
  fill = "#F6D47F",  // 색상
  radius,           // 둥글기 값 (없으면 직사각형)
  top = false,      // 위쪽 둥글기 여부
  bottom = false,   // 아래쪽 둥글기 여부
  width = 51,       // 너비 (기본 51)
  height = 90,      // 높이 (기본 90)
  ...props
}) => {
  const safeRadius =
    typeof radius === "number" && radius > 0 ? radius : 0;

  const d = `
    M0,${top ? safeRadius : 0}
    ${top ? `Q0,0 ${safeRadius},0` : `L0,0 L${safeRadius},0`}
    H${width - safeRadius}
    ${top ? `Q${width},0 ${width},${safeRadius}` : `L${width},0 L${width},${safeRadius}`}
    V${height - (bottom ? safeRadius : 0)}
    ${bottom ? `Q${width},${height} ${width - safeRadius},${height}` : `L${width},${height} L${width - safeRadius},${height}`}
    H${safeRadius}
    ${bottom ? `Q0,${height} 0,${height - safeRadius}` : `L0,${height} L0,${height - safeRadius}`}
    Z
  `;

  return (
    <Svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      fill="none"
      {...props}
    >
      <Path fill={fill} d={d} />
    </Svg>
  );
};

export default Happy;
