import * as React from "react";
/** Square icon-only control for toolbars, card corners and the theme toggle. */
export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  size?: "sm"|"md"|"lg";
  variant?: "ghost"|"outline"|"solid";
  /** Required accessible name. */
  label: string;
}
export declare function IconButton(props: IconButtonProps): JSX.Element;
