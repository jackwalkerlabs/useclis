import * as React from "react";
/** Filter checkbox — source-only, for-sale-only, provider filters. */
export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>,"size">{
  label?: string; checked?: boolean; disabled?: boolean;
}
export declare function Checkbox(props: CheckboxProps): JSX.Element;
