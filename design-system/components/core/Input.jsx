import React from "react";

export function Input({label,hint,error,iconLeft,suffix,size="md",style,...rest}){
  const [foc,setFoc]=React.useState(false);
  const h=size==="sm"?32:size==="lg"?46:38;
  return (
    <label style={{display:"flex",flexDirection:"column",gap:"var(--space-2)",width:"100%"}}>
      {label&&<span style={{font:"var(--text-label)",color:"var(--text-body)"}}>{label}</span>}
      <span style={{display:"flex",alignItems:"center",gap:"var(--space-3)",minHeight:h,padding:"0 var(--pad-control-x)",background:"var(--surface-card)",
        border:"1px solid "+(error?"var(--red-500)":foc?"var(--border-focus)":"var(--border-default)"),borderRadius:"var(--radius-control)",
        boxShadow:foc&&!error?"var(--focus-ring)":"none",transition:"var(--transition-control)"}}>
        {iconLeft&&<span style={{display:"flex",color:"var(--text-faint)"}}>{iconLeft}</span>}
        <input onFocus={()=>setFoc(true)} onBlur={()=>setFoc(false)}
          style={{flex:1,minWidth:0,border:"none",outline:"none",background:"transparent",color:"var(--text-strong)",font:"var(--text-body-default)",...style}} {...rest}/>
        {suffix&&<span style={{font:"var(--text-label)",color:"var(--text-muted)"}}>{suffix}</span>}
      </span>
      {(hint||error)&&<span style={{font:"var(--fw-regular) var(--fs-sm)/1.4 var(--font-sans)",color:error?"var(--red-500)":"var(--text-muted)"}}>{error||hint}</span>}
    </label>
  );
}
