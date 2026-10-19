const noAcc=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^A-Za-z0-9 ]/g,"").replace(/\s+/g," ").trim().toUpperCase();
const payNote=(sid,name)=>`${noAcc(CID)} B${sid} ${noAcc(name)}`.slice(0,25).trim();
const qrUrl=(amt,note)=>`https://img.vietqr.io/image/${BANK.bin}-${BANK.acc}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(BANK.holder)}`;
const appUrl=(app,amt,note,sid)=>`https://dl.vietqr.io/pay?app=${app}&ba=${BANK.acc}@${BANK.code}&am=${amt}&tn=${encodeURIComponent(note)}&bn=${encodeURIComponent(BANK.holder)}&url=${encodeURIComponent(shareUrl(sid))}`;
let payOpen=null;
function showSheet(){
  let el=document.getElementById("paysheet");
  if(!payOpen){if(el)el.remove();document.documentElement.classList.remove("lock");return}
  if(!el){el=document.createElement("div");el.id="paysheet";document.body.appendChild(el)}
  el.innerHTML=paySheet();document.documentElement.classList.add("lock");
}
function paySheet(){
  if(!payOpen)return "";const {name,k,sid}=payOpen,amt=Math.round(k*1000),note=payNote(sid,name);
  return `<div class="sheetbg" data-act="payx"><div class="sheet" role="dialog" aria-modal="true" aria-label="Chuyển khoản cho ${esc(name)}" data-stop="1">
    <div class="sh"><h2>Chuyển khoản · ${esc(name)}</h2><button class="x" data-act="payx" aria-label="Đóng">✕ Đóng</button></div>
    <div><span class="lbl">Chi phí giải đấu #${sid}</span><div class="amt num">${amt.toLocaleString("vi-VN")}đ</div></div>
    <div class="qr"><img src="${esc(qrUrl(amt,note))}" alt="Mã QR chuyển ${amt.toLocaleString("vi-VN")}đ tới ${esc(BANK.holder)}"></div>
    <p class="rule" style="text-align:center">Quét bằng app ngân hàng bất kỳ: chi phí và nội dung đã điền sẵn.</p>
    <button class="primary" data-act="saveqr" data-v="${esc(qrUrl(amt,note))}" data-n="${esc(note)}">Lưu mã QR vào máy</button>
    <p class="rule" style="text-align:center;margin-top:-6px">Chỉ có 1 điện thoại? Lưu mã QR, mở app ngân hàng, chọn Quét QR rồi chọn ảnh vừa lưu.</p>
    <div class="kv"><span>Ngân hàng</span><b>${esc(BANK.name)}</b><i></i>
      <span>Số TK</span><b class="num">${esc(BANK.acc)}</b><button data-act="cp" data-v="${esc(BANK.acc)}">Copy</button>
      <span>Chủ TK</span><b>${esc(BANK.holder)}</b><i></i>
      <span>Nội dung</span><b>${esc(note)}</b><button data-act="cp" data-v="${esc(note)}">Copy</button>
      <span>Chi phí</span><b class="num">${amt.toLocaleString("vi-VN")}</b><button data-act="cp" data-v="${amt}">Copy</button></div>
    <span class="lbl">Mở thẳng app ngân hàng</span>
    <div class="apps">${BANK_APPS.map(([a,l])=>`<a href="${esc(appUrl(a,amt,note,sid))}" target="_blank" rel="noopener"><img src="https://cdn.vietqr.io/bank-app-icon/${a}-android.webp" alt="" width="40" height="40" loading="lazy"><span>${l}</span></a>`).join("")}</div>
    <p class="rule">Nếu app mở lên mà chưa có chi phí, bấm Lưu mã QR ở trên rồi quét ảnh trong app.</p>
  </div></div>`;
}
const lsGet=k=>{try{return localStorage.getItem(k)}catch(e){return null}},lsSet=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
let splashGone=false;
// Đổi CLB trong Mini App: bỏ màn chào, hiện ngay khung CLB (avatar, tên) trong lúc tải
const quickNext=()=>{try{sessionStorage.setItem("pb-quick","1")}catch(e){}};
try{if(sessionStorage.getItem("pb-quick")){sessionStorage.removeItem("pb-quick");const el=document.getElementById("splash");if(el){el.remove();splashGone=true}}}catch(e){}
function hideSplash(){splashGone=true;const el=document.getElementById("splash");if(!el)return;el.classList.add("out");setTimeout(()=>el.remove(),600)}
setTimeout(()=>{if(!splashGone)hideSplash()},20000);
const shareUrl=sid=>absUrl(pathOf("buoi",{sid}));

