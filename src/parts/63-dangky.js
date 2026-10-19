/* ---------- Đăng ký buổi: chủ CLB mở buổi, người chơi đăng ký (Mini App), thu tiền trước tùy chọn ---------- */
const MINI_APP_ID="180913816434821856";
const miniLink=(cid=CID)=>`https://zalo.me/s/${MINI_APP_ID}/?clb=${encodeURIComponent(cid)}`;
const HOLD_MS=30*60e3; // Bắt buộc thu trước: giữ chỗ 30 phút cho người chưa chuyển
const regCfg=()=>cfg().reg||{};
// Mỗi CLB mở đăng ký cho 1 buổi sắp tới (buổi hiện tại đang chuẩn bị)
const regOpen=()=>{const r=regCfg();return r.on===true&&(r.sid==null||r.sid===(cfg().session||1))};
const regPayMode=()=>{const m=regCfg().pay;return m==="opt"||m==="req"?m:"off"};
// Phí: Lệ phí cố định dùng số của phần Chi phí; cách thu khác dùng "phí dự kiến" của buổi
const feeMem=()=>{const c=cfg(),r=regCfg();return Math.max(0,(c.thu||"keo")==="phi"?+c.phi||0:+r.fee||0)};
const feeGuest=()=>{const r=regCfg();return Math.max(0,r.feeG!=null&&r.feeG!==""?+r.feeG:feeMem())};
const feeOf=x=>x&&x.guest?feeGuest():feeMem();
const payOn=()=>regPayMode()!=="off"&&(feeMem()>0||feeGuest()>0);
const isHeldOut=x=>regPayMode()==="req"&&(x.pay||"none")==="none"&&Date.now()-(x.at||0)>HOLD_MS;
function regList(D){
  const max=Math.max(1,+regCfg().max||999);
  const mine=S.regs||[],L=mine.filter(r=>r.sid===D.sid&&!r.cancel&&!isHeldOut(r)).sort((a,b)=>(a.at||0)-(b.at||0));
  return {all:L,conf:L.slice(0,max),wait:L.slice(max),max,
    refund:mine.filter(r=>r.sid===D.sid&&r.cancel&&(r.pay==="sent"||r.pay==="ok")),
    expired:mine.filter(r=>r.sid===D.sid&&!r.cancel&&isHeldOut(r))};
}
const regLockAt=()=>{const r=regCfg();return r.at?r.at-(+r.lockH||0)*3600e3:0};
const regClosed=()=>{const r=regCfg(),t=Date.now();return (r.deadline&&t>r.deadline)||(r.at&&t>r.at)};
const dowVN=t=>["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"][new Date(t).getDay()];
const regWhen=t=>t?`${dowVN(t)} ${hm(t)} · ${dmy(t)}`:"";
const whenFull=r=>r.at?`${dowVN(r.at)} ${dmy(r.at)} · ${hm(r.at)}${r.end?`–${r.end}`:""}`:"Chưa đặt giờ";
const pendCount=()=>(S.links||[]).filter(x=>x.status==="pending").length;
const kVND=k=>Math.round(k*1000).toLocaleString("vi-VN")+"đ";
const lvTxt=r=>r.lvMin||r.lvMax?`Trình ${r.lvMin||"…"}–${r.lvMax||"…"}`:"";
const PAYLB={none:"Chưa trả",sent:"Chờ xác nhận tiền",ok:"Đã trả"};

