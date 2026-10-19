/* ---------- Vòng bảng → Knockout (mở rộng của giải cặp cố định) ----------
   config.giai.ko = {n: số bảng, adv: 1|2 cặp mỗi bảng vào vòng trong, third: tranh hạng ba, fin: "11"|"15"|"bo3" chung kết,
                     groups: [[id cặp…]…], seeds: [id hạt giống], gat, gby, gn (giờ, người, lần bốc chia bảng)}
   Trận vòng bảng như cặp cố định (không có m.ko). Trận knockout có m.ko = "k{vòng}-{thứ tự}" hoặc "k3" (tranh hạng ba),
   m.to = điểm chạm, m.bo = 3 nếu chung kết 3 ván (nhập số ván thắng). */
const isKO=G=>!!(G&&G.ko);
const KOG="ABCDEFGH";
const KOFIN={"11":"1 ván chạm 11","15":"1 ván chạm 15","bo3":"3 ván chạm 11"};
const koDef=()=>({n:4,adv:2,third:true,fin:"15",gto:0,kto:0,groups:null});
// Số bảng dùng thật: đã chia thì theo bảng đã chia; chưa chia thì lấy số bảng đã chọn, ít cặp quá thì tự giảm (mỗi bảng ít nhất 2 cặp)
function koNEff(G){const K=koK(G),n=((G&&G.pairs)||[]).length;if(koGroupsOk(G))return K.groups.length;for(const x of [8,4,2])if(x<=K.n&&n>=x*2)return x;return 2}
const koTgt=()=>+(cfg().target)||11;
const koK=G=>({...koDef(),...((G&&G.ko)||{})});
function koGroupsOk(G){const K=(G&&G.ko)||{},gs=K.groups||[];if(!gs.length)return false;
  const P=new Set((G.pairs||[]).map(p=>p.id)),all=gs.flat();return all.length===P.size&&new Set(all).size===all.length&&all.every(id=>P.has(id))&&gs.every(g=>g.length>=2)}
