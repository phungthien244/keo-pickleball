/* ---------- Trang giải cho ban tổ chức (thiết kế mới) ----------
   Đầu trang: trạng thái + đếm ngược · 4 ô tóm tắt · Việc cần làm · bộ lọc danh sách · bấm 1 người mở bảng thao tác ·
   menu ··· (cài nhanh, nhân bản, xuất, nhật ký, tạm dừng, huỷ) · chia sẻ (mời, QR, gửi danh sách vào nhóm, nhắc chưa trả) ·
   nút chính đổi theo giai đoạn. Dữ liệu: regs (đăng ký), sched (giải), sched.log (thao tác BTC). */
let xbBulk=null,xbFl="all",xbSel=null,xbMenu=false,xbShare=false,xbLog=false,xbLogF="all",xbSendMode="tien",xbRemind=null;
const xbName=(D,x)=>x.guest?(x.name||"?"):(D.pmap.get(x.pid)?.name||x.name||"?");
const xbG=(D,x)=>{const p=x.pid&&D.pmap.get(x.pid);return (p&&p.gender)||x.gender||""};
const xbLv=(D,x)=>{const p=x.pid&&D.pmap.get(x.pid);if(p){const s=D.st.get(p.id);return s?s.rating:+p.rating0||0}return +x.lv||0};
const xbLeft=ms=>{ms=Math.max(0,ms);const d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.round(ms%36e5/6e4);return d?`${d} ngày ${h} giờ`:h?`${h} giờ ${m}′`:`${m}′`};
function xbStatus(X){
  const s=xState(X),now=Date.now(),dl=X.deadline||X.at||0,today=X.at&&sameDay(X.at,now);
  if(s==="live")return {lb:"Đang đánh",c:"live",t:"Giải đấu đang diễn ra"};
  if(s==="done")return {lb:"Đã xong",c:"done",t:`Kết thúc ${X.doneAt?hm(X.doneAt)+" "+dmy(X.doneAt).slice(0,5):""}`};
  if(s==="cancel")return {lb:"Đã huỷ",c:"cancel",t:"Giải đấu đã huỷ"};
  if(s==="draft")return {lb:"Nháp",c:"draft",t:"Chưa mở đăng ký"};
  if(s==="plan")return {lb:"Sắp mở",c:"draft",t:X.openAt?`Tự mở đăng ký sau ${xbLeft(X.openAt-now)}`:"Chưa mở đăng ký"};
  if(xOpen(X))return {lb:"Đang mở",c:"open",t:dl?`Đóng đăng ký sau ${xbLeft(dl-now)}`:"Đang nhận đăng ký"};
  if(today)return {lb:"Hôm nay",c:"today",t:X.at>now?`Đã đóng đăng ký · bắt đầu sau ${xbLeft(X.at-now)}`:"Tới giờ đánh"};
  return {lb:"Đã đóng",c:"closed",t:X.at>now?`Đã đóng đăng ký · bắt đầu sau ${xbLeft(X.at-now)}`:"Đã đóng đăng ký"};
}
// Việc cần làm: mỗi việc một nút
function xbTodo(D,X,R){
  const T=[],now=Date.now(),po=payOn(),due=x=>po&&feeOf(x)>0&&x.pay!=="ok"&&x.pay!=="sent"&&x.pay!=="refund";
  const sent=R.all.filter(x=>x.pay==="sent");
  if(sent.length)T.push(["w",`<b>${sent.length} người</b> báo đã chuyển khoản`,sent.length>1?"Duyệt hàng loạt":"Đối chiếu",sent.length>1?`data-act="xbbulk"`:`data-act="xbsel" data-id="${esc(sent[0].id)}"`]);
  const hold=R.all.filter(x=>due(x)&&!x.arrived&&(x.hold||regPayMode()==="req"));
  if(hold.length){const m=Math.min(...hold.map(x=>HOLD_MS-(now-(x.at||0))));T.push(["r",`<b>${hold.length} người</b> chưa trả · hết giữ chỗ sau ${Math.max(0,Math.round(m/6e4))}′`,"Nhắc Zalo",`data-act="xbremind"`])}
  const unpaid=R.conf.filter(x=>due(x)&&!hold.includes(x));
  if(unpaid.length)T.push(["r",`<b>${unpaid.length} người</b> chưa trả lệ phí`,"Nhắc Zalo",`data-act="xbremind"`]);
  if(pairRegOn(X)){const solo=R.conf.filter(x=>!capMate(x));if(solo.length)T.push(["b",`<b>${solo.length} người</b> chưa có cặp`,"Xem",`data-act="xbfl" data-v="cap"`])}
  if(R.refund.length)T.push(["r",`<b>${R.refund.length} người</b> đã huỷ, cần hoàn tiền`,"Xem",`data-act="xbfl" data-v="huy"`]);
  const left=+X.max?+X.max-R.conf.length:0;
  if(xOpen(X)&&left>0&&X.at&&X.at-now<2*864e5)T.push(["b",`Còn <b>${left} chỗ</b>, sắp tới ngày đánh`,"Chia sẻ lại",`data-act="xbshare"`]);
  return T;
}
function xbRow(D,X,x,i){
  const p=x.pid&&D.pmap.get(x.pid),g=xbG(D,x),lv=xbLv(D,x),k=feeOf(x),pay=x.pay||"none";
  const sub=[g==="F"?"Nữ":g==="M"?"Nam":"",lv?r2(lv):"",x.guest?"ngoài CLB":"thành viên",x.walkin?"vãng lai":"",x.at?hm(x.at):""].filter(Boolean).join(" · ");
  const chip=x.cancel?`<span class="xbchip ${pay==="refund"?"ok":pay==="ok"||pay==="sent"?"no":""}">${pay==="refund"?"Đã hoàn":pay==="ok"||pay==="sent"?"Cần hoàn":"Đã huỷ"}</span>`
    :payOn()&&k?`<span class="xbchip ${pay==="ok"?"ok":pay==="sent"?"wa":"no"}">${pay==="ok"?"Đã nhận":pay==="sent"?"Báo chuyển":"Chưa trả"}</span>`:"";
  return `<button class="xbrow" data-act="xbsel" data-id="${esc(x.id)}"><span class="no num">${i==null?"":i+1}</span>${av(p||{name:xbName(D,x)},"sm",1)}<span class="t"><b>${esc(xbName(D,x))}${x.arrived?` <small class="atag q">✓ đã đến</small>`:""}</b><small>${esc(sub)}${phOfUid(x.uid)?` · 📞 ${phFmt(phOfUid(x.uid))}`:""}${x.note?` · 📝 ${esc(String(x.note).slice(0,30))}`:""}</small>${capTag(D,x)}${(()=>{const dt=X.dt;if(!dt||dt==="free"||!pairRegOn(X))return "";const m=capMate(x);if(!m)return "";const gs=[xbG(D,x),xbG(D,m)].sort().join("");const ok=dt==="mix"?gs==="FM":dt==="MM"?gs==="MM":gs==="FF";return ok?"":`<small class="atag" style="background:#fee2e2;color:#991b1b">sai nội dung ${({mix:"đôi nam nữ",MM:"đôi nam",FF:"đôi nữ"})[dt]}</small>`})()}</span>${chip}</button>`;
}
function xbList(D,X,R){
  const cancel=(S.regs||[]).filter(r=>r.sid===X.id&&r.cancel),po=payOn(),cap=pairRegOn(X);
  const unpaid=R.all.filter(x=>po&&feeOf(x)>0&&x.pay!=="ok");
  const fl=[["all",`Tất cả ${R.all.length}`],["chua",`Chưa trả ${unpaid.length}`,po],["cho",`Chờ chỗ ${R.wait.length}`],["ngoai",`Ngoài CLB ${R.all.filter(x=>x.guest).length}`],["cap","Cặp",cap],["huy",`Đã huỷ ${cancel.length}`]].filter(f=>f[2]!==false);
  if(!fl.some(f=>f[0]===xbFl))xbFl="all";
  let h=`<div class="xbfl" role="group" aria-label="Lọc danh sách">${fl.map(([k,l])=>`<button data-act="xbfl" data-v="${k}" aria-pressed="${xbFl===k}">${l}</button>`).join("")}</div>`;
  const q=noAcc(String(val("xb-q",""))).toLowerCase().trim();
  if(R.all.length>10)h+=`<label class="srch xbq"><span class="sr">Tìm tên</span><input id="xb-q" data-draft="xb-q" data-live="1" type="search" placeholder="Tìm tên…" value="${esc(val("xb-q",""))}"></label>`;
  const mq=x=>!q||noAcc(xbName(D,x)).toLowerCase().includes(q);
  let L=null;
  if(xbFl==="cap"){
    const seen=new Set();let ph="";
    for(const x of R.conf){if(seen.has(x.id))continue;const m=capMate(x);seen.add(x.id);if(m)seen.add(m.id);
      ph+=`<div class="xbpair"><span class="t"><b>${esc(xbName(D,x))}${m?` &amp; ${esc(xbName(D,m))}`:""}</b><small>${m?`đăng ký cặp · TB ${r2((xbLv(D,x)+xbLv(D,m))/2)}`:"chưa có cặp"}</small></span>${m?"":`<span class="xbchip wa">Thiếu cặp</span>`}</div>`}
    return h+`<div class="xbl">${ph||`<p class="rule">Chưa có ai đăng ký.</p>`}</div><small class="rule xbnote">Ghép, đổi cặp và chia bảng ở tab Hôm nay › Cặp, chia bảng.</small>`;
  }
  if(xbFl==="huy")L=cancel;else if(xbFl==="chua")L=unpaid;else if(xbFl==="cho")L=R.wait;else if(xbFl==="ngoai")L=R.all.filter(x=>x.guest);else L=R.all;
  L=L.filter(mq);
  const idx=new Map(R.all.map((x,i)=>[x.id,i]));
  h+=`<div class="xbl">${L.length?L.map(x=>xbRow(D,X,x,xbFl==="huy"?null:idx.get(x.id))).join(""):`<p class="rule">${q?"Không thấy tên này.":"Không có ai trong mục này."}</p>`}</div>`;
  if(R.wait.length&&xbFl==="all")h+=`<small class="rule xbnote">Từ số ${R.max+1} trở đi là chờ chỗ.</small>`;
  if(R.expired.length)h+=`<small class="rule xbnote">${R.expired.length} người giữ chỗ quá giờ chưa chuyển khoản, đã nhường chỗ.</small>`;
  h+=`<button class="xaddp" data-act="regadd">${regAddOpen?"Đóng":"+ Thêm người vào giải"}</button>${regAddOpen?`<div class="gadd" style="padding:0 12px 12px">${pplPick(D,D.players.filter(p=>!R.all.some(x=>x.pid===p.id)),{act:"regaddp",key:"rga"})}</div>`:""}`;
  return h;
}
function xBtc(D,X){
  return withX(X,()=>{
    const R=regList(D),st=xbStatus(X),s=xState(X),po=payOn();
    const got=R.all.filter(x=>x.pay==="ok").reduce((a,x)=>a+feeOf(x),0),exp=R.conf.reduce((a,x)=>a+feeOf(x),0);
    const g={M:0,F:0};for(const x of R.conf){const v=xbG(D,x);if(v==="F")g.F++;else g.M++}
    const L=R.conf.map(x=>xbLv(D,x)).filter(v=>v>0),avg=L.length?L.reduce((a,b)=>a+b,0)/L.length:0;
    let h=`<a class="xback" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk">‹ Lịch giải đấu</a>`;
    h+=`<section class="xbhd"><div class="r"><span class="xbst ${st.c}">${st.lb}</span><span class="t">${esc(st.t)}</span><button class="xbmore" data-act="xbmenu" aria-label="Thêm thao tác">···</button></div>
      <h1>${esc(xName(X))}</h1><span class="sub">${esc([X.at&&`${dowVN(X.at)} ${dmy(X.at).slice(0,5)} · ${xTime(X)}`,xFmt(X),X.courts&&`${X.courts} sân`,xFee(X)&&fmtK(xFee(X)),X.place].filter(Boolean).join(" · "))}</span></section>`;
    const tile=(l,v,sub,bar,c)=>`<div class="xbt"><span class="l">${l}</span><b class="num">${v}${sub?`<small>${sub}</small>`:""}</b>${bar!=null?`<i class="bar"><b class="${c||""}" style="width:${Math.max(0,Math.min(100,bar))}%"></b></i>`:""}</div>`;
    h+=`<div class="xbtiles">${tile("Chỗ",R.conf.length,+X.max?`/${X.max}`:"",+X.max?R.conf.length/X.max*100:null,"g")}${po?tile("Đã nhận",fmtK(got),exp?`/${fmtK(exp)}`:"",exp?got/exp*100:null):tile("Chờ chỗ",R.wait.length,"")}${tile("Nam · Nữ",`${g.M} · ${g.F}`,"")}${tile("Trình TB",avg?r2(avg):"–",L.length>1?` ${r2(Math.min(...L))}–${r2(Math.max(...L))}`:"")}</div>`;
    const T=s==="cancel"||s==="done"?[]:xbTodo(D,X,R);
    h+=`<span class="xbsec">Việc cần làm${T.length?` · ${T.length}`:""}</span><div class="xbtodo">${T.length?T.map(([c,t,b,a])=>`<div class="it"><i class="dot ${c}"></i><span>${t}</span><button ${a}>${b}</button></div>`).join(""):`<div class="it ok"><span>✓ Không có việc gì cần làm</span></div>`}</div>`;
    h+=xbList(D,X,R);
    if(s==="cancel"&&R.all.length)h+=`<small class="rule xbnote">Giải đấu đã huỷ: nhắn người đã đăng ký, hoàn phí người đã chuyển ở mục Đã huỷ.</small>`;
    // Nút chính theo giai đoạn
    const today=X.at&&(sameDay(X.at,Date.now())||X.at-Date.now()<864e5);
    let main="";
    if(s==="draft"||s==="plan")main=`<button class="primary" data-act="xopen" data-id="${X.id}">Mở đăng ký</button>`;
    else if(s==="live")main=`<a class="primary btnlike" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Về Hôm nay ›</a>`;
    else if(s==="open"&&xOpen(X)&&!today)main=`<button class="primary navy" data-act="xbclose" data-id="${X.id}">Đóng đăng ký</button>`;
    else if(s!=="done"&&s!=="cancel")main=`<button class="primary yel" data-act="xbcheck" data-id="${X.id}">⌗ Điểm danh tại sân</button>`;
    if(s!=="done"&&s!=="cancel")h+=`<div class="xbcta"><button class="line" data-act="xbshare">Chia sẻ</button>${main}</div>`;
    return h+xbSheets(D,X,R);
  });
}

