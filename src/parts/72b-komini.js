/* ---------- Chia bảng → Knockout · Mini App (Quản lý) theo canvas trang kb ----------
   Trước ngày đánh: cặp = 2 đăng ký cùng reg.team (mã đội = team). Ghép cặp, hạt giống, chia bảng lưu trên giải (sched.kd):
   kd = {groups:[{p:[mã đội…]}], seeds:[mã…], seedSel:[mã…], noSeed, at, by, n, pub, sub:{mã:{from,pid}}, late:{mã:1}, drop:{mã:1}}.
   Bấm "Bắt đầu vòng bảng": tạo cặp trong giải đang chạy với id "t_"+mã đội, chia bảng theo kd, rồi tạo lịch như cũ. */
let kPg=null,kSh=null,kSel=null,kMode="lv",kAvoid=true,kPrev=null,kDraw=null,kFix=null,kSeg="san";
const kOn=X=>!!(X&&X.fmt==="giai"&&X.ko);
// Đã bắt đầu đánh giải này: bảng chốt, không đổi được
const kLocked=X=>!!(X&&((cfg().schedId===X.id&&(cfg().giai||{}).locked&&cfg().phase==="live")||X.st==="done"));
const kdOf=X=>{const k=(X&&X.kd)||{};return {...k,groups:Array.isArray(k.groups)?k.groups.map(g=>Array.isArray(g)?g:(g&&g.p)||[]):null}};
const kdOut=kd=>({...kd,groups:kd.groups?kd.groups.map(p=>({p})):null});
const saveKd=(X,patch,msg)=>write(()=>db.collection("sched").doc(X.id).update({kd:kdOut({...kdOf(X),...patch})}),msg);
// Đội đã đủ 2 người (theo đăng ký)
function kTeams(D,X){
  return withX(X,()=>{const R=regList(D),seen=new Set(),T=[];
    for(const x of R.conf){if(seen.has(x.id))continue;const m=capMate(x);seen.add(x.id);if(!m)continue;seen.add(m.id);
      T.push({code:x.team,A:x,B:m,nm:`${esc(xbName(D,x))} &amp; ${esc(xbName(D,m))}`,r:(xbLv(D,x)+xbLv(D,m))/2})}
    return T})}
