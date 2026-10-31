/* ---------- Giải nhiều nội dung chạy song song (canvas trang nd) ----------
   sched.nds = [{k, name, dt, cap (tổng trình 2 người tối đa), max (số cặp), koN (số bảng), fee (k), courts:[sân ưu tiên]}], sched.ndMax (mỗi người tối đa mấy nội dung, mặc định 2)
   Đăng ký: reg.sid = "<id giải>~<k>" (mỗi nội dung một danh sách, một người đăng ký được nhiều nội dung).
   Chia bảng từng nội dung: sched.kdn[k] (giống kd). Khi đánh: config.giai = {locked, startedAt, cpause, nd:{k:{pairs, ko, rest, out, koGate, koGo…}}}, trận có m.nd = k.
   Ống kính: ndX(X,k) là "giải con" để dùng lại các màn của giải 1 nội dung; ndD(D,k) là dữ liệu đang đánh của riêng nội dung k. */
const ND_COL=[["#534AB7","#EEEDFE","#3C3489"],["#993556","#FBEAF0","#72243E"],["#0F6E56","#E1F5EE","#085041"],["#854F0B","#FAEEDA","#633806"],["#185FA5","#E6F1FB","#0C447C"],["#A32D2D","#FCEBEB","#791F1F"]];
const ndB=X=>X&&X._X?X._X:X;
const ndL=X=>{const B=ndB(X);return Array.isArray(B&&B.nds)?B.nds:[]};
const ndOn=X=>!!(X&&!X._nd&&ndL(X).length);
const ndOf=(X,k)=>ndL(X).find(n=>n.k===k)||null;
const ndCol=(X,k)=>ND_COL[Math.max(0,ndL(X).findIndex(n=>n.k===k))%ND_COL.length];
const ndMaxP=X=>Math.max(1,+(ndB(X)||{}).ndMax||2);
const DT_ND={free:"Open",MM:"Đôi nam",FF:"Đôi nữ",mix:"Nam nữ"};
const ndSub=n=>[DT_ND[n.dt||"free"],n.cap?`tổng trình ≤ ${n.cap}`:"không giới hạn trình",`${+n.max||0} cặp`,`${+n.koN||4} bảng`,n.fee?`${fmtK(+n.fee)}/người`:"miễn phí"].join(" · ");
function ndTag(X,k,sfx=""){const n=ndOf(X,k);if(!n)return "";const c=ndCol(X,k);return `<span class="ndtag" style="background:${c[1]};color:${c[2]}">${esc(String(n.name||"").toUpperCase())}${sfx}</span>`}
function ndX(X,k){const n=ndOf(X,k);if(!n)return null;
  return {...X,id:X.id+"~"+k,_base:X.id,_nd:k,_X:X,nds:null,ndName:n.name,dt:n.dt||"free",koN:String(+n.koN||4),koQ:String(+n.koQ||(+n.koN||4)*2),
    max:(+n.max||0)*2||X.max,thu:"phi",phi:+n.fee||0,cp:true,kd:(X.kdn||{})[k]||null,ndCap:+n.cap||0}}
const inX=(r,X)=>!!(r&&X&&(r.sid===X.id||(!X._nd&&String(r.sid||"").startsWith(X.id+"~"))));
const regsOfX=X=>(S.regs||[]).filter(r=>inX(r,X)&&!r.cancel);
const ndOfReg=r=>{const s=String(r&&r.sid||"");return s.includes("~")?s.split("~")[1]:null};
// Người đánh nhiều nội dung: check-in ở nội dung nào cũng tính là đã tới
const ndArrived=(X,r)=>!!(r&&(r.arrived||(X&&X._X&&regsOfX(X._X).some(z=>z.arrived&&((z.pid&&z.pid===r.pid)||(z.uid&&z.uid!=="btc"&&z.uid===r.uid))))));
// Trình của một đăng ký (theo hồ sơ hoặc tự khai)
const ndLv=(D,r)=>{if(!r)return 0;const st=r.pid&&D.st.get(r.pid);return st&&st.rating!=null?st.rating:+r.lv||3};

/* ----- Đang đánh: dữ liệu theo nội dung ----- */
let gNdF=null;
const gMulti=()=>!!(cfg().giai||{}).nd;
function gNdKeys(){const G=cfg().giai||{};if(!G.nd)return [];const K=Object.keys(G.nd),o=ndL(xCur()).map(n=>n.k).filter(k=>K.includes(k));return [...o,...K.filter(k=>!o.includes(k))]}
const gNdCur=()=>{const K=gNdKeys();return K.includes(gNdF)?gNdF:K[0]||null};
const ND_TOP=new Set(["cpause","locked","startedAt","nd","prizes"]);
function ndD(D,k){if(D._nd===k)return D;const f=m=>(m.nd||"")===k,G=D.c.giai||{},sub=(G.nd||{})[k]||{};
  return {...D,_nd:k,c:{...D.c,giai:{...G,...sub,nd:null}},SM:D.SM.filter(f),done:D.done.filter(f),playing:D.playing.filter(f)}}
