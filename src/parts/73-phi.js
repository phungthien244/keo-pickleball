/* ---------- Phí thành viên cố định và quyền xem Quỹ CLB ----------
   clubs/{c}.mfee = {on, k (nghìn đồng), per: "m"|"q"|"y", due (ngày hạn trong kỳ), perk (% giảm lệ phí giải khi đã đóng: 100 = miễn), fund (cộng vào quỹ)}
   clubs/{c}.fundView = "off" | "bal" (chỉ số dư) | "flow" (số dư + thu chi, mặc định) | "full" (kèm người còn nợ)
   app/mfee-<kỳ> = {paid: {pid: {k, at, by}}}   kỳ: 2026-10 (tháng), 2026-Q4 (quý), 2026 (năm) */
const MF_DEF={on:false,k:200,per:"m",due:5,perk:100,fund:true};
const mfCfg=()=>({...MF_DEF,...((CLUB&&CLUB.mfee)||{})});
const mfOn=()=>!!(CLUB&&CLUB.mfee&&CLUB.mfee.on);
function mfKey(t,per){const d=new Date(t||Date.now()),y=d.getFullYear(),m=d.getMonth()+1;per=per||mfCfg().per;
  return per==="y"?String(y):per==="q"?`${y}-Q${Math.ceil(m/3)}`:`${y}-${String(m).padStart(2,"0")}`}
function mfPrev(key,per){per=per||mfCfg().per;
  if(per==="y")return String(+key-1);
  if(per==="q"){const [y,q]=key.split("-Q").map(Number);return q>1?`${y}-Q${q-1}`:`${y-1}-Q4`}
  const [y,m]=key.split("-").map(Number);return m>1?`${y}-${String(m-1).padStart(2,"0")}`:`${y-1}-12`}
const mfLb=key=>/Q/.test(key)?`quý ${key.split("Q")[1]}/${key.slice(0,4)}`:/-/.test(key)?`tháng ${+key.slice(5)}`:`năm ${key}`;
const mfShort=key=>/Q/.test(key)?`Q${key.split("Q")[1]}`:/-/.test(key)?`T${+key.slice(5)}`:key;
const mfDoc=key=>(S.mfee||[]).find(d=>d.id==="mfee-"+key)||{paid:{}};
const mfPaid=(pid,key)=>!!(pid&&mfDoc(key||mfKey()).paid?.[pid]);
const mfMembers=D=>D.players.filter(p=>!p.guest);
// Lệ phí giải đấu sau quyền lợi phí thành viên (chỉ áp cho lệ phí cố định / chia đều, không áp thua góp)
function mfPerk(pid,base){if(!mfOn()||!pid||!base)return base;const c=mfCfg();if(!mfPaid(pid))return base;return Math.max(0,Math.round(base*(100-Math.min(100,Math.max(0,+c.perk||0)))/100))}
const mfPerkTx=()=>{const p=+mfCfg().perk||0;return p>=100?"miễn lệ phí giải đấu":p>0?`giảm ${p}% lệ phí giải đấu`:"lệ phí giải đấu giữ nguyên"};
// Tổng phí thành viên đã thu (cộng vào quỹ)
const mfFund=()=>mfCfg().fund===false?0:(S.mfee||[]).reduce((a,d)=>a+Object.values(d.paid||{}).reduce((s,x)=>s+(+x.k||0),0),0);
// Ai chưa đóng phí kỳ này (bỏ qua người tạm nghỉ dài ngày)
function mfDebts(D){if(!mfOn())return [];const c=mfCfg(),cur=mfKey(),L=[];for(const p of mfMembers(D))if(!p.hold&&!mfPaid(p.id,cur))L.push({key:cur,id:p.id,name:p.name,k:+c.k||0});return L}
const mfNote=(nm,key)=>`${noAcc(CID).toUpperCase()} PHI ${mfShort(key)} ${noAcc(nm||"").toUpperCase()}`.replace(/\s+/g," ").slice(0,25).trim();

/* ----- Quyền xem quỹ của thành viên ----- */
const FV={off:"Ẩn quỹ",bal:"Chỉ số dư",flow:"Số dư + thu chi",full:"Đầy đủ kèm người nợ"};
const fundView=()=>canWrite?"full":((CLUB&&CLUB.fundView)||"flow");