const kSolo=(D,X)=>withX(X,()=>regList(D).conf.filter(x=>!capMate(x)));
const kBadDt=(D,X,t)=>{const dt=X.dt;if(!dt||dt==="free")return false;const gs=[xbG(D,t.A),xbG(D,t.B)].sort().join("");return dt==="mix"?gs!=="FM":dt==="MM"?gs!=="MM":gs!=="FF"};
const kN=X=>Math.max(1,+X.koN||4);
const kTeamOf=(T,code)=>T.find(t=>t.code===code);
// Lưới bảng (dùng cho chia xong, bốc, tự xếp)
function kGrid(T,groups,seeds,o={}){
  const ss=new Set(seeds||[]);
  return `<div class="kbg">${groups.map((g,gx)=>`<div class="kbgb${o.drop&&kSel?" can":""}"${o.drop&&kSel?` data-act="k9cput" data-v="${gx}" role="button"`:""}><span class="h"><b>BẢNG ${KOG[gx]}</b>${o.cap?`<small>${g.length}/${o.cap}</small>`:""}</span>${g.map(c=>{const t=kTeamOf(T,c);if(!t)return "";const on=kSel===c;
    return `<button class="kbgp${on?" on":""}${o.hl===c?" hl":""}" data-act="${o.act||"k10sw"}" data-v="${esc(c)}">${ss.has(c)?"★ ":""}${t.nm}</button>`}).join("")}${o.drop&&kSel&&(!o.cap||g.length<o.cap)?`<span class="put">＋ Đưa vào đây</span>`:""}</div>`).join("")}</div>`;
}
// Chặng Đăng ký của giải chia bảng (K6 / K10)
function kRegV(D,X){
  const T=kTeams(D,X),solo=kSolo(D,X),kd=kdOf(X),s=xState(X),po=withX(X,()=>payOn()),R=withX(X,()=>regList(D));
  const paid=R.all.filter(x=>x.pay==="ok").length,max=Math.round((+X.max||0)/2);
  let h=g2Stat([[`${T.length}${max?`/${max}`:""}`,"Cặp"],[solo.length,"Người lẻ",solo.length?"#b45309":""],[paid,"Đã trả","#15803d"]]);
  // Đã chia bảng: xem, đổi chỗ, bốc lại, công bố
  if(kd.groups&&kd.groups.length){
    const inG=new Set(kd.groups.flat()),rest=T.filter(t=>!inG.has(t.code)),N=kd.groups.length,games=kd.groups.reduce((a,g)=>a+g.length*(g.length-1)/2,0);
    const t0=X.at||0,mins=Math.ceil(games/Math.max(1,+X.courts||1))*GSLOT;
    const lk=kLocked(X);
    h=gmNextBox(lk?{t:"Bảng đã chốt",s:"Đã bắt đầu đánh · không đổi bảng được nữa"}:kd.pub?{t:"Đã công bố · chờ ngày đánh",s:`${t0?`${dowVN(t0)} ${dmy(t0)} ${hm(t0)} · `:""}mở check-in khi tới giờ`}:{t:`Đã chia ${N} bảng`,s:"Bấm ⋯ để công bố vào nhóm hoặc bốc lại"},false)+(lk?`<div class="klock">🔒 <b>Bảng đã chốt</b> lúc bắt đầu vòng bảng${(cfg().giai||{}).startedAt?` ${hm(cfg().giai.startedAt)}`:""} · không đổi được nữa</div>`:"")+kGrid(T,kd.groups,kd.seeds,lk?{act:"klocked"}:{});
    if(rest.length&&!lk)h+=`<span class="gmlb">Chưa xếp bảng · ${rest.length} cặp</span><div class="g2fl">${rest.map(t=>`<button data-act="k10sw" data-v="${esc(t.code)}" aria-pressed="${kSel===t.code}">${t.nm}</button>`).join("")}</div>`;
    if(!lk)h+=`<small class="rule">Đổi chỗ 2 cặp: chạm cặp này rồi chạm cặp kia.</small>`;
    if(s!=="done"&&s!=="cancel")h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="more" aria-label="Thêm việc">⋯</button>${lk?`<button class="ball nv" data-act="gmst" data-v="2">Về Đang đánh ›</button>`:`<button class="ball go" data-act="gmst" data-v="1">Tiếp: Ngày đánh ›</button>`}</div>`;
    return h+withX(X,()=>kSheets(D,X,T)+g2Sheets(D,X,R));
  }
  if(solo.length)h+=gmNextBox({t:`${solo.length} người chưa có cặp`,s:"Ghép bằng bốc thăm, hoặc chạm để ghép tay"},false);
  else if(T.length>=4&&!(s==="open"&&xOpen(X)))h+=gmNextBox({t:`Chia ${kN(X)} bảng · ${T.length} cặp`,s:"Bốc thăm, chia đều trình độ hoặc tự xếp"},false);
  else if(s!=="cancel"&&s!=="done")h+=gmNextBox(gmNext(D,X),false);
  const unpaidT=T.filter(t=>po&&(t.A.pay!=="ok"||t.B.pay!=="ok")),bad=T.filter(t=>kBadDt(D,X,t));
  const fl=[["cap",`Cặp ${T.length}`],["le",`Người lẻ ${solo.length}`],["chua",`Chưa trả ${unpaidT.length}`,po],["sai",`Sai nội dung ${bad.length}`,X.dt&&X.dt!=="free"]].filter(f=>f[2]!==false);
  if(!fl.some(f=>f[0]===xbFl))xbFl="cap";
  h+=`<div class="g2fl" role="group" aria-label="Lọc">${fl.map(([k,l])=>`<button data-act="xbfl" data-v="${k}" aria-pressed="${xbFl===k}">${l}</button>`).join("")}</div>`;
  const row=t=>{const pa=t.A.pid&&D.pmap.get(t.A.pid),pb=t.B.pid&&D.pmap.get(t.B.pid),gs=[xbG(D,t.A),xbG(D,t.B)].map(g=>g==="F"?"nữ":"nam").join(" "),pd=t.A.pay==="ok"&&t.B.pay==="ok";
    return `<button class="g2p" data-act="xbsel" data-id="${esc(t.A.id)}"><span class="g2av2">${av(pa||{name:xbName(D,t.A)},"sm",1)}${av(pb||{name:xbName(D,t.B)},"sm",1)}</span><span class="t"><b>${t.nm}</b><small>${esc(gs)} · ${r2(t.r)}${po&&pd?" · đã trả":""}</small></span>${kBadDt(D,X,t)?g2Tag("SAI NỘI DUNG","r"):po&&!pd?g2Tag("CHƯA TRẢ","y"):""}</button>`};
  const L=xbFl==="le"?solo.map(x=>{const p=x.pid&&D.pmap.get(x.pid);return `<button class="g2p" data-act="xbsel" data-id="${esc(x.id)}">${av(p||{name:xbName(D,x)},"sm",1)}<span class="t"><b>${esc(xbName(D,x))}</b><small>${xbG(D,x)==="F"?"nữ":"nam"} · ${r2(xbLv(D,x))}</small></span>${g2Tag("LẺ","y")}</button>`})
    :(xbFl==="chua"?unpaidT:xbFl==="sai"?bad:T).map(row);
  h+=`<div class="g2list">${L.join("")||`<p class="rule">Không có ai trong mục này.</p>`}</div>`;
  let main="";
  if(solo.length)main=`<button class="ball go" data-act="ksh" data-v="pair">Ghép cặp cho ${solo.length} người lẻ</button>`;
  else if(s==="draft"||s==="plan")main=`<button class="ball go" data-act="xopen" data-id="${esc(X.id)}">Mở đăng ký</button>`;
  else if(s==="open"&&xOpen(X))main=`<button class="ball go" data-act="regshare" data-id="${esc(X.id)}">📣 Gửi nhắc vào nhóm</button>`;
  else if(T.length>=4)main=`<button class="ball go" data-act="ksh" data-v="chia">▦ Chia bảng</button>`;
  if(s!=="done"&&s!=="cancel")h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="more" aria-label="Thêm việc">⋯</button>${main}</div>`;
  return h+withX(X,()=>kSheets(D,X,T)+g2Sheets(D,X,R));
}
// Bảng trượt: ⋯, ghép cặp, chia bảng thế nào
function kSheets(D,X,T){
  const it=(i,t,s,a,v,red)=>`<button class="gmli" data-act="${a}"${v!=null?` data-v="${esc(v)}"`:""} data-id="${esc(X.id)}"><i>${i}</i><span class="t"><b${red?` class="red"`:""}>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`;
  const sh=(t,b)=>`<div class="mxdim" data-act="kshx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="${esc(t)}"><span class="grab"></span><b class="mxh">${t}</b>${b}</div>`;
  if(kSh==="more"){const s=xState(X);return sh("Thêm việc",it("＋","Thêm cặp","Ghi tay cặp đăng ký ngoài app","gmxa")+it("👥","Mời từ CLB","Gửi tin cho người chưa đăng ký","xbshare")+it("★","Hạt giống",`${kN(X)} cặp mạnh tách ${kN(X)} bảng`,"kpg","k8")+(kdOf(X).groups&&kdOf(X).groups.length?it("📣",kdOf(X).pub?"Công bố lại vào nhóm":"Công bố vào nhóm","Gửi danh sách bảng vào nhóm Zalo","k10pub")+(kLocked(X)?"":it("🎲","Bốc lại","Chia bảng lại từ đầu","ksh","chia")+it("⇄","Đổi chỗ 2 cặp","Chạm cặp này rồi chạm cặp kia trong bảng","kshx")):it("▦","Chia bảng","Bốc thăm, chia đều hoặc tự xếp","ksh","chia"))
    +(xOpen(X)?it("🔒",armed("xbclose:"+X.id)?"Bấm lần nữa để đóng":"Đóng đăng ký","Không nhận thêm cặp","xbclose"):"")+it("✎","Sửa giải","Ngày, sân, thể thức, lệ phí","gmxe")+it("🔊","Loa · câu đọc","Tự đọc, sửa câu đọc của giải này","lpg")+(s!=="cancel"&&s!=="done"&&s!=="live"?it("✕",armed("xcancel:"+X.id)?"Bấm lần nữa để huỷ giải":"Huỷ giải","Báo cho mọi người đã đăng ký","xcancel",null,1):""))}
  if(kSh==="pair"){const n=kSolo(D,X).length;return sh(`Ghép cặp cho ${n} người lẻ`,it("🎲","Bốc thăm ghép","App ghép theo trình độ hoặc nam với nữ","kpg","k7")+it("✋","Tự ghép","Chạm 2 người để thành một cặp","kpg","k7b"))}
  if(kSh==="chia")return sh("Chia bảng thế nào?",it("🎲","Bốc thăm","Chiếu lên cho mọi người xem, hạt giống tách bảng","kpg","k9d")+it("⚖","App chia đều trình độ","Mỗi bảng có mạnh có yếu, xong ngay","k9bal")+it("✋","Tự xếp","BTC chọn cặp nào vào bảng nào","kpg","k9c"));
  return "";
}
// Trang con ở chặng Đăng ký (K7, K7b, K8, K9, K9c)
function kPage(D,X){
  const T=kTeams(D,X),nm=esc(xName(X)),sub=x=>mxDr({...x,sub:x.sub||nm});
  if(kPg==="k7"){sub({t:"Ghép cặp",back:"kpgx"});const S0=kSolo(D,X);if(!kPrev)kPrev=kPair(D,X,S0);
    const odd=S0.length%2;
    return `<small class="rule">${S0.length} người lẻ${odd?` · thiếu 1 người: thêm từ CLB để đủ cặp`:` = ${S0.length/2} cặp`}.</small>`
      +gsLb("Ghép theo")+`<div class="gmchips c3">${[["lv","Trình độ cân nhau"],["mf","Nam với nữ"],["btc","BTC tự chọn"]].map(([k,l])=>`<button class="gmchip${kMode===k?" on":""}" data-act="k7m" data-v="${k}">${l}</button>`).join("")}</div>`
      +`<div class="gssw"><span>Tránh ghép lại cặp giải trước</span><button class="xsw${kAvoid?" on":""}" data-act="k7a" role="switch" aria-checked="${kAvoid}"><i></i></button></div>`
      +gsLb("Xem trước")+`<div class="g2list">${kPrev.map(([a,b])=>{const pa=a.pid&&D.pmap.get(a.pid),pb=b.pid&&D.pmap.get(b.pid),la=xbLv(D,a),lb=xbLv(D,b);return `<div class="g2p"><span class="g2av2">${av(pa||{name:xbName(D,a)},"sm",1)}${av(pb||{name:xbName(D,b)},"sm",1)}</span><span class="t"><b>${esc(xbName(D,a))} &amp; ${esc(xbName(D,b))}</b><small>${r2(la)} + ${r2(lb)} = ${r2((la+lb)/2)}</small></span></div>`}).join("")||`<p class="rule">Chưa đủ người để ghép.</p>`}</div>`
      +(odd?`<button class="g2new" data-act="gmxa">＋ Thêm người từ CLB</button>`:"")
      +`<div class="hqcta two"><button class="btn-line" data-act="k7r">🎲 Bốc lại</button><button class="ball go" data-act="k7ok" ${kPrev.length?"":"disabled"}>✓ Giữ ${kPrev.length} cặp này</button></div>`}
  if(kPg==="k7b"){sub({t:"Tự ghép cặp",back:"kpgx"});const S0=kSolo(D,X);
    return `<small class="rule">Chạm 2 người để thành một cặp. Chạm ✕ để tách.</small>`
      +(T.length?gsLb("Đã ghép")+`<div class="g2list">${T.map(t=>`<div class="g2p"><span class="t"><b>${t.nm}</b><small>${r2(xbLv(D,t.A))} + ${r2(xbLv(D,t.B))}</small></span><button class="btn-line sm" data-act="k7bx" data-id="${esc(t.A.id)}" aria-label="Tách">✕</button></div>`).join("")}</div>`:"")
      +gsLb(`Chưa có cặp · ${S0.length} người`)+`<div class="g2list">${S0.map(x=>{const p=x.pid&&D.pmap.get(x.pid),on=kSel===x.id;return `<button class="g2p${on?" sel":""}" data-act="k7bp" data-id="${esc(x.id)}">${av(p||{name:xbName(D,x)},"sm",1)}<span class="t"><b>${esc(xbName(D,x))}</b><small>${xbG(D,x)==="F"?"nữ":"nam"} · ${r2(xbLv(D,x))}</small></span>${on?`<b class="g2on">ĐANG CHỌN</b>`:""}</button>`}).join("")||`<p class="rule">Ai cũng đã có cặp.</p>`}</div>`
      +`<button class="g2new" data-act="gmxa">＋ Thêm người từ CLB</button><div class="hqcta"><button class="ball go" data-act="kpgx">✓ Xong · ${T.length} cặp</button></div>`}
  if(kPg==="k8"){sub({t:"Hạt giống",back:"kpgx"});const N=kN(X),kd=kdOf(X),L=T.slice().sort((a,b)=>b.r-a.r),sel=kd.noSeed?[]:(kd.seedSel&&kd.seedSel.length?kd.seedSel:L.slice(0,N).map(t=>t.code));
    const rank=new Map(L.filter(t=>sel.includes(t.code)).map((t,i)=>[t.code,i+1]));
    return `<small class="rule">Hạt giống không chung bảng nhau. App gợi ý theo rating, chạm để đổi.</small><div class="g2list">${L.map(t=>{const k=rank.get(t.code);return `<button class="g2p" data-act="k8t" data-v="${esc(t.code)}"><span class="t"><b>${t.nm}</b><small>${r2(t.r)}</small></span>${k?g2Tag(`★ HG ${k}`,"b"):`<span class="g2add">＋ Chọn</span>`}</button>`}).join("")}</div>
      <div class="hqcta two"><button class="btn-line" data-act="k8no">Không dùng hạt giống</button><button class="ball go" data-act="k8go">Tiếp: bốc chia bảng ›</button></div>`}
  if(kPg==="k9d"){mxDr({t:"Bốc chia bảng",back:"kpgx",sub:"Loa đọc tên từng cặp"});if(!kDraw)kDraw=kDrawMake(D,X,T);
    const k=kDraw.k,G=kDraw.groups.map(()=>[]);kDraw.order.slice(0,k).forEach(o=>G[o.g].push(o.c));const cur=k?kDraw.order[k-1]:null,ct=cur&&kTeamOf(T,cur.c);
    return `<section class="kbdraw"><span class="cap">Lượt ${k}/${kDraw.order.length}</span>${ct?`<b class="n">${ct.nm}</b><span>vào</span><b class="g">BẢNG ${KOG[cur.g]}</b>`:`<b class="n">Bấm Bốc tiếp để bắt đầu</b>`}</section>`+kGrid(T,G,kDraw.seeds,{act:"kx",hl:cur&&cur.c})
      +`<div class="hqcta two"><button class="btn-line" data-act="k9all">⏩ Bốc hết</button><button class="ball go" data-act="k9next">${k<kDraw.order.length?"🎲 Bốc tiếp":"✓ Xong"}</button></div>`}
  if(kPg==="k9c"){sub({t:"Tự xếp bảng",back:"kpgx"});const N=kN(X),cap=Math.ceil(T.length/N);if(!kFix){const kd=kdOf(X);kFix=kd.groups&&kd.groups.length===N?kd.groups.map(g=>g.slice()):Array.from({length:N},()=>[]);
      if(!kFix.flat().length){const sd=(kd.seedSel&&kd.seedSel.length?kd.seedSel:T.slice().sort((a,b)=>b.r-a.r).slice(0,N).map(t=>t.code));sd.slice(0,N).forEach((c,i)=>kFix[i].push(c))}}
    const inG=new Set(kFix.flat()),rest=T.filter(t=>!inG.has(t.code));
    return `<small class="rule">Chạm một cặp bên dưới, rồi chạm bảng muốn đưa vào. Chạm tên trong bảng để bỏ ra.</small>`+kGrid(T,kFix,kdOf(X).seedSel||[],{act:"k9cout",drop:1,cap})
      +gsLb(`Chưa xếp · ${rest.length} cặp`)+`<div class="g2fl wrap">${rest.map(t=>`<button data-act="k9cpick" data-v="${esc(t.code)}" aria-pressed="${kSel===t.code}">${t.nm}</button>`).join("")||`<small class="rule">Đã xếp hết.</small>`}</div>
      <div class="hqcta two"><button class="btn-line" data-act="k9cauto">⚖ Xếp nốt giúp tôi</button><button class="ball go" data-act="k9cok">✓ Xong</button></div>`}
  return null;
}
// Ghép người lẻ: theo trình (mạnh với yếu) hoặc nam với nữ; tránh cặp đã từng ghép
function kPair(D,X,S0){
  const old=new Set();if(kAvoid)for(const r of (S.regs||[]))if(r.sid!==X.id&&r.team&&r.pid){const m=(S.regs||[]).find(z=>z.sid===r.sid&&z.team===r.team&&z.id!==r.id);if(m&&m.pid)old.add([r.pid,m.pid].sort().join("|"))}
  const lv=x=>xbLv(D,x)+(Math.random()-.5)*.3,P=[];
  if(kMode==="mf"){const M=S0.filter(x=>xbG(D,x)!=="F").sort((a,b)=>lv(b)-lv(a)),F=S0.filter(x=>xbG(D,x)==="F").sort((a,b)=>lv(a)-lv(b));
    while(M.length&&F.length)P.push([M.shift(),F.shift()]);const R=[...M,...F].sort((a,b)=>lv(b)-lv(a));while(R.length>1)P.push([R.shift(),R.pop()])}
  else{const L=S0.slice().sort((a,b)=>lv(b)-lv(a));while(L.length>1)P.push([L.shift(),L.pop()])}
  // Tránh ghép lại: đổi người với cặp kế bên
  for(let i=0;i<P.length;i++){const k=[P[i][0].pid,P[i][1].pid].sort().join("|");if(old.has(k)&&P[i+1]){const t=P[i][1];P[i][1]=P[i+1][1];P[i+1][1]=t}}
  return P;
}
// Bốc chia bảng: hạt giống trước (mỗi bảng 1), rồi từng lượt theo trình, mỗi lượt xáo bảng
function kDrawMake(D,X,T){
  const N=kN(X),kd=kdOf(X),L=T.slice().sort((a,b)=>b.r-a.r),seeds=kd.noSeed?[]:(kd.seedSel&&kd.seedSel.length?kd.seedSel:L.slice(0,N).map(t=>t.code)).filter(c=>kTeamOf(T,c)).slice(0,N);
  const G=Array.from({length:N},()=>[]),order=[];seeds.forEach((c,i)=>{G[i].push(c);order.push({c,g:i})});
  const R=L.filter(t=>!seeds.includes(t.code));
  for(let i=0;i<R.length;i+=N){const pot=gbShuffle(R.slice(i,i+N)),ord=gbShuffle([...Array(N).keys()]).sort((a,b)=>G[a].length-G[b].length);pot.forEach((t,j)=>{G[ord[j]].push(t.code);order.push({c:t.code,g:ord[j]})})}
  return {groups:G,order,seeds,k:0};
}
function kBal(D,X,T){const N=kN(X),L=T.slice().sort((a,b)=>b.r-a.r),G=Array.from({length:N},()=>[]);L.forEach((t,i)=>{const r=Math.floor(i/N),k=i%N;G[r%2?N-1-k:k].push(t.code)});return G}
const kGroupText=(D,X,T,groups)=>[`🏆 ${xName(X)} · chia bảng`,...groups.map((g,gx)=>`BẢNG ${KOG[gx]}: ${g.map(c=>{const t=kTeamOf(T,c);return t?t.nm.replace(/&amp;/g,"&"):""}).filter(Boolean).join(" · ")}`),`Xem lịch từng trận trong Mini App: ${miniLink(CID,X.id)}`].join("\n");
async function kAct(act,b){
  const D=derive(),v=b.dataset.v,id=b.dataset.id,X=routeX?schedById(routeX):xCur();if(!X)return false;
  const T=()=>kTeams(D,X),top=()=>{try{scrollTo({top:0})}catch(e){}};
  if(act==="ksh"){kSh=v;render();return true}
  if(act==="kshx"){kSh=null;render();return true}
  if(act==="kpg"){kSh=null;xbMenu=false;kPg=v;kSel=null;kPrev=null;kDraw=null;kFix=null;render();top();return true}
  if(act==="kpgx"){kPg=null;kSel=null;kPrev=null;kDraw=null;kFix=null;render();top();return true}
  if(act==="k7m"){if(v==="btc"){kPg="k7b";kSel=null;render();top();return true}kMode=v;kPrev=null;render();return true}
  if(act==="k7a"){kAvoid=!kAvoid;kPrev=null;render();return true}
  if(act==="k7r"){kPrev=null;render();return true}
  if(act==="k7ok"){const P=kPrev||[];await write(async()=>{for(const [a,c] of P){await db.collection("regs").doc(a.id).update({team:a.id,seek:false});await db.collection("regs").doc(c.id).update({team:a.id,seek:false})}},`Đã ghép ${P.length} cặp`);kPg=null;kPrev=null;render();return true}
  if(act==="k7bp"){if(!kSel||kSel===id){kSel=kSel===id?null:id;render();return true}const a=kSel;kSel=null;
    await write(async()=>{await db.collection("regs").doc(a).update({team:a,seek:false});await db.collection("regs").doc(id).update({team:a,seek:false})},"Đã ghép cặp");return true}
  if(act==="k7bx"){const a=(S.regs||[]).find(r=>r.id===id),m=a&&capMate(a);if(!a)return true;await write(async()=>{for(const r of [a,m].filter(Boolean))await db.collection("regs").doc(r.id).update({team:"",seek:true})},"Đã tách cặp");return true}
  if(act==="k8t"){const kd=kdOf(X),L=T().slice().sort((a,b)=>b.r-a.r),N=kN(X);let sel=kd.noSeed?[]:(kd.seedSel&&kd.seedSel.length?kd.seedSel.slice():L.slice(0,N).map(t=>t.code));
    if(sel.includes(v))sel=sel.filter(c=>c!==v);else{if(sel.length>=N){toast(`Tối đa ${N} hạt giống (mỗi bảng 1). Bỏ bớt một cặp trước.`);return true}sel.push(v)}
    await saveKd(X,{seedSel:sel,noSeed:!sel.length});return true}
  if(act==="k8no"){await saveKd(X,{seedSel:[],noSeed:true},"Không dùng hạt giống");kPg=null;kSh="chia";render();return true}
  if(act==="k8go"){kPg=null;kSh="chia";render();return true}
  if(act==="k9bal"){kSh=null;const G=kBal(D,X,T());await saveKd(X,{groups:G,seeds:G.map(g=>g[0]).filter(Boolean),at:Date.now(),by:who(),n:(kdOf(X).n||0)+1,pub:false},`Đã chia ${G.length} bảng đều trình độ`);return true}
  if(act==="k9next"||act==="k9all"){if(!kDraw)return true;const n=kDraw.order.length;
    if(kDraw.k>=n||act==="k9all"){kDraw.k=n;const R=kDraw;await saveKd(X,{groups:R.groups,seeds:R.seeds,at:Date.now(),by:who(),n:(kdOf(X).n||0)+1,pub:false},`Đã chia ${R.groups.length} bảng`);kPg=null;kDraw=null;render();top();return true}
    const o=kDraw.order[kDraw.k++],t=kTeamOf(T(),o.c);if(t&&!loaMuted()&&loaOpt("draw"))speak(ltx("draw",{"đội":t.nm.replace(/&amp;/g,"và"),"bảng":KOG[o.g]},`${t.nm.replace(/&amp;/g,"và")}, vào bảng ${KOG[o.g]}`),"","kd:"+kDraw.k);render();return true}
  if(act==="k9cpick"){kSel=kSel===v?null:v;render();return true}
  if(act==="k9cput"){if(!kSel||!kFix)return true;const cap=Math.ceil(T().length/kN(X)),g=kFix[+v];if(!g||g.length>=cap){toast("Bảng này đã đủ.");return true}g.push(kSel);kSel=null;render();return true}
  if(act==="k9cout"){if(!kFix)return true;for(const g of kFix){const i=g.indexOf(v);if(i>=0)g.splice(i,1)}render();return true}
  if(act==="k9cauto"){if(!kFix)return true;const cap=Math.ceil(T().length/kN(X)),inG=new Set(kFix.flat()),R=T().filter(t=>!inG.has(t.code)).sort((a,b)=>b.r-a.r);
    const sum=g=>g.reduce((a,c)=>a+((kTeamOf(T(),c)||{}).r||0),0);for(const t of R){const L=kFix.map((g,i)=>[i,g]).filter(([,g])=>g.length<cap).sort((a,b)=>a[1].length-b[1].length||sum(a[1])-sum(b[1]));if(L.length)L[0][1].push(t.code)}render();return true}
  if(act==="k9cok"){if(!kFix)return true;const G=kFix;await saveKd(X,{groups:G,seeds:G.map(g=>g[0]).filter(Boolean),at:Date.now(),by:who(),n:(kdOf(X).n||0)+1,pub:false},"Đã lưu chia bảng");kPg=null;kFix=null;render();top();return true}
  if(act==="klocked"){toast("Bảng đã chốt khi bắt đầu đánh, không đổi được nữa.");return true}
  if(act==="k10sw"){if(kLocked(X)){toast("Bảng đã chốt khi bắt đầu đánh, không đổi được nữa.");return true}const kd=kdOf(X);if(!kd.groups)return true;if(!kSel||kSel===v){kSel=kSel===v?null:v;render();return true}
    const G=kd.groups.map(g=>g.slice()),pos=c=>{for(let i=0;i<G.length;i++){const j=G[i].indexOf(c);if(j>=0)return [i,j]}return null},a=pos(kSel),c=pos(v);
    if(a&&c){G[a[0]][a[1]]=v;G[c[0]][c[1]]=kSel}else if(c&&!a)G[c[0]][c[1]]=kSel;else if(a&&!c)G[a[0]][a[1]]=v;kSel=null;await saveKd(X,{groups:G},"Đã đổi chỗ 2 cặp");return true}
  if(act==="k10pub"){kSh=null;const kd=kdOf(X);if(!kd.groups)return true;await sendText(kGroupText(D,X,T(),kd.groups));await saveKd(X,{pub:true});return true}
  if(act==="kx")return true;
  return false;
}

const kLi=(l,r)=>`<div class="g5s"><span><b>${l}</b></span><b>${r}</b></div>`;
/* ----- Ngày đánh (K11–K13): check-in theo cặp, cặp thiếu người, bắt đầu vòng bảng ----- */
function kArr(D,X,t){return [t.A,t.B].map(r=>!!r.arrived)}
function kDaySheets(D,X){
  const T=kTeams(D,X),kd=kdOf(X),it=(i,t,s,a,v,red)=>`<button class="gmli" data-act="${a}"${v!=null?` data-v="${esc(v)}"`:""}><i>${i}</i><span class="t"><b${red?` class="red"`:""}>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`;
  const sh=(t,b)=>`<div class="mxdim" data-act="kshx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="${esc(t)}"><span class="grab"></span><b class="mxh">${t}</b>${b}</div>`;
  if(kSh&&kSh.startsWith("k12:")){const c=kSh.slice(4),t=kTeamOf(T,c);if(!t){kSh=null;return ""}const [a,b]=kArr(D,X,t),miss=[!a&&t.A,!b&&t.B].filter(Boolean);
    const zid=miss[0]&&zidOf(D,miss[0]),late=!!(kd.late||{})[c],drop=!!(kd.drop||{})[c];
    let b2=it("🔁","Thay người","Chọn người khác trong CLB đang có mặt","k12sub",c)+it("⏳",late?"Bỏ chờ":"Chờ thêm","Xếp các trận của cặp này đánh sau","k12late",c)
      +it("✕",drop?"Không bỏ cặp nữa":armed("k12drop:"+c)?"Bấm lần nữa để bỏ cặp":"Bỏ cặp",`Các trận vòng bảng của cặp xử thua 0–${+X.koGt||+X.target||11}`,"k12drop",c,!drop);
    if(kSel==="sub:"+c){const used=new Set(T.flatMap(x=>[x.A.pid,x.B.pid])),L=D.players.filter(p=>p.active!==false&&!used.has(p.id));
      b2+=`<span class="gmlb">Ai thay ${esc(xbName(D,miss[0]||t.B))}?</span><div class="g2fl wrap">${L.map(p=>`<button data-act="k12pick" data-v="${esc(c)}" data-id="${esc(p.id)}">${esc(p.name)}</button>`).join("")||`<small class="rule">Chưa có ai khác đang có mặt.</small>`}</div>`}
    if(zid)b2+=`<button class="btn-line wide" data-act="zchat" data-v="${esc(zid)}" data-n="${esc(xbName(D,miss[0]))}">💬 Nhắn Zalo cho ${esc(xbName(D,miss[0]))}</button>`;
    return sh(`${t.nm} · ${miss.length===2?"chưa ai tới":miss.length?`còn chờ ${esc(xbName(D,miss[0]))}`:"đã đủ"}`,b2)}
  if(kSh==="k13"){const kd2=kdOf(X),G=kd2.groups||[],n=G.reduce((a,g)=>a+g.length*(g.length-1)/2,0),c=Math.max(1,+cfg().courts||+X.courts||1),lu=Math.ceil(n/c),t0=Math.max(Date.now(),X.at||0);
    const rule=`${(+X.koGs||1)>1?`${X.koGs} set, `:""}chạm ${X.koGt||X.target||11}${X.koGw==="1"?", cách 2":""}`;
    return sh("Bắt đầu vòng bảng?",`<div class="gmlist">${kLi("Trận vòng bảng",`${n} trận`)}${kLi("Sân",`${c} sân · ${lu} lượt`)}${kLi("Dự kiến xong",hm(t0+lu*GSLOT*6e4))}${kLi("Luật",esc(rule))}</div>
      <small class="rule">Loa đọc thể thức, ${Math.min(c,Math.floor(T.length/2))} trận đầu tự vào sân. Muốn sửa lịch vẫn sửa được.</small>${G.length?"":`<p class="err">Chưa chia bảng: chia bảng ở chặng Đăng ký trước.</p>`}<button class="ball go wide" data-act="k13go" ${G.length?"":"disabled"}>▶ Bắt đầu</button>`)}
  if(kSh==="k11m")return sh("Thêm việc",it("✋","BTC check-in giùm","Tích chọn người đã tới sân","ckbtc").replace('data-act="ckbtc"',`data-act="ckbtc" data-id="${esc(X.id)}"`)+it("＋","Thêm cặp đến muộn","Vào bảng còn thiếu","gmxa")+it("▦","Sửa bảng","Đổi chỗ 2 cặp trước khi đánh","k11bang")+it("🏟","Số sân",`Đang có ${+cfg().courts||+X.courts||1} sân`,"ksh","courts")+it("🔊","Loa đọc thể thức","Bấm thì mới đọc","speakrules")+it("✎","Sửa giải","Ngày, sân, thể thức, lệ phí","gmxe")+it("🔊","Loa · câu đọc","Tự đọc, sửa câu đọc của giải này","lpg"));
  if(kSh==="courts"){const c=+cfg().courts||+X.courts||1;return sh("Số sân",`<div class="gmstp"><span><b>Mấy sân?</b><small>Giải chia bảng nên có 3–4 sân</small></span><span class="stepper big"><button data-act="kcourt" data-v="-1" aria-label="Bớt">−</button><b class="num">${c}</b><button data-act="kcourt" data-v="1" aria-label="Thêm">＋</button></span></div>`)}
  return "";
}
// Bắt đầu: tạo cặp t_<mã đội>, chia bảng theo kd, nghỉ cặp chưa đủ người, bỏ cặp đã chọn bỏ
async function kStart(D,X){
  if(!gmCur(X)){if(gmLive(D)||D.SM.length){toast("Đang có giải khác ở sân.");return}await xApply(D,X,true);await new Promise(r=>setTimeout(r,80));D=derive()}
  const T=kTeams(D,X),kd=kdOf(X);if(!kd.groups){toast("Chia bảng trước.");return}
  const pairs=[],rest={},out={},skip=[];
  for(const t of T){let a=t.A.pid,b=t.B.pid;const s=(kd.sub||{})[t.code];if(s){if(s.from===t.A.id)a=s.pid;else b=s.pid}
    if(!a||!b){skip.push(t.nm);continue}const id="t_"+t.code;pairs.push({id,a,b,reg:1});
    const [x,y]=kArr(D,X,t);if((kd.late||{})[t.code]||(!s&&!(x&&y)))rest[id]=true;if((kd.drop||{})[t.code])out[id]=true}
  const ids=new Set(pairs.map(p=>p.id)),groups=kd.groups.map(g=>g.map(c=>"t_"+c).filter(id=>ids.has(id))),inG=new Set(groups.flat());
  for(const p of pairs)if(!inG.has(p.id)){const g=groups.slice().sort((a,b)=>a.length-b.length)[0];if(g)g.push(p.id)}
  if(groups.some(g=>g.length<2)){toast("Mỗi bảng cần ít nhất 2 cặp. Chia bảng lại nhé.");return}
  const G=cfg().giai||{};
  await write(async()=>{await saveCfg({phase:"live",giai:{...G,pairs,ko:koOut({...koK(G),n:groups.length,groups,seeds:(kd.seeds||[]).map(c=>"t_"+c).filter(id=>ids.has(id)),gat:kd.at||Date.now(),gby:kd.by||who(),gn:kd.n||1}),rest,out,locked:true,startedAt:Date.now(),koGate:true,koGo:false}})},"Đã bắt đầu vòng bảng");
  if(skip.length)toast(`Chưa vào giải (thiếu người): ${skip.join(", ").replace(/&amp;/g,"&")}`);
  if(autoNext())await gFill();
  if(!loaMuted()&&loaOpt("rules"))setTimeout(()=>onAct({target:{closest:s=>s==="[data-act]"?{dataset:{act:"speakrules"},closest:()=>null}:null}}),300);
}
async function kDayAct(act,b){
  const D=derive(),v=b.dataset.v,X=routeX?schedById(routeX):xCur();if(!X)return false;
  if(act==="k12"){kSh="k12:"+v;kSel=null;render();return true}
  if(act==="k12sub"){kSel=kSel==="sub:"+v?null:"sub:"+v;render();return true}
  if(act==="k12pick"){const t=kTeamOf(kTeams(D,X),v);if(!t)return true;const [a]=kArr(D,X,t),from=a?t.B.id:t.A.id;await saveKd(X,{sub:{...(kdOf(X).sub||{}),[v]:{from,pid:b.dataset.id}}},"Đã thay người");kSh=null;kSel=null;render();return true}
  if(act==="k12late"){const L={...(kdOf(X).late||{})};if(L[v])delete L[v];else L[v]=1;await saveKd(X,{late:L},L[v]?"Cặp này đánh sau":"Đã bỏ chờ");kSh=null;render();return true}
  if(act==="k12drop"){const Dp={...(kdOf(X).drop||{})};if(!Dp[v]&&!armOr("k12drop:"+v))return true;if(Dp[v])delete Dp[v];else Dp[v]=1;await saveKd(X,{drop:Dp},Dp[v]?"Đã bỏ cặp":"Không bỏ cặp nữa");kSh=null;render();return true}
  if(act==="k11bang"){kSh=null;gmSt[X.id]=0;render();return true}
  if(act==="kcourt"){const c=Math.max(1,Math.min(30,(+cfg().courts||+X.courts||1)+Number(v)));if(gmCur(X))await write(()=>saveCfg({courts:c}));else await write(()=>db.collection("sched").doc(X.id).update({courts:c}));return true}
  if(act==="k13go"){kSh=null;await kStart(D,X);return true}
  return false;
}

/* ----- Đang đánh (K14–K19): Sân · Bảng · Nhánh ----- */
const kGrpOf=(GD,m)=>{const g=GD.games.find(q=>q.m&&q.m.id===m.id);return g&&!g.ko&&g.grp!=null?`BẢNG ${KOG[g.grp]}`:m.ko?koMName(GD,m.ko).toUpperCase():""};
const kPN=(D,GD,id)=>{const p=GD.pm.get(id);return p?pairNm(D,p):"?"};
function kNext(D,GD,k=2){const busy=new Set(D.playing.filter(m=>m.giai).flatMap(m=>[m.pa,m.pb])),L=[];for(let i=0;i<k;i++){const g=gPick(D,GD,busy,new Set());if(!g)break;busy.add(g.x);busy.add(g.y);L.push(g)}return L}
// Cặp được cho nghỉ vì chưa đủ người: đủ người rồi thì tự vào lại (trừ cặp BTC chọn "Chờ thêm")
const kAutoDone=new Set();
function kAutoRest(D,X,GD){
  if(!X||!kOn(X))return;const kd=kdOf(X),r=GD.G.rest||{},T=kTeams(D,X),back=[];
  for(const t of T){const id="t_"+t.code;if(!r[id]||(kd.late||{})[t.code])continue;const [a,b]=kArr(D,X,t);if(a&&b&&!kAutoDone.has(id)){kAutoDone.add(id);back.push(id)}}
  if(back.length)setTimeout(async()=>{const R={...(cfg().giai?.rest||{})};back.forEach(id=>delete R[id]);await write(()=>saveG({rest:R}));if(autoNext())await gFill(true)},0);
}
function kPlayV(D,X,GD){
  kAutoRest(D,X,GD);
  if(kOrdPg)return kOrdV(D,X,GD);
  const G=GD.G,seg=["san","bang","nhanh"].includes(kSeg)?kSeg:"san";
  let h=`<div class="kseg">${[["san","Sân"],["bang","Bảng"],["nhanh","Nhánh"]].map(([k,l])=>`<button data-act="kseg" data-v="${k}" aria-pressed="${seg===k}">${l}</button>`).join("")}</div>`;
  const gw=GD.games.filter(g=>!g.ko&&g.st!=="hold"),gd=gw.filter(g=>g.st==="done"||g.st==="wo").length,inKO=GD.gDone&&(!G.koGate||G.koGo);
  const curKo=inKO?GD.ko.find(L=>L.some(g=>g.st!=="done"&&g.st!=="wo"))||GD.ko[GD.ko.length-1]:null;
  const gate=GD.gDone&&G.koGate&&!G.koGo&&seg!=="nhanh";
  const used=new Set(D.playing.map(m=>Number(m.court))),cp=G.cpause||{},free=[];for(let i=1;i<=Math.max(1,+D.c.courts||1);i++)if(!used.has(i)&&!cp[i])free.push(i);
  const canFill=free.length&&kNext(D,GD,1).length;
  if(seg==="san"){
    const left=gw.length-gd,lu=Math.ceil(left/Math.max(1,+D.c.courts||1));
    h+=inKO&&curKo?`<div class="kline"><b>${esc(curKo[0].rn)} · ${curKo.filter(g=>g.st==="done"||g.st==="wo").length}/${curKo.length} trận xong</b><span>${esc(ruleTx(curKo[0].rule))}</span></div>`
      :`<div class="kline"><b>Vòng bảng · ${gd}/${gw.length} trận</b><span>${left?`xong ~${hm(Date.now()+lu*GSLOT*6e4)}`:"xong"}</span></div>`;
    const scop={lb:m=>esc(kGrpOf(GD,m)),nm:m=>[kPN(D,GD,m.pa),kPN(D,GD,m.pb)],fill:!gate&&!!kNext(D,GD,1).length,cp};
    if(gate){const R0=GD.ko[0],pos=new Map();GD.gt.forEach((t,gx)=>t.forEach((r,i)=>pos.set(r.p.id,`${KOG[gx]}${i+1}`)));
      h+=`<div class="kgate"><span class="cap">✓ Xong vòng bảng · ${gd}/${gw.length} trận</span><b>${R0.length*2} cặp vào ${esc(R0[0].rn.toLowerCase())}</b><small>Nhất bảng gặp nhì bảng khác · xem ở tab Nhánh</small></div>
        <div class="g2list">${R0.map(g=>`<div class="g5s"><span><b>${esc(pos.get(g.x)||"")} ${kPN(D,GD,g.x)}</b></span><span>gặp ${esc(pos.get(g.y)||"")} ${kPN(D,GD,g.y)}</span></div>`).join("")}</div>`}
    h+=scBoard(D,scop);const nf=scFree(D,scop);
    const N=kNext(D,GD,2);if(N.length)h+=`<div class="g4nx"><span class="cap">Lượt sau</span><span>${N.map(g=>`${g.ko?esc(g.ab):KOG[g.grp]}: ${kPN(D,GD,g.x)} – ${kPN(D,GD,g.y)}`).join(" · ")}</span></div>`;
    const rn=inKO&&curKo?esc(curKo[0].rn.toLowerCase()):"";
    h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="m14" aria-label="Thêm việc">⋯</button>${gate?`<button class="ball go" data-act="kgo">Tạo nhánh knockout ›</button>`:nf?`<button class="ball go" data-act="scfillall">▶ ${rn&&!D.playing.length?`Xếp ${Math.min(nf,kNext(D,GD,nf).length)} trận ${rn} vào sân`:`Tạo trận cho ${nf} sân`}</button>`:`<button class="ball nv" data-act="gmst" data-v="3">🏁 Hết giờ · sang chốt</button>`}</div>`+scSheet(D);
  }
  if(seg==="bang"){
    if(G.locked)h+=`<div class="klock">🔒 <b>Bảng đã chốt</b> lúc bắt đầu vòng bảng${G.startedAt?` ${hm(G.startedAt)}`:""} · không đổi được nữa</div>`;
    const per=Math.max(1,Math.round(GD.size/Math.max(1,GD.groups.length)));
    h+=GD.gt.map((t,gx)=>{const gs=GD.games.filter(g=>g.grp===gx&&g.st!=="hold"),left=gs.filter(g=>g.st!=="done"&&g.st!=="wo").length;
      return `<div class="ktb"><div class="h"><b>BẢNG ${KOG[gx]}</b><small>${left?`● còn ${left} trận`:"xong"}</small></div><div class="r hd"><span>#</span><span>CẶP</span><span>T</span><span>B</span><span>HS</span></div>${t.map((r,i)=>{const d=r.pf-r.pa;return `<div class="r${i<per&&!r.out?" q":""}${r.out?" out":""}"><b>${i+1}</b><span>${pairNm(D,r.p)}</span><span>${r.w}</span><span>${r.l}</span><span>${d>0?"+":d<0?"−":""}${Math.abs(d)}</span></div>`}).join("")}</div>`}).join("");
    h+=`<small class="rule">Bằng thắng thì xét: đối đầu → hiệu số → điểm ghi được. T: thắng · B: thua · HS: hiệu số.</small>
      <div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="m15" aria-label="Thêm việc">⋯</button><button class="ball go" data-act="k15send">📣 Gửi bảng vào nhóm</button></div>`;
  }
  if(seg==="nhanh"){
    if(G.koGo&&!G.koRead)h+=`<div class="kread"><span><b>Đã tạo nhánh.</b> Muốn đọc cho cả sân?</span><button class="btn-line sm" data-act="k17read">🔊 Đọc loa</button></div>`;
    const R0=GD.ko[0];h+=`<span class="gmlb">${esc(R0[0].rn)} · ${esc(ruleTx(R0[0].rule))}</span>`;
    const box=g=>{const w=gWin(g),nm=(id,lb)=>id?kPN(D,GD,id):`<em>${esc(lb||"…")}</em>`,sc=(id,v)=>g.st==="done"?`<b>${v}</b>`:"";
      return `<div class="kbm${g.st==="live"?" live":""}${kSel==="ks:"+g.i&&g.kr===0?" on":""}"${G.kswap&&g.kr===0&&g.st==="wait"?` data-act="kswap" data-v="${g.i}" role="button"`:""}><span class="${w&&w===g.x?"w":""}">${nm(g.x,g.lx)}${sc(g.x,g.sx)}</span><span class="${w&&w===g.y?"w":""}">${nm(g.y,g.ly)}${sc(g.y,g.sy)}</span></div>`};
    h+=`<div class="kbr">${GD.ko.map((L,r)=>`<div class="col" style="gap:${8+r*24}px">${L.map(box).join("")}</div>`).join("")}</div>`;
    const F=GD.ko[GD.ko.length-1][0];h+=`<div class="g4nx"><span class="cap">Sau đó</span><div class="g5s"><span><b>Chung kết</b></span><b>${esc(ruleTx(F.rule))}</b></div>${GD.third?`<div class="g5s"><span><b>Tranh hạng ba</b></span><b>${esc(ruleTx(GD.third.rule))}</b></div>`:""}</div>`;
    if(!GD.gDone)h+=`<small class="rule">Nhánh điền tên khi đánh xong vòng bảng.</small>`;
    h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="m17" aria-label="Thêm việc">⋯</button><button class="ball go" data-act="k17send">📣 Gửi nhánh vào nhóm</button></div>`;
  }
  return h+kPlaySheets(D,X,GD);
}
function kPlaySheets(D,X,GD){
  if(!kSh)return "";const G=GD.G,it=(i,t,s,a,v,red)=>`<button class="gmli" data-act="${a}"${v!=null?` data-v="${esc(v)}"`:""}><i>${i}</i><span class="t"><b${red?` class="red"`:""}>${t}</b>${s?`<small>${s}</small>`:""}</span><span aria-hidden="true">›</span></button>`;
  const sh=(t,b)=>`<div class="mxdim" data-act="kshx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="${esc(t)}"><span class="grab"></span><b class="mxh">${t}</b>${b}</div>`;
  if(kSh==="m14")return sh("Thêm việc",it("🔊","Loa · câu đọc","Tự đọc, sửa câu đọc của giải này","lpg")+it("⚙","Xếp trận tiếp",autoNext()?"Đang: Tự động · bấm để chuyển BTC bấm":"Đang: BTC bấm · bấm để chuyển Tự động","scauto")+it("🔊","Loa gọi trận kế","Đọc tên 2 cặp và số sân","kcall")+it("▣","Mã trọng tài","Mỗi sân một mã","dhqr")+it("⇅","Đổi thứ tự trận","Kéo thả hoặc theo tiến độ","kord")+it("⏸","Tạm dừng sân","Sân hỏng, mưa…","ksh","cp")+it("✎","Sửa điểm trận đã xong","","g4v","kq")+it("🏳","Xử thua một cặp","Bỏ cuộc, chấn thương","ksh","ff",1));
  if(kSh==="m15")return sh("Thêm việc",it("🔊","Loa đọc bảng xếp hạng","Bấm thì mới đọc","k15read")+it("⚖","Cách xếp khi bằng thắng","Đối đầu → hiệu số → điểm ghi","ksh","tie")+it("🖼","Gửi ảnh các bảng","Vào nhóm Zalo","k15send")+(!GD.gDone?it("▶",armed("kforce:x")?"Bấm lần nữa · trận còn lại không đánh":"Tạo nhánh ngay","Khi còn trận chưa đánh","kforce",null,1):""));
  if(kSh==="m17"){const R0=GD.ko[0][0];return sh("Thêm việc",it("🔊","Loa đọc nhánh đấu","Bấm thì mới đọc","k17read")+it("⇄",G.kswap?"Xong đổi chỗ":"Đổi 2 cặp trong nhánh","Trước khi vòng đó bắt đầu","kswapm")+it("⚙","Luật điểm vòng này",`${R0.rn}: ${ruleTx(R0.rule)}`,"ksh","rule")+it("🖼","Gửi ảnh nhánh","Vào nhóm Zalo","k17send")+it("↺",armed("kreset:x")?"Bấm lần nữa để xếp lại":"Xếp lại nhánh","Xoá kết quả vòng trong đã nhập","kreset",null,1))}
  if(kSh==="tie")return sh("Cách xếp khi bằng thắng",`<small class="rule">Hai cặp bằng số trận thắng: xét trận đối đầu giữa hai cặp; vẫn bằng thì xét hiệu số (điểm ghi trừ điểm thua); vẫn bằng thì xét tổng điểm ghi được.</small>`);
  if(kSh==="rule")return sh("Luật điểm",`<div class="kobd">${koRules(GD.K)}</div>`);
  if(kSh==="up"){const W=GD.games.filter(g=>g.st==="wait").slice(0,20);return sh("Đưa trận nào lên trước?",`<div class="g2list">${W.map(g=>`<button class="g2p" data-act="kup" data-v="${esc(g.x)}|${esc(g.y)}"><span class="t"><b>${kPN(D,GD,g.x)} – ${kPN(D,GD,g.y)}</b><small>${g.ko?esc(g.rn):`Bảng ${KOG[g.grp]}`}</small></span></button>`).join("")||`<p class="rule">Không còn trận chờ.</p>`}</div>`)}
  if(kSh==="cp"){const cp=G.cpause||{};return sh("Tạm dừng sân",`<div class="g2fl wrap">${Array.from({length:Math.max(1,+D.c.courts||1)},(_,i)=>i+1).map(c=>`<button data-act="kcp" data-v="${c}" aria-pressed="${!!cp[c]}">Sân ${esc(cName(c))}${cp[c]?" · đang dừng":""}</button>`).join("")}</div><small class="rule">Sân tạm dừng không nhận trận mới. Bấm lại để mở.</small>`)}
  if(kSh==="ff")return sh("Xử thua cặp nào?",`<div class="g2list">${GD.pairs.filter(p=>!GD.out[p.id]).map(p=>`<button class="g2p" data-act="gout" data-id="${esc(p.id)}"><span class="t"><b>${pairNm(D,p)}</b></span><span class="g2tag r">${armed("gout:"+p.id)?"BẤM LẦN NỮA":"XỬ THUA"}</span></button>`).join("")}</div><small class="rule">Các trận còn lại của cặp này tính thua.</small>`);
  return "";
}
const kBangText=(D,GD,X)=>[`🏆 ${X?xName(X):""} · bảng xếp hạng`,...GD.gt.map((t,gx)=>`BẢNG ${KOG[gx]}: ${t.map((r,i)=>`${i+1}. ${pairNm(D,r.p).replace(/&amp;/g,"&")} (${r.w}-${r.l})`).join(" · ")}`)].join("\n");
const kNhanhText=(D,GD,X)=>[`🏆 ${X?xName(X):""} · nhánh đấu`,...GD.ko.flatMap(L=>L.map(g=>`${g.ab}: ${g.x?kPN(D,GD,g.x).replace(/&amp;/g,"&"):g.lx} – ${g.y?kPN(D,GD,g.y).replace(/&amp;/g,"&"):g.ly}${g.st==="done"?` (${g.sx}–${g.sy})`:""}`))].join("\n");
async function kPlayAct(act,b){
  const D=derive(),GD=gDerive(D),v=b.dataset.v,X=xCur();if(!GD||!GD.isKO)return false;const G=GD.G;
  if(act==="kseg"){kSeg=v;kSh=null;render();return true}
  if(act==="kgo"){await write(()=>saveG({koGo:true}),"Đã tạo nhánh");kSeg="san";if(autoNext())await gFill();return true}
  if(act==="kforce"){if(!armOr("kforce:x"))return true;kSh=null;await write(()=>saveG({koForce:true}),"Vòng bảng dừng ở đây");return true}
  if(act==="k17read"){speak(kNhanhText(D,GD,X).split("\n").slice(1).join(". "),"","kn:"+Date.now(),true);await write(()=>saveG({koRead:true}));kSh=null;return true}
  if(act==="k15read"){speak(kBangText(D,GD,X).split("\n").slice(1).join(". "),"","kb:"+Date.now(),true);kSh=null;render();return true}
  if(act==="k15send"){kSh=null;await sendText(kBangText(D,GD,X));return true}
  if(act==="k17send"){kSh=null;await sendText(kNhanhText(D,GD,X));return true}
  if(act==="kcall"){kSh=null;const g=kNext(D,GD,1)[0];if(!g){toast("Không còn trận chờ.");return true}speak(`Trận tiếp theo: ${kPN(D,GD,g.x).replace(/&amp;/g,"và")} gặp ${kPN(D,GD,g.y).replace(/&amp;/g,"và")}`,"","kc:"+Date.now(),true);render();return true}
  if(act==="kup"){const [x,y]=String(v).split("|");kSh=null;await write(()=>saveG({preOn:true,presets:[{id:"gp"+Date.now().toString(36),x,y},...(G.presets||[])]}),"Đã đưa trận lên trước");return true}
  if(act==="kcp"){const cp={...(G.cpause||{})};if(cp[v])delete cp[v];else cp[v]=true;await write(()=>saveG({cpause:cp}),cp[v]?`Đã dừng sân ${cName(+v)}`:`Đã mở lại sân ${cName(+v)}`);if(!cp[v]&&autoNext())await gFill();return true}
  if(act==="kswapm"){kSh=null;kSel=null;await write(()=>saveG({kswap:!G.kswap}));kSeg="nhanh";return true}
  if(act==="kswap"){const R0=GD.ko[0],ids=R0.flatMap(g=>[g.x,g.y]);if(!kSel){kSel="ks:"+v;render();return true}const a=+kSel.slice(3),c=+v;kSel=null;if(a===c){render();return true}
    const L=ids.slice();[L[2*a+1],L[2*c+1]]=[L[2*c+1],L[2*a+1]];await write(()=>saveG({koIds:L}),"Đã đổi 2 cặp trong nhánh");return true}
  if(act==="kreset"){if(!armOr("kreset:x"))return true;kSh=null;const M=D.SM.filter(m=>m.giai&&m.ko);await write(async()=>{if(M.length)await trashMatches(M,"del");await saveG({koIds:null,koGo:false,koRead:false,kswap:false})},"Đã xếp lại nhánh");return true}
  return false;
}

/* ----- Trận nhiều set (K19): nhập từng set, đủ số set thắng thì lưu kết quả ----- */
function kSetsV(D,m){
  const R=mRule(m)||{sets:3,to:11},n=+R.sets||3,need=Math.ceil(n/2),S0=(Array.isArray(m.sets)?m.sets:[]).map(s=>[+s.a,+s.b]),w=[0,0];S0.forEach(([a,b])=>a>b?w[0]++:w[1]++);
  const k=S0.length,GD=m.giai?gDerive(D):null,title=m.ko&&GD?koMName(GD,m.ko):`Sân ${cName(m.court)}`,A=g4Nm(D,m.a),B=g4Nm(D,m.b);
  mxDr({t:`${title} · nhập điểm`,back:"g4x",sub:`${A} – ${B}`});
  const cell=(i,t)=>i<k?`<span class="kst">${S0[i][t]}</span>`:i===k?`<input class="kst in" id="st-${m.id}-${t}" data-draft="st-${m.id}-${t}" type="number" inputmode="numeric" min="0" max="99" value="${esc(val(`st-${m.id}-${t}`,""))}" aria-label="Set ${i+1}">`:`<span class="kst">—</span>`;
  const last=k===n-1,tied=w[0]===w[1]&&k>0;
  return `<small class="rule">${n} set · chạm ${R.to}${R.w2?", cách 2":""} · thắng ${need} set là ${m.ko&&GD&&koMName(GD,m.ko)==="Chung kết"?"vô địch":"thắng"}</small>
    <div class="ksets"><div class="r hd"><span></span>${Array.from({length:n},(_,i)=>`<span>SET ${i+1}</span>`).join("")}</div><div class="r"><b>${A}</b>${Array.from({length:n},(_,i)=>cell(i,0)).join("")}</div><div class="r"><b>${B}</b>${Array.from({length:n},(_,i)=>cell(i,1)).join("")}</div></div>`
    +(k?gmNextBox({t:`${w[0]}–${w[1]}${tied&&last?" · đánh set quyết định":` · đánh set ${k+1}`}`,s:`Set ${k+1} chạm ${R.to}${last?`, đổi sân khi một đội tới ${Math.ceil(R.to/2)}`:""}`},false):"")
    +(errs[m.id]?`<p class="err">${esc(errs[m.id])}</p>`:"")
    +`<div class="hqcta"><button class="ball go" data-act="kset" data-id="${esc(m.id)}">✓ Lưu set ${k+1}</button></div>`;
}
async function kSetAct(act,b){
  if(act!=="kset")return false;const id=b.dataset.id,m=(S.matches||[]).find(x=>x.id===id);if(!m)return true;
  const R=mRule(m)||{sets:3,to:11},n=+R.sets||3,need=Math.ceil(n/2),rd=t=>{const el=document.getElementById&&document.getElementById(`st-${id}-${t}`);return Number(el&&el.value!==""?el.value:val(`st-${id}-${t}`,""))};
  const a=rd(0),c=rd(1),e=validPts(a,c,{target:R.to,win2:!!R.w2,ptMax:+R.cap||0});if(e){errs[id]=e;render();return true}delete errs[id];
  const S2=[...(Array.isArray(m.sets)?m.sets:[]).map(s=>[+s.a,+s.b]),[a,c]],w=[0,0];S2.forEach(([x,y])=>x>y?w[0]++:w[1]++);
  const done=Math.max(...w)>=need;
  await write(()=>db.collection("matches").doc(id).update(done?{sets:S2.map(([x,y])=>({a:x,b:y})),sa:w[0],sb:w[1],status:"done",doneAt:Date.now()}:{sets:S2.map(([x,y])=>({a:x,b:y}))}),done?"Đã lưu kết quả":`Đã lưu set ${S2.length}`);
  delete drafts[`st-${id}-0`];delete drafts[`st-${id}-1`];
  if(done&&m.giai){g4V=null;if(autoNext()){await new Promise(r=>setTimeout(r,60));await gFill()}}return true;
}

/* ----- Người chơi (K22a–K23): check-in bằng quét mã, trận tiếp của tôi, bảng của tôi, nhánh ----- */
function mxCkCard(D,X){
  const mine=gdMine(X);if(!mine)return "";const m=capMate(mine),kd=kdOf(X),gx=(kd.groups||[]).findIndex(g=>g.includes(mine.team)),pn=m?`Bạn &amp; ${esc(xbName(D,m))}`:"";
  if(!mine.ci&&!mine.arrived)return `<div class="mxkh"><span class="cap">Hôm nay · ${X.at?hm(X.at):""}</span><b>${esc(xName(X))}</b>${pn?`<span>${pn}${gx>=0?` · Bảng ${KOG[gx]}`:""}</span>`:""}</div>
    <div class="mxcard"><b>Tới sân rồi thì check-in</b><span class="t2">Quét mã đang hiện trên máy của ban tổ chức.</span><button class="ball go wide" data-act="mxscan">⌗ Quét mã check-in</button></div>`;
  if(!mine.arrived)return `<div class="mxkst y"><span class="cap">⏳ Đã quét · ${hm(mine.ci)}</span><b>Chờ ban tổ chức xác nhận</b><span>Đưa mặt cho BTC nhìn, trả lệ phí nếu chưa trả.</span></div>`;
  let h=`<div class="mxkst g"><span class="cap">✓ Đã check-in ${mine.arrivedAt?hm(mine.arrivedAt):""}</span><b>${m?m.arrived?"Cặp đã đủ người":`Đang chờ ${esc(xbName(D,m))}`:"Chờ ban tổ chức xếp sân"}</b>${m&&!m.arrived?`<span>Cặp chưa đủ người thì chưa xếp sân</span>`:""}</div>`;
  if(gx>=0){const T=kTeams(D,X),g=kd.groups[gx],opp=g.filter(c=>c!==mine.team).map(c=>kTeamOf(T,c)).filter(Boolean);
    if(opp[0])h+=`<div class="mxcard"><span class="t2">TRẬN ĐẦU CỦA BẠN</span><b>${pn} gặp ${opp[0].nm}</b><span class="t2">Bảng ${KOG[gx]} · loa sẽ gọi</span></div>`;
    h+=`<div class="mxcard"><span class="t2">BẢNG ${KOG[gx]}</span>${g.map(c=>{const t=kTeamOf(T,c);return t?`<span>${(kd.seeds||[]).includes(c)?"★ ":""}${c===mine.team?pn:t.nm}</span>`:""}).join("")}</div>`}
  const zid=m&&!m.arrived&&zidOf(D,m);if(zid)h+=`<button class="btn-line wide" data-act="zchat" data-v="${esc(zid)}" data-n="${esc(xbName(D,m))}">💬 Nhắn ${esc(xbName(D,m))}</button>`;
  return h;
}
function mxLiveKO(D,GD){
  const me=mxPid(),P=GD.pairs.find(p=>p.a===me||p.b===me),seg=["san","bang","nhanh"].includes(mxSeg.live)?mxSeg.live:"san",nmMe=p=>{const o=p.a===me?p.b:p.a;return `Bạn &amp; ${esc(nm(D,o))}`};
  let h="";
  if(P){const gx=GD.groups.findIndex(g=>g.includes(P.id)),next=GD.games.find(g=>(g.x===P.id||g.y===P.id)&&(g.st==="wait"||g.st==="live"));
    const inKO=GD.gDone&&(!GD.G.koGate||GD.G.koGo),pos=gx>=0?GD.gt[gx].findIndex(r=>r.p.id===P.id):-1;
    if(next&&next.ko&&inKO){const op=next.x===P.id?next.y:next.x,after=GD.games.find(g=>g.ko&&g.kr===next.kr+1&&(g.lx===`Thắng ${next.ab}`||g.ly===`Thắng ${next.ab}`));
      const sib=after?(after.lx===`Thắng ${next.ab}`?after.ly:after.lx).replace("Thắng ",""):"";
      h+=`<div class="mxkst g"><span class="cap">Bạn vào ${esc(GD.ko[0][0].rn.toLowerCase())}${pos>=0?` · ${POS[pos]||""} bảng ${KOG[gx]}`:""}</span><b>${esc(koMName(GD,next.ko))}: gặp ${op?kPN(D,GD,op):"…"}</b>${after?`<span>Thắng thì gặp người thắng ${esc(sib)} ở ${esc(after.rn.toLowerCase())}</span>`:""}</div>`}
    else if(next){const op=next.x===P.id?next.y:next.x,ahead=GD.games.filter(g=>g.st==="wait"&&g.r<next.r).length,eta=Date.now()+Math.ceil(ahead/Math.max(1,+D.c.courts||1))*GSLOT*6e4;
      h+=`<div class="mxkst y"><span class="cap">${next.st==="live"?`● Đang đánh · sân ${esc(cName(next.m.court))}`:`Trận tiếp của bạn · khoảng ${hm(eta)}`}</span><b>${nmMe(P)} gặp ${op?kPN(D,GD,op):"…"}</b><span>${next.ko?esc(koMName(GD,next.ko)):`Bảng ${KOG[next.grp]}`} · sân sẽ báo qua loa</span></div>`}}
  h+=`<div class="kseg">${[["san","Sân"],["bang","Bảng của tôi"],["nhanh","Nhánh"]].map(([k,l])=>`<button data-act="mxseg" data-k="live" data-v="${k}" aria-pressed="${seg===k}">${l}</button>`).join("")}</div>`;
  if(seg==="san")return h+`<div class="mxlivewrap">${vGiaiSan(D)}</div>`;
  if(seg==="bang"){const gx=P?GD.groups.findIndex(g=>g.includes(P.id)):-1,L=gx>=0?[gx]:GD.gt.map((_,i)=>i),per=Math.max(1,Math.round(GD.size/Math.max(1,GD.groups.length)));
    h+=L.map(gx=>{const t=GD.gt[gx],left=GD.games.filter(g=>g.grp===gx&&g.st!=="done"&&g.st!=="wo"&&g.st!=="hold").length;
      return `<div class="ktb"><div class="h"><b>BẢNG ${KOG[gx]}</b><small>${left?`● còn ${left} trận`:"xong"}</small></div><div class="r hd"><span>#</span><span>CẶP</span><span>T</span><span>B</span><span>HS</span></div>${t.map((r,i)=>{const d=r.pf-r.pa,mine=P&&r.p.id===P.id;return `<div class="r${i<per?" q":""}"><b>${i+1}</b><span>${mine?`<b>${nmMe(P)}</b>`:pairNm(D,r.p)}</span><span>${r.w}</span><span>${r.l}</span><span>${d>0?"+":d<0?"−":""}${Math.abs(d)}</span></div>`}).join("")}</div>`}).join("");
    if(P&&gx>=0){const pos=GD.gt[gx].findIndex(r=>r.p.id===P.id);h+=`<small class="rule">${per===2?"Nhất, nhì":per===1?"Nhất bảng":`Top ${per}`} vào ${esc(GD.ko[0][0].rn.toLowerCase())}. Bạn đang ${POS[pos]?POS[pos].toLowerCase():"hạng "+(pos+1)} bảng.</small>`}
    return h}
  const box=g=>{const w=gWin(g),n2=(id,lb)=>id?(P&&id===P.id?`<b>${nmMe(P)}</b>`:kPN(D,GD,id)):`<em>${esc(lb||"…")}</em>`,sc=(id,v)=>g.st==="done"?`<b>${v}</b>`:"";
    return `<div class="kbm${g.st==="live"?" live":""}"><span class="${w&&w===g.x?"w":""}">${n2(g.x,g.lx)}${sc(g.x,g.sx)}</span><span class="${w&&w===g.y?"w":""}">${n2(g.y,g.ly)}${sc(g.y,g.sy)}</span></div>`};
  return h+`<div class="kbr">${GD.ko.map((L,r)=>`<div class="col" style="gap:${8+r*24}px">${L.map(box).join("")}</div>`).join("")}</div>${GD.gDone?"":`<small class="rule">Nhánh điền tên khi đánh xong vòng bảng.</small>`}`;
}

/* ----- Đổi thứ tự trận: Theo tiến độ (app tự xếp) hoặc Tự sắp xếp (giữ ≡ kéo thả) ----- */
let kOrdPg=false,kOrd=null,kOrdMode=null;
SRT_CB.kord=keys=>{kOrd=keys;render()};
// Thứ tự dự kiến: lịch từng sân, lần lượt từng lượt
function kOrdSeq(D,GD){const P=gPlan(D,GD),L=[...P.values()],seq=[],n=Math.max(0,...L.map(x=>x.length));
  for(let i=0;i<n;i++)for(const x of L)if(x[i])seq.push(x[i]);
  for(const g of GD.games)if(g.st==="wait"&&g.x&&g.y&&!seq.includes(g))seq.push(g);return seq.filter(g=>g.x&&g.y&&g.key===gk(g.x,g.y))}
function kOrdV(D,X,GD){
  const G=GD.G,mode=kOrdMode||(G.preOn===true?"man":"auto"),seq=kOrdSeq(D,GD),by=new Map(seq.map(g=>[g.key,g]));
  if(!kOrd)kOrd=seq.map(g=>g.key);const L=kOrd.map(k=>by.get(k)).filter(Boolean);for(const g of seq)if(!kOrd.includes(g.key))L.push(g);
  mxDr({t:"Đổi thứ tự trận",back:"kordx",sub:esc(xName(X))});
  const row=(g,i)=>`<div class="srt" data-k="${esc(g.key)}">${mode==="man"?`<span class="drh" aria-label="Kéo để đổi chỗ">≡</span>`:""}<b class="n">${i+1}</b><span class="t"><b>${kPN(D,GD,g.x)}</b> gặp <b>${kPN(D,GD,g.y)}</b><small>${g.ko?esc(g.rn):`Bảng ${KOG[g.grp]}`}</small></span></div>`;
  return `<div class="kseg">${[["auto","Theo tiến độ"],["man","Tự sắp xếp"]].map(([k,l])=>`<button data-act="kordm" data-v="${k}" aria-pressed="${mode===k}">${l}</button>`).join("")}</div>
    <small class="rule">${mode==="man"?"Giữ ≡ rồi kéo lên/xuống. Trận trên cùng vào sân trước khi bấm Tạo trận.":"App tự xếp theo tiến độ: cặp nghỉ lâu vào trước, không để một cặp đánh liền 2 trận."}</small>
    <div class="srtl" data-srt="kord">${(mode==="man"?L:seq).map(row).join("")||`<p class="rule">Không còn trận chờ.</p>`}</div>
    <div class="hqcta two">${mode==="man"?`<button class="btn-line" data-act="kordm" data-v="auto">↺ Về theo tiến độ</button><button class="ball go" data-act="kordok">✓ Lưu thứ tự</button>`:`<button class="btn-line" data-act="kordx">Đóng</button><button class="ball go" data-act="kordok">✓ Dùng theo tiến độ</button>`}</div>`;
}
async function kOrdAct(act,b){
  const D=derive(),GD=gDerive(D);if(!GD)return false;const v=b.dataset.v;
  if(act==="kord"){kSh=null;kOrdPg=true;kOrd=null;kOrdMode=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="kordx"){kOrdPg=false;kOrd=null;kOrdMode=null;render();return true}
  if(act==="kordm"){kOrdMode=v==="man"?"man":"auto";if(kOrdMode==="auto")kOrd=null;render();return true}
  if(act==="kordok"){const mode=kOrdMode||(GD.G.preOn===true?"man":"auto");
    if(mode==="auto")await write(()=>saveG({preOn:false}),"Đã để app xếp theo tiến độ");
    else{const by=new Map(GD.games.map(g=>[g.key,g])),P=(kOrd||kOrdSeq(D,GD).map(g=>g.key)).map(k=>by.get(k)).filter(g=>g&&g.st==="wait").map((g,i)=>({id:"gp"+Date.now().toString(36)+i,x:g.x,y:g.y}));
      await write(()=>saveG({preOn:true,presets:P}),"Đã lưu thứ tự trận")}
    kOrdPg=false;kOrd=null;kOrdMode=null;render();return true}
  return false;
}
