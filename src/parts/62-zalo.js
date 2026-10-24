/* ---------- Người chơi: đăng nhập Zalo, nhận hồ sơ, đăng ký buổi ---------- */
// Zalo chặn lấy thông tin người dùng từ máy chủ ngoài Việt Nam → tạm tắt, người chơi vào bằng tài khoản ẩn danh trên máy mình, chủ CLB duyệt
const ZALO_ON=false;
// Bản web không cho người chơi tự vào; đăng ký qua Zalo Mini App (window.ZMINI do bản Mini App đặt)
const PLAYER_ON=()=>!!window.ZMINI;
const isPlayer=u=>!!u&&(/^zalo_/.test(String(u.uid||""))||(PLAYER_ON()&&u.isAnonymous&&!REF&&!canWrite));
// Zalo Mini App: lấy ID người dùng (không cần hỏi quyền), đổi sang tài khoản pikeco qua máy chủ
async function miniLogin(quiet){
  const Z=window.ZMP;if(!Z)return false;
  // Chờ Firebase đọc lại phiên đăng nhập đã lưu: đã có tài khoản Zalo thì không cần đăng nhập lại qua máy chủ
  try{if(FB.auth&&FB.auth.authStateReady)await FB.auth.authStateReady()}catch(e){}
  // Phiên Zalo đã đối chiếu với mã Zalo trên máy này thì dùng lại; phiên cũ chưa đối chiếu → hỏi máy chủ một lần (gộp tài khoản nếu lệch)
  const cu=(FB.auth&&FB.auth.currentUser)||authUser,zl=cu&&/^zalo_/.test(String(cu.uid||""));
  if(zl&&(lsGet("pb-zuid-ok")===cu.uid||window.FB_TARGET==="mock"))return true;
  try{
    const id=await Z.getUserID();if(id)saveZProf({zid:String(id)});
    if(window.FB_TARGET==="mock"){await FB.signInWithCustomToken(FB.auth,String(id||"demo"));authUser={uid:"zalo_"+String(id||"demo"),isAnonymous:false};await refreshRole();render();return true}
    let at="";try{at=await Z.getAccessToken()}catch(e){}
    try{const ui=await Z.getUserInfo({autoRequestPermission:false}),u=ui&&ui.userInfo;if(u&&u.name)saveZProf({n:u.name,p:u.avatar||""})}catch(e){}
    let old="";if(zl&&cu.getIdToken){try{old=await cu.getIdToken()}catch(e){}}
    const r=await fetch(API+"/api/zalo-mini",{method:"POST",headers:{"content-type":"text/plain"},body:JSON.stringify({id:String(id||""),at,...(old?{old}:{})})});
    const j=await r.json().catch(()=>({}));if(!j.token){if(zl)return true;throw new Error(j.error||"no token")}
    if(!(zl&&cu.uid===j.uid))await FB.signInWithCustomToken(FB.auth,j.token);
    lsSet("pb-zuid-ok",j.uid);
    if(j.moved&&!j.moved.error&&(j.moved.members||j.moved.links||j.moved.regs||j.moved.clubs))toast("Đã gộp tài khoản Zalo cũ: quyền CLB, liên kết và đăng ký đã chuyển sang tài khoản này.");
    return true;
  }catch(e){if(zl)return true;if(!quiet)toast("Chưa vào được bằng Zalo, thử lại.");return false}
}
let unsubLink=null;
let ZPROF=null;
function zaloProf(){if(ZPROF)return ZPROF;try{return JSON.parse(localStorage.getItem("pb-zprof")||"{}")||{}}catch(e){return {}}}
function saveZProf(o){ZPROF={...zaloProf(),...o};o=ZPROF;try{localStorage.setItem("pb-zprof",JSON.stringify(o))}catch(e){}}
async function zaloStart(){
  if(!PLAYER_ON())return;
  if(ZALO_ON){if(window.FB_TARGET==="mock"){FB.signInWithCustomToken(FB.auth,"demo").then(()=>location.reload());return}
    location.href="/api/zalo?start=1&back="+encodeURIComponent(location.pathname);return}
  if(window.ZMP){if(await miniLogin())toast("Đã vào bằng Zalo");return}
  try{if(!authUser){const r=await FB.signInAnonymously(FB.auth);authUser=r.user}
    await refreshRole();if(route==="clogin")go("app",{tab:"san"});else render()}
  catch(e){toast("Chưa vào được, thử lại.")}
}
// Trang vừa được Zalo trả về: #zt=<token>&zn=<tên>&zp=<ảnh> hoặc #zerr=<lỗi>
// Mã người dùng Zalo trong Mini App (getUserID): dùng để người khác mở chat Zalo với mình (openChat)
async function zidLoad(){const Z=window.ZMP;if(!Z||zaloProf().zid)return;try{const id=await Z.getUserID();if(id)saveZProf({zid:String(id)})}catch(e){}}
const myZid=()=>MINI?String(zaloProf().zid||"").slice(0,64):"";
async function zChat(zid,msg){
  const Z=window.ZMP;if(zid&&Z&&Z.openChat){try{await Z.openChat({type:"user",id:String(zid),...(msg?{message:msg}:{})});return true}catch(e){}}
  toast(MINI?"Chưa mở được chat Zalo, thử lại.":"Mở Pikeco trong Zalo để nhắn tin.");return false}