const $=s=>document.querySelector(s);
// Tìm không dấu: "ha noi" khớp "Hà Nội"
const hasQ=(q,...xs)=>{const k=noAcc(q).toLowerCase();return !k||xs.some(x=>noAcc(x).toLowerCase().includes(k))};
// Vẽ trang: đang gõ trong ô tìm thì chỉ cập nhật phần khác, giữ nguyên ô đang gõ (không mất con trỏ, không vỡ bộ gõ tiếng Việt)
const LIVEQ=["q","hq","cq"];
function setView(html){
  const v=$("#view");if(!v)return;const ae=document.activeElement;
  const typing=ae&&ae.id&&(ae.tagName==="INPUT"||ae.tagName==="TEXTAREA")&&ae.dataset&&(ae.dataset.live||LIVEQ.includes(ae.dataset.draft))&&v.contains&&v.contains(ae);
  if(!typing||!document.createElement){v.innerHTML=html;return}
  const t=document.createElement("div");t.innerHTML=html;morphKids(v,t,ae);
}
function morphKids(a,b,keep){
  const A=[...a.childNodes],B=[...b.childNodes];
  for(let i=0;i<B.length;i++){const x=A[i],y=B[i];
    if(!x){if(y.classList)y.classList.add("mfade");a.appendChild(y);continue}
    if(x.nodeType!==y.nodeType||x.nodeName!==y.nodeName||(x.id||"")!==(y.id||"")){if(y.classList)y.classList.add("mfade");a.replaceChild(y,x);continue}
    if(x.nodeType!==1){if(x.nodeValue!==y.nodeValue)x.nodeValue=y.nodeValue;continue}
    if(x===keep)continue;
    if(x.isEqualNode(y)&&!(x.contains&&x.contains(keep)))continue;
    for(const at of [...x.attributes])if(!y.hasAttribute(at.name))x.removeAttribute(at.name);
    for(const at of [...y.attributes])if(x.getAttribute(at.name)!==at.value)x.setAttribute(at.name,at.value);
    morphKids(x,y,keep);
    if((x.tagName==="INPUT"||x.tagName==="SELECT"||x.tagName==="TEXTAREA")&&x.value!==y.value)x.value=y.value;
  }
  for(let i=A.length-1;i>=B.length;i--)if(A[i].parentNode===a)a.removeChild(A[i]);
}
// Xác nhận bằng hộp thoại (xem 12-confirm.js): armOr(k) mở hộp thoại, bấm "Xác nhận" thì chạy lại đúng thao tác đó
const armed=k=>false;
const delBtn=(act,id,label)=>armed(act+":"+id)?`<button class="danger" data-act="${act}" data-id="${id}">Bấm lần nữa để xóa</button>`:`<button class="ghost danger" data-act="${act}" data-id="${id}">${label}</button>`;
const logoOk=c=>c&&typeof c.logo==="string"&&/^data:image\//.test(c.logo);
// Avatar CLB dùng chung: logo nếu có, không thì 2 chữ đầu tên (bỏ "CLB", "Pickleball"…) trên màu cố định theo CLB
const CAVC=["#1f8fe5","#1a7f45","#c97a16","#6b4fa0","#b33a6b","#3a7a8a","#0c2b44","#a23b2a"];
const clubCol=c=>{const k=String((c&&(c.id||(c===CLUB?CID:c.name)))||"");let h=0;for(const ch of k)h=(h*31+ch.charCodeAt(0))>>>0;return CAVC[h%CAVC.length]};
function clubIni(name){
  const W=String(name||"").trim().split(/\s+/).filter(Boolean),skip=["clb","cau","lac","bo","pickleball","club","pb"];
  let L=W.filter(w=>!skip.includes(noAcc(w).toLowerCase()));if(!L.length)L=W;if(!L.length)return "P";
  const f=w=>{const x=noAcc(w);return x?x.charAt(0):w.charAt(0)};
  return (L.length===1?noAcc(L[0]).slice(0,2)||L[0].slice(0,2):f(L[0])+f(L[1])).toUpperCase();
}
const clubInner=(c,name)=>logoOk(c)?`<img src="${c.logo}" alt="" loading="lazy" decoding="async">`:esc(clubIni(name||(c&&c.name)||(c&&c.id)));
const clubAv=(c,cls="",name)=>`<span class="clogo cav${logoOk(c)?" img":""}${cls?" "+cls:""}" style="--c:${clubCol(c)}" aria-hidden="true">${clubInner(c,name)}</span>`;
const logoHtml=(c,name)=>logoOk(c)?`<img src="${c.logo}" alt="">`:esc(String(name||"P").trim().charAt(0).toUpperCase()||"P");
const sessTitle=(c,sid)=>c.sname?String(c.sname):`Giải đấu #${sid}`;
// Tên dùng trong tin nhắn chia sẻ: không kèm số buổi
const shareName=(sname,fallback)=>String(sname||"").trim()||fallback;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtK=n=>(Math.round(n*10)/10).toLocaleString("vi-VN")+"k";
const r2=n=>(Math.round(n*100)/100).toFixed(2);
const sgn=n=>(n>=0?"+":"")+r2(n);
function cfg(){const c=S.cfg||{};return {...DEF,...c,...(CLUB&&CLUB.name?{title:CLUB.name}:{}),costs:{...DEF.costs,...(c.costs||{})}}}
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2800)}

