/* ---------- Trình 4 mức thay cho rating (canvas "Bước 0 · Làm gọn") ----------
   Người chơi tự chọn một lần; chỉ dùng để ghép cặp cân và xếp hạt giống, không hiện thành điểm số.
   Lưu ở reg.lv (chuỗi số cũ, để ghép cặp dùng làm rating0) + hồ sơ chung prof/{uid}.lv + máy. */
const LV4=[["2.5","Mới chơi","Mới cầm vợt, chưa rành luật"],["3.0","Trung bình","Đánh được, rally vài nhịp"],["3.5","Khá","Chơi đều, có chiến thuật"],["4.0","Giỏi","Thi đấu giải phong trào"]];
// Số cũ (2.0–5.0 hoặc rating) → tên mức gần nhất
const lvName=v=>{v=+v;if(!Number.isFinite(v)||v<=0)return "";return v<2.75?"Mới chơi":v<3.25?"Trung bình":v<3.75?"Khá":"Giỏi"};
const lvSnap=v=>{const n=lvName(v);return (LV4.find(x=>x[1]===n)||LV4[1])[0]};
let myLvV=null;
function myLv(){if(myLvV)return myLvV;try{const v=localStorage.getItem("pb-lv");if(LV4.some(x=>x[0]===v))myLvV=v}catch(e){}
  if(!myLvV&&!myLv.ld&&authUser&&!authUser.isAnonymous&&window.FB){myLv.ld=1;FB.getDoc(FB.doc(FB.fs,"prof/"+authUser.uid)).then(d=>{const v=d.exists()&&d.data().lv;if(LV4.some(x=>x[0]===v)){myLvV=v;try{localStorage.setItem("pb-lv",v)}catch(e){}if(drafts["gs-lv"]==null)render()}}).catch(()=>{})}
  return myLvV||""}
async function saveMyLv(v){if(!LV4.some(x=>x[0]===v))return;myLvV=v;try{localStorage.setItem("pb-lv",v)}catch(e){}
  if(authUser&&!authUser.isAnonymous&&window.FB)try{await FB.setDoc(FB.doc(FB.fs,"prof/"+authUser.uid),{lv:v,at:Date.now()})}catch(e){}}
// Ô chọn trình: đã chọn trước đây thì gọn một dòng "Trình: Khá · Sửa"
function lvPick(k="gs-lv"){
  const known=myLv(),cur=lvSnap(drafts[k]!=null?drafts[k]:(known||"3.0"));
  if(known&&drafts[k]==null&&!lvPick.open)return `<div class="lvone"><span>Trình của bạn: <b>${lvName(known)}</b></span><button class="ghost" data-act="lvopen">Sửa</button></div>`;
  return `<div class="fld lvpick"><span class="lbl">Trình của bạn${known?"":" · chọn một lần"}</span>${LV4.map(([v,t,s])=>`<button class="lvo${v===cur?" on":""}" data-act="lvpick" data-k="${k}" data-v="${v}" aria-pressed="${v===cur}"><span class="rd"></span><span class="t"><b>${t}</b><small>${s}</small></span></button>`).join("")}<span class="rule">Chỉ để ghép cặp cân sức. Không ai thấy điểm số của bạn; người tổ chức có thể chỉnh nếu chọn chưa đúng.</span></div>`;
}
// Giá trị trình gửi kèm đăng ký (và nhớ cho lần sau)
function lvOf(k="gs-lv"){const v=lvSnap(drafts[k]!=null?drafts[k]:(myLv()||"3.0"));saveMyLv(v);return v}
// Ô chọn nhanh cho người tổ chức (thêm khách, đến muộn): 4 nút
const lvSeg=(k,cur,act="hnset")=>`<div class="mxseg sm">${LV4.map(([v,t])=>`<button data-act="${act}" data-k="${k}" data-v="${v}" aria-pressed="${lvSnap(cur)===v}">${t}</button>`).join("")}</div>`;
function lvAct(act,b){
  if(act==="lvpick"){drafts[b.dataset.k||"gs-lv"]=b.dataset.v;render();return true}
  if(act==="lvopen"){lvPick.open=1;render();return true}
  return false;
}
// Thành tích thật thay cho rating: số buổi, trận, thắng, vô địch/á quân
function lvAch(D,id){
  const X=profileData(D,id),T=[];
  for(const x of [...X.ses].reverse())if(x.medal===1||x.medal===2)T.push({m:x.medal,t:x.sname||(x.giai?`Giải #${x.sid}`:`Buổi #${x.sid}`),at:x.at});
  return {ses:X.ses.length,games:X.games,wins:X.winsAll,gold:X.ses.filter(x=>x.medal===1).length,T};
}

