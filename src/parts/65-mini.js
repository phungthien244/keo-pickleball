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
function mxShell(D,body,cta=""){
  const p=mxMe(D),nm=(CLUB&&CLUB.name)||D.c.title;
  const ql=mxMode()==="ql",sw=mxMgr()?`<span class="mxsw" role="group" aria-label="Chế độ"><button data-act="mxmode" data-v="choi" aria-pressed="${!ql}">Chơi</button><button data-act="mxmode" data-v="ql" aria-pressed="${ql}">${canWrite?"Quản lý":"Trọng tài"}</button></span>`:"";
  let h=`<div class="mxbar"><button class="mxclub" data-act="mxsheet"><span class="clogo">${logoHtml(CLUB,nm)}</span><b>${esc(nm)}</b><span aria-hidden="true">▾</span></button>${sw}<a class="mxme" href="${pathOf("app",{tab:"toi"})}" data-go="app" data-t="toi" aria-label="Tôi">${p?av(p,"sm",1):mxSvg("me")}</a></div>`;
  h+=(ql?"":mxTurn(D))+`<div class="mxbody">${body}</div>`;
  if(cta)h+=`<div class="mxcta">${cta}</div>`;
  h+=ql?mxMgrNav():mxNav();
  return h+mxSheetHtml();
}
function mxNav(){
  const it=(k,t,go,lb)=>`<a class="${mxCur()===k?"on":""}" href="${go}" ${t}>${mxSvg(k==="hist"?"hist":k)}<span>${lb}</span></a>`;
  return `<nav class="mxnav">${it("home",`data-go="home"`,pathOf("home"),"Trang chủ")}${it("live",`data-go="app" data-t="san"`,pathOf("app",{tab:"san"}),"Trực tiếp")}${it("rank",`data-go="app" data-t="bxh"`,pathOf("app",{tab:"bxh"}),"Xếp hạng")}${it("hist",`data-go="app" data-t="ls"`,pathOf("app",{tab:"ls"}),"Lịch sử")}${it("me",`data-go="app" data-t="toi"`,pathOf("app",{tab:"toi"}),"Tôi")}</nav>`;
}
// Đang nạp CLB (vừa chuyển CLB): dựng sẵn khung Mini App, không lộ giao diện web
function mxLoading(){
  const k=myClubs().find(x=>x.id===CID),nm=(CLUB&&CLUB.name)||(k&&k.name)||"";
  return `<div class="mxbar"><span class="mxclub"><span class="clogo">${esc((nm||CID).charAt(0).toUpperCase())}</span><b>${esc(nm)}</b></span><span class="mxme">${mxSvg("me")}</span></div><div class="mxbody">${skeleton()}</div>${mxNav()}`;
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
  if(mxSheet!=="club")return "";
  const C=myClubs(),row=c=>`<button class="mxrow${c.id===CID&&MODE==="club"?" cur":""}" data-act="miniclub" data-id="${esc(c.id)}"><span class="clogo">${esc(String(c.name||c.id).charAt(0).toUpperCase())}</span><span class="t"><b>${esc(c.name||c.id)}</b><small>${esc(c.role||"Đã xem")}</small></span>${c.id===CID&&MODE==="club"?`<span class="ck">✓</span>`:""}</button>`;
  const man=C.filter(c=>/Chủ|Quản lý|Trọng tài/.test(c.role||"")),join=C.filter(c=>!man.includes(c));
  return `<div class="mxdim" data-act="mxsheetx"></div><div class="mxsheet" role="dialog" aria-label="Chuyển CLB"><span class="grab"></span><b class="mxh">Chuyển CLB</b>
    ${man.length?`<span class="mxsec">Đang quản lý</span>${man.map(row).join("")}`:""}
    <span class="mxsec">${join.length?"Đang tham gia":"Chưa tham gia CLB nào"}</span>${join.map(row).join("")}
    <button class="line wide" data-act="miniexplore">⌕ Khám phá CLB khác</button>
    <button class="ghost wide" data-act="openweb" data-v="/tao-clb">+ Tạo CLB mới (trên pikeco.app)</button></div>`;
}
const mxRole=()=>{const L=S.link;if(canWrite)return ROLE==="owner"?"Chủ CLB":"Quản lý";if(REF)return "Trọng tài";
  if(L&&L.status==="ok")return "Thành viên";if(L&&L.status==="pending")return "Chờ duyệt";
  const D=derive(),g=authUser&&(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===authUser.uid&&x.guest);return g?"Khách":"Đã xem"};

