/* ---------- giải cặp cố định ---------- */
const GMAX=10, GSLOT=11;
const gk=(x,y)=>x<y?x+"~"+y:y+"~"+x;
const isG=c=>c.fmt==="giai";
const dur=m=>m<60?`${m} phút`:`${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}`;
const pzTxt=k=>k?(Math.round(k*1000)).toLocaleString("vi-VN")+"đ":"";
function rrSchedule(ids){
  const a=ids.slice();if(a.length%2)a.push(null);
  const n=a.length,R=[];
  for(let r=0;r<n-1;r++){const g=[];for(let i=0;i<n/2;i++){const x=a[i],y=a[n-1-i];if(x&&y)g.push(r%2?[y,x]:[x,y])}R.push(g);a.splice(1,0,a.pop())}
  return R;
}
const pairOf=(D,p)=>p?[D.pmap.get(p.a),D.pmap.get(p.b)]:[];
const pairNm=(D,p)=>p?`${nm(D,p.a)} &amp; ${nm(D,p.b)}`:"?";
const pairTx=(D,p)=>p?`${D.pmap.get(p.a)?.name||"?"} & ${D.pmap.get(p.b)?.name||"?"}`:"?";
const pairAv=(D,p,cls)=>`<span class="avs">${avId(D,p.a,cls)}${avId(D,p.b,cls)}</span>`;
const pairR=(D,p)=>((D.st.get(p.a)?.rating??3)+(D.st.get(p.b)?.rating??3))/2;
function gDerive(D){
  const c=D.c,G=c.giai;if(!isG(c)||!G)return null;
  const pairs=G.pairs||[],pm=new Map(pairs.map(p=>[p.id,p])),out=G.out||{};
  const rounds=rrSchedule(pairs.map(p=>p.id));
  const byKey=new Map();for(const m of D.SM)if(m.giai)byKey.set(gk(m.pa,m.pb),m);
  const games=[];
  rounds.forEach((g,ri)=>g.forEach(([x,y],i)=>{const m=byKey.get(gk(x,y));let st="wait",wo=null,sx=null,sy=null;
    if(m&&m.status==="done"){st="done";sx=m.pa===x?m.sa:m.sb;sy=m.pa===x?m.sb:m.sa}
    else if(m)st="live";
    else if(out[x]||out[y]){st="wo";wo=out[x]&&out[y]?null:(out[x]?y:x)}
    games.push({r:ri+1,i,x,y,key:gk(x,y),m,st,wo,sx,sy})}));
  const T=new Map(pairs.map((p,i)=>[p.id,{p,no:i+1,gp:0,w:0,l:0,pf:0,pa:0,wo:0,out:!!out[p.id]}]));
  const win=g=>g.st==="wo"?g.wo:g.st==="done"?(g.sx>g.sy?g.x:g.y):null;
  for(const g of games){const X=T.get(g.x),Y=T.get(g.y);
    if(g.st==="done"){X.gp++;Y.gp++;X.pf+=g.sx;X.pa+=g.sy;Y.pf+=g.sy;Y.pa+=g.sx;if(g.sx>g.sy){X.w++;Y.l++}else{Y.w++;X.l++}}
    else if(g.st==="wo"&&g.wo){const W=g.wo===g.x?X:Y,L=g.wo===g.x?Y:X;W.w++;W.wo++;W.gp++;L.l++;L.gp++}}
  const list=[...T.values()].sort((a,b)=>(a.out-b.out)||(b.w-a.w));
  const table=[];
  for(let i=0;i<list.length;){let j=i;while(j<list.length&&list[j].out===list[i].out&&list[j].w===list[i].w)j++;
    const grp=list.slice(i,j),ids=new Set(grp.map(t=>t.p.id));
    for(const t of grp)t.h2h=games.filter(g=>ids.has(g.x)&&ids.has(g.y)&&win(g)===t.p.id).length;
    grp.sort((a,b)=>(b.h2h-a.h2h)||((b.pf-b.pa)-(a.pf-a.pa))||(b.pf-a.pf)||(pairR(D,b.p)-pairR(D,a.p)));
    table.push(...grp);i=j}
  const resolved=games.filter(g=>g.st==="done"||g.st==="wo").length;
  const curR=(games.find(g=>g.st==="wait"||g.st==="live")||{r:rounds.length}).r;
  return {G,pairs,pm,out,rounds:rounds.length,games,T,table,win,resolved,total:games.length,complete:games.length>0&&resolved===games.length,curR,locked:!!G.locked};
}
const lexLt=(a,b)=>{for(let k=0;k<a.length;k++)if(a[k]!==b[k])return a[k]<b[k];return false};
function gLast(D){const t=new Map();for(const m of D.done)if(m.giai)for(const p of [m.pa,m.pb])t.set(p,Math.max(t.get(p)||0,m.doneAt||0));return t}
function gPick(D,GD,busy,rest){
  const lastT=gLast(D),now=Date.now(),off=GD.G.rest||{},rem=new Map();
  for(const g of GD.games)if(g.st==="wait")for(const p of [g.x,g.y])rem.set(p,(rem.get(p)||0)+1);
  const tired=p=>rest.has(p)||(lastT.has(p)&&now-lastT.get(p)<180000)?1:0;
  let best=null,bs=null;
  GD.games.forEach((g,i)=>{if(g.st!=="wait"||busy.has(g.x)||busy.has(g.y)||off[g.x]||off[g.y])return;
    const s=[tired(g.x)+tired(g.y),-(rem.get(g.x)+rem.get(g.y)),i];
    if(!bs||lexLt(s,bs)){bs=s;best=g}});
  return best;
}
async function gFill(quiet){
  await new Promise(r=>setTimeout(r,30));
  const D=derive(),GD=gDerive(D);if(!GD||!GD.locked)return 0;
  const used=new Set(D.playing.map(m=>m.court)),free=[];for(let i=1;i<=D.c.courts;i++)if(!used.has(i))free.push(i);
  if(!free.length)return 0;
  const busy=new Set(D.playing.filter(m=>m.giai).flatMap(m=>[m.pa,m.pb]));
  const lastDone=D.done.filter(m=>m.giai).slice(-Math.max(1,D.c.courts-1));
  const rest=new Set(lastDone.flatMap(m=>[m.pa,m.pb]));
  // Theo đúng lịch dự kiến đang hiện cho từng sân; không có thì chọn như cũ
  const plan=gPlan(D,GD);
  const pick=[];for(const ct of free){let g=(plan.get(ct)||[])[0];if(!g||busy.has(g.x)||busy.has(g.y))g=gPick(D,GD,busy,rest);if(!g)continue;busy.add(g.x);busy.add(g.y);pick.push([ct,g])}
  if(!pick.length)return 0;
  const lock=await db.doc("app/lock").acquire({holder,ttlMs:5000});
  if(!lock.acquired){if(!quiet)toast("Có người khác đang xếp trận, thử lại sau vài giây.");return 0}
  let seq=D.SM.reduce((m,x)=>Math.max(m,x.seq||0),0);const now=Date.now();
  await write(async()=>{for(const [ct,g] of pick){const X=GD.pm.get(g.x),Y=GD.pm.get(g.y);seq++;
    await db.collection("matches").doc().set({session:D.sid,seq,court:ct,cn:cName(ct),giai:true,pa:g.x,pb:g.y,round:g.r,a:[X.a,X.b],b:[Y.a,Y.b],sa:null,sb:null,status:"playing",createdAt:now})}
    S.everWrote=true},null);
  return pick.length;
}
function validG(a,b){
  if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)return "Nhập điểm hai đội, không được hòa.";
  return Math.max(a,b)===11&&Math.min(a,b)<=10?null:"Đội thắng đúng 11 điểm, đội thua từ 0 đến 10.";
}
const saveG=patch=>saveCfg({giai:{...(cfg().giai||{}),...patch}});
const courtStep=c=>`<span class="lbl">Số sân</span><span class="stepper"><button data-act="courts" data-d="-1" aria-label="Bớt sân" ${canWrite?"":"disabled"}>−</button><span class="num">${c.courts}</span><button data-act="courts" data-d="1" aria-label="Thêm sân" ${canWrite?"":"disabled"}>+</button></span>`;
function vGiaiSan(D){
  const G=D.c.giai||{pairs:[]};
  if(canWrite&&(phaseOf(D)==="prep"||stepView==="prep"))return steps3(1,D)+vPrep(D);
  if(canWrite&&!G.locked)return steps3(2,D)+cfgChip(D)+gSetup(D,G)+undoBar();
  if(canWrite)return steps3(2,D)+cfgChip(D)+gRun(D,gDerive(D))+undoBar();
  return refNote()+(G.locked&&phaseOf(D)==="live"?`<div class="lsrow">${liveShareBtn()}</div>`:"")+(G.locked?gRun(D,gDerive(D)):gSetup(D,G));
}
function gSetup(D,G){
  const c=D.c,P=G.pairs||[],n=P.length,tot=n*(n-1)/2,mins=Math.ceil(tot/Math.max(1,c.courts))*GSLOT,pz=G.prizes||[0,0,0];
  const used=new Set(P.flatMap(p=>[p.a,p.b]));
  const free=D.players.filter(p=>p.active!==false&&!used.has(p.id)).sort((a,b)=>a.name.localeCompare(b.name,"vi"));
  let h=`<div class="gstrip"><div><b class="num">${n}/${GMAX}</b><small>Cặp</small></div><div><b class="num">${tot}</b><small>Trận</small></div><div><b class="num">${Math.max(0,n-1)}</b><small>Trận/cặp</small></div><div><b class="num">${n>1?dur(mins):"–"}</b><small>Với ${c.courts} sân</small></div></div>
  <div class="bar">${courtStep(c)}<span class="pill">${esc(ruleTxt(c))}</span><span class="pill">Vòng tròn · gặp nhau 1 lần</span></div>`;
  {const rec=Math.max(1,Math.floor(n/4));if(n>=3&&c.courts>rec)h+=`<div class="warnbox"><b>${n} cặp mà mở ${c.courts} sân thì nhiều cặp sẽ phải đánh liền, không kịp nghỉ.</b> Để cặp nào cũng có nghỉ giữa các trận, nên dùng ${rec} sân (khoảng 4 cặp cho mỗi sân).</div>`}
  h+=`<div class="panel"><div class="bar" style="margin-bottom:4px"><h2 class="grow">Các cặp</h2><span class="meta num">${n} cặp</span></div>`;
  h+=n?P.map((p,i)=>`<div class="prow2"><span class="no num">${i+1}</span>${pairAv(D,p,"md")}<span class="nm">${pairNm(D,p)}<small class="num">Rating TB ${r2(pairR(D,p))}</small></span>${canWrite?`<button class="ghost danger" data-act="gdel" data-id="${p.id}" aria-label="Bỏ cặp ${esc(pairTx(D,p))}">✕</button>`:""}</div>`).join(""):`<p class="rule">Chưa có cặp nào. Mỗi cặp là 2 người tự chọn nhau, đánh chung từ đầu đến cuối giải.</p>`;
  if(canWrite&&n<GMAX){
    if(free.length<2)h+=`<p class="rule" style="margin-top:10px">Cần thêm người có mặt hôm nay ở tab Người chơi để ghép cặp mới.</p>`;
    else{const S2=[drafts.gp1,drafts.gp2].filter(Boolean),nmOf=id=>esc(D.pmap.get(id)?.name||"?");
      h+=`<div class="gadd"><span class="lbl">Thêm cặp mới · còn ${GMAX-n} chỗ · chạm chọn 2 người</span>
        <div class="gsel">${[0,1].map(i=>S2[i]?`<span class="gs on">${av(D.pmap.get(S2[i]),"sm")}${nmOf(S2[i])}</span>`:`<span class="gs">Người ${i+1}</span>`).join(`<b>&amp;</b>`)}<button class="primary" data-act="gadd" ${S2.length<2?"disabled":""}>Thêm cặp</button></div>
        ${pplPick(D,free,{act:"gpick",key:"gp",sel:S2,meta:x=>r2(D.st.get(x.id).rating)})}</div>`}}
  if(errs.gadd)h+=`<p class="err">${esc(errs.gadd)}</p>`;
  h+=`</div><p class="rule">Hạng 1, 2, 3 lấy từ bảng xếp hạng cuối cùng sau khi đánh hết vòng tròn. Bằng số trận thắng thì xét đối đầu trực tiếp, rồi hiệu số, rồi tổng điểm ghi. Tiền thưởng chỉnh ở khung Giải thưởng phía trên.</p>`;
  if(canWrite)h+=`<div class="bar"><button class="ball" data-act="gstart" ${n<3?"disabled":""}>Tạo lịch thi đấu · ${tot} trận</button></div>${errs.giai?`<p class="err">${esc(errs.giai)}</p>`:""}<p class="rule">Tiền buổi và giải thưởng tính theo khung Thiết lập buổi. Rating cá nhân vẫn cập nhật theo từng trận như khi đánh xoay cặp. Sau khi tạo lịch, danh sách cặp được khoá.</p>`;
  else h+=`<div class="empty"><strong>Đang ghép cặp</strong>Người tổ chức đang ghép cặp cho giải. Lịch thi đấu sẽ hiện ở đây.</div>`;
  return h;
}
function gRun(D,GD){
  const c=D.c,left=GD.total-GD.resolved,est=Math.ceil(left/Math.max(1,c.courts))*GSLOT,pc=GD.total?Math.round(GD.resolved/GD.total*100):0;
  const live=D.playing.filter(m=>m.giai),liveV=live.filter(myCourt);
  let h=`<div class="gprog"><div class="t"><span class="num">Lượt ${GD.curR}/${GD.rounds} · xong ${GD.resolved}/${GD.total} trận</span><span class="num">${left?`Còn ~${dur(est)}`:"Đã xong"}</span></div><div class="b"><i style="width:${pc}%"></i></div></div>`;
  if(GD.complete){const t=GD.table[0];h+=`<div class="champ"><div class="k"><span>ĐÃ ĐÁNH XONG VÒNG TRÒN · DẪN ĐẦU</span><span>${(()=>{const p=prizes(D,money(D))[0];return p?fmtK(p.k):""})()}</span></div><div class="p">${pairAv(D,t.p,"lg")}<span><span class="n">${pairNm(D,t.p)}</span><span class="s num" style="display:block">${t.w} thắng · ${t.l} thua · HS ${t.pf-t.pa>0?"+":""}${t.pf-t.pa}</span></span></div>${canWrite?`<button class="endbtn" data-act="gend">${armed("gend:x")?"Bấm lần nữa để lưu giải":"Kết thúc giải và lưu"}</button>`:""}</div>`}
  h+=`<div class="bar">${courtStep(c)}<span class="grow"></span>${canWrite&&!GD.complete&&live.length<c.courts&&gPick(D,GD,new Set(live.flatMap(m=>[m.pa,m.pb])),new Set())?`<button class="ball" data-act="gfill">Đưa trận kế vào sân trống</button>`:""}</div>`;
  if(liveV.length)h+=`<div class="courts">${liveV.map(m=>gCourt(D,GD,m)).join("")}</div>`;
  else if(REF&&!GD.complete)h+=`<div class="empty"><strong>Sân của bạn đang trống</strong>Trận kế tiếp của sân ${MYCT.join(", ")||"được giao"} sẽ hiện ở đây.</div>`;
  else if(!GD.complete&&!REF)h+=`<div class="empty"><strong>Sân đang trống</strong>${canWrite?"Bấm “Đưa trận kế vào sân trống” để gọi trận tiếp theo theo lịch.":"Chờ người tổ chức gọi trận tiếp theo."}</div>`;
  h+=`<div class="shd"><h2>Lịch thi đấu</h2>${REF?"":`<span class="seg segs"><button data-act="gview" data-v="san" aria-pressed="${gView!=="luot"}">Theo sân</button><button data-act="gview" data-v="luot" aria-pressed="${gView==="luot"}">Theo lượt</button></span>`}</div>${REF||gView!=="luot"?gCourts(D,GD):gRounds(D,GD)}`;
  if(canWrite){
    h+=`<div class="panel"><h2>Quản lý giải</h2><p class="rule" style="margin-bottom:6px">Cặp bỏ về: các trận chưa đánh của họ tính thắng cho đối thủ nhưng không cộng điểm vào hiệu số, rating không đổi. Trận đã đánh giữ nguyên. Cặp mệt cần nghỉ thì bấm “Cho nghỉ”: app tạm không xếp trận cho cặp đó đến khi bấm “Cho vào lại”.</p>${(()=>{const lt=gLast(D),onC=new Set(live.flatMap(m=>[m.pa,m.pb])),rs=GD.G.rest||{};return GD.pairs.map(p=>{const o=!!GD.out[p.id],st=o?"Đã bỏ giải":onC.has(p.id)?"Đang trên sân":rs[p.id]?"BTC cho nghỉ, chưa xếp trận":lt.has(p.id)?`Đã nghỉ ${Math.max(0,Math.floor((Date.now()-lt.get(p.id))/60000))} phút`:"Chưa đánh trận nào";
    return `<div class="prow2 m"><span class="no num">${GD.T.get(p.id).no}</span>${pairAv(D,p,"sm")}<span class="nm">${pairNm(D,p)}<small>${st}</small></span><span class="bt">${!o&&!onC.has(p.id)?`<button class="ghost" data-act="grest" data-id="${p.id}">${rs[p.id]?"Cho vào lại":"Cho nghỉ"}</button>`:""}${o?`<button class="ghost" data-act="gin" data-id="${p.id}">Cho quay lại</button>`:armed("gout:"+p.id)?`<button class="danger" data-act="gout" data-id="${p.id}">Bấm lần nữa</button>`:`<button class="ghost danger" data-act="gout" data-id="${p.id}">Bỏ giải</button>`}</span></div>`}).join("")})()}
    <div class="bar" style="margin-top:12px">${!GD.complete?`<button class="endbtn" data-act="gend">${armed("gend:x")?"Bấm lần nữa để kết thúc sớm":"Kết thúc giải sớm"}</button>`:""}${!D.done.some(m=>m.giai)?`<button class="ghost danger" data-act="gcancel">${armed("gcancel:x")?"Bấm lần nữa để hủy":"Hủy lịch, ghép lại cặp"}</button>`:""}</div>
    ${!GD.complete?`<p class="rule" style="margin-top:8px">Kết thúc sớm: các trận chưa đánh không tính, xếp hạng theo kết quả hiện có.</p>`:""}</div>`}
  return h;
}
function gCourt(D,GD,m){
  const X=GD.T.get(m.pa),Y=GD.T.get(m.pb),ka=`sa-${m.id}`,kb=`sb-${m.id}`;
  const side=(t,k,lab)=>`<div class="team"><div class="names"><div class="tl">${pairAv(D,t.p,"md")}<div>${pairNm(D,t.p)}<small class="num">${t.w} thắng · ${t.l} thua · Rating TB ${r2(pairR(D,t.p))}</small></div></div></div><input class="score num" id="${k}" data-draft="${k}" type="number" inputmode="numeric" min="0" max="11" aria-label="${lab}" value="${esc(val(k,""))}" ${canScore(m)?"":"disabled"}></div>`;
  return `<article class="court${isNew(m.id+"p")?" new":""}" style="--cc:${cColor(m.court)}"><div class="court-h"><h3>Sân ${esc(cName(m.court))}</h3><span class="num">Lượt ${m.round} · Trận #${m.seq}</span>${canScore(m)?spkBtn("c:"+m.id,`<button class="spk" data-act="speak" data-id="${m.id}" aria-label="Đọc loa mời vào sân ${esc(cName(m.court))}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>Mời</button>`):""}</div>${refTag(m.court)}
    ${side(X,ka,"Điểm đội 1")}${side(Y,kb,"Điểm đội 2")}
    <div class="court-f"><span class="meta" style="flex:1">${esc(ruleTxt(D.c))}</span>${canWrite?`<button class="ghost danger" data-act="cancel" data-id="${m.id}">Hủy</button>`:""}${canScore(m)?`<button class="primary" data-act="savechk" data-id="${m.id}">Lưu tỉ số</button>`:""}</div>${saveConfirm(D,m)}${cancelConfirm(D,m)}
    ${errs[m.id]?`<p class="err" style="padding:0 14px 12px">${esc(errs[m.id])}</p>`:""}</article>`;
}
function gRounds(D,GD){
  const by=[];for(const g of GD.games)(by[g.r-1]=by[g.r-1]||[]).push(g);
  return `<div class="rnds">`+by.map((gs,ri)=>{
    const allR=gs.every(g=>g.st==="done"||g.st==="wo"),any=gs.some(g=>g.st!=="wait");
    const cls=allR?"":any?"live":"next",lab=allR?"Xong":any?"Đang đánh":"Sắp tới";
    return `<div class="rnd ${cls}"><div class="rh"><span>LƯỢT ${ri+1}</span><span>${lab.toUpperCase()}</span></div>${gs.map(g=>gRow(D,GD,g)).join("")}${GD.pairs.length%2===0?"":(()=>{const inR=new Set(gs.flatMap(g=>[g.x,g.y])),bye=GD.pairs.find(p=>!inR.has(p.id));return bye?`<div class="gr bye"><span class="meta">Nghỉ lượt này: ${pairNm(D,bye)}</span></div>`:""})()}</div>`}).join("")+`</div>`;
}
function gRow(D,GD,g){
  const X=GD.pm.get(g.x),Y=GD.pm.get(g.y),w=GD.win(g);
  const nmX=`<span class="${w?w===g.x?"w":"l":""}">${pairNm(D,X)}</span>`,nmY=`<span class="r ${w?w===g.y?"w":"l":""}">${pairNm(D,Y)}</span>`;
  let mid;
  if(g.st==="done")mid=`<span class="m num">${g.sx}–${g.sy}</span>`;
  else if(g.st==="live")mid=`<span class="m live">SÂN ${esc(cName(g.m.court))}</span>`;
  else if(g.st==="wo")mid=`<span class="m wo">BỎ</span>`;
  else mid=`<span class="m vs">VS</span>`;
  const ed=canWrite&&g.st==="done";
  let h=`<div class="gr${ed?" e":""}">${nmX}${mid}${nmY}${ed?`<button class="ghost" data-act="edit" data-id="${g.m.id}" aria-label="Sửa tỉ số">Sửa</button>`:""}`;
  if(ed&&editing.has(g.m.id)){const m=g.m,flip=m.pa!==g.x,k1=flip?`eb-${m.id}`:`ea-${m.id}`,k2=flip?`ea-${m.id}`:`eb-${m.id}`;
    const inp=(k,v,l)=>`<input class="score num" style="width:60px;height:46px;font-size:20px" id="${k}" data-draft="${k}" type="number" inputmode="numeric" value="${esc(val(k,v))}" aria-label="${l}">`;
    h+=`<div class="ed">${inp(k1,g.sx,"Điểm "+pairTx(D,X))}<span>–</span>${inp(k2,g.sy,"Điểm "+pairTx(D,Y))}<span class="grow"></span><button class="ghost" data-act="edit-x" data-id="${m.id}">Thôi</button>${delBtn("mdel",m.id,"Xóa")}<button class="primary" data-act="edit-save" data-id="${m.id}">Lưu</button>${errs[m.id]?`<p class="err" style="width:100%">${esc(errs[m.id])}</p>`:""}</div>`}
  return h+`</div>`;
}
function gCodes(D,GD){
  const seen=new Map();return new Map(GD.table.map(t=>{const ini=id=>{const w=String(D.pmap.get(id)?.name||"?").trim().split(/\s+/);return (w[w.length-1]||"?").charAt(0).toUpperCase()};
    let k=ini(t.p.a)+ini(t.p.b);const n=(seen.get(k)||0)+1;seen.set(k,n);if(n>1)k+=n;return [t.p.id,k]}));
}
function vGiaiBxh(D,GD){
  if(!GD||!GD.pairs.length)return `<div class="empty"><strong>Chưa có cặp nào</strong>Vào tab Sân để ghép cặp và tạo lịch thi đấu.</div>`;
  const codes=gCodes(D,GD),res=new Map(GD.games.map(g=>[g.key,g]));
  let h=`<p class="rule">Xếp theo số trận thắng → đối đầu trực tiếp → hiệu số điểm → tổng điểm ghi. Hết vòng tròn, 3 cặp đứng đầu nhận giải.</p>
`;
  {const nmOf=id=>D.pmap.get(id)?.name||"?",L=GD.table.map(t=>({id:t.p.id,a:t.p.a,b:t.p.b,na:nmOf(t.p.a),nb:nmOf(t.p.b),w:t.w,l:t.l,pf:t.pf,pa:t.pa,out:t.out})),
    gm=GD.games.filter(g=>g.st==="done"||(g.st==="wo"&&g.wo)).map(g=>({x:g.x,y:g.y,sx:g.sx,sy:g.sy,wo:g.wo||null,r:g.r})),pz=prizes(D,money(D));
    h+=`<div class="shd"><h2>Sau ${GD.resolved}/${GD.total} trận</h2><span class="meta">Ô xanh thắng · đỏ thua</span></div>`+gRank(L,gm,[0,1,2].map(i=>pz[i]?pz[i].k:0),(id,n)=>D.pmap.get(id)||{name:n});}
  h+=`<div class="shd"><h2>Bảng đối đầu</h2></div><p class="rule">Đọc theo hàng: điểm của cặp ở hàng đó đứng trước. Xanh là thắng, đỏ là thua, chấm là chưa đánh.</p>
  <div class="h2h"><table><thead><tr><th></th>${GD.table.map(t=>`<th>${esc(codes.get(t.p.id))}</th>`).join("")}</tr></thead><tbody>${GD.table.map(r=>`<tr><td>${esc(codes.get(r.p.id))}</td>${GD.table.map(cc=>{if(r===cc)return `<td class="x"></td>`;const g=res.get(gk(r.p.id,cc.p.id));
    if(!g||g.st==="wait"||g.st==="live")return `<td class="n">·</td>`;
    if(g.st==="wo")return `<td class="wo">${g.wo===r.p.id?"T":g.wo?"B":"–"}</td>`;
    const me=g.x===r.p.id?g.sx:g.sy,op=g.x===r.p.id?g.sy:g.sx;return `<td class="${me>op?"w":"l"}">${me}-${op}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>
  <p class="rule">${GD.table.map(t=>`<b>${esc(codes.get(t.p.id))}</b>: ${pairNm(D,t.p)}`).join(" · ")}</p>`;
  return h;
}
/* Bảng xếp hạng vòng tròn: hạng, cặp, thành tích, chuỗi kết quả từng lượt, tiền thưởng */
function gRank(L,games,pz,P){
  const md=["Nhất","Nhì","Ba"];
  return `<div class="grl">${L.map((t,i)=>{const rk=t.out?0:i+1,d=t.pf-t.pa,gp=t.w+t.l,pc=gp?Math.round(t.w/gp*100):0;
    const form=games.filter(g=>g.x===t.id||g.y===t.id).sort((a,b)=>(a.r||0)-(b.r||0)).map(g=>{const me=g.x===t.id,op=me?g.y:g.x,o=L.find(z=>z.id===op);
      if(g.wo){const w=g.wo===t.id;return `<i class="${w?"w":"l"} wo" title="${w?"Thắng":"Thua"} vì bỏ giải · ${esc(o?o.na+" & "+o.nb:"")}">${w?"T":"B"}</i>`}
      const a=me?g.sx:g.sy,b=me?g.sy:g.sx;return `<i class="${a>b?"w":"l"}" title="${a}–${b} · ${esc(o?o.na+" & "+o.nb:"")}">${a}</i>`}).join("");
    return `<div class="grk${rk&&rk<4?" m"+rk:""}${t.out?" out":""}"><span class="rk num">${rk||"–"}</span>
      <span class="t"><span class="nm"><span class="avs">${av(P(t.a,t.na),"sm")}${av(P(t.b,t.nb),"sm")}</span><b>${esc(t.na)} &amp; ${esc(t.nb)}</b></span>
      <span class="st num"><b>${t.w}–${t.l}</b> · HS ${d>0?"+":""}${d} · ghi ${t.pf}${t.out?" · <em>bỏ giải</em>":""}</span>
      <span class="bar2"><i style="width:${pc}%"></i></span>${form?`<span class="form">${form}</span>`:""}</span>
      ${rk&&rk<4?`<span class="pz"><small>${md[rk-1]}</small>${pz[rk-1]?`<b class="num">${pzTxt(pz[rk-1])}</b>`:""}</span>`:"<span></span>"}</div>`}).join("")}</div>`;
}
async function endGiai(){
  const D=derive(),GD=gDerive(D);if(!GD)return;
  if(D.playing.length){toast("Còn trận đang đánh. Lưu tỉ số hoặc hủy trận trước.");return}
  await write(async()=>{
    const ms=D.done.filter(m=>m.giai),firstAt=ms.reduce((m,x)=>Math.min(m,x.doneAt||x.createdAt||Infinity),Infinity);
    const nmOf=id=>D.pmap.get(id)?.name||"(đã xóa)",M=money(D);
    await db.doc("app/hist-"+D.sid).set({sid:D.sid,type:"giai",title:D.c.title,startedAt:isFinite(firstAt)?firstAt:(GD.G.startedAt||Date.now()),endedAt:Date.now(),matchCount:ms.length,
      rows:standings(D).filter(r=>r.s.g).map(r=>({id:r.p.id,name:r.p.name,gender:r.p.gender||"M",w:r.s.w,l:r.s.l,pf:r.s.pf,pa:r.s.pa,rating:Math.round(r.s.rating*100)/100,d:Math.round(r.s.d*1000)/1000,...payRow(D,M,r.p.id)})),
      money:moneySnap(D,M),paid:{...(payDoc(D.sid).paid||{})},track:true,closedAt:Date.now(),closedBy:who(),sname:D.c.sname||"",rule:ruleTxt(D.c),
      giai:{prizes:prizes(D,M).map(x=>x.k),complete:GD.complete,
        table:GD.table.map(t=>({id:t.p.id,a:t.p.a,b:t.p.b,na:nmOf(t.p.a),nb:nmOf(t.p.b),gp:t.gp,w:t.w,l:t.l,pf:t.pf,pa:t.pa,wo:t.wo,out:t.out})),
        games:GD.games.filter(g=>g.st==="done"||(g.st==="wo"&&g.wo)).map(g=>({r:g.r,x:g.x,y:g.y,sx:g.sx,sy:g.sy,wo:g.wo||null,court:g.m?.court||null,seq:g.m?.seq||null,at:g.m?.doneAt||null}))}});
    for(const p of D.players){const s=D.st.get(p.id);if(s.g)await db.collection("players").doc(p.id).update({rating0:Math.round(s.rating*100)/100})}
    await saveCfg({session:D.sid+1,costs:{court:0,water:0,ball:0,other:0},fmt:"xoay",giai:null,phase:"prep",sname:""});
  },"Đã lưu giải, đây là trang tổng kết để chia sẻ");go("buoi",{sid:D.sid});
}
function vGiaiSum(D,x,back){
  const s=x.snap,G=s.giai||{},T=G.table||[],pz=G.prizes||[],tb=new Map(T.map(t=>[t.id,t]));
  const PP=(id,n)=>D.pmap.get(id)||{name:n};
  const tAv=(t,cls)=>`<span class="avs">${av(PP(t.a,t.na),cls)}${av(PP(t.b,t.nb),cls)}</span>`;
  const tNm=t=>`${esc(t.na)} &amp; ${esc(t.nb)}`;
  const hs=t=>{const d=t.pf-t.pa;return (d>0?"+":"")+d};
  const games=G.games||[],pts=games.reduce((a,g)=>a+(+g.sx||0)+(+g.sy||0),0),ranked=T.filter(t=>!t.out);
  const c1=ranked[0],c2=ranked[1],c3=ranked[2];
  let h=back+`<div class="hero"><div class="phead"><span class="eyebrow">${s.sname?esc(s.sname):"Cặp cố định xoay vòng"} · ${dmy(x.at)}</span><h1>Tổng kết</h1><p class="hmeta">${T.length} cặp đánh vòng tròn, mỗi cặp gặp tất cả các cặp còn lại một lần. ${esc(s.rule||"Chạm 11, không cần cách 2")}.${G.complete===false?" Giải kết thúc sớm.":""}</p></div>
    <div class="stats"><div><b class="num">${T.length}</b><small>CẶP</small></div><div><b class="num">${games.filter(g=>!g.wo).length}</b><small>TRẬN</small></div><div><b class="num">${pts||"–"}</b><small>ĐIỂM GHI</small></div></div>
    ${c1?`<div class="gpod">${[c1,c2,c3].map((t,i)=>t?`<div class="pc p${i+1}"><span class="md">${["Nhất","Nhì","Ba"][i]}</span>${tAv(t,i?"md":"lg")}<span class="tx"><span class="n">${tNm(t)}</span><span class="s num">${t.w} thắng · ${t.l} thua · HS ${hs(t)}</span></span>${pz[i]?`<span class="pz num">${pzTxt(pz[i])}</span>`:""}</div>`:"").join("")}</div>`:""}</div>`;
  h+=`<div class="shd"><h2>Bảng xếp hạng</h2><span class="meta">Ô xanh thắng · đỏ thua · số là điểm ghi</span></div>`+gRank(T.map(t=>({...t})),games.map(g=>({...g})),pz,PP);
  h+=`<p class="rule">Bằng số trận thắng thì xét đối đầu trực tiếp, rồi hiệu số, rồi tổng điểm ghi. Trận cặp bỏ giải chưa đánh tính thắng cho đối thủ, không cộng điểm.</p>`;
  if(games.length&&T.length>2){const gm=new Map();for(const g of games){gm.set(g.x+"|"+g.y,g);gm.set(g.y+"|"+g.x,g)}
    const hdr=t=>`<span class="avs" title="${tNm(t)}">${av(PP(t.a,t.na),"xs")}${av(PP(t.b,t.nb),"xs")}</span>`;
    h+=`<div class="shd"><h2>Bảng đối đầu</h2></div><p class="rule">Đọc theo hàng: điểm của cặp ở hàng đó đứng trước. Xanh là thắng, đỏ là thua.</p>
    <div class="h2h h2a"><table><thead><tr><th></th>${T.map((t,i)=>`<th><span class="hc">${hdr(t)}<small>${i+1}</small></span></th>`).join("")}</tr></thead><tbody>${T.map((r,i)=>`<tr><td><span class="hr">${hdr(r)}<small>${i+1}</small></span></td>${T.map(c=>{if(r===c)return `<td class="x"></td>`;const g=gm.get(r.id+"|"+c.id);
      if(!g)return `<td class="n">·</td>`;if(g.wo)return `<td class="wo">${g.wo===r.id?"T":"B"}</td>`;const me=g.x===r.id?g.sx:g.sy,op=g.x===r.id?g.sy:g.sx;return `<td class="${me>op?"w":"l"}">${me}-${op}</td>`}).join("")}</tr>`).join("")}</tbody></table></div>
    <div class="h2l">${T.map((t,i)=>`<span><b class="num">${i+1}</b>${hdr(t)}${tNm(t)}</span>`).join("")}</div>`}
  if(games.length){const by=new Map();for(const g of games){const k=g.wo?"wo":String(g.court||"?");if(!by.has(k))by.set(k,[]);by.get(k).push(g)}
    const keys=[...by.keys()].sort((a,b)=>a==="wo"?1:b==="wo"?-1:Number(a)-Number(b));
    const row=g=>{const X=tb.get(g.x),Y=tb.get(g.y);if(!X||!Y)return "";const wx=g.wo?g.wo===g.x:g.sx>g.sy;
      const side=(t,sc,w)=>`<span class="sd${w?" w":""}"><span class="avs">${av(PP(t.a,t.na),"xs")}${av(PP(t.b,t.nb),"xs")}</span><span class="nm">${tNm(t)}</span><b class="num">${sc}</b></span>`;
      return `<div class="mr"><span class="mt num">${g.seq?`#${g.seq}`:"–"}<small>${g.at?new Date(g.at).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}):`Lượt ${g.r}`}</small></span><span class="ms">${side(X,g.wo?(wx?"T":"B"):g.sx,wx)}${side(Y,g.wo?(wx?"B":"T"):g.sy,!wx)}</span></div>`};
    h+=`<div class="shd"><h2>Kết quả các trận</h2></div><div class="cgl">${keys.map(k=>{const L=by.get(k).sort((a,b)=>(a.at||0)-(b.at||0)||(a.seq||0)-(b.seq||0)||a.r-b.r);
      return `<details class="cgrp"><summary><b>${k==="wo"?"Bỏ giải":"Sân "+k}</b><span class="num">${L.length} trận</span></summary><div class="ml">${L.map(row).join("")}</div></details>`}).join("")}</div>`}
  const R=[...(s.rows||[])].sort((a,b)=>(b.d||0)-(a.d||0));
  if(R.length)h+=`<div class="shd"><h2>Rating sau giải</h2></div><div class="tbl-wrap"><table><thead><tr><th>#</th><th>Tên</th><th>T–B</th><th>Rating</th><th>Δ</th></tr></thead><tbody>${R.map((r,i)=>`<tr><td class="rank">${i+1}</td><td><span class="pn">${av(PP(r.id,r.name),"sm")}<b>${esc(r.name)}</b></span></td><td>${r.w}–${r.l}</td><td><b>${r2(r.rating)}</b></td><td class="${dCls(r.d)}">${dTxt(r.d)}</td></tr>`).join("")}</tbody></table></div>`;
  h+=moneySec(D,x.sid,s,s.rows||[],r=>PP(r.id,r.name),true);
  h+=`<div class="sharebox"><span class="lbl">Link riêng của giải này</span><span class="url">${esc(shareUrl(x.sid).replace(/^https?:\/\//,""))}</span><div class="bt"><button class="primary" data-act="share" data-id="${x.sid}">Chia sẻ</button><button data-act="copylink" data-id="${x.sid}">Copy tin nhắn</button></div></div>${canWrite?`<div class="bar"><span class="grow"></span>${delBtn("sdel",x.sid,"Xóa buổi này")}</div>`:""}`;
  return h;
}
function giaiShare(D,x){
  const s=x.snap,G=s.giai||{},T=(G.table||[]).filter(t=>!t.out),pz=G.prizes||[];
  const L=[`TỔNG KẾT ${s.sname?s.sname.toUpperCase():"CẶP CỐ ĐỊNH XOAY VÒNG"} · ${dmy(x.at)}`,`${clubNm(D)} · vòng tròn ${(G.table||[]).length} cặp · ${s.rule||"chạm 11"}`];
  T.slice(0,3).forEach((t,i)=>L.push(`${["Nhất","Nhì","Ba"][i]}: ${t.na} & ${t.nb} (${t.w}–${t.l})${pz[i]?` · ${pzTxt(pz[i])}`:""}`));
  L.push("Xem bảng xếp hạng, kết quả từng trận và rating sau giải:");
  return L.join("\n");
}

