import * as React from "react";
import Svg, { Circle, Path } from "react-native-svg";
const SvgExplore = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <Circle
      cx={12.5}
      cy={12}
      r={9}
      stroke="#8C8C8C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
    />
    <Path
      stroke="#8C8C8C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M11.807 9.739 15.5 9l-.739 3.693a2 2 0 0 1-1.568 1.569L9.5 15l.739-3.693a2 2 0 0 1 1.568-1.568"
    />
  </Svg>
);
export default SvgExplore;