/* ----- 1 · Trang chủ: tự đổi theo lúc mở ----- */
function mxHome(D){
  const p=mxMe(D),live=phaseOf(D)==="live",H=lastHist(D);
  let h="";
  if(!p&&!(S.link&&S.link.status==="pending")&&!mxMyReg(D))h+=mxIntroTeaser(D);
  if(live){const s=p&&D.st.get(p.id),M=p&&money(D),k=p&&M.att.some(x=>x.id===p.id)?payRow(D,M,p.id).pay:0;
    h+=`<a class="mxcard live" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><span class="lbl"><span class="dot"></span>Đang đánh</span><b>${esc(sessTitle(D.c,D.sid))}</b><span>${D.playing.length} sân · ${D.players.filter(x=>x.active!==false).length} người · ${D.done.length} trận xong</span></a>`;
    if(s&&s.g){const all=[...D.players].filter(x=>D.st.get(x.id).g).sort((a,b)=>D.st.get(b.id).w/D.st.get(b.id).g-D.st.get(a.id).w/D.st.get(a.id).g),rk=all.findIndex(x=>x.id===p.id)+1;
      h+=`<div class="mxcard"><div class="mxkv"><span>Hôm nay</span><b>${s.w} thắng · ${s.l} thua</b></div><div class="mxkv"><span>Hạng hôm nay</span><b>#${rk} · <span class="${dCls(s.d)}">${dTxt(s.d)}</span></b></div>${k?`<div class="mxkv"><span>Tiền tạm tính</span><b>${fmtK(k)}</b></div>`:""}</div>`}
  }else if(regOpen())h+=mxSessCard(D,true);
  else if(H){const r=p&&(H.rows||[]).find(x=>x.id===p.id);
    h+=`<a class="mxcard" href="${pathOf("buoi",{sid:H.sid})}" data-go="buoi" data-id="${H.sid}"><span class="lbl">Buổi vừa xong · ${dmy(H.startedAt||H.endedAt)}</span><b>${esc(H.sname||`Buổi #${H.sid}`)}</b><span>${H.matchCount||0} trận${H.rows&&H.rows[0]?` · nhất ${esc(H.rows[0].name)}`:""}</span>${r?`<span class="mxmine">Bạn: ${r.w||0} thắng ${r.l||0} thua · <span class="${dCls(+r.d)}">${dTxt(+r.d)}</span></span>`:""}</a>`;
    h+=`<div class="mxcard muted"><b>Chưa mở đăng ký buổi tới</b><span>Chủ CLB mở là bạn thấy ở đây.</span></div>`}
  else h+=`<div class="mxcard muted"><b>CLB chưa có buổi nào</b><span>Chủ CLB mở đăng ký là bạn thấy ở đây.</span></div>`;
  if(p){const dt=debts().filter(x=>x.id===p.id),sum=dt.reduce((a,x)=>a+x.k,0);
    if(sum>0)h+=`<button class="mxcard warn" data-act="mxtien"><b>Bạn còn ${fmtK(sum)} chưa trả</b><span>${dt.length} buổi · bấm để chuyển khoản</span></button>`}
  const top=[...D.players].sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating).slice(0,3);
  if(top.length)h+=`<div class="mxcard"><div class="mxhd"><b>Top rating</b><a href="${pathOf("app",{tab:"bxh"})}" data-go="app" data-t="bxh">Xem tất cả ›</a></div>${top.map((x,i)=>`<div class="mxli" data-pid="${x.id}"><span class="no">${i+1}</span>${av(x,"sm",1)}<span class="t">${esc(x.name)}</span><b class="num">${r2(D.st.get(x.id).rating)}</b></div>`).join("")}</div>`;
  h+=`<div class="mxtiles"><a class="mxtile" href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"><small>Quỹ CLB</small><b class="num">${(fundNow()<0?"−":"")+fmtK(Math.abs(fundNow()))}</b></a><a class="mxtile" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi"><small>Thành viên</small><b class="num">${D.players.filter(x=>!x.guest).length}</b></a><a class="mxtile" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><small>Giới thiệu</small><b>CLB ›</b></a></div>`;
  const cta=!live&&regOpen()?mxRegCta(D):"";
  return mxShell(D,h,cta);
}
const mxMyReg=D=>authUser&&(S.regs||[]).find(x=>x.sid===D.sid&&x.uid===authUser.uid&&!x.cancel&&!isHeldOut(x));
function mxIntroTeaser(D){
  if(!CLUB)return "";
  return `<a class="mxcard intro" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><b>Chào mừng tới ${esc(CLUB.name)}</b><span>${esc(CLUB.sched||CLUB.city||"Xem giới thiệu CLB")} ›</span></a>`;
}
// Thẻ buổi tới (dùng ở Trang chủ, Khám phá, Giới thiệu)
function mxSessCard(D,link){
  const r=regCfg(),R=regList(D),c=D.c,pct=R.max<999?Math.min(100,Math.round(R.conf.length/R.max*100)):0,left=R.max<999?Math.max(0,R.max-R.conf.length):null;
  const chips=[`${c.courts} sân`,fmtTxt(c),lvTxt(r),feeMem()?`${fmtK(feeMem())}/người`:"",r.guests?"Nhận khách":""].filter(Boolean);
  const faces=R.conf.slice(0,6).map(x=>av(D.pmap.get(x.pid)||{name:x.name},"xs",1)).join("");
  return `<${link?`a href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk"`:"div"} class="mxcard sess">
    <div class="mxsess">${r.at?mxDate(r.at):`<span class="mxdate"><b>?</b></span>`}<span class="t"><b>${esc(c.sname||"Buổi đánh tới")}</b><span>${r.at?`${hm(r.at)}${r.end?`–${r.end}`:""}`:"Chưa đặt giờ"}${r.place?` · ${esc(r.place)}`:""}</span>${r.map?`<span class="mxlink" data-act="openurl" data-v="${esc(r.map)}">Chỉ đường ↗</span>`:""}</span></div>
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
  const R=regList(D),r=regCfg(),u=authUser,mine=mxMyReg(D),linked=S.link&&S.link.status==="ok";
  let h=mxBack("home","Trang chủ");
  if(phaseOf(D)==="live")return mxShell(D,h+`<div class="mxcard live"><b>Buổi đang diễn ra</b><span>Xem sân ở tab Trực tiếp.</span></div>`);
  if(isPlayer(u)&&!linked&&(mxDk==="pick"||(S.link&&S.link.status==="pending")))return mxShell(D,h+linkCard(D)+(regOpen()&&!mine?mxSessCard(D)+(regCfg().guests?`<button class="line wide" data-act="mxdk" data-v="guest">Đăng ký làm khách buổi này</button>`:""):""));
  if(!regOpen())return mxShell(D,h+`<div class="mxcard muted"><b>Chưa mở đăng ký buổi tới</b><span>Chủ CLB mở đăng ký là bạn thấy ở đây.</span></div>`);
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
    ${r.guests?`<button class="mxchoice" data-act="mxdk" data-v="guest"><b>Tôi là khách</b><small>Đăng ký ngay buổi này, không cần chờ duyệt${feeGuest()?` · ${fmtK(feeGuest())}`:""}</small></button>`:`<small class="rule">Buổi này chỉ dành cho thành viên.</small>`}</div>`:"");
}
function mxWho(D,R){
  if(!R.all.length)return "";
  const f=x=>{const p=D.pmap.get(x.pid);return `<span class="rgp">${av(p||{name:x.name},"sm",1)}<small>${esc(p?.name||x.name||"?")}${x.guest?" · khách":""}${x.arrived?" ✓":""}</small></span>`};
  return `<div class="mxcard"><div class="mxhd"><b>Ai đi (${R.conf.length})</b>${R.wait.length?`<span class="t2">${R.wait.length} người chờ</span>`:""}</div><div class="rgl">${R.conf.map(f).join("")}</div>${R.wait.length?`<span class="lbl">Danh sách chờ</span><div class="rgl wt">${R.wait.map(f).join("")}</div>`:""}</div>`;
}

/* ----- 3 · Trực tiếp ----- */
function mxLive(D){
  const live=phaseOf(D)==="live";
  if(!live)return mxShell(D,`<div class="mxcard muted"><b>Chưa có buổi đang đánh</b><span>${regOpen()?`Buổi tới: ${esc(whenFull(regCfg()))}`:"Khi buổi bắt đầu, sân và tỉ số hiện ở đây, cập nhật ngay."}</span></div>`+(regOpen()?mxSessCard(D,true):""));
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
  h+=`<div class="mxcard list">${L.map((p,i)=>{const s=D.st.get(p.id),A=D.all.get(p.id);return `<div class="mxli${p.id===me?" me":""}" data-pid="${p.id}"><span class="no">${i+1}</span>${av(p,"sm",1)}<span class="t">${esc(p.name)}<small>${A.ses.size} buổi · thắng ${pct(A.w,A.g)}%</small></span><b class="num">${r2(s.rating)}</b></div>`}).join("")}</div>`;
  const mi=L.findIndex(p=>p.id===me);
  const pin=mi>=0?`<div class="mxpin" data-pid="${me}"><span>Bạn · hạng ${mi+1}/${L.length}</span><b class="num">${r2(D.st.get(me).rating)}</b></div>`:"";
  return mxShell(D,h+`<a class="mxlink2" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi">Danh sách thành viên ›</a>`,pin);
}

