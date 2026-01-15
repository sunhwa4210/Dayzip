import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgTag = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    fill="none"
    {...props}
  >
    <Path
      stroke="#7C7C7C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M5.25 7.5 9 11.25l3.75-3.75"
    />
  </Svg>
);
export default SvgTag;
