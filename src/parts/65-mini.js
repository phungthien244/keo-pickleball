/* ---------- Zalo Mini App: giao diện riêng cho người chơi (dùng chung dữ liệu với web) ----------
   Tab dưới: Trang chủ · Trực tiếp · Xếp hạng · Lịch sử · Tôi. Chưa có CLB: Khám phá · Tôi. */
let mxSheet=null,mxSeg={rank:"clb",hist:"buoi",live:"san"},mxDk=null,mxCheck=false;
const mxPid=()=>myPid();
const mxMe=D=>{const id=mxPid();return id?D.pmap.get(id):null};
const mxIco={home:'<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/>',live:'<circle cx="12" cy="12" r="3"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7"/>',rank:'<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0zM7 6H4v2a3 3 0 0 0 3 3M17 6h3v2a3 3 0 0 1-3 3"/>',hist:'<rect x="4" y="5" width="16" height="16" rx="2"/><path d="M4 10h16M9 3v4M15 3v4"/>',me:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',find:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  reg:'<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 3h6v3H9zM9 11h6M9 15h4"/>',court:'<rect x="3" y="5" width="18" height="14" rx="1"/><path d="M12 5v14M3 12h18"/>',money:'<rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/>',ppl:'<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6"/>',more:'<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>'};
const mxSvg=k=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${mxIco[k]}</svg>`;
const mxDate=t=>{const d=new Date(t);return `<span class="mxdate"><small>${["CN","T2","T3","T4","T5","T6","T7"][d.getDay()]}</small><b>${d.getDate()}</b><small>THG ${d.getMonth()+1}</small></span>`};
// Thanh tiêu đề Zalo đã có nút quay lại: không vẽ nút quay lại trong trang
const mxBack=()=>"";

/* ----- Khung chung: dòng CLB, thanh lượt của tôi, nội dung, nút cố định, thanh dưới ----- */
function mxCur(){if(route==="vdv"||route==="cmp")return "rank";if(route==="buoi")return "hist";if(route==="home")return "home";
  return {san:"live",bxh:"rank",ls:"hist",tien:"hist",toi:"me",dk:"home",gt:"home",nguoi:"rank"}[tab]||"home"}
// Thanh đầu riêng (đã ẩn thanh Zalo): chừa ~100px bên phải cho nút "··· ✕" của Zalo
function mxSubT(D){
  if(route==="vdv")return {t:D.pmap.get(routePid)?.name||"Hồ sơ"};
  if(route==="cmp")return {t:"So kè"};
  if(route==="buoi")return {t:"Kết quả buổi"};
  if(route==="chot")return {t:"Chốt buổi"};
  if(route==="caidat")return {t:"Cài đặt"};
  if(route==="app"&&tab==="gt")return {t:"Giới thiệu",ov:String((CLUB||{}).cover||"").startsWith("data:image/")};
  if(route==="app"&&tab==="nguoi"&&mxMode()!=="ql")return {t:"Thành viên"};
  const X=route==="app"&&tab==="dk"&&routeX?schedById(routeX):null;
  if(X)return {t:xName(X),ov:mxMode()!=="ql"&&!!(X.poster&&posterCache[X.id])};
  return null;
}
function mxStat(D){
  const tag=(c,l,t,go)=>`<a class="mxst ${c}" href="${go[0]}" ${go[1]}><span class="tg">${c==="live"?`<i class="dot on"></i>`:""}${l}</span><span class="tx">${esc(t)}</span></a>`;
  if(phaseOf(D)==="live")return tag("live","Trực tiếp",D.playing.length?`Đang đánh · ${D.playing.length} sân`:"Giải đấu đang diễn ra",[pathOf("app",{tab:"san"}),`data-go="app" data-t="san"`]);
  const U=typeof schedUp==="function"?schedUp():[],X=U.find(xOpen)||U[0];
  if(X){const op=xOpen(X);return tag(op?"open":"next",op?"Mở đăng ký":"Sắp tới",`${xName(X)}${X.at?" · "+dowVN(X.at)+" "+dmy(X.at):""}`,[pathOf("app",{tab:"dk",x:X.id}),`data-go="app" data-t="dk" data-x="${esc(X.id)}"`])}
  const n=D.players.filter(p=>p.active!==false).length;
  return tag("","CLB",n?`${n} thành viên`:"pikeco.app",[pathOf("app",{tab:"gt"}),`data-go="app" data-t="gt"`]);
}
function mxHead(D,ql,sw,p,nm){
  const sb=mxSubT(D);
  if(sb)return `<header class="mxhd sub${sb.ov?" ov":""}"><button class="mxbk" data-act="mxback" aria-label="Quay lại"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button><b class="tt">${esc(sb.t)}</b></header>${sb.ov?"":`<div class="mxhsp"></div>`}`;
  return `<header class="mxhd"><button class="mxclub" data-act="mxsheet">${clubAv(CLUB||{id:CID},"",nm)}<span class="t"><b>${esc(nm)} <i aria-hidden="true">▾</i></b><small>pikeco.app</small></span></button></header><div class="mxhsp"></div>`
    +`<div class="mxstrip">${mxStat(D)}${sw}<a class="mxme" href="${pathOf("app",{tab:"toi"})}" data-go="app" data-t="toi" aria-label="Tôi">${p?av(p,"sm",1):mxSvg("me")}</a></div>`+(ql?"":mxTurn(D));
}
// Thanh đầu trang nền tảng (Khám phá, Tôi, Tạo CLB)
const mxHeadP=(t,right="",back="")=>`<header class="mxhd${back?" sub":""}">${back}<b class="tt">${t}</b>${right}</header><div class="mxhsp"></div>`;
function mxShell(D,body,cta=""){
  const p=mxMe(D),nm=(CLUB&&CLUB.name)||D.c.title;
  const R0=mxAs||{cw:canWrite,rf:REF},ql=mxMode()==="ql",sw=!legacy&&(R0.cw||R0.rf)?`<span class="mxsw" role="group" aria-label="Chế độ"><button data-act="mxmode" data-v="choi" aria-pressed="${!ql}">Chơi</button><button data-act="mxmode" data-v="ql" aria-pressed="${ql}">${R0.cw?"Quản lý":"Trọng tài"}</button></span>`:"";
  let h=mxHead(D,ql,sw,p,nm)+`<div class="mxbody">${body}</div>`;
  if(cta)h+=`<div class="mxcta">${cta}</div>`;
  h+=ql?mxMgrNav():mxNav();
  return h+mxSheetHtml()+(ql?ckPopup(D):"");
}
function mxNav(){
  const it=(k,t,go,lb)=>`<a class="${mxCur()===k?"on":""}" href="${go}" ${t}>${mxSvg(k==="hist"?"hist":k)}<span>${lb}</span></a>`;
  return `<nav class="mxnav">${it("home",`data-go="home"`,pathOf("home"),"Trang chủ")}${it("live",`data-go="app" data-t="san"`,pathOf("app",{tab:"san"}),"Trực tiếp")}${it("rank",`data-go="app" data-t="bxh"`,pathOf("app",{tab:"bxh"}),"Xếp hạng")}${it("hist",`data-go="app" data-t="ls"`,pathOf("app",{tab:"ls"}),"Lịch sử")}${it("me",`data-go="app" data-t="toi"`,pathOf("app",{tab:"toi"}),"Tôi")}</nav>`;
}
// Đang nạp CLB (vừa chuyển CLB): dựng sẵn khung Mini App, không lộ giao diện web
function mxLoading(){
  const k=myClubs().find(x=>x.id===CID),nm=(CLUB&&CLUB.name)||(k&&k.name)||"";
  return `<header class="mxhd"><span class="mxclub">${clubAv(k||{id:CID,name:nm},"",nm)}<span class="t"><b>${esc(nm)}</b><small>pikeco.app</small></span></span></header><div class="mxhsp"></div><div class="mxstrip"><span class="mxst"><span class="tg">CLB</span><span class="tx">Đang tải…</span></span></div><div class="mxbody">${skeleton()}</div>${mxMode()==="ql"?mxMgrNav():mxNav()}`;
}
// Thanh "Lượt của tôi": ghim khi buổi đang diễn ra và mình có mặt
function mxTurn(D){
  const p=mxMe(D);if(!p||phaseOf(D)!=="live"||p.active===false)return "";
  const nm=id=>esc(D.pmap.get(id)?.name||"?");
  const pm=D.playing.find(m=>[...m.a,...m.b].includes(p.id));
  if(pm){const mine=pm.a.includes(p.id)?pm.a:pm.b,opp=pm.a.includes(p.id)?pm.b:pm.a,mate=mine.find(x=>x!==p.id);
    return `<a class="mxturn on" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><b>Bạn đang đánh sân ${esc(cName(pm.court))}</b><span>${mate?`Cặp ${nm(mate)} · `:""}gặp ${opp.map(nm).join(" & ")}</span></a>`}
  if(isG(D.c))return "";
  const q=waitQueue(D).findIndex(x=>x.id===p.id);if(q<0)return "";
  const per=Math.max(1,(+D.c.courts||2)*4),turns=Math.floor(q/per);
  return `<a class="mxturn" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><b>${turns?`Bạn vào sân sau khoảng ${turns} lượt`:"Bạn sắp vào sân"}</b><span>Thứ ${q+1} trong hàng chờ</span></a>`;
}
// Bảng chuyển CLB
function mxSheetHtml(){
  if(mxSheet!=="club")return "";exCacheLoad();
  const C=myClubs(),row=c=>`<button class="mxrow${c.id===CID&&MODE==="club"?" cur":""}" data-act="miniclub" data-id="${esc(c.id)}">${clubAv(c)}<span class="t"><b>${esc(c.name||c.id)}</b><small>${esc(c.role||"Đã xem")}</small></span>${c.id===CID&&MODE==="club"?`<span class="ck">✓</span>`:""}</button>`;
  const man=C.filter(c=>/Chủ|Quản lý|Trọng tài/.test(c.role||"")),join=C.filter(c=>!man.includes(c));
  return `<div class="mxdim" data-act="mxsheetx"></div><div class="mxsheet" role="dialog" aria-label="Chuyển CLB"><span class="grab"></span><b class="mxh">Chuyển CLB</b>
    ${man.length?`<span class="mxsec">Đang quản lý</span>${man.map(row).join("")}`:""}
    <span class="mxsec">${join.length?"Đang tham gia":"Chưa tham gia CLB nào"}</span>${join.map(row).join("")}
    <button class="line wide" data-act="miniexplore">⌕ Khám phá CLB khác</button>
    <button class="ghost wide" data-act="mxtao">＋ Tạo CLB mới</button></div>`;
}
const mxRole=()=>{const L=S.link;if(canWrite)return ROLE==="owner"?"Chủ CLB":"Quản lý";if(REF)return "Trọng tài";
  if(L&&L.status==="ok")return "Thành viên";if(L&&L.status==="pending")return "Chờ duyệt";
  const D=derive(),g=authUser&&(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===authUser.uid&&x.guest);return g?"VĐV ngoài CLB":"Đã xem"};

/* ----- 1 · Trang chủ: tự đổi theo lúc mở ----- */
function mxHome(D){
  const p=mxMe(D),live=phaseOf(D)==="live",H=lastHist(D);
  let h="";
  if(!p&&!(S.link&&S.link.status==="pending")&&!mxMyReg(D))h+=mxIntroTeaser(D);
  if(live){const s=p&&D.st.get(p.id),M=p&&money(D),k=p&&M.att.some(x=>x.id===p.id)?payRow(D,M,p.id).pay:0;
    h+=`<a class="mxcard live" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><span class="lbl"><span class="dot"></span>Đang đánh</span><b>${esc(sessTitle(D.c,D.sid))}</b><span>${D.playing.length} sân · ${D.players.filter(x=>x.active!==false).length} người · ${D.done.length} trận xong</span></a>`;
    if(s&&s.g){const all=[...D.players].filter(x=>D.st.get(x.id).g).sort((a,b)=>D.st.get(b.id).w/D.st.get(b.id).g-D.st.get(a.id).w/D.st.get(a.id).g),rk=all.findIndex(x=>x.id===p.id)+1;
      h+=`<div class="mxcard"><div class="mxkv"><span>Hôm nay</span><b>${s.w} thắng · ${s.l} thua</b></div><div class="mxkv"><span>Hạng hôm nay</span><b>#${rk} · <span class="${dCls(s.d)}">${dTxt(s.d)}</span></b></div>${k?`<div class="mxkv"><span>Chi phí tạm tính</span><b>${fmtK(k)}</b></div>`:""}</div>`}
  }
  // Các buổi sắp tới: mỗi buổi một thẻ, đăng ký riêng
  const XC=(S.sched||[]).length?xPlayerCards(D):"";
  if(XC)h+=`<span class="mxsec">Giải đấu sắp tới</span>${XC}`;
  else if(!live&&regOpen())h+=mxSessCard(D,true);
  if(!live&&H){const r=p&&(H.rows||[]).find(x=>x.id===p.id);
    h+=`<a class="mxcard" href="${pathOf("buoi",{sid:H.sid})}" data-go="buoi" data-id="${H.sid}"><span class="lbl">Giải đấu vừa xong · ${dmy(H.startedAt||H.endedAt)}</span><b>${esc(H.sname||`Giải đấu #${H.sid}`)}</b><span>${H.matchCount||0} trận${H.rows&&H.rows[0]?` · nhất ${esc(H.rows[0].name)}`:""}</span>${r?`<span class="mxmine">Bạn: ${r.w||0} thắng ${r.l||0} thua · <span class="${dCls(+r.d)}">${dTxt(+r.d)}</span></span>`:""}</a>`}
  if(!live&&!XC&&!regOpen())h+=H?`<div class="mxcard muted"><b>Chưa mở đăng ký giải đấu tới</b><span>Chủ CLB mở là bạn thấy ở đây.</span></div>`:`<div class="mxcard muted"><b>CLB chưa có giải đấu nào</b><span>Chủ CLB mở đăng ký là bạn thấy ở đây.</span></div>`;
  if(p){const dt=debts().filter(x=>x.id===p.id),sum=dt.reduce((a,x)=>a+x.k,0);
    if(sum>0)h+=`<button class="mxcard warn" data-act="mxtien"><b>Bạn còn ${fmtK(sum)} chưa trả</b><span>${dt.length} giải đấu · bấm để chuyển khoản</span></button>`}
  const top=[...D.players].sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating).slice(0,3);
  if(top.length)h+=`<div class="mxcard"><div class="mxhd"><b>Top rating</b><a href="${pathOf("app",{tab:"bxh"})}" data-go="app" data-t="bxh">Xem tất cả ›</a></div>${top.map((x,i)=>`<div class="mxli" data-pid="${x.id}"><span class="no">${i+1}</span>${av(x,"sm",1)}<span class="t">${esc(x.name)}</span><b class="num">${r2(D.st.get(x.id).rating)}</b></div>`).join("")}</div>`;
  h+=`<div class="mxtiles">${fundView()==="off"?"":`<a class="mxtile" href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"><small>Quỹ CLB</small><b class="num">${(fundNow()<0?"−":"")+fmtK(Math.abs(fundNow()))}</b></a>`}<a class="mxtile" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi"><small>Thành viên</small><b class="num">${D.players.filter(x=>!x.guest).length}</b></a><a class="mxtile" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><small>Giới thiệu</small><b>CLB ›</b></a></div>`;
  const cta=!live&&!XC&&regOpen()?mxRegCta(D):"";
  return mxShell(D,h,cta);
}
const mxMyReg=D=>authUser&&(S.regs||[]).find(x=>x.sid===regKey(D)&&x.uid===authUser.uid&&!x.cancel&&!isHeldOut(x));
function mxIntroTeaser(D){
  if(!CLUB)return "";
  return `<a class="mxcard intro" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><b>Chào mừng tới ${esc(CLUB.name)}</b><span>${esc(CLUB.sched||CLUB.city||"Xem giới thiệu CLB")} ›</span></a>`;
}
// Thẻ buổi tới (dùng ở Trang chủ, Khám phá, Giới thiệu)
function mxSessCard(D,link){
  const r=regCfg(),R=regList(D),c=RX?{...D.c,...RX,sname:xName(RX)}:D.c,pct=R.max<999?Math.min(100,Math.round(R.conf.length/R.max*100)):0,left=R.max<999?Math.max(0,R.max-R.conf.length):null;
  const chips=[`${c.courts} sân`,fmtTxt(c),lvTxt(r),feeMem()?`${fmtK(feeMem())}/người`:"",r.guests?"Nhận VĐV ngoài CLB":""].filter(Boolean);
  const faces=R.conf.slice(0,6).map(x=>av(D.pmap.get(x.pid)||{name:x.name},"xs",1)).join("");
  return `<${link?`a href="${pathOf("app",{tab:"dk",x:RX?RX.id:null})}" data-go="app" data-t="dk"${RX?` data-x="${esc(RX.id)}"`:""}`:"div"} class="mxcard sess">
    <div class="mxsess">${r.at?mxDate(r.at):`<span class="mxdate"><b>?</b></span>`}<span class="t"><b>${esc(c.sname||"Giải đấu tới")}</b><span>${r.at?`${hm(r.at)}${r.end?`–${r.end}`:""}`:"Chưa đặt giờ"}${r.place?` · ${esc(r.place)}`:""}</span>${r.map?`<span class="mxlink" data-act="openurl" data-v="${esc(r.map)}">Chỉ đường ↗</span>`:""}</span></div>
    <div class="rgchips">${chips.map(x=>`<span>${esc(x)}</span>`).join("")}</div>
    ${R.max<999?`<div class="mxprog"><i style="width:${pct}%"></i></div>`:""}
    <div class="mxkv"><span><b class="num" style="color:var(--win)">${R.conf.length}${R.max<999?`/${R.max}`:""}</b> đã đăng ký${left!=null?` · ${left?`còn ${left} chỗ`:"hết chỗ"}`:""}${R.wait.length?` · ${R.wait.length} chờ`:""}</span><span class="mxfaces">${faces}</span></div>
  </${link?"a":"div"}>`;
}
function mxRegCta(D){
  const mine=mxMyReg(D);
  if(mine)return `<a class="primary wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">${mine.pay==="none"&&payOn()&&feeOf(mine)>0?"Xem vé · chuyển khoản":"✓ Bạn đã đăng ký · xem vé"}</a>`;
  if(regClosed())return "";
  const R=regList(D),full=R.conf.length>=R.max,k=feeMem();
  return `<a class="primary wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">${full?"Vào danh sách chờ":`Đăng ký${k?` · ${kVND(k)}`:""}`}</a>`;
}

/* ----- 2 · Chi tiết buổi + đăng ký + vé ----- */
function mxSession(D){
  if(!(S.sched||[]).length&&!routeX)return mxSessionX(D);
  const X=xPick();
  if(X)return withX(X,()=>mxSessionX(D));
  if(mxDk==="pick"||(S.link&&S.link.status==="pending")||(mxDk==="guest"&&regOpen()))return mxSessionX(D);
  const c=xPlayerCards(D,{all:true});
  return mxShell(D,c?`<span class="mxsec">Giải đấu sắp tới</span>${c}`:`<div class="mxcard muted"><b>Chưa có giải đấu nào mở đăng ký</b><span>Chủ CLB mở là bạn thấy ở đây.</span></div>`);
}
function mxSessionX(D){
  const R=regList(D),r=regCfg(),u=authUser,mine=mxMyReg(D),linked=S.link&&S.link.status==="ok";
  let h=mxBack("home","Trang chủ");
  if(RX?xState(RX)==="live":phaseOf(D)==="live")return mxShell(D,h+`<div class="mxcard live"><b>Giải đấu đang diễn ra</b><span>Xem sân ở tab Trực tiếp.</span></div>`);
  if(RX&&mxDk!=="pick"&&mxDk!=="guest")return gdPage(D);
  if(isPlayer(u)&&!linked&&(mxDk==="pick"||(S.link&&S.link.status==="pending")))return mxShell(D,h+linkCard(D)+(regOpen()&&!mine?mxSessCard(D)+(regCfg().guests?`<button class="line wide" data-act="mxdk" data-v="guest">Đăng ký làm vận động viên ngoài CLB giải đấu này</button>`:""):""));
  if(!regOpen())return mxShell(D,h+`<div class="mxcard muted"><b>Chưa mở đăng ký giải đấu tới</b><span>Chủ CLB mở đăng ký là bạn thấy ở đây.</span></div>`);
  if(!isPlayer(u))return mxShell(D,h+mxSessCard(D)+`<div class="mxcard"><b>Đang vào bằng Zalo…</b>${zaloBtn("Vào lại bằng Zalo")}</div>`);
  if(mine){
    const pos=R.all.indexOf(mine),k=feeOf(mine),pay=mine.pay||"none",nm=mine.guest?mine.name:D.pmap.get(mine.pid)?.name,locked=r.at&&Date.now()>regLockAt();
    h+=`<div class="mxcard ticket"><b>${pos<R.max?`✓ Bạn đã giữ chỗ #${pos+1}`:`Bạn đang chờ · thứ ${pos-R.max+1}`}</b><span>${esc(whenFull(r))}${r.place?` · ${esc(r.place)}`:""}</span>${mine.arrived?`<span class="mxmine">Đã điểm danh tại sân ✓</span>`:""}</div>`;
    if(payOn()&&k>0){h+=`<div class="mxcard"><div class="mxhd"><b>${pay==="ok"?"Đã trả ":pay==="sent"?"Đã báo chuyển ":"Chuyển khoản "}${kVND(k)}</b><span class="paychip ${pay}">${PAYLB[pay]}</span></div>${pay==="none"?payBox(D,nm,k):""}${pay==="none"&&regPayMode()==="req"?`<small class="rule">Giữ chỗ tới ${hm((mine.at||0)+HOLD_MS)}.</small>`:""}</div>`}
    h+=mxSessCard(D)+mxWho(D,R)+`<div class="mxacts"><button class="line" data-act="mxcal">📅 Thêm vào lịch</button><button class="line" data-act="mxinvite">Mời bạn</button></div>`;
    if(!locked)h+=`<button class="ghost danger wide" data-act="regout">${armed("regout:x")?"Bấm lần nữa để hủy":"Hủy đăng ký"}</button>`;else h+=`<small class="rule" style="text-align:center">Đã qua giờ khóa hủy.</small>`;
    return mxShell(D,h,pay==="none"&&payOn()&&k>0?`<button class="primary wide" data-act="regpaid">Tôi đã chuyển khoản</button>`:"");
  }
  // Chưa đăng ký
  if(mxDk==="guest"&&r.guests)return mxShell(D,h+guestForm(D));
  h+=mxSessCard(D)+(r.note?`<div class="mxcard muted"><span>${esc(r.note)}</span></div>`:"")+mxWho(D,R);
  if(regClosed())return mxShell(D,h+`<div class="mxcard muted"><b>Đã hết hạn đăng ký</b></div>`);
  const full=R.conf.length>=R.max,k=feeMem();
  if(linked){
    if(payOn()&&k>0&&!full){h+=`<div class="mxcard"><div class="mxhd"><b>Chuyển khoản ${kVND(k)}</b></div>${payBox(D,D.pmap.get(S.link.pid)?.name,k)}</div>`;
      return mxShell(D,h,`<button class="primary wide" data-act="regin" data-v="sent">Đăng ký và đã chuyển khoản</button><button class="line wide" data-act="regin" data-v="none">${regPayMode()==="req"?"Giữ chỗ 30 phút, chuyển sau":"Đăng ký, trả tại sân"}</button>`)}
    return mxShell(D,h,`<button class="primary wide" data-act="regin" data-v="none">${full?"Vào danh sách chờ":"Đăng ký tham gia"}</button>`);
  }
  return mxShell(D,h,`<button class="primary wide" data-act="mxsheetreg">${full?"Vào danh sách chờ":"Đăng ký tham gia"}</button>`)+(mxSheet==="reg"?`<div class="mxdim" data-act="mxsheetx"></div><div class="mxsheet"><span class="grab"></span><b class="mxh">Bạn đăng ký với tư cách</b>
    <button class="mxchoice" data-act="mxdk" data-v="pick"><b>Tôi là thành viên ${esc(CLUB?.name||"CLB")}</b><small>Gửi tên của bạn, chủ CLB xác nhận một lần</small></button>
    ${r.guests?`<button class="mxchoice" data-act="mxdk" data-v="guest"><b>Tôi là VĐV ngoài CLB</b><small>Đăng ký ngay giải đấu này, không cần chờ duyệt${feeGuest()?` · ${fmtK(feeGuest())}`:""}</small></button>`:`<small class="rule">Giải đấu này chỉ dành cho thành viên.</small>`}</div>`:"");
}
function mxWho(D,R){
  if(!R.all.length)return "";
  const f=x=>{const p=D.pmap.get(x.pid);return `<span class="rgp">${av(p||{name:x.name},"sm",1)}<small>${esc(p?.name||x.name||"?")}${x.guest?" · VĐV ngoài CLB":""}${x.arrived?" ✓":""}</small></span>`};
  return `<div class="mxcard"><div class="mxhd"><b>Ai đi (${R.conf.length})</b>${R.wait.length?`<span class="t2">${R.wait.length} người chờ</span>`:""}</div><div class="rgl">${R.conf.map(f).join("")}</div>${R.wait.length?`<span class="lbl">Danh sách chờ</span><div class="rgl wt">${R.wait.map(f).join("")}</div>`:""}</div>`;
}

/* ----- 3 · Trực tiếp ----- */
function mxLive(D){
  const live=phaseOf(D)==="live";
  if(!live){const nx=schedUp().find(x=>x.st!=="draft");
    return mxShell(D,`<div class="mxcard muted"><b>Chưa có giải đấu đang đánh</b><span>${nx?`Giải đấu tới: ${esc(dowVN(nx.at))} ${esc(dmy(nx.at))} · ${esc(xTime(nx))}`:regOpen()?`Giải đấu tới: ${esc(whenFull(regCfg()))}`:"Khi giải đấu bắt đầu, sân và tỉ số hiện ở đây, cập nhật ngay."}</span></div>`+(nx?xPlayerCards(D,{max:1}):regOpen()?mxSessCard(D,true):""))}
  if(isG(D.c))return mxShell(D,`<div class="mxlivewrap">${vGiaiSan(D)}</div>`);
  const seg=mxSeg.live,sb=(v,l)=>`<button data-act="mxseg" data-k="live" data-v="${v}" aria-pressed="${seg===v}">${l}</button>`;
  let h=`<div class="mxseg">${sb("san",`Sân · ${D.playing.length}`)}${sb("cho",`Hàng chờ · ${waitQueue(D).length}`)}${sb("xong",`Đã xong · ${D.done.length}`)}</div>`;
  const me=mxPid();
  if(seg==="san")h+=D.playing.length?`<div class="courts">${D.playing.map(m=>`<div class="${[...m.a,...m.b].includes(me)?"mxminecourt":""}">${courtCard(D,m)}</div>`).join("")}</div>`:`<div class="mxcard muted"><b>Sân đang trống</b><span>Chờ ban tổ chức xếp trận.</span></div>`;
  else if(seg==="cho")h+=queueBox(D,false);
  else h+=doneBox(D);
  return mxShell(D,`<div class="mxlivewrap">${h}</div>`,`<div class="mxacts">${liveShareBtn()}</div>`);
}

/* ----- 4 · Xếp hạng ----- */
function mxRank(D){
  const seg=mxSeg.rank,G=isG(D.c),sb=(v,l)=>`<button data-act="mxseg" data-k="rank" data-v="${v}" aria-pressed="${seg===v}">${l}</button>`;
  let h=`<div class="mxseg">${sb("clb","Rating CLB")}${sb("nay",G?"Xếp hạng cặp":"Hôm nay")}</div>`;
  if(seg==="nay")return mxShell(D,h+`<div class="mxlivewrap">${G?vGiaiBxh(D,gDerive(D)):vBxh(D)}</div>`);
  const f=mxSeg.g||"all",fb=(v,l)=>`<button data-act="mxseg" data-k="g" data-v="${v}" aria-pressed="${f===v}">${l}</button>`;
  const all=[...D.players].filter(p=>!p.guest).sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating);
  const L=all.filter(p=>f==="all"||(f==="F")===(p.gender==="F")),me=mxPid();
  h+=`<div class="mxseg sm">${fb("all","Tất cả")}${fb("M","Nam")}${fb("F","Nữ")}</div>`;
  h+=`<div class="mxcard list">${L.map((p,i)=>{const s=D.st.get(p.id),A=D.all.get(p.id);return `<div class="mxli${p.id===me?" me":""}" data-pid="${p.id}"><span class="no">${i+1}</span>${av(p,"sm",1)}<span class="t">${esc(p.name)}<small>${A.ses.size} giải đấu · thắng ${pct(A.w,A.g)}%</small></span><b class="num">${r2(s.rating)}</b></div>`}).join("")}</div>`;
  const mi=L.findIndex(p=>p.id===me);
  const pin=mi>=0?`<div class="mxpin" data-pid="${me}"><span>Bạn · hạng ${mi+1}/${L.length}</span><b class="num">${r2(D.st.get(me).rating)}</b></div>`:"";
  return mxShell(D,h+`<a class="mxlink2" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi">Danh sách thành viên ›</a>`,pin);
}

