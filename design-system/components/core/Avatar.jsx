import React from "react";

export function Avatar({src,name="",size=32,shape="rounded",ring}){
  const initial=(name||"?").trim().charAt(0).toUpperCase();
  const radius=shape==="circle"?"50%":"var(--radius-avatar)";
  return <span style={{width:size,height:size,flex:"0 0 auto",display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:radius,
    overflow:"hidden",background:"var(--surface-sunken)",color:"var(--text-muted)",font:"var(--fw-semibold) "+Math.round(size*0.42)+"px/1 var(--font-sans)",
    border:ring?"1px solid var(--border-subtle)":"none"}}>
    {src?<img src={src} alt={name} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:initial}</span>;
}
