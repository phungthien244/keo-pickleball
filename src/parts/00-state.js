const DEF={title:"Round Robin DUPR",courts:2,target:11,fee:10,keo:true,hi:15,lo:5,thr:0.7,cap:100,gmode:"mix",costs:{court:0,water:0,ball:0,other:0}};
const K=0.3, SPREAD=2.5;
const S={cfg:null,players:[],matches:[],batches:[],hist:[],pm:{},live:false,offline:false,ready:false};
const drafts={}; const editing=new Set(); const errs={};
let db=null, canWrite=false, authUser=null, tab="san", resetArm=0, delArm=null, holder=Math.random().toString(36).slice(2);
try{tab=localStorage.getItem("pb-tab")||"san"}catch(e){}
if(tab==="home")tab="san";
let routePid="",routeX=null,route="home",routeSid=0,autoRoute=true,hF="all";
/* ---------- đường dẫn ----------
   Nền tảng: /  /clb  /tao-clb  /dang-nhap  /quan-tri
   CLB:      /aep  /aep/san  /aep/xep-hang  /aep/thanh-vien  /aep/quy  /aep/lich-su
             /aep/buoi/5  /aep/chot-buoi  /aep/cai-dat  /aep/moi/<mã mời>                              */
const RSEG={start:"",clb:"clb",tao:"tao-clb",login:"dang-nhap",qt:"quan-tri"};
const PSEG=Object.fromEntries(Object.entries(RSEG).map(([k,v])=>[v,k]));
const SEGT={san:"san",bxh:"xep-hang",nguoi:"thanh-vien",tien:"quy",ls:"lich-su",dk:"dang-ky",toi:"cua-toi",gt:"gioi-thieu"};
const TSEG=Object.fromEntries(Object.entries(SEGT).map(([k,v])=>[v,k]));
// Trọng tài (tài khoản Trọng tài hoặc máy vào bằng PIN): chỉ nhập điểm sân được giao
let REF=false,MYCT=[];
const canScore=m=>!!m&&(canWrite||(REF&&MYCT.includes(Number(m.court))));
let MODE="platform",CID="aep",PFX="",CLUB=null,ROLE=null,legacy=true,INVITE=null,clubChecked=false;
// Bản Zalo Mini App: đường dẫn trong app nằm sau dấu #, mở thẳng CLB (?clb=… hoặc mặc định aep)
const MINI=typeof window!=="undefined"&&!!window.ZMINI;
const API=MINI?"https://pikeco.app":"";
// Mini App mở: link CLB (?clb=) → trang Đăng ký CLB đó; đã từng vào CLB → CLB đó; chưa có → Khám phá CLB
function miniStart(){
  const q=String(new URLSearchParams(location.search||"").get("clb")||"").toLowerCase().replace(/[^a-z0-9-]/g,"");
  let last="";try{last=localStorage.getItem("pb-mini-last")||""}catch(e){}
  const c=q||String(last).replace(/[^a-z0-9-]/g,"");
  const b=String(new URLSearchParams(location.search||"").get("buoi")||"").replace(/[^A-Za-z0-9_-]/g,"");
  const p=q?miniDeepPath():"";
  return c?"/"+c+(p?"/"+p:b&&q?"/dang-ky/"+b:""):"/clb";
}
const curPath=()=>MINI?(String(location.hash||"").slice(1)||miniStart()):location.pathname;
const setPath=(p,rep)=>{try{history[rep?"replaceState":"pushState"](null,"",MINI?location.pathname+location.search+"#"+p:p)}catch(e){}};
const slugClean=x=>String(x||"").toLowerCase().replace(/[^a-z0-9-]/g,"");
// Link cũ dạng ?clb=..&san=..&buoi=.. vẫn mở được, đổi sang đường dẫn mới
function legacyPath(){
  if(MINI)return null;
  const p=location.pathname||"/",seg=p.split("/").filter(Boolean),q=new URLSearchParams(location.search||"");
  const old=["clb","san","buoi","start","tao","quantri","moi"].some(k=>q.has(k));
  // rr.pikeco.app chuyển hướng sang pikeco.app/aep kèm nguyên query cũ
  if(!old)return (p==="/"||p==="/index.html")&&location.hostname==="rr.pikeco.app"?"/aep":null;
  if(seg.length>1||(seg[0]&&seg[0]!=="index.html"&&PSEG[seg[0]]!==undefined))return null;
  if(q.has("start"))return "/";if(q.has("tao"))return "/tao-clb";if(q.has("quantri"))return "/quan-tri";
  const c="/"+(slugClean(q.get("clb"))||(seg[0]&&seg[0]!=="index.html"?slugClean(seg[0]):"")||"aep");
  if(q.has("moi"))return `${c}/moi/${encodeURIComponent(q.get("moi"))}`;
  if(q.has("buoi"))return `${c}/buoi/${Number(q.get("buoi"))||0}`;
  if(q.has("san"))return `${c}/${SEGT[q.get("san")]||"san"}`;
  return c}
