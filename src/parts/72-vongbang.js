/* ---------- Vòng bảng → Knockout (mở rộng của giải cặp cố định) ----------
   config.giai.ko = {n: số bảng, adv: 1|2 cặp mỗi bảng vào vòng trong, third: tranh hạng ba, fin: "11"|"15"|"bo3" chung kết,
                     groups: [[id cặp…]…], seeds: [id hạt giống], gat, gby, gn (giờ, người, lần bốc chia bảng)}
   Trận vòng bảng như cặp cố định (không có m.ko). Trận knockout có m.ko = "k{vòng}-{thứ tự}" hoặc "k3" (tranh hạng ba),
   m.to = điểm chạm, m.bo = 3 nếu chung kết 3 ván (nhập số ván thắng). */
const isKO=G=>!!(G&&G.ko);
const KOG="ABCDEFGHIJKLMNOP";
const KOQ=[2,4,8,16];
const koDef=()=>({n:4,q:8,third:true,groups:null});
// Đọc cấu hình (kể cả kiểu cũ: adv, gto, kto, fin; bảng lưu dạng [{p:[…]}] vì Firestore không cho mảng lồng mảng)
function koK(G){const raw=(G&&G.ko)||{},K={...koDef(),...raw};
  K.groups=Array.isArray(raw.groups)?raw.groups.map(g=>Array.isArray(g)?g:(g&&Array.isArray(g.p)?g.p:[])):null;
  if(raw.q==null)K.q=(+raw.n||4)*(raw.adv===1?1:2);
  if(!raw.rg&&raw.gto)K.rg={to:+raw.gto};if(!raw.rk&&raw.kto)K.rk={to:+raw.kto};
  if(!raw.rf){K.rf=raw.fin==="bo3"?{sets:3}:raw.fin==="11"?{}:{to:15}}
  return K}
const koOut=K=>({...K,groups:Array.isArray(K.groups)?K.groups.map(p=>({p})):null});
const saveKo=(G,patch)=>saveG({ko:koOut({...koK(G),...patch})});
// Số bảng dùng thật: đã chia thì theo bảng đã chia; chưa chia thì số đã chọn, mỗi bảng ít nhất 2 cặp
function koNEff(G){const K=koK(G),n=((G&&G.pairs)||[]).length;if(koGroupsOk(G))return K.groups.length;return Math.max(1,Math.min(+K.n||1,Math.floor(n/2)||1,16))}
// Số cặp vào knockout: 2, 4, 8, 16 (không quá số cặp)
function koQEff(G){const K=koK(G),n=((G&&G.pairs)||[]).length;let q=+K.q||4;while(q>2&&q>n)q/=2;return KOQ.includes(q)?q:2}
const koTgt=()=>+(cfg().target)||11;
function koGroupsOk(G){const K=koK(G),gs=K.groups||[];if(!gs.length)return false;
  const P=new Set(((G&&G.pairs)||[]).map(p=>p.id)),all=gs.flat();return all.length===P.size&&new Set(all).size===all.length&&all.every(id=>P.has(id))&&gs.every(g=>g.length>=2)}
