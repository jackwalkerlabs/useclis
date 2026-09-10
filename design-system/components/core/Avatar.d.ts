import * as React from "react";
/** Repository or maintainer avatar; falls back to the first letter of `name`. */
export interface AvatarProps{ src?: string; name?: string; size?: number; shape?: "rounded"|"circle"; ring?: boolean }
export declare function Avatar(props: AvatarProps): JSX.Element;