/* ----- 5 · Lịch sử · Tiền của tôi · Quỹ CLB ----- */
function mxHist(D){
  const seg=mxSeg.hist,sb=(v,l)=>`<button data-act="mxseg" data-k="hist" data-v="${v}" aria-pressed="${seg===v}">${l}</button>`,me=mxPid();
  let h=`<div class="mxseg">${sb("buoi","Các buổi")}${sb("tien","Tiền của tôi")}${sb("quy","Quỹ CLB")}</div>`;
  if(seg==="tien"){
    if(!me)return mxShell(D,h+`<div class="mxcard muted"><b>Tham gia CLB</b><span>Chủ CLB xác nhận xong là bạn xem được tiền các buổi của mình.</span></div>`);
    const dt=debts().filter(x=>x.id===me),sum=dt.reduce((a,x)=>a+x.k,0),p=D.pmap.get(me);
    h+=sum?`<div class="mxcard warn"><b>Bạn còn ${fmtK(sum)} chưa trả</b><span>${dt.map(x=>`Buổi #${x.sid}: ${fmtK(x.k)}`).join(" · ")}</span></div>${BANK&&BANK.acc?payBox(D,p?.name,sum):""}`:`<div class="mxcard ok"><b>✓ Bạn không nợ buổi nào</b></div>`;
    const paidL=S.hist.filter(x=>(x.rows||[]).some(r=>r.id===me&&(+r.pay||0)>0)).sort((a,b)=>b.sid-a.sid).slice(0,10);
    if(paidL.length)h+=`<div class="mxcard list">${paidL.map(x=>{const r=x.rows.find(z=>z.id===me),ok=(x.paid||{})[me];return `<div class="mxli"><span class="t">Buổi #${x.sid} · ${dmy(x.startedAt||x.endedAt)}</span><b class="num">${fmtK(+r.pay)}</b>${x.track?`<span class="paychip ${ok?"ok":"none"}">${ok?"Đã trả":"Chưa"}</span>`:""}</div>`}).join("")}</div>`;
    return mxShell(D,h);
  }
  if(seg==="quy")return mxShell(D,h+`<div class="mxlivewrap">${vSoQuy(D)}</div>`);
  const L=sessList(D);
  h+=L.length?`<div class="mxcard list">${L.map(x=>{const r=me&&(x.rows||[]).find(z=>z.id===me),rk=r?(x.rows||[]).indexOf(r)+1:0,s=x.snap;
    return `<a class="mxli" href="${pathOf("buoi",{sid:x.sid})}" data-go="buoi" data-id="${x.sid}"><span class="t"><b>${esc(s?.sname||`Buổi #${x.sid}`)}</b><small>${dmy(x.at)} · ${x.ms.length||s?.matchCount||0} trận${s?.type==="giai"?" · giải cặp":x.rows&&x.rows[0]?` · nhất ${esc(x.rows[0].name)}`:""}</small></span>${rk?`<span class="t2">Hạng ${rk}</span>`:""}<span aria-hidden="true">›</span></a>`}).join("")}</div>`:`<div class="mxcard muted"><b>Chưa có buổi nào</b></div>`;
  return mxShell(D,h);
}

