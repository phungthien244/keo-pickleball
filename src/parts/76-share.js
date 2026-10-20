/* ---------- Chia sẻ link: Mini App mở đúng trang; bản web chọn link Mini App (Zalo) hoặc link web ----------
   Link Mini App: https://zalo.me/s/<APP>/?clb=<clb>&p=<đường dẫn trong CLB>, ví dụ p=vdv/abc, p=buoi/12, p=san */
const miniPathOf=path=>{const s=String(path||"").split("?")[0].split("/").filter(Boolean),c=s[0]||CID,rest=s.slice(1).join("/");
  return `https://zalo.me/s/${MINI_APP_ID}/?clb=${encodeURIComponent(c)}${rest?"&p="+encodeURIComponent(rest).replace(/%2F/g,"/"):""}`};
const webPathOf=path=>"https://pikeco.app"+(String(path||"/").startsWith("/")?path:"/"+path);
let shKind=lsGet("pb-share")==="web"?"web":"mini";
// Link dán kèm tin nhắn (tổng kết, mời...): Mini App luôn dùng link Mini App; web theo lựa chọn gần nhất
const shLink=path=>MINI||shKind==="mini"?miniPathOf(path):webPathOf(path);
let SHR=null; // {title,text,path,q(thêm vào link Mini App),miniOnly}
// Mini App: gửi tin nhắn có nội dung + link bấm được (Zalo tự nhận link), giống bản web
const isCancel=e=>/cancel|huỷ|hủy|đóng|close|abort|-201|-2\b/i.test(String((e&&(e.message||e.code))||e||""));
async function zShareText(txt){
  const Z=window.ZMP;if(!Z||!Z.openShareSheet)return false;
  try{await Z.openShareSheet({type:"text",data:{text:String(txt).slice(0,2000),autoParseLink:true}});return true}
  catch(e){if(isCancel(e))return true;return false}
}
// Chia sẻ chỉ có chữ (nhắc phí, nhắc nợ…): Zalo / chia sẻ của máy / copy
async function sendText(txt,copied="Đã copy, dán vào nhóm Zalo nhé."){
  if(MINI&&await zShareText(txt))return;
  if(!MINI&&navigator.share){try{await navigator.share({text:txt});return}catch(e){if(e&&e.name==="AbortError")return}}
  try{await navigator.clipboard.writeText(txt);toast(copied)}catch(e){toast(txt)}
}
async function shareOut(o){
  const mini=miniPathOf(o.path)+(o.q||"");
  if(MINI){
    const txt=(o.text?String(o.text).trim()+"\n":"")+mini;
    if(await zShareText(txt))return;
    const Z=window.ZMP;if(Z&&Z.openShareSheet){try{await Z.openShareSheet({type:"link",data:{link:mini,chatOnly:false}});return}catch(e){if(isCancel(e))return}}
    try{await navigator.clipboard.writeText(txt);toast("Đã copy tin nhắn kèm link, dán vào nhóm Zalo nhé.")}catch(e){toast(mini)}return}
  SHR=o;shDraw();
}
function shDraw(){
  let el=$("#shs");
  if(!el&&document.createElement&&document.body&&document.body.appendChild){el=document.createElement("div");el.id="shs";document.body.appendChild(el)}
  if(!el)return;
  if(!SHR){el.innerHTML="";return}
  const o=SHR,k=o.miniOnly?"mini":shKind,u=k==="mini"?miniPathOf(o.path)+(o.q||""):webPathOf(o.path);
  const opt=(v,t,s,ic)=>`<button class="shopt${k===v?" on":""}" data-act="shk" data-v="${v}" ${o.miniOnly&&v==="web"?"disabled":""}><span class="ic" aria-hidden="true">${ic}</span><span class="t"><b>${t}</b><small>${s}</small></span><span class="rd"></span></button>`;
  el.innerHTML=`<div class="cfmdim" data-act="shx"></div><div class="shbox" role="dialog" aria-modal="true" aria-labelledby="sht">
    <div class="shhd"><h2 id="sht">${esc(o.title||"Chia sẻ")}</h2><button class="shxb" data-act="shx" aria-label="Đóng">✕</button></div>
    ${opt("mini","Link Mini App Zalo","Mở thẳng trong Zalo: đăng ký, check-in, xem vé. Hợp gửi nhóm Zalo.","Z")}
    ${opt("web","Link web","Mở bằng trình duyệt trên máy tính, điện thoại. Không cần Zalo.","🌐")}
    ${o.miniOnly?`<small class="rule">Lời mời này chỉ mở được trong Zalo.</small>`:""}
    <div class="shurl"><span>${esc(u.replace(/^https:\/\//,""))}</span></div>
    <div class="shqr">${qrSvgText(u,132)}<small>Quét bằng ${k==="mini"?"Zalo":"camera điện thoại"}</small></div>
    <div class="cfmbtn">${navigator.share?`<button class="primary" data-act="shgo">Chia sẻ…</button>`:""}<button class="${navigator.share?"line":"primary"}" data-act="shcp">${o.text?"Copy tin nhắn kèm link":"Copy link"}</button></div></div>`;
}
async function shAct(act,b){
  if(!/^sh(k|x|go|cp)$/.test(act))return false;
  if(act==="shx"){SHR=null;shDraw();return true}
  if(!SHR)return true;
  if(act==="shk"){shKind=b.dataset.v==="web"?"web":"mini";lsSet("pb-share",shKind);shDraw();return true}
  const o=SHR,k=o.miniOnly?"mini":shKind,u=k==="mini"?miniPathOf(o.path)+(o.q||""):webPathOf(o.path);
  if(act==="shgo"){try{await navigator.share({title:o.title||"",text:(o.text||"")+"\n",url:u});SHR=null;shDraw()}catch(e){}return true}
  try{await navigator.clipboard.writeText((o.text?o.text+"\n":"")+u);toast(o.text?"Đã copy tin nhắn kèm link":"Đã copy link");SHR=null;shDraw()}catch(e){toast(u)}
  return true;
}
if(document.addEventListener)document.addEventListener("keydown",e=>{if(SHR&&e.key==="Escape"){SHR=null;shDraw()}});
// Mini App mở từ link có &p=…: đi thẳng tới trang đó
function miniDeepPath(){
  try{const q=new URLSearchParams(location.search||""),p=String(q.get("p")||"").replace(/[^A-Za-z0-9/_-]/g,"").replace(/^\/+|\/+$/g,"");return p}catch(e){return ""}
}
