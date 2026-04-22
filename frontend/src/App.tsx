import { useState, useMemo, useRef, useEffect, useCallback } from "react";

const GEMINI_API = "https://generativelanguage.googleapis.com/v1beta/models";
const MODEL = import.meta.env.VITE_GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

const SAMPLE = [
  { id:"BL-001", title:"User Authentication Module", function:"Security", team:"Platform", priority:"P1", plannedEnd:"2026-03-15", actualEnd:"2026-03-18", status:"Closed", remarks:"Delayed due to OAuth integration issues" },
  { id:"BL-002", title:"Payment Gateway Integration", function:"Finance", team:"Backend", priority:"P0", plannedEnd:"2026-04-01", actualEnd:"", status:"Dev In Progress", remarks:"Awaiting vendor API credentials" },
  { id:"BL-003", title:"Dashboard Analytics", function:"Reporting", team:"Frontend", priority:"P2", plannedEnd:"2026-03-20", actualEnd:"", status:"Overdue", remarks:"" },
  { id:"BL-004", title:"Email Notification System", function:"Communication", team:"Backend", priority:"NA", plannedEnd:"2026-04-10", actualEnd:"2026-04-08", status:"Completed", remarks:"Delivered ahead of schedule" },
  { id:"BL-005", title:"Mobile App Redesign", function:"UX", team:"Frontend", priority:"P1", plannedEnd:"2026-05-01", actualEnd:"", status:"Dev In Progress", remarks:"Design phase completed" },
  { id:"BL-006", title:"Database Optimization", function:"Performance", team:"Platform", priority:"P0", plannedEnd:"2026-03-25", actualEnd:"", status:"Overdue", remarks:"Blocked by infrastructure access" },
  { id:"BL-007", title:"API Rate Limiting", function:"Security", team:"Platform", priority:"P2", plannedEnd:"2026-04-15", actualEnd:"", status:"Pipeline", remarks:"" },
  { id:"BL-008", title:"Customer Portal", function:"CRM", team:"Frontend", priority:"P1", plannedEnd:"2026-05-15", actualEnd:"", status:"Solutioning", remarks:"50% complete" },
  { id:"BL-009", title:"Audit Log Feature", function:"Compliance", team:"Backend", priority:"P1", plannedEnd:"2026-04-20", actualEnd:"2026-04-19", status:"Closed", remarks:"" },
  { id:"BL-010", title:"Search Functionality", function:"UX", team:"Frontend", priority:"P2", plannedEnd:"2026-04-25", actualEnd:"", status:"Dev In Progress", remarks:"Elastic search setup in progress" },
  { id:"BL-011", title:"Report Export PDF/Excel", function:"Reporting", team:"Backend", priority:"NA", plannedEnd:"2026-05-10", actualEnd:"", status:"Pipeline", remarks:"" },
  { id:"BL-012", title:"SSO Integration", function:"Security", team:"Platform", priority:"P0", plannedEnd:"2026-04-05", actualEnd:"", status:"Overdue", remarks:"Pending IT approval" },
  { id:"BL-013", title:"Data Migration Script", function:"Infrastructure", team:"Platform", priority:"P1", plannedEnd:"2026-04-30", actualEnd:"2026-04-28", status:"Closed", remarks:"Completed 2 days early" },
  { id:"BL-014", title:"Role-Based Access Control", function:"Security", team:"Backend", priority:"P0", plannedEnd:"2026-04-12", actualEnd:"", status:"UAT In Progress", remarks:"75% done" },
  { id:"BL-015", title:"Performance Monitoring", function:"Performance", team:"Platform", priority:"P2", plannedEnd:"2026-05-20", actualEnd:"", status:"Solutioning", remarks:"" },
  { id:"BL-016", title:"Multi-language Support", function:"UX", team:"Frontend", priority:"NA", plannedEnd:"2026-06-01", actualEnd:"", status:"Pipeline", remarks:"Deprioritized for Q2" },
];

const SC = {
  "Closed":           { bg:"#064e3b", text:"#6ee7b7", border:"#059669" },
  "Completed":        { bg:"#1a2e1a", text:"#4ade80", border:"#16a34a" },
  "Dev In Progress":  { bg:"#1a2340", text:"#60a5fa", border:"#2563eb" },
  "Dev Completed":    { bg:"#1e3a8a", text:"#93c5fd", border:"#3b82f6" },
  "UAT In Progress":  { bg:"#451a03", text:"#fdba74", border:"#d97706" },
  "UAT Completed":    { bg:"#064e3b", text:"#34d399", border:"#10b981" },
  "Solutioning":      { bg:"#2e1065", text:"#c084fc", border:"#9333ea" },
  "Pipeline":         { bg:"#1e1e2e", text:"#94a3b8", border:"#475569" },
  "Overdue":          { bg:"#450a0a", text:"#fca5a5", border:"#dc2626" },
};
const PC = {
  "P0": { bg:"#2e1a1a", text:"#f87171", border:"#dc2626" },
  "P1": { bg:"#2e1f0a", text:"#fb923c", border:"#ea580c" },
  "P2": { bg:"#1a2340", text:"#60a5fa", border:"#2563eb" },
  "NA": { bg:"#1a2e1a", text:"#4ade80", border:"#16a34a" },
};
const CHART_COLORS = ["#3b82f6","#8b5cf6","#f59e0b","#10b981","#ef4444","#06b6d4","#f97316"];

