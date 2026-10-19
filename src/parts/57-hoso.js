/* ---------- Hồ sơ vận động viên: /<clb>/vdv/<mã người chơi> ---------- */
let allM=null,allMLoading=false;
function loadAllMatches(){
  if(allM||allMLoading||!db)return;allMLoading=true;
  db.collection("matches").get().then(q=>{allM=q.docs.map(d=>({id:d.id,...d.data()}));allMLoading=false;render()}).catch(()=>{allM=[];allMLoading=false;render()});
}
function profileData(D,id){
  const cur=D.sid,H=[...S.hist].filter(h=>h.sid<cur).sort((a,b)=>a.sid-b.sid);
  const ses=[];
  for(const h of H){const r=(h.rows||[]).find(x=>x.id===id);if(!r)continue;
    let medal=0;if(h.type==="giai"){const T=((h.giai||{}).table||[]).filter(t=>!t.out),i=T.findIndex(t=>t.a===id||t.b===id);if(i>=0&&i<3)medal=i+1}
    ses.push({sid:h.sid,at:h.startedAt||h.endedAt,w:r.w||0,l:r.l||0,rating:+r.rating,d:+r.d,sname:h.sname||"",giai:h.type==="giai",medal,mvp:h.type!=="giai"&&(h.rows||[])[0]?.id===id&&(h.rows||[]).length>1})}
  const s=D.st.get(id);
  if(s&&s.g)ses.push({sid:cur,at:Date.now(),w:s.w,l:s.l,rating:s.rating,d:s.d,sname:D.c.sname||"",today:true,medal:0,mvp:false});
  const done=[...(allM||[]).filter(m=>(m.session||1)!==cur),...D.SM].filter(m=>m.status==="done"&&[...m.a,...m.b].includes(id))
    .sort((a,b)=>(a.session||1)-(b.session||1)||(a.doneAt||0)-(b.doneAt||0)||(a.seq||0)-(b.seq||0));
  const res=done.map(m=>{const inA=m.a.includes(id),win=inA?m.sa>m.sb:m.sb>m.sa;return {m,win,mate:(inA?m.a:m.b).find(x=>x!==id),opp:inA?m.b:m.a,my:inA?m.sa:m.sb,op:inA?m.sb:m.sa}});
  let best=0,run=0;for(const r of res){run=r.win?run+1:0;best=Math.max(best,run)}
  const P=new Map(),O=new Map();
  for(const r of res){if(r.mate){const x=P.get(r.mate)||{g:0,w:0};x.g++;if(r.win)x.w++;P.set(r.mate,x)}
    for(const o of r.opp){const x=O.get(o)||{g:0,w:0};x.g++;if(r.win)x.w++;O.set(o,x)}}
  const partners=[...P].filter(([,x])=>x.g>=3).sort((a,b)=>b[1].w/b[1].g-a[1].w/a[1].g||b[1].g-a[1].g).slice(0,3);
  const rivals=[...O].filter(([,x])=>x.g>=3&&x.w<x.g/2).sort((a,b)=>a[1].w/a[1].g-b[1].w/b[1].g||b[1].g-a[1].g).slice(0,2);
  const wins=res.filter(r=>r.win).length;
  return {ses,res,best,partners,rivals,wins,games:res.length||ses.reduce((a,x)=>a+x.w+x.l,0),winsAll:res.length?wins:ses.reduce((a,x)=>a+x.w,0)};
}
function ratingChart(ses){
  const pts=ses.filter(x=>Number.isFinite(x.rating));
  if(pts.length<2)return `<p class="rule">Cần ít nhất 2 buổi để vẽ biểu đồ.</p>`;
  const st=Number.isFinite(pts[0].d)?pts[0].rating-pts[0].d:pts[0].rating,V=[st,...pts.map(x=>x.rating)];
  const lo=Math.min(...V),hi=Math.max(...V),pad=(hi-lo)*0.15||0.1,a=lo-pad,b=hi+pad,W=330,Hh=120;
  const X=i=>10+i*(W-20)/(V.length-1),Y=v=>Hh-10-(v-a)/(b-a)*(Hh-20);
  const mx=V.indexOf(hi);
  return `<svg viewBox="0 0 ${W} ${Hh}" width="100%" height="${Hh}" role="img" aria-label="Rating từ ${r2(st)} đến ${r2(V[V.length-1])}">
    <line x1="0" y1="${Y(hi)}" x2="${W}" y2="${Y(hi)}" stroke="#eef1f4"/><line x1="0" y1="${Y(lo)}" x2="${W}" y2="${Y(lo)}" stroke="#eef1f4"/>
    <polyline points="${V.map((v,i)=>`${X(i).toFixed(1)},${Y(v).toFixed(1)}`).join(" ")}" fill="none" stroke="#1f8fe5" stroke-width="3" stroke-linejoin="round"/>
    ${mx>0&&mx<V.length-1?`<circle cx="${X(mx)}" cy="${Y(hi)}" r="4" fill="#0c2b44"/>`:""}<circle cx="${X(V.length-1)}" cy="${Y(V[V.length-1])}" r="6" fill="#f2e205" stroke="#0c2b44" stroke-width="2"/></svg>
    <div class="pleg num"><span>Bắt đầu ${r2(st)}</span><span>Cao nhất ${r2(hi)}</span><span>Hiện tại ${r2(V[V.length-1])}</span></div>`;
}
function vHoSo(D,id){
  const p=D.pmap.get(id);
  if(!p)return `<div class="empty"><strong>Không tìm thấy vận động viên</strong>Người này có thể đã bị xoá khỏi CLB.</div>`;
  loadAllMatches();
  const s=D.st.get(id),all=[...D.players].sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating),rank=all.findIndex(x=>x.id===id)+1;
  const sameG=all.filter(x=>(x.gender==="F")===(p.gender==="F")),rg=sameG.findIndex(x=>x.id===id)+1;
  const X=profileData(D,id),last=X.ses[X.ses.length-1],pc=X.games?Math.round(X.winsAll/X.games*100):0;
  const titles=[];const gold=X.ses.filter(x=>x.medal===1),silver=X.ses.filter(x=>x.medal===2),bronze=X.ses.filter(x=>x.medal===3),mvp=X.ses.filter(x=>x.mvp);
  if(gold.length)titles.push(["1","Vô địch",gold.length>1?`${gold.length} giải`:(gold[0].sname||`Giải buổi #${gold[0].sid}`),"g"]);
  if(silver.length)titles.push(["2","Á quân",silver.length>1?`${silver.length} giải`:(silver[0].sname||`Giải buổi #${silver[0].sid}`),"s"]);
  if(bronze.length)titles.push(["3","Hạng ba",bronze.length>1?`${bronze.length} giải`:(bronze[0].sname||`Giải buổi #${bronze[0].sid}`),"b"]);
  if(mvp.length)titles.push(["★","MVP",`${mvp.length} buổi`,"m"]);
  if(rank===1&&all.length>1)titles.push(["#1","Số 1 CLB","rating cao nhất hiện tại","n"]);
  const first=X.ses[0];
  let h=`<section class="phero"><span class="bk">Hồ sơ vận động viên</span>
    <div class="pid">${av(p,"xl")}<div class="t"><h1>${esc(p.name)}</h1><span class="mt">${p.code?esc(p.code)+" · ":""}${p.gender==="F"?"Nữ":"Nam"}${first?` · đánh từ ${dmy(first.at).replace(/^\d+\//,"")}`:""}</span><span class="rkb">#${rank} CLB · Số ${rg} ${p.gender==="F"?"nữ":"nam"}</span></div></div>
    <div class="prt"><div><span class="k">Rating</span><b class="num">${r2(s.rating)}</b></div>${last&&Number.isFinite(last.d)?`<div class="dd"><b class="${dCls(last.d)} num">${dTxt(last.d)}</b><small>${last.today?"hôm nay":`buổi #${last.sid}`}</small></div>`:""}</div>
    ${proExtra(p)}<button class="pshare" data-act="pshare" data-id="${esc(id)}">Chia sẻ hồ sơ</button></section>${proEdit(D,id)}
  <div class="pstats"><div><b class="num">${X.ses.length}</b><span>Buổi</span></div><div><b class="num">${X.games}</b><span>Trận</span></div><div><b class="num">${pc}%</b><span>Thắng</span></div><div><b class="num">${allM?X.best:"…"}</b><span>Chuỗi thắng</span></div></div>`;
  h+=card(`Rating qua các buổi<span class="meta">${X.ses.length} buổi</span>`,ratingChart(X.ses));
  if(titles.length)h+=card("Danh hiệu",`<div class="ptit">${titles.map(([i,a,b,c])=>`<div class="bd ${c}"><i>${i}</i><span><b>${a}</b>${esc(b)}</span></div>`).join("")}</div>`);
  if(!allM)h+=`<p class="rule">Đang tải các trận…</p>`;
  else{
    const F=X.res.slice(-10);
    if(F.length)h+=card(`Phong độ<span class="meta">${F.length} trận gần nhất · ${F.filter(r=>r.win).length}–${F.filter(r=>!r.win).length}</span>`,`<div class="pform">${F.map(r=>`<i class="${r.win?"w":"l"}" title="${r.my}–${r.op}">${r.win?"T":"B"}</i>`).join("")}</div><div class="pleg"><span>Cũ hơn</span><span>Mới nhất →</span></div>`);
    const pr=(pid,x,good)=>{const q=D.pmap.get(pid)||{name:"(đã xoá)"},pct2=Math.round(x.w/x.g*100);return `<div class="pr">${av(q,"md")}<span class="t"><b>${esc(q.name)}</b><small class="num">${good?`${x.g} trận · ${x.w} thắng`:`gặp ${x.g} lần · thắng ${x.w}`}</small>${good?`<span class="pbar"><i style="width:${pct2}%"></i></span>`:""}</span><span class="pc num ${good?(pct2>=50?"g":""):"r"}">${good?pct2+"%":`${x.w}–${x.g-x.w}`}</span></div>`};
    h+=card(`Đồng đội hợp nhất<span class="meta">đánh cùng từ 3 trận</span>`,X.partners.length?X.partners.map(([q,x])=>pr(q,x,true)).join(""):`<p class="rule">Chưa đánh cùng ai đủ 3 trận.</p>`);
    if(X.rivals.length)h+=card(`Đối thủ khó nhất<span class="meta">gặp từ 3 lần</span>`,X.rivals.map(([q,x])=>pr(q,x,false)).join(""));
  }
  if(X.ses.length)h+=card(`Các buổi đã đánh<span class="meta">${X.ses.length} buổi</span>`,[...X.ses].reverse().slice(0,10).map(x=>{const tag=x.medal?`<span class="ptag m${x.medal}">${["","Nhất","Nhì","Ba"][x.medal]}</span>`:x.mvp?`<span class="ptag mv">MVP</span>`:"";
    const inner=`<span class="sno num"><small>Buổi</small>${x.sid}</span><span class="t"><b>${x.today?"Hôm nay":dmy(x.at)}${x.sname?" · "+esc(x.sname):x.giai?" · Giải":""}${tag}</b><small class="num">${x.w+x.l} trận · ${x.w} thắng ${x.l} thua</small></span><span class="${dCls(x.d)} num dv">${Number.isFinite(x.d)?dTxt(x.d):""}</span>`;
    return x.today?`<div class="psr">${inner}</div>`:`<a class="psr" href="${pathOf("buoi",{sid:x.sid})}" data-go="buoi" data-id="${x.sid}">${inner}</a>`}).join(""));
  if(allM&&X.res.length){const tn=ids=>ids.map(i=>esc(D.pmap.get(i)?.name||"?")).join(" &amp; ");
    h+=card("Trận gần đây",[...X.res].reverse().slice(0,5).map(r=>{const m=r.m,aw=m.sa>m.sb;return `<div class="pmc"><div class="h"><span>Buổi #${m.session||1} · Sân ${esc(m.cn||m.court||"?")} · Trận #${m.seq||"?"}</span><span>${m.doneAt?new Date(m.doneAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}):""}</span></div><div class="r${aw?" win":""}"><span>${tn(m.a)}</span><b class="num">${m.sa}</b></div><div class="r${!aw?" win":""}"><span>${tn(m.b)}</span><b class="num">${m.sb}</b></div></div>`}).join(""))}
  return h+`<p class="rule" style="text-align:center">Hồ sơ công khai trong CLB, không hiện tiền phải đóng.</p>`;
}
function profileShare(D,id){
  const p=D.pmap.get(id);if(!p)return "";const s=D.st.get(id),X=profileData(D,id),all=[...D.players].sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating),rank=all.findIndex(x=>x.id===id)+1;
  const pc=X.games?Math.round(X.winsAll/X.games*100):0,gold=X.ses.filter(x=>x.medal===1).length;
  return [`HỒ SƠ ${p.name.toUpperCase()} · ${clubNm(D)}`,`Rating ${r2(s.rating)} (#${rank} CLB) · ${X.ses.length} buổi · thắng ${pc}%`,gold?`Vô địch ${gold} giải`:""].filter(Boolean).join("\n");
}
