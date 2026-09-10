import React from "react";

export function IconButton({size="md",variant="ghost",label,children,style,...rest}){
  const [h,setH]=React.useState(false);
  const d=size==="sm"?30:size==="lg"?42:36;
  const base=variant==="solid"?{background:"var(--btn-primary-bg)",color:"var(--btn-primary-fg)",border:"1px solid var(--btn-primary-bg)"}
    :variant==="outline"?{background:"var(--surface-card)",color:"var(--text-body)",border:"1px solid var(--border-default)"}
    :{background:"transparent",color:"var(--text-muted)",border:"1px solid transparent"};
  return <button aria-label={label} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{width:d,height:d,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:"var(--radius-control)",cursor:"pointer",
      transition:"var(--transition-control)",...base,
      background:h?(variant==="solid"?"var(--btn-primary-bg-hover)":"var(--surface-hover)"):base.background,
      color:h&&variant==="ghost"?"var(--text-strong)":base.color,...style}} {...rest}>{children}</button>;
}
