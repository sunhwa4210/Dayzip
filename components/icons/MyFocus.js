import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgMyFocus = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={25}
    height={24}
    fill="none"
    {...props}
  >
    <Path
      fill="#fff"
      d="M12.5 17c-3.866 0-7 1.79-7 4h14c0-2.21-3.134-4-7-4M12.5 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10"
    />
  </Svg>
);
export default SvgMyFocus;
