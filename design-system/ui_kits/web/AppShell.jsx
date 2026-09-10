function Header({go,dark,setDark}) {
  return <header className="kit-header"><a href="#" className="kit-wordmark" onClick={e=>{e.preventDefault();go("home")}}><img src="../../assets/icon.svg" width="30" height="30" alt=""/>useclis<span>.</span></a><nav aria-label="Preview navigation"><button onClick={()=>go("home")}>Home</button><button onClick={()=>go("directory")}>Directory</button><button onClick={()=>setDark(!dark)} aria-pressed={dark}>Dark theme</button></nav></header>;
}
function Footer(){return <footer className="kit-footer">useclis · Command-line tools for agents. <small>Design system preview · Metrics are checked-in snapshots.</small></footer>}
