import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgHash = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={16}
    fill="none"
    {...props}
  >
    <Path
      stroke="#7C7C7C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M2.666 6h10.667M2.666 10h10.667M6.667 2 5.334 14M10.667 2 9.334 14"
    />
  </Svg>
);
export default SvgHash;
