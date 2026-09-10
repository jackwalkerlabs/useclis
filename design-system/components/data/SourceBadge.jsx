import React from "react";

export function SourceBadge({source="GitHub",compact,children}) {
  return <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:compact?"2px 7px":"4px 9px",borderRadius:"var(--radius-pill)",background:"var(--source-bg)",color:"var(--source-fg)",font:"var(--fw-semibold) "+(compact?"var(--fs-xs)":"var(--fs-sm)")+"/1.2 var(--font-sans)"}}>
    <span aria-hidden="true" style={{width:6,height:6,borderRadius:"50%",background:"currentColor"}}/>{children || `Data from ${source}`}
  </span>;
}
