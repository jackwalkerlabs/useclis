import React from "react";

export function MetricStat({label,value,sub,align="left",size="md",tone}){
  const fs=size==="lg"?"28px":size==="sm"?"15px":"20px";
  return <div style={{display:"flex",flexDirection:"column",gap:"var(--space-1)",alignItems:align==="right"?"flex-end":align==="center"?"center":"flex-start"}}>
    <span style={{font:"var(--text-caps)",letterSpacing:"var(--tracking-caps)",textTransform:"uppercase",color:"var(--text-muted)"}}>{label}</span>
    <span className="tabular" style={{font:"var(--fw-semibold) "+fs+"/1.1 var(--font-mono)",color:tone==="brand"?"var(--text-brand)":"var(--text-strong)"}}>{value}</span>
    {sub&&<span style={{font:"var(--fw-regular) var(--fs-sm)/1.3 var(--font-sans)",color:"var(--text-muted)"}}>{sub}</span>}
  </div>;
}