const s = {
  app: { display:"flex", height:"100vh", background:"var(--bg)", color:"var(--text-main)", overflow:"hidden" },
  sidebar: { width:260, background:"var(--sidebar-bg)", borderRight:"1px solid var(--card-border)", display:"flex", flexDirection:"column", padding:24, flexShrink:0, zIndex:10 },
  main: { flex:1, overflowY:"auto", padding:40, position:"relative" },
  navItem: (active)=>({
    display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderRadius:12, cursor:"pointer",
    background:active?"rgba(59, 130, 246, 0.1)":"transparent",
    color:active?"var(--accent)":"var(--text-dim)",
    fontWeight:active?600:400, marginBottom:8, transition:"all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
    border:active?"1px solid rgba(59, 130, 246, 0.2)":"1px solid transparent",
    boxShadow:active?"0 4px 20px -5px rgba(59, 130, 246, 0.3)":"none"
  }),
  card: { background:"var(--card-bg)", borderRadius:16, border:"1px solid var(--card-border)", padding:24, position:"relative", overflow:"hidden" },
  cardTitle: { fontSize:13, fontWeight:600, color:"var(--text-dim)", textTransform:"uppercase", letterSpacing:1, marginBottom:16 },
  metricVal: { fontSize:32, fontWeight:700, color:"white", marginBottom:4 },
  metricSub: { fontSize:12, color:"var(--text-dim)" },
  grid: (cols)=>({ display:"grid", gridTemplateColumns:`repeat(${cols}, 1fr)`, gap:24 }),
  pageTitle: { fontSize:28, fontWeight:800, color:"white", marginBottom:8, letterSpacing:"-0.5px" },
  pageSub: { fontSize:15, color:"var(--text-dim)", marginBottom:32 },
  table: { width:"100%", borderCollapse:"separate", borderSpacing:"0 8px" },
  th: { textAlign:"left", padding:16, fontSize:12, fontWeight:600, color:"var(--text-dim)", textTransform:"uppercase", borderBottom:"1px solid var(--card-border)", letterSpacing:0.5 },
  td: { padding:16, background:"rgba(255,255,255,0.02)", borderTop:"1px solid var(--card-border)", borderBottom:"1px solid var(--card-border)" },
  input: { background:"rgba(255,255,255,0.05)", border:"1px solid var(--card-border)", borderRadius:8, color:"white", padding:"10px 16px", fontSize:14, outline:"none" },
  select: { background:"rgba(255,255,255,0.05)", border:"1px solid var(--card-border)", borderRadius:8, color:"white", padding:"8px 12px", cursor:"pointer" },
  btn: (v="default") => ({ padding:"7px 14px", borderRadius:6, fontSize:13, fontWeight:500, cursor:"pointer", border:"1px solid", ...(v==="primary"?{background:"#2563eb",color:"#fff",borderColor:"#2563eb"}:v==="danger"?{background:"#dc2626",color:"#fff",borderColor:"#dc2626"}:{background:"#1e2235",color:"#94a3b8",borderColor:"#2d3348"}) }),
  aiCard: { background:"rgba(13, 26, 46, 0.4)", border:"1px solid rgba(59, 130, 246, 0.2)", borderRadius:16, padding:24, backdropFilter:"var(--glass-effect)" },
  risk: (lvl) => ({ background: lvl==="P0"?"rgba(244, 63, 94, 0.1)":lvl==="P1"?"rgba(245, 158, 11, 0.1)":"rgba(59, 130, 246, 0.1)", border:`1px solid ${lvl==="P0"?"rgba(244, 63, 94, 0.2)":lvl==="P1"?"rgba(245, 158, 11, 0.2)":"rgba(59, 130, 246, 0.2)"}`, borderRadius:12, padding:16, marginBottom:12 }),
  badge: (type, map) => {
    const c = map[type] || { bg:"#1e1e2e", text:"#94a3b8", border:"#475569" };
    return {
      display:"inline-flex", alignItems:"center", padding:"4px 10px", borderRadius:20, fontSize:10, fontWeight:700,
      background:c.bg, color:c.text, border:`1px solid ${c.border}`, textTransform:"uppercase", letterSpacing:0.5, whiteSpace:"nowrap"
    };
  },
};

function Badge({ label, map }) { return <span style={s.badge(label, map)}>{label}</span>; }

function MiniBar({ label, value, max, color="#3b82f6" }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
      <div style={{ width:100, fontSize:12, color:"#94a3b8", textAlign:"right", flexShrink:0 }}>{label}</div>
      <div style={{ flex:1, background:"#1e2235", borderRadius:4, height:8 }}>
        <div style={{ width:`${(value/Math.max(max,1))*100}%`, height:"100%", background:color, borderRadius:4, transition:"width 0.4s", minWidth: value?4:0 }} />
      </div>
      <div style={{ width:24, fontSize:12, fontWeight:600, color:"#e2e8f0" }}>{value}</div>
    </div>
  );
}

