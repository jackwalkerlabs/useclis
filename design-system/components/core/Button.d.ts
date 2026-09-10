import * as React from "react";
/**
 * Primary action control. Black-on-white "primary" for most CTAs, green "brand"
 * used for accent actions.
 * @startingPoint section="Core" subtitle="Button variants, sizes and states" viewport="700x180"
 */
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>{
  variant?: "primary"|"brand"|"secondary"|"ghost"|"danger";
  size?: "sm"|"md"|"lg";
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
  loading?: boolean;
}
export declare function Button(props: ButtonProps): React.JSX.Element;