// Người tổ chức thêm tay (không đăng ký bằng Zalo của chính họ) → khách · chưa xác minh
const regKhach=x=>!!x&&!/^zalo_/.test(String(x.uid||""));
const khTag=x=>regKhach(x)?`<small class="khtag">Khách · chưa xác minh</small>`:"";

/* ----- Bước 3 · tiền sân & hoà vốn (canvas T03, T04) ----- */
// Số liệu tiền của một lịch đánh: đã thu (đã xác nhận), chờ xác nhận, tiền sân, số người cần để hoà vốn
function hvOf(X,regs){
  const san=+X.san||0,f=xFee(X),R=(regs||(S.regs||[]).filter(r=>typeof r.sid==="string"&&(r.sid===X.id||r.sid.startsWith(X.id+"~"))&&!r.cancel)),n=R.length;
  const per=r=>r.paidBy?0:r.payFor==="pair"?f*2:f,ok=R.filter(r=>r.pay==="ok"),sent=R.filter(r=>r.pay==="sent");
  const thu=ok.reduce((a,r)=>a+per(r),0),cho=sent.reduce((a,r)=>a+per(r),0),un=f>0?R.filter(r=>!r.paidBy&&(r.pay||"none")==="none").length:0;
  const deu=(X.thu||"phi")==="deu",need=!deu&&san&&f?Math.max(0,Math.ceil(san/f)-n):0,mx=+X.max||0,short=!deu&&mx&&f&&mx*f<san?san-mx*f:0;
  return {san,f,n,thu,cho,un,deu,need,mx,short,pct:san?Math.min(100,Math.round(thu*100/san)):0,each:deu&&san&&n?Math.ceil(san/n):0};
}
function hvBar(X,regs,big){const h=hvOf(X,regs);if(!h.san)return "";
  const st=h.deu?`Chia đều cuối buổi · hiện ~${fmtK(h.each)}/người`:h.short?`Đủ ${h.mx} người vẫn thiếu ${fmtK(h.short)} · nên tăng lệ phí hoặc thêm chỗ`:h.need?`Cần thêm ${h.need} người là hoà vốn`:"Đủ người hoà vốn ✓";
  return `<div class="hvbox${big?" big":""}">${big?`<div class="hv3"><span><b class="num">${fmtK(h.thu)}</b><small>đã thu</small></span><span><b class="num">${fmtK(h.san)}</b><small>tiền sân</small></span><span><b class="num ${h.thu>=h.san?"ok":"w"}">${h.thu>=h.san?"+":"−"}${fmtK(Math.abs(h.san-h.thu))}</b><small>${h.thu>=h.san?"dư":"còn thiếu"}</small></span></div>`:""}
    <span class="hvst ${h.need?"w":"ok"}">${st}</span><span class="hvbar"><i class="${h.thu>=h.san?"ok":""}" style="width:${h.pct}%"></i></span>
    ${big?(h.cho?`<small class="rule">Đang chờ xác nhận ${fmtK(h.cho)} chuyển khoản.</small>`:""):`<small class="hvk"><span>Đã thu <b>${fmtK(h.thu)}</b> / tiền sân ${fmtK(h.san)}</span><em>${h.pct}%</em></small>`}</div>`}
