/* ---------- Quản lý buổi: Chuẩn bị → Đang đánh → Chốt buổi ----------
   Không khoá cứng: điểm danh, sân, điểm, tiền, giải sửa được trước, trong và sau buổi.
   Dữ liệu thêm (cùng collection app/ nên không cần đổi luật Firestore):
     app/pay-<buổi>  { paid:{id:true}, adj:{id:k} }   ai đã chuyển, số riêng từng người
     app/led-<mã>    { k, note, at, by }               dòng thu (+) / chi (−) ghi tay vào sổ quỹ
     app/hist-<buổi> thêm paid, adj, track, closedAt, closedBy, editedAt, editedBy        */
let sheetOpen=false,qView="buoi",ledForm=null,chotMien=false;
const payDoc=sid=>(S.pays&&S.pays["pay-"+sid])||{};
const phaseOf=D=>(D.SM.length||D.c.phase==="live"||(isG(D.c)&&D.c.giai&&D.c.giai.locked))?"live":"prep";
const fmtTxt=c=>isG(c)?"Cặp cố định":"Xoay cặp";
const who=()=>authUser&&!authUser.isAnonymous?(authUser.displayName||"Ban tổ chức"):"Trọng tài";
const hm=t=>t?new Date(t).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}):"";
const dhm=t=>t?`${hm(t)} ${dmy(t)}`:"";
const COSTS=[["court","Tiền sân"],["water","Tiền nước"],["ball","Tiền bóng"],["other","Khác"]];
function steps3(n){
  const L=["Chuẩn bị","Đang đánh","Chốt buổi"];
  return `<ol class="bsteps" aria-label="Các bước của buổi">${L.map((l,i)=>`<li class="${i+1<n?"ok":i+1===n?"on":""}"${i+1===n?' aria-current="step"':""}><b>${i+1<n?"✓":i+1}</b>${l}</li>`).join("")}</ol>`;
}
const card=(t,body,right="")=>`<section class="card2"><h2 class="ch2"><span>${t}</span>${right}</h2><div class="cb">${body}</div></section>`;
const cfIn=(k,label,v)=>`<label class="fld"><span class="lbl">${label}</span><input id="cf-${k}" data-draft="cf-${k}" data-save="cfg" data-key="${k}" type="number" inputmode="decimal" min="0" value="${esc(val("cf-"+k,v))}"></label>`;
const sgB=(k,v,cur,l,dis)=>`<button data-act="cset" data-k="${k}" data-v="${v}" aria-pressed="${cur===v}" ${dis?"disabled":""}>${l}</button>`;