/* ----- Cài đặt: phí thành viên cố định ----- */
let mfOpen=false;
function mfCard(D){
  const c=mfCfg(),on=mfOn(),cur=mfKey(),keys=[cur,mfPrev(cur),mfPrev(mfPrev(cur))].reverse();
  const st=(k,txt)=>`<span class="stepper sm"><button data-act="mfstep" data-k="${k}" data-d="-1" aria-label="Giảm">−</button><span class="num">${txt}</span><button data-act="mfstep" data-k="${k}" data-d="1" aria-label="Tăng">+</button></span>`;
  const seg=(k,opts,cur)=>`<span class="seg kosg">${opts.map(([v,l])=>`<button data-act="mfset" data-k="${k}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join("")}</span>`;
  let h=`<div class="mfbox"><button class="gbopt" data-act="mfon" aria-pressed="${on}"><span><b>Thu phí thành viên cố định</b><br><small class="rule">${on?`${fmtK(c.k)}/${c.per==="m"?"tháng":c.per==="q"?"quý":"năm"} · ${mfPerkTx()}`:"Tắt · chỉ thu lệ phí từng giải đấu"}</small></span>${gbSw(on)}</button>`;
  if(on){
    h+=`<div class="korow"><span>Số tiền</span>${st("k",fmtK(c.k))}</div>
      <div class="korow"><span>Chu kỳ</span>${seg("per",[["m","Tháng"],["q","Quý"],["y","Năm"]],c.per)}</div>
      <div class="korow"><span>Hạn đóng</span>${st("due",c.per==="m"?`Ngày ${c.due}`:`Ngày ${c.due} đầu kỳ`)}</div>
      <div class="korow"><span>Quyền lợi khi đã đóng</span>${st("perk",(+c.perk||0)>=100?"Miễn lệ phí":(+c.perk||0)?`Giảm ${c.perk}%`:"Không giảm")}</div>
      <small class="rule">Quyền lợi áp cho lệ phí cố định và chia đều chi phí của các giải đấu trong kỳ đã đóng. Thua góp vẫn tính như cũ.</small>
      <button class="gbopt" data-act="mffund" aria-pressed="${c.fund!==false}"><span>Tiền phí cộng vào Quỹ CLB</span>${gbSw(c.fund!==false)}</button>`;
    const M=mfMembers(D).filter(p=>!p.hold).sort((a,b)=>(mfPaid(a.id,cur)-mfPaid(b.id,cur))||a.name.localeCompare(b.name,"vi")),np=M.filter(p=>mfPaid(p.id,cur)).length;
    h+=`<div class="mftbl"><div class="mfh"><b>Tình hình đóng phí</b><small>${mfLb(cur)}: ${np}/${M.length} · ${fmtK(np*c.k)}</small></div>
      <div class="mfr hd"><span>Thành viên</span>${keys.map(k=>`<span>${mfShort(k)}</span>`).join("")}</div>
      ${M.map(p=>`<div class="mfr"><span class="nm">${av(p,"xs",1)}${esc(p.name)}</span>${keys.map(k=>{const ok=mfPaid(p.id,k);return k===cur||ok?`<button class="mfc ${ok?"ok":"no"}" data-act="mfpaid" data-id="${p.id}" data-v="${k}" aria-label="${ok?"Bỏ đánh dấu":"Đánh dấu đã thu"} ${esc(p.name)} ${mfLb(k)}">${ok?"✓":"nợ"}</button>`:`<button class="mfc no dim" data-act="mfpaid" data-id="${p.id}" data-v="${k}">–</button>`}).join("")}</div>`).join("")||`<p class="rule">Chưa có thành viên.</p>`}
      <div class="two"><button class="line" data-act="mfremind">💬 Nhắc ${M.length-np} người chưa đóng</button></div>
      <small class="rule">Bấm ô để đánh dấu đã thu hoặc bỏ dấu (có hỏi xác nhận). Người chơi thấy khoản phí ở trang Tôi kèm mã QR để chuyển khoản.</small></div>`;
  }
  return h+`</div>`;
}
/* ----- Cài đặt: thành viên xem quỹ ----- */
function fvCard(){const v=(CLUB&&CLUB.fundView)||"flow";
  return `<div class="fvbox"><span class="lbl">Thành viên xem Quỹ CLB</span><div class="fvopts">${Object.entries(FV).map(([k,l])=>`<button class="gdopt${v===k?" on":""}" data-act="fvset" data-v="${k}"><span class="rd"></span><span class="t"><b>${l}</b><small>${{off:"Thành viên không thấy quỹ",bal:"Thấy số dư quỹ",flow:"Thấy số dư, thu chi từng khoản · không thấy ai nợ",full:"Thấy cả danh sách người còn nợ"}[k]}</small></span></button>`).join("")}</div></div>`}