async function zaloHash(){
  if(MINI){miniLogin(true).then(zidLoad);return}
  const h=String(location.hash||"");if(!/[#&](zt|zerr)=/.test(h))return;
  const q=new URLSearchParams(h.slice(1));
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  if(q.get("zerr")){setTimeout(()=>toast(q.get("zerr")),600);return}
  try{localStorage.setItem("pb-zprof",JSON.stringify({n:q.get("zn")||"",p:q.get("zp")||""}))}catch(e){}
  try{await FB.signInWithCustomToken(FB.auth,q.get("zt"));toast("Đã đăng nhập bằng Zalo")}catch(e){toast("Đăng nhập Zalo chưa được, thử lại.")}
}
// Theo dõi yêu cầu nhận hồ sơ của chính mình
function watchLink(){
  if(unsubLink){try{unsubLink()}catch(e){}unsubLink=null}S.link=undefined;
  if(legacy||!isPlayer(authUser))return;
  try{unsubLink=FB.onSnapshot(FB.doc(FB.fs,PFX+"links/"+authUser.uid),{},s=>{S.link=s.exists()?s.data():null;
    if(S.link&&S.link.status==="ok"&&S.link.pid&&ME!==S.link.pid){ME=S.link.pid;try{localStorage.setItem("pb-me-"+CID,ME)}catch(e){}}
    if(S.link)rememberClub();
    if(S.link&&MINI&&myZid()&&S.link.zid!==myZid())FB.updateDoc(FB.doc(FB.fs,PFX+"links/"+authUser.uid),{zid:myZid()}).catch(()=>{});
    render()},()=>{S.link=null;render()})}catch(e){}
}
const zaloBtn=(label)=>window.ZMP?`<button class="zalobtn" data-act="zlogin"><b>Z</b>${label&&!/Đăng nhập Zalo/.test(label)?label:"Vào bằng Zalo để đăng ký"}</button>`:PLAYER_ON()?`<button class="primary wide" data-act="zlogin">${label?label.replace("Đăng nhập Zalo để đăng ký","Tham gia để đăng ký"):"Tham gia để đăng ký giải đấu"}</button>`:`<small class="rule">Người chơi đăng ký trong Zalo Mini App của CLB.</small>`;

/* ----- Tham gia CLB: người chơi chỉ gửi tên, quản trị viên ghép với hồ sơ cũ hoặc tạo mới ----- */
function linkCard(D){
  if(MODE!=="club"||legacy||!isPlayer(authUser)||canWrite||REF)return "";
  const L=S.link,zp=zaloProf();
  if(L===undefined)return "";
  if(L&&L.status==="ok")return "";
  if(L&&L.status==="pending")return `<div class="lnkcard wait"><b>Đã gửi yêu cầu tham gia</b><span>Chủ CLB sẽ xác nhận bạn là <b>${esc(L.newName||L.zname||"")}</b>: ghép với hồ sơ cũ nếu bạn đã chơi ở CLB, hoặc tạo hồ sơ mới. Xong là bạn tự đăng ký giải đấu được.</span><button class="lnk" data-act="lnkcancel">Huỷ yêu cầu</button></div>`;
  return `<div class="lnkcard"><b>Tham gia ${esc(CLUB?.name||"CLB")}</b><span>Nhập tên mọi người ở CLB hay gọi bạn. Chủ CLB sẽ ghép với hồ sơ cũ của bạn (rating, lịch sử) hoặc tạo hồ sơ mới.</span>
    <label class="fld"><span class="lbl">Tên của bạn</span><input id="lnk-name" data-draft="lnk-name" maxlength="30" placeholder="VD: Dũng" value="${esc(val("lnk-name",zp.n||""))}"></label>
    <button class="primary wide" data-act="lnksend">Gửi yêu cầu tham gia</button></div>`;
}

/* ----- Mini App: Của tôi, các CLB đã tham gia, thanh dưới ----- */
function myClubs(){let L=[];try{L=JSON.parse(localStorage.getItem("pb-mini-clubs")||"[]").filter(x=>x&&x.id)}catch(e){}
  // Bổ sung logo, tên mới nhất từ danh sách CLB đã tải (Khám phá) hoặc CLB đang mở
  return L.map(x=>{const c=(x.id===CID&&CLUB)?CLUB:(S.clubs||[]).find(z=>z.id===x.id);return c?{...x,name:c.name||x.name,...(logoOk(c)?{logo:c.logo}:{})}:x})}
function rememberClub(){
  if(!MINI||MODE!=="club"||legacy||!CLUB)return;
  const k=CID+"|"+(S.link?S.link.status:"")+"|"+ROLE+"|"+((CLUB&&CLUB.logo)||"").length;if(rememberClub.done===k)return;rememberClub.done=k;
  try{localStorage.setItem("pb-mini-last",CID);
    const L=myClubs().filter(x=>x.id!==CID);L.unshift({id:CID,name:(CLUB&&CLUB.name)||CID,role:mxRole(),...(logoOk(CLUB)&&CLUB.logo.length<60000?{logo:CLUB.logo}:{})});localStorage.setItem("pb-mini-clubs",JSON.stringify(L.slice(0,10)))}catch(e){}
}
function vToi(D){
  const L=S.link,p=L&&L.status==="ok"&&D.pmap.get(L.pid),R=regList(D),mine=authUser&&R.all.find(x=>x.uid===authUser.uid);
  let h="";
  if(p){const s=D.st.get(p.id),A=D.all.get(p.id);
    h+=`<a class="mebox" href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}">${av(p,"md",1)}<span class="t"><small>${esc(CLUB?.name||"")}</small><b>${esc(p.name)}</b><span class="st"><i>Rating ${r2(s.rating)}</i><i>${A.ses.size} giải đấu</i></span></span><span aria-hidden="true">›</span></a>`;
    h+=`<section class="card2"><h2>Giải đấu tới</h2><div class="cb">${regOpen()?`<p class="rule">${esc(D.c.sname||"Giải đấu tới")} · ${esc(regWhen(regCfg().at))}</p><p><b>${mine?(R.all.indexOf(mine)<R.max?"✓ Bạn đã đăng ký":"Bạn đang trong danh sách chờ"):"Bạn chưa đăng ký"}</b></p>`:`<p class="rule">Chưa mở đăng ký giải đấu tới.</p>`}<a class="line wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">Mở trang đăng ký</a></div></section>`;
  }else h+=`<section class="card2"><div class="cb"><p class="rule">${L&&L.status==="pending"?"Bạn đang chờ chủ CLB duyệt.":mine&&mine.guest?"Bạn đã đăng ký làm vận động viên ngoài CLB giải đấu tới. Muốn thành thành viên CLB thì bấm Tham gia CLB.":"Bạn chưa tham gia CLB này."}</p><a class="primary wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">${L?"Xem trạng thái":"Tham gia CLB"}</a></div></section>`;
  const C=myClubs();
  h+=`<section class="card2"><h2>CLB đã vào</h2><div class="cb">${C.map(c=>`<button class="clubrow${c.id===CID?" on":""}" data-act="miniclub" data-id="${esc(c.id)}"><b>${esc(c.name)}</b><small>${c.id===CID?"Đang xem":"Chuyển sang"}</small></button>`).join("")}<button class="line wide" data-act="miniexplore">Khám phá CLB khác</button></div></section>`;
  return h;
}
function miniNav(){
  if(!MINI||MODE!=="club")return "";
  const cur=route==="vdv"?"bxh":route==="app"?tab:"dk";
  const it=(t,ic,l)=>`<button data-tab="${t}" aria-selected="${cur===t}"><span aria-hidden="true">${ic}</span>${l}</button>`;
  return `<nav class="mnav">${it("dk","✍","Đăng ký")}${it("bxh","🏆","Xếp hạng")}${it("toi","🏠","CLB")}</nav>`;
}

/* ----- Xử lý bấm ----- */
async function zaloAct(act,b,id){
  if(act==="zlogin"){zaloStart();return true}
  if(act==="miniclub"){const x=b.dataset.x;if(id===CID&&MODE==="club"){go("app",{tab:"dk",x});return true}quickNext();setPath("/"+id+(x?"/dang-ky/"+encodeURIComponent(x):""));location.reload();return true}
  if(act==="miniexplore"){quickNext();setPath("/clb");location.reload();return true}
  if(act==="openweb"){const u="https://pikeco.app"+(b.dataset.v||"/");if(window.ZMP&&window.ZMP.openWebview){try{await window.ZMP.openWebview({url:u})}catch(e){location.href=u}}else location.href=u;return true}
  if(act==="lnkcancel"){if(!armOr("lnkcancel:x"))return true;try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"links/"+authUser.uid))}catch(e){}return true}
  if(act==="lnksend"){if(!isPlayer(authUser))return true;const zp=zaloProf();
    const el=document.getElementById&&document.getElementById("lnk-name"),nn=String((el&&el.value)||drafts["lnk-name"]||zp.n||"").trim().slice(0,30);
    if(!nn){toast("Nhập tên của bạn.");return true}
    const d={status:"pending",zname:String(zp.n||"").slice(0,40),photo:String(zp.p||"").slice(0,400),at:Date.now(),newName:nn,...(myZid()?{zid:myZid()}:{})};
    try{await FB.setDoc(FB.doc(FB.fs,PFX+"links/"+authUser.uid),d);toast("Đã gửi, chờ chủ CLB duyệt")}catch(e){toast("Chưa gửi được, thử lại.")}
    return true}
  if(await withX(xCtx(),()=>regAct(act,b,id)))return true;
  if(await meAct(act,b))return true;
  if(await withX(xCtx(),()=>mxAct(act,b,id)))return true;
  return false;
}
async function zaloAdminAct(act,b,id){
  const D=derive();
  if(await xAct(act,b,id,D))return true;
  if(await withX(xCtx(),()=>regAdminAct(act,b,id,D)))return true;
  if(act==="apvpick"||act==="apvnew"){const m=act==="apvpick"?"pick":"new";if(apvOpen===id&&apvMode===m)apvOpen=null;else{apvOpen=id;apvMode=m;apvSel=null}render();return true}
  if(act==="apvp"){apvSel=apvSel===id?null:id;render();return true}
  if(act==="apvg"){drafts["apv-g"]=b.dataset.v;render();return true}
  if(act==="lnkok"){const x=(S.links||[]).find(z=>z.id===id);if(!x)return true;if(!armOr("lnkok:"+id))return true;
    const v=b.dataset.v||x.pid||"new",nw=v==="new",p=nw?null:D.pmap.get(v);
    if(!nw&&!p){toast("Không thấy hồ sơ này.");return true}
    if(p&&p.zuid&&p.zuid!==id){toast(`${p.name} đã ghép với tài khoản Zalo khác. Bỏ ghép trong hồ sơ trước.`);return true}
    await write(async()=>{let pid=v;
      if(nw){const ref=db.collection("players").doc();pid=ref.id;await ref.set({name:String(drafts["apv-name-"+id]??(x.newName||x.zname||"Người chơi")).trim().slice(0,30)||"Người chơi",gender:(drafts["apv-g"]||x.gender)==="F"?"F":"M",rating0:2.5,active:false,createdAt:Date.now(),code:"PB-"+String(nextCode()).padStart(3,"0"),zuid:id})}
      else await db.collection("players").doc(pid).update({zuid:id});
      await FB.updateDoc(FB.doc(FB.fs,PFX+"links/"+id),{status:"ok",pid});apvOpen=null;apvSel=null;delete drafts["apv-g"]},nw?"Đã tạo hồ sơ mới và duyệt":`Đã ghép với ${p.name}`);return true}
  if(act==="unzalo"){const p=D.pmap.get(id);if(!p||!p.zuid)return true;if(!armOr("unzalo:"+id))return true;
    await write(async()=>{await db.collection("players").doc(id).update({zuid:null});try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"links/"+p.zuid))}catch(e){}},"Đã bỏ ghép tài khoản Zalo");return true}
  if(act==="lnkno"){if(!armOr("lnkno:"+id))return true;await write(()=>FB.deleteDoc(FB.doc(FB.fs,PFX+"links/"+id)),"Đã từ chối");return true}
  return false;
}
