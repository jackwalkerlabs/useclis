import * as React from "react";
/** Filter checkbox for saved tools and directory options. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>,"size">{
  label?: string; checked?: boolean; disabled?: boolean;
}
export declare function Checkbox(props: CheckboxProps): React.JSX.Element;
