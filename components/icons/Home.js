import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgHome = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      stroke="#8C8C8C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m20.159 9.701-7-6.125a1 1 0 0 0-1.318 0l-7 6.125a1 1 0 0 0-.341.753V19a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1v-8.546a1 1 0 0 0-.341-.753"
    />
  </Svg>
);
export default SvgHome;
