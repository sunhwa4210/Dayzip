import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgHeartFocus = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={24}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      fill="#FF763C"
      d="M12 20S3 14.988 3 8.972c0-6.015 7-6.516 9-1.81 2-4.706 9-4.205 9 1.81S12 20 12 20"
    />
  </Svg>
);
export default SvgHeartFocus;
