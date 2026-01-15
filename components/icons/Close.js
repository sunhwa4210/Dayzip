import * as React from "react";
import Svg, { G, Path, Defs, ClipPath } from "react-native-svg";
const SvgClose = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={20}
    fill="none"
    {...props}
  >
    <G clipPath="url(#close_svg__a)">
      <Path
        fill="#A3A3A3"
        d="M15.25 4.758a.83.83 0 0 0-1.175 0L10 8.825 5.925 4.75A.83.83 0 1 0 4.75 5.925L8.825 10 4.75 14.075a.83.83 0 1 0 1.175 1.175L10 11.175l4.075 4.075a.83.83 0 1 0 1.175-1.175L11.175 10l4.075-4.075a.835.835 0 0 0 0-1.167"
      />
    </G>
    <Defs>
      <ClipPath id="close_svg__a">
        <Path fill="#fff" d="M0 0h20v20H0z" />
      </ClipPath>
    </Defs>
  </Svg>
);
export default SvgClose;
