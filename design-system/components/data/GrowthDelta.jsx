import React from "react";

export function GrowthDelta({value,period,size="sm"}){
  const n=typeof value==="number"?value:parseFloat(value);
  const flat=!n||Number.isNaN(n);
  const up=n>0;
  const color=flat?"var(--growth-flat)":up?"var(--growth-up)":"var(--growth-down)";
  const txt=Number.isNaN(n)?"—":(up?"+":"")+n+"%";
  return <span className="tabular" style={{display:"inline-flex",alignItems:"center",gap:4,color,
    font:"var(--fw-semibold) "+(size==="md"?"var(--fs-body)":"var(--fs-sm)")+"/1 var(--font-mono)"}}>
    <span aria-hidden style={{fontSize:"0.85em"}}>{flat?"–":up?"▲":"▼"}</span>{txt}
    {period&&<span style={{color:"var(--text-faint)",font:"var(--fw-regular) var(--fs-xs)/1 var(--font-sans)"}}>{period}</span>}</span>;
}
