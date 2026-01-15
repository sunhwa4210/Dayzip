import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgBookmark = (props) => (
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
      strokeWidth={1.5}
      d="m17.417 19.25-6.416-4.583-6.417 4.583V4.583A1.833 1.833 0 0 1 6.417 2.75h9.167a1.833 1.833 0 0 1 1.833 1.833z"
    />
  </Svg>
);
export default SvgBookmark;
