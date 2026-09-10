import React from "react";

const TONES={neutral:["var(--surface-sunken)","var(--text-body)"],source:["var(--source-bg)","var(--source-fg)"],featured:["var(--featured-bg)","var(--featured-fg)"],
  positive:["var(--green-50)","var(--green-700)"],negative:["var(--red-50)","var(--red-700)"],info:["var(--blue-50)","var(--blue-700)"],inverse:["var(--surface-inverse)","var(--text-inverse)"]};
export function Badge({tone="neutral",caps,dot,children,style,...rest}){
  const [bg,fg]=TONES[tone]||TONES.neutral;
  return <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 8px",borderRadius:"var(--radius-sm)",background:bg,color:fg,
    font:caps?"var(--text-caps)":"var(--fw-semibold) var(--fs-xs)/1.2 var(--font-sans)",letterSpacing:caps?"var(--tracking-caps)":"0",
    textTransform:caps?"uppercase":"none",whiteSpace:"nowrap",...style}} {...rest}>
    {dot&&<span style={{width:6,height:6,borderRadius:"50%",background:"currentColor"}}/>}{children}</span>;
}