/* Luật điểm từng vòng: {to: chạm, w2: cách 2, cap: tối đa (0 = không giới hạn), sets: 1|3|5} */
function koBase(c){c=c||cfg();return {to:+c.target||11,w2:winBy2(c),cap:ptMax(c),sets:1}}
function koRule(K,st,c){const b=koBase(c),r=st==="g"?K.rg:st==="f"?K.rf:K.rk;return {...b,...(r||{})}}
const ruleTx=R=>`${R.sets>1?`${R.sets} set · `:""}chạm ${R.to}${R.w2?`, cách 2${R.cap?`, tối đa ${R.cap}`:", không giới hạn"}`:""}`;
// Thứ tự hạt giống trong nhánh: 1–8, 4–5, 2–7, 3–6…
function seedOrder(Q){let o=[1];while(o.length<Q){const n=o.length*2+1,x=[];for(const s of o)x.push(s,n-s);o=x}return o}
const koRName=n=>n===2?"Chung kết":n===4?"Bán kết":n===8?"Tứ kết":n===16?"Vòng 1/8":`Vòng ${n} cặp`;
const koAbbr=n=>n===2?"CK":n===4?"BK":n===8?"TK":"V"+n;
const POS=["Nhất","Nhì","Ba","Tư"];
// Xếp chỗ trong nhánh: lấy nhất các bảng trước (bảng nào thành tích tốt hơn đứng trước), rồi nhì, rồi ba…; tránh 2 cặp cùng bảng gặp nhau ở vòng đầu
function koPlace(gt,Q,known){
  const N=gt.length,L=[];
  for(let pos=0;L.length<Q&&pos<20;pos++){const tier=[];gt.forEach((t,gx)=>{const r=t.filter(x=>!x.out)[pos];if(r)tier.push({id:r.p.id,gx,pos,w:r.w,d:r.pf-r.pa,pf:r.pf})});
    if(!tier.length&&pos>3)break;tier.sort((a,b)=>(b.w-a.w)||(b.d-a.d)||(b.pf-a.pf)||(a.gx-b.gx));L.push(...tier)}
  const S=L.slice(0,Q);
  // Chưa đánh xong: nhãn theo hạng (Nhất bảng #1…)
  const lb=[];{let k=0;for(let pos=0;lb.length<Q;pos++){const cnt=Math.min(N,Q-lb.length);for(let i=0;i<cnt;i++)lb.push(N===1?`${POS[pos]||"Hạng "+(pos+1)} bảng`:`${POS[pos]||"Hạng "+(pos+1)} bảng #${i+1}`);k++;if(pos>20)break}}
  const ord=seedOrder(Q),slot=ord.map(s=>s-1),ids=slot.map(i=>known&&S[i]?S[i].id:null),lbs=slot.map(i=>lb[i]);
  if(known){const gOf=new Map(S.map(x=>[x.id,x.gx]));
    for(let i=0;i<ids.length;i+=2){if(gOf.get(ids[i])!==gOf.get(ids[i+1]))continue;
      for(let j=1;j<ids.length;j+=2){if(j===i+1)continue;const a=ids[i+1],b=ids[j],pj=ids[j%2?j-1:j+1];
        if(gOf.get(b)!==gOf.get(ids[i])&&gOf.get(a)!==gOf.get(pj)){ids[i+1]=b;ids[j]=a;break}}}}
  return {ids,lbs};
}
function koDerive(D,G,pairs,pm,out){
  const c=D.c,K=koK(G),groups=K.groups.map(g=>g.filter(id=>pm.has(id)));
  const byKey=new Map(),byKo=new Map();
  for(const m of D.SM)if(m.giai){if(m.ko)byKo.set(m.ko,m);else byKey.set(gk(m.pa,m.pb),m)}
  const RG=koRule(K,"g",c),RK=koRule(K,"k",c),RF=koRule(K,"f",c);
  const games=[];let gR=0;
  groups.forEach((ids,gx)=>rrSchedule(ids).forEach((rg,ri)=>{gR=Math.max(gR,ri+1);rg.forEach(([x,y],i)=>games.push(gGame(byKey.get(gk(x,y)),x,y,out,{r:ri+1,i,grp:gx,key:gk(x,y),rule:RG})))}));
  const T=new Map(pairs.map((p,i)=>[p.id,{p,no:i+1,gp:0,w:0,l:0,pf:0,pa:0,wo:0,out:!!out[p.id]}]));
  const gG=games.slice();gStats(T,gG);
  const snap=new Map([...T].map(([k,v])=>[k,{...v}]));
  const gt=groups.map((ids,gx)=>gRankL(D,ids.map(id=>snap.get(id)),gG.filter(g=>g.grp===gx)));
  const gDone=gG.length>0&&gG.every(g=>g.st==="done"||g.st==="wo");
  const size=koQEff(G),R=Math.max(1,Math.round(Math.log2(size))),pl=koPlace(gt,size,gDone);
  const ko=[];let prev=null;
  for(let r=0;r<R;r++){const L=[],cnt=size>>(r+1),last=r===R-1;
    for(let i=0;i<cnt;i++){let x,y,lx,ly;
      if(r===0){x=pl.ids[2*i]||null;y=pl.ids[2*i+1]||null;lx=pl.lbs[2*i];ly=pl.lbs[2*i+1]}
      else{const A=prev[2*i],B=prev[2*i+1];x=gWin(A)||null;y=gWin(B)||null;lx=`Thắng ${A.ab}`;ly=`Thắng ${B.ab}`}
      const code=`k${r}-${i}`,g=x&&y?gGame(byKo.get(code),x,y,out,{}):{x,y,m:null,st:"tbd",wo:null,sx:null,sy:null};
      Object.assign(g,{r:gR+r+1,i,ko:code,key:code,kr:r,lx,ly,ab:koAbbr(cnt*2)+(cnt>1?i+1:""),rn:koRName(cnt*2),rule:last?RF:RK});
      L.push(g);games.push(g)}
    ko.push(L);prev=L}
  let third=null;
  if(K.third!==false&&R>=2){const S2=ko[R-2],lo=g=>{const w=gWin(g);return w?(w===g.x?g.y:g.x):null},x=lo(S2[0]),y=lo(S2[1]);
    third=x&&y?gGame(byKo.get("k3"),x,y,out,{}):{x,y,m:null,st:"tbd",wo:null,sx:null,sy:null};
    Object.assign(third,{r:gR+R,i:1,ko:"k3",key:"k3",kr:R-1,lx:`Thua ${S2[0].ab}`,ly:`Thua ${S2[1].ab}`,ab:"H3",rn:"Tranh hạng ba",rule:RK});games.push(third)}
  gStats(T,games.filter(g=>g.ko));
  const F=ko[R-1][0],champ=gWin(F),ru=champ?(champ===F.x?F.y:F.x):null,tw=third?gWin(third):null,tl=tw?(tw===third.x?third.y:third.x):null;
  const reach=new Map();for(const g of games)if(g.ko&&g.ko!=="k3")for(const p of [g.x,g.y])if(p)reach.set(p,Math.max(reach.get(p)||0,g.kr+1));
  const top=[champ,ru,tw,tl].filter(Boolean),gpos=new Map();gt.forEach(t=>t.forEach((x,i)=>gpos.set(x.p.id,i)));
  const rest=[...T.values()].filter(t=>!top.includes(t.p.id)).sort((a,b)=>(a.out-b.out)||((reach.get(b.p.id)||0)-(reach.get(a.p.id)||0))||((gpos.get(a.p.id)||0)-(gpos.get(b.p.id)||0))||(b.w-a.w)||((b.pf-b.pa)-(a.pf-a.pa)));
  const table=[...top.map(id=>T.get(id)),...rest];
  const resolved=games.filter(g=>g.st==="done"||g.st==="wo").length;
  const curR=(games.find(g=>g.st!=="done"&&g.st!=="wo")||{r:gR+R}).r;
  return {G,pairs,pm,out,rounds:gR+R,games,T,table,win:gWin,resolved,total:games.length,complete:games.length>0&&resolved===games.length,curR,locked:!!G.locked,
    isKO:true,K,groups,gt,gDone,ko,third,R,size,gR,RG,RK,RF};
}
// Trường thêm vào trận khi đưa vào sân: luật điểm của vòng đó (và mã nhánh nếu là knockout)
const koMF=g=>g&&g.rule?{...(g.ko?{ko:g.ko}:{}),rule:{to:g.rule.to,w2:!!g.rule.w2,cap:+g.rule.cap||0,sets:+g.rule.sets||1}}:{};
// Tìm trận chờ của 2 cặp (vòng bảng theo cặp, knockout theo nhánh)
const gFind=(GD,x,y)=>GD.games.find(q=>q.st==="wait"&&((q.x===x&&q.y===y)||(q.x===y&&q.y===x)))||GD.games.find(q=>!q.ko&&q.key===gk(x,y))||null;
const koMName=(GD,code)=>{const g=GD&&GD.games.find(q=>q.ko===code);return g?(g.ab&&g.rn!=="Chung kết"&&g.rn!=="Tranh hạng ba"?`${g.rn} ${g.ab.replace(/^\D+/,"")}`:g.rn):"Knockout"};
// Luật của một trận (trận cũ có to/bo)
const mRule=m=>m&&m.rule?m.rule:m&&m.bo===3?{to:koTgt(),w2:false,cap:0,sets:3}:m&&m.to?{to:m.to,w2:false,cap:0,sets:1}:null;
const mRuleTx=m=>{const R=mRule(m);return R?(R.sets>1?`${R.sets} set · nhập số set thắng · mỗi set ${ruleTx({...R,sets:1})}`:ruleTx(R).replace(/^c/,"C")):null};
// Kiểm tra tỉ số theo luật của trận
function vPtsM(m,a,b){
  const R=mRule(m);if(!R)return validPts(a,b,cfg());
  if(R.sets>1){const need=Math.ceil(R.sets/2);if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0||a===b)return `Đánh ${R.sets} set: nhập số set thắng, ví dụ ${need}–${need-1}.`;
    return Math.max(a,b)===need&&Math.min(a,b)<need?null:`Đánh ${R.sets} set: đội thắng ${need} set, đội thua 0 đến ${need-1} set.`}
  return validPts(a,b,{target:R.to,win2:!!R.w2,ptMax:+R.cap||0});
}
// Số trận dự kiến: vòng bảng (vòng tròn trong bảng) + knockout
function koCount(G){const K=koK(G),N=koNEff(G),n=((G&&G.pairs)||[]).length,gs=koGroupsOk(G)?K.groups.map(g=>g.length):Array.from({length:N},(_,i)=>Math.floor(n/N)+(i<n%N?1:0));
  const grp=gs.reduce((a,k)=>a+k*(k-1)/2,0),size=koQEff(G);return {grp,ko:size-1+(K.third!==false&&size>=4?1:0),size}}

