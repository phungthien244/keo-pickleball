const noAcc=t=>String(t||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").replace(/[^A-Za-z0-9 ]/g,"").replace(/\s+/g," ").trim().toUpperCase();
const payNote=(sid,name)=>`RR B${sid} ${noAcc(name)}`.slice(0,25).trim();
const qrUrl=(amt,note)=>`https://img.vietqr.io/image/${BANK.bin}-${BANK.acc}-compact2.png?amount=${amt}&addInfo=${encodeURIComponent(note)}&accountName=${encodeURIComponent(BANK.holder)}`;
const appUrl=(app,amt,note,sid)=>`https://dl.vietqr.io/pay?app=${app}&ba=${BANK.acc}@${BANK.code}&am=${amt}&tn=${encodeURIComponent(note)}&bn=${encodeURIComponent(BANK.holder)}&url=${encodeURIComponent("https://rr.pikeco.app/?buoi="+sid)}`;
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
    <div><span class="lbl">Số tiền buổi #${sid}</span><div class="amt num">${amt.toLocaleString("vi-VN")}đ</div></div>
    <div class="qr"><img src="${esc(qrUrl(amt,note))}" alt="Mã QR chuyển ${amt.toLocaleString("vi-VN")}đ tới ${esc(BANK.holder)}"></div>
    <p class="rule" style="text-align:center">Quét bằng app ngân hàng bất kỳ: số tiền và nội dung đã điền sẵn.</p>
    <button class="primary" data-act="saveqr" data-v="${esc(qrUrl(amt,note))}" data-n="${esc(note)}">Lưu mã QR vào máy</button>
    <p class="rule" style="text-align:center;margin-top:-6px">Chỉ có 1 điện thoại? Lưu mã QR, mở app ngân hàng, chọn Quét QR rồi chọn ảnh vừa lưu.</p>
    <div class="kv"><span>Ngân hàng</span><b>${esc(BANK.name)}</b><i></i>
      <span>Số TK</span><b class="num">${esc(BANK.acc)}</b><button data-act="cp" data-v="${esc(BANK.acc)}">Copy</button>
      <span>Chủ TK</span><b>${esc(BANK.holder)}</b><i></i>
      <span>Nội dung</span><b>${esc(note)}</b><button data-act="cp" data-v="${esc(note)}">Copy</button>
      <span>Số tiền</span><b class="num">${amt.toLocaleString("vi-VN")}</b><button data-act="cp" data-v="${amt}">Copy</button></div>
    <span class="lbl">Mở thẳng app ngân hàng</span>
    <div class="apps">${BANK_APPS.map(([a,l])=>`<a href="${esc(appUrl(a,amt,note,sid))}" target="_blank" rel="noopener"><img src="https://cdn.vietqr.io/bank-app-icon/${a}-android.webp" alt="" width="40" height="40" loading="lazy"><span>${l}</span></a>`).join("")}</div>
    <p class="rule">Nếu app mở lên mà chưa có số tiền, bấm Lưu mã QR ở trên rồi quét ảnh trong app.</p>
  </div></div>`;
}
let splashGone=false;
function hideSplash(){splashGone=true;const el=document.getElementById("splash");if(!el)return;el.classList.add("out");setTimeout(()=>el.remove(),600)}
setTimeout(()=>{if(!splashGone)hideSplash()},20000);
const shareUrl=sid=>absUrl(pathOf("buoi",{sid}));

const $=s=>document.querySelector(s);
const ARM={k:"",t:0};const armed=k=>ARM.k===k&&Date.now()<ARM.t;
function armOr(k){if(armed(k)){ARM.k="";return true}ARM.k=k;ARM.t=Date.now()+4000;render();setTimeout(render,4100);return false}
const delBtn=(act,id,label)=>armed(act+":"+id)?`<button class="danger" data-act="${act}" data-id="${id}">Bấm lần nữa để xóa</button>`:`<button class="ghost danger" data-act="${act}" data-id="${id}">${label}</button>`;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmtK=n=>(Math.round(n*10)/10).toLocaleString("vi-VN")+"k";
const r2=n=>(Math.round(n*100)/100).toFixed(2);
const sgn=n=>(n>=0?"+":"")+r2(n);
function cfg(){const c=S.cfg||{};return {...DEF,...(CLUB&&CLUB.name?{title:CLUB.name}:{}),...c,costs:{...DEF.costs,...(c.costs||{})}}}
function toast(t){const el=$("#toast");el.textContent=t;el.hidden=false;clearTimeout(toast.t);toast.t=setTimeout(()=>el.hidden=true,2800)}

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

