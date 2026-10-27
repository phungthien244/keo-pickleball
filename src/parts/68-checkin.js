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
  try{await FB.setDoc(FB.doc(FB.fs,PFX+"ci/"+ciOpen),{code,exp:now+CI_MS+CI_GRACE,at:now});ciCode=code;ciEnd=now+CI_MS;ckRot++;render()}catch(e){toast("Chưa tạo được mã check-in, kiểm tra mạng.")}
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
  const L=ckList(D,X),arr=L.filter(r=>r.arrived).length,pend=L.filter(r=>r.ci&&!r.arrived).length;
  const due=withX(X,()=>L.filter(r=>r.pay!=="ok"&&r.pay!=="sent").reduce((a,r)=>a+feeOf(r),0));
  return {L,arr,pend,due};
}
const ckCounts=(D,X)=>{const s=ckStats(D,X);return `<div class="ckcnt"><span><b>${s.arr}<small>/${s.L.length}</small></b><small>ĐÃ TỚI</small></span><span><b class="y">${s.pend}</b><small>CHỜ DUYỆT</small></span><span><b>${fmtK(s.due)}</b><small>CẦN THU</small></span></div>`};

/* ----- Thẻ check-in ở đầu tab Sân ----- */
function ckCard(D){
  const X=ckSched();if(!X||!isAdm())return "";
  const late=`<button class="cklate" data-act="hnlate" data-id="${esc(X.id)}">＋ Người đến muộn</button>`;
  const live=phaseOf(D)==="live",left=X.at?X.at-Date.now():0,s=ckStats(D,X),P=ckPending().filter(r=>r.sid===X.id);
  const st=left>0?`Đang mở · bắt đầu sau ${left>=36e5?`${Math.floor(left/36e5)} giờ `:""}${Math.round(left%36e5/6e4)}′`:live?"Giải đấu đang diễn ra":"Đang mở";
  if(live)return `<button class="ckmini" data-act="ckopen" data-id="${esc(X.id)}"><b>Check-in · ${s.arr}/${s.L.length}</b><span>${P.length?`${P.length} chờ duyệt · `:""}Mở mã cho người tới muộn ›</span></button>${late}`;
  return `<div class="ckcard"><div class="h"><small>CHECK-IN · ${esc(xName(X)).toUpperCase()} · ${X.at?hm(X.at):""}</small><b>${st}</b></div>${ckCounts(D,X)}
    <button class="ckgo" data-act="ckopen" data-id="${esc(X.id)}">⌗ MỞ MÃ CHECK-IN</button>${late}${hnOpts(X)}</div>`
    +P.slice(0,2).map(r=>`<div class="ckrow">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b> vừa quét mã · chờ bạn duyệt</span><button class="ckbtn" data-act="ckview" data-id="${esc(r.id)}">DUYỆT</button></div>`).join("");
}