/* ----- Người chơi: khoản phí thành viên ở trang Tôi ----- */
let mfQR=false;
function mfMe(D,p){
  if(!mfOn()||!p||p.guest)return "";
  const c=mfCfg(),cur=mfKey(),ok=mfPaid(p.id,cur),k=+c.k||0;
  if(ok)return `<div class="mxcard ok"><b>✓ Đã đóng phí thành viên ${mfLb(cur)}</b><span>${fmtK(k)} · ${esc(mfPerkTx())} trong kỳ này</span></div>`;
  const note=mfNote(p.name,cur);
  let h=`<div class="mxcard warn mfme"><b>Phí thành viên ${mfLb(cur)}: ${fmtK(k)}</b><span>Hạn ngày ${c.due} · đóng xong được ${esc(mfPerkTx())}</span>`;
  if(BANK&&BANK.acc){h+=mfQR?`<div class="mfqr">${vqrSvg(k*1000,note,200)}<small>Nội dung: <b>${esc(note)}</b></small><button class="line wide" data-act="saveqr" data-a="${k*1000}" data-n="${esc(note)}">Lưu mã QR vào máy</button><small class="rule">Chuyển xong, ban tổ chức xác nhận là xong.</small></div>`:`<button class="primary" data-act="mfqr">Đóng bằng mã QR</button>`}
  return h+`</div>`;
}

async function mfAct(act,b,id){
  if(!/^(mf|fv)/.test(act))return false;
  if(act==="mfqr"){mfQR=!mfQR;render();return true}
  if(!canWrite||!isAdm())return true;
  const c=mfCfg(),save=patch=>write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{mfee:{...c,...patch}}));
  if(act==="mfon"){const on=!mfOn();if(!on&&!armOr("mfoff:x"))return true;await save({on,...(on&&!c.since?{since:Date.now()}:{})});return true}
  if(act==="mfstep"){const k=b.dataset.k,d=+b.dataset.d||0;
    if(k==="k")await save({k:Math.max(10,Math.min(5000,(+c.k||0)+d*(c.k>=500?50:10)))});
    else if(k==="due")await save({due:Math.max(1,Math.min(28,(+c.due||5)+d))});
    else if(k==="perk")await save({perk:Math.max(0,Math.min(100,(+c.perk||0)+d*10))});
    return true}
  if(act==="mfset"&&b.dataset.k==="per"){const v=["m","q","y"].includes(b.dataset.v)?b.dataset.v:"m";if(v!==c.per&&(S.mfee||[]).length&&!armOr("mfper:x"))return true;await save({per:v});return true}
  if(act==="mffund"){await save({fund:c.fund===false});return true}
  if(act==="mfpaid"){const key=b.dataset.v,D=derive(),p=D.pmap.get(id);if(!p||!key)return true;const ok=mfPaid(id,key);
    if(!armOr((ok?"mfundo:":"mfok:")+id+"|"+key))return true;
    const d=mfDoc(key),paid={...(d.paid||{})};if(ok)delete paid[id];else paid[id]={k:+c.k||0,at:Date.now(),by:who()};
    await write(()=>db.doc("app/mfee-"+key).set({paid}),ok?"Đã bỏ dấu":`Đã thu phí ${mfLb(key)} của ${p.name}`);return true}
  if(act==="mfremind"){const D=derive(),cur=mfKey(),L=mfMembers(D).filter(p=>!p.hold&&!mfPaid(p.id,cur));if(!L.length){toast("Mọi người đã đóng phí.");return true}
    const txt=`📌 ${CLUB?.name||"CLB"}: nhắc đóng phí thành viên ${mfLb(cur)} (${fmtK(c.k)}), hạn ngày ${c.due}.\nCòn: ${L.map(p=>p.name).join(", ")}.\nMở Pikeco › Tôi để quét mã QR chuyển khoản. Cảm ơn mọi người!\n${miniPathOf(pathOf("app",{tab:"toi"}))}`;
    await sendText(txt,"Đã copy lời nhắc, dán vào nhóm Zalo");return true}
  if(act==="fvset"){const v=FV[b.dataset.v]?b.dataset.v:"flow";await write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{fundView:v}),`Thành viên: ${FV[v]}`);return true}
  return false;
}
