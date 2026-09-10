import * as React from "react";
/** Small status pill: FEATURED, Source, growth callouts. */
export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement>{
  tone?: "neutral"|"source"|"featured"|"positive"|"negative"|"info"|"inverse";
  /** Uppercase + letterspaced (used for FEATURED). */
  caps?: boolean;
  dot?: boolean;
}
export declare function Badge(props: BadgeProps): React.JSX.Element;
