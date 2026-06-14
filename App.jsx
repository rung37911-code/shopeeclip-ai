import { useState, useEffect, useRef } from "react";

const SHOPEE_RED = "#EE4D2D";
const SHOPEE_ORANGE = "#F5A623";
const BG_DARK = "#0A0A14";
const BG_CARD = "#13132A";
const TEXT_MAIN = "#F0F0F0";
const TEXT_MUTED = "#8A8AAA";
const GREEN = "#27AE60";
const ADMIN_PASSWORD = "admin1234";
const DEMO_KEY = "SCL-MO-DEMO0001";

import { supabase, isSupabaseConfigured } from "./supabase.js";

// ── License Key storage ──
// ใช้ตาราง Supabase ชื่อ "license_keys" (รองรับคนใช้พร้อมกันจำนวนมาก)
// ถ้ายังไม่ตั้งค่า Supabase จะ fallback ไปใช้ localStorage (เครื่องใครเครื่องมัน)

const KEY_STORE = {}; // in-memory cache สำหรับ session นี้

function codeFromStorageKey(k) { return k.replace("key:", ""); }

async function kGet(k) {
  if (KEY_STORE[k]) return KEY_STORE[k];
  const code = codeFromStorageKey(k);
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("license_keys").select("*").eq("code", code).maybeSingle();
      if (!error && data) {
        const v = supaRowToKeyData(data);
        KEY_STORE[k] = v;
        return v;
      }
    } catch {}
  }
  try {
    const raw = localStorage.getItem(k);
    if (raw) { const v = JSON.parse(raw); KEY_STORE[k] = v; return v; }
  } catch {}
  return null;
}

async function kSet(k, v) {
  KEY_STORE[k] = v;
  const code = codeFromStorageKey(k);
  if (isSupabaseConfigured) {
    try {
      await supabase.from("license_keys").upsert(keyDataToSupaRow(code, v));
    } catch {}
  }
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

async function kDel(k) {
  delete KEY_STORE[k];
  const code = codeFromStorageKey(k);
  if (isSupabaseConfigured) {
    try { await supabase.from("license_keys").delete().eq("code", code); } catch {}
  }
  try { localStorage.removeItem(k); } catch {}
}

async function kList() {
  const mem = new Set(Object.keys(KEY_STORE).filter(k => k.startsWith("key:")));
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("license_keys").select("code");
      if (!error && data) data.forEach(row => mem.add(`key:${row.code}`));
    } catch {}
  }
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("key:")) mem.add(k);
    }
  } catch {}
  return [...mem];
}

// แปลงระหว่างรูปแบบ JS object <-> แถวตาราง Supabase
function supaRowToKeyData(row) {
  return {
    code: row.code, type: row.type, buyerName: row.buyer_name, note: row.note,
    active: row.active, createdAt: row.created_at, expiresAt: row.expires_at,
    loginCount: row.login_count, lastLogin: row.last_login,
  };
}
function keyDataToSupaRow(code, v) {
  return {
    code, type: v.type, buyer_name: v.buyerName, note: v.note,
    active: v.active, created_at: v.createdAt, expires_at: v.expiresAt,
    login_count: v.loginCount || 0, last_login: v.lastLogin,
  };
}

function isExpired(kd) { return kd?.expiresAt ? new Date() > new Date(kd.expiresAt) : false; }
function fmtDate(iso) {
  if (!iso) return "ตลอดชีพ";
  return new Date(iso).toLocaleDateString("th-TH", { year: "numeric", month: "short", day: "numeric" });
}
function daysLeft(iso) {
  if (!iso) return null;
  return Math.max(0, Math.ceil((new Date(iso) - new Date()) / 86400000));
}
function genKey(type) {
  const p = type === "yearly" ? "YR" : type === "lifetime" ? "LF" : "MO";
  return `SCL-${p}-${Math.random().toString(36).substring(2,10).toUpperCase()}`;
}
function getExpiry(type) {
  if (type === "lifetime") return null;
  const d = new Date();
  type === "yearly" ? d.setFullYear(d.getFullYear()+1) : d.setMonth(d.getMonth()+1);
  return d.toISOString();
}

const TEMPLATES = [
  { id:"hype", name:"🔥 ไฟแรง", fn:(p,pr,d)=>`🔥🛒 ปักตะกร้าด่วน!!\n\n✨ ${p}\n💰 ราคา ${pr} บาท\n${d?`🎯 ลด ${d}%\n`:""}⚡ สต็อกมีจำกัด!\n📲 กดลิงก์ในโปรไฟล์\n\n#Shopee #ปักตะกร้า #ลดราคา` },
  { id:"review", name:"⭐ รีวิว", fn:(p,pr,d)=>`⭐ รีวิวจริง ไม่ปิด!\n\n📦 ${p}\n💵 ${pr} บาท\n${d?`💸 ประหยัด ${d}%\n`:""}✅ ของดี ราคาคุ้ม!\n\n#รีวิว #Shopee #ของดีราคาถูก` },
  { id:"flash", name:"⚡ Flash Sale", fn:(p,pr,d)=>`⚡ FLASH SALE แค่วันนี้!!\n\n🎁 ${p}\n🏷️ ${pr} บาท!\n${d?`🔴 ลด ${d}%\n`:""}⏰ ราคานี้มีเวลาจำกัด!\n\n#FlashSale #Shopee #Deal` },
  { id:"tiktok", name:"🎵 TikTok", fn:(p,pr,d)=>`POV: เจอของดีราคาโคตรถูก 😱\n\n${p} แค่ ${pr} บาท!!${d?` (ลด ${d}%)`:""}\n\nแบกตะกร้าก่อน!\n\n#fy #fyp #Shopee #ปักตะกร้า` },
];
const HOOKS = ["หยุดเลื่อนก่อน! นี่คือสิ่งที่คุณต้องการ","ราคานี้ต้องบอกต่อ!!","เพื่อนบอกมา ลองแล้วติดใจ","ปักตะกร้าไว้ก่อน ตัดสินใจทีหลัง","ลดแล้ว! อย่าพลาด!"];

// ─── ROOT ───────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("login");
  const [sess, setSess] = useState(null);

  useEffect(() => {
    // seed demo key once (เฉพาะตอนยังไม่มี)
    (async () => {
      const existing = await kGet(`key:${DEMO_KEY}`);
      if (!existing) {
        await kSet(`key:${DEMO_KEY}`, {
          code: DEMO_KEY, type: "monthly", buyerName: "Demo User",
          note: "Key ทดสอบระบบ", active: true,
          createdAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
          loginCount: 0, lastLogin: null,
        });
      }
    })();
  }, []);

  const login = (key, info, isAdmin) => {
    setSess({ key, info, isAdmin });
    setScreen(isAdmin ? "admin" : "app");
  };
  const logout = () => { setSess(null); setScreen("login"); };

  if (screen === "admin") return <AdminPanel onLogout={logout} />;
  if (screen === "app") return <MainApp sess={sess} onLogout={logout} />;
  return <LoginScreen onSuccess={login} />;
}

