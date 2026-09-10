import React from "react";

const SIZES={sm:{font:"var(--fs-sm)",pad:"7px 12px",h:32,radius:"var(--radius-control)"},md:{font:"var(--fs-body)",pad:"var(--pad-control-y) var(--pad-control-x)",h:38,radius:"var(--radius-control)"},lg:{font:"var(--fs-body-lg)",pad:"13px 22px",h:46,radius:"var(--radius-control)"}};
const VARIANTS={
  primary:{background:"var(--btn-primary-bg)",color:"var(--btn-primary-fg)",border:"1px solid var(--btn-primary-bg)"},
  brand:{background:"var(--btn-brand-bg)",color:"var(--btn-brand-fg)",border:"1px solid var(--btn-brand-bg)"},
  secondary:{background:"var(--surface-card)",color:"var(--text-strong)",border:"1px solid var(--border-default)"},
  ghost:{background:"transparent",color:"var(--text-body)",border:"1px solid transparent"},
  danger:{background:"var(--red-500)",color:"#fff",border:"1px solid var(--red-500)"}
};
const HOVER={primary:"var(--btn-primary-bg-hover)",brand:"var(--btn-brand-bg-hover)",secondary:"var(--surface-hover)",ghost:"var(--surface-hover)",danger:"var(--red-700)"};

export function Button({variant="primary",size="md",iconLeft,iconRight,fullWidth,disabled,loading,children,style,...rest}){
  const [h,setH]=React.useState(false),[p,setP]=React.useState(false);
  const s=SIZES[size]||SIZES.md,v=VARIANTS[variant]||VARIANTS.primary;
  return (
    <button disabled={disabled||loading} onMouseEnter={()=>setH(true)} onMouseLeave={()=>{setH(false);setP(false)}} onMouseDown={()=>setP(true)} onMouseUp={()=>setP(false)}
      style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:"var(--gap-inline)",minHeight:s.h,padding:s.pad,borderRadius:s.radius,
        font:"var(--fw-semibold) "+s.font+"/1 var(--font-sans)",letterSpacing:"var(--tracking-body)",cursor:disabled?"not-allowed":"pointer",
        width:fullWidth?"100%":undefined,opacity:disabled?.45:1,transition:"var(--transition-control),transform var(--duration-instant) var(--ease-standard)",
        transform:p&&!disabled?"scale(var(--press-scale))":"none",...v,
        background:h&&!disabled?HOVER[variant]:v.background,...style}} {...rest}>
      {loading?<span style={{width:13,height:13,border:"2px solid currentColor",borderTopColor:"transparent",borderRadius:"50%",display:"inline-block",animation:"useclis-spin .7s linear infinite"}}/>:iconLeft}
      {children}{iconRight}
    </button>
  );
}
