import * as React from "react";
/**
 * Labelled number — stars, commits, repository age. Values render in mono with tabular figures.
 * @startingPoint section="Data" subtitle="Metric readout row" viewport="700x160"
 */
export interface MetricStatProps{
  label: string; value: React.ReactNode; sub?: React.ReactNode;
  align?: "left"|"center"|"right"; size?: "sm"|"md"|"lg"; tone?: "default"|"brand";
}
export declare function MetricStat(props: MetricStatProps): React.JSX.Element;
