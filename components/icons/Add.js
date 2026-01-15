import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgAdd = (props) => (
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
      d="M18.5 12h-12M12.5 6v12"
    />
  </Svg>
);
export default SvgAdd;
