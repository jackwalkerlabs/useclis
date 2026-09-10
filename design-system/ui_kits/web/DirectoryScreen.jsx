function DirectoryScreen({open}) {
  const {ToolCard,Input,Select}=window.UseclisDesignSystem;
  const [query,setQuery]=React.useState("");
  const [category,setCategory]=React.useState("All categories");
  const data=window.USECLIS_DATA;
  const results=data.tools.filter(t=>(category==="All categories"||category===t.category)&&[t.name,t.command,t.repo,t.description].join(" ").toLowerCase().includes(query.toLowerCase()));
  return <><h1>Find a CLI for the task.</h1><div className="kit-filters"><Input label="Search CLIs" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Command, task, or repository"/><Select label="Category" value={category} onChange={e=>setCategory(e.target.value)} options={["All categories",...data.categories]}/></div><p role="status">{results.length} CLIs</p><div className="kit-grid">{results.map(t=><ToolCard key={t.slug} {...t} onClick={()=>open(t)}/>)}</div>{results.length===0&&<p>No CLIs match these filters.</p>}</>;
}
