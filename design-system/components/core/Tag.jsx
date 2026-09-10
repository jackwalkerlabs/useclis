import React from "react";

export function Tag({href,active,children,style,...rest}){
  const [h,setH]=React.useState(false);
  const Tag2=href?"a":"span";
  return <Tag2 href={href} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{display:"inline-flex",alignItems:"center",padding:"5px 10px",borderRadius:"var(--radius-pill)",
      border:"1px solid "+(active?"var(--border-strong)":"var(--border-subtle)"),
      background:active?"var(--surface-inverse)":h?"var(--surface-hover)":"var(--surface-card)",
      color:active?"var(--text-inverse)":"var(--text-body)",font:"var(--text-label)",textDecoration:"none",whiteSpace:"nowrap",
      transition:"var(--transition-control)",...style}} {...rest}>{children}</Tag2>;
}
