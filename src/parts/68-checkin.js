/* ---------- Check-in: người chơi quét mã đang hiện trên máy ban tổ chức ----------
   Máy BTC: mở "Mã check-in", mã đổi mỗi 30 giây (ci/{sid} = {code, exp}).
   Người chơi: quét bằng Zalo (link zalo.me/s/…&ci=…) hoặc nút "Quét mã check-in" trong vé → reg.ci.
   Máy BTC bật thẻ có ảnh để so mặt → Đúng người: reg.arrived (arrBy "qr"). BTC cũng check-in tay được (arrBy "btc"). */
const CI_MS=30e3,CI_GRACE=20e3;
let ciOpen=null,ciCode="",ciEnd=0,ciTimer=null;
const ckSched=()=>xCur()||xToday()[0]||null;
const ckRegs=X=>X?(S.regs||[]).filter(r=>r.sid===X.id&&!r.cancel):[];
// Chờ BTC duyệt: đã quét mã, chưa được xác nhận (mọi giải đấu đang mở đăng ký trong máy)
const ckPending=()=>(S.regs||[]).filter(r=>!r.cancel&&r.ci&&!r.arrived&&typeof r.sid==="string").sort((a,b)=>(a.ci||0)-(b.ci||0));
const ckRand=()=>{const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let s="";const R=(typeof crypto!=="undefined"&&crypto.getRandomValues)?crypto.getRandomValues(new Uint8Array(6)):Array.from({length:6},()=>Math.floor(Math.random()*256));for(const v of R)s+=A[v%A.length];return s};
const ckLink=(sid,code)=>miniLink(CID,sid)+"&ci="+code;
const ckQrImg=(txt,n=480)=>`https://api.qrserver.com/v1/create-qr-code/?size=${n}x${n}&margin=8&data=${encodeURIComponent(txt)}`;
async function ckRotate(){
  if(!ciOpen||!window.FB)return;
  const code=ckRand(),now=Date.now();
  try{await FB.setDoc(FB.doc(FB.fs,PFX+"ci/"+ciOpen),{code,exp:now+CI_MS+CI_GRACE,at:now});ciCode=code;ciEnd=now+CI_MS;render()}catch(e){toast("Chưa tạo được mã check-in, kiểm tra mạng.")}
}
function ckStart(sid){ckStop();ciOpen=sid;ciCode="";ckRotate();if(typeof setInterval==="function")ciTimer=setInterval(ckRotate,CI_MS)}
function ckStop(){if(ciTimer)clearInterval(ciTimer);ciTimer=null;const was=ciOpen;ciOpen=null;ciCode="";
  if(was&&window.FB&&canWrite)FB.setDoc(FB.doc(FB.fs,PFX+"ci/"+was),{code:"",exp:0,at:Date.now()}).catch(()=>{})}
// Ảnh để so mặt: thành viên dùng ảnh hồ sơ, VĐV ngoài CLB dùng ảnh lúc đăng ký (tải khi cần)
const ckPics={};
function ckPic(D,r,cls="ckpic"){
  const p=r.pid?D.pmap.get(r.pid):null;
  if(p&&p.photo)return `<span class="${cls}"><img src="${esc(p.photo)}" alt=""></span>`;
  if(r.guest){if(ckPics[r.id]===undefined&&window.FB){ckPics[r.id]=null;FB.getDoc(FB.doc(FB.fs,PFX+"regpics/"+r.id)).then(s=>{ckPics[r.id]=s.exists()?s.data().img:"";render()}).catch(()=>{ckPics[r.id]=""})}
    if(ckPics[r.id])return `<span class="${cls}"><img src="${esc(ckPics[r.id])}" alt=""></span>`}
  return `<span class="${cls} none">${esc(String(r.name||p?.name||"?").trim().charAt(0).toUpperCase())}</span>`;
}
const ckName=(D,r)=>r.pid?(D.pmap.get(r.pid)?.name||r.name||"?"):(r.name||"?");
function ckStats(D,X){
  const L=withX(X,()=>regList(D).conf),arr=L.filter(r=>r.arrived).length,pend=L.filter(r=>r.ci&&!r.arrived).length;
  const due=withX(X,()=>L.filter(r=>r.pay!=="ok"&&r.pay!=="sent").reduce((a,r)=>a+feeOf(r),0));
  return {L,arr,pend,due};
}
const ckCounts=(D,X)=>{const s=ckStats(D,X);return `<div class="ckcnt"><span><b>${s.arr}<small>/${s.L.length}</small></b><small>ĐÃ TỚI</small></span><span><b class="y">${s.pend}</b><small>CHỜ DUYỆT</small></span><span><b>${fmtK(s.due)}</b><small>CẦN THU</small></span></div>`};