const gDeriveK=(D,k)=>gDerive(ndD(D,k));
const gCur=()=>{const G=cfg().giai||{};if(!G.nd)return G;const k=gNdCur();return {...G,...((G.nd||{})[k]||{}),nd:null}};
const ndPairK=id=>{const G=cfg().giai||{};for(const [k,v] of Object.entries(G.nd||{}))if((v.pairs||[]).some(p=>p.id===id))return k;return null};
function gFocusPair(id){const k=ndPairK(id);if(k)gNdF=k}
// Giải đang đánh có những nội dung nào (ống kính theo giải hiện tại)
const ndRunX=()=>{const X=xCur();return X&&gMulti()?X:null};

// Xếp trận cho các sân trống: sân ưu tiên nội dung nào thì lấy trận nội dung đó trước, hết thì lấy nội dung khác;
// không xếp một người vào 2 sân cùng lúc; người vừa đánh xong nghỉ 1 lượt
async function gFillN(quiet,only){
  const D=derive(),G=D.c.giai||{};if(!G.locked)return 0;const X=xCur(),K=gNdKeys();
  const cp=G.cpause||{},used=new Set(D.playing.map(m=>Number(m.court))),free=[];
  for(let i=1;i<=Math.max(1,+D.c.courts||1);i++)if(!used.has(i)&&!cp[i]&&(!only||i===only))free.push(i);
  if(!free.length)return 0;
  const pBusy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const pRest=new Set(D.done.slice(-Math.max(1,(+D.c.courts||1)-1)).flatMap(m=>[...m.a,...m.b]));
  const GDs=new Map(K.map(k=>[k,{d:ndD(D,k),g:gDeriveK(D,k)}]));
  const pref=c=>{const L=ndL(X).filter(n=>(n.courts||[]).map(Number).includes(c)).map(n=>n.k).filter(k=>K.includes(k));return [...L,...K.filter(k=>!L.includes(k))]};
  const pick=[];
  for(const ct of free)for(const k of pref(ct)){const o=GDs.get(k);if(!o||!o.g)continue;const GD=o.g,pb=new Set(),pr=new Set();
    for(const p of GD.pairs){if(pBusy.has(p.a)||pBusy.has(p.b))pb.add(p.id);if(pRest.has(p.a)||pRest.has(p.b))pr.add(p.id)}
    const g=gPick(o.d,GD,pb,pr);if(!g)continue;const X1=GD.pm.get(g.x),Y1=GD.pm.get(g.y);
    for(const id of [X1.a,X1.b,Y1.a,Y1.b])pBusy.add(id);pick.push([ct,g,k,GD]);break}
  if(!pick.length)return 0;
  const lock=await db.doc("app/lock").acquire({holder,ttlMs:5000});
  if(!lock.acquired){if(!quiet)toast("Có người khác đang xếp trận, thử lại sau vài giây.");return 0}
  let seq=D.SM.reduce((m,x)=>Math.max(m,x.seq||0),0);const now=Date.now();
  await write(async()=>{for(const [ct,g,k,GD] of pick){const A=GD.pm.get(g.x),B=GD.pm.get(g.y);seq++;
    await db.collection("matches").doc().set({session:D.sid,seq,court:ct,cn:cName(ct),giai:true,nd:k,pa:g.x,pb:g.y,round:g.r,a:[A.a,A.b],b:[B.a,B.b],sa:null,sb:null,status:"playing",createdAt:now,...koMF(g)})}
    S.everWrote=true},null);
  return pick.length;
}
// Bắt đầu tất cả nội dung: mỗi nội dung thành một giải con (cặp t_<mã đội>, bảng theo kdn)
async function kStartN(D,X){
  if(!gmCur(X)){if(gmLive(D)||D.SM.length){toast("Đang có giải khác ở sân.");return}await xApply(D,X,true);await new Promise(r=>setTimeout(r,80));D=derive()}
  const nd={},skip=[],noG=[];
  for(const n of ndL(X)){const Xk=ndX(X,n.k),T=kTeams(D,Xk),kd=kdOf(Xk);if(!T.length)continue;if(!kd.groups){noG.push(n.name);continue}
    const pairs=[],rest={},out={};
    for(const t of T){let a=t.A.pid,b=t.B.pid;const s=(kd.sub||{})[t.code];if(s){if(s.from===t.A.id)a=s.pid;else b=s.pid}
      if(!a||!b){skip.push(t.nm);continue}const id="t_"+t.code;pairs.push({id,a,b,reg:1});
      const [x,y]=kArr(D,Xk,t);if((kd.late||{})[t.code]||(!s&&!(x&&y)))rest[id]=true;if((kd.drop||{})[t.code])out[id]=true}
    const ids=new Set(pairs.map(p=>p.id)),groups=kd.groups.map(g=>g.map(c=>"t_"+c).filter(id=>ids.has(id))),inG=new Set(groups.flat());
    for(const p of pairs)if(!inG.has(p.id)){const g=groups.slice().sort((a,b)=>a.length-b.length)[0];if(g)g.push(p.id)}
    if(groups.some(g=>g.length<2)){toast(`${n.name}: mỗi bảng cần ít nhất 2 cặp. Chia bảng lại nhé.`);return}
    nd[n.k]={pairs,ko:koOut({...koDef(),...koFromX(Xk),n:groups.length,groups,seeds:(kd.seeds||[]).map(c=>"t_"+c).filter(id=>ids.has(id)),gat:kd.at||Date.now(),gby:kd.by||who(),gn:kd.n||1}),rest,out,koGate:true,koGo:false}}
  if(noG.length){toast(`Chưa chia bảng: ${noG.join(", ")}`);return}
  if(!Object.keys(nd).length){toast("Chưa có cặp nào.");return}
  await write(()=>saveCfg({phase:"live",giai:{pairs:[],prizes:[0,0,0],out:{},locked:true,startedAt:Date.now(),cpause:{},nd}}),"Đã bắt đầu tất cả nội dung");
  if(skip.length)toast(`Chưa vào giải (thiếu người): ${skip.join(", ").replace(/&amp;/g,"&")}`);
  if(autoNext())await gFill();
}
// Cặp chưa đủ người được cho nghỉ: đủ người rồi thì tự vào lại (từng nội dung)
function ndAutoRest(D,X){
  for(const k of gNdKeys()){const Xk=ndX(X,k),GD=Xk&&gDeriveK(D,k);if(!GD)continue;const kd=kdOf(Xk),r=GD.G.rest||{},back=[];
    for(const t of kTeams(D,Xk)){const id="t_"+t.code;if(!r[id]||(kd.late||{})[t.code])continue;const [a,b]=kArr(D,Xk,t);if(a&&b&&!kAutoDone.has(id)){kAutoDone.add(id);back.push(id)}}
    if(back.length)setTimeout(async()=>{const o=gNdF;gNdF=k;const R={...(gCur().rest||{})};back.forEach(id=>delete R[id]);await write(()=>saveG({rest:R}));gNdF=o;if(autoNext())await gFill(true)},0)}
}