/* ----- Bốc chia bảng: hạt giống mỗi bảng 1 cặp, còn lại chia theo trình rồi bốc ngẫu nhiên ----- */
function koDraw(D,P,n,sel){
  const L=P.slice().sort((a,b)=>pairR(D,b)-pairR(D,a)),G=Array.from({length:n},()=>[]),ok=new Set(P.map(p=>p.id)),used=new Set(),seeds=[];
  for(let i=0;i<n;i++){const s0=sel&&sel[i];if(s0&&ok.has(s0)&&!used.has(s0)){seeds[i]=s0;used.add(s0)}}
  for(let i=0;i<n;i++)if(!seeds[i]){const p=L.find(x=>!used.has(x.id));if(p){seeds[i]=p.id;used.add(p.id)}}
  seeds.forEach((id,i)=>{if(id)G[i].push(id)});
  const R=L.filter(p=>!used.has(p.id));
  for(let i=0;i<R.length;i+=n){const pot=gbShuffle(R.slice(i,i+n)),ord=gbShuffle([...Array(n).keys()]).sort((a,b)=>G[a].length-G[b].length);
    pot.forEach((p,j)=>G[ord[j]].push(p.id))}
  return {groups:G,seeds:seeds.filter(Boolean)};
}
const koSw=(act,on,lb)=>`<button class="gbopt" data-act="${act}" aria-pressed="${on}"><span>${lb}</span>${gbSw(on)}</button>`;
// Một luật điểm có thể chỉnh: chạm (− +), chạm là thắng / cách 2, giới hạn (− +, 0 = không), số set
function koRuleEd(st,R,title){
  const bt=(k,v,l,on)=>`<button data-act="koru" data-s="${st}" data-k="${k}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
  const stp=(k,val,txt)=>`<span class="stepper sm"><button data-act="koru" data-s="${st}" data-k="${k}" data-d="-1" aria-label="Giảm">−</button><span class="num">${txt}</span><button data-act="koru" data-s="${st}" data-k="${k}" data-d="1" aria-label="Tăng">+</button></span>`;
  return `<div class="korule"><div class="korh"><b>${title}</b><small>${esc(ruleTx(R))}</small></div>
    <div class="korow"><span>Chạm</span>${stp("to",R.to,R.to)}</div>
    <div class="korow"><span>Thắng khi</span><span class="seg kosg">${bt("w2",0,"Chạm là thắng",!R.w2)}${bt("w2",1,"Cách 2",!!R.w2)}</span></div>
    ${R.w2?`<div class="korow"><span>Giới hạn</span>${stp("cap",R.cap,R.cap?`Tối đa ${R.cap}`:"Không")}</div>`:""}
    <div class="korow"><span>Số set</span><span class="seg kosg">${[1,3,5].map(n=>bt("sets",n,n===1?"1 set":`${n} set`,(+R.sets||1)===n)).join("")}</span></div></div>`;
}
function koRules(K){
  return koRuleEd("g",koRule(K,"g"),"Vòng bảng")+koRuleEd("k",koRule(K,"k"),"Tứ kết · bán kết · hạng ba")+koRuleEd("f",koRule(K,"f"),"Chung kết")
    +`<small class="rule">Đánh nhiều set: nhập số set thắng (ví dụ 2–1). Đổi luật chỉ áp cho các trận chưa vào sân.</small>`;
}
const koPts=K=>koRules(K);
const koStep=(k,txt)=>`<span class="stepper sm"><button data-act="koset" data-k="${k}" data-d="-1" aria-label="Bớt">−</button><span class="num">${txt}</span><button data-act="koset" data-k="${k}" data-d="1" aria-label="Thêm">+</button></span>`;
function koSegs(K,lock,G){
  const N=koNEff(G),n=((G&&G.pairs)||[]).length,Q=koQEff(G);
  return `<div class="korow"><span>Số bảng</span>${lock?`<b>${N} bảng</b>`:koStep("n",`${N} bảng`)}</div>
    ${!lock&&n?`<small class="rule">${n} cặp → ${(()=>{const a=Math.floor(n/N),r=n%N;return r?`${r} bảng ${a+1} cặp, ${N-r} bảng ${a} cặp`:`mỗi bảng ${a} cặp`})()}. Lẻ cặp vẫn đánh được: bảng ít cặp hơn thì có lượt nghỉ.</small>`:""}
    <div class="korow"><span>Vào knockout</span><span class="seg kosg">${KOQ.map(q=>`<button data-act="koset" data-k="q" data-v="${q}" aria-pressed="${Q===q}" ${n&&q>n?"disabled":""}>${q} cặp</button>`).join("")}</span></div>
    <small class="rule">${(()=>{const per=Q/N;return per===Math.floor(per)?`Mỗi bảng ${per===1?"nhất bảng":per===2?"nhất + nhì":`top ${per}`} vào ${koRName(Q).toLowerCase()}.`:`Nhất các bảng vào trước, còn chỗ thì lấy nhì${Q>2*N?", ba":""} có thành tích tốt nhất. Vào ${koRName(Q).toLowerCase()}.`})()}</small>
    ${koSw("kothird",K.third!==false,"Tranh hạng ba")}`;
}
// Chọn hạt giống từng bảng (trước khi bốc)
function koSeedSel(D,G,N){
  const K=koK(G),P=(G.pairs||[]).slice().sort((a,b)=>pairR(D,b)-pairR(D,a)),sel=(K.seedSel||[]).slice(0,N);
  const chosen=new Set(sel.filter(Boolean));
  return `<div class="koseed"><b class="lbl">Hạt giống từng bảng</b>${Array.from({length:N},(_,i)=>`<label class="korow"><span>Bảng ${KOG[i]}</span><select data-kosel="${i}"><option value="">Tự động · trình cao nhất</option>${P.map(p=>`<option value="${p.id}" ${sel[i]===p.id?"selected":""} ${chosen.has(p.id)&&sel[i]!==p.id?"disabled":""}>${esc(pairTx(D,p))} · ${r2(pairR(D,p))}</option>`).join("")}</select></label>`).join("")}
    <small class="rule">Mỗi bảng 1 hạt giống, không gặp nhau ở vòng bảng. Để "Tự động" thì app lấy cặp trình cao nhất.</small></div>`;
}
// Khung thiết lập vòng bảng ở bước Tùy chọn (quản lý)
function koSetup(D,G){
  const K=koK(G),P=G.pairs||[],n=P.length,ok=koGroupsOk(G),stale=!ok&&K.groups&&K.groups.length,cnt=koCount(G),pm=new Map(P.map(p=>[p.id,p]));
  let h=`<section class="kobox"><div class="koh"><span class="gdty vb">▦ VÒNG BẢNG → KNOCKOUT</span><small>${cnt.grp} trận vòng bảng + ${cnt.ko} trận knockout</small></div>
    <div class="kobd">${koSegs(K,ok,G)}${ok?`<small class="rule">Đã chia bảng: bốc lại nếu muốn đổi số bảng.</small>`:""}</div>`;
  if(ok){const seeds=new Set(K.seeds||[]);
    h+=`<div class="kogrid">${K.groups.map((g,gx)=>`<div class="kog"><b>BẢNG ${KOG[gx]}</b>${g.map(id=>{const p=pm.get(id);return p?`<div class="kop mfade">${seeds.has(id)?`<span class="hg">HG</span>`:""}<span class="nm">${pairNm(D,p)}</span><small class="num">${r2(pairR(D,p))}</small></div>`:""}).join("")}</div>`).join("")}</div>
      <div class="gbinfo"><span>🎲 Chia bảng lúc ${K.gat?hm(K.gat):""} · ${esc(K.gby||"BTC")}${K.gn>1?` · bốc lại lần ${K.gn}`:""} · HG = hạt giống</span><button class="lnk" data-act="koreplay">Xem lại</button>${canWrite&&!G.locked?`<button class="lnk" data-act="kodraw">Bốc lại</button>`:""}</div>`}
  else if(canWrite){const N=koNEff(G),need=Math.max(4,N*2);
    h+=`${stale?`<div class="gbwarn">Danh sách cặp đã thay đổi sau khi chia bảng. Bốc chia bảng lại nhé.</div>`:""}<div class="kobd">${n>=need?koSeedSel(D,G,N):""}
      <button class="gbbtn kodraw" data-act="kodraw" ${n<need?"disabled":""}>🎲 BỐC CHIA ${N} BẢNG</button>${n<need?`<small class="rule">Cần ít nhất ${need} cặp (đang có ${n}). Ghép thêm cặp ở trên.</small>`:""}</div>`}
  if(ok&&koShow)h+=koShowScr(D,G,K,pm);
  h+=`<details class="kodet"${canWrite?" open":""}><summary>Luật điểm từng vòng</summary><div class="kobd">${canWrite?koRules(K):`<small class="rule">Vòng bảng: ${esc(ruleTx(koRule(K,"g")))} · Knockout: ${esc(ruleTx(koRule(K,"k")))} · Chung kết: ${esc(ruleTx(koRule(K,"f")))}</small>`}</div></details>`;
  return h+`</section>`;
}
/* ----- Bảng xếp hạng từng bảng ----- */
function koTables(D,GD){
  return `<div class="kotbls">${GD.gt.map((t,gx)=>{const gs=GD.games.filter(g=>g.grp===gx),dn=gs.filter(g=>g.st==="done"||g.st==="wo").length;
    return `<div class="kotb"><div class="kotbh"><b>BẢNG ${KOG[gx]}</b><small>${dn}/${gs.length} trận</small></div><table><thead><tr><th></th><th>Cặp</th><th>Tr</th><th>T-B</th><th>HS</th></tr></thead><tbody>${t.map((r,i)=>{const d=r.pf-r.pa,q=!r.out&&(GD.gDone?GD.ko[0].some(g=>g.x===r.p.id||g.y===r.p.id):i<Math.max(1,Math.floor(GD.size/GD.groups.length)));
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
  GD.ko.forEach((L,r)=>{h+=`<div class="kocol"><span class="kocl">${esc(L[0].rn)} · ${esc(ruleTx(L[0].rule))}</span><div class="kocs">${L.map(g=>koBox(D,GD,g)).join("")}</div></div>`});
  h+=`</div>`;
  if(GD.third)h+=`<div class="ko3"><span class="kocl">🥉 Tranh hạng ba · ${esc(ruleTx(GD.third.rule))}</span>${koBox(D,GD,GD.third)}</div>`;
  if(!GD.gDone)h+=`<p class="rule">Nhánh điền tên khi đánh xong vòng bảng. Nhất các bảng xếp trước, rồi nhì (ba) có thành tích tốt nhất; app tránh để hai cặp cùng bảng gặp nhau ngay vòng đầu.</p>`;
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
  if(act==="koreplay"){koShow=Date.now();render();return true}
  if(act==="koshowx"){koShow=0;render();return true}
  if(!canWrite)return true;
  const G=cfg().giai||{},K=koK(G);
  if(act==="komode"){if(G.locked)return true;const on=b.dataset.v==="1";await write(()=>saveG({ko:on?koOut({...koK(G),groups:null}):null}),on?"Đã chọn Vòng bảng → Knockout":"Đã chọn Vòng tròn");return true}
  if(act==="koru"){const st=b.dataset.s,k=b.dataset.k;if(!["g","k","f"].includes(st))return true;const R=koRule(K,st);
    if(k==="to")R.to=Math.max(5,Math.min(31,R.to+(+b.dataset.d||0)));
    else if(k==="w2"){R.w2=b.dataset.v==="1";if(!R.w2)R.cap=0}
    else if(k==="cap"){const d=+b.dataset.d||0;R.cap=R.cap?R.cap+d:(d>0?R.to+2:0);if(R.cap&&R.cap<R.to+1)R.cap=0;R.cap=Math.min(R.cap,51)}
    else if(k==="sets"){const n=+b.dataset.v;if([1,3,5].includes(n))R.sets=n}
    if(R.cap&&R.cap<=R.to)R.cap=R.to+2;
    await write(()=>saveKo(G,{["r"+st]:R}),null);return true}
  if(act==="kothird"){await write(()=>saveKo(G,{third:K.third===false}));return true}
  if(G.locked)return true;
  if(act==="koset"){const k=b.dataset.k;
    if(k==="n"){const n=(G.pairs||[]).length,cur=koNEff(G),v=Math.max(1,Math.min(16,cur+(+b.dataset.d||0)));if(n&&v*2>n&&v>cur){toast(`${n} cặp chia tối đa ${Math.floor(n/2)} bảng (mỗi bảng ít nhất 2 cặp).`);return true}
      await write(()=>saveKo(G,{n:v,groups:null,seeds:null}));return true}
    if(k==="q"){const v=+b.dataset.v;if(!KOQ.includes(v))return true;await write(()=>saveKo(G,{q:v}));return true}
    return true}
  if(act==="kodraw"){const D=derive(),P=G.pairs||[],N=koNEff(G);if(P.length<Math.max(4,N*2)){toast(`Cần ít nhất ${Math.max(4,N*2)} cặp.`);return true}
    if(koGroupsOk(G)&&!armOr("kodraw:x"))return true;
    const r=koDraw(D,P,N,K.seedSel);
    await write(()=>saveKo(G,{n:N,groups:r.groups,seeds:r.seeds,gat:Date.now(),gby:who(),gn:(K.gn||0)+1}),null);koShow=Date.now();render();try{window.scrollTo(0,0)}catch(e){}return true}
  return false;
}
// Tóm tắt thể thức: "2 bảng · 4 cặp vào bán kết · chung kết chạm 15"
function koSum(GD){return `${GD.groups.length} bảng · ${GD.size} cặp vào ${koRName(GD.size).toLowerCase()} · chung kết ${ruleTx(GD.RF)}${GD.third?" · tranh hạng ba":""}`}
// Quản lý (đang đánh): thể thức và luật điểm từng vòng
function koMgr(D,GD){return `<div class="panel"><h2>Vòng bảng → Knockout</h2><p class="rule">${esc(koSum(GD))}</p><div class="kobd" style="padding:0">${koRules(GD.K)}</div></div>`}
// Chọn hạt giống (ô chọn)
function koSelChange(t){if(!canWrite)return false;const i=+t.dataset.kosel,G=cfg().giai||{},K=koK(G),sel=(K.seedSel||[]).slice();while(sel.length<=i)sel.push("");sel[i]=t.value||"";
  write(()=>saveKo(G,{seedSel:sel}));return true}

/* ----- Hiệu ứng bốc chia bảng: bấm 1 lần, lần lượt từng lượt (hạt giống trước), mỗi cặp rơi vào bảng của mình ----- */
let koShow=0;
const KO_STEP=0.75;
function koShowScr(D,G,K,pm){
  const gs=K.groups,N=gs.length,seeds=new Set(K.seeds||[]),maxL=Math.max(...gs.map(g=>g.length));
  const pots=[];for(let r=0;r<maxL;r++)pots.push(gs.map(g=>g[r]).filter(Boolean));
  let k=0;const at=new Map();for(let r=0;r<maxL;r++)gs.forEach((g,gx)=>{if(g[r])at.set(g[r],k++)});
  const total=k*KO_STEP+1.2,tag=koShow;
  const potLb=r=>r===0?"Hạt giống":`Lượt ${r+1}`;
  return `<div class="koscr" role="dialog" aria-label="Bốc thăm chia bảng" data-k="${tag}"><div class="gbhd"><button class="ckx" data-act="koshowx" aria-label="Đóng">✕</button><span class="t"><b>Bốc thăm chia bảng</b><small>${(G.pairs||[]).length} cặp · ${N} bảng</small></span></div>
    <b class="gbno">BỐC THĂM CHIA BẢNG</b>
    <div class="kopots">${pots.map((p,r)=>`<span class="kopot" style="animation-delay:${(at.get(p[0])||0)*KO_STEP}s">${potLb(r)}</span>`).join("")}</div>
    <div class="koshg">${gs.map((g,gx)=>`<div class="koshb"><b>BẢNG ${KOG[gx]}</b>${g.map(id=>{const p=pm.get(id),d=(at.get(id)||0)*KO_STEP;return p?`<div class="koshp" style="animation-delay:${d}s">${pairAv(D,p,"xs")}<span>${pairNm(D,p)}</span>${seeds.has(id)?`<i class="hg">HG</i>`:""}</div>`:""}).join("")}</div>`).join("")}</div>
    <div class="gbft"><button class="gbnext kodone" data-act="koshowx" style="animation-delay:${total}s">XONG · ĐÃ CHIA ${N} BẢNG</button></div></div>`;
}