const winBy2=c=>c.win2!=null?!!c.win2:!isG(c);
const ptMax=c=>winBy2(c)?(+c.ptMax||0):0;
function ruleTxt(c){const t=+c.target||11;return !winBy2(c)?`Chạm ${t}, không cần cách 2`:`Chạm ${t}, thắng cách 2${ptMax(c)?`, tối đa ${ptMax(c)}`:""}`}
function validPts(a,b,c){
  const t=+c.target||11;
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)return "Nhập điểm hai đội, không được hòa.";
  const w=Math.max(a,b),l=Math.min(a,b),mx=ptMax(c);
  if(!winBy2(c))return w===t&&l<=t-1?null:`Đội thắng đúng ${t} điểm, đội thua từ 0 đến ${t-1}.`;
  if(l<=t-2)return w===t?null:`Đội thắng phải đúng ${t} điểm khi đội thua có ${l}.`;
  if(mx&&w===mx&&l===mx-1)return null;
  if(mx&&w>mx)return `Tối đa ${mx} điểm.`;
  return w===l+2?null:`Từ ${t-1}–${t-1} phải thắng cách 2 (ví dụ ${l+2}–${l})${mx?`, hoặc ai chạm ${mx} trước`:""}.`;
}
function validScore(a,b,t){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)return "Nhập điểm hai đội, không được hòa.";
  const w=Math.max(a,b),l=Math.min(a,b);
  if(l<=t-2){return w===t?null:`Đội thắng phải đúng ${t} điểm khi đội thua có ${l}.`}
  return w===l+2?null:`Từ ${t-1}–${t-1} phải thắng cách 2 (ví dụ ${l+2}–${l}).`;
}
const expect=(ra,rb)=>1/(1+Math.exp(-(ra-rb)*SPREAD));
const expShare=pA=>0.5+(pA-0.5)*0.5;
const expScore=(eS,t)=>eS>=0.5?`${t}–${Math.round(t*(1-eS)/eS)}`:`${Math.round(t*eS/(1-eS))}–${t}`;
function feeFor(pLoser,c){
  if(c.keo){if(pLoser>=c.thr)return c.hi; if(pLoser<=1-c.thr)return c.lo;}
  return c.fee;
}


