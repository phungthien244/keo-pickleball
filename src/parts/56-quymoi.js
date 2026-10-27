/* ---------- Quỹ (ban tổ chức): một con số to, việc tiếp theo, một nút ghi thu chi ----------
   Trang con (qView): nay · so · no · phi · bc · fv, mở từ "Thêm việc ⋯" hoặc các thẻ. Người chơi xem như cũ (vTienOld). */
let qMore=false;
const Q_SUB={nay:"Tiền giải đang làm",so:"Cả sổ thu chi",no:"Còn nợ",phi:"Phí thành viên hằng tháng",bc:"Báo cáo tháng",fv:"Ai được xem quỹ"};
function vTien(D){
  if(!canWrite||legacy)return vTienOld(D);
  if(qView!=="main"&&Q_SUB[qView]){
    const body=qView==="so"?vSoQuy(D):qView==="no"?vQuyNo(D):qView==="phi"?vQuyPhi(D):qView==="bc"?vQuyBC(D):qView==="fv"?`<section class="card2"><div class="cb">${fvCard()}</div></section>`:vQuyBuoi(D);
    return gmHd(Q_SUB[qView],"qv",{v:"main"})+body;
  }
  const bal=fundNow(),r=qReport(0),DB=debts(),MF=mfDebts(D),nD=new Set([...DB,...MF].map(x=>x.id)).size,sD=DB.reduce((a,x)=>a+x.k,0)+MF.reduce((a,x)=>a+x.k,0);
  let h=`<section class="qhero"><span class="cap">Quỹ CLB đang có</span><b class="num">${bal<0?"−":""}${fmtK(Math.abs(bal))}</b><small>Tháng ${r.m}: thu ${fmtK(r.tin)} · chi ${fmtK(r.tout)}</small></section>`;
  if(nD)h+=`<button class="gmnext qnext" data-act="qv" data-v="no"><span class="cap">👉 Việc tiếp theo</span><b>${nD} người còn nợ · ${fmtK(sD)}</b><small>Chạm để nhắc qua Zalo hoặc đánh dấu đã nhận</small></button>`;
  const X=xCur(),live=phaseOf(D)==="live";
  if(live||D.done.length){const R=recv(D,money(D));h+=`<button class="qcur" data-act="qv" data-v="nay"><span class="t"><b>${esc(X?xName(X):(D.c.sname||"Giải đang đánh"))}</b><small>${R.tot?`Đã thu ${fmtK(R.got)}/${fmtK(R.tot)}${R.left>0?` · còn ${fmtK(R.left)}`:" · đủ"}`:"Tiền tự tính khi lưu tỉ số"}</small></span><span aria-hidden="true">›</span></button>`}
  const E=qEntries().slice(0,4);
  h+=`<section class="qrec"><span class="cap">Gần đây</span>${E.length?E.map(x=>`<div class="qli"><span class="t"><b>${x.t}</b><small>${x.at?dmy(x.at).slice(0,5)+" · ":""}${x.sub}</small></span><b class="num ${x.k>=0?"pos":"neg"}">${x.k>=0?"+":"−"}${fmtK(Math.abs(x.k))}</b></div>`).join(""):`<p class="rule">Chưa có khoản nào. Chốt giải là tự ghi một dòng.</p>`}<button class="lnk" data-act="qv" data-v="so">Xem cả sổ ›</button></section>`;
  h+=`<div class="hqcta two">${MINI?`<button class="btn-line gmdot" data-act="qmore" aria-label="Thêm việc">⋯</button>`:`<button class="btn-line" data-act="qmore">Thêm việc ⋯</button>`}<button class="ball go" data-act="ledf" data-v="chi">＋ Ghi thu / chi</button></div>`;
  return h+qSheets(D);
}
function qSheets(D){
  if(ledForm){const thu=ledForm==="thu",k=val("lg-k",""),n=val("lg-n",""),A=[100,200,500,1000],N=thu?["Tài trợ","Phí thành viên","Bán đồ","Khác"]:["Tiền sân","Bóng","Nước","Khác"];
    return `<div class="mxdim" data-act="ledx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Ghi thu chi"><span class="grab"></span>
      <div class="qtg"><button data-act="ledf" data-v="thu" aria-pressed="${thu}" class="t">＋ Thu vào</button><button data-act="ledf" data-v="chi" aria-pressed="${!thu}" class="c">− Chi ra</button></div>
      <label class="fld"><span class="lbl">Bao nhiêu (k)</span><input class="qbig num" id="lg-k" data-draft="lg-k" type="number" inputmode="decimal" min="0" value="${esc(k)}" placeholder="0"></label>
      <div class="gmchips c4">${A.map(a=>`<button class="gmchip${String(k)===String(a)?" on":""}" data-act="qamt" data-v="${a}">${a>=1000?a/1000+"tr":a+"k"}</button>`).join("")}</div>
      <span class="gmlb">Cho việc gì?</span><div class="gmchips c4">${N.map(a=>`<button class="gmchip${n===a?" on":""}" data-act="qnote" data-v="${a}">${a}</button>`).join("")}</div>
      <label class="fld"><span class="sr">Nội dung</span><input id="lg-n" data-draft="lg-n" maxlength="80" placeholder="${thu?"Ví dụ: Tài trợ áo":"Ví dụ: Mua 2 hộp bóng"}" value="${esc(n)}"></label>
      ${errs.led?`<p class="err">${esc(errs.led)}</p>`:""}<button class="ball wide go" data-act="ledsave">✓ Lưu khoản ${thu?"thu":"chi"}${+k?` ${fmtK(+k)}`:""}</button><button class="btn-line" data-act="ledx">Thôi</button></div>`}
  if(!qMore)return "";
  const R=[["📊","Báo cáo tháng","Thu chi từng tháng, gửi vào nhóm","bc"],["💳","Phí thành viên hằng tháng","Ai đã đóng, nhắc người chưa đóng","phi"],["📒","Cả sổ thu chi","Tất cả các khoản, xoá dòng ghi nhầm","so"],["💸","Còn nợ","Ai chưa trả, nhắc qua Zalo","no"],["🏓","Tiền giải đang làm","Ai đã đóng lệ phí giải hôm nay","nay"],["👁","Ai được xem quỹ","Chỉ ban tổ chức, hay cả thành viên","fv"]];
  return `<div class="mxdim" data-act="qmorex"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Thêm việc với quỹ"><span class="grab"></span><b class="mxh">Thêm việc với quỹ</b>
    ${R.map(([i,t,s,v])=>`<button class="gmli" data-act="qv" data-v="${v}"><i>${i}</i><span class="t"><b>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`).join("")}
    <button class="gmli" data-act="qcsv"><i>⇩</i><span class="t"><b>Tải file Excel tháng này</b><small>Để lưu trữ, gửi kế toán</small></span><span aria-hidden="true">›</span></button>
    <button class="btn-line" data-act="qmorex">Đóng</button></div>`;
}
