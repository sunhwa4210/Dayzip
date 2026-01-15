import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgMonthFocus = (props) => (
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
      d="M4 8.5h16M16 3.5v2M8 3.5v2M3 6.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
    />
    <Path
      stroke="#3F3F3F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 17h.002v.002H16zM12 17h.002v.002H12zM8 17h.002v.002H8z"
    />
    <Path
      stroke="#3F3F3F"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M16 13h.002v.002H16zM12 13h.002v.002H12zM8 13h.002v.002H8z"
    />
  </Svg>
);
export default SvgMonthFocus;