// ─── LOGIN ───────────────────────────────────────────────────
function LoginScreen({ onSuccess }) {
  const [mode, setMode] = useState("user");
  const [keyVal, setKeyVal] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const doUserLogin = async () => {
    const k = keyVal.trim().toUpperCase();
    if (!k) { setErr("กรุณากรอก License Key"); return; }
    setLoading(true); setErr("");
    const kd = await kGet(`key:${k}`);
    if (!kd) { setErr("❌ ไม่พบ Key นี้ในระบบ"); setLoading(false); return; }
    if (!kd.active) { setErr("❌ Key ถูกระงับการใช้งาน"); setLoading(false); return; }
    if (isExpired(kd)) { setErr(`❌ Key หมดอายุ ${fmtDate(kd.expiresAt)}`); setLoading(false); return; }
    kd.lastLogin = new Date().toISOString();
    kd.loginCount = (kd.loginCount||0)+1;
    await kSet(`key:${k}`, kd);
    setLoading(false);
    onSuccess(k, kd, false);
  };
  const doAdminLogin = () => {
    if (pass !== ADMIN_PASSWORD) { setErr("❌ รหัสผ่านไม่ถูกต้อง"); return; }
    onSuccess("ADMIN", { name:"Admin", type:"admin" }, true);
  };

  const S = LS;
  return (
    <div style={S.bg}>
      <div style={S.box}>
        <div style={S.logoWrap}>
          <div style={{fontSize:"40px"}}>🛒</div>
          <div style={S.logoText}>Shopee<span style={{color:SHOPEE_ORANGE}}>Clip</span>AI</div>
          <div style={S.logoSub}>ระบบสร้างคลิปปักตะกร้า + แคปชั่น อัตโนมัติ</div>
        </div>
        <div style={S.tabRow}>
          <button style={S.tab(mode==="user")} onClick={()=>{setMode("user");setErr("");}}>🔑 เข้าใช้งาน</button>
          <button style={S.tab(mode==="admin")} onClick={()=>{setMode("admin");setErr("");}}>⚙️ Admin</button>
        </div>
        {mode==="user" ? (
          <>
            <label style={S.label}>License Key</label>
            <input style={S.input} placeholder="SCL-MO-XXXXXXXX" value={keyVal}
              onChange={e=>setKeyVal(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doUserLogin()} />
            <div style={S.hint}>* Key ได้รับจากผู้ขาย</div>
            <div style={{fontSize:"12px",color:SHOPEE_ORANGE,marginBottom:"12px",cursor:"pointer"}}
              onClick={()=>setKeyVal(DEMO_KEY)}>
              🧪 กดเพื่อใส่ Demo Key ทดสอบ
            </div>
            {err && <div style={S.err}>{err}</div>}
            <button style={S.btn} onClick={doUserLogin} disabled={loading}>
              {loading ? "⏳ กำลังตรวจสอบ..." : "เข้าใช้งาน →"}
            </button>
          </>
        ) : (
          <>
            <label style={S.label}>รหัสผ่าน Admin</label>
            <input style={S.input} type="password" placeholder="••••••••" value={pass}
              onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doAdminLogin()} />
            {err && <div style={S.err}>{err}</div>}
            <button style={S.btn} onClick={doAdminLogin}>เข้า Admin Panel →</button>
          </>
        )}
        <div style={{textAlign:"center",marginTop:"16px",fontSize:"11px",color:"rgba(255,255,255,0.25)"}}>
          ShopeeClipAI v2.0 • Powered by Claude AI
        </div>
      </div>
    </div>
  );
}
const LS = {
  bg:{minHeight:"100vh",background:BG_DARK,display:"flex",alignItems:"center",justifyContent:"center",padding:"20px",fontFamily:"'Segoe UI','Noto Sans Thai',sans-serif"},
  box:{background:BG_CARD,borderRadius:"20px",padding:"32px 28px",width:"100%",maxWidth:"380px",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"},
  logoWrap:{textAlign:"center",marginBottom:"28px"},
  logoText:{fontSize:"26px",fontWeight:"900",color:TEXT_MAIN,letterSpacing:"-0.5px"},
  logoSub:{fontSize:"12px",color:TEXT_MUTED,marginTop:"4px"},
  tabRow:{display:"flex",gap:"8px",marginBottom:"20px"},
  tab:(a)=>({flex:1,padding:"9px",borderRadius:"10px",border:"none",fontSize:"13px",fontWeight:a?"700":"400",cursor:"pointer",background:a?SHOPEE_RED:"rgba(255,255,255,0.06)",color:a?"#fff":TEXT_MUTED}),
  label:{display:"block",fontSize:"12px",color:TEXT_MUTED,marginBottom:"6px"},
  input:{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.12)",borderRadius:"10px",padding:"11px 14px",color:TEXT_MAIN,fontSize:"14px",outline:"none",boxSizing:"border-box",marginBottom:"6px",letterSpacing:"1px"},
  hint:{fontSize:"11px",color:TEXT_MUTED,marginBottom:"4px"},
  err:{background:"rgba(238,77,45,0.15)",border:"1px solid rgba(238,77,45,0.3)",borderRadius:"8px",padding:"8px 12px",fontSize:"13px",color:"#FF6B6B",marginBottom:"12px"},
  btn:{width:"100%",background:`linear-gradient(135deg,${SHOPEE_RED},#C0392B)`,color:"#fff",border:"none",borderRadius:"10px",padding:"13px",fontSize:"15px",fontWeight:"700",cursor:"pointer",marginTop:"4px"},
};

// ─── ADMIN ───────────────────────────────────────────────────
function AdminPanel({ onLogout }) {
  const [tab, setTab] = useState("create");
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newType, setNewType] = useState("monthly");
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [created, setCreated] = useState("");
  const [search, setSearch] = useState("");
  const [stats, setStats] = useState({total:0,active:0,expired:0,monthly:0,yearly:0,lifetime:0});
  const [copied, setCopied] = useState(false);

  const loadKeys = async () => {
    setLoading(true);
    const names = await kList();
    const list = [];
    for (const n of names) {
      const d = await kGet(n);
      if (d) list.push({ storageKey:n, keyCode:n.replace("key:",""), ...d });
    }
    list.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
    setKeys(list);
    const st={total:list.length,active:0,expired:0,monthly:0,yearly:0,lifetime:0};
    list.forEach(k=>{
      (isExpired(k)||!k.active)?st.expired++:st.active++;
      st[k.type]=(st[k.type]||0)+1;
    });
    setStats(st);
    setLoading(false);
  };

  useEffect(()=>{ if(tab==="keys") loadKeys(); },[tab]);

  const createKey = async () => {
    const code = genKey(newType);
    const kd = { code, type:newType, buyerName:newName||"ไม่ระบุ", note:newNote, active:true,
      createdAt:new Date().toISOString(), expiresAt:getExpiry(newType), loginCount:0, lastLogin:null };
    await kSet(`key:${code}`, kd);
    setCreated(code); setNewName(""); setNewNote("");
  };

  const toggleKey = async (code, cur) => {
    const d = await kGet(`key:${code}`);
    if (d) { d.active=!cur; await kSet(`key:${code}`,d); loadKeys(); }
  };
  const deleteKey = async (code) => {
    if (!confirm(`ลบ Key ${code}?`)) return;
    await kDel(`key:${code}`); loadKeys();
  };
  const copyKey = (text) => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  const filtered = keys.filter(k=>
    k.keyCode.includes(search.toUpperCase())||k.buyerName?.includes(search)||k.note?.includes(search)
  );

  const A = AS;
  return (
    <div style={A.wrap}>
      <div style={A.hdr}>
        <div>
          <div style={A.hdrT}>⚙️ Admin Panel</div>
          <div style={A.hdrS}>ShopeeClipAI — จัดการ License Keys</div>
        </div>
        <button style={A.logoutBtn} onClick={onLogout}>ออกจากระบบ</button>
      </div>
      <div style={A.statsRow}>
        {[["🔑 ทั้งหมด",stats.total,"#667eea"],["✅ ใช้งานได้",stats.active,GREEN],["❌ หมดอายุ",stats.expired,"#e74c3c"],
          ["📅 รายเดือน",stats.monthly,SHOPEE_ORANGE],["📆 รายปี",stats.yearly,"#9B59B6"],["♾️ ตลอดชีพ",stats.lifetime,"#1ABC9C"]
        ].map(([l,v,c])=>(
          <div key={l} style={A.statBox}>
            <div style={{fontSize:"20px",fontWeight:"800",color:c}}>{v}</div>
            <div style={{fontSize:"11px",color:TEXT_MUTED}}>{l}</div>
          </div>
        ))}
      </div>
      <div style={A.tabRow}>
        {[["create","➕ สร้าง Key"],["keys","🗃️ Keys ทั้งหมด"]].map(([id,lb])=>(
          <button key={id} style={A.tab(tab===id)} onClick={()=>setTab(id)}>{lb}</button>
        ))}
      </div>
      <div style={A.body}>
        {tab==="create" && (
          <div style={A.card}>
            <div style={A.cardT}>➕ สร้าง License Key ใหม่</div>
            <label style={A.label}>ชื่อผู้ซื้อ / ร้านค้า</label>
            <input style={A.input} placeholder="เช่น ร้านสมชาย, Line: @shop" value={newName} onChange={e=>setNewName(e.target.value)} />
            <label style={A.label}>ประเภท Key</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"8px",marginBottom:"12px"}}>
              {[["monthly","📅 รายเดือน","30 วัน"],["yearly","📆 รายปี","365 วัน"],["lifetime","♾️ ตลอดชีพ","ไม่หมดอายุ"]].map(([v,l,s])=>(
                <div key={v} style={A.typeBox(newType===v)} onClick={()=>setNewType(v)}>
                  <div style={{fontSize:"13px",fontWeight:"700"}}>{l}</div>
                  <div style={{fontSize:"11px",color:TEXT_MUTED}}>{s}</div>
                </div>
              ))}
            </div>
            <label style={A.label}>หมายเหตุ</label>
            <input style={A.input} placeholder="เช่น ชำระ 299 บาท" value={newNote} onChange={e=>setNewNote(e.target.value)} />
            <button style={A.btnP} onClick={createKey}>🔑 สร้าง Key ใหม่</button>
            {created && (
              <div style={{marginTop:"14px",background:"rgba(39,174,96,0.1)",border:"1px solid rgba(39,174,96,0.3)",borderRadius:"12px",padding:"14px"}}>
                <div style={{fontSize:"13px",color:TEXT_MUTED,marginBottom:"6px"}}>✅ สร้างสำเร็จ! ส่งให้ลูกค้าได้เลย</div>
                <div style={{fontFamily:"monospace",fontSize:"18px",fontWeight:"800",color:GREEN,letterSpacing:"2px",textAlign:"center",padding:"10px",background:"rgba(0,0,0,0.3)",borderRadius:"8px",marginBottom:"8px"}}>{created}</div>
                <button style={{width:"100%",background:GREEN,color:"#fff",border:"none",borderRadius:"8px",padding:"9px",fontSize:"13px",fontWeight:"700",cursor:"pointer"}}
                  onClick={()=>copyKey(created)}>{copied?"✓ คัดลอกแล้ว":"📋 คัดลอก Key"}</button>
              </div>
            )}
          </div>
        )}
        {tab==="keys" && (
          <>
            <input style={{...A.input,marginBottom:"10px"}} placeholder="🔍 ค้นหา Key / ชื่อผู้ซื้อ..." value={search} onChange={e=>setSearch(e.target.value)} />
            {loading ? <div style={{textAlign:"center",color:TEXT_MUTED,padding:"30px"}}>⏳ กำลังโหลด...</div>
            : filtered.length===0 ? <div style={{textAlign:"center",color:TEXT_MUTED,padding:"30px"}}>{keys.length===0?"ยังไม่มี Key — ไปสร้าง Key ก่อนนะครับ":"ไม่พบ Key ที่ค้นหา"}</div>
            : filtered.map(k=>{
              const exp=isExpired(k); const dl=daysLeft(k.expiresAt);
              return (
                <div key={k.keyCode} style={{background:k.active&&!exp?BG_CARD:"rgba(20,10,10,0.6)",borderRadius:"12px",padding:"14px",marginBottom:"10px",border:k.active&&!exp?"1px solid rgba(255,255,255,0.08)":"1px solid rgba(238,77,45,0.2)",opacity:k.active&&!exp?1:0.7}}>
                  <div style={{display:"flex",alignItems:"center",gap:"8px",marginBottom:"6px"}}>
                    <span style={{fontFamily:"monospace",fontSize:"14px",fontWeight:"800",color:TEXT_MAIN,letterSpacing:"1px"}}>{k.keyCode}</span>
                    <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:"20px",background:k.type==="monthly"?`${SHOPEE_ORANGE}20`:k.type==="yearly"?"#9B59B620":"#1ABC9C20",color:k.type==="monthly"?SHOPEE_ORANGE:k.type==="yearly"?"#9B59B6":"#1ABC9C",border:`1px solid ${k.type==="monthly"?SHOPEE_ORANGE:k.type==="yearly"?"#9B59B6":"#1ABC9C"}40`}}>
                      {k.type==="monthly"?"รายเดือน":k.type==="yearly"?"รายปี":"ตลอดชีพ"}
                    </span>
                  </div>
                  <div style={{fontSize:"12px",color:TEXT_MUTED,marginBottom:"3px"}}>👤 {k.buyerName}</div>
                  {k.note&&<div style={{fontSize:"12px",color:TEXT_MUTED,marginBottom:"3px"}}>📝 {k.note}</div>}
                  <div style={{fontSize:"12px",color:TEXT_MUTED,marginBottom:"3px"}}>
                    ⏰ หมดอายุ: {exp?<span style={{color:"#e74c3c"}}>หมดแล้ว</span>:<span style={{color:dl!==null&&dl<=7?SHOPEE_ORANGE:GREEN}}>{fmtDate(k.expiresAt)}{dl!==null?` (เหลือ ${dl} วัน)`:""}</span>}
                  </div>
                  <div style={{fontSize:"12px",color:TEXT_MUTED,marginBottom:"8px"}}>🔐 Login: {k.loginCount||0} ครั้ง</div>
                  <div style={{display:"flex",gap:"8px"}}>
                    <button style={{flex:1,padding:"7px",borderRadius:"8px",border:"none",fontSize:"12px",fontWeight:"700",cursor:"pointer",background:k.active?"rgba(230,126,34,0.2)":"rgba(39,174,96,0.2)",color:k.active?SHOPEE_ORANGE:GREEN}} onClick={()=>toggleKey(k.keyCode,k.active)}>{k.active?"🔒 ระงับ":"✅ เปิดใช้"}</button>
                    <button style={{flex:1,padding:"7px",borderRadius:"8px",border:"none",fontSize:"12px",fontWeight:"700",cursor:"pointer",background:"rgba(231,76,60,0.2)",color:"#e74c3c"}} onClick={()=>deleteKey(k.keyCode)}>🗑️ ลบ</button>
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
const AS = {
  wrap:{minHeight:"100vh",background:BG_DARK,color:TEXT_MAIN,fontFamily:"'Segoe UI','Noto Sans Thai',sans-serif"},
  hdr:{background:"linear-gradient(135deg,#1a1a3e,#0D1B2A)",padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px solid rgba(255,255,255,0.07)"},
  hdrT:{fontSize:"18px",fontWeight:"800"},
  hdrS:{fontSize:"12px",color:TEXT_MUTED},
  logoutBtn:{background:"rgba(255,255,255,0.08)",border:"none",color:TEXT_MUTED,borderRadius:"8px",padding:"6px 14px",fontSize:"13px",cursor:"pointer"},
  statsRow:{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"8px",padding:"14px 16px"},
  statBox:{background:BG_CARD,borderRadius:"12px",padding:"12px",textAlign:"center",border:"1px solid rgba(255,255,255,0.06)"},
  tabRow:{display:"flex",gap:"8px",padding:"0 16px 12px"},
  tab:(a)=>({flex:1,padding:"9px",borderRadius:"10px",border:"none",fontSize:"13px",fontWeight:a?"700":"400",cursor:"pointer",background:a?SHOPEE_RED:"rgba(255,255,255,0.06)",color:a?"#fff":TEXT_MUTED}),
  body:{padding:"0 16px 24px"},
  card:{background:BG_CARD,borderRadius:"16px",padding:"18px",border:"1px solid rgba(255,255,255,0.07)"},
  cardT:{fontSize:"14px",fontWeight:"700",color:SHOPEE_ORANGE,marginBottom:"14px"},
  label:{display:"block",fontSize:"12px",color:TEXT_MUTED,marginBottom:"5px"},
  input:{width:"100%",background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",padding:"10px 14px",color:TEXT_MAIN,fontSize:"14px",outline:"none",boxSizing:"border-box",marginBottom:"12px"},
  typeBox:(a)=>({background:a?"rgba(238,77,45,0.15)":"rgba(255,255,255,0.04)",border:a?`2px solid ${SHOPEE_RED}`:"1px solid rgba(255,255,255,0.08)",borderRadius:"10px",padding:"10px 8px",textAlign:"center",cursor:"pointer",color:TEXT_MAIN}),
  btnP:{width:"100%",background:`linear-gradient(135deg,${SHOPEE_RED},#C0392B)`,color:"#fff",border:"none",borderRadius:"10px",padding:"12px",fontSize:"14px",fontWeight:"700",cursor:"pointer",marginTop:"4px"},
};

// ─── MAIN APP ────────────────────────────────────────────────
function MainApp({ sess, onLogout }) {
  const { key: licKey, info: keyInfo } = sess;
  const [page, setPage] = useState("content"); // content | video | queue
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");
  const [disc, setDisc] = useState("");
  const [link, setLink] = useState("");
  const [tmpl, setTmpl] = useState("hype");
  const [hook, setHook] = useState("");
  const [captionTmpl, setCaptionTmpl] = useState("");
  const [captionAi, setCaptionAi] = useState("");
  const [script, setScript] = useState("");
  const [activeTab, setActiveTab] = useState("template");
  const [aiLoading, setAiLoading] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);
  const [copied, setCopied] = useState("");
  const expired = isExpired(keyInfo||{});
  const dl = daysLeft(keyInfo?.expiresAt);

  const genTemplate = () => {
    const t = TEMPLATES.find(x=>x.id===tmpl);
    if (!t||!product||!price) return;
    const h = hook||HOOKS[Math.floor(Math.random()*HOOKS.length)];
    setCaptionTmpl(`${h}\n\n${t.fn(product,price,disc)}`);
  };

  const callAI = async (prompt, setFn, setLoad) => {
    setLoad(true);
    try {
      const apiKey = localStorage.getItem("anthropic_api_key") || "";
      if (!apiKey) {
        setFn("⚠️ ยังไม่ได้ตั้งค่า Anthropic API Key — กดปุ่ม '⚙️ ตั้งค่า AI' ด้านบนเพื่อกรอก API Key ก่อนใช้งานฟีเจอร์ AI");
        setLoad(false);
        return;
      }
      const r = await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body:JSON.stringify({model:"claude-sonnet-4-6",max_tokens:1000,messages:[{role:"user",content:prompt}]})
      });
      const d = await r.json();
      if (d.error) { setFn(`⚠️ เกิดข้อผิดพลาด: ${d.error.message || "ไม่สามารถเรียก AI ได้"}`); setLoad(false); return; }
      setFn(d.content?.map(c=>c.text||"").join("")||"เกิดข้อผิดพลาด ลองใหม่");
    } catch { setFn("เกิดข้อผิดพลาด ลองใหม่"); }
    setLoad(false);
  };

  const genAI = () => callAI(
    `คุณเป็น Social Media Copywriter เชี่ยวชาญขายของ Shopee\nสร้างแคปชั่นปักตะกร้าสำหรับ:\n- สินค้า: ${product}\n- ราคา: ${price} บาท\n${disc?`- ลด: ${disc}%\n`:""}${link?`- ลิงก์: ${link}\n`:""}\nให้: Hook ดึงดูด, ภาษาไทย trendy, Emoji พอดี, CTA ชัด, Hashtag 5-8 อัน\nตอบด้วยแคปชั่นเท่านั้น`,
    setCaptionAi, setAiLoading
  );
  const genScript = () => callAI(
    `สร้างสคริปต์คลิปสั้น TikTok/Reels ปักตะกร้า Shopee:\n- สินค้า: ${product}\n- ราคา: ${price} บาท\n${disc?`- ลด: ${disc}%\n`:""}\nรูปแบบ:\n[0-3 วิ] HOOK: ...\n[3-10 วิ] นำเสนอสินค้า: ...\n[10-20 วิ] จุดเด่น: ...\n[20-30 วิ] ราคา+CTA: ...\n[Caption]: ...\nภาษาไทย TikTok style`,
    setScript, setScriptLoading
  );

  const copy = (text,id) => { navigator.clipboard.writeText(text); setCopied(id); setTimeout(()=>setCopied(""),2000); };

  const [showAiSettings, setShowAiSettings] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState(() => localStorage.getItem("anthropic_api_key") || "");
  const saveApiKey = () => { localStorage.setItem("anthropic_api_key", apiKeyInput.trim()); setShowAiSettings(false); };

  const M = MS;
  return (
    <div style={M.app}>
      <div style={M.hdr}>
        <div style={M.glow}/>
        <div style={{position:"relative",zIndex:1}}>
          <div style={M.logo}>🛒 Shopee<span style={{color:SHOPEE_ORANGE}}>Clip</span>AI</div>
          <div style={{fontSize:"12px",color:"rgba(255,255,255,0.7)",marginBottom:"8px"}}>สร้างคลิปปักตะกร้า + แคปชั่น อัตโนมัติ</div>
          <div style={{display:"flex",gap:"6px",flexWrap:"wrap"}}>
            <span style={M.badge()}>{licKey}</span>
            <span style={M.badge(expired?"#e74c3c":dl!==null&&dl<=7?SHOPEE_ORANGE:GREEN)}>
              {expired?"❌ หมดอายุ":keyInfo?.type==="lifetime"?"♾️ ตลอดชีพ":`⏰ เหลือ ${dl} วัน`}
            </span>
            <span style={{...M.badge(),cursor:"pointer"}} onClick={()=>setShowAiSettings(true)}>⚙️ ตั้งค่า AI</span>
            <span style={{...M.badge(),cursor:"pointer"}} onClick={onLogout}>ออก</span>
          </div>
        </div>
      </div>

      {showAiSettings && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:50,padding:"20px"}} onClick={()=>setShowAiSettings(false)}>
          <div style={{...M.card,maxWidth:"360px",width:"100%"}} onClick={e=>e.stopPropagation()}>
            <div style={M.cardT}>⚙️ ตั้งค่า Anthropic API Key</div>
            <p style={{fontSize:"12px",color:TEXT_MUTED,marginTop:0}}>
              ใช้สำหรับฟีเจอร์ "AI สร้างแคปชั่น" และ "สร้างสคริปต์คลิป" — รับ API Key ได้ที่ console.anthropic.com (เก็บไว้ในเครื่องนี้เท่านั้น ไม่ส่งไปที่อื่น)
            </p>
            <input style={M.input} type="password" placeholder="sk-ant-..." value={apiKeyInput} onChange={e=>setApiKeyInput(e.target.value)} />
            <button style={M.btnP} onClick={saveApiKey}>💾 บันทึก</button>
          </div>
        </div>
      )}

      {expired&&<div style={{background:"rgba(231,76,60,0.15)",border:"1px solid #e74c3c50",margin:"12px 16px",borderRadius:"10px",padding:"10px 14px",fontSize:"13px",color:"#FF6B6B"}}>⚠️ Key หมดอายุ กรุณาติดต่อผู้ขายเพื่อต่ออายุ</div>}

      <div style={{display:"flex",gap:"8px",padding:"14px 14px 0",maxWidth:"600px",margin:"0 auto"}}>
        {[["content","✍️ แคปชั่น/สคริปต์"],["video","🎬 สร้างคลิป"],["queue","📅 คิวโพส"]].map(([id,lb])=>(
          <button key={id} style={M.tab(page===id)} onClick={()=>setPage(id)}>{lb}</button>
        ))}
      </div>

      {page==="content" && (
      <div style={M.body}>
        {/* สินค้า */}
        <div style={M.card}>
          <div style={M.cardT}>📦 ข้อมูลสินค้า</div>
          <label style={M.label}>ชื่อสินค้า *</label>
          <input style={M.input} placeholder="เช่น กระเป๋าผ้า Canvas ลายการ์ตูน" value={product} onChange={e=>setProduct(e.target.value)} />
          <div style={{display:"flex",gap:"10px"}}>
            <div style={{flex:1}}><label style={M.label}>ราคา (บาท) *</label><input style={M.input} type="number" placeholder="299" value={price} onChange={e=>setPrice(e.target.value)} /></div>
            <div style={{flex:1}}><label style={M.label}>ลด (%)</label><input style={M.input} type="number" placeholder="20" value={disc} onChange={e=>setDisc(e.target.value)} /></div>
          </div>
          <label style={M.label}>ลิงก์ Shopee</label>
          <input style={{...M.input,marginBottom:0}} placeholder="https://shopee.co.th/..." value={link} onChange={e=>setLink(e.target.value)} />
        </div>

        {/* แคปชั่น */}
        <div style={M.card}>
          <div style={M.cardT}>✍️ สร้างแคปชั่นโพส</div>
          <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
            <button style={M.tab(activeTab==="template")} onClick={()=>setActiveTab("template")}>📋 เทมเพลต</button>
            <button style={M.tab(activeTab==="ai")} onClick={()=>setActiveTab("ai")}>🤖 AI สร้างเอง</button>
          </div>
          {activeTab==="template"&&(
            <>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"8px",marginBottom:"12px"}}>
                {TEMPLATES.map(t=>(
                  <button key={t.id} style={M.tmplBtn(tmpl===t.id)} onClick={()=>setTmpl(t.id)}>{t.name}</button>
                ))}
              </div>
              <label style={M.label}>Hook เปิดตัว</label>
              <div style={{marginBottom:"8px"}}>
                {HOOKS.slice(0,4).map(h=>(
                  <span key={h} style={M.chip} onClick={()=>setHook(h)}>{h}</span>
                ))}
              </div>
              <input style={M.input} placeholder="หรือพิมพ์ hook เอง..." value={hook} onChange={e=>setHook(e.target.value)} />
              <button style={M.btnP} onClick={genTemplate} disabled={expired}>✨ สร้างแคปชั่น</button>
              {captionTmpl&&<ResultBox text={captionTmpl} id="tmpl" copied={copied} onCopy={copy}/>}
            </>
          )}
          {activeTab==="ai"&&(
            <>
              <p style={{fontSize:"13px",color:TEXT_MUTED,margin:"0 0 12px"}}>AI สร้างแคปชั่นปรับแต่งพิเศษจากสินค้าของคุณ</p>
              <button style={{...M.btnP,opacity:aiLoading?0.7:1}} onClick={genAI} disabled={aiLoading||expired}>
                {aiLoading?"⏳ AI กำลังสร้าง...":"🤖 ให้ AI สร้างแคปชั่น"}
              </button>
              {captionAi&&<ResultBox text={captionAi} id="ai" copied={copied} onCopy={copy}/>}
            </>
          )}
        </div>

        {/* สคริปต์ */}
        <div style={M.card}>
          <div style={M.cardT}>🎬 สคริปต์คลิปสั้น (AI)</div>
          <p style={{fontSize:"13px",color:TEXT_MUTED,margin:"0 0 12px"}}>AI เขียนสคริปต์แบบจังหวะ พร้อมบทพูด สำหรับถ่ายคลิป TikTok/Reels</p>
          <button style={{...M.btnS,opacity:scriptLoading?0.7:1}} onClick={genScript} disabled={scriptLoading||expired}>
            {scriptLoading?"⏳ AI กำลังเขียนสคริปต์...":"🎬 สร้างสคริปต์คลิป"}
          </button>
          {script&&(
            <div style={{marginTop:"12px"}}>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:"6px"}}>
                <button style={{background:"rgba(255,255,255,0.08)",border:"none",color:TEXT_MUTED,borderRadius:"8px",padding:"6px 14px",fontSize:"12px",cursor:"pointer"}} onClick={()=>copy(script,"scr")}>
                  {copied==="scr"?"✓ คัดลอกแล้ว":"📋 คัดลอกสคริปต์"}
                </button>
              </div>
              <div style={{background:"rgba(0,0,0,0.3)",borderRadius:"12px",padding:"14px",fontSize:"12px",lineHeight:"1.8",whiteSpace:"pre-wrap",color:TEXT_MAIN,border:"1px solid rgba(255,255,255,0.07)",maxHeight:"280px",overflowY:"auto"}}>{script}</div>
            </div>
          )}
        </div>

        {/* Key info */}
        <div style={{...M.card,border:"1px solid rgba(245,166,35,0.15)"}}>
          <div style={M.cardT}>🔑 ข้อมูล License</div>
          <div style={{fontSize:"13px",color:TEXT_MUTED,lineHeight:"2"}}>
            <div>Key: <span style={{color:TEXT_MAIN,fontFamily:"monospace"}}>{licKey}</span></div>
            <div>ประเภท: <span style={{color:SHOPEE_ORANGE}}>{keyInfo?.type==="monthly"?"รายเดือน":keyInfo?.type==="yearly"?"รายปี":"ตลอดชีพ"}</span></div>
            <div>หมดอายุ: <span style={{color:expired?"#e74c3c":GREEN}}>{fmtDate(keyInfo?.expiresAt)}</span></div>
          </div>
        </div>
      </div>
      )}

      {page==="video" && (
        <VideoGenerator M={M} expired={expired} product={product} price={price} disc={disc}
          captionForVideo={captionTmpl || captionAi} />
      )}

      {page==="queue" && (
        <PostQueue M={M} licKey={licKey} expired={expired}
          product={product} price={price} link={link}
          captionTmpl={captionTmpl} captionAi={captionAi} script={script} />
      )}
    </div>
  );
}