/* ----- các khối cài đặt dùng chung cho Chuẩn bị và bảng Sửa giữa buổi ----- */
function attChips(D){
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const n=D.players.filter(p=>p.active!==false).length;
  if(!D.players.length)return `<p class="rule">Chưa có thành viên. <a href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi">Thêm ở tab Thành viên</a>.</p>`;
  const L=[...D.players].sort((a,b)=>((a.active===false)-(b.active===false))||String(a.name).localeCompare(String(b.name),"vi"));
  return `<div class="lab" style="margin:0"><span class="meta num">${n}/${D.players.length} người có mặt</span><button class="lnk" data-act="attall">${n===D.players.length?"Bỏ chọn hết":"Chọn tất cả"}</button></div>
  <div class="attc">${L.map(p=>{const on=p.active!==false;return `<button class="ac${on?" on":""}" data-act="att" data-id="${p.id}" aria-pressed="${on}">${on?"✓ ":""}${esc(p.name)}${busy.has(p.id)?" · trên sân":""}</button>`}).join("")}<a class="ac add" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi">+ Người mới</a></div>`;
}
function buoiBlock(D){
  const c=D.c,G=isG(c),lockF=D.SM.length>0;
  return `<label class="fld"><span class="lbl">Tên buổi / tên giải · không bắt buộc</span><input id="cf-sname" data-draft="cf-sname" data-save="cfg" data-key="sname" maxlength="60" placeholder="Ví dụ: Kèo tối thứ 5" value="${esc(val("cf-sname",c.sname||""))}"></label>
  <div class="fld"><span class="lbl">Thể thức</span><span class="seg segf">${sgB("fmt","xoay",G?"giai":"xoay","Xoay cặp",lockF)}${sgB("fmt","giai",G?"giai":"xoay","Giải cặp cố định",lockF)}</span>${lockF?`<small class="rule">Đã có trận nên giữ nguyên thể thức.</small>`:""}</div>`;
}
function fmtBlock(D){
  const c=D.c,G=isG(c),w2=winBy2(c),mx=ptMax(c);
  return `<div class="srow"><span>Số sân</span><span class="stepper"><button data-act="courts" data-d="-1" aria-label="Bớt sân">−</button><span class="num">${c.courts}</span><button data-act="courts" data-d="1" aria-label="Thêm sân">+</button></span></div>
  <div class="srow"><span>Chạm điểm</span><span class="stepper"><button data-act="target" data-d="-1" aria-label="Giảm điểm">−</button><span class="num">${c.target}</span><button data-act="target" data-d="1" aria-label="Tăng điểm">+</button></span></div>
  <span class="seg segf"><button data-act="win2" data-v="1" aria-pressed="${w2}">Thắng cách 2</button><button data-act="win2" data-v="0" aria-pressed="${!w2}">Chạm là thắng</button></span>
  ${w2?`<span class="seg segf"><button data-act="ptmax" data-v="0" aria-pressed="${!mx}">Không giới hạn</button><button data-act="ptmax" data-v="1" aria-pressed="${!!mx}">Có điểm trần</button></span>
  ${mx?`<div class="srow"><span>Điểm trần</span><span class="stepper"><button data-act="ptmaxd" data-d="-1" aria-label="Giảm điểm trần">−</button><span class="num">${mx}</span><button data-act="ptmaxd" data-d="1" aria-label="Tăng điểm trần">+</button></span></div>`:""}`:""}
  <small class="rule">${esc(ruleTxt(c))}.${w2&&mx?` Hoà ${mx-1}–${mx-1} thì ai được ${mx} trước là thắng.`:""}</small>
  ${G?"":`<div class="fld"><span class="lbl">Ưu tiên ghép</span><span class="seg segf"><button data-act="gmode" data-v="mix" aria-pressed="${c.gmode!=="same"}">Khác giới</button><button data-act="gmode" data-v="same" aria-pressed="${c.gmode==="same"}">Cùng giới</button></span></div>`}`;
}
const tick=(act,on,label)=>`<button class="tick${on?" on":""}" data-act="${act}" aria-pressed="${on}"><span class="box" aria-hidden="true">${on?"✓":""}</span>${label}</button>`;
function moneyBlock(D){
  const c=D.c,thu=c.thu||"keo",M=money(D),n=D.players.filter(p=>p.active!==false).length;
  if(c.cphi===false)return `<small class="rule">Buổi này không thu tiền. Tích “Chi phí” để chọn cách thu và nhập tiền sân, nước, bóng.</small>`;
  let h=`<div class="fld"><span class="lbl">Cách thu</span><span class="seg segw">${Object.entries(THU).filter(([v])=>v!=="khong").map(([v,l])=>sgB("thu",v,thu,l)).join("")}</span>
   <small class="rule">${thu==="keo"?"Đội thua mỗi người góp theo luật kèo. Quỹ kèo thiếu so với chi phí thì chia theo số trận mỗi người đã đánh.":thu==="deu"?"Chi phí buổi chia đều cho những người có đánh.":thu==="phi"?"Mỗi người có đánh đóng một mức cố định. Dư vào quỹ CLB, thiếu thì quỹ CLB bù.":"Không ai phải đóng, quỹ CLB trả toàn bộ chi phí buổi."}</small></div>`;
  if(thu==="phi")h+=`<div class="form">${cfIn("phi","Mỗi người đóng (k)",c.phi||50)}</div>`;
  if(thu==="keo")h+=`<div class="form">${cfIn("fee","Thua thường (k/người)",c.fee)}${cfIn("cap","Trần mỗi người (k)",c.cap)}
     <label class="fld"><span class="lbl">Kèo cân trình</span><select id="cf-keo" data-save="cfg" data-key="keo"><option value="1" ${c.keo?"selected":""}>Bật</option><option value="0" ${!c.keo?"selected":""}>Tắt</option></select></label>
     <label class="fld"><span class="lbl">Lệch từ</span><select id="cf-thr" data-save="cfg" data-key="thr">${[0.65,0.7,0.75,0.8].map(x=>`<option value="${x}" ${c.thr===x?"selected":""}>${Math.round(x*100)}% thắng</option>`).join("")}</select></label>
     ${cfIn("hi","Đội mạnh thua (k)",c.hi)}${cfIn("lo","Đội yếu thua (k)",c.lo)}</div>`;
  h+=`<span class="lbl">Chi phí buổi (k)</span><div class="form">${COSTS.map(([k,l])=>cfIn(k,l,c.costs[k])).join("")}</div>`;
  const est=thu==="phi"?(+c.phi||0)*n:thu==="deu"?M.cost:null;
  h+=`<div class="tot"><span>${D.done.length?`Phải thu tới giờ ${fmtK(M.collected)}`:est!=null?`Dự kiến thu ${fmtK(est)}`:"Thu theo trận thua"}</span><span>Chi ${fmtK(M.cost)}</span></div>`;
  return h;
}
function prizeBlock(D){
  const c=D.c,gt=c.gt||"khong",G=isG(c);
  if(gt==="khong")return `<small class="rule">Buổi này không trao giải. Tích “Giải thưởng” để chọn cách lập quỹ giải.</small>`;
  return `<span class="seg segw">${Object.entries(GT).filter(([v])=>v!=="khong").map(([v,l])=>sgB("gt",v,gt,l)).join("")}</span>
   ${gt!=="khong"?`<div class="form">${cfIn("gtv",gt==="trich"?"Trích bao nhiêu % phần dư":gt==="codinh"?"Quỹ CLB bỏ ra (k)":"Mỗi người góp thêm (k)",c.gtv||(gt==="trich"?30:gt==="codinh"?200:20))}</div>`:""}
   ${gt!=="khong"&&G?`<span class="seg segw">${[["100","Chỉ vô địch"],["60,40","60 / 40"],["50,30,20","50 / 30 / 20"]].map(([v,l])=>sgB("chia",v,c.chia||"50,30,20",l)).join("")}</span>`:""}
   <small class="rule">${gt==="khong"?"Buổi này không trao giải.":G?"Giải trao cho các cặp đứng đầu bảng xếp hạng cuối giải.":"Chia đều cho Số 1 nam và Số 1 nữ của buổi, chỉ xét người đánh ít nhất 70% số trận trung bình."}</small>`;
}
const flexNote=`<div class="flexnote"><b>Không khoá cứng.</b> Mọi mục trên vẫn sửa được khi đang đánh (nút Sửa ở tab Sân) và sau khi chốt (mở lại buổi trong Lịch sử).</div>`;