// Ghép nhánh: nhất bảng này gặp nhì bảng kề bên, hai cặp cùng bảng nằm ở hai nửa nhánh (chỉ gặp lại ở chung kết)
function koSeeds(K,tables){
  const n=tables.length,s=[];
  if(K.adv===1){for(let i=0;i<n;i+=2)s.push(tables[i][0],tables[i+1]?tables[i+1][0]:null)}
  else if(n===1)s.push(tables[0][0],tables[0][1]);
  else{const top=[],bot=[];for(let i=0;i<n;i+=2){top.push(tables[i][0],tables[i+1][1]);bot.push(tables[i+1][0],tables[i][1])}s.push(...top,...bot)}
  return s.map(x=>x==null?null:x);
}
const koRName=n=>n===2?"Chung kết":n===4?"Bán kết":n===8?"Tứ kết":`Vòng ${n} cặp`;
const koAbbr=n=>n===2?"CK":n===4?"BK":n===8?"TK":"V"+n;
function koDerive(D,G,pairs,pm,out){
  const c=D.c,K=koK(G),groups=K.groups.map(g=>g.filter(id=>pm.has(id)));
  const byKey=new Map(),byKo=new Map();
  for(const m of D.SM)if(m.giai){if(m.ko)byKo.set(m.ko,m);else byKey.set(gk(m.pa,m.pb),m)}
  const games=[];let gR=0;
  groups.forEach((ids,gx)=>rrSchedule(ids).forEach((rg,ri)=>{gR=Math.max(gR,ri+1);rg.forEach(([x,y],i)=>games.push(gGame(byKey.get(gk(x,y)),x,y,out,{r:ri+1,i,grp:gx,key:gk(x,y),...(K.gto?{to:+K.gto}:{})})))}));
  const T=new Map(pairs.map((p,i)=>[p.id,{p,no:i+1,gp:0,w:0,l:0,pf:0,pa:0,wo:0,out:!!out[p.id]}]));
  const gG=games.slice();gStats(T,gG);
  const snap=new Map([...T].map(([k,v])=>[k,{...v}]));
  const gt=groups.map((ids,gx)=>gRankL(D,ids.map(id=>snap.get(id)),gG.filter(g=>g.grp===gx)));
  const gDone=gG.length>0&&gG.every(g=>g.st==="done"||g.st==="wo");
  const adv=K.adv===1?1:2,size=Math.max(2,groups.length*adv),R=Math.max(1,Math.round(Math.log2(size)));
  const seeds=gDone?koSeeds(K,gt.map(t=>t.filter(x=>!x.out).map(x=>x.p.id))):[];
  const lbs=koSeeds(K,groups.map((_,gx)=>[`Nhất ${KOG[gx]}`,`Nhì ${KOG[gx]}`]));
  const fin=String(K.fin||"15"),tgt=+c.target||11,kto=+K.kto||tgt;
  const ko=[];let prev=null;
  for(let r=0;r<R;r++){const L=[],cnt=size>>(r+1),last=r===R-1;
    for(let i=0;i<cnt;i++){let x,y,lx,ly;
      if(r===0){x=seeds[2*i]||null;y=seeds[2*i+1]||null;lx=lbs[2*i];ly=lbs[2*i+1]}
      else{const A=prev[2*i],B=prev[2*i+1];x=gWin(A)||null;y=gWin(B)||null;lx=`Thắng ${A.ab}`;ly=`Thắng ${B.ab}`}
      const code=`k${r}-${i}`,g=x&&y?gGame(byKo.get(code),x,y,out,{}):{x,y,m:null,st:"tbd",wo:null,sx:null,sy:null};
      Object.assign(g,{r:gR+r+1,i,ko:code,key:code,kr:r,lx,ly,ab:koAbbr(cnt*2)+(cnt>1?i+1:""),rn:koRName(cnt*2),to:last?(fin==="15"?15:tgt):kto,bo:last&&fin==="bo3"?3:0});
      L.push(g);games.push(g)}
    ko.push(L);prev=L}
  let third=null;
  if(K.third!==false&&R>=2){const S2=ko[R-2],lo=g=>{const w=gWin(g);return w?(w===g.x?g.y:g.x):null},x=lo(S2[0]),y=lo(S2[1]);
    third=x&&y?gGame(byKo.get("k3"),x,y,out,{}):{x,y,m:null,st:"tbd",wo:null,sx:null,sy:null};
    Object.assign(third,{r:gR+R,i:1,ko:"k3",key:"k3",kr:R-1,lx:`Thua ${S2[0].ab}`,ly:`Thua ${S2[1].ab}`,ab:"H3",rn:"Tranh hạng ba",to:kto,bo:0});games.push(third)}
  gStats(T,games.filter(g=>g.ko));
  const F=ko[R-1][0],champ=gWin(F),ru=champ?(champ===F.x?F.y:F.x):null,tw=third?gWin(third):null,tl=tw?(tw===third.x?third.y:third.x):null;
  const reach=new Map();for(const g of games)if(g.ko&&g.ko!=="k3")for(const p of [g.x,g.y])if(p)reach.set(p,Math.max(reach.get(p)||0,g.kr+1));
  const top=[champ,ru,tw,tl].filter(Boolean),gpos=new Map();gt.forEach(t=>t.forEach((x,i)=>gpos.set(x.p.id,i)));
  const rest=[...T.values()].filter(t=>!top.includes(t.p.id)).sort((a,b)=>(a.out-b.out)||((reach.get(b.p.id)||0)-(reach.get(a.p.id)||0))||((gpos.get(a.p.id)||0)-(gpos.get(b.p.id)||0))||(b.w-a.w)||((b.pf-b.pa)-(a.pf-a.pa)));
  const table=[...top.map(id=>T.get(id)),...rest];
  const resolved=games.filter(g=>g.st==="done"||g.st==="wo").length;
  const curR=(games.find(g=>g.st!=="done"&&g.st!=="wo")||{r:gR+R}).r;
  return {G,pairs,pm,out,rounds:gR+R,games,T,table,win:gWin,resolved,total:games.length,complete:games.length>0&&resolved===games.length,curR,locked:!!G.locked,
    isKO:true,K,groups,gt,gDone,ko,third,R,size,adv,gR};
}
// Trường thêm vào trận knockout khi đưa vào sân
const koMF=g=>g&&g.ko?{ko:g.ko,to:g.to||null,...(g.bo?{bo:g.bo}:{})}:g&&g.to?{to:g.to}:{};
// Tìm trận chờ của 2 cặp (vòng bảng theo cặp, knockout theo nhánh)
const gFind=(GD,x,y)=>GD.games.find(q=>q.st==="wait"&&((q.x===x&&q.y===y)||(q.x===y&&q.y===x)))||GD.games.find(q=>!q.ko&&q.key===gk(x,y))||null;
const koMName=(GD,code)=>{const g=GD&&GD.games.find(q=>q.ko===code);return g?(g.ab&&g.rn!=="Chung kết"&&g.rn!=="Tranh hạng ba"?`${g.rn} ${g.ab.replace(/^\D+/,"")}`:g.rn):"Knockout"};
// Kiểm tra tỉ số theo từng trận: chung kết chạm 15 / 3 ván, còn lại theo luật giải
function vPtsM(m,a,b){
  if(m&&m.bo===3){if(!Number.isInteger(a)||!Number.isInteger(b)||a===b)return "Chung kết 3 ván: nhập số ván thắng, ví dụ 2–1.";return Math.max(a,b)===2&&Math.min(a,b)>=0&&Math.min(a,b)<=1?null:"Chung kết 3 ván: đội thắng 2 ván, đội thua 0 hoặc 1 ván."}
  if(m&&m.to&&m.to!==koTgt())return validPts(a,b,{...cfg(),target:m.to,ptMax:0});
  return validPts(a,b,cfg());
}
// Số trận dự kiến: vòng bảng (vòng tròn trong bảng) + knockout
function koCount(G){const K=koK(G),N=koNEff(G),n=(G.pairs||[]).length,gs=koGroupsOk(G)?K.groups.map(g=>g.length):Array.from({length:N},(_,i)=>Math.floor(n/N)+(i<n%N?1:0));
  const grp=gs.reduce((a,k)=>a+k*(k-1)/2,0),size=N*(K.adv===1?1:2);return {grp,ko:size-1+(K.third!==false&&size>=4?1:0),size}}