/* ----- Thông tin buổi (người chơi và người xem) ----- */
function sessBox(D,R){
  const r=regCfg(),c=D.c;R=R||regList(D);
  const map=r.map?` <a href="${esc(r.map)}" target="_blank" rel="noopener">Bản đồ ↗</a>`:"";
  const chips=[`${c.courts} sân`,fmtTxt(c),lvTxt(r),feeMem()?`${fmtK(feeMem())}/người`:THU[c.thu||"keo"],r.guests?"Nhận khách":""].filter(Boolean);
  return `<div class="rh"><span class="lbl">Đăng ký buổi</span><b>${esc(c.sname||"Buổi đánh tới")}</b><span>${esc(whenFull(r))}${r.place?` · ${esc(r.place)}`:""}${map}</span></div>
    <div class="rgchips">${chips.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
    <div class="rgn"><b class="num">${R.conf.length}/${R.max<999?R.max:"∞"}</b><span>đã đăng ký${R.wait.length?` · ${R.wait.length} người chờ`:""}${r.deadline?` · hạn ${hm(r.deadline)} ${dowVN(r.deadline)}`:""}</span></div>
    ${r.note?`<p class="rgnote">${esc(r.note)}</p>`:""}`;
}
function regFaces(D,R){
  const face=x=>{const p=D.pmap.get(x.pid);return `<span class="rgp">${av(p||{name:x.name},"sm",1)}<small>${esc(p?.name||x.name||"?")}${x.guest?" · khách":""}</small></span>`};
  return `${R.conf.length?`<div class="rgl">${R.conf.map(face).join("")}</div>`:""}${R.wait.length?`<span class="lbl" style="margin-top:6px">Danh sách chờ</span><div class="rgl wt">${R.wait.map(face).join("")}</div>`:""}`;
}
// Khung chuyển khoản: QR điền sẵn số tiền và nội dung
function payBox(D,name,k){
  if(!BANK||!BANK.acc)return `<small class="rule">CLB chưa khai ngân hàng nhận tiền, bạn trả tại sân.</small>`;
  const amt=Math.round(k*1000),note=payNote(D.sid,name||"KHACH");
  return `<div class="rgpay"><img src="${esc(qrUrl(amt,note))}" alt="Mã QR chuyển ${kVND(k)}" width="110" height="110"><div class="kv2"><span>Số tiền</span><b class="num">${kVND(k)}</b><span>Nội dung</span><b>${esc(note)}</b><span>${esc(BANK.name||"")}</span><b class="num">${esc(BANK.acc)}</b><button class="line" data-act="saveqr" data-v="${esc(qrUrl(amt,note))}" data-n="${esc(note)}">Lưu mã QR</button></div></div>`;
}
// Nút chính cho người chơi
function regAction(D,R){
  const r=regCfg(),u=authUser,mine=u&&(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===u.uid&&!x.cancel),locked=r.at&&Date.now()>regLockAt();
  if(canWrite)return `<a class="lnk" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">Quản lý đăng ký ›</a>`;
  if(!PLAYER_ON())return `<a class="zalobtn" href="${miniLink()}"><b>Z</b>Mở trong Zalo để đăng ký</a>`;
  if(!isPlayer(u))return zaloBtn("Vào bằng Zalo để đăng ký");
  if(mine&&!isHeldOut(mine)){
    const pos=R.all.indexOf(mine),k=feeOf(mine),pay=mine.pay||"none",nm=mine.guest?mine.name:D.pmap.get(mine.pid)?.name;
    let h=`<div class="rgme ${pos<R.max?"in":"wt"}"><b>${pos<R.max?"✓ Bạn đã đăng ký":`Bạn đang chờ · thứ ${pos-R.max+1}`}${mine.guest?" · khách":""}</b>${locked?`<small>Đã khóa hủy</small>`:`<button class="ghost danger" data-act="regout">${armed("regout:x")?"Bấm lần nữa để hủy":"Hủy đăng ký"}</button>`}</div>`;
    if(payOn()&&k>0){
      h+=`<div class="paychip ${pay}">${PAYLB[pay]}${pay==="none"&&regPayMode()==="req"?` · giữ chỗ tới ${hm((mine.at||0)+HOLD_MS)}`:""}</div>`;
      if(pay==="none")h+=payBox(D,nm,k)+`<button class="primary wide" data-act="regpaid">Tôi đã chuyển khoản</button>`;
    }
    return h;
  }
  const linked=S.link&&S.link.status==="ok";
  if(!linked)return r.guests?`<button class="primary wide" data-act="guestopen">Đăng ký làm khách buổi này</button>`:`<a class="primary wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">Chọn tên của bạn để đăng ký</a>`;
  if(regClosed())return `<small class="rule">Đã hết hạn đăng ký buổi này.</small>`;
  const full=R.conf.length>=R.max,lb=full?"Vào danh sách chờ":"Đăng ký tham gia",k=feeMem();
  if(payOn()&&k>0&&!full){
    const nm=D.pmap.get(S.link.pid)?.name;
    return payBox(D,nm,k)+`<button class="primary wide" data-act="regin" data-v="sent">Đăng ký và đã chuyển khoản</button>
      <button class="line wide" data-act="regin" data-v="none">${regPayMode()==="req"?"Giữ chỗ 30 phút, chuyển sau":"Đăng ký, trả tiền tại sân"}</button>`;
  }
  return `<button class="primary wide" data-act="regin" data-v="none">${lb}</button>`;
}
// Khách vãng lai: nhập tên, giới tính, trình độ rồi đăng ký luôn
let guestOpen=false;
function guestForm(D){
  const k=feeGuest(),lv=val("gs-lv","3.0");
  return `<section class="regcard"><b>Đăng ký làm khách</b><span class="rule">Không cần chờ duyệt. Giá khách ${k?fmtK(k):"theo CLB"}.</span>
    <label class="fld"><span class="lbl">Tên của bạn</span><input id="gs-name" data-draft="gs-name" data-live="1" maxlength="30" value="${esc(val("gs-name",zaloProf().n||""))}"></label>
    <div class="fld"><span class="lbl">Giới tính</span><span class="seg"><button data-act="gsg" data-v="M" aria-pressed="${val("gs-g","M")==="M"}">Nam</button><button data-act="gsg" data-v="F" aria-pressed="${val("gs-g","M")==="F"}">Nữ</button></span></div>
    <label class="fld"><span class="lbl">Trình độ tự đánh giá</span><select id="gs-lv" data-draft="gs-lv">${["2.0","2.5","3.0","3.5","4.0","4.5","5.0"].map(v=>`<option ${v===lv?"selected":""}>${v}</option>`).join("")}</select></label>
    ${payOn()&&k>0?payBox(D,val("gs-name",zaloProf().n||"KHACH"),k)+`<button class="primary wide" data-act="guestin" data-v="sent">Đăng ký và đã chuyển khoản</button><button class="line wide" data-act="guestin" data-v="none">${regPayMode()==="req"?"Giữ chỗ 30 phút, chuyển sau":"Đăng ký, trả tiền tại sân"}</button>`:`<button class="primary wide" data-act="guestin" data-v="none">Đăng ký làm khách</button>`}
    <button class="ghost" data-act="guestopen">Quay lại</button></section>`;
}
function regCard(D){
  if(MODE!=="club"||legacy||!regOpen()||phaseOf(D)==="live")return "";
  const R=regList(D);
  return `<section class="regcard">${sessBox(D,R)}${regAction(D,R)}${regFaces(D,R)}</section>`;
}
// Chủ CLB ở trang Tổng quan / Chuẩn bị: một dòng tóm tắt dẫn tới trang Đăng ký
function dkBanner(D){
  if(!isAdm()||legacy)return "";
  const n=pendCount(),R=regList(D),pay=R.all.filter(x=>x.pay==="sent").length+R.refund.filter(x=>x.pay!=="refund").length;
  if(!n&&!regOpen())return "";
  const sub=[n&&`${n} người chờ duyệt`,pay&&`${pay} khoản tiền cần xem`,!n&&!pay&&regOpen()&&"Đang mở đăng ký"].filter(Boolean).join(" · ");
  return `<a class="dkban" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk"><span class="t"><b>Đăng ký buổi${regOpen()?` · ${R.conf.length}/${R.max<999?R.max:"∞"}`:""}</b><small>${sub}</small></span><span aria-hidden="true">›</span></a>`;
}

