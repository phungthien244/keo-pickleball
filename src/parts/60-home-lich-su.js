function sessList(D){
  const ids=new Set();for(const k in S.pm)if(+k<D.sid&&(S.pm[k]||[]).some(m=>m.status==="done"))ids.add(+k);
  for(const h of S.hist)if(h.sid<D.sid)ids.add(h.sid);
  return [...ids].sort((a,b)=>b-a).map(sid=>{
    const snap=S.hist.find(h=>h.sid===sid);
    const ms=(S.pm[sid]||[]).filter(m=>m.status==="done").sort((a,b)=>(a.doneAt||0)-(b.doneAt||0));
    let rows=snap?snap.rows:null;
    if(!rows){const t=new Map();for(const m of ms){const aw=m.sa>m.sb;
      for(const [ids,f,a,w] of [[m.a,m.sa,m.sb,aw],[m.b,m.sb,m.sa,!aw]])for(const id of ids){const x=t.get(id)||{id,name:D.pmap.get(id)?.name||"(đã xóa)",w:0,l:0,pf:0,pa:0};w?x.w++:x.l++;x.pf+=f;x.pa+=a;t.set(id,x)}}
      rows=[...t.values()].sort((x,y)=>(y.w/(y.w+y.l))-(x.w/(x.w+x.l))||(y.pf-y.pa)-(x.pf-x.pa))}
    const at=snap?.startedAt||ms[0]?.doneAt||ms[0]?.createdAt||0;
    return {sid,snap,ms,rows,at};
  });
}
const pct=(w,g)=>g?Math.round(w/g*100):0;
const dTxt=d=>d==null?"–":Math.abs(d)<0.005?"0.00":(d>0?"▲ ":"▼ ")+Math.abs(d).toFixed(2);
const dCls=d=>d==null||Math.abs(d)<0.005?"":d>0?"up":"down";
function lastHist(D){return [...S.hist].filter(h=>h.sid<D.sid).sort((a,b)=>b.sid-a.sid)[0]}
function vHome(D){
  const H=lastHist(D),L=sessList(D);
  const ppl=D.players.map(p=>{const s=D.st.get(p.id),A=D.all.get(p.id),hr=H&&H.rows?H.rows.find(r=>r.id===p.id):null;
    return {p,r:s.rating,A,d:s.g?s.d:hr?hr.d:null,dl:s.g?"hôm nay":H?`buổi #${H.sid}`:""}}).sort((a,b)=>b.r-a.r||b.A.g-a.A.g);
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),wait=D.players.filter(p=>p.active!==false&&!busy.has(p.id)).length;
  let h=meBox(D)+`<a class="livecta" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><span><span class="e">Hôm nay · buổi #${D.sid}</span><span class="t">Vào sân trực tiếp</span><span class="m num">${D.done.length||D.playing.length?`${D.done.length} trận xong · ${D.playing.length} đang đánh · ${wait} người chờ`:`Chưa có trận nào · ${D.players.filter(p=>p.active!==false).length} người có mặt`}</span></span><span class="chev" aria-hidden="true">›</span></a>`;
  if(!ppl.length)return h+`<div class="empty"><strong>Chưa có thành viên</strong>Vào tab Thành viên để thêm người chơi.</div>`;
  const F=x=>x.p.gender==="F", top=ppl[0], sec=ppl[1], alt=F(top)?ppl.find(x=>!F(x)):ppl.find(F);
  const pod=(x,cls,lb)=>x?`<div class="pod ${cls}">${av(x.p,cls==="p1"?"lg":"md")}<span class="n">${esc(x.p.name)}</span><span class="r num">${r2(x.r)}</span><span class="stp">${lb}</span></div>`:`<div class="pod ${cls}"></div>`;
  const nF=ppl.filter(F).length,nM=ppl.length-nF;
  const q=String(val("hq","")).trim().toLowerCase();
  const list=ppl.map((x,i)=>({...x,i})).filter(x=>(hF==="all"||(hF==="F")===F(x))&&(!q||x.p.name.toLowerCase().includes(q)));
  const fb=(v,l,n)=>`<button data-act="hf" data-v="${v}" aria-pressed="${hF===v}">${l} · ${n}</button>`;
  if(ppl.length>=2){const third=alt&&alt!==sec?alt:ppl[2],lb3=alt&&alt!==sec?(F(alt)?"Số 1 nữ":"Số 1 nam"):"Số 3";
    const card=(x,i,lb)=>x?`<div class="pc p${i}"><span class="md">${lb}</span><span class="avs">${av(x.p,i===1?"lg":"md")}</span><span class="tx"><span class="n">${esc(x.p.name)}</span><span class="s num">${x.A.g?`${x.A.ses.size} buổi · thắng ${pct(x.A.w,x.A.g)}%`:"chưa đánh"}${x.d!=null?` · <span class="${dCls(x.d)}">${dTxt(x.d)}</span>`:""}</span></span><span class="pz num">${r2(x.r)}</span></div>`:"";
    h+=`<div class="lab"><span class="eyebrow">Top rating${H?` · sau buổi #${H.sid}`:""}</span><a href="#bang">Xem cả bảng</a></div>
  <div class="gpod hpod">${card(top,1,"Số 1 CLB")}${card(sec,2,"Số 2")}${card(third,3,lb3)}</div>`}
  h+=`<div class="tiles" style="margin-top:16px"><a class="tile" href="${pathOf("app",{tab:"tien"})}" data-go="app" data-t="tien"><span class="k">Quỹ CLB</span><b class="num">${(fundNow()<0?"−":"")+fmtK(Math.abs(fundNow()))}</b><small>${H?`sau buổi #${H.sid}`:"chưa có buổi nào"}</small></a>
    <a class="tile" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi"><span class="k">Thành viên</span><b class="num">${ppl.length}</b><small>${nM} nam · ${nF} nữ</small></a></div>
  <div class="lab" id="bang"><span class="eyebrow">Bảng rating CLB</span></div>
  <div class="bar"><label style="display:flex;flex:1 1 240px"><span class="lbl" style="position:absolute;width:1px;height:1px;overflow:hidden">Tìm thành viên</span><input id="hq" data-draft="hq" type="search" placeholder="Tìm thành viên theo tên" value="${esc(val("hq",""))}" style="width:100%"></label>
    <span class="seg" role="group" aria-label="Lọc theo giới">${fb("all","Tất cả",ppl.length)}${fb("M","Nam",nM)}${fb("F","Nữ",nF)}</span></div>
  <div class="lb">${list.length?list.map(x=>`<div class="lbr${x.i===0?" top1":""}${x.p.id===ME?" me":""}"><span class="rk num">${x.i+1}</span><span class="who">${av(x.p,"md")}<span class="t"><b>${esc(x.p.name)}</b><small class="num">${x.p.gender==="F"?"Nữ":"Nam"} · ${x.A.g?`${x.A.ses.size} buổi · thắng ${pct(x.A.w,x.A.g)}%`:"chưa đánh"}</small></span></span><span class="rt"><b class="num">${r2(x.r)}</b><small class="${dCls(x.d)} num">${dTxt(x.d)}</small></span></div>`).join(""):`<p class="rule" style="padding:14px">Không tìm thấy ai khớp.</p>`}</div>`;
  if(L.length)h+=`<div class="lab"><span class="eyebrow">Các buổi gần đây</span></div><div class="clist">${L.slice(0,3).map(x=>{const m=x.rows[0];return `<a class="sescard" href="${pathOf("buoi",{sid:x.sid})}" data-go="buoi" data-id="${x.sid}"><span class="no"><small>BUỔI</small><b class="num">${x.sid}</b></span><span class="bd"><b>${dmy(x.at)}</b><span class="num">${x.ms.length||x.snap?.matchCount||0} trận · ${x.rows.length} người</span>${(()=>{const r=ME&&x.rows.find(r=>r.id===ME);return r?`<span class="mine">Bạn: ${r.w}–${r.l}${r.pay?` · đóng ${fmtK(r.pay)}`:""}</span>`:""})()}${x.snap?.type==="giai"?(()=>{const t=(x.snap.giai?.table||[]).find(t=>!t.out);return t?`<span class="mvpl"><span class="gtag">GIẢI</span>${esc(t.na)} &amp; ${esc(t.nb)} vô địch</span>`:""})():m?`<span class="mvpl"><span class="mvptag">MVP</span>${esc(m.name)} · ${m.w}–${m.l}</span>`:""}</span><span class="chev" aria-hidden="true">›</span></a>`}).join("")}</div>
  <a class="btn-line" style="margin-top:12px" href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls">Lịch sử tất cả các buổi</a>`;
  h+=`<details class="why"><summary>Rating là gì?</summary><p>Rating là điểm trình độ, cách tính giống DUPR. Mỗi trận app đoán trước tỉ số dựa trên rating hai đội. Đánh tốt hơn dự đoán thì rating tăng, kể cả khi thua; kém hơn dự đoán thì giảm, kể cả khi thắng. Rating chốt khi kết thúc mỗi buổi.</p></details>`;
  return h;
}
// Tin nhắn chia sẻ lên nhóm Zalo (link trang tổng kết được nối thêm ở cuối)
const clubNm=D=>String(CLUB?.name||D.c.title||"CLB").trim();
const fmtLine=(snap,fallback)=>[snap?.type==="giai"?"Giải cặp cố định":"Xoay cặp",snap?.rule||fallback].filter(Boolean).join(" · ");
function shareText(D,x){
  const r=x.rows,s=x.snap||{},M=s.money,n=x.ms.length||s.matchCount||0,m=r[0];
  const L=[`TỔNG KẾT ${s.sname?s.sname.toUpperCase()+" · ":""}BUỔI #${x.sid} · ${dmy(x.at)}`,`${clubNm(D)} · ${fmtLine(s)} · ${n} trận · ${r.length} người`];
  if(m)L.push(`MVP: ${m.name} ${m.w}–${m.l} (HS ${m.pf-m.pa>0?"+":""}${m.pf-m.pa})`);
  if(r.length>1)L.push("Top 3: "+r.slice(0,3).map((z,i)=>`${i+1}. ${z.name}`).join(" · "));
  if(M&&(M.cost||M.collected||M.fund)){const cl=M.club!=null?M.club:M.gap;L.push(`Quỹ: thu ${fmtK(M.collected!=null?M.collected:M.fund)} · chi ${fmtK(M.cost)} · ${cl>=0?"vào quỹ CLB":"quỹ CLB bù"} ${fmtK(Math.abs(cl))}`)}
  if(M&&M.prizes&&M.prizes.length)L.push("Giải: "+M.prizes.map(z=>`${z.label} ${(z.names||[]).join(" & ")} ${fmtK(z.k)}`).join(" · "));
  if(M&&r.some(z=>(+z.pay||0)>0)){if(BANK)L.push(`Chuyển khoản: ${BANK.name} ${BANK.acc} (${BANK.holder})`);L.push("Xem số tiền mỗi người phải đóng và bấm Chuyển khoản để có mã QR:")}
  else L.push("Xem kết quả từng trận và rating:");
  return L.join("\n");
}
const dmy=t=>{if(!t)return "";const d=new Date(t);return `${d.getDate()}/${d.getMonth()+1}/${d.getFullYear()}`};
function vBuoi(D,sid){
  const x=sessList(D).find(z=>z.sid===sid);
  const back="";
  if(!x&&!S.hReady)return back+`<div class="empty"><strong>Đang tải buổi #${sid}…</strong></div>`;
  if(!x)return back+`<div class="empty"><strong>Chưa có tổng kết buổi #${sid||""}</strong>${sid===D.sid?"Buổi này đang diễn ra. Trang tổng kết có sau khi ban tổ chức chốt buổi.":"Không tìm thấy buổi này, có thể đã bị xóa."}</div>`;
  if(x.snap?.type==="giai")return vGiaiSum(D,x,back);
  const pmL=pastMatches(sid);
  const snap=x.snap,rows=x.rows,ms=x.ms,pm=D.pmap,P=r=>pm.get(r.id)||{name:r.name,gender:r.gender};
  const pts=ms.reduce((s,m)=>s+(+m.sa||0)+(+m.sb||0),0);
  const mv=rows[0];
  const big=ms.length?[...ms].sort((a,b)=>Math.abs(b.sa-b.sb)-Math.abs(a.sa-a.sb))[0]:null;
  const close=ms.length>1?[...ms].sort((a,b)=>Math.abs(a.sa-a.sb)-Math.abs(b.sa-b.sb)||Math.max(b.sa,b.sb)-Math.max(a.sa,a.sb))[0]:null;
  const tn=ids=>ids.map(id=>nm(D,id)).join(" &amp; ");
  const hl=(k,m)=>{if(!m)return "";const aw=m.sa>m.sb;return `<div class="mini" style="flex-direction:column;align-items:flex-start"><div class="t"><span class="k">${k}</span><span class="v y num">${Math.max(m.sa,m.sb)}–${Math.min(m.sa,m.sb)}</span><span class="v s">${aw?tn(m.a):tn(m.b)} thắng ${aw?tn(m.b):tn(m.a)} · trận #${m.seq}</span></div></div>`};
  let h=back+`<div class="hero"><div class="phead"><span class="eyebrow">${x.snap?.sname?esc(x.snap.sname)+" · ":""}Tổng kết · ${dmy(x.at)}</span><h1 class="num">Buổi #${sid}</h1></div>
    <div class="stats"><div><b class="num">${ms.length||snap?.matchCount||0}</b><small>TRẬN</small></div><div><b class="num">${rows.length}</b><small>NGƯỜI CHƠI</small></div><div><b class="num">${pts||"–"}</b><small>ĐIỂM GHI</small></div></div>
    <div class="hsplit">${mv?`<div class="mvp"><div class="t"><span class="k">NGƯỜI CHƠI CỦA BUỔI</span><span class="n">${esc(mv.name)}</span><span class="s num">${mv.w}–${mv.l} · HS ${mv.pf-mv.pa>0?"+":""}${mv.pf-mv.pa}${mv.d!=null?` · RATING ${dTxt(mv.d)}`:""}</span></div>${av(P(mv),"xl")}</div>`:""}
    ${big||close?`<div class="duo">${hl("Thắng đậm nhất",big)}${close&&close!==big?hl("Trận sát nhất",close):""}</div>`:""}</div></div>`;
  h+=`<div class="shd"><h2>Xếp hạng buổi</h2></div><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Tên</th><th>T–B</th><th>HS</th>${snap?"<th>Rating</th><th>Δ</th>":""}</tr></thead><tbody>${rows.map((r,i)=>{const df=r.pf-r.pa;return `<tr class="${i===0?"top1":""}"><td class="rank">${i+1}</td><td><span class="pn">${av(P(r),"sm")}<b>${esc(r.name)}</b></span></td><td>${r.w}–${r.l}</td><td class="${df>0?"up":df<0?"down":""}">${df>0?"+":""}${df}</td>${snap?`<td><b>${r2(r.rating)}</b></td><td class="${dCls(r.d)}">${dTxt(r.d)}</td>`:""}</tr>`}).join("")}</tbody></table></div>`;
  if(!ms.length&&!pmL&&snap?.matchCount)h+=`<div class="shd"><h2>Kết quả các trận</h2></div><p class="rule">Đang tải các trận…</p>`;
  if(ms.length)h+=`<div class="shd"><h2>Kết quả các trận</h2></div><div class="mgrid">${ms.map(m=>{const aw=m.sa>m.sb,t=(ids,sc,w)=>`<div class="tr${w?" w":""}"><span class="who"><span class="avs">${ids.map(id=>avId(D,id,"sm")).join("")}</span><span>${tn(ids)}</span></span><span class="sc num">${sc}</span></div>`;
    return `<article class="mcard"><div class="mh"><b>TRẬN #${m.seq}</b><span>SÂN ${m.court}${m.doneAt?` · ${new Date(m.doneAt).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"})}`:""}</span></div>${t(m.a,m.sa,aw)}${t(m.b,m.sb,!aw)}</article>`}).join("")}</div>`;
  h+=histEdit(D,x)+moneySec(D,sid,snap,rows,P);
  h+=`<div class="sharebox"><span class="lbl">Link riêng của buổi này</span><span class="url">${esc(shareUrl(sid).replace(/^https?:\/\//,""))}</span><div class="bt"><button class="primary" data-act="share" data-id="${sid}">Chia sẻ</button><button data-act="copylink" data-id="${sid}">Copy tin nhắn</button></div></div>${canWrite?`<div class="bar"><span class="grow"></span>${delBtn("sdel",sid,"Xóa buổi này")}</div>`:""}`;
  return h;
}
function vLs(D){
  const L=sessList(D);
  if(!L.length)return `<div class="empty"><strong>Chưa có buổi nào kết thúc</strong>Khi ban tổ chức chốt buổi ở tab Sân, buổi đó sẽ được lưu ở đây cùng bảng xếp hạng, các trận và bảng tiền.</div>`;
  return `<p class="rule">${L.length} buổi đã xong. Bấm vào một buổi để xem chi tiết.</p>`+L.map(x=>{
    const open=editing.has("s-"+x.sid),top=x.snap?.type==="giai"?(x.snap.giai?.table||[]).filter(t=>!t.out).slice(0,1).map(t=>esc(t.na+" & "+t.nb)+" vô địch").join(""):x.rows.slice(0,3).map(r=>esc(r.name)).join(", "),m=x.snap?.money;
    let h=`<div class="panel"><a class="sessh" href="${pathOf("buoi",{sid:x.sid})}" data-go="buoi" data-id="${x.sid}"><span class="code num">#${x.sid}</span><span class="mname"><b>${esc(x.snap?.sname||x.snap?.title||D.c.title)} · ${dmy(x.at)}</b><span class="meta num" style="display:block">${x.rows.length} người · ${x.ms.length||x.snap?.matchCount||0} trận${top?` · Top: ${top}`:""}</span></span>${x.snap?.type==="giai"?`<span class="pill keo">Giải cặp cố định</span>`:m&&m.on!==false?`<span class="pill ${hClub(x.snap)>=0?"win":"lose"} num">${hClub(x.snap)>=0?"Quỹ +":"Quỹ −"}${fmtK(Math.abs(hClub(x.snap)))}</span>`:m?"":`<span class="pill">Chưa có bảng tiền</span>`}<span class="chev" aria-hidden="true" style="color:var(--blue);font-size:22px;font-weight:700">›</span></a>`;
    if(open){
      h+=`<h3 class="subh">Xếp hạng</h3><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Tên</th><th>T–B</th><th>HS</th>${x.snap?"<th>Rating</th><th>Δ</th><th>Phải đóng</th>":""}</tr></thead><tbody>${x.rows.map((r,i)=>{const df=r.pf-r.pa;return `<tr class="${i===0?"top1":""}"><td class="rank">${i+1}</td><td><b>${esc(r.name)}</b></td><td>${r.w}–${r.l}</td><td class="${df>0?"up":df<0?"down":""}">${df>0?"+":""}${df}</td>${x.snap?`<td>${r2(r.rating)}</td><td class="${r.d>0.004?"up":r.d<-0.004?"down":""}">${sgn(r.d)}</td><td>${fmtK(r.pay)}</td>`:""}</tr>`}).join("")}</tbody></table></div>`;
      if(m&&m.on!==false)h+=`<div class="kpis" style="margin-top:12px"><div class="kpi"><div class="lbl">Quỹ thu</div><div class="v num">${fmtK(m.fund)}</div></div><div class="kpi"><div class="lbl">Chi phí</div><div class="v num">${fmtK(m.cost)}</div><div class="meta num">Sân ${fmtK(m.costs.court||0)} · Nước ${fmtK(m.costs.water||0)}${m.costs.ball?` · Bóng ${fmtK(m.costs.ball)}`:""}${m.costs.other?` · Khác ${fmtK(m.costs.other)}`:""}</div></div><div class="kpi hl"><div class="lbl">${m.gap>=0?"Dư":"Thiếu"}</div><div class="v num">${fmtK(Math.abs(m.gap))}</div></div></div>`;
      if(x.ms.length)h+=`<h3 class="subh">Các trận (${x.ms.length})</h3><div class="hist">${x.ms.map(mt=>{const aw=mt.sa>mt.sb,A=mt.a.map(id=>nm(D,id)).join(" &amp; "),B=mt.b.map(id=>nm(D,id)).join(" &amp; ");return `<div class="hrow"><span class="meta num">S${mt.court}<br>#${mt.seq}</span><div class="who">${aw?`<b>${A}</b>`:`<span class="l">${A}</span>`} <span class="l">vs</span> ${!aw?`<b>${B}</b>`:`<span class="l">${B}</span>`}<div class="meta">${KIND[kindOf(D,mt)]}</div></div><div class="sc num">${mt.sa}–${mt.sb}</div></div>`}).join("")}</div>`;
      h+=`<div class="bar" style="margin-top:10px"><a class="back" style="background:var(--blue);color:#fff;padding:0 16px;min-height:44px" href="${pathOf("buoi",{sid:x.sid})}" data-go="buoi" data-id="${x.sid}">Mở trang tổng kết</a><button data-act="copysess" data-id="${x.sid}">Copy tổng kết buổi #${x.sid}</button><span class="grow"></span>${canWrite?delBtn("sdel",x.sid,"Xóa buổi này"):""}</div>`;
    }
    return h+`</div>`;
  }).join("");
}
function summaryText(D){
  const c=D.c,M=money(D),d=new Date(),R=recv(D,M),st=standings(D).filter(r=>r.s.g);
  const L=[`TỔNG KẾT ${sessTitle(c,D.sid).toUpperCase()} · ${d.getDate()}/${d.getMonth()+1}`,`${clubNm(D)} · ${fmtTxt(c)} · ${ruleTxt(c)} · ${D.done.length} trận`];
  if(st.length)L.push("Top 3: "+st.slice(0,3).map((r,i)=>`${i+1}. ${r.p.name} ${r.s.w}–${r.s.l}`).join(" · "));
  if(R.tot){L.push(`Phải thu ${fmtK(R.tot)} · đã nhận ${R.np}/${R.n}`);if(BANK)L.push(`Chuyển khoản: ${BANK.name} ${BANK.acc} (${BANK.holder})`);L.push("Xem số tiền của bạn và mã QR:")}
  else L.push("Xem trực tiếp:");
  L.push(absUrl(pathOf("app",{tab:R.tot?"tien":"san"})));
  return L.join("\n");
}