/* ----- Các bảng trượt: 1 người · menu ··· · chia sẻ · nhật ký ----- */
function xbSheets(D,X,R){
  if(xbLog)return xbLogView(D,X);
  if(xbBulk){const L=R.all.filter(x=>x.pay==="sent"),sel=L.filter(x=>xbBulk.has(x.id)),tot=withX(X,()=>sel.reduce((a,x)=>a+feeOf(x),0));
    return xbDim("xbbulkx")+`<div class="mxsheet xbsh" role="dialog" aria-label="Duyệt tiền hàng loạt"><span class="grab"></span><b class="mxh">Duyệt tiền · ${L.length} báo chuyển</b>
      <small class="rule">Đối chiếu sao kê ngân hàng, bỏ tích người chưa thấy tiền rồi duyệt một lần.</small>
      ${L.map(x=>{const on=xbBulk.has(x.id);return `<button class="xbli xbck${on?" on":""}" data-act="xbbulkt" data-id="${esc(x.id)}" aria-pressed="${on}"><i aria-hidden="true">${on?"✓":""}</i><span>${esc(xbName(D,x))}<small>${x.sentAt?`báo ${hm(x.sentAt)} · `:""}${x.note?esc(x.note):""}</small></span><b>${fmtK(withX(X,()=>feeOf(x)))}</b></button>`}).join("")}
      <button class="primary wide" data-act="xbbulkok" ${sel.length?"":"disabled"}>✓ Duyệt ${sel.length} người · ${fmtK(tot)}</button><button class="line wide" data-act="xbbulkx">Đóng</button></div>`}
  if(xbSel){const x=(S.regs||[]).find(r=>r.id===xbSel);if(!x){xbSel=null;return ""}return xbPerson(D,X,R,x)}
  if(xbMenu)return xbMenuView(D,X,R);
  if(xbShare)return xbShareView(D,X,R);
  return "";
}
const xbDim=x=>`<div class="mxdim" data-act="${x}"></div>`;
function xbPerson(D,X,R,x){
  const p=x.pid&&D.pmap.get(x.pid),k=feeOf(x),pay=x.pay||"none",nm=xbName(D,x),pos=R.all.indexOf(x),wait=pos>=R.max,zid=zidOf(D,x),g=xbG(D,x),lv=xbLv(D,x);
  let h=xbDim("xbselx")+`<div class="mxsheet xbsh" role="dialog" aria-label="${esc(nm)}"><span class="grab"></span>
    <div class="xbwho">${av(p||{name:nm},"md",1)}<span class="t"><b>${esc(nm)}</b><small>${esc([g==="F"?"Nữ":g==="M"?"Nam":"",lv?`trình ${r2(lv)}`:"",x.guest?"ngoài CLB":"thành viên",x.cancel?"đã huỷ":pos>=0?(wait?`chờ chỗ ${pos-R.max+1}`:`vé #${pos+1}`):"",x.at?`đăng ký ${hm(x.at)} ${dmy(x.at).slice(0,5)}`:""].filter(Boolean).join(" · "))}</small></span></div>`;
  if(payOn()&&k){
    if(x.cancel)h+=`<div class="xbmoney ${pay==="refund"?"ok":"no"}"><span class="l">${pay==="refund"?"Đã hoàn phí":pay==="ok"||pay==="sent"?"Đã huỷ · cần hoàn phí":"Đã huỷ · chưa trả"}</span><b>${kVND(k)}</b></div>${pay==="ok"||pay==="sent"?`<button class="primary wide" data-act="regrefund" data-id="${esc(x.id)}">Đã hoàn phí</button>`:""}`;
    else if(pay==="sent")h+=`<div class="xbmoney wa"><span class="l">Báo đã chuyển · chưa đối chiếu</span><b>${kVND(k)}</b><small>Tìm trong app ngân hàng nội dung: <b>${esc(payNoteX(X,nm))}</b></small></div><div class="two"><button class="primary win" data-act="regpayok" data-id="${esc(x.id)}">✓ Đã thấy tiền</button><button class="line" data-act="xbunsent" data-id="${esc(x.id)}">Chưa thấy · thu lại</button></div>`;
    else if(pay==="ok")h+=`<div class="xbmoney ok"><span class="l">Đã nhận${x.okBy?` · ${esc(x.okBy)}`:""}${x.okAt?` lúc ${hm(x.okAt)}`:""}</span><b>${kVND(k)}</b></div><button class="ghost wide" data-act="regpayundo" data-id="${esc(x.id)}">Hoàn tác xác nhận tiền</button>`;
    else h+=`<div class="xbmoney no"><span class="l">Chưa trả</span><b>${kVND(k)}</b></div><button class="primary win wide" data-act="regpayok" data-id="${esc(x.id)}">✓ Đã nhận tiền</button>`;
  }
  h+=`<div class="xbacts">`;
  if(zid)h+=`<button class="xbli" data-act="zchat" data-v="${esc(zid)}" data-n="${esc(nm)}"><span>💬 Nhắn Zalo</span><span>›</span></button>`;
  h+=`<label class="xbli xbnoteip"><span>📝 Ghi chú</span><input id="xb-note" data-draft="xb-note" maxlength="80" placeholder="đến muộn 30′, trả tiền mặt…" value="${esc(val("xb-note",x.note||""))}"><button class="line sm" data-act="xbnote" data-id="${esc(x.id)}">Lưu</button></label>`;
  if(!x.cancel&&!wait&&pos>=0)h+=`<button class="xbli" data-act="xbtowait" data-id="${esc(x.id)}"><span>⏱ Chuyển xuống chờ chỗ</span><span>›</span></button>`;
  if(!x.cancel)h+=`<button class="xbli xbred" data-act="regdel" data-id="${esc(x.id)}"><span>🗑 Xoá khỏi giải${pay==="ok"||pay==="sent"?" · nhớ hoàn tiền":""}</span><span>›</span></button>`;
  return h+`</div><small class="rule">Mọi thao tác ghi vào Nhật ký giải.</small><button class="ghost wide" data-act="xbselx">Đóng</button></div>`;
}
function xbMenuView(D,X,R){
  const s=xState(X),dl=X.deadline||0;
  const sw=(k,on,l)=>`<button class="xbli" data-act="hnopt" data-k="${k}" data-id="${esc(X.id)}" aria-pressed="${on}"><span>${l}</span><span class="xbsw${on?" on":""}" aria-hidden="true"><i></i></span></button>`;
  let h=xbDim("xbmenux")+`<div class="mxsheet xbsh" role="dialog" aria-label="Thao tác giải"><span class="grab"></span><b class="mxh">${esc(xName(X))}</b><span class="mxsec">Cài nhanh</span><div class="xbacts">`;
  if(s!=="done"&&s!=="cancel"&&s!=="live"){
    h+=`<div class="xbli"><span>Đóng đăng ký<small>${dl?`${dowVN(dl)} ${dmy(dl).slice(0,5)} · ${hm(dl)}`:"khi tới giờ đánh"}</small></span><span class="b"><button class="line sm" data-act="xbdl" data-id="${X.id}" data-v="1">+1 ngày</button>${xOpen(X)?`<button class="line sm" data-act="xbclose" data-id="${X.id}">Đóng ngay</button>`:""}</span></div>`;
    h+=`<div class="xbli"><span>Số chỗ<small>${R.conf.length} đã giữ chỗ${R.wait.length?` · ${R.wait.length} chờ`:""}</small></span><span class="b"><button class="line sm" data-act="xbmax" data-id="${X.id}" data-v="-1" aria-label="Bớt chỗ">−</button><b class="num xbmaxv">${+X.max||"∞"}</b><button class="line sm" data-act="xbmax" data-id="${X.id}" data-v="1" aria-label="Thêm chỗ">+</button></span></div>`;
  }
  h+=sw("walkin",hnWalkOn(X),"Nhận vãng lai tại sân")+sw("payFirst",hnPayFirst(X),"Khách ngoài CLB trả trước")+`</div><span class="mxsec">Giải này</span><div class="xbacts">`;
  h+=`<button class="xbli" data-act="xedit" data-id="${X.id}"><span>Sửa cài đặt giải</span><span>›</span></button>`;
  h+=`<button class="xbli" data-act="xbdup" data-id="${X.id}"><span>Nhân bản sang tuần sau</span><span>›</span></button>`;
  h+=`<button class="xbli" data-act="xbtpl" data-id="${X.id}"><span>${X.tpl?"Bỏ khỏi mẫu giải":"Lưu làm mẫu giải"}<small>${X.tpl?"đang là mẫu · hiện ở đầu tab Tạo":"tạo nhanh giải giống vậy ở tab Tạo"}</small></span><span>›</span></button>`;
  h+=`<button class="xbli" data-act="xbexport" data-id="${X.id}"><span>Xuất danh sách <small>· Excel</small></span><span>›</span></button>`;
  h+=`<button class="xbli" data-act="xblog"><span>Nhật ký giải</span><span>›</span></button>`;
  if(s==="open")h+=`<button class="xbli" data-act="xpause" data-id="${X.id}"><span>Tạm dừng đăng ký</span><span>›</span></button>`;
  if(s==="draft"||s==="plan")h+=`<button class="xbli" data-act="xopen" data-id="${X.id}"><span>Mở đăng ký</span><span>›</span></button>`;
  if(s!=="cancel"&&s!=="done"&&s!=="live")h+=`<button class="xbli xbred" data-act="xcancel" data-id="${X.id}"><span>Huỷ giải đấu</span><span>›</span></button>`;
  if(!R.all.length&&s!=="live")h+=`<button class="xbli xbred" data-act="xdel" data-id="${X.id}"><span>Xoá giải đấu</span><span>›</span></button>`;
  return h+`</div><button class="ghost wide" data-act="xbmenux">Đóng</button></div>`;
}
// Tin gửi vào nhóm: kèm trạng thái tiền / chỉ tên / theo cặp
function xbGroupText(D,X,R,mode){
  const club=(CLUB&&CLUB.name)||"",left=+X.max?Math.max(0,+X.max-R.conf.length):null,po=payOn();
  const L=[`🏓 ${club}: ${xName(X)}${X.at?` · ${dowVN(X.at)} ${dmy(X.at).slice(0,5)} ${hm(X.at)}`:""}`,`Đã đăng ký ${R.conf.length}${+X.max?`/${X.max}`:""}${left?` · còn ${left} chỗ`:""}`];
  if(mode==="nhac"){const L2=[`⏰ ${club}: ${xName(X)}${X.at?` · ${dowVN(X.at)} ${dmy(X.at).slice(0,5)} · ${hm(X.at)}`:""}`];if(X.place)L2.push(`📍 ${X.place}`);
    if(X.at)L2.push(`Có mặt ${hm(X.at-20*6e4)} để check-in · mở Mini App, quét mã trên máy BTC`);
    const due=R.conf.filter(x=>po&&feeOf(x)>0&&x.pay!=="ok"&&x.pay!=="sent");if(due.length)L2.push(`Chưa trả lệ phí: ${due.map(x=>xbName(D,x)).join(", ")} · chuyển trước để vào nhanh`);
    L2.push(`Danh sách: ${R.conf.map(x=>xbName(D,x)).join(", ")}`);return L2.join("\n")}
  if(mode==="cb"){const L2=[`📣 ${club}: ${xName(X)}${X.at?` · ${dowVN(X.at)} ${dmy(X.at).slice(0,5)} · ${hm(X.at)}`:""}`,`${R.conf.length} người${+X.max?`/${X.max}`:""} · đã chốt danh sách`];
    if(pairRegOn(X)){const seen=new Set();let i=0;for(const x of R.conf){if(seen.has(x.id))continue;const m=capMate(x);seen.add(x.id);if(m)seen.add(m.id);L2.push(`${++i}. ${xbName(D,x)}${m?` & ${xbName(D,m)}`:""}`)}}
    else R.conf.forEach((x,i)=>L2.push(`${i+1}. ${xbName(D,x)}`));
    if(R.wait.length)L2.push(`Dự bị: ${R.wait.map(x=>xbName(D,x)).join(", ")}`);if(X.at)L2.push(`⏰ Có mặt ${hm(X.at-20*6e4)} để check-in`);L2.push("Lịch từng trận xem trong Mini App khi giải bắt đầu.");return L2.join("\n")}
  if(mode==="cap"&&pairRegOn(X)){const seen=new Set();let i=0;for(const x of R.conf){if(seen.has(x.id))continue;const m=capMate(x);seen.add(x.id);if(m)seen.add(m.id);L.push(`${++i}. ${xbName(D,x)}${m?` & ${xbName(D,m)}`:" (tìm cặp)"}`)}}
  else R.conf.forEach((x,i)=>L.push(`${i+1}. ${xbName(D,x)}${mode==="tien"&&po&&feeOf(x)?(x.pay==="ok"?" ✓":x.pay==="sent"?" ⏳":" ✗ chưa trả"):""}`));
  if(R.wait.length)L.push(`Chờ chỗ: ${R.wait.map(x=>xbName(D,x)).join(", ")}`);
  if(xOpen(X))L.push(`Đăng ký: ${miniLink(CID,X.id)}`);
  return L.join("\n");
}
function xbShareView(D,X,R){
  const link=miniLink(CID,X.id),po=payOn(),due=R.all.filter(x=>po&&feeOf(x)>0&&x.pay!=="ok"&&x.pay!=="sent");
  const md=(k,l,on)=>on===false?"":`<button data-act="xbmode" data-v="${k}" aria-pressed="${xbSendMode===k}">${l}</button>`;
  let h=xbDim("xbsharex")+`<div class="mxsheet xbsh" role="dialog" aria-label="Chia sẻ giải"><span class="grab"></span><b class="mxh">Chia sẻ giải</b>
    <div class="two"><button class="xbbig" data-act="regshare" data-id="${X.id}"><b>Mời đăng ký</b><small>Thẻ có poster, mở thẳng trang giải</small></button><button class="xbbig" data-act="xqr" data-id="${X.id}"><b>${xQr===X.id?"Ẩn mã QR":"Mã QR · Copy link"}</b><small>Dán ở sân hoặc gửi web</small></button></div>
    ${xQr===X.id?`<div class="dkqr">${qrSvgText(link,180)}<button class="line sm" data-act="cplink" data-v="${esc(link)}">Copy link</button></div>`:""}
    <span class="mxsec">Gửi danh sách vào nhóm Zalo</span><pre class="xbpre">${esc(xbGroupText(D,X,R,xbSendMode))}</pre>
    <div class="mxseg sm">${md("tien","Kèm tiền",po)}${md("ten","Chỉ tên")}${md("cap","Theo cặp",pairRegOn(X))}${md("cb","Công bố chốt")}${md("nhac","Nhắc giờ đánh")}</div>
    <button class="primary wide" data-act="xbsend">Gửi vào nhóm Zalo</button>`;
  if(due.length){const nz=due.filter(x=>zidOf(D,x)).length;
    h+=`<span class="mxsec">Nhắc người chưa trả · ${due.length}</span><div class="xbrem"><span>Mở chat Zalo lần lượt từng người, có sẵn lời nhắc kèm số tiền.</span><small>${esc(due.slice(0,5).map(x=>xbName(D,x)).join(" · "))}${due.length>5?"…":""}${nz<due.length?` · ${due.length-nz} người chưa liên kết Zalo`:""}</small>${nz?`<button class="line wide" data-act="xbremind">${xbRemind&&xbRemind.i>0?`Nhắc tiếp (${Math.min(xbRemind.i+1,nz)}/${nz})`:`Bắt đầu nhắc (1/${nz})`}</button>`:`<small>Chưa ai trong số này liên kết Zalo: gửi danh sách vào nhóm để nhắc chung.</small>`}</div>`}
  return h+`<button class="ghost wide" data-act="xbsharex">Đóng</button></div>`;
}
// Nhật ký: lấy từ dấu thời gian trên từng đăng ký + thao tác BTC lưu ở sched.log
function xbEvents(D,X){
  const E=[],nm=x=>xbName(D,x),k=x=>feeOf(x)?kVND(feeOf(x)):"";
  for(const x of (S.regs||[]).filter(r=>r.sid===X.id)){
    if(x.at)E.push({t:x.at,k:"dk",tx:`<b>${esc(nm(x))}</b> ${x.walkin?(x.addBy?`được ${esc(x.addBy)} thêm (đến muộn)`:"xin vào tại sân"):x.by?`được ${esc(x.by)} thêm vào giải`:"đăng ký"}${x.guest?" · ngoài CLB":""}`});
    if(x.paidAt)E.push({t:x.paidAt,k:"tien",tx:`<b>${esc(nm(x))}</b> báo đã chuyển khoản ${k(x)}`});
    if(x.okAt)E.push({t:x.okAt,k:"tien",tx:`<b>${esc(x.okBy||"BTC")}</b> xác nhận đã nhận tiền <b>${esc(nm(x))}</b> · ${k(x)}`});
    if(x.cancelAt)E.push({t:x.cancelAt,k:"dk",tx:`<b>${esc(nm(x))}</b> ${x.rejBy?`bị ${esc(x.rejBy)} từ chối`:"huỷ đăng ký"}${x.pay==="ok"||x.pay==="sent"?` · <span class="lose">cần hoàn ${k(x)}</span>`:""}`});
    if(x.refundAt)E.push({t:x.refundAt,k:"tien",tx:`Đã hoàn phí <b>${esc(nm(x))}</b> · ${k(x)}`});
    if(x.arrivedAt)E.push({t:x.arrivedAt,k:"dk",tx:`<b>${esc(nm(x))}</b> check-in ${x.arrBy==="btc"?"tay":"bằng QR"}`});
  }
  for(const l of (X.log||[]))E.push({t:l.t,k:"btc",tx:`<b>${esc(l.by||"BTC")}</b> ${esc(l.tx||"")}`});
  return E.sort((a,b)=>b.t-a.t);
}
function xbLogView(D,X){
  const E=xbEvents(D,X).filter(e=>xbLogF==="all"||e.k===xbLogF);
  const fb=(k,l)=>`<button data-act="xblogf" data-v="${k}" aria-pressed="${xbLogF===k}">${l}</button>`;
  let last="",h=xbDim("xblogx")+`<div class="mxsheet xbsh xblog" role="dialog" aria-label="Nhật ký giải"><span class="grab"></span><b class="mxh">Nhật ký giải</b><div class="xbfl">${fb("all","Tất cả")}${fb("tien","Tiền")}${fb("dk","Đăng ký · huỷ")}${fb("btc","BTC")}</div><div class="xbl">`;
  for(const e of E.slice(0,200)){const d=dmy(e.t);if(d!==last){h+=`<span class="mxsec">${esc(dowVN(e.t))} ${esc(d.slice(0,5))}</span>`;last=d}h+=`<div class="xblg"><span class="num">${hm(e.t)}</span><span>${e.tx}</span></div>`}
  if(!E.length)h+=`<p class="rule">Chưa có hoạt động.</p>`;
  return h+`</div><small class="rule">Ghi tự động từ đăng ký, tiền, check-in và thao tác của ban tổ chức.</small><button class="ghost wide" data-act="xblogx">Đóng</button></div>`;
}
const xbLogAdd=(X,tx)=>db.collection("sched").doc(X.id).update({log:[...(X.log||[]).slice(-199),{t:Date.now(),by:who(),tx}]});