/* ----- ① Chuẩn bị ----- */
function vPrep(D){
  const c=D.c,G=isG(c);
  let h=`<div class="phead2"><h2>${esc(sessTitle(c,D.sid))} · chuẩn bị</h2><p class="rule">Chỉ ban tổ chức thấy phần này. Thành viên thấy “Buổi #${D.sid} sắp bắt đầu”. Mọi thay đổi lưu ngay.</p></div>`;
  h+=card("Buổi này",buoiBlock(D));
  h+=card("Điểm danh",attChips(D));
  h+=card("Sân và luật điểm",fmtBlock(D));
  h+=card(tick("cphi",c.cphi!==false,"Chi phí"),moneyBlock(D));
  h+=card(tick("gton",(c.gt||"khong")!=="khong","Giải thưởng"),prizeBlock(D));
  h+=flexNote;
  if(G)return h+gSetup(D,c.giai||{pairs:[]});
  const n=D.players.filter(p=>p.active!==false).length;
  return h+`<button class="ball wide" data-act="start">Bắt đầu buổi #${D.sid} →</button><p class="rule" style="text-align:center;margin-top:-6px">${n<4?`Cần ít nhất 4 người có mặt để xếp trận, hiện có ${n}.`:"Có thể chuẩn bị từ trước, bấm khi mọi người tới sân."}</p>`;
}

/* ----- ② Đang đánh: dải tóm tắt + bảng Sửa ----- */
function cfgChip(D){
  const c=D.c,thu=c.thu||"keo",n=D.players.filter(p=>p.active!==false).length;
  return `<div class="cfgchip"><span class="t"><b>${esc(sessTitle(c,D.sid))} · đang đánh</b><span>${fmtTxt(c)} · ${c.courts} sân · chạm ${c.target}${winBy2(c)?` cách 2${ptMax(c)?`, trần ${ptMax(c)}`:""}`:""} · ${c.cphi===false?"không thu tiền":esc(THU[thu])+(thu==="phi"?` ${fmtK(+c.phi||0)}`:"")} · ${n} người</span></span><button data-act="sheet">Sửa</button></div>`;
}
function editSheet(D){
  return `<div class="sheetbg" data-act="sheetx"><div class="sheet" role="dialog" aria-modal="true" aria-label="Sửa buổi #${D.sid}" data-stop="1">
    <div class="sh"><h2>Sửa buổi #${D.sid}</h2><button class="x" data-act="sheetx" aria-label="Đóng">✕ Đóng</button></div>
    <span class="lbl">Người chơi</span>${attChips(D)}
    <span class="lbl">Buổi này</span>${buoiBlock(D)}
    <span class="lbl">Sân và luật điểm</span>${fmtBlock(D)}
    ${tick("cphi",D.c.cphi!==false,"Chi phí")}${moneyBlock(D)}
    ${tick("gton",(D.c.gt||"khong")!=="khong","Giải thưởng")}${prizeBlock(D)}
    <div class="infonote">Áp dụng từ trận kế tiếp. Trận đang đánh và kết quả đã lưu giữ nguyên. Người cho nghỉ vẫn giữ thành tích đã đánh.</div>
    <button class="primary" data-act="sheetx">Xong</button></div></div>`;
}
function recv(D,M){
  const paid=payDoc(D.sid).paid||{},L=M.att.filter(p=>M.payOf(p.id)>0);
  const tot=L.reduce((s,p)=>s+M.payOf(p.id),0),pd=L.filter(p=>paid[p.id]),got=pd.reduce((s,p)=>s+M.payOf(p.id),0);
  return {n:L.length,np:pd.length,tot,got,left:tot-got,unpaid:L.filter(p=>!paid[p.id]),paid};
}
function moneyMini(D){
  const R=recv(D,money(D)),q=pathOf("app",{tab:"tien"});
  return `<div class="lab"><span class="lbl">Tiền trong buổi</span></div><div class="tiles"><a class="tile" href="${q}" data-go="app" data-t="tien"><span class="k">Đã nhận</span><b class="num">${R.np}/${R.n}</b><small class="num">${fmtK(R.got)}</small></a><a class="tile${R.left>0?" warn":""}" href="${q}" data-go="app" data-t="tien"><span class="k">Còn thiếu</span><b class="num">${fmtK(R.left)}</b><small>Bấm để tick ai đã chuyển</small></a></div>`;
}