/* ----- Màn mã QR toàn màn hình trên máy BTC ----- */
let ckRot=0,ckListOpen=false,ckWake=null;
function ckWakeOn(){try{if(!ckWake&&navigator.wakeLock)navigator.wakeLock.request("screen").then(w=>{ckWake=w}).catch(()=>{})}catch(e){}}
function ckWakeOff(){try{if(ckWake)ckWake.release()}catch(e){}ckWake=null}
const ckPayLb=r=>r.pay==="ok"?"đã trả":r.pay==="sent"?"đã báo chuyển":"chưa trả";
function ckScreen(D){
  const X=schedById(ciOpen);if(!X)return "";
  const L=ckList(D,X),s=ckStats(D,X),rec=L.filter(r=>r.arrived).sort((a,b)=>(b.arrivedAt||0)-(a.arrivedAt||0));
  const notYet=L.filter(r=>!r.arrived&&!r.ci),left=Math.max(0,ciEnd-Date.now());
  const bar=`<i style="animation:ckbar${ckRot%2} ${CI_MS}ms linear forwards;animation-delay:-${CI_MS-left}ms"></i>`;
  let h=`<div class="ckfs" role="dialog" aria-label="Mã check-in"><div class="ckfh"><button class="ckx" data-act="ckclose" aria-label="Đóng">✕</button><span class="t"><b>${esc(xName(X))}</b><small>${esc(CLUB?.name||"")}${X.at?` · ${hm(X.at)}`:""}</small></span></div>
    <div class="ckfm"><b class="ckbig">QUÉT ĐỂ CHECK-IN</b><span class="hint">Mở <b>Zalo</b> → <b>Quét mã QR</b> → hướng vào đây</span>
      <span class="box">${ciCode?`<img src="${esc(ckQrImg(ckLink(X.id,ciCode),600))}" alt="Mã check-in">`:`<span class="sk"></span>`}</span>
      <span class="ckbar">${ciCode?bar:""}</span><span class="cd"><span>Mã tự đổi sau <b data-cd="${ciEnd}">${gdMMSS(left)}</b> · chụp lại không dùng được</span><span>☀ luôn sáng</span></span></div>
    <div class="ckff"><div class="ckcnt">${(()=>{if(!(MINI&&(pairRegOn(X)||kOn(X))))return `<span><b>${s.arr}<small>/${s.L.length}</small></b><small>ĐÃ TỚI</small></span>`;
      const seen=new Set();let f=0,t=0;for(const r of L){if(seen.has(r.id))continue;const m=capMate(r);seen.add(r.id);if(m)seen.add(m.id);t++;if(r.arrived&&(!m||m.arrived))f++}
      return `<span><b>${f}<small>/${t} cặp</small></b><small>ĐỦ NGƯỜI</small></span>`})()}<span><b class="y">${s.pend}</b><small>CHỜ DUYỆT</small></span><span><b>${fmtK(s.due)}</b><small>CÒN PHẢI THU</small></span></div>
      ${MINI?"":`<button class="ckmore" data-act="cklist">${ckListOpen?"Ẩn danh sách ⌄":"Danh sách · check-in tay ⌃"}</button>`}`;
  if(ckListOpen&&!MINI){h+=`<div class="ckls">`;
    if(notYet.length)h+=`<span class="xsec">Chưa tới · ${notYet.length}</span>${notYet.map(r=>`<div class="ckli">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b><small>${r.guest?"VĐV ngoài CLB":"Thành viên"} · ${ckPayLb(r)}</small></span><button class="ckbtn line" data-act="ckman" data-id="${esc(r.id)}">Check-in tay</button></div>`).join("")}`;
    if(rec.length)h+=`<span class="xsec">Đã tới · ${rec.length}</span>${rec.map(r=>`<div class="ckli">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b><small>${r.arrivedAt?hm(r.arrivedAt):""} · ${ckPayLb(r)}</small></span><span class="ckby ${r.arrBy==="btc"?"btc":"qr"}">${r.arrBy==="btc"?"✋ TAY":"⌗ QR"}</span><button class="ckbtn line ckun" data-act="ckundo" data-id="${esc(r.id)}">Hoàn tác</button></div>`).join("")}`;
    h+=`<span class="gdnote">Check-in tay chỉ dùng khi cần nhanh: hiện "✋ TAY" để phân biệt với người tự quét.</span></div>`}
  h+=`</div></div>`;
  gdTick();
  return h;
}

