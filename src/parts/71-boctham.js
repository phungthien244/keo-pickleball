/* ---------- Bốc thăm cặp nhóm A/B (dùng cho giải cặp cố định) ----------
   Chia người có mặt thành nhóm A và B (theo trình, nam/nữ hoặc BTC tự xếp), mỗi cặp = 1 người A + 1 người B bốc ngẫu nhiên.
   Kết quả lưu vào giai.pairs (đánh dấu draw:1) và giai.draw = {at, by, n}: ai cũng xem được giờ bốc, người bấm, lần bốc. */
let gbOpen=false,gbMode="lv",gbFlip=new Set(),gbOut=new Set(),gbAvoid=true,gbLive=true,gbShow=null,gbSpin=false,gbTimer=null;
const GBM={lv:"Trình độ",mf:"Nam / Nữ",btc:"BTC chọn"};
function gbFree(D){const P=cfg().giai?.pairs||[],used=new Set(P.flatMap(p=>[p.a,p.b]));return D.players.filter(p=>p.active!==false&&!used.has(p.id))}
const gbRt=(D,id)=>D.st.get(id)?.rating??2.5;
// Chia nhóm mặc định rồi áp các lần BTC chuyển người (⇅)
function gbGroups(D){
  const F=gbFree(D).slice().sort((a,b)=>gbRt(D,b.id)-gbRt(D,a.id));let A=[],B=[];
  if(gbMode==="mf"){A=F.filter(p=>p.gender!=="F");B=F.filter(p=>p.gender==="F")}
  else if(gbMode==="btc"){A=F.slice()}
  else{const h=Math.floor(F.length/2);A=F.slice(0,h);B=F.slice(h)}
  const a=A.filter(p=>!gbFlip.has(p.id)).concat(B.filter(p=>gbFlip.has(p.id))),b=B.filter(p=>!gbFlip.has(p.id)).concat(A.filter(p=>gbFlip.has(p.id)));
  const srt=L=>L.sort((x,y)=>gbRt(D,y.id)-gbRt(D,x.id));
  return {A:srt(a),B:srt(b)};
}
// Cặp của giải cặp cố định gần nhất (để tránh bốc trùng)
function gbLastPairs(){const H=(S.hist||[]).filter(h=>h.type==="giai"&&h.giai&&h.giai.table).sort((a,b)=>(b.sid||0)-(a.sid||0))[0];
  return new Set(H?H.giai.table.map(t=>gk(t.a,t.b)):[])}