/* ----- Tab Quỹ: Buổi này | Sổ quỹ CLB ----- */
function vTien(D){
  return `<div class="seg qseg" role="group" aria-label="Xem quỹ"><button data-act="qv" data-v="buoi" aria-pressed="${qView!=="so"}">Buổi #${D.sid} · hôm nay</button><button data-act="qv" data-v="so" aria-pressed="${qView==="so"}">Sổ quỹ CLB</button></div>`+(qView==="so"?vSoQuy(D):vQuyBuoi(D));
}
function vQuyBuoi(D){
  const c=D.c,M=money(D),R=recv(D,M),pz=prizes(D,M);
  let h=meBox(D);
  if(c.cphi===false&&!M.pot)return h+`<div class="empty"><strong>Buổi này không thu tiền</strong>${canWrite?"Bật “Chi phí” ở bước Chuẩn bị hoặc nút Sửa trên tab Sân nếu cần thu.":"Không ai phải đóng tiền buổi này."}</div>`;
  h+=`<div class="kpis k3q"><div class="kpi"><div class="lbl">Phải thu</div><div class="v num">${fmtK(R.tot)}</div></div><div class="kpi"><div class="lbl">Đã nhận</div><div class="v num">${fmtK(R.got)}</div></div><div class="kpi${R.left>0?" warn":""}"><div class="lbl">Còn thiếu</div><div class="v num">${fmtK(R.left)}</div></div></div>
    <div class="pbar" aria-hidden="true"><i style="width:${R.tot?Math.round(R.got/R.tot*100):0}%"></i></div>
    <p class="rule">${esc(THU[M.thu])}${M.thu==="phi"?` ${fmtK(+c.phi||0)}/người`:""} · tính theo các trận đã đánh tới giờ.</p>`;
  if(!M.att.length)h+=`<div class="empty"><strong>Chưa có ai phải đóng</strong>Tiền tự tính khi lưu tỉ số các trận.</div>`;
  else{
    const rows=[...M.att].sort((a,b)=>M.payOf(b.id)-M.payOf(a.id)||String(a.name).localeCompare(String(b.name),"vi"));
    h+=card(`Ai đã đóng · ${R.np}/${R.n}`,rows.map(p=>payLine(D,M,p,R.paid)).join("")+(canWrite?`<small class="rule">Bấm “Đã nhận?” khi tiền về tài khoản. Bấm ✎ để đặt số riêng cho khách, người đến muộn hoặc miễn.</small>`:""),`<span class="meta">Công khai</span>`);
  }
  const CC=COSTS.filter(([k])=>+c.costs[k]>0);
  h+=card("Chi buổi này",canWrite?`<div class="form">${COSTS.map(([k,l])=>cfIn(k,l,c.costs[k])).join("")}</div>`:CC.length?CC.map(([k,l])=>`<div class="srow"><span>${l}</span><b class="num">${fmtK(+c.costs[k])}</b></div>`).join(""):`<p class="rule">Chưa nhập chi phí.</p>`);
  if(M.pot)h+=`<div class="shd"><h2>Giải thưởng${D.done.length?" · tạm tính":""}</h2></div>${pz.length?prizeCards(D,pz):`<p class="rule">Chưa đủ trận để xét giải.</p>`}`;
  h+=`<div class="sumbar"><span>Dự kiến vào quỹ CLB</span><b class="num">${M.club>=0?"+":"−"}${fmtK(Math.abs(M.club))}</b></div>`;
  h+=`<div class="bar"><button class="primary" data-act="copy">Copy tổng kết gửi Zalo</button></div><textarea id="copybox" rows="8" readonly hidden></textarea>`;
  if(canWrite&&!isG(c))h+=`<a class="btn-line" href="${pathOf("chot")}" data-go="chot">Kết thúc &amp; chốt buổi →</a>`;
  return h+`<p class="rule" style="text-align:center">Số liệu cập nhật trực tiếp · sửa được trước, trong và sau buổi.</p>`;
}
function payLine(D,M,p,paid){
  const id=p.id,k=M.payOf(id),s=D.st.get(id),ed=canWrite&&editing.has("aj-"+id);
  let st;
  if(k<=0)st=`<span class="meta">Miễn</span>`;
  else if(paid[id])st=canWrite?`<button class="paidpill" data-act="lpaid" data-p="${id}" aria-label="Bỏ dấu đã nhận của ${esc(p.name)}">✓ Đã nhận</button>`:`<span class="paidpill">✓ Đã nhận</span>`;
  else st=canWrite?`<button class="sm" data-act="lpaid" data-p="${id}">Đã nhận?</button>`:BANK?`<button class="paybtn" data-act="pay" data-sid="${D.sid}" data-n="${esc(p.name)}" data-k="${k}">Chuyển tiền</button>`:`<span class="meta">Chưa</span>`;
  let h=`<div class="prw${id===ME?" me":""}">${av(p,"sm")}<span class="t"><b>${esc(p.name)}</b><small class="num">${s.g} trận · thua ${s.l}${M.hasAdj(id)?` · số riêng (tự tính ${fmtK(M.autoOf(id))})`:""}</small></span><b class="num amt">${fmtK(k)}</b>${canWrite?`<button class="ghost ed" data-act="adj" data-id="${id}" aria-label="Sửa số tiền của ${esc(p.name)}">✎</button>`:""}${st}</div>`;
  if(ed)h+=`<div class="adjf"><label><span class="sr">Số tiền riêng của ${esc(p.name)} (k)</span><input id="aj-${id}" data-draft="aj-${id}" type="number" inputmode="decimal" min="0" value="${esc(val("aj-"+id,k))}"></label><button class="primary" data-act="adjsave" data-id="${id}">Lưu</button>${M.hasAdj(id)?`<button data-act="adjclr" data-id="${id}">Về tự tính</button>`:""}<button class="ghost" data-act="adjx" data-id="${id}">Thôi</button></div>`;
  return h;
}
function debts(){
  const L=[];
  for(const h of S.hist)if(h.track){const pd=h.paid||{};for(const r of h.rows||[])if((+r.pay||0)>0&&!pd[r.id])L.push({sid:h.sid,id:r.id,name:r.name,k:+r.pay})}
  return L.sort((a,b)=>b.sid-a.sid||String(a.name).localeCompare(String(b.name),"vi"));
}
const ledSum=()=>(S.led||[]).reduce((a,x)=>a+(+x.k||0),0);
function fundNow(){return clubFund()+ledSum()-debts().reduce((a,x)=>a+x.k,0)}
function vSoQuy(D){
  const DB=debts(),dt=DB.reduce((a,x)=>a+x.k,0),bal=fundNow();
  let h=`<div class="balbox"><span class="lbl">Quỹ CLB hiện có</span><b class="num">${bal<0?"−":""}${fmtK(Math.abs(bal))}</b><small>${S.hist.length} buổi đã chốt${(S.led||[]).length?` · ${(S.led||[]).length} khoản ghi tay`:""}${dt?` · chưa tính ${fmtK(dt)} còn nợ`:""}</small></div>`;
  if(canWrite){
    if(ledForm)h+=card(ledForm==="thu"?"Ghi thu":"Ghi chi",`<label class="fld"><span class="lbl">Số tiền (k)</span><input id="lg-k" data-draft="lg-k" type="number" inputmode="decimal" min="0" value="${esc(val("lg-k",""))}"></label>
      <label class="fld"><span class="lbl">Nội dung</span><input id="lg-n" data-draft="lg-n" maxlength="80" placeholder="${ledForm==="thu"?"Ví dụ: Tài trợ áo":"Ví dụ: Mua 2 hộp bóng"}" value="${esc(val("lg-n",""))}"></label>
      ${errs.led?`<p class="err">${esc(errs.led)}</p>`:""}<div class="two"><button class="line" data-act="ledx">Thôi</button><button class="wide" data-act="ledsave">Lưu vào sổ</button></div><small class="rule">Dòng ghi tay xoá được nếu ghi nhầm.</small>`);
    else h+=`<div class="two2"><button class="ball" data-act="ledf" data-v="thu">+ Ghi thu</button><button class="line2" data-act="ledf" data-v="chi">− Ghi chi</button></div>`;
  }
  if(DB.length)h+=card(`Còn nợ · ${fmtK(dt)}`,DB.map(x=>`<div class="lrow"><span class="t"><b>${esc(x.name)}</b><small>Buổi #${x.sid}</small></span><b class="num neg">${fmtK(x.k)}</b>${canWrite?`<button class="sm" data-act="paid" data-id="${x.sid}" data-p="${x.id}">Đã nhận</button>`:""}</div>`).join(""));
  const E=[...S.hist.filter(x=>x.money).map(x=>({at:x.endedAt||x.startedAt||0,t:(x.type==="giai"?"Giải · buổi #":"Buổi #")+x.sid,auto:true,k:hClub(x),
      sub:`Thu ${fmtK(x.money.collected!=null?x.money.collected:x.money.fund)} · chi ${fmtK(x.money.cost)}${x.money.pot?` · giải ${fmtK(x.money.pot)}`:""}${x.editedAt?` · đã sửa ${dmy(x.editedAt)}`:""}`})),
    ...(S.led||[]).map(x=>({at:x.at||0,t:esc(x.note||""),auto:false,k:+x.k||0,sub:x.by?`Ghi bởi ${esc(x.by)}`:"",id:x.id}))].sort((a,b)=>b.at-a.at);
  h+=card("Sổ thu chi",E.length?E.map(x=>{const d=x.at?new Date(x.at):null;return `<div class="lrow"><span class="d num">${d?`${d.getDate()}<br>T${d.getMonth()+1}`:"–"}</span><span class="t"><b>${x.t}</b><span class="tag ${x.auto?"a":"m"}">${x.auto?"Tự động":"Ghi tay"}</span><small>${x.sub}</small></span><b class="num ${x.k>=0?"pos":"neg"}">${x.k>=0?"+":"−"}${fmtK(Math.abs(x.k))}</b>${canWrite&&!x.auto?delBtn("leddel",x.id,"Xoá"):""}</div>`}).join(""):`<p class="rule">Chưa có khoản nào. Mỗi buổi chốt xong tự ghi một dòng.</p>`);
  return h;
}

