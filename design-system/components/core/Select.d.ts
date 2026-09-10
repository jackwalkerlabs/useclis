import * as React from "react";
/** Native select styled to match Input — category and sort pickers. */
export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "size">{
  label?: string;
  options?: Array<string|{value:string;label:string}>;
  size?: "sm"|"md"|"lg";
}
export declare function Select(props: SelectProps): React.JSX.Element;