function DonutSVG({ data, colors }) {
  const total = data.reduce((s,d)=>s+d.v,0)||1;
  let cum=0;
  const slices = data.map((d,i)=>{
    const pct = d.v/total, start=cum, end=cum+pct;
    cum=end;
    const s1=start*2*Math.PI-Math.PI/2, e1=end*2*Math.PI-Math.PI/2;
    const x1=60+45*Math.cos(s1),y1=60+45*Math.sin(s1),x2=60+45*Math.cos(e1),y2=60+45*Math.sin(e1);
    const large=pct>0.5?1:0;
    return { path:`M60,60 L${x1},${y1} A45,45 0 ${large} 1 ${x2},${y2} Z`, color:colors[i%colors.length], ...d };
  });
  return (
    <div style={{ display:"flex", alignItems:"center", gap:16 }}>
      <svg width={120} height={120} style={{ flexShrink:0 }}>
        {slices.map(sl=><path key={sl.label} d={sl.path} fill={sl.color} stroke="#0f1117" strokeWidth={2}/>)}
        <circle cx={60} cy={60} r={28} fill="#13151f"/>
        <text x={60} y={56} textAnchor="middle" fontSize={16} fontWeight={700} fill="#f1f5f9">{total}</text>
        <text x={60} y={70} textAnchor="middle" fontSize={10} fill="#64748b">total</text>
      </svg>
      <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
        {slices.map((sl,i)=>(
          <div key={sl.label} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12 }}>
            <span style={{ width:8, height:8, borderRadius:2, background:sl.color, flexShrink:0 }}/>
            <span style={{ color:"#94a3b8" }}>{sl.label}</span>
            <span style={{ fontWeight:600, color:"#e2e8f0" }}>{sl.v}</span>
            <span style={{ color:"#475569", fontSize:11 }}>({Math.round(sl.v/total*100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProgressRing({ pct, size=64, stroke=6, color="#3b82f6" }) {
  const r=( size-stroke*2)/2, circ=2*Math.PI*r, off=circ*(1-pct/100);
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#1e2235" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize={13} fontWeight={700} fill="#f1f5f9">{pct}%</text>
    </svg>
  );
}

async function callAI(systemPrompt, userPrompt) {
  if (!GEMINI_API_KEY) throw new Error("VITE_GEMINI_API_KEY is not configured");
  const res = await fetch(`${GEMINI_API}/${MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role:"user", parts:[{ text:userPrompt }] }],
      generationConfig: { maxOutputTokens: 1000, temperature: 0.2 }
    })
  });
  if (!res.ok) throw new Error(`Gemini request failed: ${res.status}`);
  const d = await res.json();
  return d.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim() || "";
}

function AISpinner() {
  return <div style={{ display:"flex", alignItems:"center", gap:8, color:"#64748b", fontSize:13 }}>
    <div style={{ width:16, height:16, border:"2px solid #2563eb", borderTopColor:"transparent", borderRadius:"50%", animation:"spin 0.8s linear infinite" }}/>
    Analyzing with AI...
  </div>;
}

// ─── Pages ──────────────────────────────────────────────────────────────────

function Overview({ data }) {
  const m = useMemo(()=>({
    total:data.length,
    done:data.filter(d=>d.status==="Completed"||d.status==="Closed").length,
    overdue:data.filter(d=>d.status==="Overdue").length,
    active:data.filter(d=>["Dev In Progress","UAT In Progress","Solutioning"].includes(d.status)).length,
    pipeline:data.filter(d=>d.status==="Pipeline").length,
    critical:data.filter(d=>d.priority==="P0").length,
    completionRate:data.length?Math.round(data.filter(d=>["Completed","Closed"].includes(d.status)).length/data.length*100):0,
  }),[data]);

  const statusData=[
    {label:"Closed/Done",v:m.done},{label:"Active",v:m.active},
    {label:"Overdue",v:m.overdue},{label:"Pipeline",v:m.pipeline}
  ];
  const statusColors=["#10b981","#3b82f6","#ef4444","#475569"];
  const teams=[...new Set(data.map(d=>d.team))];
  const maxTeam=Math.max(...teams.map(t=>data.filter(d=>d.team===t).length));
  const priorityData=[
    {label:"P0",v:data.filter(d=>d.priority==="P0").length},
    {label:"P1",v:data.filter(d=>d.priority==="P1").length},
    {label:"P2",v:data.filter(d=>d.priority==="P2").length},
    {label:"NA",v:data.filter(d=>d.priority==="NA").length},
  ];

  return (
    <div className="animate-in" style={{ paddingBottom:40 }}>
      {/* Header Panel */}
      <div style={{ marginBottom:40, background:"linear-gradient(to bottom, rgba(59,130,246,0.05), transparent)", padding:32, borderRadius:24, border:"1px solid var(--card-border)" }}>
        <h1 style={s.pageTitle}>Dashboard Overview</h1>
        <p style={{ ...s.pageSub, marginBottom:0 }}>Real-time Requirement & Delivery Intelligence</p>
      </div>

      {/* Primary Metrics Grid */}
      <div style={{ ...s.grid(5), marginBottom:40 }}>
        {[
          { label:"Total Items", val:m.total, sub:"Backlog size", icon:"📁", col:"var(--text-main)" },
          { label:"Completed", val:m.done, sub:`${m.completionRate}% Done`, icon:"✅", col:"#4ade80" },
          { label:"Active", val:m.active, sub:"Dev/UAT/Sol", icon:"⚡", col:"#60a5fa" },
          { label:"Overdue", val:m.overdue, sub:"Immediate action", icon:"⚠", col:"#f87171" },
          { label:"Critical P0", val:m.critical, sub:"Urgent priority", icon:"🔥", col:"#fb923c" },
        ].map(c=>(
          <div key={c.label} style={s.card} className="glass-card">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
              <div style={s.cardTitle}>{c.label}</div>
              <span style={{ fontSize:20 }}>{c.icon}</span>
            </div>
            <div style={{ ...s.metricVal, color:c.col }}>{c.val}</div>
            <div style={s.metricSub}>{c.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:16, marginBottom:20 }}>
        <div style={s.card}>
          <div style={s.cardTitle}>Status distribution</div>
          <DonutSVG data={statusData} colors={statusColors}/>
        </div>
        <div style={s.card}>
          <div style={s.cardTitle}>Priority breakdown</div>
          {priorityData.map((p,i)=><MiniBar key={p.label} label={p.label} value={p.v} max={m.total} color={["#ef4444","#f97316","#3b82f6","#10b981"][i]}/>)}
        </div>
        <div style={{ ...s.card, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8 }}>
          <div style={s.cardTitle}>Completion rate</div>
          <ProgressRing pct={m.completionRate} size={100} stroke={8} color={m.completionRate>60?"#10b981":m.completionRate>30?"#f59e0b":"#ef4444"}/>
          <div style={{ fontSize:12, color:"#64748b", textAlign:"center" }}>{m.done} of {m.total} items done</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <div style={s.card}>
          <div style={s.cardTitle}>Team workload</div>
          {teams.map((t,i)=><MiniBar key={t} label={t} value={data.filter(d=>d.team===t).length} max={maxTeam} color={CHART_COLORS[i%CHART_COLORS.length]}/>)}
        </div>
        <div style={s.card}>
          {/* Recent activity filter: Overdue or P0 */}
          <div style={s.cardTitle}>Recent activity — overdue & P0</div>
          {data.filter(d=>d.status==="Overdue"||d.priority==="P0").slice(0,5).map(d=>(
            <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid #1a1e2e" }}>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:"#94a3b8" }}>{d.id}</div>
                <div style={{ fontSize:13, color:"#e2e8f0" }}>{d.title.slice(0,32)}{d.title.length>32?"…":""}</div>
              </div>
              <div style={{ display:"flex", gap:4 }}>
                <Badge label={d.priority} map={PC}/>
                <Badge label={d.status} map={SC}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BacklogTable({ data, setData }) {
  const [search,setSearch]=useState(""), [fStatus,setFS]=useState("All"), [fPri,setFP]=useState("All"), [fTeam,setFT]=useState("All");
  const [sortCol,setSortCol]=useState("id"), [sortDir,setDir]=useState("asc");
  const [editId,setEditId]=useState(null), [editData,setED]=useState({});
  const [showAdd,setShowAdd]=useState(false);
  const fileRef=useRef();
  const teams=useMemo(()=>["All",...new Set(data.map(d=>d.team))],[data]);

  const filtered=useMemo(()=>{
    let d=data.filter(r => 
      (fStatus==="All" || r.status===fStatus) &&
      (fPri==="All" || r.priority===fPri) &&
      (fTeam==="All" || r.team===fTeam) &&
      (!search || Object.values(r).some(v=>v.toString().toLowerCase().includes(search.toLowerCase())))
    );
    return [...d].sort((a,b)=>{ 
      const av=a[sortCol]||"", bv=b[sortCol]||""; 
      return sortDir==="asc" ? (av>bv?1:-1) : (av<bv?1:-1); 
    });
  },[data,fStatus,fPri,fTeam,search,sortCol,sortDir]);

  const sort = col => { 
    if(sortCol===col) setDir(d=>d==="asc"?"desc":"asc"); 
    else { setSortCol(col); setDir("asc"); } 
  };
  
  const SortArrow = ({col}) => sortCol===col ? 
    <span style={{color:"var(--accent)"}}>{sortDir==="asc"?" ↑":" ↓"}</span> : 
    <span style={{color:"var(--text-dim)"}}> ↕</span>;

  const exportCSV = () => {
    const hdr = ["ID","Title","Function","Team","Priority","Planned End","Actual End","Status","Remarks"];
    const rows = filtered.map(r=>[r.id,r.title,r.function,r.team,r.priority,r.plannedEnd,r.actualEnd,r.status,r.remarks]);
    const csv = [hdr,...rows].map(r=>r.map(c=>`"${c}"`).join(",")).join("\n");
    const a = document.createElement("a"); a.href="data:text/csv,"+encodeURIComponent(csv); a.download="backlog_export.csv"; a.click();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if(!file) return
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/upload`, { method:"POST", body:formData });
      const json = await res.json();
      if(json.data) setData(json.data);
    } catch(err) {
      alert("Upload failed. Verify backend is running on port 5000.");
    }
  };

  return (
    <div className="animate-in">
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:32 }}>
        <div>
          <h1 style={s.pageTitle}>Backlog Management</h1>
          <p style={s.pageSub}>{filtered.length} of {data.length} requirements shown</p>
        </div>
        <div style={{ display:"flex", gap:12 }}>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{display:"none"}} onChange={handleUpload} />
          <button className="btn-secondary" onClick={()=>fileRef.current.click()}>Import Data</button>
          <button className="btn-secondary" onClick={exportCSV}>Export CSV</button>
          <button className="btn-primary" onClick={()=>setShowAdd(true)}>+ Create Requirement</button>
        </div>
      </div>

      <div style={{ ...s.card, padding:0 }} className="glass-card">
        {/* Advanced Filters */}
        <div style={{ padding:"20px 24px", borderBottom:"1px solid var(--card-border)", display:"flex", gap:16, flexWrap:"wrap", background:"rgba(255,255,255,0.01)" }}>
          <div style={{ flex:1, position:"relative", minWidth:200 }}>
            <span style={{ position:"absolute", left:14, top:11, color:"var(--text-dim)", fontSize:14 }}>🔍</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search backlog..." style={{ ...s.input, width:"100%", paddingLeft:40 }}/>
          </div>
          {[
            ["Status", ["All", ...Object.keys(SC)], fStatus, setFS],
            ["Priority", ["All", "P0", "P1", "P2", "NA"], fPri, setFP],
            ["Team", teams, fTeam, setFT]
          ].map(([lbl,opts,val,set])=>(
            <div key={lbl} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:12, color:"var(--text-dim)", fontWeight:600 }}>{lbl}</span>
              <select value={val} onChange={e=>set(e.target.value)} style={s.select}>
                {opts.map(o=><option key={o}>{o}</option>)}
              </select>
            </div>
          ))}
          <button className="btn-secondary" style={{ padding:"7px 12px", fontSize:12 }} onClick={()=>{setSearch(""); setFS("All"); setFP("All"); setFT("All");}}>Reset</button>
        </div>

        {/* Data Grid */}
        <div style={{ padding:0, overflowX:"auto" }}>
          <table style={{ ...s.table, borderSpacing:"0" }}>
            <thead>
              <tr style={{ background:"rgba(255,255,255,0.02)" }}>
                {[["id","ID"],["title","Title"],["function","Function"],["team","Team"],["priority","Priority"],["plannedEnd","Delivery Date"],["status","Status"]].map(([col,lbl])=>(
                  <th key={lbl} style={{ ...s.th, cursor:"pointer", transition:"color 0.2s" }} onClick={()=>sort(col)}>
                    {lbl} <SortArrow col={col}/>
                  </th>
                ))}
                <th style={s.th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx)=>(
                <tr key={row.id} style={{ background:idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)", transition:"background 0.2s" }}>
                  {editId===row.id ? (
                    <>
                      <td style={s.td}><input value={editData.id??row.id} onChange={e=>setED(d=>({...d,id:e.target.value}))} style={{...s.input, padding:4, fontSize:12}}/></td>
                      <td style={s.td}><input value={editData.title??row.title} onChange={e=>setED(d=>({...d,title:e.target.value}))} style={{...s.input, padding:4}}/></td>
                      <td style={s.td}><input value={editData.function??row.function} onChange={e=>setED(d=>({...d,function:e.target.value}))} style={{...s.input, padding:4}}/></td>
                      <td style={s.td}><input value={editData.team??row.team} onChange={e=>setED(d=>({...d,team:e.target.value}))} style={{...s.input, padding:4}}/></td>
                      <td style={s.td}>
                        <select value={editData.priority??row.priority} onChange={e=>setED(d=>({...d,priority:e.target.value}))} style={s.select}>
                          {["P0","P1","P2","NA"].map(p=><option key={p}>{p}</option>)}
                        </select>
                      </td>
                      <td style={s.td}><input type="date" value={editData.plannedEnd??row.plannedEnd} onChange={e=>setED(d=>({...d,plannedEnd:e.target.value}))} style={s.input}/></td>
                      <td style={s.td}>
                        <select value={editData.status??row.status} onChange={e=>setED(d=>({...d,status:e.target.value}))} style={s.select}>
                          {Object.keys(SC).map(st=><option key={st}>{st}</option>)}
                        </select>
                      </td>
                      <td style={s.td}>
                        <button className="btn-primary" style={{padding:"4px 8px", fontSize:11}} onClick={()=>{ setData(d=>d.map(r=>r.id===editId?{...r,...editData}:r)); setEditId(null); }}>Save</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ ...s.td, color:"var(--accent)", fontWeight:700, fontSize:12 }}>{row.id}</td>
                      <td style={{ ...s.td, fontWeight:500 }}>{row.title}</td>
                      <td style={{ ...s.td, fontSize:12 }}>{row.function}</td>
                      <td style={{ ...s.td, fontSize:12, color:"var(--text-dim)" }}>{row.team}</td>
                      <td style={s.td}><Badge label={row.priority} map={PC}/></td>
                      <td style={{ ...s.td, fontSize:13 }}>{row.plannedEnd}</td>
                      <td style={s.td}><Badge label={row.status} map={SC}/></td>
                      <td style={s.td}>
                        <button className="btn-secondary" style={{padding:"4px 10px", fontSize:11}} onClick={()=>{setEditId(row.id); setED(row);}}>Edit</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && <div style={{ padding:60, textAlign:"center", color:"var(--text-dim)" }}>No records matching the current selection.</div>}
        </div>
      </div>

      {showAdd && <AddDialog data={data} setData={setData} close={()=>setShowAdd(false)} />}
    </div>
  );
}