/* ----- Thẻ check-in ở đầu tab Sân ----- */
function ckCard(D){
  const X=ckSched();if(!X||!isAdm()||!ckRegs(X).length)return "";
  const live=phaseOf(D)==="live",left=X.at?X.at-Date.now():0,s=ckStats(D,X),P=ckPending().filter(r=>r.sid===X.id);
  const st=left>0?`Đang mở · bắt đầu sau ${left>=36e5?`${Math.floor(left/36e5)} giờ `:""}${Math.round(left%36e5/6e4)}′`:live?"Giải đấu đang diễn ra":"Đang mở";
  if(live)return `<button class="ckmini" data-act="ckopen" data-id="${esc(X.id)}"><b>Check-in · ${s.arr}/${s.L.length}</b><span>${P.length?`${P.length} chờ duyệt · `:""}Mở mã cho người tới muộn ›</span></button>`;
  return `<div class="ckcard"><div class="h"><small>CHECK-IN · ${esc(xName(X)).toUpperCase()} · ${X.at?hm(X.at):""}</small><b>${st}</b></div>${ckCounts(D,X)}
    <button class="ckgo" data-act="ckopen" data-id="${esc(X.id)}">⌗ MỞ MÃ CHECK-IN</button></div>`
    +P.slice(0,2).map(r=>`<div class="ckrow">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b> vừa quét mã · chờ bạn duyệt</span><button class="ckbtn" data-act="ckview" data-id="${esc(r.id)}">DUYỆT</button></div>`).join("");
}

/* ----- Màn mã QR trên máy BTC ----- */
function ckScreen(D){
  const X=schedById(ciOpen);if(!X)return "";
  const L=withX(X,()=>regList(D).conf),rec=L.filter(r=>r.arrived).sort((a,b)=>(b.arrivedAt||0)-(a.arrivedAt||0));
  const notYet=L.filter(r=>!r.arrived&&!r.ci);
  let h=`<div class="ckscr"><div class="ckhd"><button class="ckx" data-act="ckclose" aria-label="Đóng">‹</button><b>Check-in · ${esc(xName(X))}</b></div>
    <div class="ckqr"><span class="hint">Mở <b>Zalo</b> → bấm <b>quét mã</b> → hướng vào đây</span>
      <span class="box">${ciCode?`<img src="${esc(ckQrImg(ckLink(X.id,ciCode)))}" alt="Mã check-in" width="240" height="240">`:`<span class="sk" style="width:240px;height:240px"></span>`}</span>
      <span class="cd">Mã tự đổi sau <b data-cd="${ciEnd}">${gdMMSS(ciEnd-Date.now())}</b></span></div>
    <div class="ckbody">${ckCounts(D,X)}`;
  if(rec.length)h+=`<div class="cklist"><span class="xsec">Vừa check-in</span>${rec.slice(0,4).map(r=>`<div class="ckli">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b><small>${r.arrivedAt?hm(r.arrivedAt):""} · ${r.arrBy==="btc"?"BTC check-in tay":"quét mã"} · ${r.pay==="ok"?"đã trả":r.pay==="sent"?"chờ xác nhận phí":"chưa trả"}</small></span><span class="ckby ${r.arrBy==="btc"?"btc":"qr"}">${r.arrBy==="btc"?"✋ TAY":"⌗ QR"}</span></div>`).join("")}</div>`;
  if(notYet.length)h+=`<div class="cklist"><span class="xsec">Chưa tới · ${notYet.length}</span>${notYet.map(r=>`<div class="ckli">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b><small>${r.guest?"VĐV ngoài CLB":"Thành viên"} · ${r.pay==="ok"?"đã trả":r.pay==="sent"?"chờ xác nhận phí":"chưa trả"}</small></span><button class="ckbtn line" data-act="ckman" data-id="${esc(r.id)}">Check-in tay</button></div>`).join("")}</div>`;
  h+=`<span class="gdnote">Để máy dựng trên bàn, màn hình luôn sáng. Ai quét xong, thẻ của người đó bật lên để bạn so ảnh. Check-in tay chỉ dùng khi cần nhanh: hiện khác màu để phân biệt.</span></div></div>`;
  gdTick();
  return h;
}