// ─── VIDEO GENERATOR ─────────────────────────────────────────
function VideoGenerator({ M, expired, product, price, disc, captionForVideo }) {
  const [mode, setMode] = useState("generate"); // generate | upload
  const [images, setImages] = useState([]); // {url, name}
  const [secPerImg, setSecPerImg] = useState(2.5);
  const [overlayText, setOverlayText] = useState("");
  const [isRendering, setIsRendering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState("");
  const [videoBlob, setVideoBlob] = useState(null);
  const [videoFileName, setVideoFileName] = useState("shopee-clip.webm");
  const [shareMsg, setShareMsg] = useState("");
  const canvasRef = useRef(null);
  const videoFileInputRef = useRef(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // default overlay = price/discount text
    if (!overlayText && product) {
      setOverlayText(`${product}${price ? ` | ${price} บาท` : ""}${disc ? ` ลด ${disc}%` : ""}`);
    }
  }, [product, price, disc]);

  const handleFiles = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 10);
    const newImgs = files.map(f => ({ url: URL.createObjectURL(f), name: f.name }));
    setImages(prev => [...prev, ...newImgs].slice(0, 10));
  };
  const removeImage = (idx) => setImages(prev => prev.filter((_,i)=>i!==idx));
  const moveImage = (idx, dir) => {
    setImages(prev => {
      const arr=[...prev]; const j=idx+dir;
      if (j<0||j>=arr.length) return arr;
      [arr[idx],arr[j]]=[arr[j],arr[idx]];
      return arr;
    });
  };

  const renderVideo = async () => {
    if (images.length === 0) return;
    setIsRendering(true); setProgress(0); setVideoUrl("");

    const W = 720, H = 1280;
    const canvas = canvasRef.current;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext("2d");

    // preload images
    const loaded = await Promise.all(images.map(img => new Promise(res => {
      const el = new Image();
      el.onload = () => res(el);
      el.onerror = () => res(null);
      el.src = img.url;
    })));

    const stream = canvas.captureStream(30);
    const chunks = [];
    let mime = "video/webm;codecs=vp9";
    if (!MediaRecorder.isTypeSupported(mime)) mime = "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
    recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
    const stopped = new Promise(res => { recorder.onstop = res; });
    recorder.start();

    const totalDuration = secPerImg * loaded.length * 1000;
    const startTime = performance.now();
    const fps = 30;

    await new Promise(resolveAll => {
      function frame() {
        const elapsed = performance.now() - startTime;
        const idx = Math.min(loaded.length - 1, Math.floor(elapsed / (secPerImg*1000)));
        const localT = (elapsed % (secPerImg*1000)) / (secPerImg*1000);
        const img = loaded[idx];

        ctx.fillStyle = "#000";
        ctx.fillRect(0,0,W,H);

        if (img) {
          // Ken Burns zoom effect: scale 1.0 -> 1.12
          const scale = 1 + 0.12 * localT;
          const iw = img.width, ih = img.height;
          const targetRatio = W/H, imgRatio = iw/ih;
          let drawW, drawH;
          if (imgRatio > targetRatio) { drawH = H*scale; drawW = drawH*imgRatio; }
          else { drawW = W*scale; drawH = drawW/imgRatio; }
          const dx = (W-drawW)/2, dy = (H-drawH)/2;
          ctx.drawImage(img, dx, dy, drawW, drawH);
        }

        // gradient overlay bottom
        const grad = ctx.createLinearGradient(0,H*0.6,0,H);
        grad.addColorStop(0,"rgba(0,0,0,0)");
        grad.addColorStop(1,"rgba(0,0,0,0.75)");
        ctx.fillStyle = grad;
        ctx.fillRect(0,H*0.6,W,H*0.4);

        // overlay text
        if (overlayText) {
          ctx.fillStyle = "#fff";
          ctx.font = "bold 42px 'Segoe UI', sans-serif";
          ctx.textAlign = "center";
          wrapText(ctx, overlayText, W/2, H-160, W-80, 52);
        }
        // price badge
        if (price) {
          ctx.fillStyle = SHOPEE_RED;
          ctx.fillRect(W/2-130, H-90, 260, 60);
          ctx.fillStyle = "#fff";
          ctx.font = "bold 36px 'Segoe UI', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(`${price} บาท${disc?` (-${disc}%)`:""}`, W/2, H-50);
        }

        setProgress(Math.min(100, Math.round((elapsed/totalDuration)*100)));

        if (elapsed < totalDuration) {
          requestAnimationFrame(frame);
        } else {
          resolveAll();
        }
      }
      requestAnimationFrame(frame);
    });

    recorder.stop();
    await stopped;
    const blob = new Blob(chunks, { type: mime });
    setVideoBlob(blob);
    setVideoFileName("shopee-clip.webm");
    setVideoUrl(URL.createObjectURL(blob));
    setIsRendering(false);
    setProgress(100);
  };

  const handleVideoFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoBlob(file);
    setVideoFileName(file.name);
    setVideoUrl(URL.createObjectURL(file));
    setShareMsg("");
  };

  const shareVideo = async () => {
    setShareMsg("");
    if (!videoBlob) return;
    const captionText = captionForVideo || `${product} ราคา ${price} บาท${disc?` ลด ${disc}%`:""}`;
    try {
      const file = new File([videoBlob], videoFileName, { type: videoBlob.type || "video/webm" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: product || "Shopee Clip",
          text: captionText,
        });
        setShareMsg("✅ เปิดหน้าแชร์แล้ว เลือกแอปที่ต้องการโพสได้เลย");
      } else if (navigator.share) {
        // fallback: share text + link only (some browsers can't share files)
        await navigator.share({ title: product || "Shopee Clip", text: captionText });
        setShareMsg("⚠️ อุปกรณ์นี้แชร์ไฟล์วิดีโอไม่ได้ ได้แชร์เฉพาะแคปชั่น กรุณาดาวน์โหลดวิดีโอแล้วแนบเองในแอป");
      } else {
        setShareMsg("⚠️ เบราว์เซอร์นี้ไม่รองรับการแชร์ กรุณาดาวน์โหลดวิดีโอแล้วเปิดแอปเพื่ออัปโหลดเอง");
      }
    } catch (err) {
      if (err?.name !== "AbortError") setShareMsg("⚠️ ไม่สามารถเปิดหน้าแชร์ได้ กรุณาดาวน์โหลดวิดีโอแล้วอัปโหลดเอง");
    }
  };

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";
    const lines = [];
    for (const w of words) {
      const test = line + w + " ";
      if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w + " "; }
      else line = test;
    }
    lines.push(line);
    const startY = y - (lines.length-1)*lineHeight;
    lines.forEach((l,i) => ctx.fillText(l.trim(), x, startY + i*lineHeight));
  }

  return (
    <div style={M.body}>
      <div style={{display:"flex",gap:"8px",marginBottom:"12px"}}>
        <button style={M.tab(mode==="generate")} onClick={()=>setMode("generate")}>🖼️ สร้างคลิปจากรูป</button>
        <button style={M.tab(mode==="upload")} onClick={()=>setMode("upload")}>📁 อัปโหลดคลิปที่มี</button>
      </div>

      {mode==="generate" && (
      <div style={M.card}>
        <div style={M.cardT}>🎬 สร้างคลิปวิดีโอจากรูปสินค้า</div>
        <p style={{fontSize:"13px",color:TEXT_MUTED,margin:"0 0 12px"}}>
          อัปโหลดรูปสินค้า (สูงสุด 10 รูป) ระบบจะตัดต่อเป็นวิดีโอแนวตั้ง 720x1280 พร้อม Ken Burns zoom + ข้อความซ้อนทับ แล้วดาวน์โหลดเป็น .webm ได้ทันที
        </p>
        <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:"none"}} onChange={handleFiles} />
        <button style={M.btnS} onClick={()=>fileInputRef.current?.click()} disabled={expired}>📷 เลือกรูปสินค้า</button>

        {images.length>0 && (
          <div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"12px"}}>
            {images.map((img,i)=>(
              <div key={i} style={{position:"relative",width:"70px",height:"100px",borderRadius:"8px",overflow:"hidden",border:"1px solid rgba(255,255,255,0.1)"}}>
                <img src={img.url} alt="" style={{width:"100%",height:"100%",objectFit:"cover"}} />
                <div style={{position:"absolute",top:0,right:0,display:"flex"}}>
                  <button style={{background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",fontSize:"10px",padding:"2px 5px",cursor:"pointer"}} onClick={()=>removeImage(i)}>✕</button>
                </div>
                <div style={{position:"absolute",bottom:0,left:0,right:0,display:"flex",justifyContent:"space-between"}}>
                  <button style={{background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",fontSize:"10px",padding:"2px 5px",cursor:"pointer",flex:1}} onClick={()=>moveImage(i,-1)}>◀</button>
                  <button style={{background:"rgba(0,0,0,0.6)",color:"#fff",border:"none",fontSize:"10px",padding:"2px 5px",cursor:"pointer",flex:1}} onClick={()=>moveImage(i,1)}>▶</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={{marginTop:"14px"}}>
          <label style={M.label}>เวลาต่อรูป (วินาที)</label>
          <input style={M.input} type="number" min="1" max="6" step="0.5" value={secPerImg} onChange={e=>setSecPerImg(Number(e.target.value)||2.5)} />
          <label style={M.label}>ข้อความซ้อนทับ (Overlay Text)</label>
          <input style={{...M.input,marginBottom:0}} placeholder="เช่น ชื่อสินค้า / จุดเด่น" value={overlayText} onChange={e=>setOverlayText(e.target.value)} />
        </div>

        <button style={{...M.btnP,marginTop:"14px",opacity:isRendering?0.7:1}} onClick={renderVideo} disabled={isRendering||images.length===0||expired}>
          {isRendering ? `⏳ กำลังตัดต่อ... ${progress}%` : "🎬 สร้างวิดีโอ"}
        </button>

        <canvas ref={canvasRef} style={{display:"none"}} />
      </div>
      )}

      {mode==="upload" && (
        <div style={M.card}>
          <div style={M.cardT}>📁 อัปโหลดคลิปวิดีโอที่มีอยู่แล้ว</div>
          <p style={{fontSize:"13px",color:TEXT_MUTED,margin:"0 0 12px"}}>
            เลือกไฟล์วิดีโอจากเครื่อง/มือถือ (รองรับ .mp4, .mov, .webm) ระบบจะเตรียมแคปชั่นให้พร้อม แล้วกดแชร์ไปโพสในแอปที่ต้องการได้เลย
          </p>
          <input ref={videoFileInputRef} type="file" accept="video/*" style={{display:"none"}} onChange={handleVideoFile} />
          <button style={M.btnS} onClick={()=>videoFileInputRef.current?.click()} disabled={expired}>📁 เลือกไฟล์วิดีโอ</button>
          {videoFileName && videoBlob && mode==="upload" && (
            <div style={{fontSize:"12px",color:TEXT_MUTED,marginTop:"8px"}}>📎 {videoFileName}</div>
          )}
        </div>
      )}

      {videoUrl && (
        <div style={M.card}>
          <div style={M.cardT}>🎥 พรีวิว & แชร์ไปโพส</div>
          <video src={videoUrl} controls style={{width:"100%",maxWidth:"260px",display:"block",margin:"0 auto",borderRadius:"12px",border:"1px solid rgba(255,255,255,0.1)"}} />

          <button style={{...M.btnP,marginTop:"14px"}} onClick={shareVideo}>
            📲 แชร์ไปโพส (เลือกแอปบนมือถือ)
          </button>
          <a href={videoUrl} download={videoFileName} style={{display:"block",textAlign:"center",marginTop:"8px",background:"rgba(255,255,255,0.08)",color:TEXT_MAIN,borderRadius:"10px",padding:"11px",fontSize:"14px",fontWeight:"700",textDecoration:"none"}}>
            ⬇️ ดาวน์โหลดวิดีโอ
          </a>
          {shareMsg && (
            <div style={{marginTop:"10px",fontSize:"12px",color: shareMsg.startsWith("✅")?GREEN:SHOPEE_ORANGE, background:"rgba(255,255,255,0.04)",borderRadius:"8px",padding:"8px 12px"}}>
              {shareMsg}
            </div>
          )}
        </div>
      )}

      {captionForVideo && (
        <div style={M.card}>
          <div style={M.cardT}>📝 แคปชั่นที่จะใช้คู่กับคลิปนี้</div>
          <div style={{background:"rgba(0,0,0,0.3)",borderRadius:"12px",padding:"14px",fontSize:"13px",lineHeight:"1.7",whiteSpace:"pre-wrap",color:TEXT_MAIN,border:"1px solid rgba(255,255,255,0.07)"}}>{captionForVideo}</div>
          <p style={{fontSize:"11px",color:TEXT_MUTED,marginTop:"8px"}}>* แคปชั่นนี้จะถูกแนบไปพร้อมวิดีโอเมื่อกด "แชร์ไปโพส" (ในแอปที่รองรับ)</p>
        </div>
      )}

      <div style={{...M.card,border:"1px solid rgba(245,166,35,0.15)"}}>
        <div style={M.cardT}>ℹ️ วิธีใช้ปุ่ม "แชร์ไปโพส"</div>
        <div style={{fontSize:"12px",color:TEXT_MUTED,lineHeight:"1.8"}}>
          กดปุ่มแล้วมือถือจะเปิดหน้าเลือกแอป (Shopee, TikTok, Facebook, Instagram, Line ฯลฯ) — เลือกแอปที่ต้องการ วิดีโอ+แคปชั่นจะถูกส่งเข้าไปให้พร้อมโพสทันที ทำงานได้บน Android/Chrome เป็นหลัก หากอุปกรณ์ไม่รองรับการแชร์ไฟล์ ให้กดดาวน์โหลดวิดีโอแล้วเปิดแอปอัปโหลดเอง
        </div>
      </div>
    </div>
  );
}

// ─── POST QUEUE ──────────────────────────────────────────────
// ใช้ตาราง Supabase ชื่อ "post_queue" (เก็บ id เป็น storageKey รูปแบบ queue:{licKey}:{timestamp})
const Q_CACHE = {};

async function qList(licKey) {
  const out = new Set();
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("post_queue").select("id").eq("license_key", licKey);
      if (!error && data) data.forEach(row => out.add(row.id));
    } catch {}
  }
  try {
    const prefix = `queue:${licKey}:`;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) out.add(k);
    }
  } catch {}
  return [...out];
}