/* ----- ③ Chốt buổi ----- */
function vChot(D){
  const back=`<a class="bk" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">‹ Về Sân</a>`;
  if(!canWrite)return `<div class="dhead">${back}<h1>Chốt buổi</h1></div>`+clubLoginBody();
  const c=D.c;
  if(isG(c))return `<div class="dhead">${back}<h1>Chốt buổi #${D.sid}</h1></div>${steps3(3)}<div class="empty"><strong>Buổi giải chốt ở tab Sân</strong>Bấm “Kết thúc giải và lưu” ở cuối lịch thi đấu.</div>`;
  const M0=money(D),R0=recv(D,M0),extra=chotMien?Object.fromEntries(R0.unpaid.map(p=>[p.id,0])):null,M=money(D,extra),R=recv(D,M),pz=prizes(D,M);
  const ts=D.done.map(m=>m.doneAt||m.createdAt||0).filter(Boolean);
  let h=`<div class="dhead">${back}<h1>Chốt buổi #${D.sid}</h1><span class="dsub num">${c.sname?esc(c.sname)+" · ":""}${D.done.length} trận · ${M.att.length} người · ${c.courts} sân${ts.length?` · ${hm(Math.min(...ts))}–${hm(Math.max(...ts))}`:""}</span></div>`+steps3(3);
  if(D.playing.length)h+=`<div class="warnbox"><b>Còn ${D.playing.length} trận đang đánh.</b>Lưu tỉ số hoặc hủy trận ở tab Sân rồi quay lại chốt.</div>`;
  else if(!D.done.length)h+=`<div class="warnbox"><b>Buổi chưa có trận nào xong.</b>Chốt bây giờ sẽ lưu một buổi trống.</div>`;
  h+=card(`<i class="no">1</i>Chi thật`,`<div class="form">${COSTS.map(([k,l])=>cfIn(k,l,c.costs[k])).join("")}</div><small class="rule">Sửa nếu khác dự kiến: thêm sân, ít nước…</small>`);
  let b2=`<div class="srow"><span>Đã nhận</span><b class="num">${R0.np}/${R0.n} · ${fmtK(R0.got)}</b></div>`;
  if(R0.unpaid.length){
    b2+=`<div class="srow top"><span>Chưa đóng</span><span class="num" style="text-align:right">${R0.unpaid.map(p=>`${esc(p.name)} ${fmtK(M0.payOf(p.id))}`).join(" · ")}</span></div>
      <div class="opt"><button data-act="chotm" data-v="0" aria-pressed="${!chotMien}"><b>Ghi vào “Còn nợ”</b><span>Hiện ở Sổ quỹ CLB, tick khi họ đóng sau.</span></button><button data-act="chotm" data-v="1" aria-pressed="${chotMien}"><b>Miễn</b><span>Không thu của những người này buổi này.</span></button></div>`;
  }else if(R0.n)b2+=`<p class="rule">Mọi người đã đóng đủ.</p>`;
  if(pz.length)b2+=pz.map(x=>`<div class="srow"><span>${esc(x.label)} · ${x.ids.map(id=>esc(D.pmap.get(id)?.name||"?")).join(" &amp; ")}</span><b class="num">${fmtK(x.k)}</b></div>`).join("");
  h+=card(`<i class="no">2</i>Tiền thu &amp; giải`,b2+`<small class="rule">Sửa số riêng hoặc tick ai đã chuyển ở tab Quỹ.</small>`);
  const now=M.club-R.left;
  h+=`<div class="sumbox"><div><span>Phải thu</span><span class="num">${fmtK(R.tot)}</span></div><div><span>Chi</span><span class="num">−${fmtK(M.cost)}</span></div>${M.pot&&M.gt!=="gop"?`<div><span>Giải</span><span class="num">−${fmtK(M.pot)}</span></div>`:""}${R.left?`<div><span>Còn nợ (thu sau)</span><span class="num">−${fmtK(R.left)}</span></div>`:""}
    <div class="big"><span>Vào quỹ ngay</span><span class="num">${now<0?"−":"+"}${fmtK(Math.abs(now))}</span></div>${R.left?`<div><span>Khi thu đủ nợ</span><span class="num">${M.club<0?"−":"+"}${fmtK(Math.abs(M.club))}</span></div>`:""}</div>`;
  h+=`<button class="ball wide" data-act="chot" ${D.playing.length?"disabled":""}>${armed("chot:x")?"Bấm lần nữa để chốt":"Chốt &amp; ghi sổ quỹ"}</button>`;
  return h+`<div class="flexnote"><b>Chốt không phải khoá.</b> Sai thì mở lại buổi trong Lịch sử, sửa chi phí hoặc ai đã đóng; sổ quỹ tự tính lại và ghi “đã sửa”.</div>`;
}
async function chotBuoi(){
  const D=derive();
  if(D.playing.length){toast("Còn trận chưa lưu tỉ số. Lưu hoặc hủy trước khi chốt.");return}
  const pd=payDoc(D.sid),M0=money(D),R0=recv(D,M0),extra=chotMien?Object.fromEntries(R0.unpaid.map(p=>[p.id,0])):{},M=money(D,extra);
  await write(async()=>{
    const firstAt=D.done.reduce((m,x)=>Math.min(m,x.doneAt||x.createdAt||Infinity),Infinity);
    await db.doc("app/hist-"+D.sid).set({sid:D.sid,title:D.c.title,startedAt:isFinite(firstAt)?firstAt:Date.now(),endedAt:Date.now(),matchCount:D.done.length,
      rows:standings(D).filter(r=>r.s.g).map(r=>({id:r.p.id,name:r.p.name,gender:r.p.gender||"M",w:r.s.w,l:r.s.l,pf:r.s.pf,pa:r.s.pa,rating:Math.round(r.s.rating*100)/100,d:Math.round(r.s.d*1000)/1000,...payRow(D,M,r.p.id)})),
      money:moneySnap(D,M),fee:{fee:D.c.fee,keo:D.c.keo,hi:D.c.hi,lo:D.c.lo,cap:D.c.cap},
      paid:{...(pd.paid||{})},adj:{...(pd.adj||{}),...extra},track:true,closedAt:Date.now(),closedBy:who(),sname:D.c.sname||""});
    for(const p of D.players){const s=D.st.get(p.id);if(s.g)await db.collection("players").doc(p.id).update({rating0:Math.round(s.rating*100)/100})}
    await saveCfg({session:D.sid+1,costs:{court:0,water:0,ball:0,other:0},phase:"prep",sname:""});
  },"Đã chốt buổi, đây là trang tổng kết để chia sẻ");
  chotMien=false;go("buoi",{sid:D.sid});
}

