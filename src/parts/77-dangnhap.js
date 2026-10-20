/* ---------- Đăng nhập web bằng Zalo (quét mã bằng Mini App) + liên kết tài khoản Google ↔ Zalo ----------
   Web: /api/qr-login tạo mã → QR mở Mini App (&dn=<mã>) → người dùng bấm Đồng ý trong Zalo → web nhận token, vào bằng tài khoản Zalo đó.
   Liên kết: chủ CLB, quản lý tạo link mời cho chính mình (cùng quyền, 10 phút) để tài khoản còn lại cũng có quyền đó. */
let QRL=null; // {st:"new"|"wait"|"claim"|"no"|"exp"|"err",tok,s,exp,link,unsub}
const qrlLink=tok=>`https://zalo.me/s/${MINI_APP_ID}/?dn=${tok}${MODE==="club"&&!legacy?"&clb="+encodeURIComponent(CID):""}`;
const isPhone=()=>/Android|iPhone|iPad|iPod/i.test(navigator.userAgent||"");
function qrlStop(){if(QRL&&QRL.unsub){try{QRL.unsub()}catch(e){}}if(QRL&&QRL.iv)clearInterval(QRL.iv)}
async function qrlStart(){
  qrlStop();QRL={st:"new"};render();
  try{
    let j;
    if(window.FB_TARGET==="mock"){const tok=Array.from({length:48},()=>"0123456789abcdef"[Math.floor(Math.random()*16)]).join("");j={tok,s:"m",exp:Date.now()+18e4};await FB.setDoc(FB.doc(FB.fs,"qrlogin/"+tok),{st:"wait",exp:j.exp})}
    else{const r=await fetch(API+"/api/qr-login",{method:"POST",headers:{"content-type":"text/plain"},body:JSON.stringify({op:"new"})});j=await r.json().catch(()=>({}))}
    if(!j||!j.tok)throw new Error("no tok");
    QRL={st:"wait",tok:j.tok,s:j.s,exp:j.exp,link:qrlLink(j.tok)};
    QRL.unsub=FB.onSnapshot(FB.doc(FB.fs,"qrlogin/"+j.tok),{},snap=>{if(!QRL||QRL.tok!==j.tok)return;const d=snap.exists()?snap.data():null;
      if(d&&d.st==="ok")qrlClaim();else if(d&&d.st==="no"){qrlStop();QRL.st="no";render()}},()=>{});
    // Dự phòng khi không nghe được thay đổi: hỏi máy chủ mỗi 4 giây; hết hạn thì báo
    let n=0;QRL.iv=setInterval(()=>{if(!QRL||QRL.st!=="wait"){return}
      if(Date.now()>QRL.exp){qrlStop();QRL.st="exp";render();return}
      if(++n%4===0&&window.FB_TARGET!=="mock")qrlClaim(true);
      const el=document.getElementById&&document.getElementById("qrlcd");if(el)el.textContent=gdMMSS(QRL.exp-Date.now())},1000);
  }catch(e){QRL={st:"err"}}
  render();
}
async function qrlClaim(quiet){
  if(!QRL||!QRL.tok||QRL.busy)return;QRL.busy=true;
  try{
    if(window.FB_TARGET==="mock"){const s=await FB.getDoc(FB.doc(FB.fs,"qrlogin/"+QRL.tok)),d=s.exists()?s.data():{};if(d.st!=="ok")return;
      await FB.signInWithCustomToken(FB.auth,String(d.uid||"zalo_demo").replace(/^zalo_/,""));qrlDone(d.zn);setTimeout(()=>location.reload(),600);return}
    const r=await fetch(API+"/api/qr-login",{method:"POST",headers:{"content-type":"text/plain"},body:JSON.stringify({op:"claim",tok:QRL.tok,s:QRL.s})});
    const j=await r.json().catch(()=>({}));
    if(j.wait)return;
    if(j.no){qrlStop();QRL.st="no";render();return}
    if(!j.token){if(!quiet){qrlStop();QRL.st="err";render()}return}
    QRL.st="claim";render();
    await FB.signInWithCustomToken(FB.auth,j.token);qrlDone();
  }catch(e){if(!quiet){qrlStop();QRL={st:"err"};render()}}
  finally{if(QRL)QRL.busy=false}
}
function qrlDone(zn){qrlStop();QRL=null;toast(zn?`Đã đăng nhập bằng Zalo · ${zn}`:"Đã đăng nhập bằng Zalo");render()}
// Khung đăng nhập bằng Zalo trên web (đặt cạnh nút Google)
function qrlBtn(cls="zwide"){return MINI?"":`<button class="${cls}" data-act="qrl"><b class="z" aria-hidden="true">Z</b>Đăng nhập bằng Zalo</button>`}
function qrlBox(){
  if(MINI||!QRL)return "";
  const Q=QRL;let h=`<div class="qrlbox" role="region" aria-label="Đăng nhập bằng Zalo"><div class="qrlhd"><b>Đăng nhập bằng Zalo</b><button class="ghost sm" data-act="qrlx">Đóng</button></div>`;
  if(Q.st==="new")h+=`<p class="rule">Đang tạo mã…</p>`;
  else if(Q.st==="claim")h+=`<p class="rule">Đã xác nhận trên Zalo, đang đăng nhập…</p>`;
  else if(Q.st==="wait")h+=`<div class="qrlqr">${qrSvgText(Q.link,200)}</div>
    <ol class="qrlst"><li>Mở <b>Zalo</b> trên điện thoại, bấm biểu tượng <b>quét mã QR</b>.</li><li>Quét mã này, Pikeco mở ra trong Zalo.</li><li>Bấm <b>Đồng ý đăng nhập</b>.</li></ol>
    ${isPhone()?`<a class="line wide" href="${esc(Q.link)}">Đang dùng điện thoại? Mở Zalo trên máy này</a><small class="rule">Đồng ý trong Zalo rồi quay lại trình duyệt này.</small>`:""}
    <small class="rule">Mã hết hạn sau <b id="qrlcd">${gdMMSS(Q.exp-Date.now())}</b>. Quyền quản lý, hồ sơ VĐV của tài khoản Zalo dùng được ngay trên web.</small>
    ${window.FB_TARGET==="mock"?`<button class="line wide" data-act="qrlmock">(Bản thử) Giả lập bấm Đồng ý trong Zalo</button>`:""}`;
  else h+=`<p class="rule">${Q.st==="no"?"Bạn đã bấm “Không phải tôi” trong Zalo.":Q.st==="exp"?"Mã đã hết hạn.":"Chưa tạo được mã đăng nhập. Kiểm tra mạng rồi thử lại."}</p><button class="primary wide" data-act="qrl">Tạo mã mới</button>`;
  return h+`</div>`;
}