/* ----- 5 · Lịch sử · Tiền của tôi · Quỹ CLB ----- */
function mxHist(D){
  const seg=mxSeg.hist,sb=(v,l)=>`<button data-act="mxseg" data-k="hist" data-v="${v}" aria-pressed="${seg===v}">${l}</button>`,me=mxPid();
  let h=`<div class="mxseg">${sb("buoi","Các giải đấu")}${sb("tien","Chi phí của tôi")}${fundView()==="off"?"":sb("quy","Quỹ CLB")}</div>`;
  if(seg==="tien"){
    if(!me)return mxShell(D,h+`<div class="mxcard muted"><b>Tham gia CLB</b><span>Chủ CLB xác nhận xong là bạn xem được chi phí các giải đấu của mình.</span></div>`);
    const dt=debts().filter(x=>x.id===me),sum=dt.reduce((a,x)=>a+x.k,0),p=D.pmap.get(me);
    h+=sum?`<div class="mxcard warn"><b>Bạn còn ${fmtK(sum)} chưa trả</b><span>${dt.map(x=>`Giải đấu #${x.sid}: ${fmtK(x.k)}`).join(" · ")}</span></div>${BANK&&BANK.acc?payBox(D,p?.name,sum):""}`:`<div class="mxcard ok"><b>✓ Bạn không nợ giải đấu nào</b></div>`;
    const paidL=S.hist.filter(x=>(x.rows||[]).some(r=>r.id===me&&(+r.pay||0)>0)).sort((a,b)=>b.sid-a.sid).slice(0,10);
    if(paidL.length)h+=`<div class="mxcard list">${paidL.map(x=>{const r=x.rows.find(z=>z.id===me),ok=(x.paid||{})[me];return `<div class="mxli"><span class="t">Giải đấu #${x.sid} · ${dmy(x.startedAt||x.endedAt)}</span><b class="num">${fmtK(+r.pay)}</b>${x.track?`<span class="paychip ${ok?"ok":"none"}">${ok?"Đã trả":"Chưa"}</span>`:""}</div>`}).join("")}</div>`;
    return mxShell(D,h);
  }
  if(seg==="quy")return mxShell(D,h+`<div class="mxlivewrap">${vSoQuy(D)}</div>`);
  const L=sessList(D);
  h+=L.length?`<div class="mxcard list">${L.map(x=>{const r=me&&(x.rows||[]).find(z=>z.id===me),rk=r?(x.rows||[]).indexOf(r)+1:0,s=x.snap;
    return `<a class="mxli" href="${pathOf("buoi",{sid:x.sid})}" data-go="buoi" data-id="${x.sid}"><span class="t"><b>${esc(s?.sname||`Giải đấu #${x.sid}`)}</b><small>${dmy(x.at)} · ${x.ms.length||s?.matchCount||0} trận${s?.type==="giai"?" · giải cặp":x.rows&&x.rows[0]?` · nhất ${esc(x.rows[0].name)}`:""}</small></span>${rk?`<span class="t2">Hạng ${rk}</span>`:""}<span aria-hidden="true">›</span></a>`}).join("")}</div>`:`<div class="mxcard muted"><b>Chưa có giải đấu nào</b></div>`;
  return mxShell(D,h);
}