function readPath(path){
  const s=String(path||"/").split("?")[0].split("/").filter(Boolean).map(x=>{try{return decodeURIComponent(x)}catch(e){return x}});
  if(!s.length)return{mode:"platform",route:"start"};
  if(s.length===1&&PSEG[s[0]]!==undefined)return{mode:"platform",route:PSEG[s[0]]};
  const r={mode:"club",cid:slugClean(s[0])||"aep",route:"home"};
  if(TSEG[s[1]]){r.route="app";r.tab=TSEG[s[1]];if(r.tab==="dk")r.xid=s[2]||null}
  else if(s[1]==="buoi"){r.route="buoi";r.sid=Number(s[2])||0}
  else if(s[1]==="cai-dat")r.route="caidat";
  else if(s[1]==="dang-nhap")r.route="clogin";
  else if(s[1]==="chot-buoi")r.route="chot";
  else if(s[1]==="vdv"){r.route="vdv";r.pid=s[2]||""}
  else if(s[1]==="so-ke"){r.route="cmp";r.pid=s[2]||""}
  else if(s[1]==="moi"){r.invite=s[2]||null;r.route="clogin"}
  return r}
function applyPath(r){route=r.route;if(r.mode==="club"){if(r.tab)tab=r.tab;if(r.route==="app")routeX=r.tab==="dk"?(r.xid||null):null;if(r.route==="buoi")routeSid=r.sid;if(r.route==="vdv"||r.route==="cmp")routePid=r.pid;if(r.route!=="home")autoRoute=false}}
{const lp=legacyPath();if(lp)setPath(lp,1);
  let r=readPath(lp||curPath());if(MINI&&r.mode!=="club"&&r.route!=="clb")r=readPath("/clb");MODE=r.mode;if(r.mode==="club"){CID=r.cid;INVITE=r.invite||null}applyPath(r)}
function pathOf(r,opt={}){
  if(RSEG[r]!==undefined)return "/"+RSEG[r];
  const c="/"+CID;
  if(r==="buoi")return `${c}/buoi/${opt.sid!=null?opt.sid:routeSid}`;
  if(r==="app"){const t=opt.tab||tab,x=t==="dk"?(opt.x!==undefined?opt.x:(opt.tab?null:routeX)):null;return `${c}/${SEGT[t]||"san"}${x?"/"+encodeURIComponent(x):""}`}
  if(r==="caidat")return c+"/cai-dat";
  if(r==="clogin")return c+"/dang-nhap";
  if(r==="chot")return c+"/chot-buoi";
  if(r==="vdv")return `${c}/vdv/${encodeURIComponent(opt.pid!=null?opt.pid:routePid)}`;
  if(r==="cmp")return `${c}/so-ke/${encodeURIComponent(opt.pid!=null?opt.pid:routePid)}`;
  return c}
const absUrl=p=>(MINI?"https://pikeco.app":location.origin)+p;
let mxNavN=0; // số trang đã mở trong Mini App (nút quay lại)
function go(r,opt={}){
  if((RSEG[r]!==undefined?"platform":"club")!==MODE){if(MINI){if(r==="clb"){setPath("/clb");location.reload()}return}location.href=pathOf(r,opt);return}
  route=r;autoRoute=false;if(r==="buoi")routeSid=Number(opt.sid)||0;if(r==="vdv"||r==="cmp")routePid=String(opt.pid||"");if(r==="app"&&opt.tab)tab=opt.tab;if(r==="app")routeX=tab==="dk"?(opt.x||null):null;
  setPath(pathOf(r));if(MINI)mxNavN++;
  if(!opt.keep)try{scrollTo({top:0})}catch(e){}
  render();if(typeof repaint==="function")repaint()}
// Mini App: thanh đầu trong suốt trên ảnh bìa đổi sang nền xanh khi cuộn
if(MINI)addEventListener("scroll",()=>{const c=document.documentElement.classList,y=window.scrollY||0;if(y>40)c.add("mxsc");else if(y<10)c.remove("mxsc")},{passive:true});
addEventListener("popstate",()=>{if(mxNavN>0)mxNavN--;const r=readPath(curPath());
  if(r.mode!==MODE||(r.mode==="club"&&r.cid!==CID)){location.reload();return}
  autoRoute=false;applyPath(r);render();if(typeof repaint==="function")repaint()});
const DEF_BANK={bin:"970422",code:"mb",name:"MB Bank",acc:"17263544538888",holder:"PHAM TIEN DUNG"};let BANK=DEF_BANK;
const BANK_APPS=[["mb","MB Bank"],["vcb","Vietcombank"],["tcb","Techcombank"],["bidv","BIDV"],["icb","VietinBank"],["acb","ACB"],["tpb","TPBank"],["vpb","VPBank"],["vba","Agribank"],["shb","SHB"],["ocb","OCB"],["cake","Cake"]];
