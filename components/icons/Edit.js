import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgEdit = (props) => (
  <Svg
    xmlns="http://www.w3.org/2000/svg"
    width={18}
    height={18}
    fill="none"
    {...props}
  >
    <Path
      stroke="#7C7C7C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="m3.75 11.25-.375 3.375 3.375-.375 7.586-7.586a2 2 0 0 0 0-2.828l-.172-.172a2 2 0 0 0-2.828 0zM10.5 4.5l3 3M9.75 15h6"
    />
  </Svg>
);
export default SvgEdit;
