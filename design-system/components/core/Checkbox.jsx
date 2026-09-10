import React from "react";

export function Checkbox({label,checked,onChange,disabled,...rest}){
  return (
    <label style={{display:"inline-flex",alignItems:"center",gap:"var(--space-3)",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1}}>
      <input type="checkbox" checked={checked} onChange={onChange} disabled={disabled} style={{position:"absolute",opacity:0,width:0,height:0}} {...rest}/>
      <span style={{width:18,height:18,display:"inline-flex",alignItems:"center",justifyContent:"center",borderRadius:"var(--radius-xs)",
        border:"1px solid "+(checked?"var(--btn-primary-bg)":"var(--border-default)"),background:checked?"var(--btn-primary-bg)":"var(--surface-card)",
        color:"var(--btn-primary-fg)",font:"var(--fw-bold) 11px/1 var(--font-sans)",transition:"var(--transition-control)"}}>{checked?"✓":""}</span>
      {label&&<span style={{font:"var(--text-body-default)",color:"var(--text-body)"}}>{label}</span>}
    </label>
  );
}
