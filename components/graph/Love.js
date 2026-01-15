import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgLove = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={51}
    height={13}
    fill="none"
    {...props}
  >
    <Path fill="#F2CBDF" d="M51 0v13H0V0z" />
  </Svg>
);
export default SvgLove;
