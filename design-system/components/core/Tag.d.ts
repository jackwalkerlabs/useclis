import * as React from "react";
/** Pill-shaped category / tech-stack chip; renders as a link when `href` is set. */
export interface TagProps extends React.HTMLAttributes<HTMLElement>{ href?: string; active?: boolean }
export declare function Tag(props: TagProps): React.JSX.Element;