/* ----- Màn: chip chọn nội dung, tiến độ từng nội dung ----- */
const ndChips=(X,cur,act,all,cnt)=>`<div class="ndchips" role="group" aria-label="Nội dung">${all?`<button data-act="${act}" data-v="" aria-pressed="${!cur}">Tất cả${cnt&&cnt._?` ${cnt._}`:""}</button>`:""}${ndL(X).map(n=>{const c=ndCol(X,n.k);return `<button data-act="${act}" data-v="${esc(n.k)}" aria-pressed="${cur===n.k}"><i style="background:${c[0]}"></i>${esc(n.name)}${cnt&&cnt[n.k]!=null?` ${cnt[n.k]}`:""}</button>`}).join("")}</div>`;
function ndProg(D,X){
  return `<div class="ndprog">${gNdKeys().map(k=>{const GD=gDeriveK(D,k),n=ndOf(X,k);if(!GD||!n)return "";const c=ndCol(X,k),gw=GD.games.filter(g=>!g.ko&&g.st!=="hold"),gd=gw.filter(g=>g.st==="done"||g.st==="wo").length,inKO=GD.gDone&&(!GD.G.koGate||GD.G.koGo);
    const cur=inKO?GD.ko.find(L=>L.some(g=>g.st!=="done"&&g.st!=="wo")):null,F=GD.ko[GD.ko.length-1][0];
    const t=GD.complete?"xong":inKO&&cur?`${cur[0].rn.toLowerCase()} ${cur.filter(g=>g.st==="done"||g.st==="wo").length}/${cur.length}`:GD.gDone&&!inKO?"chờ tạo nhánh":`vòng bảng ${gd}/${gw.length}`;
    return `<span style="border-top-color:${c[0]}"><b style="color:${c[2]}">${esc(n.name)}</b><small>${esc(t)}</small></span>`}).join("")}</div>`;
}
// Nhãn ô sân: nội dung + bảng/vòng
const ndMLb=(D,X,m)=>{const GD=m.nd?gDeriveK(D,m.nd):null;return ndTag(X,m.nd)+(GD?` ${esc(kGrpOf(GD,m))}`:"")};
const ndMNm=(D,m)=>{const GD=m.nd?gDeriveK(D,m.nd):null;return GD?[kPN(D,GD,m.pa),kPN(D,GD,m.pb)]:[g4Nm(D,m.a),g4Nm(D,m.b)]};
// Màn Đang đánh của giải nhiều nội dung
function ndPlayV(D,X){
  ndAutoRest(D,X);
  const seg=["san","bang","nhanh"].includes(kSeg)?kSeg:"san",K=gNdKeys();
  let h=ycBan(D)+`<div class="kseg">${[["san","Sân"],["bang","Bảng"],["nhanh","Nhánh"]].map(([k,l])=>`<button data-act="kseg" data-v="${k}" aria-pressed="${seg===k}">${l}</button>`).join("")}</div>`;
  if(seg==="san"){
    h+=ndProg(D,X);
    const gates=K.filter(k=>{const GD=gDeriveK(D,k);return GD&&GD.gDone&&GD.G.koGate&&!GD.G.koGo});
    for(const k of gates){const GD=gDeriveK(D,k),R0=GD.ko[0];h+=`<div class="kgate"><span class="cap">${ndTag(X,k)} ✓ Xong vòng bảng</span><b>${R0.length*2} cặp vào ${esc(R0[0].rn.toLowerCase())}</b><button class="ball go" data-act="kgo" data-v="${esc(k)}">Tạo nhánh ${esc((ndOf(X,k)||{}).name||"")} ›</button></div>`}
    const nxt=K.map(k=>{const d=ndD(D,k),GD=gDeriveK(D,k);return GD?kNext(d,GD,1).map(g=>({k,g,GD})):[]}).flat();
    const cp=(cfg().giai||{}).cpause||{},scop={lb:m=>ndMLb(D,X,m),nm:m=>ndMNm(D,m),fill:!!nxt.length,cp};
    h+=scBoard(D,scop);const nf=scFree(D,scop);
    if(nxt.length)h+=`<div class="g4nx"><span class="cap">Lượt sau</span><span>${nxt.slice(0,3).map(o=>`${ndTag(X,o.k)} ${kPN(D,o.GD,o.g.x)} – ${kPN(D,o.GD,o.g.y)}`).join("<br>")}</span></div>`;
    h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="m14" aria-label="Thêm việc">⋯</button>${nf&&nxt.length?`<button class="ball go" data-act="scfillall">▶ Tạo trận cho ${nf} sân</button>`:`<button class="ball nv" data-act="gmst" data-v="3">🏁 Hết giờ · sang chốt</button>`}</div>`+scSheet(D);
    const GD=gDerive(D);return h+(GD?kPlaySheets(D,X,GD):"");
  }
  const k=gNdCur();h+=ndChips(X,k,"ndf");
  const sub=kPlayV(D,X,gDerive(D));
  return h+sub.replace(/^[\s\S]*?<\/div>/,"");
}

/* ----- BTC · Đăng ký: chip nội dung, tổng quan cả giải ----- */
let ndRegF={};
function ndRegV(D,X){
  const cur=ndRegF[X.id]&&ndOf(X,ndRegF[X.id])?ndRegF[X.id]:"";
  const cnt={_:""};for(const n of ndL(X)){const T=kTeams(D,ndX(X,n.k));cnt[n.k]=`${T.length}/${+n.max||"∞"}`}
  let h=ndChips(X,cur,"ndrf",true,cnt);
  if(cur)return h+kRegV(D,ndX(X,cur));
  const R=regsOfX(X);
  h+=g2Stat([[ndL(X).length,"Nội dung"],[ndL(X).reduce((a,n)=>a+kTeams(D,ndX(X,n.k)).length,0),"Cặp"],[new Set(R.map(r=>r.pid||r.uid)).size,"Người"]]);
  for(const n of ndL(X)){const Xk=ndX(X,n.k),T=kTeams(D,Xk),kd=kdOf(Xk),bad=T.filter(t=>ndBadCap(D,Xk,t)||kBadDt(D,Xk,t)).length,solo=kSolo(D,Xk).length,c=ndCol(X,n.k);
    const st=kLocked(Xk)?["ĐANG ĐÁNH","b"]:kd.groups&&kd.groups.length?(kd.pub?["ĐÃ CÔNG BỐ","g"]:["ĐÃ CHIA BẢNG","g"]):["CHƯA CHIA BẢNG","y"];
    h+=`<button class="ndbox" data-act="ndrf" data-v="${esc(n.k)}" style="border-left-color:${c[0]}"><span class="h"><b style="color:${c[2]}">${esc(n.name)}</b>${g2Tag(st[0],st[1])}</span><small>${esc(ndSub(n))}</small><small>${T.length} cặp${solo?` · ${solo} người lẻ`:""}${bad?` · <b class="red">${bad} cặp sai nội dung</b>`:""}</small></button>`}
  const multi=new Map();for(const r of R){const key=r.pid||r.uid;if(!key)continue;multi.set(key,(multi.get(key)||[]).concat(ndOfReg(r)))}
  const two=[...multi.entries()].filter(([,L])=>L.length>1);
  if(two.length)h+=`<small class="rule">${two.length} người đăng ký từ 2 nội dung trở lên · app không xếp họ vào 2 sân cùng lúc.</small>`;
  const s=xState(X),ready=ndL(X).every(n=>{const kd=kdOf(ndX(X,n.k));return kd.groups&&kd.groups.length||!kTeams(D,ndX(X,n.k)).length});
  if(s!=="done"&&s!=="cancel")h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="ndpg" data-id="${esc(X.id)}" aria-label="Nội dung">⋯</button>${kLocked(X)?`<button class="ball nv" data-act="gmst" data-v="2">Về Đang đánh ›</button>`:ready?`<button class="ball go" data-act="gmst" data-v="1">Tiếp: Ngày đánh ›</button>`:`<button class="ball" data-act="ndpg" data-id="${esc(X.id)}">Sửa nội dung</button>`}</div>`;
  return h;
}
// Cặp vượt tổng trình của nội dung
const ndBadCap=(D,X,t)=>!!(X&&X.ndCap&&t&&ndLv(D,t.A)+ndLv(D,t.B)>X.ndCap+1e-9);

/* ----- Ngày đánh: check-in theo nội dung, bắt đầu tất cả ----- */
function ndDayV(D,X){
  const live=gmLive(D)||D.SM.length;
  let h=`<section class="g3ck"><span class="cap">Check-in${X.at?` · ${hm(X.at)}`:""}</span><b>${live?"Giải đang đánh":"Đang mở"}</b>
    <div class="ckcnt"><span><b>${new Set(regsOfX(X).filter(r=>r.arrived).map(r=>r.pid||r.uid)).size}<small>/${new Set(regsOfX(X).map(r=>r.pid||r.uid)).size}</small></b><small>ĐÃ TỚI</small></span></div>
    <button class="g3go" data-act="ckopen" data-id="${esc(X.id)}">⌗ MỞ MÃ CHECK-IN</button></section><small class="rule">Một mã cho cả giải · người đánh 2 nội dung check-in 1 lần.</small>`;
  for(const n of ndL(X)){const Xk=ndX(X,n.k),T=kTeams(D,Xk),c=ndCol(X,n.k),full=T.filter(t=>kArr(D,Xk,t).every(Boolean)).length,miss=T.filter(t=>!kArr(D,Xk,t).every(Boolean));
    h+=`<div class="ndbox" style="border-left-color:${c[0]}"><span class="h"><b style="color:${c[2]}">${esc(n.name)}</b>${T.length&&full===T.length?g2Tag("SẴN SÀNG","g"):g2Tag(`${full}/${T.length}`,"y")}</span><small>${full}/${T.length} cặp đủ người${miss.length?` · thiếu ${miss.slice(0,3).map(t=>t.nm).join(", ")}${miss.length>3?"…":""}`:""}</small>
      ${!live&&T.length?`<div class="g3grid c2">${T.map(t=>{const k=kArr(D,Xk,t).filter(Boolean).length;return `<span class="k${k}">${k===2?"✓ ":k===1?"½ ":""}${t.nm}</span>`}).join("")}</div>`:""}</div>`}
  if(live)return h+`<div class="hqcta two">${gmDot()}<button class="ball" data-act="gmst" data-v="2">Về Đang đánh ›</button></div>`;
  return h+`<div class="hqcta two">${gmDot()}<button class="ball go" data-act="ndstart" data-id="${esc(X.id)}">▶ Bắt đầu tất cả nội dung</button></div><small class="rule">Cặp chưa đủ người được cho nghỉ, đủ người thì tự vào lại.</small>`;
}

/* ----- Người chơi: trang giải có nhiều nội dung ----- */
function ndGdPage(D,X){
  const u=authUser,mineIn=k=>u&&(S.regs||[]).find(r=>r.sid===X.id+"~"+k&&r.uid===u.uid&&!r.cancel&&!isHeldOut(r));
  const nMine=ndL(X).filter(n=>mineIn(n.k)).length;
  let h=withX(X,()=>gdHero(D))+`<div class="gdbox"><h3>Nội dung thi đấu</h3><span class="gdnote">Mỗi người đăng ký tối đa ${ndMaxP(X)} nội dung${nMine?` · bạn đã đăng ký ${nMine}`:""}.</span></div>`;
  for(const n of ndL(X)){const Xk=ndX(X,n.k),T=kTeams(D,Xk),c=ndCol(X,n.k),max=+n.max||0,full=max&&T.length>=max,me=mineIn(n.k);
    h+=`<div class="ndbox" style="border-left-color:${c[0]}"><span class="h"><b style="color:${c[2]}">${esc(n.name)}</b></span><small>${esc(ndSub(n))}${max?` · ${full?"đã đủ":`còn ${max-T.length}/${max} chỗ`}`:""}</small>
      ${me?`<button class="ndok" data-act="ndgo" data-v="${esc(n.k)}">✓ Bạn đã đăng ký${capMate(me)?` · với ${esc(capName(D,capMate(me)))}`:""} · xem vé ›</button>`
        :xOpen(X)&&withX(X,()=>!regClosed())?`<button class="line wide" data-act="ndgo" data-v="${esc(n.k)}"${nMine>=ndMaxP(X)?" disabled":""}>${full?"Vào danh sách chờ":"Đăng ký nội dung này"}</button>`:""}</div>`;
}
  h+=withX(X,()=>gdFacts(D,regList(D))+gdPlace()+gdContact()+(X.note?`<div class="gdbox"><h3>Giới thiệu</h3><span class="gdnote">${esc(X.note)}</span></div>`:"")+gdPolicy(D));
  return withX(X,()=>gdShell(D,h,""));
}
// Kiểm tra trước khi đăng ký một nội dung: tối đa mấy nội dung, tổng trình của cặp
function ndRegCheck(D,X,pid,matePid){
  if(!X||!X._nd)return null;const B=X._X,u=authUser;
  const mine=ndL(B).filter(n=>n.k!==X._nd&&u&&(S.regs||[]).some(r=>r.sid===B.id+"~"+n.k&&r.uid===u.uid&&!r.cancel&&!isHeldOut(r))).length;
  if(mine>=ndMaxP(B))return `Mỗi người đăng ký tối đa ${ndMaxP(B)} nội dung.`;
  if(X.ndCap&&pid&&matePid){const s=ndLv(D,{pid})+ndLv(D,{pid:matePid});if(s>X.ndCap+1e-9)return `Tổng trình hai bạn ${r2(s)}, quá ${X.ndCap} của nội dung này. Chọn đồng đội khác.`}
  return null;
}

/* ----- BTC: trang Nội dung (thêm, sửa, sân ưu tiên) ----- */
let ndPgId=null,ndEd=null;
function ndPage(D,X){
  mxDr({t:"Nội dung thi đấu",back:"ndpgx",sub:esc(xName(X))});
  const L=ndL(X),lk=kLocked(X);
  let h=L.length?"":`<div class="gmempty"><b>Giải này đang có 1 nội dung</b><span>Thêm nội dung để chạy song song: đôi open, đôi nữ 4.2, đôi nam 5.5… Mỗi nội dung có danh sách đăng ký, bảng và nhánh riêng, dùng chung sân.</span></div>`;
  for(const n of L){const c=ndCol(X,n.k),N=regsOfX(X).filter(r=>ndOfReg(r)===n.k).length;
    h+=`<button class="ndbox" data-act="nded" data-v="${esc(n.k)}" style="border-left-color:${c[0]}"><span class="h"><b style="color:${c[2]}">${esc(n.name)}</b><span aria-hidden="true">›</span></span><small>${esc(ndSub(n))}</small><small>${N} người đăng ký${(n.courts||[]).length?` · ưu tiên sân ${n.courts.map(x=>cName(+x)).join(", ")}`:""}</small></button>`}
  if(!lk)h+=`<button class="ndadd" data-act="nded" data-v="+">＋ Thêm nội dung</button>`;
  if(L.length)h+=`<div class="gmstp"><span><b>Mỗi người tối đa</b><small>Số nội dung một người được đăng ký</small></span><span class="stepper big"><button data-act="ndmax" data-d="-1" aria-label="Bớt">−</button><b class="num">${ndMaxP(X)}</b><button data-act="ndmax" data-d="1" aria-label="Thêm">＋</button></span></div>
    <small class="rule">Sân ưu tiên: sân đó lấy trận của nội dung này trước, hết trận chờ thì lấy nội dung khác. Không chọn sân nào thì nội dung dùng sân nào trống.</small>`;
  return h+ndEdSheet(D,X);
}
function ndEdSheet(D,X){
  if(!ndEd)return "";const n=ndEd,cs=Math.max(1,+X.courts||+D.c.courts||1),isNew=!ndOf(X,n.k);
  const chip=(k,v,l)=>`<button data-act="ndset" data-k="${k}" data-v="${v}" aria-pressed="${String(n[k]??"")===String(v)}">${l}</button>`;
  const stp=(k,l,s,mn,mx,step=1)=>`<div class="gmstp"><span><b>${l}</b>${s?`<small>${s}</small>`:""}</span><span class="stepper big"><button data-act="ndstp" data-k="${k}" data-d="${-step}" data-mn="${mn}" data-mx="${mx}" aria-label="Bớt">−</button><b class="num">${k==="cap"?(n.cap?n.cap:"—"):n[k]}</b><button data-act="ndstp" data-k="${k}" data-d="${step}" data-mn="${mn}" data-mx="${mx}" aria-label="Thêm">＋</button></span></div>`;
  return `<div class="mxdim" data-act="ndedx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Nội dung"><span class="grab"></span><b class="mxh">${isNew?"Thêm nội dung":esc(n.name||"Nội dung")}</b>
    <label class="fld"><span class="lbl">Tên nội dung</span><input id="nd-name" data-draft="nd-name" maxlength="30" value="${esc(val("nd-name",n.name||""))}" placeholder="Đôi nữ 4.2"></label>
    <span class="gmlb">Loại đôi</span><div class="g2fl wrap">${chip("dt","free","Open")}${chip("dt","MM","Đôi nam")}${chip("dt","FF","Đôi nữ")}${chip("dt","mix","Nam nữ")}</div>
    ${stp("cap","Tổng trình 2 người tối đa","Bấm − về — là không giới hạn",0,16,0.1)}
    ${stp("max","Số cặp tối đa","",2,64)}${stp("koN","Số bảng",`Mỗi bảng ~${Math.max(2,Math.round((+n.max||8)/Math.max(1,+n.koN||1)))} cặp, lấy 2 cặp mỗi bảng`,1,16)}
    <label class="fld"><span class="lbl">Lệ phí mỗi người (k)</span><input id="nd-fee" data-draft="nd-fee" type="number" min="0" inputmode="numeric" value="${esc(val("nd-fee",n.fee!=null?String(n.fee):""))}"></label>
    <span class="gmlb">Sân ưu tiên</span><div class="g2fl wrap">${Array.from({length:cs},(_,i)=>i+1).map(c=>`<button data-act="ndcourt" data-v="${c}" aria-pressed="${(n.courts||[]).map(Number).includes(c)}">Sân ${esc(cName(c))}</button>`).join("")}</div>
    ${errs.nd?`<p class="err">${esc(errs.nd)}</p>`:""}
    <div class="two">${isNew?"":`<button class="btn-line" data-act="nddel">${armed("nddel:"+n.k)?"Bấm lần nữa để xoá":"Xoá nội dung"}</button>`}<button class="ball go" data-act="ndok">✓ Lưu nội dung</button></div></div>`;
}
const ndSaveL=(X,L,msg)=>write(()=>db.collection("sched").doc(X.id).update({nds:L}),msg);
async function ndAct(act,b){
  if(act==="ndaw")return ndAwAct(act,b);
  const v=b.dataset.v,D=derive(),X0=ndPgId?schedById(ndPgId):(routeX?schedById(routeX):xCur()),X=ndB(X0);
  if(act==="ndf"){gNdF=v||null;render();return true}
  if(act==="ndrf"){const id=X?X.id:"";ndRegF[id]=v||"";kSh=null;kPg=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ndgo"){if(!X)return true;go("app",{tab:"dk",x:X.id+"~"+v});return true}
  if(act==="ndstart"){if(!X)return true;await kStartN(D,X);return true}
  if(!canWrite||!X)return false;
  if(act==="ndpg"){ndPgId=b.dataset.id||X.id;ndEd=null;kSh=null;gmMore=false;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ndpgx"){ndPgId=null;ndEd=null;render();return true}
  if(act==="nded"){if(v==="+"){const ks=new Set(ndL(X).map(n=>n.k));let i=1;while(ks.has("n"+i))i++;ndEd={k:"n"+i,name:"",dt:"free",cap:0,max:16,koN:4,fee:+X.phi||0,courts:[]}}else{const n=ndOf(X,v);if(!n)return true;ndEd={...n,courts:[...(n.courts||[])]}}
    delete drafts["nd-name"];delete drafts["nd-fee"];delete errs.nd;render();return true}
  if(act==="ndedx"){ndEd=null;render();return true}
  if(act==="ndset"&&ndEd){ndEd[b.dataset.k]=v;render();return true}
  if(act==="ndstp"&&ndEd){const k=b.dataset.k,d=+b.dataset.d,mn=+b.dataset.mn,mx=+b.dataset.mx;let x=Math.round(((+ndEd[k]||0)+d)*10)/10;
    if(k==="cap"&&!ndEd.cap&&d>0)x=4.0;if(k==="cap"&&x<2)x=0;ndEd[k]=Math.max(mn,Math.min(mx,x));render();return true}
  if(act==="ndcourt"&&ndEd){const c=+v,L=(ndEd.courts||[]).map(Number);ndEd.courts=L.includes(c)?L.filter(x=>x!==c):[...L,c].sort((a,b)=>a-b);render();return true}
  if(act==="ndok"&&ndEd){const name=String(val("nd-name",ndEd.name||"")).trim().slice(0,30);if(!name){errs.nd="Đặt tên cho nội dung.";render();return true}
    const fee=Math.max(0,+val("nd-fee",ndEd.fee!=null?String(ndEd.fee):"0")||0),n={k:ndEd.k,name,dt:ndEd.dt||"free",cap:+ndEd.cap||0,max:+ndEd.max||16,koN:+ndEd.koN||4,fee,courts:ndEd.courts||[]};
    const L=ndL(X).slice(),i=L.findIndex(x=>x.k===n.k);if(i>=0)L[i]=n;else L.push(n);
    ndEd=null;delete drafts["nd-name"];delete drafts["nd-fee"];await ndSaveL(X,L,"Đã lưu nội dung");return true}
  if(act==="nddel"&&ndEd){const k=ndEd.k;if(regsOfX(X).some(r=>ndOfReg(r)===k)){errs.nd="Nội dung đã có người đăng ký, không xoá được.";render();return true}
    if(!armOr("nddel:"+k))return true;ndEd=null;await ndSaveL(X,ndL(X).filter(n=>n.k!==k),"Đã xoá nội dung");return true}
  if(act==="ndmax"){const m=Math.max(1,Math.min(ndL(X).length||1,ndMaxP(X)+(+b.dataset.d||0)));await write(()=>db.collection("sched").doc(X.id).update({ndMax:m}));return true}
  return false;
}

/* ----- Chốt: trao giải lần lượt từng nội dung ----- */
function ndTop(D,k){const GD=gDeriveK(D,k);if(!GD)return [];const T=GD.table.filter(t=>!t.out),L=["Vô địch","Á quân","Hạng ba","Hạng ba"];
  return GD.complete?T.slice(0,GD.isKO&&!GD.third?4:3).map((t,i)=>({lb:L[i],p:t.p})):[]}
function ndPodium(D,X){
  const aw=cfg().award||{};
  return gNdKeys().map(k=>{const n=ndOf(X,k),c=ndCol(X,k),T=ndTop(D,k),GD=gDeriveK(D,k),on=!!aw["nd:"+k];if(!n)return "";
    const st=T.length?(on?g2Tag("ĐÃ TRAO","g"):""):g2Tag(D.playing.some(m=>m.nd===k)?"ĐANG ĐÁNH":"CHƯA XONG","b");
    return `<div class="ndbox" style="border-left-color:${c[0]}"><span class="h"><b style="color:${c[2]}">${esc(n.name)}</b>${st}</span>${T.length?`<small>${T.map(o=>`${["🥇","🥈","🥉","🥉"][T.indexOf(o)]} ${pairNm(D,o.p)}`).join(" · ")}</small>
      <div class="two"><button class="btn-line" data-act="ndaw" data-v="${esc(k)}" data-r="1">🔊 Đọc</button><button class="ball go" data-act="ndaw" data-v="${esc(k)}">🏆 ${on?"Trao lại":"Trao giải"} ${esc(n.name)}</button></div>`:`<small>${GD?`${GD.resolved}/${GD.total} trận xong`:""}</small>`}</div>`}).join("")+`<small class="rule">Xong cả các nội dung thì bấm Tiếp để thu nốt tiền.</small>`;
}
async function ndAwAct(act,b){
  if(act!=="ndaw")return false;const D=derive(),X=xCur(),k=b.dataset.v,n=ndOf(X,k),T=ndTop(D,k);if(!n||!T.length)return true;
  speak(`${n.name}. ${T.map(o=>`${o.lb}: ${pairTx(D,o.p).replace(/&/g,"và")}`).join(". ")}. Xin chúc mừng các vận động viên.`,"","ndaw:"+k,true);
  if(!b.dataset.r&&canWrite)await write(()=>saveCfg({award:{...(cfg().award||{}),["nd:"+k]:Date.now()}}));
  return true;
}