// Trọng tài lưu xong trận giải: máy ban tổ chức tự đưa trận kế vào sân trống
let gDoneSeen=null,gAutoT=null;
function autoGFill(){
  try{const D=derive();if(!isG(D.c)){gDoneSeen=null;return}
    const n=D.done.filter(m=>m.giai).length;
    if(canWrite&&gDoneSeen!=null&&n>gDoneSeen){clearTimeout(gAutoT);gAutoT=setTimeout(()=>gFill(true).catch(()=>{}),1500)}
    gDoneSeen=n}catch(e){}
}

/* ----- Lịch theo sân: trận đã đánh, đang đánh và dự kiến kế tiếp của từng sân ----- */
let gView="san";
// Mô phỏng thứ tự gọi trận: sân nào xong trước nhận trận kế (cùng cách chọn với "Đưa trận kế vào sân")
function gPlan(D,GD){
  const n=Math.max(1,+D.c.courts||1),off=GD.G.rest||{},plan=new Map();
  const wait=GD.games.filter(g=>g.st==="wait"&&!off[g.x]&&!off[g.y]);
  const rem=new Map();for(const g of wait)for(const p of [g.x,g.y])rem.set(p,(rem.get(p)||0)+1);
  const C=[];for(let i=1;i<=n;i++){const m=D.playing.find(x=>x.giai&&Number(x.court)===i);C.push({c:i,t:m?1:0,on:m?[m.pa,m.pb]:[]})}
  const busy=new Set(C.flatMap(c=>c.on)),used=new Set();let last=new Set(D.done.filter(m=>m.giai).slice(-Math.max(1,n-1)).flatMap(m=>[m.pa,m.pb]));
  for(let k=0;k<wait.length*(n+1)+n&&used.size<wait.length;k++){
    C.sort((a,b)=>a.t-b.t||a.c-b.c);const ct=C[0];
    for(const p of ct.on)busy.delete(p);const fin=new Set(ct.on);ct.on=[];
    let best=null,bs=null;
    wait.forEach((g,i)=>{if(used.has(g.key)||busy.has(g.x)||busy.has(g.y))return;
      const s=[(last.has(g.x)||fin.has(g.x)?1:0)+(last.has(g.y)||fin.has(g.y)?1:0),-(rem.get(g.x)+rem.get(g.y)),i];
      if(!bs||lexLt(s,bs)){bs=s;best=g}});
    if(!best){ct.t+=1;if(C.every(c=>!c.on.length)&&!wait.some(g=>!used.has(g.key)&&!busy.has(g.x)&&!busy.has(g.y)))break;continue}
    used.add(best.key);ct.on=[best.x,best.y];busy.add(best.x);busy.add(best.y);ct.t+=1;last=fin;
    for(const p of [best.x,best.y])rem.set(p,rem.get(p)-1);
    (plan.get(ct.c)||plan.set(ct.c,[]).get(ct.c)).push(best);
  }
  return plan;
}
function gCourts(D,GD){
  const n=Math.max(1,+D.c.courts||1),plan=gPlan(D,GD);
  const done=GD.games.filter(g=>g.st==="done"&&g.m).sort((a,b)=>(a.m.doneAt||0)-(b.m.doneAt||0));
  let h=`<div class="rnds">`;
  for(let i=1;i<=n;i++){
    if(REF&&!MYCT.includes(i))continue;
    const D1=done.filter(g=>Number(g.m.court)===i),L1=GD.games.filter(g=>g.st==="live"&&Number(g.m.court)===i),N1=plan.get(i)||[];
    const row=(g,tag)=>gRow(D,GD,g).replace('<div class="gr','<div data-l="'+tag+'" class="gr');
    h+=`<div class="rnd crt" style="--cc:${cColor(i)}"><div class="rh"><span>SÂN ${esc(cName(i))}</span><span>${L1.length?"Đang đánh · ":""}${D1.length} xong · ${N1.length} sắp tới</span></div>${refTag(i)}
      ${D1.map(g=>row(g,"L"+g.r)).join("")}${L1.map(g=>row(g,"L"+g.r)).join("")}
      ${N1.length?`<div class="gnext">Sắp tới · dự kiến</div>`+N1.map((g,k)=>row(g,(k+1)+"")).join(""):""}
      ${!D1.length&&!L1.length&&!N1.length?`<div class="gr bye"><span class="meta">Chưa có trận.</span></div>`:""}</div>`;
  }
  const wo=GD.games.filter(g=>g.st==="wo");
  if(wo.length&&!REF)h+=`<div class="rnd"><div class="rh"><span>BỎ CUỘC</span><span>${wo.length} trận</span></div>${wo.map(g=>gRow(D,GD,g)).join("")}</div>`;
  return h+`</div><p class="rule">Thứ tự “sắp tới” là dự kiến: sân nào xong trước sẽ nhận trận kế, nên có thể đổi sân khi trận khác kết thúc sớm hơn.</p>`;
}
