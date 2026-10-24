/* ---------- Chia sẻ link: Mini App mở đúng trang; bản web chọn link Mini App (Zalo) hoặc link web ----------
   Link Mini App: https://zalo.me/s/<APP>/?clb=<clb>&p=<đường dẫn trong CLB>, ví dụ p=vdv/abc, p=buoi/12, p=san */
// Phần sau mã app: "/?clb=aep&p=vdv/abc" (dùng cho path của thẻ zmp_deep_link)
const miniRel=path=>{const s=String(path||"").split("?")[0].split("/").filter(Boolean),c=s[0]||CID,rest=s.slice(1).join("/");
  return `/?clb=${encodeURIComponent(c)}${rest?"&p="+encodeURIComponent(rest).replace(/%2F/g,"/"):""}`};
// Bản Testing/Development: Zalo SDK gắn env + version vào link chia sẻ để người thử nghiệm mở đúng bản đang thử. Link tự ghép cũng phải gắn y vậy
const zEnvQ=()=>{if(!MINI||typeof window==="undefined")return "";const e=String(window.APP_ENV||""),v=String(window.APP_VERSION||"");return (e?"&env="+encodeURIComponent(e):"")+(v?"&version="+encodeURIComponent(v):"")};
const miniPathOf=path=>`https://zalo.me/s/${MINI_APP_ID}${miniRel(path)}${zEnvQ()}`;
const SH_THUMB="https://pikeco.app/og.png";
// Thẻ chia sẻ: tiêu đề = dòng đầu, mô tả = các dòng sau (bỏ dòng "👉 Bấm link…")
function shCard(o){
  const L=String(o.text||"").split("\n").map(x=>x.trim()).filter(x=>x&&!/^👉/.test(x)&&!/^https?:\/\//.test(x));
  return {title:String((o._th&&o._th.title)||o.cardTitle||L[0]||o.title||"Pikeco").slice(0,100),description:String(o.cardDesc||L.slice(1).join(" · ")||(CLUB&&CLUB.name)||"").slice(0,400),thumbnail:o.thumb||SH_THUMB,path:miniRel(o.path)+(o.q||"")};
}
let zKind=lsGet("pb-zshare")==="text"?"text":"card";
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
// Mini App: gửi thẻ Mini App (ảnh, tiêu đề, mô tả, nút Mở ngay) hoặc tin nhắn chữ đầy đủ kèm link
async function zSendCard(o){
  const Z=window.ZMP;if(!Z||!Z.openShareSheet)return false;
  try{await Z.openShareSheet({type:"zmp_deep_link",data:shCard(o)});return true}
  catch(e){if(isCancel(e))return true;dbgLog("share thẻ lỗi: "+String((e&&(e.message||e.code))||e));return false}
}
async function zSendText(o){
  const mini=miniPathOf(o.path)+(o.q||""),txt=(o.text?String(o.text).trim()+"\n":"")+mini;
  if(await zShareText(txt))return;
  const Z=window.ZMP;if(Z&&Z.openShareSheet){try{await Z.openShareSheet({type:"link",data:{link:mini,chatOnly:false}});return}catch(e){if(isCancel(e))return}}
  try{await navigator.clipboard.writeText(txt);toast("Đã copy tin nhắn kèm link, dán vào nhóm Zalo nhé.")}catch(e){toast(mini)}
}
// Mở bảng chia sẻ, vẽ ảnh thẻ riêng của trang (hồ sơ, giải, tổng kết, sân, CLB) để xem trước
async function shareOut(o){SHR=o;shDraw();
  o._thP=thDraw(o.path).catch(()=>null);o._th=await o._thP;if(SHR===o)shDraw();
  // Web: lưu sẵn ảnh để link dán vào Facebook/Zalo có ảnh xem trước đúng trang
  if(!MINI&&o._th&&(canWrite||isZaloU(authUser)))thSave(o._th);
}
function shDraw(){
  let el=$("#shs");
  if(!el&&document.createElement&&document.body&&document.body.appendChild){el=document.createElement("div");el.id="shs";document.body.appendChild(el)}
  if(!el)return;
  if(!SHR){el.innerHTML="";return}
  if(MINI){const o=SHR,C=shCard(o),opt=(v,t,s,ic)=>`<button class="shopt${zKind===v?" on":""}" data-act="shz" data-v="${v}"><span class="ic" aria-hidden="true">${ic}</span><span class="t"><b>${t}</b><small>${s}</small></span><span class="rd"></span></button>`;
    el.innerHTML=`<div class="cfmdim" data-act="shx"></div><div class="shbox" role="dialog" aria-modal="true" aria-labelledby="sht">
    <div class="shhd"><h2 id="sht">${esc(o.title||"Chia sẻ")}</h2><button class="shxb" data-act="shx" aria-label="Đóng">✕</button></div>
    ${opt("card","Thẻ Mini App","Ảnh, tiêu đề, mô tả ngắn và nút Mở ngay.","▣")}${opt("text","Tin nhắn đầy đủ","Toàn bộ nội dung kèm link bấm được.","≡")}
    ${zKind==="card"?`<div class="shcard"><img src="${esc(o._th?o._th.data:C.thumbnail)}" alt=""><b>${esc(C.title)}</b><small>${esc(C.description)}</small><span class="mo">Mở ngay</span></div>`:`<pre class="shtxt">${esc(String(o.text||"").trim())}\n${esc(miniPathOf(o.path)+(o.q||""))}</pre>`}
    <div class="cfmbtn"><button class="line" data-act="shx">Đóng</button><button class="primary" data-act="shzgo">Gửi qua Zalo</button></div></div>`;return}
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
  if(!/^sh(k|x|go|cp|z|zgo)$/.test(act))return false;
  if(act==="shx"){SHR=null;shDraw();return true}
  if(!SHR)return true;
  if(act==="shz"){zKind=b.dataset.v==="text"?"text":"card";lsSet("pb-zshare",zKind);shDraw();return true}
  if(act==="shzgo"){const o=SHR;SHR=null;shDraw();
    if(zKind==="card"){if(o._thP)await o._thP;if(o._th){const u=await thSave(o._th);if(u)o.thumb=u}
      if(await zSendCard(o))return true;toast("Chưa gửi được thẻ, chuyển sang tin nhắn chữ.")}
    await zSendText(o);return true}
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

/* ----- Kiểm tra link (bản Testing): xem app được mở bằng link nào, gửi thử thẻ ----- */
const DBG=[];const dbgLog=m=>{DBG.push(new Date().toLocaleTimeString("vi-VN")+" · "+m);if(DBG.length>30)DBG.shift()};
const dbgOn=()=>MINI&&(!!String(window.APP_ENV||"")&&String(window.APP_ENV)!=="PRODUCTION"||/[?&]debug\b/.test(location.search||""));
if(MINI){dbgLog("mở app: "+location.href);try{const E=window.ZMP&&window.ZMP.events,N=window.ZMP&&window.ZMP.EventName;
  if(E&&N&&E.on)E.on(N.OpenApp,d=>{const t=typeof d==="string"?d:JSON.stringify(d||{});dbgLog("mở lại từ link: "+t.slice(0,300));
    const m=t.match(/[?&]clb=([a-z0-9-]+)/i),pp=t.match(/[?&]p=([A-Za-z0-9/_%-]+)/);if(!m)return;
    const c=m[1].toLowerCase(),p=pp?decodeURIComponent(pp[1]).replace(/[^A-Za-z0-9/_-]/g,""):"",np="/"+c+(p?"/"+p:"");
    setPath(np);if(c!==CID){location.reload();return}applyPath(readPath(np));render()})}catch(e){}}
// Kết quả lần đối chiếu tài khoản Zalo gần nhất (gộp phiên cũ sang tài khoản đúng)
const zsyncTx=()=>{let z=null;try{z=JSON.parse(lsGet("pb-zsync")||"null")}catch(e){}if(!z)return "chưa chạy";
  const m=z.moved,t=hm(z.at);if(z.err)return `${t} · lỗi: ${z.err}`;
  if(m&&m.error)return `${t} · gộp lỗi trên máy chủ`;
  if(m)return `${t} · đã gộp ${z.from.slice(0,10)}… → ${z.to.slice(0,10)}…: ${m.members||0} quyền, ${m.links||0} liên kết, ${m.regs||0} đăng ký, ${m.clubs||0} CLB`;
  return `${t} · khớp, không cần gộp`};
const D0name=()=>{try{return derive().pmap.get(S.link.pid)?.name||S.link.pid||""}catch(e){return ""}};
function dbgCard(){
  if(!dbgOn())return "";
  const q=new URLSearchParams(location.search||""),row=(k,v)=>`<div class="dbgr"><span>${k}</span><b>${esc(String(v||"–"))}</b></div>`;
  return `<section class="card2 dbg"><h2>Kiểm tra link chia sẻ (bản thử)</h2><div class="cb">
    ${row("Bản",`${window.APP_ENV||"?"} · ${window.APP_VERSION||"?"}`)}${row("clb",q.get("clb"))}${row("p",q.get("p"))}${row("Trang đang mở",curPath())}${row("Tài khoản",authUser?String(authUser.uid).slice(0,14)+"…":"chưa vào")}${row("Mã Zalo (6 số cuối)",myZid()?"…"+myZid().slice(-6):"chưa có")}${row("Liên kết VĐV",S.link?`${S.link.status} · ${D0name()}`:"chưa liên kết")}${row("Đối chiếu tài khoản",zsyncTx())}<button class="line wide" data-act="dbgzsync">Đối chiếu, gộp tài khoản Zalo ngay</button>
    <div class="dbgr"><span>Link mở app</span><b class="u">${esc(location.href)}</b></div>
    <div class="dbgr"><span>Link chia sẻ trang này</span><b class="u">${esc(miniPathOf(curPath()))}</b></div>
    <div class="two"><button class="line" data-act="dbgcard">Gửi thử thẻ</button><button class="line" data-act="dbgtext">Gửi thử tin nhắn</button></div>
    <small class="rule">Gửi vào My Documents, tắt hẳn Zalo rồi bấm thẻ/link: app phải mở đúng trang ở trên. Nhật ký:</small>
    <pre class="dbglog">${esc(DBG.join("\n"))}</pre></div></section>`;
}
async function dbgAct(act){
  if(act==="dbgzsync"){try{localStorage.removeItem("pb-zuid-ok")}catch(e){}await miniLogin(false);render();toast(zsyncTx());return true}
  if(act!=="dbgcard"&&act!=="dbgtext")return false;
  const o={title:"Thử chia sẻ",text:`Thử chia sẻ Pikeco\nTrang ${curPath()} · ${new Date().toLocaleTimeString("vi-VN")}`,path:curPath()};
  dbgLog("gửi thử "+(act==="dbgcard"?"thẻ":"tin nhắn")+": "+JSON.stringify(shCard(o)));
  if(act==="dbgcard"){if(!await zSendCard(o))toast("Thẻ lỗi, xem nhật ký.")}else await zSendText(o);
  render();return true;
}
