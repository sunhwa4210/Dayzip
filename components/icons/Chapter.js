import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgChapter = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={25}
    fill="none"
    {...props}
  >
    <Path
      stroke="#3F3F3F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M3 18.5h18M3 12.5h18M3 6.5h18"
    />
  </Svg>
);
export default SvgChapter;
