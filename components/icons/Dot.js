import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgDot = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={22}
    height={22}
    fill="none"
    {...props}
  >
    <Path
      stroke="#3F3F3F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15.584 11a.917.917 0 1 1 1.833 0 .917.917 0 0 1-1.833 0M10.084 11a.917.917 0 1 1 1.833 0 .917.917 0 0 1-1.833 0M4.584 11a.917.917 0 1 1 1.833 0 .917.917 0 0 1-1.833 0"
    />
  </Svg>
);
export default SvgDot;
