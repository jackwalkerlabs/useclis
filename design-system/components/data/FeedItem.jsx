import React from "react";

import {Avatar} from "../core/Avatar.jsx";
export function FeedItem({author,authorAvatar,project,projectLogo,time,children,likes=0,comments=0}){
  return (
    <div style={{display:"flex",gap:"var(--space-4)",padding:"var(--space-5) 0",borderBottom:"1px solid var(--border-subtle)"}}>
      <Avatar src={authorAvatar} name={author} size={36} shape="circle"/>
      <div style={{display:"flex",flexDirection:"column",gap:"var(--space-3)",minWidth:0,flex:1}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",font:"var(--fw-regular) var(--fs-sm)/1.3 var(--font-sans)",color:"var(--text-muted)"}}>
          <span style={{fontWeight:"var(--fw-semibold)",color:"var(--text-strong)"}}>{author}</span><span>on</span>
          <span style={{display:"inline-flex",alignItems:"center",gap:5,color:"var(--text-strong)",fontWeight:"var(--fw-medium)"}}>
            <Avatar src={projectLogo} name={project} size={16}/>{project}</span>
          <span>· {time}</span>
        </div>
        <div style={{font:"var(--text-body-default)",color:"var(--text-body)",textWrap:"pretty"}}>{children}</div>
        <div style={{display:"flex",gap:"var(--space-5)",font:"var(--fw-medium) var(--fs-sm)/1 var(--font-sans)",color:"var(--text-muted)"}}>
          <span>♥ {likes}</span><span>💬 {comments}</span>
        </div>
      </div>
    </div>
  );
}
