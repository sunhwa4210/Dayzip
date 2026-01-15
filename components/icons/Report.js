import * as React from "react";
import Svg, { Path } from "react-native-svg";
const SvgReport = (props) => (
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
      d="M20.5 15.585a8.9 8.9 0 0 1-2.565 3.424 8.84 8.84 0 0 1-8.134 1.615 8.85 8.85 0 0 1-3.673-2.186 8.87 8.87 0 0 1-2.478-7.932A8.9 8.9 0 0 1 5.422 6.61 8.85 8.85 0 0 1 8.81 4"
    />
    <Path
      stroke="#8C8C8C"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.5}
      d="M21.5 12a9 9 0 0 0-9-9v9z"
    />
  </Svg>
);
export default SvgReport;