/* ----- Thẻ duyệt toàn màn hình: ảnh to, tiền to ----- */
let ckSel=null,ckQR=null;
function ckPopup(D){
  if(!canWrite||legacy)return "";
  const P=ckPending();if(!P.length){ckSel=null;ckQR=null;return ""}
  const r=P.find(x=>x.id===ckSel)||P[0],X=schedById(r.sid);if(!X)return "";
  const k=withX(X,()=>feeOf(r)),paid=r.pay==="ok"||!k,sent=!paid&&r.pay==="sent",pos=withX(X,()=>regList(D).all.indexOf(r)),p=r.pid?D.pmap.get(r.pid):null;
  const lv=r.guest?r.lv:p?r2(D.st.get(p.id)?.rating||+p.rating0||0):"",nm=ckName(D,r),note=payNoteX(X,nm||"KHACH");
  const rest=P.filter(x=>x!==r),id=esc(r.id),first=String(nm).trim().split(/\s+/).pop();
  // Vãng lai xin vào: khách ngoài CLB phải trả trước (nếu bật), cảnh báo đủ chỗ, giải cặp đang chạy chỉ thay cặp vắng
  const RL=withX(X,()=>regList(D)),present=RL.all.filter(x=>x.arrived).length,full=RL.max<999&&present>=RL.max&&pos>=RL.max;
  const mustPay=r.guest&&hnPayFirst(X)&&k>0,gRun=isG(cfg())&&cfg().schedId===X.id&&(cfg().giai||{}).locked;
  const warn=(r.walkin?`<div class="ckwarn"><b>XIN VÀO · chưa đăng ký trước</b>${full?`<span>Đã đủ ${RL.max} người có mặt · nhận thêm sẽ vượt số chỗ.</span>`:""}${gRun?`<span>Giải cặp đang chạy: chỉ nhận để thay vào cặp vắng.</span>`:""}</div>`:full?`<div class="ckwarn"><span>Người chờ chỗ · đã đủ ${RL.max} người có mặt.</span></div>`:"");
  if(ckQR===r.id&&!paid)return `<div class="ckpf ckpq" role="dialog" aria-label="Mã chuyển khoản"><div class="ckqh"><button class="ckx" data-act="ckqrx" aria-label="Quay lại">‹</button>${ckPic(D,r,"ckpic s")}<b>${esc(nm)} · vé #${pos+1}</b></div>
    <div class="ckqm"><small>QUÉT BẰNG APP NGÂN HÀNG</small><b class="ckamt">${kVND(k)}</b>${vqrSvg(Math.round(k*1000),note,320)}
      <div class="ckqi"><span><span>Ngân hàng</span><b>${esc(BANK.name||"")} · ${esc(BANK.holder||"")}</b></span><span><span>Nội dung</span><b class="lose">${esc(note)}</b></span></div></div>
    <div class="ckpa"><span class="gdnote">Quay màn hình về phía người chơi. Thấy tiền vào thì bấm:</span><button class="ckgo2" data-act="ckpaidok" data-id="${id}">✓ ĐÃ NHẬN TIỀN · CHECK-IN</button></div></div>`;
  const band=paid?`<div class="ckband ok"><span class="ic">✓</span><span class="t"><b>${k?`ĐÃ TRẢ ${kVND(k)}`:"MIỄN PHÍ"}</b><small>${k?(r.okAt?`BTC xác nhận lúc ${hm(r.okAt)}`:"BTC đã xác nhận"):"Giải đấu này không thu phí"}</small></span></div><div class="ckask">Nhìn người trước mặt: <b>có đúng như ảnh?</b></div>`
    :sent?`<div class="ckband sent"><small>⏳ ĐÃ BÁO CHUYỂN KHOẢN · CHƯA ĐỐI CHIẾU</small><b>${kVND(k)}</b><span>Mở app ngân hàng, tìm khoản có nội dung:</span><em>${esc(note)}</em></div>
      <div class="ckchk"><button data-act="ckcash" data-id="${id}" class="w">✓ ĐÃ THẤY TIỀN</button><button data-act="ckunsent" data-id="${id}" class="l">CHƯA THẤY · THU LẠI</button></div>`
    :`<div class="ckband due"><small>CHƯA THANH TOÁN</small><b>${kVND(k)}</b></div><div class="ckmsg">Chào ${esc(first)} 👋 Nhờ bạn gửi lệ phí <b>${kVND(k)}</b> trước khi vào sân nhé. Tiền mặt hoặc quét QR đều được. Cảm ơn bạn!</div>`;
  const acts=(!paid&&!sent?`<div class="ckpay2"><button data-act="ckcash" data-id="${id}">💵 THU TIỀN MẶT</button><button class="b" data-act="ckqr" data-id="${id}">▦ HIỆN QR TRẢ</button></div>`:"")
    +`<div class="ckbtns"><button class="ckno" data-act="ckno" data-id="${id}">✕ ${r.walkin?"TỪ CHỐI":"KHÔNG PHẢI"}</button>${!paid&&!sent&&mustPay?"":`<button class="ckok${!paid&&!sent?" later":""}" data-act="${!paid&&!sent?"cklater":"ckok"}" data-id="${id}">${!paid&&!sent?"✓ ĐÚNG · TRẢ SAU":r.walkin?"✓ NHẬN VÀO GIẢI":"✓ ĐÚNG NGƯỜI"}</button>`}</div>`;
  return `<div class="ckpf" role="dialog" aria-label="Duyệt check-in"><div class="ckimg">${ckPic(D,r,"ckpic fs")}<span class="ckgr"></span>
      <span class="ckt"><span class="live">● VỪA QUÉT · ${r.ci?hm(r.ci):""}</span>${rest.length?`<button class="more" data-act="ckview" data-id="${esc(rest[0].id)}">+${rest.length} đang chờ ›</button>`:""}</span>
      <span class="cknm"><b>${esc(nm)}</b><small>${r.guest?"VĐV ngoài CLB":"Thành viên"}${r.gender?` · ${r.gender==="F"?"Nữ":"Nam"}`:p?` · ${p.gender==="F"?"Nữ":"Nam"}`:""}${lv?` · ${esc(String(lv))}`:""} · Vé #${pos+1}${!paid&&!sent&&!r.guest?" · chọn trả tại sân":""}</small></span></div>
    ${warn}${(()=>{const m=capMate(r);if(!m)return "";const kd=kdOf(X),gx=(kd.groups||[]).findIndex(g=>g.includes(r.team));
      return `<div class="ckcap"><span>Cặp <b>${esc(nm)} &amp; ${esc(ckName(D,m))}</b>${gx>=0?` · Bảng ${KOG[gx]}`:""}</span><b class="${m.arrived?"ok":""}">${m.arrived?"đủ người":`còn chờ ${esc(ckName(D,m))}`}</b></div>`})()}${band}<div class="ckpa">${acts}</div></div>`;
}
// Đã tới: điểm danh vào giải đấu (VĐV ngoài CLB được tạo hồ sơ khách)
async function ckAttend(D,r){
  let pid=r.pid;
  if(r.guest&&!pid){const ref=db.collection("players").doc();pid=ref.id;
    await ref.set({name:r.name||"Vận động viên",gender:r.gender==="F"?"F":"M",rating0:Math.min(8,Math.max(1,+r.lv||2.5)),active:true,guest:true,createdAt:Date.now(),code:"PB-"+String(nextCode()).padStart(3,"0")});
    await db.collection("regs").doc(r.id).update({pid})}
  else if(pid){const p=D.pmap.get(pid);if(p&&p.active===false)await db.collection("players").doc(pid).update({active:true})}
  return pid;
}
async function ckAct(act,b,id){
  if(!canWrite)return false;
  if(act==="ckopen"){ckStart(id);ckListOpen=false;ckWakeOn();render();try{window.scrollTo(0,0)}catch(e){}return true}
  if(act==="ckclose"){ckStop();ckWakeOff();render();return true}
  if(act==="cklist"){ckListOpen=!ckListOpen;render();return true}
  if(act==="ckview"){ckSel=id;ckQR=null;render();return true}
  if(act==="ckqr"){ckSel=id;ckQR=id;render();return true}
  if(act==="ckqrx"){ckQR=null;render();return true}
  const D=derive(),r=(S.regs||[]).find(x=>x.id===id);
  if(r&&["ckok","cklater","ckno","ckman","ckunsent","ckpaidok","ckcash","ckundo"].includes(act)&&!armOr(act+":"+id))return true;
  if(act==="cklater"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"qr",arrivedAt:Date.now()});await ckAttend(D,r)},`${ckName(D,r)} đã vào giải đấu · nhớ thu lệ phí sau`);ckSel=null;ckQR=null;return true}
  if(act==="ckundo"&&r){const pid=r.pid;if(pid&&D.playing.some(m=>[...m.a,...m.b].includes(pid))){toast("Người này đang trên sân, lưu tỉ số trước.");return true}
    await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:false,ci:0,ciCode:""});if(pid&&D.pmap.get(pid)?.active!==false)await db.collection("players").doc(pid).update({active:false})},`Đã hoàn tác check-in ${ckName(D,r)}`);return true}
  if(act==="ckok"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"qr",arrivedAt:Date.now()});await ckAttend(D,r)},`${ckName(D,r)} đã vào giải đấu`);ckSel=null;return true}
  if(act==="ckno"&&r){await write(()=>db.collection("regs").doc(r.id).update(r.walkin?{ci:0,ciCode:"",cancel:true,cancelAt:Date.now(),rejBy:who()}:{ci:0,ciCode:""}),r.walkin?"Đã từ chối yêu cầu xin vào":"Đã bỏ lượt quét này");ckSel=null;return true}
  if(act==="ckman"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"btc",arrivedAt:Date.now()});await ckAttend(D,r)},`Đã check-in tay ${ckName(D,r)}`);return true}
  if(act==="ckunsent"&&r){await write(()=>db.collection("regs").doc(r.id).update({pay:"none"}),"Chưa thấy tiền: nhờ VĐV trả tại bàn");return true}
  if(act==="ckpaidok"&&r){await write(async()=>{await db.collection("regs").doc(r.id).update({pay:"ok",okAt:Date.now(),okBy:who(),arrived:true,arrBy:"qr",arrivedAt:Date.now()});if(r.pid&&xPaySid(r,D))await savePay(D.sid,nx=>{nx.paid[r.pid]=true});await ckAttend(D,r)},`Đã nhận tiền · ${ckName(D,r)} đã vào giải đấu`);ckSel=null;ckQR=null;return true}
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
  if(!mine){if(hnWalkOn(X)){wkReq={x:X.id,c:p.c};delete errs.wk;go("app",{tab:"dk",x:X.id})}else{toast("Bạn chưa đăng ký giải đấu này. Đăng ký rồi quét lại nhé.");go("app",{tab:"dk",x:X.id})}ckBusy=false;return}
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
const vSanCk=D=>canWrite&&!REF&&!legacy&&isAdm()&&(xCur()||phaseOf(D)==="live"||D.SM.length||hnQuick)?vGiaiMgr(D,xCur()):vSanCk0(D);
const vSanCk0=D=>(ciOpen&&canWrite?ckScreen(D):ckAllOpen&&canWrite&&ckSched()?ckAll(D):(isG(D.c)?vGiaiSan:vSan)(D))+hnLate(D)+dhSheets(D);
if(MINI)ckParam();
// Màn mã đang mở: giữ màn hình sáng cả khi quay lại app
try{if(typeof document!=="undefined"&&document.addEventListener)document.addEventListener("visibilitychange",()=>{if(ciOpen&&document.visibilityState==="visible"){ckWake=null;ckWakeOn()}})}catch(e){}
