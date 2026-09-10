import * as React from "react";
/** Signed growth figure with directional caret — green up, red down, grey when zero/unknown. */
export interface GrowthDeltaProps{ value?: number|string; period?: string; size?: "sm"|"md" }
export declare function GrowthDelta(props: GrowthDeltaProps): JSX.Element;
