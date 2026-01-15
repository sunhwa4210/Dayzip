import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgSad = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={51}
    height={33}
    fill="none"
    {...props}
  >
    <Path fill="#B0A4C8" d="M51 0v33H0V0z" />
  </Svg>
);
export default SvgSad;
