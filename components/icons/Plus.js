import * as React from "react";
import Svg, { Path, Circle } from "react-native-svg";
const SvgPlus = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      stroke="#3F3F3F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M8 12h4m0 0h4m-4 0v4m0-4V8"
    />
    <Circle
      cx={12}
      cy={12}
      r={9}
      stroke="#3F3F3F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
  </Svg>
);
export default SvgPlus;