/* ----- Mini App: xác nhận đăng nhập web ----- */
let DN=null; // {tok,st:"ask"|"busy"|"ok"|"no"|"err"}
function dnParam(){
  if(!MINI)return;
  try{const t=String(new URLSearchParams(location.search||"").get("dn")||"");if(/^[0-9a-f]{48}$/.test(t)&&!sessionStorage.getItem("pb-dn-"+t))DN={tok:t,st:"ask"}}catch(e){}
}
function dnDraw(){
  if(!MINI)return;
  let el=$("#dnx");
  if(!el&&document.createElement&&document.body&&document.body.appendChild){el=document.createElement("div");el.id="dnx";document.body.appendChild(el)}
  if(!el)return;
  if(!DN){el.innerHTML="";return}
  const zl=isZaloU(authUser),nm=zaloProf().n||"",body=
    !zl?`<p>Đang vào bằng Zalo…</p><div class="cfmbtn"><button class="line" data-act="dnno">Huỷ</button><button class="primary" data-act="zlogin">Vào lại bằng Zalo</button></div>`
    :DN.st==="ok"?`<p>Đã đăng nhập trên trình duyệt. Quay lại máy tính hoặc trình duyệt để tiếp tục.</p><div class="cfmbtn"><button class="primary" data-act="dnclose">Xong</button></div>`
    :DN.st==="no"?`<p>Đã từ chối. Trình duyệt kia không vào được tài khoản của bạn.</p><div class="cfmbtn"><button class="primary" data-act="dnclose">Đóng</button></div>`
    :DN.st==="err"?`<p>Mã đăng nhập đã hết hạn hoặc đã dùng. Tạo mã mới trên trình duyệt rồi quét lại.</p><div class="cfmbtn"><button class="primary" data-act="dnclose">Đóng</button></div>`
    :`<p>Tài khoản Zalo${nm?` <b>${esc(nm)}</b>`:""} sẽ đăng nhập pikeco.app trên trình duyệt, kèm mọi quyền quản lý và hồ sơ VĐV của bạn.</p>
      <p class="dnwarn">Chỉ bấm Đồng ý khi <b>chính bạn</b> vừa mở pikeco.app và đang thấy mã QR. Người lạ nhờ quét mã là để chiếm tài khoản.</p>
      <div class="cfmbtn"><button class="line" data-act="dnno" ${DN.st==="busy"?"disabled":""}>Không phải tôi</button><button class="primary" data-act="dnok" ${DN.st==="busy"?"disabled":""}>Đồng ý đăng nhập</button></div>`;
  el.innerHTML=`<div class="cfmdim"></div><div class="cfmbox p dnbox" role="alertdialog" aria-modal="true" aria-labelledby="dnt"><span class="cfmic" aria-hidden="true">🖥</span><h2 id="dnt">Đăng nhập trên trình duyệt?</h2>${body}</div>`;
}
async function dnAct(act){
  if(act==="dnclose"){DN=null;dnDraw();return true}
  if(!DN)return true;
  const used=()=>{try{sessionStorage.setItem("pb-dn-"+DN.tok,"1")}catch(e){}};
  if(act==="dnno"){if(!isZaloU(authUser)){used();DN=null;dnDraw();return true}
    DN.st="busy";dnDraw();try{await FB.updateDoc(FB.doc(FB.fs,"qrlogin/"+DN.tok),{st:"no"});DN.st="no"}catch(e){DN.st="err"}used();dnDraw();return true}
  if(act==="dnok"){if(!isZaloU(authUser))return true;DN.st="busy";dnDraw();
    try{await FB.updateDoc(FB.doc(FB.fs,"qrlogin/"+DN.tok),{st:"ok",uid:authUser.uid,zn:String(zaloProf().n||"").slice(0,40),okAt:Date.now()});DN.st="ok"}catch(e){DN.st="err"}
    used();dnDraw();return true}
  return true;
}