/* ----- Thẻ duyệt bật lên ở mọi trang quản lý ----- */
let ckSel=null;
function ckPopup(D){
  if(!canWrite||legacy)return "";
  const P=ckPending();if(!P.length){ckSel=null;return ""}
  const r=P.find(x=>x.id===ckSel)||P[0],X=schedById(r.sid);if(!X)return "";
  const k=withX(X,()=>feeOf(r)),paid=r.pay==="ok",sent=r.pay==="sent",pos=withX(X,()=>regList(D).all.indexOf(r)),p=r.pid?D.pmap.get(r.pid):null;
  const lv=r.guest?r.lv:p?r2(D.st.get(p.id)?.rating||+p.rating0||0):"";
  const rest=P.filter(x=>x!==r);
  return `<div class="ckdim"></div><div class="ckpop" role="dialog" aria-label="Duyệt check-in">
    <div class="ckph"><span class="live">● VỪA QUÉT MÃ · ${r.ci?hm(r.ci):""}</span>${rest.length?`<span class="more">+${rest.length} đang chờ</span>`:""}</div>
    <div class="ckpb">${ckPic(D,r,"ckpic xl")}<span class="t"><b>${esc(ckName(D,r))}</b><small>${r.guest?"VĐV ngoài CLB":"Thành viên"}${r.gender?` · ${r.gender==="F"?"Nữ":"Nam"}`:""}${lv?` · ${esc(String(lv))}`:""}</small><small>${esc(xName(X))} · vé #${pos+1}</small>
      <span class="pay ${paid?"ok":sent?"sent":"due"}">${paid?`✓ Đã trả ${kVND(k)}`:sent?`Đã báo chuyển ${kVND(k)} · chờ xác nhận`:k?`Còn thiếu ${kVND(k)}`:"Miễn phí"}</span></span></div>
    <span class="ckq">Nhìn người trước mặt: có đúng như ảnh?</span>
    <div class="ckbtns"><button class="ckno" data-act="ckno" data-id="${esc(r.id)}">KHÔNG PHẢI</button><button class="ckok" data-act="ckok" data-id="${esc(r.id)}">✓ ĐÚNG NGƯỜI</button></div>
    ${!paid&&k?`<div class="ckcash"><span>${sent?"Đã báo chuyển khoản":"Chưa trả"}: thu tại bàn?</span><button class="ckbtn line" data-act="ckcash" data-id="${esc(r.id)}">${sent?"ĐÃ NHẬN TIỀN":"ĐÃ THU TIỀN MẶT"}</button></div>`:""}
    ${rest.length?`<div class="cknext">${rest.slice(0,2).map(x=>`<button class="ckli" data-act="ckview" data-id="${esc(x.id)}">${ckPic(D,x,"ckpic s")}<span class="t"><b>${esc(ckName(D,x))}</b><small>${x.guest?"ngoài CLB":"thành viên"}</small></span><span class="gdnote">kế tiếp</span></button>`).join("")}</div>`:""}</div>`;
}
// Đã tới: điểm danh vào giải đấu (VĐV ngoài CLB được tạo hồ sơ khách)
async function ckAttend(D,r){
  let pid=r.pid;
  if(r.guest&&!pid){const ref=db.collection("players").doc();pid=ref.id;
    await ref.set({name:r.name||"Vận động viên",gender:r.gender==="F"?"F":"M",rating0:Math.min(8,Math.max(1,+r.lv||2.5)),active:true,guest:true,createdAt:Date.now(),code:"PB-"+String(nextCode()).padStart(3,"0")});
    await db.collection("regs").doc(r.id).update({pid})}
  else if(pid){const p=D.pmap.get(pid);if(p&&p.active===false)await db.collection("players").doc(pid).update({active:true})}
}
async function ckAct(act,b,id){
  if(!canWrite)return false;
  if(act==="ckopen"){ckStart(id);render();try{window.scrollTo(0,0)}catch(e){}return true}
  if(act==="ckclose"){ckStop();render();return true}
  if(act==="ckview"){ckSel=id;render();return true}
  const D=derive(),r=(S.regs||[]).find(x=>x.id===id);
  if(act==="ckok"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"qr",arrivedAt:Date.now()});await ckAttend(D,r)},`${ckName(D,r)} đã vào giải đấu`);ckSel=null;return true}
  if(act==="ckno"&&r){await write(()=>db.collection("regs").doc(r.id).update({ci:0,ciCode:""}),"Đã bỏ lượt quét này");ckSel=null;return true}
  if(act==="ckman"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"btc",arrivedAt:Date.now()});await ckAttend(D,r)},`Đã check-in tay ${ckName(D,r)}`);return true}
  if(act==="ckcash"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({pay:"ok",okAt:Date.now(),okBy:who()});if(r.pid&&xPaySid(r,D))await savePay(D.sid,nx=>{nx.paid[r.pid]=true})},"Đã ghi nhận đã thu");return true}
  return false;
}

