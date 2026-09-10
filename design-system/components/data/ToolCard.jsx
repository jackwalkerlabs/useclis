import React from "react";
import { Card } from "../core/Card.jsx";
import { Avatar } from "../core/Avatar.jsx";
import { MetricStat } from "./MetricStat.jsx";

export function ToolCard({name,category,logo,command,stars,license,href,onClick}) {
  return <Card as={href ? "a" : onClick ? "button" : "div"} href={href} onClick={onClick} interactive={!!(href || onClick)} style={{textAlign:"left",color:"var(--text-body)",textDecoration:"none",display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",gap:12,alignItems:"center"}}><Avatar src={logo} name={name} size={40}/><div><strong>{name}</strong><div style={{fontSize:13,color:"var(--text-muted)"}}>{category}</div></div></div>
    <code style={{fontFamily:"var(--font-mono)",overflowWrap:"anywhere"}}>{command}</code>
    <div style={{display:"flex",gap:24,borderTop:"1px solid var(--border-subtle)",paddingTop:12}}><MetricStat label="GitHub stars" value={stars ?? "—"} size="sm"/><MetricStat label="License" value={license ?? "See repository"} size="sm"/></div>
  </Card>;
}
