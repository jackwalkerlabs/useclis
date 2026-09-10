import React from "react";

export function Card({as="div",padding="md",interactive,accentBg,children,style,...rest}){
  const [h,setH]=React.useState(false);
  const Tag=as;
  const pad=padding==="none"?0:padding==="sm"?"var(--space-4)":padding==="lg"?"var(--pad-card-lg)":"var(--pad-card)";
  return <Tag onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{background:accentBg||"var(--surface-card)",border:"var(--border-card)",borderRadius:"var(--radius-card)",padding:pad,
      boxShadow:interactive&&h?"var(--shadow-md)":"var(--shadow-xs)",borderColor:interactive&&h?"var(--border-default)":"var(--border-subtle)",
      transform:interactive&&h?"translateY(-1px)":"none",transition:"box-shadow var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard)",
      display:"block",...style}} {...rest}>{children}</Tag>;
}
