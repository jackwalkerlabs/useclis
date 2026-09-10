import React from "react";

export function Switch({checked,onChange,label,disabled}){
  return (
    <label style={{display:"inline-flex",alignItems:"center",gap:"var(--space-3)",cursor:disabled?"not-allowed":"pointer",opacity:disabled?.5:1}}>
      <span onClick={()=>!disabled&&onChange&&onChange(!checked)} style={{width:38,height:22,borderRadius:"var(--radius-pill)",padding:2,display:"inline-flex",
        background:checked?"var(--green-600)":"var(--gray-300)",transition:"background-color var(--duration-base) var(--ease-standard)"}}>
        <span style={{width:18,height:18,borderRadius:"50%",background:"#fff",boxShadow:"var(--shadow-xs)",
          transform:checked?"translateX(16px)":"none",transition:"transform var(--duration-base) var(--ease-out)"}}/>
      </span>
      {label&&<span style={{font:"var(--text-body-default)",color:"var(--text-body)"}}>{label}</span>}
    </label>
  );
}
