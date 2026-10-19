const THU={keo:"Kèo thua góp",deu:"Chia đều chi phí",phi:"Lệ phí cố định",khong:"Quỹ CLB trả"};
const GT={khong:"Không có giải",trich:"Trích % phần dư",codinh:"Số tiền cố định",gop:"Góp thêm vào giải",hang:"Tiền từng hạng"};
const hangOf=c=>[+c.hang1||0,+c.hang2||0,+c.hang3||0];
const chiaOf=c=>{const a=c.chia1!=null?[+c.chia1||0,+c.chia2||0,+c.chia3||0]:String(c.chia||"50,30,20").split(",").map(Number);while(a.length<3)a.push(0);return a.slice(0,3)};
function money(D,extra){
  const c=D.c,off=c.cphi===false,thu=off?"khong":(c.thu||"keo"),gt=c.gt||"khong",cs=off?{}:(c.costs||{});
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
  const pot=gt==="trich"?Math.floor(Math.max(0,gap)*(+c.gtv||0)/100):gt==="codinh"?(+c.gtv||0):gt==="gop"?gopTot:gt==="hang"?hangOf(c).reduce((a,b)=>a+b,0):0;
  const club=surplus-(gt==="trich"||gt==="codinh"||gt==="hang"?pot:0);
  const baseOf=id=>base.get(id)||0,shareOf=id=>bu.get(id)||0,gopOf=id=>gop.get(id)||0,autoOf=id=>baseOf(id)+shareOf(id)+gopOf(id);
  // Số riêng ban tổ chức đặt cho từng người (khách, đến muộn, miễn): phần chênh đi thẳng vào quỹ CLB
  const PD=payDoc(D.sid),adj={...(PD.adj||{}),...(extra||{})},hasAdj=id=>adj[id]!=null&&adj[id]!=="";
  const payOf=id=>hasAdj(id)?Math.max(0,+adj[id]||0):autoOf(id),delta=att.reduce((s,p)=>s+payOf(p.id)-autoOf(p.id),0);
  return {thu,gt,cost,att,fund,gap,buTot,gopTot,pot,club:club+delta,collected:fund+buTot+gopTot+delta,baseOf,shareOf,gopOf,payOf,autoOf,hasAdj,perGame:thu==="keo"&&gap<0&&games?-gap/games:0,share:Math.max(0,...bu.values())};
}
function prizes(D,M){
  if(!M.pot)return [];
  if(isG(D.c)){const GD=gDerive(D);if(!GD)return [];const T=GD.table.filter(t=>!t.out),ks=M.gt==="hang"?hangOf(D.c):chiaOf(D.c).map(p=>Math.round(M.pot*p/100));
    return ks.map((k,i)=>k>0&&T[i]?{label:["Giải nhất","Giải nhì","Giải ba"][i],ids:[T[i].p.a,T[i].p.b],k}:null).filter(Boolean)}
  const st=standings(D).filter(r=>r.s.g),avg=st.reduce((a,r)=>a+r.s.g,0)/(st.length||1),ok=st.filter(r=>r.s.g>=0.7*avg);
  // Xoay cặp trao theo hạng 1, 2, 3 cá nhân: tiền từng hạng, hoặc chia % quỹ giải
  if(M.gt==="hang"||D.c.trao==="top3"){const ks=M.gt==="hang"?hangOf(D.c):chiaOf(D.c).map(p=>Math.round(M.pot*p/100));
    return ks.map((k,i)=>k>0&&ok[i]?{label:["Hạng nhất","Hạng nhì","Hạng ba"][i],ids:[ok[i].p.id],k}:null).filter(Boolean)}
  const m=ok.find(r=>r.p.gender!=="F"),f=ok.find(r=>r.p.gender==="F"),w=[m&&{label:"Số 1 nam",ids:[m.p.id]},f&&{label:"Số 1 nữ",ids:[f.p.id]}].filter(Boolean);
  w.forEach(x=>x.k=Math.round(M.pot/w.length));return w;
}
const hClub=h=>h&&h.money?(h.money.club!=null?h.money.club:(h.rows||[]).reduce((a,r)=>a+(+r.pay||0),0)-(+h.money.cost||0)):0;
function clubFund(before){return S.hist.filter(h=>before==null||h.sid<before).reduce((a,h)=>a+hClub(h),0)}
function moneySnap(D,M){
  const pz=prizes(D,M);
  return {on:D.c.cphi!==false,thu:M.thu,gt:M.gt,gtv:+D.c.gtv||0,chia:chiaOf(D.c).join(","),hang:hangOf(D.c),phi:+D.c.phi||0,fund:M.fund,cost:M.cost,gap:M.gap,buTot:M.buTot,gopTot:M.gopTot,pot:M.pot,club:M.club,collected:M.collected,share:M.share,perGame:M.perGame,costs:D.c.cphi===false?{}:{...D.c.costs},
    prizes:pz.map(x=>({label:x.label,ids:x.ids,names:x.ids.map(id=>D.pmap.get(id)?.name||"?"),k:x.k}))};
}
const payRow=(D,M,id)=>{const s=D.st.get(id);return {charged:s.charged,capped:!!s.capped,base:M.baseOf(id),bu:M.shareOf(id),gop:M.gopOf(id),pay:M.payOf(id)}};
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
function moneySec(D,sid,snap,rows,P,noPrize){
  const M=snap?.money;if(!M)return "";
  // Buổi không tích "Chi phí": không hiện phần tiền, chỉ hiện giải thưởng nếu có
  if(M.on===false)return !noPrize&&M.prizes&&M.prizes.length?`<div class="shd"><h2>Giải thưởng</h2></div>${prizeCards(D,M.prizes)}`:"";
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