/* ----- 6 · Tôi ----- */
function mxMeTab(D){
  const p=mxMe(D),L=S.link;
  let h=dbgCard();
  if(p){const s=D.st.get(p.id),A=D.all.get(p.id),rk=[...D.players].filter(x=>!x.guest).sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating).findIndex(x=>x.id===p.id)+1;
    h+=`<div class="mxcard prof">${av(p,"lg",1)}<span class="t"><b>${esc(p.name)}</b><small>${esc(CLUB?.name||"")} · ${mxRole()}</small></span><a class="line sm" href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}">Hồ sơ</a></div>
    <div class="mxstats"><div><b class="num">${r2(s.rating)}</b><small>Rating</small></div><div><b class="num">#${rk}</b><small>Hạng</small></div><div><b class="num">${A.ses.size}</b><small>Giải đấu</small></div><div><b class="num">${pct(A.w,A.g)}%</b><small>Thắng</small></div></div>${mfMe(D,p)}`;
  }else h+=`<div class="mxcard prof">${mxSvg("me")}<span class="t"><b>${esc(zaloProf().n||"Người dùng Zalo")}</b><small>${L&&L.status==="pending"?"Đang chờ chủ CLB duyệt":mxRole()==="VĐV ngoài CLB"?"Vận động viên ngoài CLB":"Chưa tham gia CLB này"}</small></span></div>${L&&L.status==="pending"?"":`<button class="primary wide" data-act="mxdk" data-v="pick">Tham gia CLB</button>`}`;
  const C=myClubs();
  h+=`<div class="mxcard list">
    ${p?`<a class="mxli" href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}"><span class="t">Hồ sơ, thành tích, sửa ảnh</span><span>›</span></a>`:""}
    <button class="mxli" data-act="mxsheet"><span class="t">CLB của tôi</span><span class="t2">${C.length}</span><span>›</span></button>
    <button class="mxli" data-act="miniexplore"><span class="t">Khám phá CLB khác</span><span>›</span></button>
    <a class="mxli" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><span class="t">Giới thiệu ${esc(CLUB?.name||"CLB")}</span><span>›</span></a>
    ${mxMgr()?"":mxInvBtn()}</div>`;
  h+=`<div class="mxcard list"><span class="mxsec">Quyền riêng tư</span>
    ${L?`<button class="mxli" data-act="mxleave"><span class="t" style="color:var(--lose)">${armed("mxleave:x")?"Bấm lần nữa: rời CLB và xoá thông tin của tôi":"Rời CLB, xoá thông tin của tôi"}</span></button>`:""}
    <button class="mxli" data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}"><span class="t">Điều khoản sử dụng</span><span>↗</span></button>
    <p class="rule" style="margin:6px 0 0">Pikeco chỉ dùng mã Zalo để nhận ra bạn, không lấy số điện thoại hay danh bạ.</p></div>`;
  return mxShell(D,h);
}

/* ----- Giới thiệu CLB ----- */
function mxMembers(D){
  const L=[...D.players].filter(p=>!p.guest).sort((a,b)=>String(a.name).localeCompare(String(b.name),"vi"));
  const q=String(val("mxq","")).toLowerCase().trim(),F=q?L.filter(p=>hasQ(q,p.name)):L;
  return mxShell(D,mxBack("app","Xếp hạng").replace('data-go="app"','data-go="app" data-t="bxh"')+`<label class="srch"><span class="sr">Tìm</span><input id="mxq" data-draft="mxq" data-live="1" type="search" placeholder="Tìm thành viên" value="${esc(val("mxq",""))}"></label>
    <div class="mxcard list">${F.map(p=>`<div class="mxli" data-pid="${p.id}">${av(p,"sm",1)}<span class="t">${esc(p.name)}${p.nick?`<small>“${esc(p.nick)}”</small>`:""}</span><b class="num">${r2(D.st.get(p.id).rating)}</b></div>`).join("")}</div>`);
}

/* ----- So kè đối đầu 1-1 ----- */
function mxCompare(D,id){
  const me=mxPid(),a=D.pmap.get(me),b=D.pmap.get(id);
  if(!a||!b||me===id)return mxShell(D,mxBack("vdv")+`<div class="mxcard muted"><b>Tham gia CLB để so kè với thành viên khác.</b></div>`);
  loadAllMatches();
  const ms=[...(allM||[]),...D.SM.filter(m=>!(allM||[]).some(x=>x.id===m.id))].filter(m=>m.status==="done");
  let vs={g:0,w:0},with_={g:0,w:0},last=[];
  for(const m of ms){const inA=x=>m.a.includes(x),has=x=>inA(x)||m.b.includes(x);if(!has(me)||!has(id))continue;
    const meWin=inA(me)?m.sa>m.sb:m.sb>m.sa;
    if(inA(me)===inA(id)){with_.g++;if(meWin)with_.w++}else{vs.g++;if(meWin)vs.w++;last.push({m,meWin})}}
  last=last.sort((x,y)=>(y.m.doneAt||0)-(x.m.doneAt||0)).slice(0,5);
  const sa=D.st.get(me),sb=D.st.get(id);
  let h=`
    <div class="mxcard vs"><span class="p">${av(a,"lg",1)}<b>${esc(a.name)}</b><small class="num">${r2(sa.rating)}</small></span><span class="sc"><b class="num">${vs.w}–${vs.g-vs.w}</b><small>đối đầu</small></span><span class="p">${av(b,"lg",1)}<b>${esc(b.name)}</b><small class="num">${r2(sb.rating)}</small></span></div>
    <div class="mxcard"><div class="mxkv"><span>Gặp nhau</span><b>${vs.g} trận · bạn thắng ${vs.w}</b></div><div class="mxkv"><span>Đánh cặp chung</span><b>${with_.g} trận · thắng ${with_.w}</b></div><div class="mxkv"><span>Chênh rating</span><b class="num">${(sa.rating-sb.rating>=0?"+":"")+(sa.rating-sb.rating).toFixed(2)}</b></div></div>`;
  if(!allM)h+=`<p class="rule">Đang tải các trận…</p>`;
  else if(last.length)h+=`<div class="mxcard list"><span class="mxsec">Các lần gặp gần đây</span>${last.map(({m,meWin})=>`<div class="mxli"><span class="t">Giải đấu #${m.session||1} · ${[...m.a].map(x=>esc(D.pmap.get(x)?.name||"?")).join(" & ")} vs ${[...m.b].map(x=>esc(D.pmap.get(x)?.name||"?")).join(" & ")}</span><b class="num">${m.sa}–${m.sb}</b><span class="paychip ${meWin?"ok":"none"}">${meWin?"Thắng":"Thua"}</span></div>`).join("")}</div>`;
  else h+=`<div class="mxcard muted"><b>Hai bạn chưa gặp nhau trận nào</b></div>`;
  return mxShell(D,h);
}

/* ----- Thẻ thành tích (ảnh để chia sẻ) ----- */
function mxAchCanvas(D,sid){
  const me=mxPid(),p=D.pmap.get(me),x=sessList(D).find(z=>z.sid===sid);if(!p||!x)return null;
  const r=(x.rows||[]).find(z=>z.id===me);if(!r)return null;
  const rk=x.rows.indexOf(r)+1,cv=document.createElement("canvas");cv.width=cv.height=1080;const g=cv.getContext("2d");
  g.fillStyle="#0c2b44";g.fillRect(0,0,1080,1080);g.fillStyle="#f2e205";g.fillRect(0,0,1080,14);
  g.fillStyle="#a9cbe6";g.font="600 40px sans-serif";g.fillText(String(CLUB?.name||"").toUpperCase()+" · "+dmy(x.at),70,130);
  g.fillStyle="#fff";g.font="800 96px sans-serif";g.fillText(p.name,70,270);
  g.fillStyle="#f2e205";g.font="900 300px sans-serif";g.fillText("#"+rk,60,600);
  g.fillStyle="#fff";g.font="600 54px sans-serif";g.fillText(`${r.w||0} thắng · ${r.l||0} thua`,70,720);
  const d=+r.d;if(Number.isFinite(d)){g.fillStyle=d>=0?"#5dd39e":"#ff8a80";g.fillText(`Rating ${(+r.rating).toFixed(2)}  ${d>=0?"▲":"▼"} ${Math.abs(d).toFixed(2)}`,70,800)}
  g.fillStyle="#a9cbe6";g.font="500 38px sans-serif";g.fillText("pikeco · Zalo Mini App",70,1000);
  return cv;
}

/* ----- Khám phá (chưa có CLB hoặc tìm CLB khác) ----- */
let mxOpen=null,mxOpenLoading=false,mxOpenRun=false;
// Lưu lần trước để mở app là thấy ngay, sau đó cập nhật ngầm
const EXK="pb-ex-cache";
function exCacheLoad(){
  if(exCacheLoad.done)return;exCacheLoad.done=true;
  try{const c=JSON.parse(localStorage.getItem(EXK)||"null");if(!c||Date.now()-c.at>14*864e5)return;
    if(!S.clubs&&Array.isArray(c.clubs)){S.clubs=c.clubs;S.clubsStale=true}
    if(!mxOpen&&Array.isArray(c.open))mxOpen=c.open.filter(x=>x&&x.club&&x.r&&(!x.r.at||x.r.at>Date.now()))}catch(e){}
}
function exCacheSave(){
  try{const cl=(S.clubs||[]).filter(c=>c.public!==false).slice(0,80).map(({id,name,city,size,logo,public:pb,status})=>({id,name,city,size,logo,public:pb,status}));
    localStorage.setItem(EXK,JSON.stringify({at:Date.now(),clubs:cl,open:(mxOpen||[]).slice(0,40)}))}catch(e){}
}
const regCount=(cid,sid)=>FB.getDocs(FB.query(FB.collection(FB.fs,`clubs/${cid}/regs`),FB.where("sid","==",sid))).then(q=>q.docs.filter(d=>!d.data().cancel).length).catch(()=>null);
function loadOpenSess(){
  if(mxOpenRun||mxOpenLoading||!S.clubs||!window.FB)return;mxOpenLoading=true;mxOpenRun=true;
  const now=Date.now();
  // Mọi CLB hỏi cùng lúc; số người đăng ký tải sau, không chặn danh sách
  Promise.all(publicClubs().map(async c=>{try{
    try{const q=await FB.getDocs(FB.query(FB.collection(FB.fs,`clubs/${c.id}/sched`),FB.where("guests","==",true)));
      const L=q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>(x.st==="open"||(x.st==="plan"&&x.openAt&&now>=x.openAt))&&x.at>now&&!(x.deadline&&now>x.deadline));
      if(L.length)return L.map(x=>({club:{id:c.id,name:c.name,city:c.city},r:x,cf:{sname:xName(x),thu:x.thu,phi:x.phi},n:null,x:x.id,sid:x.id}));
      if(q.docs.length)return null}catch(e){}
    const s=await FB.getDoc(FB.doc(FB.fs,`clubs/${c.id}/app/config`));if(!s.exists())return null;const cf=s.data(),r=cf.reg||{};
    if(!(r.on&&r.guests&&(r.sid==null||r.sid===(cf.session||1))))return null;if(r.at&&r.at<now)return null;if(r.deadline&&r.deadline<now)return null;
    return {club:{id:c.id,name:c.name,city:c.city},r,cf:{sname:cf.sname,thu:cf.thu,phi:cf.phi},n:null,sid:cf.session||1}}catch(e){return null}}))
  .then(L=>{const old=new Map((mxOpen||[]).map(x=>[x.club.id+"|"+(x.x||x.sid),x.n]));
    mxOpen=L.flat().filter(Boolean).map(x=>({...x,n:old.get(x.club.id+"|"+(x.x||x.sid))??null})).sort((a,b)=>(a.r.at||9e15)-(b.r.at||9e15));mxOpenLoading=false;render();
    Promise.all(mxOpen.map(x=>regCount(x.club.id,x.sid).then(n=>{if(n!=null)x.n=n}))).then(()=>{render();exCacheSave()})})
  .catch(()=>{if(!mxOpen)mxOpen=[];mxOpenLoading=false;render()});
}
function mxHello(){const n=String(zaloProf().n||"").trim().split(/\s+/).pop();return n?`Chào ${esc(n)} 👋`:"Chào bạn 👋"}
const mxHero=()=>`<div class="mxhero"><b>Chơi pickleball<br>gọn hơn mỗi tuần</b><span>Đăng ký giải đấu, xếp sân tự động, tính rating và chia chi phí ngay trong Zalo. Miễn phí.</span></div>
  <div class="mxhero2"><button class="primary" data-act="mxexgo">Tìm giải đấu</button><button class="line" data-act="mxtao">＋ Tạo CLB</button></div>`;
const mxSteps=()=>`<span class="mxsec">Dùng pikeco thế nào</span><div class="mxcard list mxsteps">
  <div class="mxli"><i>1</i><span class="t"><b>Tìm giải đấu hoặc CLB</b><small>Đăng ký làm vận động viên, giữ chỗ trước</small></span></div>
  <div class="mxli"><i>2</i><span class="t"><b>Đến sân, app tự xếp trận</b><small>Xem sân nào, đánh với ai, điểm trực tiếp</small></span></div>
  <div class="mxli"><i>3</i><span class="t"><b>Xem rating và chi phí của bạn</b><small>Tự cập nhật sau mỗi giải đấu</small></span></div></div>`;
const skSess=()=>`<div class="mxcard sess sk-card" aria-hidden="true"><div class="mxsess"><span class="sk" style="width:52px;height:60px"></span><span class="t" style="gap:8px"><span class="sk" style="height:10px;width:35%"></span><span class="sk" style="height:14px;width:70%"></span><span class="sk" style="height:10px;width:55%"></span></span></div></div>`;
const skClub=()=>`<div class="ccard sk-card" aria-hidden="true"><span class="sk" style="width:48px;height:48px"></span><span class="b" style="gap:8px"><span class="sk" style="height:14px;width:62%"></span><span class="sk" style="height:10px;width:40%"></span></span></div>`;
function mxExplore(){
  exCacheLoad();if(S.clubsStale&&!clubsLoading){S.clubsStale=false;loadClubs(true)}else loadClubs();loadOpenSess();
  try{if(sessionStorage.getItem("pb-mxtao")){sessionStorage.removeItem("pb-mxtao");mxSeg.exTab="tao";setTimeout(mxAskName,300)}}catch(e){}
  if(mxSeg.exTab==="me")return mxExploreMe();
  if(mxSeg.exTab==="tao")return mxCreate();
  const mine=myClubs(),q=noAcc(String(val("cq",""))).toLowerCase().trim(),f=mxSeg.ex||"all";
  const all=publicClubs(),mq=c=>!q||noAcc(`${c.name} ${c.city||""} ${c.id}`).toLowerCase().includes(q);
  // Đang tìm: gộp CLB của bạn và CLB khác vào một danh sách kết quả
  const others=all.filter(c=>(q||!mine.some(m=>m.id===c.id))&&mq(c)),mineQ=q?mine.filter(m=>mq(m)&&!all.some(c=>c.id===m.id)):mine;
  const now=new Date(),endDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime(),wk=d=>[0,6].includes(new Date(d).getDay());
  const O=(mxOpen||[]).filter(x=>(!q||noAcc(`${x.club.name} ${x.club.city||""} ${x.r.place||""}`).toLowerCase().includes(q))&&(f==="all"||(f==="nay"&&x.r.at&&x.r.at<endDay)||(f==="tuan"&&x.r.at&&wk(x.r.at))));
  const fb=(v,l)=>`<button data-act="mxseg" data-k="ex" data-v="${v}" aria-pressed="${f===v}">${l}</button>`;
  let h=mxHeadP(mine.length?"Khám phá":mxHello())+`<div class="mxbody">`;
  if(!mine.length)h+=mxHero();
  h+=`<label class="srch"><span class="sr">Tìm CLB</span><input id="cq" data-draft="cq" data-live="1" type="search" placeholder="Tìm CLB, khu vực, sân…" value="${esc(val("cq",""))}"></label>`;
  h+=`<span class="mxsec" id="mxopen">Giải đấu đang nhận vận động viên</span><div class="mxseg sm">${fb("all","Tất cả")}${fb("nay","Hôm nay")}${fb("tuan","Cuối tuần")}</div>`;
  h+=!mxOpen?skSess()+skSess():O.length?O.map(x=>`<button class="mxcard sess" id="os-${esc(x.club.id)}-${esc(String(x.x||x.sid||""))}" data-act="miniclub" data-id="${esc(x.club.id)}"${x.x?` data-x="${esc(x.x)}"`:""}><div class="mxsess">${x.r.at?mxDate(x.r.at):`<span class="mxdate"><b>?</b></span>`}<span class="t"><span class="mxorg">${gdBand(x.r,true)}${clubAv(x.club,"s20")}<small>${esc(x.club.name)}</small></span><b>${esc(x.cf.sname||"Giải đấu")}</b><span>${x.r.at?hm(x.r.at):""}${x.r.place?` · ${esc(x.r.place)}`:""}${x.r.feeG||x.cf.phi?` · ${fmtK(+(x.r.feeG||((x.cf.thu==="phi")?x.cf.phi:x.r.fee)||0))}`:""}</span></span>${x.n==null?(+x.r.max?`<span class="tagl">${+x.r.max} chỗ</span>`:""):`<span class="tagl">${+x.r.max?`còn ${Math.max(0,+x.r.max-x.n)}`:`${x.n} người`}</span>`}</div></button>`).join("")
    :`<div class="mxcard mxempty"><b>${f==="all"?"Chưa có giải đấu nào đang mở":"Không có giải đấu nào trong thời gian này"}</b><span>Giải đấu của các CLB sẽ hiện ở đây khi mở đăng ký nhận vận động viên.</span></div>`+(mine.length||f!=="all"?"":mxSteps());
  if(q){const R=[...mineQ.map(c=>({...(S.clubs||[]).find(x=>x.id===c.id)||{},...c})),...others];
    h+=`<span class="mxsec">Câu lạc bộ · ${R.length} kết quả</span>`+(!S.clubs&&!R.length?skClub()+skClub():R.length?R.map(clubCard).join(""):`<div class="mxcard mxempty"><span>Không thấy “${esc(val("cq",""))}”. Thử tên khu vực hoặc tên sân.</span></div>`)}
  else{if(mine.length)h+=`<span class="mxsec">CLB của bạn</span>`+mine.map(c=>clubCard({...(S.clubs||[]).find(x=>x.id===c.id)||{},...c})).join("");
    h+=`<span class="mxsec">${mine.length?"CLB khác":"Câu lạc bộ"}</span>`+(!S.clubs?skClub()+skClub()+skClub():others.length?others.map(clubCard).join(""):`<p class="rule">Chưa có CLB nào khác.</p>`)}
  if(mine.length)h+=`<button class="btn-line" data-act="mxtao">＋ Tạo CLB của bạn</button>`;
  h+=`</div><nav class="mxnav"><a class="on" href="#" data-act="mxexfind">${mxSvg("find")}<span>Khám phá</span></a><a href="#" data-act="mxexme">${mxSvg("me")}<span>Tôi</span></a></nav>`;
  return h+mxSheetHtml();
}
function mxExploreMe(){
  const mine=myClubs(),P=zaloProf(),nm=String(P.n||"").trim(),own=S.myClub;
  if(S.myClub===undefined&&isZaloU(authUser))loadMyClub();
  return `${mxHeadP("Tôi")}<div class="mxbody">
    <div class="mxcard prof">${P.p?`<img class="mxav" src="${esc(P.p)}" alt="">`:`<span class="mxav">${nm?esc(nm.charAt(0).toUpperCase()):mxSvg("me")}</span>`}<span class="t"><b>${esc(nm||"Người dùng Zalo")}</b><small>Tài khoản Zalo · ${mine.length?`${mine.length} CLB`:"chưa tham gia CLB nào"}</small></span></div>
    <span class="mxsec">CLB của bạn</span>
    ${mine.length?`<div class="mxcard list">${mine.map(c=>`<button class="mxli" data-act="miniclub" data-id="${esc(c.id)}">${clubAv(c,"s40")}<span class="t">${esc(c.name)}<small>${esc(c.role||"")}</small></span><span>›</span></button>`).join("")}</div>`
      :`<div class="mxcard mxempty"><span>Bạn chưa ở CLB nào. Đăng ký một giải đấu đang mở, hoặc vào trang CLB và chọn tên của bạn để ban tổ chức duyệt.</span><button class="primary wide" data-act="mxexgo">Tìm giải đấu đang mở</button></div>`}
    ${own?"":`<div class="mxcard mxown"><b>Bạn quản lý một CLB?</b><span class="rule">Tạo CLB ngay trong Zalo: mở đăng ký giải đấu, xếp sân tự động, thu lệ phí, chia chi phí, rating từng người.</span><button class="line wide" data-act="mxtao">＋ Tạo CLB miễn phí</button></div>`}
    <div class="mxcard list">${mxInvBtn()}<button class="mxli" data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}"><span class="t">Điều khoản sử dụng</span><span>↗</span></button></div></div>
    <nav class="mxnav"><a href="#" data-act="mxexfind">${mxSvg("find")}<span>Khám phá</span></a><a class="on" href="#" data-act="mxexme">${mxSvg("me")}<span>Tôi</span></a></nav>`;
}
/* ----- Tạo CLB ngay trong Mini App (chủ CLB = tài khoản Zalo) ----- */
let mxAskedName=false;
async function mxAskName(){
  if(mxAskedName||zaloProf().n||!window.ZMP)return;mxAskedName=true;
  try{const ui=await window.ZMP.getUserInfo({autoRequestPermission:true}),u=ui&&ui.userInfo;if(u&&u.name){saveZProf({n:u.name,p:u.avatar||""});render()}}catch(e){}
}
function mxCreate(){
  if(isZaloU(authUser)&&S.myClub===undefined)loadMyClub();
  const P=zaloProf(),nm=String(P.n||"").trim();
  let h=mxHeadP("Tạo CLB","",`<button class="mxbk" data-act="mxtaox" aria-label="Đóng"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>`)+`<div class="mxbody mxform">`;
  if(S.myClub)return h+`<div class="mxcard"><b>Bạn đã là chủ CLB</b><span class="rule">Mỗi tài khoản Zalo tạo được một CLB. CLB của bạn: pikeco.app/${esc(S.myClub)}</span><button class="primary wide" data-act="miniclub" data-id="${esc(S.myClub)}">Mở CLB của bạn</button></div></div>`;
  const name=val("nc-name",""),slug=val("nc-slug","")||slugOf(name);
  const inp=(k,l,v,extra="",hint="")=>`<label class="fld"><span class="lbl">${l}</span><input id="${k}" data-draft="${k}" value="${esc(v)}" ${extra}>${hint?`<span class="hint">${hint}</span>`:""}</label>`;
  h+=`<div class="mxowner"><span class="mxav">${nm?esc(nm.charAt(0).toUpperCase()):mxSvg("me")}</span><span><b>${esc(nm||"Bạn")}</b> (Zalo) sẽ là Chủ CLB. Mời thêm quản lý, trọng tài sau.</span></div>`;
  if(!nm)h+=inp("nc-me","Tên của bạn",val("nc-me",""),'maxlength="40" autocomplete="name" placeholder="Tên hiện trong CLB"');
  h+=inp("nc-name","Tên CLB",name,'maxlength="60" placeholder="CLB Pickleball Quận 7"');
  h+=inp("nc-slug","Đường dẫn",slug,'maxlength="20" autocapitalize="off" placeholder="q7-pickleball"',`pikeco.app/<b>${esc(slug||"…")}</b> · tự tạo từ tên, sửa được`);
  h+=`<div class="two">${inp("nc-city","Tỉnh / thành",val("nc-city",""),'maxlength="40" placeholder="TP.HCM"')}<label class="fld"><span class="lbl">Số thành viên</span><select id="nc-size" data-draft="nc-size">${["Dưới 20","20–50","50–100","Trên 100"].map(x=>`<option ${val("nc-size","20–50")===x?"selected":""}>${x}</option>`).join("")}</select></label></div>`;
  h+=inp("nc-contact","Số Zalo liên hệ",val("nc-contact",""),'inputmode="tel" maxlength="15" placeholder="0901 234 567"',"Chỉ quản trị pikeco.app thấy, dùng để liên hệ khi duyệt CLB.");
  h+=inp("nc-code",`Mã mời <small>(nếu có)</small>`,val("nc-code",""),'maxlength="12" autocapitalize="characters" placeholder="Không bắt buộc"');
  h+=`<div class="mxwarn">Không có mã mời: CLB ở trạng thái <b>Chờ duyệt</b> cho tới khi quản trị pikeco.app duyệt. Trong lúc chờ bạn khai ngân hàng, mời quản lý được; thêm thành viên và tạo giải đấu mở ngay khi CLB được duyệt.</div>`;
  if(errs.tao)h+=`<p class="err">${esc(errs.tao)}</p>`;
  h+=`</div><div class="mxfoot"><button class="primary wide" data-act="nc-create">${S.creating?"Đang tạo…":"Tạo CLB"}</button><span class="hint">Bấm Tạo CLB là đồng ý <a href="#" data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}">Điều khoản sử dụng</a></span></div>`;
  return h;
}
/* Sau khi tạo: thẻ chào + 3 bước bắt đầu ở đầu trang quản lý */
function mxOnboard(D){
  if(ROLE!=="owner"||!CLUB)return "";
  let fresh=false;try{fresh=sessionStorage.getItem("pb-newclub")===CID}catch(e){}
  const pend=clubSt(CLUB)==="pending",hasP=D.players.length>0,hasB=!!(CLUB.bank&&CLUB.bank.acc),hasS=(S.sched||[]).length>0||D.SM.length>0||(S.hist||[]).length>0;
  if(!fresh&&hasP&&hasB&&hasS)return "";
  const st=(n,done,t,s,b,lock)=>`<div class="mxli"><i class="${done?"ok":""}">${done?"✓":n}</i><span class="t"><b>${t}</b><small>${lock?"Mở khi CLB được duyệt":s}</small></span>${done||lock?"":b}</div>`;
  let h=fresh?`<div class="mxcard mxdone"><b>Đã tạo CLB 🎉</b><span class="rule">Link CLB: <b>pikeco.app/${esc(CID)}</b></span>${pend?`<span class="mxtag w">Chờ duyệt · vẫn chuẩn bị được</span>`:""}</div>`:"";
  h+=`<span class="mxsec">Bắt đầu · 3 bước</span><div class="mxcard list mxsteps">`
    +st(1,hasP,"Thêm thành viên","Dán danh sách tên, hoặc gửi link mời",`<a class="mxsm" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi">Thêm</a>`,pend)
    +st(2,hasB,"Khai ngân hàng nhận quỹ","Hiện mã QR khi thu lệ phí, chia chi phí",`<a class="mxsm" href="${pathOf("caidat")}" data-go="caidat">Khai</a>`,false)
    +st(3,hasS,"Tạo giải đấu đầu tiên","Chọn thể thức, mở đăng ký",`<a class="mxsm" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">Tạo</a>`,pend)+`</div>`;
  if(fresh)h+=`<button class="line wide" data-act="mxshareclb">Gửi link CLB vào nhóm Zalo</button>`;
  return h;
}