function Analytics({ data }) {
  const byFunc=useMemo(()=>[...new Set(data.map(d=>d.function))].map(f=>({ label:f, v:data.filter(d=>d.function===f).length })),[data]);
  const byTeamStatus=useMemo(()=>{
    const teams=[...new Set(data.map(d=>d.team))];
    return teams.map(t=>({ team:t, completed:data.filter(d=>d.team===t&&["Completed","Closed","UAT Completed"].includes(d.status)).length, active:data.filter(d=>d.team===t&&["Dev In Progress","UAT In Progress","Solutioning"].includes(d.status)).length, overdue:data.filter(d=>d.team===t&&d.status==="Overdue").length }));
  },[data]);
  const delayStats=useMemo(()=>{
    const done=data.filter(d=>d.actualEnd&&d.plannedEnd);
    const delays=done.map(d=>Math.round((new Date(d.actualEnd)-new Date(d.plannedEnd))/86400000));
    return { onTime:delays.filter(d=>d<=0).length, delayed:delays.filter(d=>d>0).length, avgDelay: delays.length?Math.round(delays.reduce((s,d)=>s+d,0)/delays.length):0 };
  },[data]);
  const maxFunc=Math.max(...byFunc.map(f=>f.v),1);

  return (
    <div className="animate-in" style={{ paddingBottom:40 }}>
      <div style={{ marginBottom:40, background:"linear-gradient(to bottom, rgba(59,130,246,0.05), transparent)", padding:32, borderRadius:24, border:"1px solid var(--card-border)" }}>
        <h1 style={s.pageTitle}>Advanced Analytics</h1>
        <p style={{ ...s.pageSub, marginBottom:0 }}>Performance metrics and workload distribution</p>
      </div>

      <div style={{ ...s.grid(3), marginBottom:32 }}>
        <div style={s.card} className="glass-card">
          <div style={s.cardTitle}>Planned vs Actual</div>
          <div style={{ ...s.metricVal, color:"var(--emerald)" }}>{delayStats.onTime} items</div>
          <div style={s.metricSub}>Delivered on or before schedule</div>
        </div>
        <div style={s.card} className="glass-card">
          <div style={s.cardTitle}>Average Delivery Delay</div>
          <div style={{ ...s.metricVal, color:"var(--amber)" }}>{delayStats.avgDelay} Days</div>
          <div style={s.metricSub}>Average variance across all tasks</div>
        </div>
        <div style={s.card} className="glass-card">
          <div style={s.cardTitle}>High Risk Variance</div>
          <div style={{ ...s.metricVal, color:"var(--rose)" }}>{delayStats.delayed} items</div>
          <div style={s.metricSub}>Significant schedule slippages</div>
        </div>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1.5fr", gap:24, marginBottom:32 }}>
        <div style={s.card} className="glass-card">
          <div style={s.cardTitle}>Distribution by Function</div>
          <div style={{ display:"flex", flexDirection:"column", gap:16, marginTop:8 }}>
            {byFunc.map((f,i)=><MiniBar key={f.label} label={f.label} value={f.v} max={maxFunc} color={CHART_COLORS[i%CHART_COLORS.length]}/>)}
          </div>
        </div>
        
        <div style={s.card} className="glass-card">
          <div style={s.cardTitle}>Team Performance Matrix</div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ ...s.table, borderSpacing:0 }}>
              <thead>
                <tr>
                  <th style={s.th}>Team</th>
                  <th style={s.th}>Done</th>
                  <th style={s.th}>Active</th>
                  <th style={s.th}>Overdue</th>
                  <th style={s.th}>Health</th>
                </tr>
              </thead>
              <tbody>
                {byTeamStatus.map(t=>{
                  const total=data.filter(d=>d.team===t.team).length;
                  const rate=Math.round(t.completed/Math.max(total,1)*100);
                  return (
                    <tr key={t.team}>
                      <td style={{ ...s.td, fontWeight:700, color:"white" }}>{t.team}</td>
                      <td style={{ ...s.td, color:"var(--emerald)", fontWeight:600 }}>{t.completed}</td>
                      <td style={{ ...s.td, color:"var(--accent)", fontWeight:600 }}>{t.active}</td>
                      <td style={{ ...s.td, color:"var(--rose)", fontWeight:600 }}>{t.overdue}</td>
                      <td style={s.td}>
                        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                          <div style={{ flex:1, background:"rgba(255,255,255,0.05)", borderRadius:4, height:8 }}>
                            <div style={{ width:`${rate}%`, height:"100%", background:rate>80?"var(--emerald)":rate>50?"var(--amber)":"#ef4444", borderRadius:4 }}/>
                          </div>
                          <span style={{ fontSize:12, fontWeight:700 }}>{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div style={s.card} className="glass-card">
        <div style={s.cardTitle}>Priority / Status Intensity Map</div>
        <div style={{ overflowX:"auto", marginTop:16 }}>
          <table style={{ ...s.table, width:"auto" }}>
            <thead>
              <tr>
                <th style={{ ...s.th, minWidth:120 }}>Priority</th>
                {["Closed","Completed","Dev In Progress","UAT In Progress","Pipeline"].map(st=>(
                  <th key={st} style={{ ...s.th, textAlign:"center" }}>{st}</th>
                ))}
                <th style={{ ...s.th, textAlign:"center" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {["P0","P1","P2","NA"].map(p=>{
                const row=["Closed","Completed","Dev In Progress","UAT In Progress","Pipeline"].map(st=>data.filter(d=>d.priority===p&&d.status===st).length);
                const total=row.reduce((s,v)=>s+v,0);
                const maxVal=Math.max(...row, 5); // Base 5 for shade scale
                return (
                  <tr key={p}>
                    <td style={s.td}><Badge label={p} map={PC}/></td>
                    {row.map((v,i)=>(
                      <td key={i} style={{ ...s.td, textAlign:"center" }}>
                        <div style={{ 
                          background:`rgba(59,130,246,${Math.min(0.9, 0.1 + (v/maxVal)*0.8)})`, 
                          borderRadius:8, padding:"8px 12px", display:"inline-block", minWidth:40,
                          fontWeight:800, color: v>0 ? "white" : "rgba(255,255,255,0.15)",
                          border:`1px solid ${v>0 ? "rgba(255,255,255,0.1)" : "transparent"}`
                        }}>{v}</div>
                      </td>
                    ))}
                    <td style={{ ...s.td, textAlign:"center", fontWeight:800, color:"white", fontSize:16 }}>{total}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Timeline({ data }) {
  const [filter,setFilter]=useState("All");
  const items=useMemo(()=>{
    const d=filter==="All"?data:data.filter(r=>r.status===filter);
    return [...d].filter(r=>r.plannedEnd).sort((a,b)=>new Date(a.plannedEnd)-new Date(b.plannedEnd));
  },[data,filter]);
  const minD=new Date("2026-03-01"), maxD=new Date("2026-07-01");
  const span=maxD-minD;
  const pct=d=>Math.max(0,Math.min(100,(new Date(d)-minD)/span*100));

  return (
    <div className="animate-in" style={{ paddingBottom:40 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:40 }}>
        <div>
          <h1 style={s.pageTitle}>Timeline / Gantt</h1>
          <p style={s.pageSub}>Planned vs actual delivery dates</p>
        </div>
        <select value={filter} onChange={e=>setFilter(e.target.value)} style={s.select}>
          {["All",...Object.keys(SC)].map(o=><option key={o}>{o}</option>)}
        </select>
      </div>

      <div style={{ ...s.card, padding:32 }} className="glass-card">
        <div style={{ display:"flex", marginBottom:20, paddingLeft:200, gap:0 }}>
          {["Mar","Apr","May","Jun","Jul"].map((m,i)=>(
            <div key={m} style={{ flex:1, fontSize:12, color:"var(--text-dim)", fontWeight:700, textAlign:"left", borderLeft:"1px solid rgba(255,255,255,0.05)", paddingLeft:12 }}>{m} 2026</div>
          ))}
        </div>
        
        <div style={{ borderLeft:"1px solid var(--card-border)" }}>
          {items.map(row=>{
            const p1=pct(row.plannedEnd);
            const p2=row.actualEnd?pct(row.actualEnd):null;
            const diff=row.actualEnd?Math.round((new Date(row.actualEnd)-new Date(row.plannedEnd))/86400000):null;
            
            return (
              <div key={row.id} style={{ display:"flex", alignItems:"center", height:56, borderBottom:"1px solid rgba(255,255,255,0.03)", position:"relative" }}>
                <div style={{ width:200, flexShrink:0, paddingRight:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, color:"var(--accent)", marginBottom:2 }}>{row.id}</div>
                  <div style={{ fontSize:12, fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis", color:"var(--text-main)" }}>{row.title}</div>
                </div>
                <div style={{ flex:1, height:12, background:"rgba(255,255,255,0.02)", borderRadius:6, position:"relative" }}>
                  <div style={{ position:"absolute", left:`${p1}%`, width:12, height:12, borderRadius:6, background:"var(--accent)", zIndex:2, transform:"translateX(-50%)", border:"2px solid var(--bg)" }} />
                  {p2!==null && (
                    <>
                      <div style={{ position:"absolute", left:Math.min(p1,p2)+"%", width:Math.abs(p1-p2)+"%", height:6, top:3, background:diff>0?"var(--rose)":"var(--emerald)", opacity:0.4, borderRadius:3 }} />
                      <div style={{ position:"absolute", left:`${p2}%`, width:12, height:12, borderRadius:6, background:diff>0?"var(--rose)":"var(--emerald)", zIndex:3, transform:"translateX(-50%)", border:"1px solid var(--bg)" }} />
                    </>
                  )}
                  {!row.actualEnd && <div style={{ position:"absolute", left:`${p1}%`, top:18, fontSize:10, color:row.status==="Overdue"?"var(--rose)":"var(--text-dim)", whiteSpace:"nowrap", transform:"translateX(-50%)", fontWeight:600 }}>{row.status}</div>}
                </div>
                <div style={{ width:120, flexShrink:0, textAlign:"right", paddingLeft:12 }}>
                  {diff!==null ? (
                    <span style={{ fontSize:11, fontWeight:700, color:diff>0?"var(--rose)":"var(--emerald)" }}>{diff===0?"On-time": `${Math.abs(diff)}d ${diff>0?"late":"early"}`}</span>
                  ) : (
                    <Badge label={row.status} map={SC}/>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TeamView({ data }) {
  const teams = useMemo(() => [...new Set(data.map(d => d.team))], [data]);
  const [selected, setSelected] = useState(teams[0]);
  const teamData = useMemo(() => data.filter(d => d.team === selected), [data, selected]);
  
  const done = teamData.filter(d => ["Completed", "Closed", "UAT Completed"].includes(d.status)).length;
  const active = teamData.filter(d => ["Dev In Progress", "UAT In Progress", "Solutioning"].includes(d.status)).length;
  const overdue = teamData.filter(d => d.status === "Overdue").length;
  const rate = Math.round(done / Math.max(teamData.length, 1) * 100);

  return (
    <div className="animate-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 40, background: "linear-gradient(to bottom, rgba(59,130,246,0.05), transparent)", padding: 32, borderRadius: 24, border: "1px solid var(--card-border)" }}>
        <h1 style={s.pageTitle}>Team Insights</h1>
        <p style={{ ...s.pageSub, marginBottom: 0 }}>Squad performance and requirement ownership</p>
      </div>

      <div style={{ display: "flex", gap: 32 }}>
        {/* Team Selector Sidebar */}
        <div style={{ width: 280, flexShrink: 0 }}>
          <div style={{ ...s.card, padding: 16 }} className="glass-card">
            <div style={s.cardTitle}>Squads</div>
            {teams.map(t => (
              <div key={t} onClick={() => setSelected(t)} style={{
                padding: "14px 16px", borderRadius: 12, cursor: "pointer", marginBottom: 8,
                background: selected === t ? "rgba(59,130,246,0.1)" : "transparent",
                color: selected === t ? "var(--accent)" : "var(--text-dim)",
                fontWeight: selected === t ? 700 : 500,
                border: selected === t ? "1px solid rgba(59,130,246,0.2)" : "1px solid transparent",
                transition: "all 0.2s"
              }}>
                {t}
                <div style={{ fontSize: 11, marginTop: 4, opacity: 0.7 }}>{data.filter(d => d.team === t).length} Assigned Items</div>
              </div>
            ))}
          </div>
        </div>

        {/* Team Profile & Details */}
        <div style={{ flex: 1 }}>
          <div style={{ ...s.card, marginBottom: 32 }} className="glass-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom:32 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "white", margin: 0 }}>{selected} Squad</h2>
                <div style={{ color: "var(--accent)", fontWeight: 600, fontSize: 14, marginTop:4 }}>Effectiveness Score: {rate}%</div>
              </div>
              <div style={s.badge("Optimal", { Optimal: { bg: "rgba(16,185,129,0.1)", text: "var(--emerald)", border: "rgba(16,185,129,0.2)" } })}>Squad Healthy</div>
            </div>

            <div style={{ ...s.grid(3), marginBottom: 40 }}>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 16, border: "1px solid var(--card-border)" }}>
                <div style={{ ...s.cardTitle, marginBottom: 8 }}>Delivery Rate</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--emerald)" }}>{rate}%</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 16, border: "1px solid var(--card-border)" }}>
                <div style={{ ...s.cardTitle, marginBottom: 8 }}>Active Load</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--accent)" }}>{active}</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.02)", padding: 20, borderRadius: 16, border: "1px solid var(--card-border)" }}>
                <div style={{ ...s.cardTitle, marginBottom: 8 }}>At Risk</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: "var(--rose)" }}>{overdue}</div>
              </div>
            </div>

            <div style={s.cardTitle}>Squad Backlog Priority</div>
            <div style={{ overflowX: "auto" }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Requirement</th>
                    <th style={s.th}>Priority</th>
                    <th style={s.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {teamData.sort((a,b)=>a.priority.localeCompare(b.priority)).slice(0, 8).map(r => (
                    <tr key={r.id}>
                      <td style={s.td}>
                        <div style={{ fontWeight: 600, color: "white" }}>{r.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{r.id}</div>
                      </td>
                      <td style={s.td}><Badge label={r.priority} map={PC} /></td>
                      <td style={s.td}><Badge label={r.status} map={SC} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {teamData.length === 0 && <div style={{ padding: 40, textAlign: "center", color: "var(--text-dim)" }}>No active requirements.</div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AIInsights({ data }) {
  const [healthResult, setHealth] = useState(null), [healthLoading, setHL] = useState(false);
  const [risks, setRisks] = useState([]), [risksLoading, setRL] = useState(false);
  const [teamSummaries, setTS] = useState({}), [tsLoading, setTSL] = useState(false);
  const [predict, setPredict] = useState([]), [predictLoading, setPL] = useState(false);
  const [selectedItem, setSI] = useState(data[0]?.id), [itemRec, setIR] = useState(""), [itemLoading, setIL] = useState(false);

  const runHealth = async () => {
    setHL(true);
    try {
      const txt = await callAI("Expert analyzer. Return ONLY JSON.", `Backlog health JSON (score, grade, summary, strengths[], concerns[]): ${JSON.stringify(data)}`);
      setHealth(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch { setHealth({ healthScore: 0, grade: "?", summary: "Failed to parse AI output.", strengths: [], concerns: [] }); }
    setHL(false);
  };

  const runRisks = async () => {
    setRL(true);
    try {
      const txt = await callAI("Risk Analyst. Return JSON array.", `Identify 5 risks (id, title, level[P0|P1|P2|NA], description, mitigation): ${JSON.stringify(data)}`);
      setRisks(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch { setRisks([]); }
    setRL(false);
  };

  const runTeamSummaries = async () => {
    setTSL(true);
    const teams = [...new Set(data.map(d => d.team))];
    const res = {};
    for (const t of teams) {
      try {
        res[t] = await callAI("PM Advisor. 2 sentences.", `Summarize team ${t} performance: ${JSON.stringify(data.filter(d => d.team === t))}`);
      } catch { res[t] = "Summary unavailable."; }
    }
    setTS(res); setTSL(false);
  };

  const runPredict = async () => {
    setPL(true);
    try {
      const txt = await callAI("Forecaster. JSON array.", `Predict YYYY-MM-DD completion (id, title, predictedDate, confidence[High|Medium|Low], reasoning): ${JSON.stringify(data.slice(0, 10))}`);
      setPredict(JSON.parse(txt.replace(/```json|```/g, "").trim()));
    } catch { setPredict([]); }
    setPL(false);
  };

  const runItemRec = async () => {
    setIL(true);
    try {
      setIR(await callAI("Actionable Advisor.", `Recommendation for ${selectedItem}: ${JSON.stringify(data.find(d => d.id === selectedItem))}`));
    } catch { setIR("Failed to generate."); }
    setIL(false);
  };

  return (
    <div className="animate-in" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 40, background: "linear-gradient(to bottom, rgba(59,130,246,0.05), transparent)", padding: 32, borderRadius: 24, border: "1px solid var(--card-border)" }}>
        <h1 style={s.pageTitle}>AI Project Intelligence</h1>
        <p style={{ ...s.pageSub, marginBottom: 0 }}>Neural analysis of backlog health, risks, and forecasting</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 32, marginBottom: 32 }}>
        {/* Health Panel */}
        <div style={s.aiCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={s.cardTitle}>Global Health Score</div>
            <button className="btn-primary" style={{ padding: "6px 16px", fontSize:12 }} onClick={runHealth} disabled={healthLoading}>{healthLoading ? "Analyzing..." : "Refresh"}</button>
          </div>
          {healthResult ? (
            <div style={{ display: "flex", gap: 32, alignItems: "center" }}>
               <div style={{ position:"relative", width:120, height:120, borderRadius:60, background:"rgba(255,255,255,0.02)", border:"8px solid rgba(59,130,246,0.1)", display:"flex", alignItems:"center", justifyContent:"center" }}>
                  <div style={{ fontSize:32, fontWeight:900, color:"var(--accent)" }}>{healthResult.healthScore}</div>
                  <div style={{ position:"absolute", bottom:-10, background:"var(--accent)", color:"white", padding:"2px 10px", borderRadius:10, fontSize:10, fontWeight:800 }}>GRADE {healthResult.grade}</div>
               </div>
               <div style={{ flex:1 }}>
                  <p style={{ fontSize:14, color:"var(--text-dim)", lineHeight:1.6, marginBottom:16 }}>{healthResult.summary}</p>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                    <div style={{ background:"rgba(16,185,129,0.05)", padding:12, borderRadius:12, border:"1px solid rgba(16,185,129,0.1)" }}>
                      <div style={{ fontSize:10, fontWeight:800, color:"var(--emerald)", marginBottom:4 }}>STRENGTHS</div>
                      {healthResult.strengths?.map(st=><div key={st} style={{ fontSize:11, color:"var(--text-main)" }}>• {st}</div>)}
                    </div>
                    <div style={{ background:"rgba(244, 63, 94, 0.05)", padding:12, borderRadius:12, border:"1px solid rgba(244, 63, 94, 0.1)" }}>
                      <div style={{ fontSize:10, fontWeight:800, color:"#fb7185", marginBottom:4 }}>CONCERNS</div>
                      {healthResult.concerns?.map(cn=><div key={cn} style={{ fontSize:11, color:"var(--text-main)" }}>• {cn}</div>)}
                    </div>
                  </div>
               </div>
            </div>
          ) : <div style={{ height:120, display:"flex", alignItems:"center", justifyContent:"center", color:"var(--text-dim)", fontSize:13 }}>Run analysis to see project health.</div>}
        </div>

        {/* Risk Scanner */}
        <div style={s.aiCard}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <div style={s.cardTitle}>Neural Risk Scanner</div>
            <button className="btn-secondary" style={{ fontSize:12 }} onClick={runRisks} disabled={risksLoading}>Scan</button>
          </div>
          <div style={{ maxHeight: 300, overflowY: "auto", display:"flex", flexDirection:"column", gap:12 }}>
            {risks.map(r => (
              <div key={r.id} style={s.risk(r.level)}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, color: "white", fontSize:13 }}>{r.title}</span>
                  <Badge label={r.level} map={PC} />
                </div>
                <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>{r.description}</div>
                <div style={{ fontSize: 11, color: "var(--accent)", fontWeight: 600 }}>Action: {r.mitigation}</div>
              </div>
            ))}
            {!risks.length && <div style={{ textAlign:"center", color:"var(--text-dim)", padding:40, fontSize:13 }}>Scan backlog for automated risk detection.</div>}
          </div>
        </div>
      </div>

      <div style={{ ...s.grid(2), marginBottom: 32 }}>
        {/* Forecasts */}
        <div style={s.aiCard}>
          <div style={s.cardTitle}>Intelligent Forecasting</div>
          <div style={{ display: "flex", flexDirection: "column", gap:12, marginTop:16 }}>
            {predict.slice(0,5).map(p => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background:"rgba(255,255,255,0.02)", padding:"12px 16px", borderRadius:12, border:"1px solid var(--card-border)" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize:13 }}>{p.title}</div>
                  <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{p.reasoning}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, color: "var(--accent)" }}>{p.predictedDate}</div>
                  <div style={{ fontSize: 10, opacity:0.7 }}>{p.confidence} Conf.</div>
                </div>
              </div>
            ))}
            {!predict.length && <button className="btn-primary" onClick={runPredict} disabled={predictLoading}>Generate Forecasts</button>}
          </div>
        </div>

        {/* Squad Performance Summaries */}
        <div style={s.aiCard}>
          <div style={s.cardTitle}>Squad Performance Summaries</div>
          <div style={{ display: "flex", flexDirection: "column", gap:12, marginTop:16 }}>
             {Object.entries(teamSummaries).map(([team, summary]) => (
               <div key={team} style={{ background:"rgba(255,255,255,0.02)", padding:16, borderRadius:12, border:"1px solid var(--card-border)" }}>
                 <div style={{ fontWeight: 800, color: "var(--accent)", fontSize:12, marginBottom:4, textTransform:"uppercase" }}>{team}</div>
                 <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight:1.5 }}>{summary}</div>
               </div>
             ))}
             {!Object.keys(teamSummaries).length && <button className="btn-secondary" onClick={runTeamSummaries} disabled={tsLoading}>Generate Squad Reports</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AddDialog({ data, setData, close }) {
  const [form, setForm] = useState({ id:"", title:"", function:"", team:"", priority:"P1", status:"Pipeline", plannedEnd:"" });

  const save = () => {
    if(!form.id || !form.title) return alert("ID and Title are required");
    setData([form, ...data]);
    close();
  };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(8px)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding: 20 }}>
      <div style={{ width:500, padding:32, border:"1px solid var(--card-border)" }} className="glass-card animate-in">
        <h2 style={{ fontSize:24, fontWeight:800, color:"white", margin:"0 0 8px" }}>New Requirement</h2>
        <p style={{ color:"var(--text-dim)", fontSize:14, marginBottom:32 }}>Initialize a new task in the project lifecycle.</p>
        
        <div style={{ display:"grid", gap:20 }}>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16 }}>
             <div>
               <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>ID</label>
               <input value={form.id} onChange={e=>setForm({...form, id:e.target.value})} placeholder="REQ-001" style={{ ...s.input, width:"100%" }}/>
             </div>
             <div>
               <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>TITLE</label>
               <input value={form.title} onChange={e=>setForm({...form, title:e.target.value})} placeholder="Task Description" style={{ ...s.input, width:"100%" }}/>
             </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
             <div>
               <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>BUSINESS FUNCTION</label>
               <input value={form.function} onChange={e=>setForm({...form, function:e.target.value})} placeholder="e.g. Sales" style={{ ...s.input, width:"100%" }}/>
             </div>
             <div>
               <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>ASSIGNED TEAM</label>
               <input value={form.team} onChange={e=>setForm({...form, team:e.target.value})} placeholder="e.g. Alpha" style={{ ...s.input, width:"100%" }}/>
             </div>
          </div>

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
             <div>
               <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>PRIORITY</label>
               <select value={form.priority} onChange={e=>setForm({...form, priority:e.target.value})} style={{ ...s.select, width:"100%" }}>
                 {["P0","P1","P2","NA"].map(p=><option key={p}>{p}</option>)}
               </select>
             </div>
             <div>
               <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>STATUS</label>
               <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} style={{ ...s.select, width:"100%" }}>
                 {Object.keys(SC).map(st=><option key={st}>{st}</option>)}
               </select>
             </div>
          </div>

          <div>
            <label style={{ fontSize:10, fontWeight:800, color:"var(--text-dim)", display:"block", marginBottom:8, textTransform:"uppercase" }}>TARGET DELIVERY DATE</label>
            <input type="date" value={form.plannedEnd} onChange={e=>setForm({...form, plannedEnd:e.target.value})} style={{ ...s.input, width:"100%" }}/>
          </div>
        </div>

        <div style={{ display:"flex", gap:12, marginTop:40 }}>
          <button className="btn-primary" style={{ flex:2 }} onClick={save}>Create Requirement</button>
          <button className="btn-secondary" style={{ flex:1 }} onClick={close}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── App Shell ───────────────────────────────────────────────────────────────

export default function App() {
  const [p,setP]=useState("overview");
  const [data,setData]=useState(SAMPLE);

  const overdueCount=data.filter(d=>d.status==="Overdue").length;

  return (
    <div style={s.app}>
      {/* Sidebar */}
      <div style={s.sidebar}>
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:40, padding:"0 8px" }}>
          <div style={{ width:32, height:32, background:"linear-gradient(135deg, var(--accent), #8b5cf6)", borderRadius:10, display:"flex", alignItems:"center", justifyContent:"center", boxShadow:"0 4px 12px rgba(59, 130, 246, 0.4)" }}>
            <span style={{ fontWeight:900, fontSize:18, color:"white" }}>B</span>
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:800, color:"white", letterSpacing:"-0.5px" }}>Backlog Hub</div>
            <div style={{ fontSize:10, color:"var(--text-dim)", fontWeight:600, textTransform:"uppercase", letterSpacing:1 }}>Enterprise Ops</div>
          </div>
        </div>
        
        <div style={{ flex:1 }}>
          {[
            { id:"overview", lbl:"Overview", icon:"📊" },
            { id:"backlog", lbl:"Backlog Table", icon:"📋" },
            { id:"timeline", lbl:"Timeline / Gantt", icon:"📅" },
            { id:"analytics", lbl:"Advanced Analytics", icon:"📉" },
            { id:"teams", lbl:"Team Insights", icon:"👥" },
            { id:"ai", lbl:"AI Assistant", icon:"✦" },
          ].map(i=>(
            <div key={i.id} style={s.navItem(p===i.id)} onClick={()=>setP(i.id)}>
              <span style={{ fontSize:18 }}>{i.icon}</span>
              {i.lbl}
              {p===i.id && <div style={{ marginLeft:"auto", width:6, height:6, borderRadius:3, background:"var(--accent)", boxShadow:"0 0 10px var(--accent)" }} />}
            </div>
          ))}
        </div>

        <div style={{ padding:"12px 0", borderTop:"1px solid var(--card-border)" }}>
          {overdueCount > 0 && (
            <div style={{ background:"rgba(244, 63, 94, 0.1)", border:"1px solid rgba(244, 63, 94, 0.2)", borderRadius:10, padding:"10px 14px", fontSize:12, color:"#fb7185", marginBottom:12 }}>
              <div style={{ fontWeight:700, marginBottom:2 }}>⚠ Attention Required</div>
              {overdueCount} items are currently overdue.
            </div>
          )}
          <div style={{ fontSize:11, color:"var(--text-dim)", display:"flex", alignItems:"center", gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:3, background:"#10b981" }}></div>
            API Connected
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={s.main}>
        <div className="animate-in" key={p}>
          {p==="overview"  && <Overview  data={data}/>}
          {p==="backlog"   && <BacklogTable data={data} setData={setData}/>}
          {p==="analytics" && <Analytics data={data}/>}
          {p==="timeline"  && <Timeline  data={data}/>}
          {p==="teams"     && <TeamView  data={data}/>}
          {p==="ai"        && <AIInsights data={data}/>}
        </div>
      </main>
    </div>
  );
}