/* ---------- "Bạn là ai?": thành viên chọn tên mình, chỉ lưu trên máy ---------- */
let ME=null;try{ME=localStorage.getItem("pb-me-"+CID)}catch(e){}
function setMe(id){ME=id||null;try{id?localStorage.setItem("pb-me-"+CID,id):localStorage.removeItem("pb-me-"+CID)}catch(e){}render()}
const meP=D=>ME?D.pmap.get(ME)||null:null;
function waitQueue(D){
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),last=new Map();
  for(const m of D.done)for(const id of [...m.a,...m.b])last.set(id,Math.max(last.get(id)||0,m.doneAt||m.createdAt||0));
  return D.players.filter(p=>p.active!==false&&!busy.has(p.id)).sort((a,b)=>(D.st.get(a.id).g-D.st.get(b.id).g)||((last.get(a.id)||0)-(last.get(b.id)||0)));
}
function meBox(D,opt={}){
  const p=meP(D);
  if(!p)return "";
  // Bỏ chọn "Bạn là ai" và thẻ chào: quản trị viên ghép tài khoản Zalo; chỉ giữ phần chi phí
  let h="";
  if(opt.pay!==false){const M=money(D);if(M.att.some(x=>x.id===p.id)){const k=payRow(D,M,p.id).pay;
    if(k>0)h+=`<div class="mepay"><span>Chi phí của bạn hôm nay <b class="num">${fmtK(k)}</b><small>tạm tính tới giờ</small></span>${BANK?`<button class="paybtn" data-act="pay" data-sid="${D.sid}" data-n="${esc(p.name)}" data-k="${k}">Chuyển khoản</button>`:""}</div>`}}
  return h;
}

// Ép trình duyệt vẽ lại sau khi thay trang và cuộn bằng code (iPhone đôi khi còn sót hình cũ tới khi cuộn tay)
function repaint(){try{const v=document.getElementById("view");if(!v||!v.classList)return;v.classList.add("rp");
  const off=()=>v.classList.remove("rp");requestAnimationFrame(()=>requestAnimationFrame(()=>{off();
    // vẫn còn hình sót: nhích cuộn 1px rồi trả lại để trình duyệt vẽ lại toàn trang
    const y=window.scrollY||0;try{scrollTo(0,y+1);scrollTo(0,y)}catch(e){}}))}catch(e){}}

/* ----- Tên sân và màu sân (cài trong Sân và luật điểm) ----- */
const CCOL=[["#0c2b44","Xanh đen"],["#1f6fd1","Xanh dương"],["#1b7a3d","Xanh lá"],["#d9601a","Cam"],["#6b3fb5","Tím"],["#c62a2f","Đỏ"],["#0f7c80","Xanh ngọc"],["#c2367a","Hồng"]];
const cName=n=>{const v=((cfg().cnames)||[])[Number(n)-1];return String(v==null?"":v).trim()||String(n)};
const mName=m=>m?(m.status!=="done"||!m.cn?cName(m.court):m.cn):"?";
const cColor=n=>{const v=((cfg().ccolors)||[])[Number(n)-1];return /^#[0-9a-f]{6}$/i.test(v||"")?v:CCOL[(Number(n)-1)%CCOL.length][0]};
// Đọc loa: "sân số 2" nếu là số, còn lại đọc nguyên tên ("sân VIP")
const cSpeak=n=>{const v=cName(n);return /^\d+$/.test(v)?`sân số ${v}`:`sân ${v}`};

/* ----- Chọn người bằng lưới ảnh (thay cho danh sách xổ xuống) ----- */
// list: người để chọn; o.act: hành động khi bấm; o.sel: các id đang chọn; o.key: khoá ô tìm; o.meta(p): dòng nhỏ dưới tên
function pplPick(D,list,o){
  const q=String(val(o.key+"-q","")).trim().toLowerCase(),sel=new Set(o.sel||[]);
  const L=q?list.filter(p=>hasQ(q,p.name)):list;
  const search=list.length>8?`<label class="ppq"><span class="sr">Tìm tên</span><input id="${o.key}-q" data-draft="${o.key}-q" data-live="1" type="search" placeholder="Tìm tên…" value="${esc(val(o.key+"-q",""))}" autocomplete="off"></label>`:"";
  return search+`<div class="ppg">${L.map(p=>`<button class="ppt${sel.has(p.id)?" on":""}" data-act="${o.act}" data-id="${p.id}" aria-pressed="${sel.has(p.id)}">${av(p,"md",1)}<span class="pn">${esc(p.name)}</span>${o.meta?`<small>${o.meta(p)}</small>`:""}</button>`).join("")||`<p class="rule">Không có tên phù hợp.</p>`}</div>`;
}
let meAll=false,meOpen=false;
