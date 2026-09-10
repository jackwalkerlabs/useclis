import * as React from "react";
/** Native select styled to match Input — category, provider and sort pickers. */
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement>{
  label?: string;
  options?: Array<string|{value:string;label:string}>;
  size?: "sm"|"md"|"lg";
}
export declare function Select(props: SelectProps): JSX.Element;
