import * as React from "react";
/** Single-line text field with optional leading icon, suffix, hint and error. */
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement>{
  label?: string; hint?: string; error?: string;
  iconLeft?: React.ReactNode; suffix?: React.ReactNode;
  size?: "sm"|"md"|"lg";
}
export declare function Input(props: InputProps): JSX.Element;
