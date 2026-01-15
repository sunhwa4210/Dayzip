import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgBack = (props) => (
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
      d="m12 5-7 7m0 0 7 7m-7-7h14"
    />
  </Svg>
);
export default SvgBack;