/* ----- Liên kết tài khoản: Google ↔ Zalo, cùng quyền trong CLB ----- */
let ALNK=null; // {tok,exp,toZ}
function acctLinkCard(){
  if(legacy||!isAdm()||!authUser)return "";
  const u=authUser,toZ=isGoogle(u);if(!toZ&&!isZaloU(u))return "";
  const L=ALNK&&ALNK.exp>Date.now()?ALNK:null,role=ROLE_LB[ROLE]||"";
  let h=`<section class="card2 alnk"><h2>${toZ?"Liên kết Zalo":"Liên kết Google"}</h2><div class="cb">
    <p class="rule">${toZ?`Dùng Pikeco trong Zalo với cùng quyền <b>${esc(role)}</b>: tạo mã, quét bằng Zalo trên điện thoại là xong. Sau này trên máy tính bạn cũng đăng nhập được bằng Zalo (quét mã).`
      :`Quản lý trên máy tính bằng tài khoản Google với cùng quyền <b>${esc(role)}</b>. Hoặc không cần Google: trên máy tính chọn <b>Đăng nhập bằng Zalo</b> rồi quét mã.`}</p>`;
  if(!L)h+=`<button class="primary wide" data-act="alnk">${toZ?"Tạo mã liên kết Zalo":"Tạo link liên kết Google"}</button>`;
  else{const zl=`${miniLink(CID)}&moi=${L.tok}`,web=absUrl(`/${CID}/moi/${L.tok}`);
    h+=toZ?`<div class="qrlqr">${qrSvgText(zl,180)}</div><small class="rule">Quét bằng Zalo trên điện thoại của bạn. Hết hạn sau 10 phút, dùng một lần.</small>${isPhone()?`<a class="line wide" href="${esc(zl)}">Mở Zalo trên máy này</a>`:""}`
      :`<div class="linkrow"><span>${esc(web.replace(/^https?:\/\//,""))}</span><button class="primary" data-act="cp" data-v="${esc(web)}">Copy</button></div><small class="rule">Mở link bằng Chrome/Safari trên máy tính, đăng nhập Google là nhận quyền. Hết hạn sau 10 phút.</small>`;
    h+=`<button class="ghost wide" data-act="alnkx">Huỷ mã</button>`}
  return h+`</div></section>`;
}
async function alnkAct(act){
  if(act==="alnkx"){if(ALNK){try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"invites/"+ALNK.tok))}catch(e){}}ALNK=null;render();return true}
  if(act!=="alnk"||!isAdm())return true;
  const tok=Array.from(crypto.getRandomValues(new Uint8Array(12)),b=>b.toString(16).padStart(2,"0")).join(""),exp=Date.now()+10*60e3;
  try{await FB.setDoc(FB.doc(FB.fs,PFX+"invites/"+tok),{role:ROLE,exp,by:authUser.uid,at:Date.now(),link:true});ALNK={tok,exp};render()}
  catch(e){toast("Chưa tạo được mã liên kết, thử lại.")}
  return true;
}
async function loginAct(act,b){
  if(act==="qrl"){qrlStart();return true}
  if(act==="qrlx"){qrlStop();QRL=null;render();return true}
  if(act==="qrlmock"){if(QRL&&QRL.tok){await FB.updateDoc(FB.doc(FB.fs,"qrlogin/"+QRL.tok),{st:"ok",uid:"zalo_demo-ql",zn:"Người dùng Zalo"});qrlClaim()}return true}
  if(/^dn/.test(act))return dnAct(act);
  if(act==="alnk"||act==="alnkx")return alnkAct(act);
  return false;
}
dnParam();
