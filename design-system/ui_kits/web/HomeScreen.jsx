function HomeScreen({go,open}) {
  const {ToolCard,Button,SourceBadge}=window.UseclisDesignSystem;
  return <><section className="kit-hero"><SourceBadge/><h1>CLIs for agents.</h1><p>Find a command-line tool for your next task.</p><Button onClick={()=>go("directory")}>Explore the directory →</Button></section><h2>Featured CLIs</h2><div className="kit-grid">{window.USECLIS_DATA.tools.filter(t=>t.featured).slice(0,4).map(t=><ToolCard key={t.slug} {...t} onClick={()=>open(t)}/>)}</div></>;
}