async function qGet(key) {
  if (Q_CACHE[key]) return Q_CACHE[key];
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabase.from("post_queue").select("*").eq("id", key).maybeSingle();
      if (!error && data) {
        const v = { title:data.title, platform:data.platform, datetime:data.datetime, caption:data.caption, status:data.status, createdAt:data.created_at, link:data.link, price:data.price, script:data.script };
        Q_CACHE[key] = v;
        return v;
      }
    } catch {}
  }
  try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

async function qSet(key, val) {
  Q_CACHE[key] = val;
  const licKey = key.split(":")[1];
  if (isSupabaseConfigured) {
    try {
      await supabase.from("post_queue").upsert({
        id: key, license_key: licKey, title: val.title, platform: val.platform,
        datetime: val.datetime, caption: val.caption, status: val.status,
        created_at: val.createdAt, link: val.link, price: val.price, script: val.script,
      });
    } catch {}
  }
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

async function qDel(key) {
  delete Q_CACHE[key];
  if (isSupabaseConfigured) {
    try { await supabase.from("post_queue").delete().eq("id", key); } catch {}
  }
  try { localStorage.removeItem(key); } catch {}
}

function PostQueue({ M, licKey, expired, product, price, link, captionTmpl, captionAi, script }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title:"", platform:"shopee_video", datetime:"", caption:"" });

  const load = async () => {
    setLoading(true);
    const keys = await qList(licKey);
    const list = [];
    for (const k of keys) { const v = await qGet(k); if (v) list.push({ storageKey:k, ...v }); }
    list.sort((a,b)=> new Date(a.datetime) - new Date(b.datetime));
    setItems(list);
    setLoading(false);
  };
  useEffect(()=>{ load(); },[licKey]);

  useEffect(() => {
    if (!form.title && product) setForm(f=>({...f, title: product}));
    if (!form.caption && (captionTmpl||captionAi)) setForm(f=>({...f, caption: captionTmpl||captionAi}));
  }, [product, captionTmpl, captionAi]);

  const addItem = async () => {
    if (!form.title || !form.datetime) return;
    const id = `queue:${licKey}:${Date.now()}`;
    const item = { ...form, status:"pending", createdAt:new Date().toISOString(), link, price, script };
    await qSet(id, item);
    setForm({ title:"", platform:"shopee_video", datetime:"", caption:"" });
    load();
  };
  const toggleDone = async (it) => {
    const updated = { ...it, status: it.status==="pending"?"done":"pending" };
    await qSet(it.storageKey, updated);
    load();
  };
  const removeItem = async (it) => { await qDel(it.storageKey); load(); };

  const PLATFORM_LABEL = {
    shopee_video: "🛒 Shopee Video",
    shopee_live: "🔴 Shopee Live",
    tiktok: "🎵 TikTok",
    facebook: "📘 Facebook",
    ig_reels: "📸 IG Reels",
  };

  return (
    <div style={M.body}>
      <div style={M.card}>
        <div style={M.cardT}>📅 เพิ่มคิวโพสใหม่</div>
        <label style={M.label}>ชื่อรายการ / สินค้า</label>
        <input style={M.input} placeholder="เช่น กระเป๋าผ้า Canvas" value={form.title} onChange={e=>setForm({...form,title:e.target.value})} />
        <label style={M.label}>แพลตฟอร์ม</label>
        <select style={{...M.input}} value={form.platform} onChange={e=>setForm({...form,platform:e.target.value})}>
          {Object.entries(PLATFORM_LABEL).map(([k,v])=>(<option key={k} value={k} style={{background:BG_CARD}}>{v}</option>))}
        </select>
        <label style={M.label}>วันเวลาที่ต้องการโพส</label>
        <input style={M.input} type="datetime-local" value={form.datetime} onChange={e=>setForm({...form,datetime:e.target.value})} />
        <label style={M.label}>แคปชั่น</label>
        <textarea style={{...M.input,minHeight:"90px",resize:"vertical",fontFamily:"inherit"}} placeholder="แคปชั่นสำหรับโพสนี้..." value={form.caption} onChange={e=>setForm({...form,caption:e.target.value})} />
        <button style={M.btnP} onClick={addItem} disabled={expired || !form.title || !form.datetime}>➕ เพิ่มเข้าคิว</button>
      </div>

      <div style={M.card}>
        <div style={M.cardT}>🗂️ คิวโพสทั้งหมด</div>
        {loading ? <div style={{textAlign:"center",color:TEXT_MUTED,padding:"20px"}}>⏳ กำลังโหลด...</div>
        : items.length===0 ? <div style={{textAlign:"center",color:TEXT_MUTED,padding:"20px",fontSize:"13px"}}>ยังไม่มีคิวโพส เพิ่มรายการด้านบนได้เลย</div>
        : items.map(it=>{
          const dt = new Date(it.datetime);
          const isPast = dt < new Date();
          return (
            <div key={it.storageKey} style={{background:it.status==="done"?"rgba(39,174,96,0.08)":"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:"12px",padding:"12px",marginBottom:"8px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:"4px"}}>
                <div style={{fontSize:"13px",fontWeight:"700",color:TEXT_MAIN}}>{it.title}</div>
                <span style={{fontSize:"11px",padding:"2px 8px",borderRadius:"20px",background:it.status==="done"?"rgba(39,174,96,0.2)":isPast?"rgba(231,76,60,0.2)":"rgba(245,166,35,0.15)",color:it.status==="done"?GREEN:isPast?"#e74c3c":SHOPEE_ORANGE}}>
                  {it.status==="done"?"✅ โพสแล้ว":isPast?"⏰ เลยกำหนด":"🕐 รอโพส"}
                </span>
              </div>
              <div style={{fontSize:"12px",color:TEXT_MUTED,marginBottom:"3px"}}>{PLATFORM_LABEL[it.platform]} • {dt.toLocaleString("th-TH",{dateStyle:"medium",timeStyle:"short"})}</div>
              {it.caption && <div style={{fontSize:"12px",color:TEXT_MUTED,marginTop:"6px",whiteSpace:"pre-wrap",maxHeight:"60px",overflow:"hidden"}}>{it.caption.slice(0,120)}{it.caption.length>120?"...":""}</div>}
              <div style={{display:"flex",gap:"8px",marginTop:"8px"}}>
                <button style={{flex:1,padding:"6px",borderRadius:"8px",border:"none",fontSize:"12px",fontWeight:"700",cursor:"pointer",background:it.status==="done"?"rgba(230,126,34,0.2)":"rgba(39,174,96,0.2)",color:it.status==="done"?SHOPEE_ORANGE:GREEN}} onClick={()=>toggleDone(it)}>
                  {it.status==="done"?"↩️ ยังไม่โพส":"✅ โพสแล้ว"}
                </button>
                <button style={{flex:1,padding:"6px",borderRadius:"8px",border:"none",fontSize:"12px",fontWeight:"700",cursor:"pointer",background:"rgba(231,76,60,0.2)",color:"#e74c3c"}} onClick={()=>removeItem(it)}>🗑️ ลบ</button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{...M.card,border:"1px solid rgba(245,166,35,0.15)"}}>
        <div style={M.cardT}>ℹ️ เกี่ยวกับคิวโพส</div>
        <div style={{fontSize:"12px",color:TEXT_MUTED,lineHeight:"1.8"}}>
          ระบบนี้เป็นตัวช่วยวางแผนและเช็กลิสต์การโพส — บันทึกวันเวลา แคปชั่น และสถานะไว้ให้ครบ การ "โพสขึ้นแพลตฟอร์มจริงแบบอัตโนมัติ" ต้องเชื่อมต่อ API ทางการของ Shopee/TikTok/Facebook ซึ่งต้องลงทะเบียนนักพัฒนาและขอสิทธิ์เข้าถึงแยกต่างหาก เมื่อถึงเวลาในคิว ระบบจะช่วยเตือนให้คุณกดโพสด้วยมือ พร้อมแคปชั่นและคลิปที่เตรียมไว้แล้ว
        </div>
      </div>
    </div>
  );
}


function ResultBox({ text, id, copied, onCopy }) {
  return (
    <div style={{background:"rgba(0,0,0,0.3)",borderRadius:"12px",padding:"14px",fontSize:"13px",lineHeight:"1.7",whiteSpace:"pre-wrap",color:TEXT_MAIN,marginTop:"10px",border:"1px solid rgba(255,255,255,0.07)",position:"relative"}}>
      {text}
      <button style={{position:"absolute",top:"10px",right:"10px",background:copied===id?"#27AE60":"rgba(255,255,255,0.1)",border:"none",borderRadius:"6px",padding:"4px 10px",color:"#fff",fontSize:"12px",cursor:"pointer"}}
        onClick={()=>onCopy(text,id)}>{copied===id?"✓":"คัดลอก"}</button>
    </div>
  );
}

const MS = {
  app:{minHeight:"100vh",background:BG_DARK,color:TEXT_MAIN,fontFamily:"'Segoe UI','Noto Sans Thai',sans-serif"},
  hdr:{background:`linear-gradient(135deg,${SHOPEE_RED},#8B0000)`,padding:"18px 20px 14px",position:"relative",overflow:"hidden"},
  glow:{position:"absolute",top:"-50%",left:"50%",transform:"translateX(-50%)",width:"200%",height:"200%",background:"radial-gradient(ellipse,rgba(255,200,0,0.1) 0%,transparent 70%)",pointerEvents:"none"},
  logo:{fontSize:"24px",fontWeight:"900",margin:"0 0 2px"},
  badge:(c)=>({background:c&&c!==undefined?"rgba(255,255,255,0.15)":"rgba(255,255,255,0.15)",border:"1px solid rgba(255,255,255,0.2)",borderRadius:"20px",padding:"3px 10px",fontSize:"11px",color:"#fff",fontFamily:"monospace"}),
  body:{padding:"14px",maxWidth:"600px",margin:"0 auto"},
  card:{background:BG_CARD,borderRadius:"16px",padding:"16px",marginBottom:"12px",border:"1px solid rgba(255,255,255,0.07)"},
  cardT:{fontSize:"14px",fontWeight:"700",color:SHOPEE_ORANGE,marginBottom:"12px"},
  label:{display:"block",fontSize:"12px",color:TEXT_MUTED,marginBottom:"5px"},
  input:{width:"100%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:"10px",padding:"10px 14px",color:TEXT_MAIN,fontSize:"14px",outline:"none",boxSizing:"border-box",marginBottom:"10px"},
  tab:(a)=>({flex:1,padding:"9px",borderRadius:"10px",border:"none",fontSize:"13px",fontWeight:a?"700":"400",cursor:"pointer",background:a?SHOPEE_RED:"rgba(255,255,255,0.06)",color:a?"#fff":TEXT_MUTED}),
  tmplBtn:(a)=>({padding:"10px",borderRadius:"10px",border:a?`2px solid ${SHOPEE_RED}`:"1px solid rgba(255,255,255,0.1)",background:a?"rgba(238,77,45,0.15)":"rgba(255,255,255,0.03)",color:a?"#fff":TEXT_MUTED,fontSize:"13px",fontWeight:a?"700":"400",cursor:"pointer"}),
  chip:{display:"inline-block",background:"rgba(245,166,35,0.12)",border:"1px solid rgba(245,166,35,0.25)",borderRadius:"20px",padding:"4px 10px",fontSize:"11px",color:SHOPEE_ORANGE,margin:"0 4px 4px 0",cursor:"pointer"},
  btnP:{width:"100%",background:`linear-gradient(135deg,${SHOPEE_RED},#C0392B)`,color:"#fff",border:"none",borderRadius:"10px",padding:"11px",fontSize:"14px",fontWeight:"700",cursor:"pointer",marginTop:"2px"},
  btnS:{width:"100%",background:`linear-gradient(135deg,${SHOPEE_ORANGE},#E67E22)`,color:"#fff",border:"none",borderRadius:"10px",padding:"11px",fontSize:"14px",fontWeight:"700",cursor:"pointer"},
};
