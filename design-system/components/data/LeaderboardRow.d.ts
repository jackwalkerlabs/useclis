import * as React from "react";
/** CLI ranking row. Growth is omitted when history is unavailable. */
export interface LeaderboardRowProps { rank: number; name: string; description?: string; logo?: string; command?: string; stars?: React.ReactNode; growth?: number|string; href?: string; }
export declare function LeaderboardRow(props: LeaderboardRowProps): React.JSX.Element;