function gbShuffle(L){const a=L.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function gbDraw(A,B,avoid){
  let best=null,bad=Infinity;
  for(let t=0;t<(avoid.size?300:1);t++){const sb=gbShuffle(B),sa=gbShuffle(A),k=Math.min(sa.length,sb.length);
    const P=[];let n=0;for(let i=0;i<k;i++){P.push([sa[i],sb[i]]);if(avoid.has(gk(sa[i],sb[i])))n++}
    if(n<bad){bad=n;best=P}if(!n)break}
  return {pairs:best||[],dup:bad===Infinity?0:bad};
}
const gbSw=on=>`<span class="sw${on?" on":""}" aria-hidden="true"><i></i></span>`;
function gbSheet(D){
  const G=cfg().giai||{},n=(G.pairs||[]).length,room=gMax(cfg().giai)-n,{A,B}=gbGroups(D);
  const Ai=A.filter(p=>!gbOut.has(p.id)),Bi=B.filter(p=>!gbOut.has(p.id)),diff=Ai.length-Bi.length,big=diff>0?Ai:Bi,k=Math.min(Ai.length,Bi.length,room);
  const avg=L=>L.length?r2(L.reduce((s,p)=>s+gbRt(D,p.id),0)/L.length):"–";
  const col=(L,g)=>L.map(p=>`<button class="gbp${gbOut.has(p.id)?" out":""}" data-act="gbflip" data-id="${p.id}" aria-label="Chuyển ${esc(p.name)} sang nhóm ${g==="A"?"B":"A"}">${av(p,"sm",1)}<span class="t">${esc(p.name)}${gbOut.has(p.id)?"<small>ngồi ngoài</small>":""}</span><b class="num">${r2(gbRt(D,p.id))}</b><span class="mv">⇅</span></button>`).join("")||`<p class="rule" style="padding:8px 10px">Chưa có ai</p>`;
  let h=`<div class="gsdim" data-act="gbx"></div><div class="gsheet gbsheet" role="dialog" aria-label="Bốc thăm cặp"><span class="grab"></span>
    <div class="gsh"><b>🎲 Bốc thăm cặp · nhóm A/B</b><button class="lnk" data-act="gbx">Đóng</button></div>
    <small class="rule">Mỗi cặp = 1 người nhóm A + 1 người nhóm B, bốc ngẫu nhiên. Chạm một người để chuyển sang nhóm kia.</small>
    <div class="seg gbseg">${Object.entries(GBM).map(([v,l])=>`<button data-act="gbmode" data-v="${v}" aria-pressed="${gbMode===v}">${l}</button>`).join("")}</div>
    <div class="gbcols"><div class="gbcol"><div class="gbh a"><b>NHÓM A</b><small>${A.length} · TB ${avg(A)}</small></div>${col(A,"A")}</div>
      <div class="gbcol"><div class="gbh b"><b>NHÓM B</b><small>${B.length} · TB ${avg(B)}</small></div>${col(B,"B")}</div></div>`;
  if(diff!==0&&Ai.length&&Bi.length){const m=Math.abs(diff);
    h+=`<div class="gbwarn"><b>Lẻ ${m} người ở nhóm ${diff>0?"A":"B"}.</b> Chọn ${m>1?`${m} người`:"người"} ngồi ngoài, hoặc chuyển người sang nhóm kia. Muốn ghép với người của BTC: thêm người đó ở mục Điểm danh rồi xếp vào nhóm ${diff>0?"B":"A"}.
      <span class="gbouts">${big.concat(big===Ai?A.filter(p=>gbOut.has(p.id)):B.filter(p=>gbOut.has(p.id))).map(p=>`<button class="chip${gbOut.has(p.id)?" on":""}" data-act="gbout" data-id="${p.id}" aria-pressed="${gbOut.has(p.id)}">${esc(p.name)}</button>`).join("")}</span></div>`}
  else if(gbOut.size)h+=`<div class="gbwarn">Ngồi ngoài: ${[...gbOut].map(id=>esc(D.pmap.get(id)?.name||"")).join(", ")} <span class="gbouts">${[...gbOut].map(id=>`<button class="chip on" data-act="gbout" data-id="${id}">${esc(D.pmap.get(id)?.name||"")} ✕</button>`).join("")}</span></div>`;
  if(k<Math.min(Ai.length,Bi.length))h+=`<div class="gbwarn">Giải tối đa ${gMax(cfg().giai)} cặp: chỉ bốc ${k} cặp.</div>`;
  const last=gbLastPairs();
  h+=`<div class="gbopts">${last.size?`<button class="gbopt" data-act="gbavoid" aria-pressed="${gbAvoid}"><span>Tránh trùng cặp giải trước</span>${gbSw(gbAvoid)}</button>`:""}
    <button class="gbopt" data-act="gblive" aria-pressed="${gbLive}"><span>Bốc từng cặp (chiếu cho mọi người xem)</span>${gbSw(gbLive)}</button></div>
    <div class="gsf"><button class="primary gbgo" data-act="gbgo" ${k<1||diff!==0?"disabled":""}>🎲 BỐC THĂM ${k} CẶP</button></div>
    <small class="rule" style="text-align:center">Kết quả lưu kèm giờ bốc và người bấm, ai cũng xem được.</small></div>`;
  return h;
}
// Màn bốc thăm toàn màn hình: lật từng cặp, tên nhóm B quay rồi dừng
function gbScreen(D){
  const G=cfg().giai||{},P=(G.pairs||[]).filter(p=>p.draw),N=P.length;if(!gbShow||!N)return "";
  const k=Math.min(gbShow.k,N),cur=P[k],nm=id=>esc(D.pmap.get(id)?.name||"?");
  const card=(id,g,spin)=>{const p=D.pmap.get(id);
    if(spin){const pool=gbShuffle(P.map(x=>x.b)).filter(x=>x!==id).slice(0,7).concat([id]);
      return `<div class="gbc ${g}"><small>NHÓM ${g.toUpperCase()}</small><span class="gbreel"><span class="gbroll">${pool.map(x=>`<span>${av(D.pmap.get(x),"lg",1)}<b>${nm(x)}</b></span>`).join("")}</span></span><small class="gbsp">đang quay…</small></div>`}
    return `<div class="gbc ${g} in">${`<small>NHÓM ${g.toUpperCase()}</small>`}${av(p,"lg",1)}<b>${nm(id)}</b><small>${r2(gbRt(D,id))}</small></div>`};
  let h=`<div class="gbscr" role="dialog" aria-label="Bốc thăm cặp"><div class="gbhd"><button class="ckx" data-act="gbclose" aria-label="Đóng">✕</button><span class="t"><b>Bốc thăm cặp · ${esc(D.c.sname||D.c.title||"Giải cặp")}</b><small>${k<N?`Cặp ${k+1} / ${N}`:`Đã bốc xong ${N} cặp`}</small></span></div>`;
  const rev=!!gbShow.rev&&k<N;
  if(k<N)h+=`<b class="gbno">CẶP SỐ ${k+1}</b><div class="gbpair">${card(cur.a,"a",false)}<b class="plus">+</b>${rev?card(cur.b,"b",false):gbSpin?card(cur.b,"b",true):`<div class="gbc b q"><small>NHÓM B</small><span class="qm">?</span><small>bấm để bốc</small></div>`}</div>`;
  else h+=`<b class="gbno">XONG · ${N} CẶP</b>`;
  const done=P.slice(0,rev?k+1:k);
  if(done.length)h+=`<span class="gbsec">ĐÃ BỐC · ${done.length}</span><div class="gblist">${done.map((p,i)=>`<div class="gbli mfade"><b class="num">${i+1}</b>${av(D.pmap.get(p.a),"sm",1)}<span class="n">${nm(p.a)}</span><i>+</i>${av(D.pmap.get(p.b),"sm",1)}<span class="n">${nm(p.b)}</span></div>`).join("")}</div>`;
  const nx=rev?k+2:k+1,last=rev&&k+1>=N;
  h+=`<div class="gbft">${k<N&&!last?`<button class="line" data-act="gball" ${gbSpin?"disabled":""}>BỐC HẾT</button><button class="gbnext" data-act="gbnext" ${gbSpin?"disabled":""}>🎲 BỐC CẶP ${nx}</button>`:`<button class="gbnext" data-act="gbclose">XONG · VỀ DANH SÁCH CẶP</button>`}</div></div>`;
  return h;
}
// Dòng thông tin bốc thăm trong danh sách cặp
function gbInfo(D){const G=cfg().giai||{},d=G.draw;if(!d||!(G.pairs||[]).some(p=>p.draw))return "";
  return `<div class="gbinfo"><span>🎲 Bốc thăm lúc ${hm(d.at)}${d.at&&isoDay(d.at)!==isoDay(Date.now())?` ${dmy(d.at)}`:""} · ${esc(d.by||"BTC")}${d.n>1?` · bốc lại lần ${d.n}`:""}</span>${canWrite&&!G.locked?`<button class="lnk" data-act="gbredo">Bốc lại</button>`:""}<button class="lnk" data-act="gbreplay">Xem lại</button></div>`}
async function gbAct(act,b,id){
  if(!act||!act.startsWith("gb"))return false;
  if(act==="gbreplay"){gbShow={k:0};gbSpin=false;render();return true}
  if(act==="gbclose"){gbShow=null;gbSpin=false;if(gbTimer)clearTimeout(gbTimer);render();return true}
  if(act==="gbnext"){if(gbSpin||!gbShow)return true;if(gbShow.rev){gbShow.k++;gbShow.rev=false}gbSpin=true;render();
    gbTimer=setTimeout(()=>{gbSpin=false;if(gbShow)gbShow.rev=true;render()},1900);return true}
  if(act==="gball"){const N=(cfg().giai?.pairs||[]).filter(p=>p.draw).length;if(gbTimer)clearTimeout(gbTimer);if(gbShow){gbShow.k=N;gbShow.rev=false}gbSpin=false;render();return true}
  if(!canWrite)return true;
  if(act==="gbopen"){gbOpen=true;gbFlip=new Set();gbOut=new Set();render();return true}
  if(act==="gbx"){gbOpen=false;render();return true}
  if(act==="gbmode"){gbMode=GBM[b.dataset.v]?b.dataset.v:"lv";gbFlip=new Set();gbOut=new Set();render();return true}
  if(act==="gbflip"){if(gbFlip.has(id))gbFlip.delete(id);else gbFlip.add(id);gbOut.delete(id);render();return true}
  if(act==="gbout"){if(gbOut.has(id))gbOut.delete(id);else gbOut.add(id);render();return true}
  if(act==="gbavoid"){gbAvoid=!gbAvoid;render();return true}
  if(act==="gblive"){gbLive=!gbLive;render();return true}
  if(act==="gbredo"){const G=cfg().giai||{};if(G.locked)return true;if(!armOr("gbredo:x"))return true;
    await write(()=>saveG({pairs:(G.pairs||[]).filter(p=>!p.draw)}),"Đã bỏ kết quả cũ, bốc lại nhé");gbOpen=true;gbFlip=new Set();gbOut=new Set();render();return true}
  if(act==="gbgo"){const D=derive(),G=cfg().giai||{},P=G.pairs||[],{A,B}=gbGroups(D);
    const Ai=A.filter(p=>!gbOut.has(p.id)).map(p=>p.id),Bi=B.filter(p=>!gbOut.has(p.id)).map(p=>p.id);
    if(!Ai.length||Ai.length!==Bi.length){toast("Hai nhóm phải bằng số người.");return true}
    const r=gbDraw(Ai,Bi,gbAvoid?gbLastPairs():new Set()),room=gMax(cfg().giai)-P.length,t=Date.now().toString(36);
    const add=r.pairs.slice(0,room).map(([a,bb],i)=>({id:"c"+t+i,a,b:bb,draw:1}));
    if(!add.length){toast("Không còn chỗ cho cặp mới.");return true}
    const n=((G.draw&&G.draw.n)||0)+1;
    await write(()=>saveG({pairs:[...P,...add],draw:{at:Date.now(),by:who(),n}}),`Đã bốc ${add.length} cặp${r.dup?` · ${r.dup} cặp trùng giải trước (không tránh được)`:""}`);
    const old=P.filter(p=>p.draw).length;gbOpen=false;gbShow={k:gbLive?old:old+add.length};gbSpin=false;
    try{window.scrollTo(0,0)}catch(e){}render();return true}
  return false;
}