/* ----- Vẽ Mini App ----- */
/* ----- Dán link mời: dùng được cả ở bản Testing (link zalo.me/s/… luôn mở bản đã duyệt) ----- */
let mxInvOpen=false;
const mxInvBtn=()=>`<button class="mxli" data-act="mxinv"><span class="t">Nhập link mời quản lý / trọng tài</span><span>${mxInvOpen?"−":"+"}</span></button>`+(mxInvOpen?`<div class="mxinv"><label class="fld"><span class="lbl">Dán link hoặc mã mời</span><input id="mx-inv" data-draft="mx-inv" autocomplete="off" placeholder="zalo.me/s/…&amp;moi=… hoặc mã" value="${esc(val("mx-inv",""))}"></label><button class="primary wide" data-act="mxinvgo">Nhận quyền</button></div>`:"");
function parseInv(x){
  x=String(x||"").trim();if(!x)return null;
  const m=x.match(/[?&]moi=([0-9a-z-]+)/i)||x.match(/\/moi\/([0-9a-z-]+)/i),c=x.match(/[?&]clb=([0-9a-z-]+)/i)||x.match(/pikeco\.app\/([0-9a-z-]+)\/moi\//i);
  const tok=m?m[1]:/^[0-9a-z-]{4,40}$/i.test(x)?x:null;if(!tok)return null;
  return {tok,cid:c?c[1].toLowerCase():null};
}
/* ----- Quản lý trong Mini App (chủ CLB, quản lý, trọng tài): dùng lại các trang quản lý của bản web ----- */
const mxMgr=()=>!legacy&&(canWrite||REF);
let mxModeV=null,mxAs=null;
function mxMode(){if(!mxMgr())return "choi";if(mxModeV)return mxModeV;let m=null;try{m=localStorage.getItem("pb-mxm-"+CID)}catch(e){}return m==="choi"?"choi":"ql"}
function mxSetMode(m){mxModeV=m==="choi"?"choi":"ql";try{localStorage.setItem("pb-mxm-"+CID,mxModeV)}catch(e){}}
function mxMgrCur(){
  if(route==="caidat"||route==="buoi")return "them";if(route==="chot")return "san";if(route==="vdv")return canWrite?"nguoi":"bxh";
  if(route==="home")return canWrite?"buoi":"san";
  return {dk:"buoi",san:"san",tien:"tien",nguoi:"nguoi",ls:"them",gt:"them",bxh:canWrite?"them":"bxh"}[tab]||(canWrite?"buoi":"san");
}
function mxMgrNav(){
  const cur=mxMgrCur(),it=(k,ic,attrs,href,lb,n)=>`<a class="${cur===k?"on":""}" href="${href}" ${attrs}>${mxSvg(ic)}<span>${lb}</span>${n?`<i class="mxbadge">${n}</i>`:""}</a>`;
  if(!canWrite)return `<nav class="mxnav">${it("san","court",`data-go="app" data-t="san"`,pathOf("app",{tab:"san"}),"Sân")}${it("bxh","rank",`data-go="app" data-t="bxh"`,pathOf("app",{tab:"bxh"}),"Xếp hạng")}</nav>`;
  return `<nav class="mxnav">${it("buoi","reg",`data-go="app" data-t="dk"`,pathOf("app",{tab:"dk"}),"Tạo")}${it("san","court",`data-go="app" data-t="san"`,pathOf("app",{tab:"san"}),"Sân",ckPending().length)}${it("tien","money",`data-go="app" data-t="tien"`,pathOf("app",{tab:"tien"}),"Quỹ")}${it("nguoi","ppl",`data-go="app" data-t="nguoi"`,pathOf("app",{tab:"nguoi"}),"Thành viên",pendCount())}${it("them","more",`data-go="caidat"`,pathOf("caidat"),"Thêm")}</nav>`;
}
function mxMore(D){
  return `<div class="mxcard list">
    <a class="mxli" href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"><span class="t">Lịch sử các giải đấu</span><span>›</span></a>
    <a class="mxli" href="${pathOf("app",{tab:"bxh"})}" data-go="app" data-t="bxh"><span class="t">Bảng xếp hạng</span><span>›</span></a>
    <a class="mxli" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><span class="t">Trang giới thiệu CLB</span><span>›</span></a>
    <button class="mxli" data-act="openweb" data-v="${esc(pathOf("caidat"))}"><span class="t">Mở bản web đầy đủ</span><span>↗</span></button></div>`+vCaiDat(D);
}
function mxMgrView(D){
  const ob=mxOnboard(D);if(ob&&(route==="home"||(route==="app"&&(tab==="dk"||tab==="san"))))return ob+mxMgrView0(D);
  return mxMgrView0(D);
}
function mxMgrView0(D){
  const G=isG(D.c),san=vSanCk,bxh=G?(D=>vGiaiBxh(D,gDerive(D))):vBxh;
  if(route==="vdv")return vHoSo(D,routePid);
  if(route==="buoi")return vBuoi(D,routeSid);
  if(!canWrite)return (route==="app"&&tab==="bxh"?bxh:san)(D);
  if(route==="chot")return vChot(D);
  if(route==="caidat")return mxMore(D);
  if(route==="home")return vDk(D);
  return ({dk:vDk,san,tien:vTien,nguoi:vTV,ls:vLs,bxh}[tab]||vDk)(D);
}
function renderMini(D){
  if(mxMode()==="ql"&&!(route==="cmp"||(route==="app"&&(tab==="gt"||tab==="toi"))))return mxShell(D,mxMgrView(D));
  // Quản lý đang ở chế độ Chơi: xem đúng như người chơi (không hiện nút nhập điểm, quản lý giải)
  if(mxMgr()){const cw=canWrite,rf=REF;mxAs={cw,rf};canWrite=false;REF=false;try{return renderMini(D)}finally{canWrite=cw;REF=rf;mxAs=null}}
  const v=route==="home"?mxHome:route==="vdv"?(D=>mxShell(D,vHoSo(D,routePid)+(mxPid()&&routePid!==mxPid()?`<button class="primary wide" data-act="mxcmp" data-id="${esc(routePid)}">⚔ So kè với tôi</button>`:""))):route==="cmp"?(D=>mxCompare(D,routePid)):route==="buoi"?(D=>mxShell(D,mxBack("app","Lịch sử").replace('data-go="app"','data-go="app" data-t="ls"')+vBuoi(D,routeSid)+mxAchBtn(D,routeSid))):
    ({san:mxLive,bxh:mxRank,ls:mxHist,tien:mxHist,toi:mxMeTab,dk:mxSession,gt:mxIntro,nguoi:mxMembers}[tab]||mxHome);
  return v(D);
}
function mxAchBtn(D,sid){const me=mxPid(),x=sessList(D).find(z=>z.sid===sid);if(!me||!x||!(x.rows||[]).some(r=>r.id===me))return "";
  return `<button class="primary wide" data-act="mxach" data-id="${sid}">Lưu thẻ thành tích của tôi</button>`}
// Điểm danh tại sân: mở Mini App bằng QR dán ở sân (?diemdanh=1)
async function mxCheckin(D){
  if(mxCheck||!MINI||!/[?&]diemdanh=1/.test(location.search||"")||!authUser||!S.regs)return;
  const X=xCur()||schedUp().find(x=>sameDay(x.at,Date.now())),mine=withX(X,()=>mxMyReg(D));mxCheck=true;
  if(!mine){toast("Bạn chưa đăng ký giải đấu này. Đăng ký rồi điểm danh lại nhé.");return}
  if(mine.arrived){toast("Bạn đã điểm danh rồi ✓");return}
  try{await FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id),{arrived:true,arrivedAt:Date.now()});toast("Đã điểm danh: chào mừng bạn tới sân!")}catch(e){toast("Chưa điểm danh được, thử lại.");mxCheck=false}
}

