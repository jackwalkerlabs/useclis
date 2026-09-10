import * as React from "react";
/** CLI listing card with a command and repository metrics. */
export interface ToolCardProps { name: string; category?: string; logo?: string; command: string; stars?: React.ReactNode; license?: string; href?: string; onClick?: () => void; }
export declare function ToolCard(props: ToolCardProps): React.JSX.Element;