async function xbAct(act,b,id,D){
  if(!/^xb/.test(act))return false;
  const X=id&&schedById(id)||(routeX&&schedById(routeX));
  if(act==="xbfl"){xbFl=b.dataset.v||"all";xbSel=null;render();return true}
  if(act==="xbsel"){xbSel=id;delete drafts["xb-note"];render();return true}
  if(act==="xbselx"){xbSel=null;render();return true}
  if(act==="xbmenu"){xbMenu=true;render();return true}
  if(act==="xbmenux"){xbMenu=false;render();return true}
  if(act==="xbshare"){xbShare=true;xbMenu=false;render();return true}
  if(act==="xbsharex"){xbShare=false;render();return true}
  if(act==="xblog"){xbLog=true;xbMenu=false;render();return true}
  if(act==="xblogx"){xbLog=false;render();return true}
  if(act==="xblogf"){xbLogF=b.dataset.v||"all";render();return true}
  if(act==="xbbulk"){const R=withX(X,()=>regList(D));xbBulk=new Set(R.all.filter(x=>x.pay==="sent").map(x=>x.id));render();return true}
  if(act==="xbbulkx"){xbBulk=null;render();return true}
  if(act==="xbbulkt"){if(xbBulk){xbBulk.has(id)?xbBulk.delete(id):xbBulk.add(id)}render();return true}
  if(act==="xbbulkok"){const L=(S.regs||[]).filter(x=>xbBulk&&xbBulk.has(x.id)&&x.pay==="sent");xbBulk=null;
    await write(async()=>{for(const x of L){await db.collection("regs").doc(x.id).update({pay:"ok",okAt:Date.now(),okBy:who()});if(x.pid&&xPaySid(x,D))await savePay(D.sid,nx=>{nx.paid[x.pid]=true})}await xbLogAdd(X,`duyệt tiền ${L.length} người`)},`Đã xác nhận tiền ${L.length} người`);return true}
  if(act==="xbtpl"){const on=!X.tpl;await write(()=>db.collection("sched").doc(X.id).update({tpl:on}),on?"Đã lưu làm mẫu giải":"Đã bỏ khỏi mẫu");return true}
  if(act==="xbmode"){xbSendMode=b.dataset.v||"tien";render();return true}
  if(!X)return true;
  if(act==="xbsend"){const R=withX(X,()=>regList(D));await sendText(withX(X,()=>xbGroupText(D,X,R,xbSendMode)));return true}
  if(act==="xbremind"){
    const R=withX(X,()=>regList(D)),due=R.all.filter(x=>withX(X,()=>payOn()&&feeOf(x)>0)&&x.pay!=="ok"&&x.pay!=="sent").filter(x=>zidOf(D,x));
    if(!MINI){xbShare=true;render();toast("Mở Pikeco trong Zalo để nhắn từng người.");return true}
    if(!due.length){toast("Người chưa trả chưa liên kết Zalo. Gửi danh sách vào nhóm để nhắc chung.");xbShare=true;render();return true}
    if(!xbRemind||xbRemind.x!==X.id||xbRemind.i>=due.length)xbRemind={x:X.id,i:0};
    const x=due[xbRemind.i++],k=withX(X,()=>feeOf(x));
    await zChat(zidOf(D,x),`Chào ${xbName(D,x)}, bạn nhớ chuyển lệ phí ${kVND(k)} cho ${xName(X)}${X.at?` (${dowVN(X.at)} ${dmy(X.at).slice(0,5)})`:""} nhé. Nội dung: ${payNoteX(X,xbName(D,x))}. Cảm ơn bạn!`);
    if(xbRemind.i>=due.length){toast(`Đã nhắc hết ${due.length} người`);xbRemind=null}
    render();return true}
  if(!canWrite)return true;
  if(act==="xbclose"){if(!armOr("xbclose:"+X.id))return true;await write(async()=>{await db.collection("sched").doc(X.id).update({deadline:Date.now()});await xbLogAdd(schedById(X.id)||X,"đóng đăng ký")},"Đã đóng đăng ký");xbMenu=false;return true}
  if(act==="xbdl"){const base=Math.max(X.deadline||0,Date.now()),nd=base+864e5;await write(async()=>{await db.collection("sched").doc(X.id).update({deadline:nd,...(X.st==="draft"?{}:{})});await xbLogAdd(X,`gia hạn đăng ký tới ${dowVN(nd)} ${dmy(nd).slice(0,5)} ${hm(nd)}`)},"Đã gia hạn thêm 1 ngày");return true}
  if(act==="xbmax"){const R=withX(X,()=>regList(D)),cur=+X.max||R.conf.length||0,n=Math.max(1,cur+Number(b.dataset.v||0));if(n===cur)return true;
    await write(async()=>{await db.collection("sched").doc(X.id).update({max:n});await xbLogAdd(X,`đổi số chỗ ${cur} → ${n}`)});return true}
  if(act==="xbunsent"){const x=(S.regs||[]).find(r=>r.id===id)||(S.regs||[]).find(r=>r.id===xbSel);if(!x)return true;await write(()=>db.collection("regs").doc(x.id).update({pay:"none"}),"Chưa thấy tiền: nhờ VĐV trả tại bàn");return true}
  if(act==="xbnote"){const x=(S.regs||[]).find(r=>r.id===b.dataset.id);if(!x)return true;const v=String(val("xb-note","")).trim().slice(0,80);await write(()=>db.collection("regs").doc(x.id).update({note:v}),"Đã lưu ghi chú");delete drafts["xb-note"];return true}
  if(act==="xbtowait"){const x=(S.regs||[]).find(r=>r.id===b.dataset.id);if(!x)return true;if(!armOr("xbtowait:"+x.id))return true;
    await write(async()=>{await db.collection("regs").doc(x.id).update({at:Date.now()});await xbLogAdd(X,`chuyển ${xbName(D,x)} xuống chờ chỗ`)},"Đã chuyển xuống chờ chỗ");xbSel=null;return true}
  if(act==="xbcheck"){await xApply(D,X);go("app",{tab:"san"});return true}
  if(act==="xbdup"){const skip=new Set(["id","num","st","doneAt","log","openAt","createdAt"]),n={};for(const [k,v] of Object.entries(X))if(!skip.has(k))n[k]=v;
    for(const k of ["at","deadline","lockAt"])if(+n[k])n[k]=+n[k]+7*864e5;n.st="draft";n.createdAt=Date.now();
    let nid=null;await write(async()=>{const ref=db.collection("sched").doc();nid=ref.id;await ref.set(n)},`Đã tạo ${xName(X)} tuần sau (nháp)`);xbMenu=false;if(nid)go("app",{tab:"dk",x:nid});return true}
  if(act==="xbexport"){const R=withX(X,()=>regList(D)),po=payOn();
    const rows=[["STT","Tên","Giới tính","Trình","Loại","Trạng thái","Tiền","Đăng ký lúc","Ghi chú"]];
    R.all.forEach((x,i)=>rows.push([i+1,xbName(D,x),xbG(D,x)==="F"?"Nữ":"Nam",r2(xbLv(D,x)),x.guest?"Ngoài CLB":"Thành viên",i<R.max?"Giữ chỗ":"Chờ chỗ",po&&withX(X,()=>feeOf(x))?(x.pay==="ok"?"Đã nhận":x.pay==="sent"?"Báo chuyển":"Chưa trả"):"",x.at?`${dmy(x.at)} ${hm(x.at)}`:"",x.note||""]));
    const tsv=rows.map(r=>r.map(c=>String(c).replace(/[\t\n]/g," ")).join("\t")).join("\n");
    if(!MINI&&typeof Blob!=="undefined"&&document.createElement){try{const csv="﻿"+rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
      const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"}));a.download=`${slugOf(xName(X))||"giai"}-${dmy(X.at||Date.now()).replace(/\//g,"-")}.csv`;a.click();toast("Đã tải file danh sách (mở bằng Excel)");return true}catch(e){}}
    try{await navigator.clipboard.writeText(tsv);toast("Đã chép danh sách: dán vào Excel hoặc Google Sheets")}catch(e){await sendText(tsv)}return true}
  return true;
}