/* ----- Bấm ----- */
// Giữ giải đang xem (RX) qua lần chờ gdAct: phần sau chạy lại trong đúng ngữ cảnh giải
async function mxAct(act,b,id){
  const X0=RX;
  if(await gdAct(act,b,id))return true;
  return withX(X0,()=>mxAct2(act,b,id));
}
async function mxAct2(act,b,id){
  if(act==="mxscan"){ckScan();return true}
  if(act==="mxinv"){mxInvOpen=!mxInvOpen;render();return true}
  if(act==="mxinvgo"){const el=document.getElementById&&document.getElementById("mx-inv"),v=parseInv((el&&el.value)||drafts["mx-inv"]);
    if(!v){toast("Link mời không đúng. Dán nguyên link chủ CLB gửi.");return true}
    const c=v.cid||(MODE==="club"?CID:null);if(!c){toast("Link này thiếu tên CLB. Mở CLB đó trước rồi dán lại mã.");return true}
    delete drafts["mx-inv"];mxInvOpen=false;
    if(MODE==="club"&&c===CID){INVITE=v.tok;await acceptInvite();render();return true}
    try{sessionStorage.setItem("pb-inv-"+c,v.tok)}catch(e){}setPath("/"+c);location.reload();return true}
  if(act==="mxmode"){const m=b.dataset.v==="choi"?"choi":"ql";if(m===mxMode())return true;mxSetMode(m);mxSheet=null;if(m==="ql")go("app",{tab:canWrite?"dk":"san"});else go("home");return true}
  if(act==="mxback"){mxSheet=null;if(mxNavN>0)history.back();else if(mxMode()==="ql")go("app",{tab:canWrite?"dk":"san"});else go("home");return true}
  if(act==="mxsheet"){mxSheet=mxSheet==="club"?null:"club";render();return true}
  if(act==="mxsheetx"){mxSheet=null;render();return true}
  if(act==="mxsheetreg"){mxSheet="reg";render();return true}
  if(act==="mxdk"){mxSheet=null;mxDk=b.dataset.v||null;if(mxDk==="guest")guestOpen=true;if(route!=="app"||tab!=="dk")go("app",{tab:"dk"});else render();return true}
  if(act==="mxseg"){mxSeg[b.dataset.k]=b.dataset.v;render();return true}
  if(act==="mxtien"){mxSeg.hist="tien";go("app",{tab:"ls"});return true}
  if(act==="mxexme"){mxSeg.exTab="me";render();return true}
  if(act==="mxtao"){if(MODE!=="platform"){try{sessionStorage.setItem("pb-mxtao","1")}catch(e){}quickNext();setPath("/clb");location.reload();return true}
    mxSeg.exTab="tao";delete errs.tao;render();mxAskName();try{window.scrollTo(0,0)}catch(e){}return true}
  if(act==="mxtaox"){mxSeg.exTab="";delete errs.tao;render();return true}
  if(act==="mxexgo"){mxSeg.exTab="";render();setTimeout(()=>{try{const el=document.getElementById("mxopen");el&&el.scrollIntoView&&el.scrollIntoView({behavior:"smooth"})}catch(e){}},60);return true}
  if(act==="mxshareclb"){try{sessionStorage.removeItem("pb-newclub")}catch(e){}await shareOut({title:"Mời vào CLB",text:`Mời vào CLB ${CLUB?.name||CID} trên pikeco.app:`,path:"/"+CID});render();return true}
  if(act==="mxexfind"){mxSeg.exTab="";render();return true}
  if(act==="mxcmp"){routePid=id;go("cmp",{pid:id});return true}
  if(act==="openurl"){const u=String(b.dataset.v||"");if(!/^https:\/\//.test(u))return true;if(window.ZMP&&window.ZMP.openWebview){try{await window.ZMP.openWebview({url:u})}catch(e){location.href=u}}else window.open(u,"_blank");return true}
  if(act==="mxcal"){const r=regCfg(),D=derive();if(!r.at)return true;const f=t=>new Date(t).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
    let end=r.at+2*3600e3;if(r.end){const [hh,mm]=r.end.split(":").map(Number),e=new Date(r.at);e.setHours(hh,mm,0,0);if(e.getTime()>r.at)end=e.getTime()}
    const u=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent((CLUB?.name||"")+" · "+(RX?xName(RX):(D.c.sname||"Pickleball")))}&dates=${f(r.at)}/${f(end)}&location=${encodeURIComponent(r.place||"")}&details=${encodeURIComponent(miniLink(CID,RX&&RX.id))}`;
    return mxAct("openurl",{dataset:{v:u}})}
  if(act==="mxinvite"){const D=derive(),r=regCfg(),txt=`🏓 ${CLUB?.name||""}: ${RX?xName(RX):(D.c.sname||"giải đấu")} · ${whenFull(r)}${r.place?` · ${r.place}`:""}. Bấm link để đăng ký:`;
    await shareOut({title:"Rủ bạn đi đánh",text:txt,path:pathOf("app",{tab:"dk",x:RX?RX.id:null})});return true}
  if(act==="mxach"){const cv=mxAchCanvas(derive(),Number(id));if(!cv){toast("Không tạo được thẻ.");return true}
    const data=cv.toDataURL("image/png");
    if(window.ZMP&&window.ZMP.saveImageToGallery){try{await window.ZMP.saveImageToGallery({imageBase64Data:data});toast("Đã lưu thẻ vào máy, gửi vào nhóm thôi!");return true}catch(e){}}
    const a=document.createElement("a");a.href=data;a.download="the-thanh-tich.png";document.body.appendChild(a);a.click();a.remove();toast("Đã lưu thẻ thành tích");return true}
  if(act==="mxleave"){const pid=myPid();if(!armOr("mxleave:x"))return true;
    try{if(pid)await FB.updateDoc(FB.doc(FB.fs,PFX+"players/"+pid),{photo:"",nick:"",bio:"",paddle:"",since:"",hand:""}).catch(()=>{});
      await FB.deleteDoc(FB.doc(FB.fs,PFX+"links/"+authUser.uid));
      try{localStorage.setItem("pb-mini-clubs",JSON.stringify(myClubs().filter(x=>x.id!==CID)));localStorage.removeItem("pb-mini-last")}catch(e){}
      toast("Đã rời CLB và xoá thông tin của bạn");setPath("/clb");location.reload()}catch(e){toast("Chưa thực hiện được, thử lại.")}
    return true}
  return false;
}
