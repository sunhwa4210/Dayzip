import * as React from "react";
import Svg, { Circle, Path } from "react-native-svg";
const SvgReportFocus = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <Circle cx={12.5} cy={12} r={9.5} fill="#fff" />
    <Path
      fill="#3F3F3F"
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M21.5 12a9 9 0 0 0-9-9v9z"
    />
  </Svg>
);
export default SvgReportFocus;