/* ----- Trang Đăng ký (tab dk) ----- */
function vDk(D){
  if(legacy)return `<div class="empty"><strong>Chưa dùng được</strong>CLB cần chuyển sang tài khoản CLB trước.</div>`;
  if(isAdm())return dkAdmin(D);
  return dkPlayer(D);
}
function dkPlayer(D){
  const live=phaseOf(D)==="live",R=regList(D),u=authUser,r=regCfg();
  if(PLAYER_ON()&&!isPlayer(u))return `<section class="regcard"><b>Đang vào bằng Zalo…</b><span class="rule">Nếu chờ lâu, bấm nút dưới.</span>${zaloBtn("Vào lại bằng Zalo")}</section>`;
  if(PLAYER_ON()&&S.link===undefined)return `<p class="rule">Đang tải…</p>`;
  if(live)return `<section class="regcard"><span class="lbl">Buổi đang diễn ra</span><b>${esc(sessTitle(D.c,D.sid))}</b><span class="rule">${D.playing.length} sân đang đánh · ${D.done.length} trận xong</span><a class="primary wide" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Xem trực tiếp</a></section>`;
  const mine=u&&(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===u.uid&&!x.cancel&&!isHeldOut(x));
  if(PLAYER_ON()&&(!S.link||S.link.status!=="ok")&&!mine){
    if(guestOpen&&r.guests&&regOpen())return guestForm(D);
    let h="";
    if(regOpen())h+=`<section class="regcard">${sessBox(D,R)}${r.guests&&!(S.link&&S.link.status==="pending")?`<button class="primary wide" data-act="guestopen">Đăng ký làm khách buổi này</button><small class="rule" style="text-align:center">Không cần chờ duyệt. Là thành viên CLB? Chọn tên của bạn bên dưới.</small>`:""}</section>`;
    else h+=`<section class="regcard"><span class="lbl">Đăng ký buổi</span><b>Chưa mở đăng ký buổi tới</b><span class="rule">Chọn tên của bạn trong CLB để được báo khi có buổi mới.</span></section>`;
    return h+linkCard(D);
  }
  if(!regOpen())return `<section class="regcard"><span class="lbl">Đăng ký buổi</span><b>Chưa mở đăng ký buổi tới</b><span class="rule">Chủ CLB mở đăng ký là bạn thấy ở đây.</span></section>`;
  return regCard(D);
}
function dkAdmin(D){
  const open=regOpen();
  let h=approvals(D);
  if(!open)return h+card(tick("regon",false,"Mở đăng ký buổi tới"),`<small class="rule">Người chơi đăng ký trong Zalo Mini App: giới hạn chỗ, danh sách chờ, khóa hủy, thu tiền trước nếu muốn. Tích để soạn buổi ${esc(sessTitle(D.c,D.sid))}.</small>`);
  h+=card(tick("regon",true,"Mở đăng ký buổi tới"),regForm(D));
  h+=regPeople(D);
  const link=miniLink();
  h+=card("Gửi link đăng ký",`<p class="rule">Link mở thẳng trang đăng ký trong Zalo. Dán vào nhóm hoặc in mã QR dán ở sân.</p>
    <div class="linkrow"><span>${esc(link.replace(/^https?:\/\//,""))}</span><button class="primary" data-act="cp" data-v="${esc(link)}">Copy</button></div>
    <div class="dkqr"><img alt="Mã QR mở trang đăng ký" width="180" height="180" src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(link)}"><button class="primary" data-act="regshare">📤 Gửi tin mở đăng ký</button></div>`);
  if(phaseOf(D)==="prep"&&regList(D).all.length)h+=`<p class="rule" style="text-align:center">Bấm “Bắt đầu buổi” ở trang Sân: người đã đăng ký được tự điểm danh, khách được thêm vào danh sách.</p>`;
  return h;
}
const dtLocal=t=>t?new Date(t-new Date(t).getTimezoneOffset()*6e4).toISOString().slice(0,16):"";
const rIn=(k,label,v,attrs="")=>`<label class="fld"><span class="lbl">${label}</span><input data-save="reg" data-key="${k}" value="${esc(v??"")}" ${attrs}></label>`;
// Form soạn buổi: thông tin, ai được đăng ký, chi phí, thu trước
function regForm(D){
  const r=regCfg(),c=D.c,G=isG(c),thu=c.thu||"keo",pm=regPayMode();
  const sec=t=>`<span class="lbl rgsec">${t}</span>`;
  let h=sec("Thông tin buổi");
  h+=`<label class="fld"><span class="lbl">Tên buổi</span><input id="cf-sname" data-draft="cf-sname" data-save="cfg" data-key="sname" maxlength="60" placeholder="Kèo tối thứ 5" value="${esc(val("cf-sname",c.sname||""))}"></label>
    ${rIn("at","Bắt đầu",dtLocal(r.at),'type="datetime-local"')}<div class="form">${rIn("end","Kết thúc",r.end,'type="time"')}${cfIn("courts","Số sân",c.courts)}</div>
    ${rIn("place","Sân",r.place,'maxlength="60" placeholder="Sân Kỳ Hòa, Q10"')}
    ${rIn("map","Link Google Maps (không bắt buộc)",r.map,'type="url" maxlength="300" placeholder="https://maps.app.goo.gl/…"')}
    <div class="fld"><span class="lbl">Thể thức</span><span class="seg segw">${sgB("fmt","xoay",G?"giai":"xoay","Xoay cặp",D.SM.length)}${sgB("fmt","giai",G?"giai":"xoay","Cặp cố định xoay vòng",D.SM.length)}</span></div>`;
  h+=sec("Ai được đăng ký");
  h+=`<div class="form f3">${rIn("max","Số chỗ",+r.max||"",'type="number" min="1" inputmode="numeric" placeholder="∞"')}${rIn("lvMin","Trình từ",r.lvMin,'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="2.5"')}${rIn("lvMax","đến",r.lvMax,'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="3.5"')}</div>
    <div class="fld"><span class="lbl">Đối tượng</span><span class="seg segw"><button data-act="regguest" data-v="0" aria-pressed="${!r.guests}">Chỉ thành viên</button><button data-act="regguest" data-v="1" aria-pressed="${!!r.guests}">Cả khách vãng lai</button></span></div>
    ${rIn("deadline","Hạn đăng ký (không bắt buộc)",dtLocal(r.deadline),'type="datetime-local"')}<div class="form">${rIn("lockH","Khóa hủy trước (giờ)",r.lockH??2,'type="number" min="0" inputmode="numeric"')}</div>`;
  h+=sec("Chi phí");
  h+=`<div class="fld"><span class="lbl">Cách thu</span><span class="seg segw">${["phi","deu","keo"].map(v=>sgB("thu",v,thu,THU[v])).join("")}</span></div>
    <div class="form">${thu==="phi"?cfIn("phi","Thành viên (k)",c.phi||50):rIn("fee","Dự kiến mỗi người (k)",r.fee,'type="number" min="0" inputmode="numeric" placeholder="0"')}${r.guests?rIn("feeG","Khách (k)",r.feeG,`type="number" min="0" inputmode="numeric" placeholder="${feeMem()||""}"`):""}</div>
    <small class="rule">${thu==="phi"?"Mỗi người đóng đúng số này.":thu==="deu"?"Chi phí thật chia đều sau buổi. Số dự kiến dùng để thu trước, dư thiếu tính lại khi chốt.":"Đội thua góp theo kèo. Số dự kiến dùng để thu trước nếu muốn."}</small>
    <div class="fld"><span class="lbl">Thu tiền trước khi đăng ký</span><span class="seg segw">${[["off","Không"],["opt","Tùy chọn"],["req","Bắt buộc"]].map(([v,l])=>`<button data-act="regpay" data-v="${v}" aria-pressed="${pm===v}">${l}</button>`).join("")}</span></div>
    <small class="rule">${pm==="off"?"Người chơi trả tại sân như bình thường.":pm==="opt"?"Người chơi chọn chuyển khoản ngay hoặc trả tại sân.":"Phải chuyển khoản. Chưa bấm đã chuyển sau 30 phút thì nhường chỗ cho người chờ."}${pm!=="off"&&!(BANK&&BANK.acc)?" Cần khai ngân hàng nhận tiền ở Cài đặt CLB.":""}</small>`;
  h+=sec("Ghi chú cho người chơi");
  h+=`<label class="fld"><span class="sr">Ghi chú</span><textarea data-save="reg" data-key="note" maxlength="300" rows="2" placeholder="Mang giày đế bằng, CLB có bóng">${esc(r.note||"")}</textarea></label>`;
  return h;
}
// Danh sách người đăng ký cho chủ CLB: tiền, xác nhận, hoàn tiền
function regPeople(D){
  const R=regList(D),nm=x=>esc(x.guest?x.name:D.pmap.get(x.pid)?.name||x.name||"?"),po=payOn();
  const row=(x,i)=>{const pay=x.pay||"none",k=feeOf(x);
    return `<div class="prer${i>=R.max?" done":""}"><b class="no num">${i+1}</b><span class="pm">${nm(x)}${x.guest?` <small class="gtag">khách ${esc(x.lv||"")}</small>`:""}${i>=R.max?` <small>· chờ</small>`:""}<small>${hm(x.at)} ${dmy(x.at)}${x.by?" · "+esc(x.by):""}${po&&k?` · ${kVND(k)} · <span class="paychip ${pay}">${PAYLB[pay]}</span>`:""}</small></span>
      <span class="pb">${po&&k&&pay!=="ok"?`<button class="line" data-act="regpayok" data-id="${x.id}">✓ Đã nhận</button>`:""}${po&&pay==="ok"?`<button class="ghost" data-act="regpayundo" data-id="${x.id}" aria-label="Bỏ xác nhận">↺</button>`:""}<button class="ghost danger" data-act="regdel" data-id="${x.id}" aria-label="Bỏ">${armed("regdel:"+x.id)?"Bỏ?":"✕"}</button></span></div>`};
  const got=R.all.filter(x=>x.pay==="ok").reduce((s,x)=>s+feeOf(x),0);
  let b=`<div class="lab" style="margin:0 0 4px"><span class="lbl">Đã đăng ký ${R.conf.length}${R.wait.length?` · chờ ${R.wait.length}`:""}${po?` · đã nhận ${kVND(got)}`:""}</span>${R.all.length?`<button class="lnk" data-act="regatt">${armed("regatt:x")?"Bấm lần nữa":"Điểm danh theo đăng ký"}</button>`:""}</div>`;
  b+=R.all.length?`<div class="prel">${R.all.map(row).join("")}</div>`:`<small class="rule">Chưa ai đăng ký.</small>`;
  if(R.refund.length)b+=`<span class="lbl rgsec">Đã hủy, cần hoàn tiền</span><div class="prel">${R.refund.map(x=>`<div class="prer"><span class="pm">${nm(x)}<small>${kVND(feeOf(x))} · hủy lúc ${hm(x.cancelAt)} · ${x.pay==="refund"?"đã hoàn":"chưa hoàn"}</small></span><span class="pb">${x.pay!=="refund"?`<button class="line" data-act="regrefund" data-id="${x.id}">Đã hoàn</button>`:""}<button class="ghost danger" data-act="regdel" data-id="${x.id}" aria-label="Xoá">${armed("regdel:"+x.id)?"Xoá?":"✕"}</button></span></div>`).join("")}</div>`;
  if(R.expired.length)b+=`<small class="rule">${R.expired.length} người giữ chỗ quá 30 phút chưa chuyển khoản, đã nhường chỗ.</small>`;
  b+=`<button class="line wide" data-act="regadd" style="margin-top:8px">${regAddOpen?"Đóng":"+ Thêm người vào danh sách"}</button>
    ${regAddOpen?`<div class="gadd">${pplPick(D,D.players.filter(p=>!R.all.some(x=>x.pid===p.id)),{act:"regaddp",key:"rga"})}</div>`:""}`;
  return card("Người đăng ký",b);
}
let regAddOpen=false;
function approvals(D){
  if(!isAdm()||legacy)return "";
  const L=(S.links||[]).filter(x=>x.status==="pending");if(!L.length)return "";
  return `<section class="card2 apv"><h2>Người chơi chờ duyệt (${L.length})</h2><div class="cb">${L.map(x=>`<div class="refrow"><span class="t"><b>${esc(x.zname||"Người dùng Zalo")}</b><small>${x.pid?`Nhận hồ sơ: <b>${esc(D.pmap.get(x.pid)?.name||"?")}</b>${D.pmap.get(x.pid)?.zuid?" (đã có người nhận)":""}`:`Người mới: <b>${esc(x.newName||"")}</b> · ${x.gender==="F"?"Nữ":"Nam"}`}</small></span><button class="primary" data-act="lnkok" data-id="${x.id}">Duyệt</button><button class="ghost danger" data-act="lnkno" data-id="${x.id}">${armed("lnkno:"+x.id)?"Từ chối?":"Từ chối"}</button></div>`).join("")}</div></section>`;
}
// Bắt đầu buổi: điểm danh người đã đăng ký, tạo hồ sơ khách, đánh dấu đã trả ở trang Quỹ
async function regStart(D){
  if(!regOpen())return 0;
  const R=regList(D);let n=0;const paid=[];
  for(const x of R.conf){
    let pid=x.pid;
    if(x.guest&&!pid){const ref=db.collection("players").doc();pid=ref.id;
      await ref.set({name:x.name||"Khách",gender:x.gender==="F"?"F":"M",rating0:Math.min(8,Math.max(1,+x.lv||2.5)),active:true,guest:true,createdAt:Date.now(),code:"PB-"+String(nextCode()).padStart(3,"0")});
      await db.collection("regs").doc(x.id).update({pid});n++}
    else{const p=D.pmap.get(pid);if(p&&p.active===false){await db.collection("players").doc(pid).update({active:true});n++}}
    if(x.pay==="ok"&&pid)paid.push(pid);
  }
  if(paid.length)await savePay(D.sid,nx=>{for(const id of paid)nx.paid[id]=true});
  return n;
}