/* ----- 6 · Tôi ----- */
function mxMeTab(D){
  const p=mxMe(D),L=S.link;
  let h="";
  if(p){const s=D.st.get(p.id),A=D.all.get(p.id),rk=[...D.players].filter(x=>!x.guest).sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating).findIndex(x=>x.id===p.id)+1;
    h+=`<div class="mxcard prof">${av(p,"lg",1)}<span class="t"><b>${esc(p.name)}</b><small>${esc(CLUB?.name||"")} · ${mxRole()}</small></span><a class="line sm" href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}">Hồ sơ</a></div>
    <div class="mxstats"><div><b class="num">${r2(s.rating)}</b><small>Rating</small></div><div><b class="num">#${rk}</b><small>Hạng</small></div><div><b class="num">${A.ses.size}</b><small>Buổi</small></div><div><b class="num">${pct(A.w,A.g)}%</b><small>Thắng</small></div></div>`;
  }else h+=`<div class="mxcard prof">${mxSvg("me")}<span class="t"><b>${esc(zaloProf().n||"Người dùng Zalo")}</b><small>${L&&L.status==="pending"?"Đang chờ chủ CLB duyệt":mxRole()==="Khách"?"Khách của CLB này":"Chưa tham gia CLB này"}</small></span></div>${L&&L.status==="pending"?"":`<button class="primary wide" data-act="mxdk" data-v="pick">Tham gia CLB</button>`}`;
  const C=myClubs();
  h+=`<div class="mxcard list">
    ${p?`<a class="mxli" href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}"><span class="t">Hồ sơ, thành tích, sửa ảnh</span><span>›</span></a>`:""}
    <button class="mxli" data-act="mxsheet"><span class="t">CLB của tôi</span><span class="t2">${C.length}</span><span>›</span></button>
    <button class="mxli" data-act="miniexplore"><span class="t">Khám phá CLB khác</span><span>›</span></button>
    <a class="mxli" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><span class="t">Giới thiệu ${esc(CLUB?.name||"CLB")}</span><span>›</span></a>
    <button class="mxli" data-act="mute"><span class="t">Loa gọi vào sân</span><span class="t2">${loaMuted()?"Đang tắt":"Đang bật"}</span></button>${mxMgr()?"":mxInvBtn()}</div>`;
  h+=`<div class="mxcard list"><span class="mxsec">Quyền riêng tư</span>
    ${L?`<button class="mxli" data-act="mxleave"><span class="t" style="color:var(--lose)">${armed("mxleave:x")?"Bấm lần nữa: rời CLB và xoá thông tin của tôi":"Rời CLB, xoá thông tin của tôi"}</span></button>`:""}
    <button class="mxli" data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}"><span class="t">Điều khoản sử dụng</span><span>↗</span></button>
    <p class="rule" style="margin:6px 0 0">Pikeco chỉ dùng mã Zalo để nhận ra bạn, không lấy số điện thoại hay danh bạ.</p></div>`;
  return mxShell(D,h);
}

/* ----- Giới thiệu CLB ----- */
function mxIntro(D){
  const c=CLUB||{},n=D.players.filter(x=>!x.guest).length,top=[...D.players].filter(x=>!x.guest).sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating).slice(0,3);
  const kv=(k,v)=>v?`<div class="mxkv"><span>${k}</span><b>${esc(v)}</b></div>`:"";
  let h=mxBack("home","Trang chủ")+`<div class="mxcard prof"><span class="clogo big">${logoHtml(c,c.name)}</span><span class="t"><b>${esc(c.name||"")}</b><small>${esc(c.city||"")}${n?` · ${n} thành viên`:""}</small></span></div>`;
  if(c.about)h+=`<div class="mxcard"><p style="margin:0;white-space:pre-line">${esc(c.about)}</p></div>`;
  h+=`<div class="mxcard">${kv("Lịch đánh",c.sched)}${kv("Sân",c.venue)}${kv("Trình độ",c.level)}${kv("Chi phí",c.feeTxt||(D.c.thu==="phi"?`${fmtK(+D.c.phi||0)}/buổi`:THU[D.c.thu||"keo"]))}${kv("Thể thức",fmtTxt(D.c))}</div>`;
  if(regOpen())h+=mxSessCard(D,true);
  if(top.length)h+=`<div class="mxcard"><div class="mxhd"><b>Top rating</b></div>${top.map((x,i)=>`<div class="mxli" data-pid="${x.id}"><span class="no">${i+1}</span>${av(x,"sm",1)}<span class="t">${esc(x.name)}</span><b class="num">${r2(D.st.get(x.id).rating)}</b></div>`).join("")}</div>`;
  const zl=String(c.zalo||"").replace(/\D/g,"");
  const cta=(zl?`<button class="line wide" data-act="openurl" data-v="https://zalo.me/${zl}">💬 Nhắn chủ CLB qua Zalo</button>`:"")+(mxPid()?"":`<a class="primary wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">${regOpen()?"Đăng ký buổi tới":"Tham gia CLB"}</a>`);
  return mxShell(D,h,cta);
}
function mxMembers(D){
  const L=[...D.players].filter(p=>!p.guest).sort((a,b)=>String(a.name).localeCompare(String(b.name),"vi"));
  const q=String(val("mxq","")).toLowerCase().trim(),F=q?L.filter(p=>String(p.name).toLowerCase().includes(q)):L;
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
  else if(last.length)h+=`<div class="mxcard list"><span class="mxsec">Các lần gặp gần đây</span>${last.map(({m,meWin})=>`<div class="mxli"><span class="t">Buổi #${m.session||1} · ${[...m.a].map(x=>esc(D.pmap.get(x)?.name||"?")).join(" & ")} vs ${[...m.b].map(x=>esc(D.pmap.get(x)?.name||"?")).join(" & ")}</span><b class="num">${m.sa}–${m.sb}</b><span class="paychip ${meWin?"ok":"none"}">${meWin?"Thắng":"Thua"}</span></div>`).join("")}</div>`;
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
let mxOpen=null,mxOpenLoading=false;
function loadOpenSess(){
  if(mxOpen||mxOpenLoading||!S.clubs)return;mxOpenLoading=true;
  Promise.all(publicClubs().map(async c=>{try{const s=await FB.getDoc(FB.doc(FB.fs,`clubs/${c.id}/app/config`));if(!s.exists())return null;const cf=s.data(),r=cf.reg||{};
    if(!(r.on&&r.guests&&(r.sid==null||r.sid===(cf.session||1))))return null;if(r.at&&r.at<Date.now())return null;if(r.deadline&&r.deadline<Date.now())return null;
    let n=0;try{const q=await FB.getDocs(FB.query(FB.collection(FB.fs,`clubs/${c.id}/regs`),FB.where("sid","==",cf.session||1)));n=q.docs.filter(d=>!d.data().cancel).length}catch(e){}
    return {club:c,r,cf,n}}catch(e){return null}})).then(L=>{mxOpen=L.filter(Boolean).sort((a,b)=>(a.r.at||9e15)-(b.r.at||9e15));mxOpenLoading=false;render()}).catch(()=>{mxOpen=[];mxOpenLoading=false;render()});
}
function mxExplore(){
  loadClubs();loadOpenSess();
  const mine=myClubs(),q=noAcc(String(val("cq",""))).toLowerCase().trim(),f=mxSeg.ex||"all";
  const all=publicClubs(),others=all.filter(c=>!mine.some(m=>m.id===c.id)&&(!q||noAcc(`${c.name} ${c.city||""}`).toLowerCase().includes(q)));
  const now=new Date(),endDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime(),wk=d=>[0,6].includes(new Date(d).getDay());
  const O=(mxOpen||[]).filter(x=>(!q||noAcc(`${x.club.name} ${x.club.city||""} ${x.r.place||""}`).toLowerCase().includes(q))&&(f==="all"||(f==="nay"&&x.r.at&&x.r.at<endDay)||(f==="tuan"&&x.r.at&&wk(x.r.at))));
  const fb=(v,l)=>`<button data-act="mxseg" data-k="ex" data-v="${v}" aria-pressed="${f===v}">${l}</button>`;
  let h=`<div class="mxbar"><span class="mxclub"><b>${mine.length?"Khám phá":"Chào bạn 👋"}</b></span><a class="mxme" href="#" data-act="mxexme">${mxSvg("me")}</a></div><div class="mxbody">`;
  if(mxSeg.exTab==="me")return mxExploreMe();
  if(!mine.length)h+=`<p class="mxlead">Tìm chỗ chơi pickleball gần bạn</p>`;
  h+=`<label class="srch"><span class="sr">Tìm CLB</span><input id="cq" data-draft="cq" data-live="1" type="search" placeholder="Tìm CLB, khu vực, sân…" value="${esc(val("cq",""))}"></label>`;
  h+=`<div class="mxseg sm">${fb("all","Tất cả")}${fb("nay","Hôm nay")}${fb("tuan","Cuối tuần")}</div>`;
  h+=`<span class="mxsec">Kèo đang nhận khách</span>`;
  h+=!mxOpen?`<p class="rule">Đang tìm kèo…</p>`:O.length?O.map(x=>`<button class="mxcard sess" data-act="miniclub" data-id="${esc(x.club.id)}"><div class="mxsess">${x.r.at?mxDate(x.r.at):`<span class="mxdate"><b>?</b></span>`}<span class="t"><b>${esc(x.club.name)} · ${esc(x.cf.sname||"Buổi đánh")}</b><span>${x.r.at?hm(x.r.at):""}${x.r.place?` · ${esc(x.r.place)}`:""}${x.r.feeG||x.cf.phi?` · ${fmtK(+(x.r.feeG||((x.cf.thu==="phi")?x.cf.phi:x.r.fee)||0))}`:""}</span></span><span class="tagl">${+x.r.max?`còn ${Math.max(0,+x.r.max-x.n)}`:`${x.n} người`}</span></div></button>`).join(""):`<div class="mxcard muted"><span>Chưa có kèo nào đang nhận khách${f!=="all"?" trong thời gian này":""}.</span></div>`;
  if(mine.length)h+=`<span class="mxsec">CLB của bạn</span>`+mine.map(c=>clubCard({...(S.clubs||[]).find(x=>x.id===c.id)||{},id:c.id,name:c.name})).join("");
  h+=`<span class="mxsec">${mine.length?"CLB khác":"Câu lạc bộ"}</span>`+(!S.clubs?`<p class="rule">Đang tải…</p>`:others.length?others.map(clubCard).join(""):`<p class="rule">Không có CLB nào khớp.</p>`);
  h+=`<button class="btn-line" data-act="openweb" data-v="/tao-clb">Bạn quản lý CLB? Tạo CLB miễn phí</button></div>`;
  h+=`<nav class="mxnav"><a class="on" href="#" data-act="mxexfind">${mxSvg("find")}<span>Khám phá</span></a><a href="#" data-act="mxexme">${mxSvg("me")}<span>Tôi</span></a></nav>`;
  return h+mxSheetHtml();
}
function mxExploreMe(){
  const mine=myClubs();
  return `<div class="mxbar"><span class="mxclub"><b>Tôi</b></span></div><div class="mxbody"><div class="mxcard prof">${mxSvg("me")}<span class="t"><b>${esc(zaloProf().n||"Người dùng Zalo")}</b><small>${mine.length?`${mine.length} CLB`:"Chưa tham gia CLB nào"}</small></span></div>
    ${mine.length?`<div class="mxcard list">${mine.map(c=>`<button class="mxli" data-act="miniclub" data-id="${esc(c.id)}"><span class="t">${esc(c.name)}<small>${esc(c.role||"")}</small></span><span>›</span></button>`).join("")}</div>`:`<div class="mxcard"><b>Bắt đầu thế nào?</b><ol class="mxol"><li>Đăng ký làm khách một kèo đang mở</li><li>Hoặc vào CLB, chọn tên của bạn, chủ CLB duyệt</li><li>Có CLB rồi: xem trực tiếp, rating, tiền của bạn</li></ol><button class="primary wide" data-act="mxexfind">Tìm kèo đang mở</button></div>`}
    <div class="mxcard"><b>Bạn quản lý một CLB?</b><span class="rule">Xếp sân, rating, quỹ, đăng ký buổi. Miễn phí.</span><button class="line wide" data-act="openweb" data-v="/tao-clb">Tạo CLB trên pikeco.app ↗</button></div>
    <div class="mxcard list">${mxInvBtn()}<button class="mxli" data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}"><span class="t">Điều khoản sử dụng</span><span>↗</span></button></div></div>
    <nav class="mxnav"><a href="#" data-act="mxexfind">${mxSvg("find")}<span>Khám phá</span></a><a class="on" href="#" data-act="mxexme">${mxSvg("me")}<span>Tôi</span></a></nav>`;
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
let mxModeV=null;
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
  return `<nav class="mxnav">${it("buoi","reg",`data-go="app" data-t="dk"`,pathOf("app",{tab:"dk"}),"Buổi")}${it("san","court",`data-go="app" data-t="san"`,pathOf("app",{tab:"san"}),"Sân")}${it("tien","money",`data-go="app" data-t="tien"`,pathOf("app",{tab:"tien"}),"Tiền")}${it("nguoi","ppl",`data-go="app" data-t="nguoi"`,pathOf("app",{tab:"nguoi"}),"Thành viên",pendCount())}${it("them","more",`data-go="caidat"`,pathOf("caidat"),"Thêm")}</nav>`;
}
function mxMore(D){
  return `<div class="mxcard list">
    <a class="mxli" href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"><span class="t">Lịch sử các buổi</span><span>›</span></a>
    <a class="mxli" href="${pathOf("app",{tab:"bxh"})}" data-go="app" data-t="bxh"><span class="t">Bảng xếp hạng</span><span>›</span></a>
    <a class="mxli" href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"><span class="t">Trang giới thiệu CLB</span><span>›</span></a>
    <button class="mxli" data-act="openweb" data-v="${esc(pathOf("caidat"))}"><span class="t">Mở bản web đầy đủ</span><span>↗</span></button></div>`+vCaiDat(D);
}
function mxMgrView(D){
  const G=isG(D.c),san=G?vGiaiSan:vSan,bxh=G?(D=>vGiaiBxh(D,gDerive(D))):vBxh;
  if(route==="vdv")return vHoSo(D,routePid);
  if(route==="buoi")return vBuoi(D,routeSid);
  if(!canWrite)return (route==="app"&&tab==="bxh"?bxh:san)(D);
  if(route==="chot")return vChot(D);
  if(route==="caidat")return mxMore(D);
  if(route==="home")return vDk(D);
  return ({dk:vDk,san,tien:vTien,nguoi:D=>approvals(D)+vNguoi(D),ls:vLs,bxh}[tab]||vDk)(D);
}
function renderMini(D){
  if(mxMode()==="ql"&&!(route==="cmp"||(route==="app"&&(tab==="gt"||tab==="toi"))))return mxShell(D,mxMgrView(D));
  const v=route==="home"?mxHome:route==="vdv"?(D=>mxShell(D,vHoSo(D,routePid)+(mxPid()&&routePid!==mxPid()?`<button class="primary wide" data-act="mxcmp" data-id="${esc(routePid)}">⚔ So kè với tôi</button>`:""))):route==="cmp"?(D=>mxCompare(D,routePid)):route==="buoi"?(D=>mxShell(D,mxBack("app","Lịch sử").replace('data-go="app"','data-go="app" data-t="ls"')+vBuoi(D,routeSid)+mxAchBtn(D,routeSid))):
    ({san:mxLive,bxh:mxRank,ls:mxHist,tien:mxHist,toi:mxMeTab,dk:mxSession,gt:mxIntro,nguoi:mxMembers}[tab]||mxHome);
  return v(D);
}
function mxAchBtn(D,sid){const me=mxPid(),x=sessList(D).find(z=>z.sid===sid);if(!me||!x||!(x.rows||[]).some(r=>r.id===me))return "";
  return `<button class="primary wide" data-act="mxach" data-id="${sid}">Lưu thẻ thành tích của tôi</button>`}
// Điểm danh tại sân: mở Mini App bằng QR dán ở sân (?diemdanh=1)
async function mxCheckin(D){
  if(mxCheck||!MINI||!/[?&]diemdanh=1/.test(location.search||"")||!authUser||!S.regs)return;
  const mine=mxMyReg(D);mxCheck=true;
  if(!mine){toast("Bạn chưa đăng ký buổi này. Đăng ký rồi điểm danh lại nhé.");return}
  if(mine.arrived){toast("Bạn đã điểm danh rồi ✓");return}
  try{await FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id),{arrived:true,arrivedAt:Date.now()});toast("Đã điểm danh: chào mừng bạn tới sân!")}catch(e){toast("Chưa điểm danh được, thử lại.");mxCheck=false}
}

/* ----- Bấm ----- */
async function mxAct(act,b,id){
  if(act==="mxinv"){mxInvOpen=!mxInvOpen;render();return true}
  if(act==="mxinvgo"){const el=document.getElementById&&document.getElementById("mx-inv"),v=parseInv((el&&el.value)||drafts["mx-inv"]);
    if(!v){toast("Link mời không đúng. Dán nguyên link chủ CLB gửi.");return true}
    const c=v.cid||(MODE==="club"?CID:null);if(!c){toast("Link này thiếu tên CLB. Mở CLB đó trước rồi dán lại mã.");return true}
    delete drafts["mx-inv"];mxInvOpen=false;
    if(MODE==="club"&&c===CID){INVITE=v.tok;await acceptInvite();render();return true}
    try{sessionStorage.setItem("pb-inv-"+c,v.tok)}catch(e){}setPath("/"+c);location.reload();return true}
  if(act==="mxmode"){const m=b.dataset.v==="choi"?"choi":"ql";if(m===mxMode())return true;mxSetMode(m);mxSheet=null;if(m==="ql")go("app",{tab:canWrite?"dk":"san"});else go("home");return true}
  if(act==="mxsheet"){mxSheet=mxSheet==="club"?null:"club";render();return true}
  if(act==="mxsheetx"){mxSheet=null;render();return true}
  if(act==="mxsheetreg"){mxSheet="reg";render();return true}
  if(act==="mxdk"){mxSheet=null;mxDk=b.dataset.v||null;if(mxDk==="guest")guestOpen=true;if(route!=="app"||tab!=="dk")go("app",{tab:"dk"});else render();return true}
  if(act==="mxseg"){mxSeg[b.dataset.k]=b.dataset.v;render();return true}
  if(act==="mxtien"){mxSeg.hist="tien";go("app",{tab:"ls"});return true}
  if(act==="mxexme"){mxSeg.exTab="me";render();return true}
  if(act==="mxexfind"){mxSeg.exTab="";render();return true}
  if(act==="mxcmp"){routePid=id;go("cmp",{pid:id});return true}
  if(act==="openurl"){const u=String(b.dataset.v||"");if(!/^https:\/\//.test(u))return true;if(window.ZMP&&window.ZMP.openWebview){try{await window.ZMP.openWebview({url:u})}catch(e){location.href=u}}else window.open(u,"_blank");return true}
  if(act==="mxcal"){const r=regCfg(),D=derive();if(!r.at)return true;const f=t=>new Date(t).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
    let end=r.at+2*3600e3;if(r.end){const [hh,mm]=r.end.split(":").map(Number),e=new Date(r.at);e.setHours(hh,mm,0,0);if(e.getTime()>r.at)end=e.getTime()}
    const u=`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent((CLUB?.name||"")+" · "+(D.c.sname||"Pickleball"))}&dates=${f(r.at)}/${f(end)}&location=${encodeURIComponent(r.place||"")}&details=${encodeURIComponent(miniLink())}`;
    return mxAct("openurl",{dataset:{v:u}})}
  if(act==="mxinvite"){const D=derive(),r=regCfg(),u=miniLink(),txt=`🏓 ${CLUB?.name||""}: ${D.c.sname||"buổi đánh"} · ${whenFull(r)}${r.place?` · ${r.place}`:""}. Đăng ký trong Zalo:`;
    if(window.ZMP&&window.ZMP.openShareSheet){try{await window.ZMP.openShareSheet({type:"link",data:{link:u,chatOnly:false}});return true}catch(e){}}
    if(navigator.share){try{await navigator.share({text:txt,url:u})}catch(e){}return true}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy lời mời")}catch(e){toast(u)}return true}
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
