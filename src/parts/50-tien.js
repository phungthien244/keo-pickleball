const THU={keo:"Kèo thua góp",deu:"Chia đều chi phí",phi:"Lệ phí cố định",khong:"Quỹ CLB trả"};
const GT={khong:"Không có giải",trich:"Trích % phần dư",codinh:"Số tiền cố định",gop:"Góp thêm vào giải"};
function money(D){
  const c=D.c,thu=c.thu||"keo",gt=c.gt||"khong",cs=c.costs||{};
  const cost=(+cs.court||0)+(+cs.water||0)+(+cs.ball||0)+(+cs.other||0);
  const att=D.players.filter(p=>D.st.get(p.id).g>0),n=att.length;
  const games=att.reduce((s,p)=>s+D.st.get(p.id).g,0);
  const base=new Map(),bu=new Map(),gop=new Map();
  for(const p of att)base.set(p.id,thu==="keo"?D.st.get(p.id).charged:thu==="deu"?(n?Math.ceil(cost/n):0):thu==="phi"?(+c.phi||0):0);
  const fund=[...base.values()].reduce((a,b)=>a+b,0),gap=fund-cost;
  if(thu==="keo"&&gap<0&&games)for(const p of att)bu.set(p.id,Math.ceil(-gap*D.st.get(p.id).g/games));
  const buTot=[...bu.values()].reduce((a,b)=>a+b,0);
  if(gt==="gop")for(const p of att)gop.set(p.id,+c.gtv||0);
  const gopTot=[...gop.values()].reduce((a,b)=>a+b,0),surplus=fund+buTot-cost;
  const pot=gt==="trich"?Math.floor(Math.max(0,gap)*(+c.gtv||0)/100):gt==="codinh"?(+c.gtv||0):gt==="gop"?gopTot:0;
  const club=surplus-(gt==="trich"||gt==="codinh"?pot:0);
  const baseOf=id=>base.get(id)||0,shareOf=id=>bu.get(id)||0,gopOf=id=>gop.get(id)||0,payOf=id=>baseOf(id)+shareOf(id)+gopOf(id);
  return {thu,gt,cost,att,fund,gap,buTot,gopTot,pot,club,collected:fund+buTot+gopTot,baseOf,shareOf,gopOf,payOf,perGame:thu==="keo"&&gap<0&&games?-gap/games:0,share:Math.max(0,...bu.values())};
}
function prizes(D,M){
  if(!M.pot)return [];
  if(isG(D.c)){const GD=gDerive(D);if(!GD)return [];const parts=String(D.c.chia||"50,30,20").split(",").map(Number),T=GD.table.filter(t=>!t.out);
    return parts.map((p,i)=>T[i]?{label:["Vô địch","Hạng 2","Hạng 3"][i],ids:[T[i].p.a,T[i].p.b],k:Math.round(M.pot*p/100)}:null).filter(Boolean)}
  const st=standings(D).filter(r=>r.s.g),avg=st.reduce((a,r)=>a+r.s.g,0)/(st.length||1),ok=st.filter(r=>r.s.g>=0.7*avg);
  const m=ok.find(r=>r.p.gender!=="F"),f=ok.find(r=>r.p.gender==="F"),w=[m&&{label:"Số 1 nam",ids:[m.p.id]},f&&{label:"Số 1 nữ",ids:[f.p.id]}].filter(Boolean);
  w.forEach(x=>x.k=Math.round(M.pot/w.length));return w;
}
const hClub=h=>h&&h.money?(h.money.club!=null?h.money.club:(h.rows||[]).reduce((a,r)=>a+(+r.pay||0),0)-(+h.money.cost||0)):0;
function clubFund(before){return S.hist.filter(h=>before==null||h.sid<before).reduce((a,h)=>a+hClub(h),0)}
function moneySnap(D,M){
  const pz=prizes(D,M);
  return {thu:M.thu,gt:M.gt,gtv:+D.c.gtv||0,chia:D.c.chia||"",phi:+D.c.phi||0,fund:M.fund,cost:M.cost,gap:M.gap,buTot:M.buTot,gopTot:M.gopTot,pot:M.pot,club:M.club,collected:M.collected,share:M.share,perGame:M.perGame,costs:{...D.c.costs},
    prizes:pz.map(x=>({label:x.label,ids:x.ids,names:x.ids.map(id=>D.pmap.get(id)?.name||"?"),k:x.k}))};
}
const payRow=(D,M,id)=>{const s=D.st.get(id);return {charged:s.charged,capped:!!s.capped,base:M.baseOf(id),bu:M.shareOf(id),gop:M.gopOf(id),pay:M.payOf(id)}};
let setupOpen=null;
function setupPanel(D){
  if(!canWrite)return "";
  const c=D.c,lock=D.SM.length>0,thu=c.thu||"keo",gt=c.gt||"khong",G=isG(c),open=setupOpen==null?!lock:setupOpen;
  const M=money(D),pz=prizes(D,M);
  const sum=`${G?"Cặp cố định":"Xoay cặp"} · ${THU[thu]}${thu==="phi"?` ${c.phi||0}k`:""} · ${gt==="khong"?"không có giải":GT[gt]+(gt==="trich"?` ${c.gtv||0}%`:gt==="codinh"?` ${c.gtv||0}k`:gt==="gop"?` ${c.gtv||0}k/người`:"")}`;
  let h=`<div class="setup"><button class="sethd" data-act="setupt" aria-expanded="${open}"><span><span class="lbl">Thiết lập buổi #${D.sid}${lock?" · đã khoá":""}</span><b>${esc(sum)}</b></span><span aria-hidden="true">${open?"▲":"▼"}</span></button>`;
  if(!open)return h+`</div>`;
  const dis=lock?"disabled":"";
  const sg=(k,v,cur,l)=>`<button data-act="cset" data-k="${k}" data-v="${v}" aria-pressed="${cur===v}" ${dis}>${l}</button>`;
  const inp=(k,label,v,extra="")=>`<label><span class="lbl">${label}</span><input id="cf-${k}" data-draft="cf-${k}" data-save="cfg" data-key="${k}" type="number" inputmode="decimal" min="0" value="${esc(val("cf-"+k,v))}" ${extra}></label>`;
  h+=`<div class="setb">${lock?`<p class="rule">Buổi đã có trận nên thể thức, cách thu và cách trao giải đã khoá. Số tiền và chi phí vẫn sửa được đến lúc kết thúc buổi.</p>`:""}
  <div class="sgrp"><span class="lbl">1 · Thể thức</span><span class="seg segw">${sg("fmt","xoay",G?"giai":"xoay","Xoay cặp")}${sg("fmt","giai",G?"giai":"xoay","Cặp cố định")}</span></div>
  <div class="sgrp"><span class="lbl">2 · Cách thu tiền</span><span class="seg segw">${Object.entries(THU).map(([v,l])=>sg("thu",v,thu,l)).join("")}</span>
   <p class="rule">${thu==="keo"?"Đội thua mỗi người góp theo luật kèo bên dưới. Quỹ kèo thiếu so với chi phí thì chia theo số trận mỗi người đã đánh.":thu==="deu"?"Chi phí buổi chia đều cho những người có đánh.":thu==="phi"?"Mỗi người có đánh đóng một mức cố định. Dư vào quỹ CLB, thiếu thì quỹ CLB bù.":"Không ai phải đóng, quỹ CLB trả toàn bộ chi phí buổi."}</p>
   ${thu==="phi"?`<div class="form">${inp("phi","Lệ phí mỗi người (k)",c.phi||50)}</div>`:""}
   ${thu==="keo"?`<div class="form">${inp("fee","Thua thường (k/người)",c.fee)}${inp("cap","Trần mỗi người (k)",c.cap)}
     <label><span class="lbl">Kèo cân trình</span><select id="cf-keo" data-save="cfg" data-key="keo"><option value="1" ${c.keo?"selected":""}>Bật</option><option value="0" ${!c.keo?"selected":""}>Tắt</option></select></label>
     <label><span class="lbl">Lệch từ</span><select id="cf-thr" data-save="cfg" data-key="thr">${[0.65,0.7,0.75,0.8].map(x=>`<option value="${x}" ${c.thr===x?"selected":""}>${Math.round(x*100)}% thắng</option>`).join("")}</select></label>
     ${inp("hi","Đội mạnh thua (k)",c.hi)}${inp("lo","Đội yếu thua (k)",c.lo)}</div>`:""}</div>
  <div class="sgrp"><span class="lbl">3 · Giải thưởng</span><span class="seg segw">${Object.entries(GT).map(([v,l])=>sg("gt",v,gt,l)).join("")}</span>
   ${gt!=="khong"?`<div class="form">${inp("gtv",gt==="trich"?"Trích bao nhiêu % phần dư":gt==="codinh"?"Quỹ CLB bỏ ra (k)":"Mỗi người góp thêm (k)",c.gtv||(gt==="trich"?30:gt==="codinh"?200:20))}</div>`:""}
   ${gt!=="khong"&&G?`<span class="seg segw">${[["100","Chỉ vô địch"],["60,40","60 / 40"],["50,30,20","50 / 30 / 20"]].map(([v,l])=>sg("chia",v,c.chia||"50,30,20",l)).join("")}</span>`:""}
   <p class="rule">${gt==="khong"?"Buổi này không trao giải.":G?"Giải trao cho các cặp đứng đầu bảng xếp hạng cuối giải.":"Giải chia đều cho Số 1 nam và Số 1 nữ theo bảng xếp hạng buổi. Chỉ người đánh đủ ít nhất 70% số trận trung bình của buổi mới được xét."}</p></div>
  <div class="sgrp"><span class="lbl">Chi phí buổi (k)</span><div class="form">${inp("court","Tiền sân",c.costs.court)}${inp("water","Tiền nước",c.costs.water)}${inp("ball","Tiền bóng",c.costs.ball)}${inp("other","Khác",c.costs.other)}<label><span class="lbl">Tên hiển thị</span><input id="cf-title" data-draft="cf-title" data-save="cfg" data-key="title" value="${esc(val("cf-title",c.title))}"></label></div></div>
  <div class="kpis k4"><div class="kpi"><div class="lbl">Phải thu</div><div class="v num">${fmtK(M.collected)}</div></div><div class="kpi"><div class="lbl">Chi phí</div><div class="v num">${fmtK(M.cost)}</div></div><div class="kpi"><div class="lbl">Quỹ giải</div><div class="v num">${fmtK(M.pot)}</div></div><div class="kpi hl"><div class="lbl">${M.club>=0?"Vào quỹ CLB":"Quỹ CLB bù"}</div><div class="v num">${fmtK(Math.abs(M.club))}</div></div></div>
  <p class="rule">Tính theo các trận đã đánh tới giờ${pz.length?` · đang dẫn: ${pz.map(x=>`${x.label} ${x.ids.map(id=>esc(D.pmap.get(id)?.name||"?")).join(" &amp; ")} ${fmtK(x.k)}`).join(" · ")}`:""}. Quỹ CLB hiện có ${fmtK(clubFund(D.sid))}.</p></div>`;
  return h+`</div>`;
}
function prizeCards(D,list){
  if(!list||!list.length)return "";
  return `<div class="przs">${list.map(x=>`<div class="prz"><span class="avs">${x.ids.map((id,i)=>av(D.pmap.get(id)||{name:(x.names||[])[i]||"?"},"md")).join("")}</span><span class="t"><span class="k">${esc(x.label)}</span><b>${x.ids.map((id,i)=>esc(D.pmap.get(id)?.name||(x.names||[])[i]||"?")).join(" &amp; ")}</b></span><span class="v num">${fmtK(x.k)}</span></div>`).join("")}</div>`;
}
function payTable(D,sid,list,paid,live){
  const pr=list.filter(r=>r.pay>0||r.base>0).sort((a,b)=>b.pay-a.pay),tot=pr.reduce((s,r)=>s+r.pay,0);
  if(!pr.length)return `<p class="rule">Buổi này không ai phải đóng tiền.</p>`;
  const n=pr.filter(r=>r.pay>0).length,p=pr.filter(r=>r.pay>0&&paid[r.id]).length;
  const bd=r=>[r.base?`${r.kind||"tiền buổi"} ${fmtK(r.base)}${r.capped?" (trần)":""}`:"",r.bu?`bù ${fmtK(r.bu)}`:"",r.gop?`giải ${fmtK(r.gop)}`:""].filter(Boolean).join(" + ");
  return `<div class="tbl-wrap"><table class="payt"><thead><tr><th>Tên</th><th>Phải đóng</th></tr></thead><tbody>${pr.map(r=>`<tr><td><span class="pn">${av(r.P,"sm")}<span><b>${esc(r.name)}</b><span class="meta" style="display:block">${r.g} trận · thua ${r.l}</span><span class="meta" style="display:block">${bd(r)}</span></span></span></td><td><div class="paycell"><b>${fmtK(r.pay)}</b>${paid[r.id]?`<span class="paidpill">✓ Đã nhận</span>`:r.pay>0&&BANK?`<button class="paybtn" data-act="pay" data-sid="${sid}" data-n="${esc(r.name)}" data-k="${r.pay}">Chuyển tiền</button>`:""}${canWrite&&!live&&r.pay>0?`<button class="ghost paidtg" data-act="paid" data-id="${sid}" data-p="${r.id}">${paid[r.id]?"Bỏ dấu":"Đã nhận?"}</button>`:""}</div></td></tr>`).join("")}</tbody><tfoot><tr><td>TỔNG THU${n&&!live?` · ĐÃ NHẬN ${p}/${n}`:""}</td><td><b class="num">${fmtK(tot)}</b></td></tr></tfoot></table></div>`;
}
function vTien(D){
  const c=D.c,M=money(D),pz=prizes(D,M),cf=clubFund(D.sid);
  let h=`<div class="kpis"><div class="kpi"><div class="lbl">Phải thu · ${esc(THU[M.thu])}</div><div class="v num">${fmtK(M.collected)}</div></div>
    <div class="kpi"><div class="lbl">Chi phí buổi</div><div class="v num">${fmtK(M.cost)}</div></div>
    <div class="kpi"><div class="lbl">Quỹ giải</div><div class="v num">${fmtK(M.pot)}</div></div>
    <div class="kpi hl"><div class="lbl">${M.club>=0?"Vào quỹ CLB":"Quỹ CLB bù"}</div><div class="v num">${fmtK(Math.abs(M.club))}</div><div class="meta" style="color:var(--sky)">Quỹ CLB sau buổi: ${fmtK(cf+M.club)}</div></div></div>`;
  const CC=[["court","Tiền sân","var(--navy)"],["water","Tiền nước","var(--blue)"],["ball","Tiền bóng","var(--blue-2)"],["other","Khác","var(--line-2)"]].filter(x=>+c.costs[x[0]]>0);
  if(CC.length)h+=`<div class="panel"><div class="cbar">${CC.map(x=>`<span style="flex:${+c.costs[x[0]]};background:${x[2]}"></span>`).join("")}</div><div class="cleg">${CC.map(x=>`<div><i style="background:${x[2]}"></i>${x[1]}<b class="num">${fmtK(+c.costs[x[0]])}</b></div>`).join("")}</div><p class="rule">Sửa chi phí, cách thu và giải thưởng ở khung Thiết lập buổi trong tab Sân.</p></div>`;
  else h+=`<p class="rule">Chưa nhập chi phí buổi. Nhập ở khung Thiết lập buổi trong tab Sân.</p>`;
  if(M.pot)h+=`<div class="shd"><h2>Giải thưởng${D.done.length?" · tạm tính":""}</h2></div>${pz.length?prizeCards(D,pz):`<p class="rule">Chưa đủ trận để xét giải.</p>`}`;
  if(!M.att.length)h+=`<div class="empty"><strong>Chưa có ai phải góp</strong>Tiền sẽ tự tính khi lưu tỉ số các trận.</div>`;
  else{h+=`<div class="shd"><h2>Mỗi người phải đóng</h2></div>`+payTable(D,D.sid,M.att.map(p=>{const s=D.st.get(p.id);return {id:p.id,name:p.name,P:p,g:s.g,l:s.l,kind:{keo:"kèo",deu:"chia đều",phi:"lệ phí"}[M.thu],...payRow(D,M,p.id)}}),{},true)}
  h+=`<div class="bar"><button class="primary" data-act="copy">Copy tổng kết gửi Zalo</button></div><textarea id="copybox" rows="8" readonly hidden></textarea>`;
  if(canWrite)h+=isG(c)?`<p class="rule">Buổi giải được kết thúc và lưu ở tab Sân (nút Kết thúc giải).</p>`:`<div class="panel"><h2 style="margin-bottom:6px">Bắt đầu buổi mới</h2><p class="rule">Lưu buổi #${D.sid} (xếp hạng, các trận, bảng tiền, giải thưởng) vào tab Lịch sử rồi mở buổi mới. Phần dư hoặc thiếu được cộng vào quỹ CLB. Rating cuối buổi này thành trình của mỗi người cho buổi sau.</p>
    <div class="bar" style="margin-top:10px"><button class="endbtn" data-act="reset">${Date.now()<resetArm?"Bấm lần nữa để xác nhận kết thúc":`Kết thúc buổi #${D.sid}`}</button></div></div>`;
  return h;
}
function moneySec(D,sid,snap,rows,P,noPrize){
  const M=snap?.money;if(!M)return "";
  const nw=M.club!=null,cs=M.costs||{},paid=snap.paid||{};
  const CC=[["court","Sân","var(--navy)"],["water","Nước","var(--blue)"],["ball","Bóng","var(--blue-2)"],["other","Khác","var(--line-2)"]].filter(z=>+cs[z[0]]>0);
  const club=nw?M.club:M.gap,coll=nw?M.collected:M.fund;
  let h=`<div class="shd"><h2>Tiền quỹ</h2></div><div class="k3"><div class="kpi"><div class="lbl">${nw?esc(THU[M.thu]||"Thu"):"Quỹ kèo"}</div><div class="v num">${fmtK(coll)}</div></div><div class="kpi"><div class="lbl">Chi phí</div><div class="v num">${fmtK(M.cost)}</div></div><div class="kpi hl"><div class="lbl">${club>=0?"Vào quỹ CLB":"Quỹ CLB bù"}</div><div class="v num">${fmtK(Math.abs(club))}</div></div></div>`;
  if(CC.length)h+=`<div class="panel"><div class="cbar">${CC.map(z=>`<span style="flex:${+cs[z[0]]};background:${z[2]}"></span>`).join("")}</div><div class="bar" style="gap:8px 16px">${CC.map(z=>`<span class="meta" style="display:inline-flex;align-items:center;gap:6px"><i style="width:9px;height:9px;background:${z[2]};display:block"></i>${z[1]} ${fmtK(+cs[z[0]])}</span>`).join("")}</div>${M.perGame?`<p class="rule" style="margin-top:8px">Quỹ kèo thiếu ${fmtK(-M.gap)} so với chi phí, chia theo số trận mỗi người đã đánh: khoảng ${fmtK(M.perGame)}/trận.</p>`:""}</div>`;
  if(!noPrize&&nw&&M.prizes&&M.prizes.length)h+=`<div class="shd"><h2>Giải thưởng</h2></div>${prizeCards(D,M.prizes)}<p class="rule">Quỹ giải ${fmtK(M.pot)} · ${esc(GT[M.gt]||"")}${M.gt==="trich"?` ${M.gtv}% phần dư`:""}.</p>`;
  h+=payTable(D,sid,rows.map(r=>({id:r.id,name:r.name,P:P(r),kind:{keo:"kèo",deu:"chia đều",phi:"lệ phí"}[M.thu]||"kèo",g:r.w+r.l,l:r.l,capped:r.capped,base:r.base!=null?r.base:(r.charged||0),bu:r.bu!=null?r.bu:Math.max(0,(r.pay||0)-(r.charged||0)),gop:r.gop||0,pay:r.pay||0})),paid,false);
  return h;
}
const pmLoading=new Set();
function pastMatches(sid){
  if(sid===(cfg().session||1))return S.matches;
  if(S.pm[sid])return S.pm[sid];
  if(db&&!pmLoading.has(sid)){pmLoading.add(sid);db.collection("matches").where("session",sid).get().then(q=>{S.pm[sid]=q.docs.map(d=>({id:d.id,...d.data()}));pmLoading.delete(sid);render()}).catch(()=>{S.pm[sid]=[];pmLoading.delete(sid);render()})}
  return null;
}