/* ----- Bấm: người chơi ----- */
async function regAct(act,b,id){
  if(act==="guestopen"){guestOpen=!guestOpen;render();return true}
  if(act==="gsg"){drafts["gs-g"]=b.dataset.v;render();return true}
  if(act==="regin"||act==="guestin"){const D=derive(),L=S.link,u=authUser,guest=act==="guestin";
    if(!isPlayer(u))return true;
    if(!guest&&(!L||L.status!=="ok"))return true;
    if(guest&&!regCfg().guests)return true;
    if((S.regs||[]).some(x=>x.sid===D.sid&&x.uid===u.uid&&!x.cancel&&!isHeldOut(x))){toast("Bạn đã có trong danh sách.");return true}
    if(regClosed()){toast("Đã hết hạn đăng ký buổi này.");return true}
    const pay=b.dataset.v==="sent"?"sent":"none";
    let d={sid:D.sid,uid:u.uid,at:Date.now(),pay};
    if(guest){const el=document.getElementById&&document.getElementById("gs-name"),nm=String((el&&el.value)||drafts["gs-name"]||zaloProf().n||"").trim().slice(0,30);
      if(!nm){toast("Nhập tên của bạn.");return true}
      d={...d,guest:true,name:nm,gender:drafts["gs-g"]==="F"?"F":"M",lv:String(val("gs-lv","3.0"))}}
    else d={...d,pid:L.pid,name:D.pmap.get(L.pid)?.name||""};
    try{await FB.setDoc(FB.doc(FB.fs,PFX+"regs/"+D.sid+"_"+u.uid),d);guestOpen=false;toast(pay==="sent"?"Đã đăng ký, chờ chủ CLB xác nhận tiền":"Đã đăng ký")}catch(e){toast("Chưa đăng ký được, thử lại.")}
    return true}
  if(act==="regpaid"){const D=derive(),mine=(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===authUser?.uid&&!x.cancel);if(!mine)return true;
    try{await FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id),{pay:"sent",paidAt:Date.now()});toast("Đã báo chuyển khoản, chờ chủ CLB xác nhận")}catch(e){toast("Chưa gửi được, thử lại.")}
    return true}
  if(act==="regout"){const D=derive();if(!armOr("regout:x"))return true;
    const mine=(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===authUser?.uid&&!x.cancel);if(!mine)return true;
    try{if(mine.pay==="sent"||mine.pay==="ok"){await FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id),{cancel:true,cancelAt:Date.now()});toast("Đã hủy. Chủ CLB sẽ hoàn tiền cho bạn")}
      else{await FB.deleteDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id));toast("Đã hủy đăng ký")}}catch(e){toast("Đã quá giờ hủy hoặc chưa hủy được.")}
    return true}
  return false;
}
/* ----- Bấm: chủ CLB ----- */
async function regAdminAct(act,b,id,D){
  if(act==="regon"){const on=!regOpen();await write(()=>saveCfg({reg:{lockH:2,pay:"off",...regCfg(),on,sid:D.sid}}),on?"Đã mở đăng ký":"Đã đóng đăng ký");return true}
  if(act==="regguest"){await write(()=>saveCfg({reg:{...regCfg(),guests:b.dataset.v==="1"}}));return true}
  if(act==="regpay"){const v=["off","opt","req"].includes(b.dataset.v)?b.dataset.v:"off";await write(()=>saveCfg({reg:{...regCfg(),pay:v}}),v==="off"?"Không thu trước":v==="opt"?"Thu trước tùy chọn":"Bắt buộc thu trước");return true}
  if(act==="regadd"){regAddOpen=!regAddOpen;render();return true}
  if(act==="regaddp"){const p=D.pmap.get(id);if(!p)return true;await write(()=>db.collection("regs").doc(D.sid+"_p_"+id).set({sid:D.sid,uid:p.zuid||null,pid:id,name:p.name,at:Date.now(),by:who(),pay:"none"}),`Đã thêm ${p.name}`);return true}
  if(act==="regdel"){if(!armOr("regdel:"+id))return true;await write(()=>db.collection("regs").doc(id).delete(),"Đã bỏ khỏi danh sách");return true}
  if(act==="regpayok"){const x=(S.regs||[]).find(z=>z.id===id);if(!x)return true;
    await write(async()=>{await db.collection("regs").doc(id).update({pay:"ok",okAt:Date.now(),okBy:who()});if(x.pid)await savePay(D.sid,nx=>{nx.paid[x.pid]=true})},"Đã xác nhận nhận tiền");return true}
  if(act==="regpayundo"){const x=(S.regs||[]).find(z=>z.id===id);if(!x)return true;
    await write(async()=>{await db.collection("regs").doc(id).update({pay:"none"});if(x.pid)await savePay(D.sid,nx=>{delete nx.paid[x.pid]})},"Đã bỏ xác nhận");return true}
  if(act==="regrefund"){const x=(S.regs||[]).find(z=>z.id===id);if(!x)return true;
    await write(async()=>{await db.collection("regs").doc(id).update({pay:"refund",refundAt:Date.now()});if(x.pid)await savePay(D.sid,nx=>{delete nx.paid[x.pid]})},"Đã ghi nhận hoàn tiền");return true}
  if(act==="regatt"){const R=regList(D),inS=new Set(R.conf.map(x=>x.pid).filter(Boolean));if(!armOr("regatt:x"))return true;
    await write(async()=>{for(const p of D.players){const on=inS.has(p.id);if((p.active!==false)!==on)await db.collection("players").doc(p.id).update({active:on})}},`Điểm danh ${inS.size} người theo danh sách đăng ký`);return true}
  if(act==="regshare"){const r=regCfg(),R=regList(D),u=miniLink(),club=(CLUB&&CLUB.name)||D.c.title,left=+r.max?Math.max(0,+r.max-R.conf.length):null,c=D.c;
    const L=[`📣 ${club}: mở đăng ký ${c.sname||"buổi đánh tới"}`,`🗓 ${whenFull(r)}`,r.place&&`📍 ${r.place}${r.map?` · ${r.map}`:""}`,
      `🏓 ${c.courts} sân · ${fmtTxt(c)}${lvTxt(r)?" · "+lvTxt(r):""}${r.guests?" · nhận khách":""}`,
      feeMem()?`💰 ${fmtK(feeMem())}/người${r.guests&&feeGuest()!==feeMem()?` · khách ${fmtK(feeGuest())}`:""}${regPayMode()==="req"?" · chuyển khoản khi đăng ký":regPayMode()==="opt"?" · chuyển khoản trước hoặc trả tại sân":""}`:null,
      `✅ Đã đăng ký ${R.conf.length}${+r.max?`/${r.max}`:""} người${left===0?" · hết chỗ, vẫn vào danh sách chờ được":left?` · còn ${left} chỗ`:""}`,
      r.deadline&&`⏳ Hạn đăng ký ${hm(r.deadline)} ${dowVN(r.deadline)}`,r.lockH&&r.at&&`⏰ Hủy được tới ${hm(regLockAt())} ${dowVN(regLockAt())}`,r.note&&`📝 ${r.note}`,"👉 Bấm link, đăng ký ngay trong Zalo:"].filter(Boolean);
    const txt=L.join("\n");
    if(navigator.share){try{await navigator.share({title:"Mở đăng ký",text:txt+"\n",url:u})}catch(x){}return true}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy, dán vào nhóm Zalo nhé.")}catch(x){toast(u)}return true}
  return false;
}