/* ----- Người chơi: gửi check-in sau khi quét ----- */
function ckParam(){
  try{const q=new URLSearchParams(location.search||""),c=q.get("ci"),x=q.get("buoi");if(c&&x&&!sessionStorage.getItem("pb-ci-used-"+c))sessionStorage.setItem("pb-ci",JSON.stringify({c,x}))}catch(e){}
}
let ckBusy=false;
async function ckPlayer(D){
  if(ckBusy||!MINI||MODE!=="club"||!authUser||!isPlayer(authUser)||!S.regs||!S.schedReady)return;
  let p=null;try{p=JSON.parse(sessionStorage.getItem("pb-ci")||"null")}catch(e){}
  if(!p||!p.c||!p.x)return;
  ckBusy=true;try{sessionStorage.removeItem("pb-ci");sessionStorage.setItem("pb-ci-used-"+p.c,"1")}catch(e){}
  const X=schedById(p.x);
  if(!X){toast("Mã check-in không thuộc CLB này.");ckBusy=false;return}
  const mine=gdMine(X);
  if(!mine){toast("Bạn chưa đăng ký giải đấu này. Đăng ký rồi quét lại nhé.");go("app",{tab:"dk",x:X.id});ckBusy=false;return}
  if(mine.arrived){toast("Bạn đã check-in rồi ✓");go("app",{tab:"dk",x:X.id});ckBusy=false;return}
  try{await FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id),{ci:Date.now(),ciCode:p.c});toast("Đã check-in · chờ ban tổ chức xác nhận");gdInfo=false;go("app",{tab:"dk",x:X.id})}
  catch(e){toast("Mã đã hết hạn. Quét lại mã đang hiện trên máy ban tổ chức.")}
  ckBusy=false;
}
// Nút "Quét mã check-in" trong vé: mở camera quét ngay trong Mini App
async function ckScan(){
  const Z=window.ZMP;if(!Z||!Z.scanQRCode){toast("Mở bằng Zalo để quét mã.");return}
  let t="";try{const r=await Z.scanQRCode();t=String((r&&r.content)||"")}catch(e){return}
  let u;try{u=new URL(t)}catch(e){toast("Đây không phải mã check-in.");return}
  const q=u.searchParams,c=q.get("ci"),x=q.get("buoi"),clb=String(q.get("clb")||"").toLowerCase();
  if(!c||!x||!clb){toast("Đây không phải mã check-in.");return}
  try{sessionStorage.setItem("pb-ci",JSON.stringify({c,x}))}catch(e){}
  if(clb!==CID){quickNext();setPath("/"+clb+"/dang-ky/"+encodeURIComponent(x));location.reload();return}
  ckPlayer(derive());
}

// Tab Sân của ban tổ chức: màn mã check-in khi đang mở, thẻ check-in khi giải đấu đang diễn ra
const vSanCk=D=>ciOpen&&canWrite?ckScreen(D):(canWrite&&phaseOf(D)==="live"?ckCard(D):"")+(isG(D.c)?vGiaiSan:vSan)(D);
if(MINI)ckParam();
