import React from "react";
import { Avatar } from "../core/Avatar.jsx";
import { GrowthDelta } from "./GrowthDelta.jsx";

export function LeaderboardRow({rank,name,description,logo,command,stars,growth,href}) {
  return <a href={href} style={{display:"grid",gridTemplateColumns:"32px minmax(140px,1fr) 90px 90px",gap:12,alignItems:"center",padding:16,borderBottom:"1px solid var(--border-subtle)",textDecoration:"none",color:"var(--text-strong)"}}>
    <span className="tabular">{rank}</span><span style={{display:"flex",gap:12,alignItems:"center"}}><Avatar src={logo} name={name} size={32}/><span><strong>{name}</strong><span style={{display:"block",fontSize:13,color:"var(--text-muted)"}}>{description}</span><code>{command}</code></span></span>
    <span className="tabular" style={{textAlign:"right"}}>{stars ?? "—"}</span><GrowthDelta value={growth}/>
  </a>;
}