/* ----- Sau buổi: mở lại để sửa ----- */
function histEdit(D,x){
  if(!canWrite||!x.snap||!x.snap.money)return "";
  const s=x.snap,m=s.money,k="hx-"+x.sid,cs=m.costs||{};
  const meta=`${s.closedAt?`Chốt lúc ${dhm(s.closedAt)}${s.closedBy?` bởi ${esc(s.closedBy)}`:""}`:`Lưu ngày ${dmy(s.endedAt)}`}${s.editedAt?` · sửa lần cuối ${dhm(s.editedAt)}`:""}`;
  if(!editing.has(k))return card(`Buổi #${x.sid} · đã chốt`,`<small class="rule">${meta}</small><div class="two"><button class="line" data-act="hopen" data-id="${x.sid}">Mở lại để sửa</button><button class="line" data-act="share" data-id="${x.sid}">Chia sẻ tổng kết</button></div>`);
  return card(`Sửa buổi #${x.sid}`,`<small class="rule">${meta}</small><span class="lbl">Chi phí thật (k)</span><div class="form">${COSTS.map(([c,l])=>`<label class="fld"><span class="lbl">${l}</span><input id="hc-${c}-${x.sid}" data-draft="hc-${c}-${x.sid}" type="number" inputmode="decimal" min="0" value="${esc(val(`hc-${c}-${x.sid}`,+cs[c]||0))}"></label>`).join("")}</div>
    <small class="rule">Tick ai đã đóng ở bảng tiền bên dưới. Sổ quỹ CLB tự tính lại.</small><div class="two"><button class="line" data-act="hclose" data-id="${x.sid}">Đóng</button><button class="wide" data-act="hsave" data-id="${x.sid}">Lưu thay đổi</button></div>`);
}

