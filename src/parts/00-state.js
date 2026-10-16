const DEF={title:"Round Robin DUPR",courts:2,target:11,fee:10,keo:true,hi:15,lo:5,thr:0.7,cap:100,gmode:"mix",costs:{court:0,water:0,ball:0,other:0}};
const K=0.3, SPREAD=2.5;
const S={cfg:null,players:[],matches:[],batches:[],hist:[],pm:{},live:false,offline:false,ready:false};
const drafts={}; const editing=new Set(); const errs={};
let db=null, canWrite=false, authUser=null, tab="san", resetArm=0, delArm=null, holder=Math.random().toString(36).slice(2);
try{tab=localStorage.getItem("pb-tab")||"san"}catch(e){}
if(tab==="home")tab="san";
let route="home",routeSid=0,autoRoute=true,hF="all";
function parseRoute(){const q=new URLSearchParams(location.search);
  if(q.has("buoi")){route="buoi";routeSid=Number(q.get("buoi"))||0;autoRoute=false}
  else if(q.has("san")){route="app";const t=q.get("san");if(["san","bxh","nguoi","tien","ls"].includes(t))tab=t;autoRoute=false}
  else if(q.has("start"))route="start";
  else if(q.has("tao"))route="tao";
  else if(q.has("quantri"))route="qt";
  else route="home"}
parseRoute();
function go(r,opt={}){route=r;autoRoute=false;if(r==="buoi")routeSid=Number(opt.sid)||0;if(r==="app"&&opt.tab)tab=opt.tab;
  let url=r==="start"?"?start":r==="tao"?"?tao":r==="qt"?"?quantri":r==="buoi"?`?buoi=${routeSid}`:r==="app"?(tab==="san"?"?san":`?san=${tab}`):"";if(CID!=="aep"&&!["start","tao","qt"].includes(r))url=(url?url+"&":"?")+"clb="+CID;if(!url)url=location.pathname;
  try{history.pushState(null,"",url)}catch(e){}
  try{scrollTo({top:0})}catch(e){}
  render()}
addEventListener("popstate",()=>{parseRoute();render()});
const DEF_BANK={bin:"970422",code:"mb",name:"MB Bank",acc:"17263544538888",holder:"PHAM TIEN DUNG"};let BANK=DEF_BANK;
let CID="aep",PFX="",CLUB=null,ROLE=null,legacy=true;
{const q=new URLSearchParams(location.search),c=String(q.get("clb")||"").toLowerCase().replace(/[^a-z0-9-]/g,"");if(c)CID=c}
const BANK_APPS=[["mb","MB Bank"],["vcb","Vietcombank"],["tcb","Techcombank"],["bidv","BIDV"],["icb","VietinBank"],["acb","ACB"],["tpb","TPBank"],["vpb","VPBank"],["vba","Agribank"],["shb","SHB"],["ocb","OCB"],["cake","Cake"]];
