import React from "react";

export function Select({label,options=[],size="md",style,...rest}){
  const h=size==="sm"?32:size==="lg"?46:38;
  return (
    <label style={{display:"flex",flexDirection:"column",gap:"var(--space-2)"}}>
      {label&&<span style={{font:"var(--text-label)",color:"var(--text-body)"}}>{label}</span>}
      <span style={{position:"relative",display:"flex"}}>
        <select style={{appearance:"none",width:"100%",minHeight:h,padding:"0 34px 0 var(--pad-control-x)",background:"var(--surface-card)",color:"var(--text-strong)",
          border:"1px solid var(--border-default)",borderRadius:"var(--radius-control)",font:"var(--text-body-default)",cursor:"pointer",...style}} {...rest}>
          {options.map(o=>{const v=typeof o==="string"?o:o.value,l=typeof o==="string"?o:o.label;return <option key={v} value={v}>{l}</option>})}
        </select>
        <span aria-hidden style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",color:"var(--text-muted)",font:"var(--fs-xs)/1 var(--font-sans)"}}>▾</span>
      </span>
    </label>
  );
}