/* ----- Bốc chia bảng: hạt giống mỗi bảng 1 cặp, còn lại chia theo trình rồi bốc ngẫu nhiên ----- */
function koDraw(D,P,n){
  const L=P.slice().sort((a,b)=>pairR(D,b)-pairR(D,a)),G=Array.from({length:n},()=>[]);
  for(let i=0;i<L.length;i+=n){const pot=gbShuffle(L.slice(i,i+n)),ord=gbShuffle([...Array(n).keys()]).sort((a,b)=>G[a].length-G[b].length);
    pot.forEach((p,j)=>G[ord[j]].push(p.id))}
  return {groups:G,seeds:L.slice(0,n).map(p=>p.id)};
}
const koSw=(act,on,lb)=>`<button class="gbopt" data-act="${act}" aria-pressed="${on}"><span>${lb}</span>${gbSw(on)}</button>`;
// Điểm từng vòng: vòng bảng, tứ kết/bán kết, chung kết (đổi được cả khi đang đánh, áp cho trận chưa vào sân)
function koPts(K){
  const t=koTgt(),sg=(k,opts,cur)=>`<span class="seg kosg">${opts.map(([v,l])=>`<button data-act="koset" data-k="${k}" data-v="${v}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join("")}</span>`;
  const o=[[0,`Chạm ${t}`],...[11,15,21].filter(x=>x!==t).map(x=>[x,`Chạm ${x}`])];
  return `<div class="korow"><span>Vòng bảng</span>${sg("gto",o,+K.gto||0)}</div>
    <div class="korow"><span>Tứ kết · bán kết</span>${sg("kto",o,+K.kto||0)}</div>
    <div class="korow"><span>Chung kết</span>${sg("fin",[["11",`Chạm ${t===11?11:t}`],["15","Chạm 15"],["bo3","3 ván"]],String(K.fin||"15"))}</div>`;
}
function koSegs(K,lock,G){
  const N=koNEff(G),n=((G&&G.pairs)||[]).length;
  const sg=(k,opts,cur,dis)=>`<span class="seg kosg">${opts.map(([v,l])=>`<button data-act="koset" data-k="${k}" data-v="${v}" aria-pressed="${String(cur)===String(v)}" ${lock||(dis&&dis(v))?"disabled":""}>${l}</button>`).join("")}</span>`;
  return `<div class="korow"><span>Số bảng</span>${sg("n",[[2,"2"],[4,"4"],[8,"8"]],N,v=>n>=4&&n<v*2)}</div>${!lock&&N<K.n?`<small class="rule">Đang có ${n} cặp nên chia ${N} bảng (mỗi bảng ít nhất 2 cặp).</small>`:""}
    <div class="korow"><span>Vào vòng trong</span>${sg("adv",[[1,"Nhất"],[2,"Nhất + nhì"]],K.adv)}</div>
    ${koPts(K)}${koSw("kothird",K.third!==false,"Tranh hạng ba")}`;
}
// Khung thiết lập vòng bảng ở bước Tùy chọn (quản lý)
function koSetup(D,G){
  const K=koK(G),P=G.pairs||[],n=P.length,ok=koGroupsOk(G),stale=!ok&&K.groups&&K.groups.length,cnt=koCount(G),pm=new Map(P.map(p=>[p.id,p]));
  let h=`<section class="kobox"><div class="koh"><span class="gdty vb">▦ VÒNG BẢNG → KNOCKOUT</span><small>${cnt.grp} trận vòng bảng + ${cnt.ko} trận knockout</small></div>
    <div class="kobd">${koSegs(K,ok,G)}${ok?`<small class="rule">Đã chia bảng: bốc lại nếu muốn đổi số bảng hoặc cách vào vòng trong.</small>`:""}</div>`;
  if(ok){const seeds=new Set(K.seeds||[]);
    h+=`<div class="kogrid">${K.groups.map((g,gx)=>`<div class="kog"><b>BẢNG ${KOG[gx]}</b>${g.map(id=>{const p=pm.get(id);return p?`<div class="kop mfade">${seeds.has(id)?`<span class="hg">HG</span>`:""}<span class="nm">${pairNm(D,p)}</span><small class="num">${r2(pairR(D,p))}</small></div>`:""}).join("")}</div>`).join("")}</div>
      <div class="gbinfo"><span>🎲 Chia bảng lúc ${K.gat?hm(K.gat):""} · ${esc(K.gby||"BTC")}${K.gn>1?` · bốc lại lần ${K.gn}`:""} · HG = hạt giống</span>${canWrite&&!G.locked?`<button class="lnk" data-act="kodraw">Bốc lại</button>`:""}</div>`}
  else if(canWrite){const N=koNEff(G),need=N*2;
    h+=`${stale?`<div class="gbwarn">Danh sách cặp đã thay đổi sau khi chia bảng. Bốc chia bảng lại nhé.</div>`:""}
      <div class="kobd"><small class="rule">${N} cặp trình cao nhất làm hạt giống, mỗi bảng 1 cặp. Các cặp còn lại chia nhóm theo trình rồi bốc ngẫu nhiên vào các bảng, nên bảng nào cũng đều sức.</small>
      <button class="gbbtn kodraw" data-act="kodraw" ${n<need?"disabled":""}>🎲 BỐC CHIA ${N} BẢNG</button>${n<need?`<small class="rule">Cần ít nhất ${need} cặp (đang có ${n}). Ghép thêm cặp ở trên.</small>`:""}</div>`}
  return h+`</section>`;
}
/* ----- Bảng xếp hạng từng bảng ----- */
function koTables(D,GD){
  return `<div class="kotbls">${GD.gt.map((t,gx)=>{const gs=GD.games.filter(g=>g.grp===gx),dn=gs.filter(g=>g.st==="done"||g.st==="wo").length;
    return `<div class="kotb"><div class="kotbh"><b>BẢNG ${KOG[gx]}</b><small>${dn}/${gs.length} trận</small></div><table><thead><tr><th></th><th>Cặp</th><th>Tr</th><th>T-B</th><th>HS</th></tr></thead><tbody>${t.map((r,i)=>{const d=r.pf-r.pa,q=!r.out&&i<GD.adv;
      return `<tr class="${q?"q":""}${r.out?" out":""}"><td class="num">${i+1}</td><td>${pairNm(D,r.p)}</td><td class="num">${r.gp}</td><td class="num"><b>${r.w}-${r.l}</b></td><td class="num">${d>0?"+":""}${d}</td></tr>`}).join("")}</tbody></table></div>`}).join("")}</div>
    <p class="rule"><i class="koq"></i> Vào vòng trong · bằng số trận thắng xét đối đầu trực tiếp, rồi hiệu số, rồi điểm ghi.</p>`;
}
/* ----- Nhánh knockout ----- */
function koBox(D,GD,g){
  const nm=(id,lb)=>id?pairNm(D,GD.pm.get(id)):`<em>${esc(lb||"?")}</em>`,w=gWin(g);
  const sc=(id,v)=>g.st==="done"?`<b class="num">${v}</b>`:g.st==="wo"&&w===id?`<b>T</b>`:"";
  const row=(id,lb,v)=>`<span class="${w?w===id?"w":"l":""}">${nm(id,lb)}${sc(id,v)}</span>`;
  return `<div class="kom ${g.st}">${g.st==="live"?`<small class="lv">● SÂN ${esc(cName(g.m.court))}</small>`:""}${row(g.x,g.lx,g.sx)}${row(g.y,g.ly,g.sy)}</div>`;
}
function koBracket(D,GD){
  let h=`<div class="kobr">`;
  GD.ko.forEach((L,r)=>{h+=`<div class="kocol"><span class="kocl">${esc(L[0].rn)}${L[0].bo?" · 3 ván":L[0].to!==(+D.c.target||11)?` · chạm ${L[0].to}`:""}</span><div class="kocs">${L.map(g=>koBox(D,GD,g)).join("")}</div></div>`});
  h+=`</div>`;
  if(GD.third)h+=`<div class="ko3"><span class="kocl">🥉 Tranh hạng ba</span>${koBox(D,GD,GD.third)}</div>`;
  if(!GD.gDone)h+=`<p class="rule">Nhánh điền tên khi đánh xong vòng bảng. Nhất bảng gặp nhì bảng kề bên; hai cặp cùng bảng chỉ có thể gặp lại ở chung kết.</p>`;
  return h;
}
function koBang(D,GD){
  return `<div class="shd"><h2>Vòng bảng</h2><span class="meta">${GD.gDone?"Đã xong":"Đang đánh"}</span></div>${koTables(D,GD)}<div class="shd"><h2>Knockout</h2><span class="meta">${GD.size} cặp</span></div>${koBracket(D,GD)}`;
}
// Lịch theo bảng: trận từng bảng + knockout
function koLich(D,GD){
  let h=`<div class="rnds">`;
  GD.groups.forEach((ids,gx)=>{const gs=GD.games.filter(g=>g.grp===gx);h+=`<div class="rnd"><div class="rh"><span>BẢNG ${KOG[gx]}</span><span>${gs.filter(g=>g.st==="done"||g.st==="wo").length}/${gs.length} trận</span></div>${gs.map(g=>gRow(D,GD,g)).join("")}</div>`});
  return h+`</div><div class="shd"><h2>Knockout</h2><span class="meta">${esc(koSum(GD))}</span></div>`+koBracket(D,GD);
}
async function koAct(act,b,id){
  if(!act||!act.startsWith("ko"))return false;
  if(!canWrite)return true;
  const G=cfg().giai||{},K=koK(G);
  if(act==="komode"){if(G.locked)return true;const on=b.dataset.v==="1";await write(()=>saveG({ko:on?{...koDef(),...(G.ko||{}),groups:null}:null}),on?"Đã chọn Vòng bảng → Knockout":"Đã chọn Vòng tròn");return true}
  if(act==="koset"&&["fin","gto","kto"].includes(b.dataset.k)){const k=b.dataset.k,v=k==="fin"?String(b.dataset.v):Number(b.dataset.v);
    if(k==="fin"&&!KOFIN[v])return true;if(k!=="fin"&&![0,11,15,21].includes(v))return true;
    await write(()=>saveG({ko:{...K,[k]:v}}),"Đã đổi điểm · áp cho các trận chưa vào sân");return true}
  if(G.locked)return true;
  if(act==="koset"){const k=b.dataset.k,v=Number(b.dataset.v);if(!["n","adv"].includes(k))return true;
    if(k==="n"&&![2,4,8].includes(v))return true;if(k==="adv"&&![1,2].includes(v))return true;
    await write(()=>saveG({ko:{...K,[k]:v,...(k==="n"||k==="adv"?{groups:null,seeds:null}:{})}}));return true}
  if(act==="kothird"){await write(()=>saveG({ko:{...K,third:K.third===false}}));return true}
  if(act==="kodraw"){const D=derive(),P=G.pairs||[],N=koNEff(G);if(P.length<N*2){toast(`Cần ít nhất ${N*2} cặp.`);return true}
    if(koGroupsOk(G)&&!armOr("kodraw:x"))return true;
    const r=koDraw(D,P,N);
    await write(()=>saveG({ko:{...K,n:N,groups:r.groups,seeds:r.seeds,gat:Date.now(),gby:who(),gn:(K.gn||0)+1}}),`Đã chia ${N} bảng`);return true}
  return false;
}

// Tóm tắt thể thức: "2 bảng · nhất + nhì vào bán kết · chung kết chạm 15"
function koSum(GD){const K=GD.K,f=String(K.fin||"15");return `${GD.groups.length} bảng · ${GD.adv===1?"nhất":"nhất + nhì"} vào ${koRName(GD.size).toLowerCase()} · chung kết ${f==="bo3"?"3 ván":"chạm "+(f==="15"?15:+D0t())}${K.third!==false&&GD.R>=2?" · tranh hạng ba":""}`}
const D0t=()=>koTgt();
// Quản lý (đang đánh): thể thức và điểm từng vòng
function koMgr(D,GD){return `<div class="panel"><h2>Vòng bảng → Knockout</h2><p class="rule">${esc(koSum(GD))}</p><div class="kobd" style="padding:0">${koPts(GD.K)}</div><small class="rule">Đổi điểm chỉ áp cho các trận chưa vào sân.</small></div>`}