/* ----- sự kiện của luồng buổi (đã qua kiểm tra canWrite) ----- */
async function savePay(sid,patch){const cur=payDoc(sid),next={paid:{...(cur.paid||{})},adj:{...(cur.adj||{})}};patch(next);
  await db.doc("app/pay-"+sid).set(next);S.pays={...(S.pays||{}),["pay-"+sid]:{id:"pay-"+sid,...next}}}
async function sessionAct(act,id,b,e){
  if(act.startsWith("rr"))return rrAct(act);
  if(act==="sheet"){sheetOpen=true;render();return true}
  if(act==="sheetx"){if(b.classList&&b.classList.contains("sheetbg")&&e.target.closest("[data-stop]"))return true;sheetOpen=false;render();return true}
  if(act==="start"){await write(()=>saveCfg({phase:"live"}),`Đã bắt đầu buổi #${derive().sid}`);return true}
  if(act==="win2"){const on=b.dataset.v==="1";write(()=>saveCfg({win2:on}),on?"Thắng phải cách 2":"Chạm là thắng");return true}
  if(act==="ptmax"){const c=cfg(),on=b.dataset.v==="1";write(()=>saveCfg({ptMax:on?Math.max(c.target+2,+c.ptMax||c.target+4):0}));return true}
  if(act==="ptmaxd"){const c=cfg(),n=Math.min(40,Math.max(c.target+1,(+c.ptMax||c.target+4)+Number(b.dataset.d)));write(()=>saveCfg({ptMax:n}));return true}
  if(act==="cphi"){const on=cfg().cphi===false;write(()=>saveCfg(on?{cphi:true,thu:cfg().thu==="khong"?"keo":cfg().thu}:{cphi:false}),on?"Buổi này có thu tiền":"Buổi này không thu tiền");return true}
  if(act==="gton"){const c=cfg(),on=(c.gt||"khong")==="khong";const g=on?(c.gtPrev&&c.gtPrev!=="khong"?c.gtPrev:"trich"):"khong";
    write(()=>saveCfg(on?{gt:g,gtv:c.gtv||(g==="trich"?30:g==="codinh"?200:20)}:{gt:"khong",gtPrev:c.gt}),on?"Có giải thưởng":"Không trao giải");return true}
  if(act==="target"){const c=cfg(),n=Math.min(21,Math.max(5,c.target+Number(b.dataset.d))),p={target:n};if(+c.ptMax&&c.ptMax<=n)p.ptMax=n+2;write(()=>saveCfg(p));return true}
  if(act==="att"){const p=S.players.find(x=>x.id===id);if(!p)return true;const on=p.active!==false;
    if(on&&derive().playing.some(m=>[...m.a,...m.b].includes(id))){toast("Người này đang trên sân, lưu tỉ số trước.");return true}
    write(()=>db.collection("players").doc(id).update({active:!on}),on?`${p.name} nghỉ`:`${p.name} có mặt`);return true}
  if(act==="attall"){const D=derive(),busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),all=D.players.every(p=>p.active!==false);
    await write(async()=>{for(const p of D.players){const want=all?busy.has(p.id):true;if((p.active!==false)!==want)await db.collection("players").doc(p.id).update({active:want})}},all?"Đã bỏ chọn":"Đã chọn tất cả");return true}
  if(act==="lpaid"){const sid=derive().sid,p=b.dataset.p,on=!(payDoc(sid).paid||{})[p];
    write(()=>savePay(sid,x=>{if(on)x.paid[p]=true;else delete x.paid[p]}),on?"Đã đánh dấu đã nhận":"Đã bỏ dấu");return true}
  if(act==="adj"){const k="aj-"+id;editing.has(k)?editing.delete(k):editing.add(k);render();return true}
  if(act==="adjx"){editing.delete("aj-"+id);delete drafts["aj-"+id];render();return true}
  if(act==="adjsave"){const v=Number(drafts["aj-"+id]);if(drafts["aj-"+id]===undefined){editing.delete("aj-"+id);render();return true}
    if(!Number.isFinite(v)||v<0){toast("Nhập số tiền từ 0 trở lên.");return true}
    write(()=>savePay(derive().sid,x=>{x.adj[id]=v}).then(()=>{editing.delete("aj-"+id);delete drafts["aj-"+id]}),v?"Đã đặt số riêng":"Đã miễn cho người này");return true}
  if(act==="adjclr"){write(()=>savePay(derive().sid,x=>{delete x.adj[id]}).then(()=>{editing.delete("aj-"+id);delete drafts["aj-"+id]}),"Đã về số tự tính");return true}
  if(act==="ledf"){ledForm=b.dataset.v==="chi"?"chi":"thu";delete errs.led;render();return true}
  if(act==="ledx"){ledForm=null;delete errs.led;delete drafts["lg-k"];delete drafts["lg-n"];render();return true}
  if(act==="ledsave"){const k=Number(drafts["lg-k"]),note=String(drafts["lg-n"]||"").trim();
    if(!(k>0)){errs.led="Nhập số tiền lớn hơn 0.";render();return true}
    if(!note){errs.led="Nhập nội dung để sau này còn nhớ.";render();return true}
    delete errs.led;const lid="led-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),sign=ledForm==="chi"?-1:1;
    await write(()=>db.doc("app/"+lid).set({k:sign*k,note,at:Date.now(),by:who()}).then(()=>{ledForm=null;delete drafts["lg-k"];delete drafts["lg-n"]}),sign>0?"Đã ghi thu":"Đã ghi chi");return true}
  if(act==="leddel"){if(!armOr("leddel:"+id))return true;write(()=>db.doc("app/"+id).delete(),"Đã xoá dòng");return true}
  if(act==="chotm"){chotMien=b.dataset.v==="1";render();return true}
  if(act==="hopen"){editing.add("hx-"+id);render();return true}
  if(act==="hclose"){editing.delete("hx-"+id);COSTS.forEach(([c])=>delete drafts[`hc-${c}-${id}`]);render();return true}
  if(act==="hsave"){const sid=Number(id),h=S.hist.find(z=>z.sid===sid);if(!h||!h.money)return true;
    const m=h.money,cs={};for(const [c] of COSTS)cs[c]=Math.max(0,Number(val(`hc-${c}-${sid}`,+(m.costs||{})[c]||0))||0);
    const cost=Object.values(cs).reduce((a,x)=>a+x,0),dl=cost-(+m.cost||0),club=hClub(h);
    await write(()=>db.doc("app/hist-"+sid).update({money:{...m,costs:cs,cost,club:club-dl,gap:(+m.gap||0)-dl},editedAt:Date.now(),editedBy:who()}).then(()=>{editing.delete("hx-"+sid);COSTS.forEach(([c])=>delete drafts[`hc-${c}-${sid}`])}),"Đã sửa buổi, sổ quỹ đã tính lại");return true}
  return false;
}

