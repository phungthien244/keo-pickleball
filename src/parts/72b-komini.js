/* ---------- Chia bảng → Knockout · Mini App (Quản lý) theo canvas trang kb ----------
   Trước ngày đánh: cặp = 2 đăng ký cùng reg.team (mã đội = team). Ghép cặp, hạt giống, chia bảng lưu trên giải (sched.kd):
   kd = {groups:[{p:[mã đội…]}], seeds:[mã…], seedSel:[mã…], noSeed, at, by, n, pub, sub:{mã:{from,pid}}, late:{mã:1}, drop:{mã:1}}.
   Bấm "Bắt đầu vòng bảng": tạo cặp trong giải đang chạy với id "t_"+mã đội, chia bảng theo kd, rồi tạo lịch như cũ. */
let kPg=null,kSh=null,kSel=null,kMode="lv",kAvoid=true,kPrev=null,kDraw=null,kFix=null,kSeg="san";
const kOn=X=>!!(X&&X.fmt==="giai"&&X.ko);
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
    h=gmNextBox({t:`Đã chia ${N} bảng · ${kd.pub?"đã công bố":"công bố vào nhóm"}`,s:`Lịch dự kiến: vòng bảng ${games} trận${t0?`, ${hm(t0)}–${hm(t0+mins*6e4)}`:""}`},false)+kGrid(T,kd.groups,kd.seeds);
    if(rest.length)h+=`<span class="gmlb">Chưa xếp bảng · ${rest.length} cặp</span><div class="g2fl">${rest.map(t=>`<button data-act="k10sw" data-v="${esc(t.code)}" aria-pressed="${kSel===t.code}">${t.nm}</button>`).join("")}</div>`;
    h+=`<small class="rule">Đổi chỗ 2 cặp: chạm cặp này rồi chạm cặp kia.</small>`;
    if(s!=="done"&&s!=="cancel")h+=`<div class="hqcta two"><button class="btn-line" data-act="ksh" data-v="chia">🎲 Bốc lại</button><button class="ball go" data-act="k10pub">📣 Công bố vào nhóm</button></div>`;
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
  if(kSh==="more"){const s=xState(X);return sh("Thêm việc",it("＋","Thêm cặp","Ghi tay cặp đăng ký ngoài app","gmxa")+it("👥","Mời từ CLB","Gửi tin cho người chưa đăng ký","xbshare")+it("★","Hạt giống",`${kN(X)} cặp mạnh tách ${kN(X)} bảng`,"kpg","k8")+it("▦","Chia bảng","Bốc thăm, chia đều hoặc tự xếp","ksh","chia")
    +(xOpen(X)?it("🔒",armed("xbclose:"+X.id)?"Bấm lần nữa để đóng":"Đóng đăng ký","Không nhận thêm cặp","xbclose"):"")+it("✎","Sửa giải","Ngày, sân, thể thức, lệ phí","gmxe")+(s!=="cancel"&&s!=="done"&&s!=="live"?it("✕",armed("xcancel:"+X.id)?"Bấm lần nữa để huỷ giải":"Huỷ giải","Báo cho mọi người đã đăng ký","xcancel",null,1):""))}
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
    const o=kDraw.order[kDraw.k++],t=kTeamOf(T(),o.c);if(t&&!loaMuted())speak(`${t.nm.replace(/&amp;/g,"và")}, vào bảng ${KOG[o.g]}`,"","kd:"+kDraw.k);render();return true}
  if(act==="k9cpick"){kSel=kSel===v?null:v;render();return true}
  if(act==="k9cput"){if(!kSel||!kFix)return true;const cap=Math.ceil(T().length/kN(X)),g=kFix[+v];if(!g||g.length>=cap){toast("Bảng này đã đủ.");return true}g.push(kSel);kSel=null;render();return true}
  if(act==="k9cout"){if(!kFix)return true;for(const g of kFix){const i=g.indexOf(v);if(i>=0)g.splice(i,1)}render();return true}
  if(act==="k9cauto"){if(!kFix)return true;const cap=Math.ceil(T().length/kN(X)),inG=new Set(kFix.flat()),R=T().filter(t=>!inG.has(t.code)).sort((a,b)=>b.r-a.r);
    const sum=g=>g.reduce((a,c)=>a+((kTeamOf(T(),c)||{}).r||0),0);for(const t of R){const L=kFix.map((g,i)=>[i,g]).filter(([,g])=>g.length<cap).sort((a,b)=>a[1].length-b[1].length||sum(a[1])-sum(b[1]));if(L.length)L[0][1].push(t.code)}render();return true}
  if(act==="k9cok"){if(!kFix)return true;const G=kFix;await saveKd(X,{groups:G,seeds:G.map(g=>g[0]).filter(Boolean),at:Date.now(),by:who(),n:(kdOf(X).n||0)+1,pub:false},"Đã lưu chia bảng");kPg=null;kFix=null;render();top();return true}
  if(act==="k10sw"){const kd=kdOf(X);if(!kd.groups)return true;if(!kSel||kSel===v){kSel=kSel===v?null:v;render();return true}
    const G=kd.groups.map(g=>g.slice()),pos=c=>{for(let i=0;i<G.length;i++){const j=G[i].indexOf(c);if(j>=0)return [i,j]}return null},a=pos(kSel),c=pos(v);
    if(a&&c){G[a[0]][a[1]]=v;G[c[0]][c[1]]=kSel}else if(c&&!a)G[c[0]][c[1]]=kSel;else if(a&&!c)G[a[0]][a[1]]=v;kSel=null;await saveKd(X,{groups:G},"Đã đổi chỗ 2 cặp");return true}
  if(act==="k10pub"){const kd=kdOf(X);if(!kd.groups)return true;await sendText(kGroupText(D,X,T(),kd.groups));await saveKd(X,{pub:true});return true}
  if(act==="kx")return true;
  return false;
}