/* ----- Tính lại rating từ các buổi còn lưu (sửa rating lệch sau khi xoá buổi) ----- */
let rrPlan=null;
async function rrCompute(){
  const D=derive(),cur=D.sid,H=[...S.hist].filter(h=>h.sid<cur).sort((a,b)=>a.sid-b.sid);
  const base=new Map();
  for(const h of H)for(const r of h.rows||[]){const rt=Number(r.rating),d=Number(r.d);if(!base.has(r.id)&&Number.isFinite(rt)&&Number.isFinite(d))base.set(r.id,rt-d)}
  const all=(await db.collection("matches").get()).docs.map(d=>({id:d.id,...d.data()}));
  const ms=all.filter(m=>m.status==="done"&&(m.session||1)<cur&&H.some(h=>h.sid===(m.session||1)))
    .sort((a,b)=>(a.session||1)-(b.session||1)||(a.doneAt||0)-(b.doneAt||0)||(a.seq||0)-(b.seq||0));
  const R=new Map(base),get=id=>R.has(id)?R.get(id):(Number(D.pmap.get(id)?.rating0)||3),avg=ids=>ids.reduce((s,id)=>s+get(id),0)/ids.length;
  for(const m of ms){const pA=expect(avg(m.a),avg(m.b)),dA=K*(m.sa/(m.sa+m.sb)-expShare(pA));
    for(const id of m.a)R.set(id,Math.min(8,Math.max(1,get(id)+dA)));for(const id of m.b)R.set(id,Math.min(8,Math.max(1,get(id)-dA)))}
  return D.players.filter(p=>R.has(p.id)).map(p=>({id:p.id,name:p.name,from:Number(p.rating0)||3,to:Math.round(R.get(p.id)*100)/100})).filter(x=>Math.abs(x.to-x.from)>=0.01).sort((a,b)=>Math.abs(b.to-b.from)-Math.abs(a.to-a.from));
}
function rrPanel(){
  if(!canWrite)return "";
  let b=`<small class="rule">Tính lại trình của mọi người từ đầu, chỉ dựa trên các buổi còn trong Lịch sử. Dùng khi đã xoá một buổi mà rating chưa trừ lại. Rating sửa tay giữa các buổi sẽ bị tính lại theo kết quả trận.</small>`;
  if(rrPlan==null)b+=`<button class="line" data-act="rrcalc">Kiểm tra rating</button>`;
  else if(!rrPlan.length)b+=`<p class="rule"><b>Rating đang khớp với các buổi đã lưu.</b> Không cần sửa.</p><button class="line" data-act="rrx">Đóng</button>`;
  else b+=`<p class="rule"><b>${rrPlan.length} người lệch rating:</b></p>${rrPlan.map(x=>`<div class="srow"><span>${esc(x.name)}</span><span class="num">${r2(x.from)} → <b>${r2(x.to)}</b></span></div>`).join("")}<div class="two"><button class="line" data-act="rrx">Thôi</button><button class="wide" data-act="rrapply">${armed("rrapply:x")?"Bấm lần nữa để áp dụng":"Áp dụng"}</button></div>`;
  return card("Tính lại rating",b);
}
async function rrAct(act){
  if(act==="rrx"){rrPlan=null;render();return true}
  if(act==="rrcalc"){try{rrPlan=await rrCompute()}catch(e){toast("Chưa tải được các trận, thử lại.")}render();return true}
  if(act==="rrapply"){if(!rrPlan||!armOr("rrapply:x"))return true;const P=rrPlan;
    await write(async()=>{for(const x of P)await db.collection("players").doc(x.id).update({rating0:x.to})},`Đã sửa rating ${P.length} người`);rrPlan=null;render();return true}
  return false;
}
