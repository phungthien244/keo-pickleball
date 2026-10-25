/* ---------- Tab Hôm nay · Quản lý (bản 2 tab) ----------
   Hàng nút nhanh: Chia sẻ · Loa · Đọc thể thức.
   Nhóm thu gọn (mặc định đóng): Giải hôm nay · Điểm danh/check-in · Tiền · Sân và luật điểm · Cặp/chia bảng.
   Tuỳ chọn có công tắc: Chi phí · Giải thưởng · Trọng tài · Xếp sẵn · Loa/MC.
   Kết thúc và chốt giải: khoá cho tới khi giải bắt đầu. Nút chính dính đáy: Bắt đầu giải / Về Đang đánh. */
function hqQuick(D){
  const X=xCur(),live=phaseOf(D)==="live",mu=typeof loaMuted==="function"&&loaMuted();
  const sh=live?`<button data-act="lshare">↗ Chia sẻ</button>`:X?`<button data-act="regshare" data-id="${esc(X.id)}">↗ Chia sẻ</button>`:"";
  return `<div class="hqq">${sh}<button data-act="mute" aria-pressed="${!mu}">${mu?"🔇 Loa tắt":"🔊 Loa bật"}</button>${spkBtn("rules",`<button data-act="speakrules">📣 Đọc thể thức</button>`)}</div>`;
}
// Một nhóm thu gọn; sum có thể chứa HTML đã esc sẵn
function hqGrp(k,title,sum,body,o={}){
  const on=!o.lock&&prepOpen.has(k);
  return `<div class="hqg${on?" on":""}${o.lock?" lock":""}"><button class="hqgh" data-act="${o.lock?"hqlock":"prow"}" data-v="${k}" aria-expanded="${on}"><span class="t"><b>${title}</b><small>${sum}</small></span><i aria-hidden="true">${o.lock?"🔒":on?"⌃":"⌄"}</i></button>${on?`<div class="hqgb">${body}</div>`:""}</div>`;
}
function hqCkSum(D){
  const X=ckSched(),n=D.players.filter(p=>p.active!==false).length,rest=D.players.filter(p=>p.active===false&&p.hold).length;
  if(!X||!isAdm())return `${n} người có mặt${rest?` · ${rest} tạm nghỉ`:""}`;
  const s=ckStats(D,X);
  return `${s.arr}/${s.L.length} đã tới${s.pend?` · <b class="y">${s.pend} chờ duyệt</b>`:""}`;
}
// Danh sách ngắn trong nhóm check-in: chờ duyệt trước, rồi chưa tới, rồi vừa tới
function hqCkShort(D,X){
  const L=ckList(D,X),P=L.filter(r=>r.ci&&!r.arrived),N=L.filter(r=>!r.arrived&&!r.ci),A=L.filter(r=>r.arrived).sort((a,b)=>(b.arrivedAt||0)-(a.arrivedAt||0));
  const row=(r,right,sub)=>`<div class="hqck">${ckPic(D,r,"ckpic s")}<span class="t"><b>${esc(ckName(D,r))}</b><small>${sub}</small></span>${right}</div>`;
  const R=[...P.map(r=>row(r,`<button class="ckbtn" data-act="ckview" data-id="${esc(r.id)}">Duyệt</button>`,r.walkin?"xin vào · khách":"vừa quét mã")),
    ...N.map(r=>row(r,`<button class="ckbtn line" data-act="ckman" data-id="${esc(r.id)}">${armed("ckman:"+r.id)?"Bấm lần nữa":"Check-in tay"}</button>`,`chưa tới · ${ckPayLb(r)}`)),
    ...A.map(r=>row(r,`<span class="ckby ${r.arrBy==="btc"?"btc":"qr"}">${r.arrBy==="btc"?"✋ TAY":"⌗ QR"}</span>`,`${r.arrivedAt?hm(r.arrivedAt):""} · ${ckPayLb(r)}`))];
  return R.slice(0,4).join("")+(L.length?`<button class="lnk hqall" data-act="ckall">Xem đủ danh sách check-in (${L.length}) ›</button>`:"");
}
function hqCkBody(D){
  const X=ckSched();let h="";
  if(X&&isAdm()){h+=ckCard(D);h+=hqCkShort(D,X)}
  h+=`<span class="xsec">Ai có mặt · bấm để cho vào hoặc nghỉ</span>`+attChips(D);
  return h;
}
function hqMoney(D){
  const live=phaseOf(D)==="live",X=xCur();
  if(live||D.done.length){const R=recv(D,money(D));return {sum:D.c.cphi===false?"Không thu phí":R.tot?(R.left>0?`Đã thu ${fmtK(R.got)}/${fmtK(R.tot)} · <b class="y">còn ${fmtK(R.left)}</b>`:`Đã thu ${fmtK(R.got)}/${fmtK(R.tot)} · đủ`):"Tính khi lưu tỉ số",body:moneyMini(D)}}
  if(X){const s=ckStats(D,X),sent=s.L.filter(r=>r.pay==="sent").length;
    return {sum:s.due?`Cần thu <b class="y">${fmtK(s.due)}</b>${sent?` · ${sent} báo chuyển`:""}`:"Đã thu đủ lệ phí đăng ký",
      body:`<div class="tiles"><span class="tile"><span class="k">Cần thu</span><b class="num">${fmtK(s.due)}</b></span><span class="tile${sent?" warn":""}"><span class="k">Báo đã chuyển</span><b class="num">${sent}</b></span></div><a class="btn-line" href="${pathOf("app",{tab:"dk",x:X.id})}" data-go="app" data-t="dk" data-x="${esc(X.id)}">Xem từng người ở trang giải ›</a>`}}
  return {sum:D.c.cphi===false?"Không thu phí":esc(THU[D.c.thu||"keo"]||""),body:`<p class="rule">Tiền tự tính khi lưu tỉ số các trận. Cách thu chỉnh ở mục Chi phí bên dưới.</p>`};
}
function hqChot(D){
  const live=phaseOf(D)==="live";
  if(!live)return hqGrp("chot","Kết thúc và chốt giải","Mở khi giải đã bắt đầu","",{lock:true});
  const G=isG(D.c),GD=G&&(D.c.giai||{}).locked?gDerive(D):null;
  const sum=GD?`Đã đánh xong ${GD.resolved}/${GD.total} trận`:`${D.done.length} trận đã xong${D.playing.length?` · ${D.playing.length} đang đánh`:""}`;
  const M=money(D),pz=prizes(D,M);
  const st=(n,t,s)=>`<button class="hqst" data-act="step" data-v="chot"><span class="n">${n}</span><span class="t"><b>${t}</b> · ${s}</span><span aria-hidden="true">›</span></button>`;
  const body=`<div class="hqsts">${st(1,"Chi thật",COSTS.filter(([k])=>+D.c.costs[k]>0).map(([k,l])=>`${l.toLowerCase()} ${fmtK(+D.c.costs[k])}`).join(" · ")||"nhập chi phí sân, bóng, nước")}${st(2,"Trao thưởng",pz.length?pz.slice(0,3).map(p=>`${esc(p.label||"")} ${fmtK(p.k)}`).join(" · "):"không trao giải")}${st(3,"Gửi kết quả","vào nhóm Zalo, thẻ thành tích")}</div>
    ${D.playing.length?`<p class="rule">Còn ${D.playing.length} trận trên sân: lưu hoặc huỷ trước khi chốt.</p>`:""}<button class="primary wide" data-act="step" data-v="chot">Kết thúc và lưu giải</button><p class="rule">Chưa chốt thì vẫn đánh tiếp được. Chốt rồi vẫn mở lại để sửa được.</p>`;
  return hqGrp("chot","Kết thúc và chốt giải",sum,body);
}
// Trang Quản lý chia 6 thẻ ngang; mỗi lúc chỉ thấy một việc. Số vàng = việc còn thiếu.
let hqTab=null;
const HQ_TABS=[["san","Sẵn sàng"],["nguoi","Người"],["tien","Tiền"],["luat","Sân, luật"],["tt","Trọng tài"],["chot","Chốt"]];
// Sân đã có trọng tài (thành viên vai trọng tài hoặc máy vào bằng PIN được giao sân)
function hqRefCov(){const s=new Set();for(const r of [...(S.members||[]).filter(m=>m.role==="scorer"),...(S.editors||[])])for(const c of (r.courts||[]))s.add(Number(c));return s}
// Danh sách kiểm tra: [thẻ, đã xong?, chữ, nút]
function hqChecks(D){
  const c=D.c,G=isG(c),X=ckSched(),L=[],n=D.players.filter(p=>p.active!==false).length;
  L.push(["luat",true,`Sân, luật · ${c.courts} sân, chạm ${c.target}${winBy2(c)?" cách 2":""}`]);
  if(G){const g=c.giai||{},P=g.pairs||[],ok=P.length>=3&&(!isKO(g)||koGroupsOk(g));L.push(["nguoi",ok,`Cặp${isKO(g)?", chia bảng":""} · ${P.length} cặp${isKO(g)?(koGroupsOk(g)?` · ${koNEff(g)} bảng đã bốc`:" · chưa bốc chia bảng"):""}`,ok?"":"Sửa"])}
  const mu=typeof loaMuted==="function"&&loaMuted();L.push(["tt",!mu,mu?"Loa · đang tắt trên máy này":"Loa · bật trên máy này",mu?"Bật":""]);
  if(c.refOn===true){const cov=hqRefCov(),miss=Array.from({length:c.courts},(_,i)=>i+1).filter(k=>!cov.has(k));L.push(["tt",!miss.length,miss.length?`Trọng tài · ${miss.map(k=>"Sân "+cName(k)).join(", ")} chưa có`:"Trọng tài · đủ các sân",miss.length?"Giao":""])}
  if(X&&isAdm()){const st=ckStats(D,X);L.push(["nguoi",!st.pend,`Check-in · ${st.arr}/${st.L.length} đã tới${st.pend?` · ${st.pend} chờ duyệt`:""}`,st.pend?"Duyệt":""]);
    if(st.due)L.push(["tien",false,`Tiền · còn ${fmtK(st.due)} chưa thu`,"Xem"]);else L.push(["tien",true,"Tiền · đã thu đủ"])}
  else L.push(["nguoi",n>=4,`Có mặt · ${n} người${n<4?" · cần ít nhất 4":""}`,n<4?"Thêm":""]);
  return L;
}
function hqTabsBar(D,cur,live){
  const C=hqChecks(D),bad=k=>C.filter(x=>x[0]===k&&!x[1]).length,X=ckSched(),pend=X&&isAdm()?ckPending().filter(r=>r.sid===X.id).length:0;
  const badge={san:C.filter(x=>!x[1]).length,nguoi:live?pend:bad("nguoi"),tien:live?0:bad("tien"),tt:bad("tt")};
  return `<nav class="hqtabs" aria-label="Quản lý">${HQ_TABS.map(([k,l])=>{const lock=k==="chot"&&!live,on=k===cur;
    return `<button data-act="hqtab" data-v="${k}" aria-pressed="${on}"${lock?' class="lock"':""}>${l}${lock?" 🔒":""}${badge[k]?`<i>${badge[k]}</i>`:""}</button>`}).join("")}</nav>`;
}
function hqSanSang(D){
  const c=D.c,X=xCur(),live=phaseOf(D)==="live",C=hqChecks(D),done=C.filter(x=>x[1]).length,left=X&&X.at?X.at-Date.now():0;
  const T=isAdm()?xToday():[],many=T.length>1&&!live&&!D.SM.length;
  let h=`<section class="hqhero"><span class="k">${esc(X?xName(X):(c.sname||"Giải đấu nhanh"))}${X&&X.at?` · ${hm(X.at)}`:""}</span><b>${live?"Đang đánh":left>0?`còn ${left>=36e5?`${Math.floor(left/36e5)} giờ `:""}${Math.round(left%36e5/6e4)}′`:"Tới giờ đánh"}</b><span class="v">${done}/${C.length} mục xong · bấm dòng để sửa</span><span class="lk">${(X&&!live&&!D.SM.length)||many?`<button class="lnk hnchg" data-act="hnunpick">⇄ Đổi giải khác</button>`:""}${live?`<button class="lnk hnchg" data-act="lshare">↗ Chia sẻ trực tiếp</button>`:X?`<button class="lnk hnchg" data-act="regshare" data-id="${esc(X.id)}">↗ Chia sẻ giải</button>`:""}</span></section>`;
  h+=`<div class="hqchk">${C.map(([k,ok,t,b])=>`<button class="r" data-act="hqtab" data-v="${k}"><i class="${ok?"ok":"no"}">${ok?"✓":"!"}</i><span>${esc(t)}</span>${b?`<em>${b}</em>`:`<span class="go" aria-hidden="true">›</span>`}</button>`).join("")}</div>`;
  h+=`<div class="hqgs">${hqGrp("gio","Thông tin giải",esc(fmtTxt(c)),xPrepHero(D))}</div>`;
  if(!X)h+=xNoSched(D)+card(live?"Giải đấu này":"Giải đấu nhanh · không cần đăng ký trước",buoiBlock(D));
  return h;
}
function hqNguoi(D){
  const c=D.c,G=isG(c),X=ckSched(),live=phaseOf(D)==="live";let h="";
  if(X&&isAdm()){const s=ckStats(D,X),P=s.L.filter(r=>r.ci&&!r.arrived).length,N=s.L.filter(r=>!r.arrived&&!r.ci).length;
    h+=`<div class="hqtiles three"><span><b class="num">${s.arr}<small>/${s.L.length}</small></b><small>ĐÃ TỚI</small></span><span><b class="num y">${P}</b><small>CHỜ DUYỆT</small></span><span><b class="num">${N}</b><small>CHƯA TỚI</small></span></div>
      <div class="two hqbt"><button class="nv" data-act="ckall">⌗ Mở bàn đón</button><button class="line" data-act="hnlate" data-id="${esc(X.id)}">＋ Đến muộn</button></div><div class="hqopts">${hnOpts(X)}</div>`;
    h+=`<div class="hqcks">${hqCkShort(D,X)}</div>`}
  h+=`<span class="xsec">Ai có mặt · bấm để cho vào hoặc nghỉ</span>`+attChips(D);
  if(G){const g=c.giai||{pairs:[]},dt=c.dt||"free";h+=`<span class="xsec">${isKO(g)?"Cặp, chia bảng":"Các cặp"}</span>`+(g.locked?"":`<div class="fld"><span class="lbl">Nội dung</span><span class="seg segw">${[["free","Hỗn hợp"],["MM","Đôi nam"],["FF","Đôi nữ"],["mix","Đôi nam nữ"]].map(([v,l])=>sgB("dt",v,dt,l)).join("")}</span></div>`)+(g.locked?gRun(D,gDerive(D),"ql"):gSetup(D,g,{prep:!live}))}
  return h;
}
function hqTien(D){const M=hqMoney(D);return `<section class="hqbox"><span class="cap">Thu · ${M.sum}</span>${M.body}</section>`+prepRows(D,["tien","giai"])}
function hqLuat(D){return `<section class="hqbox">${fmtBlock(D)}</section>`+prepRows(D,["pre"])}
function hqTT(D){return (legacy||!isAdm()?"":dhTTBox(D))+prepRows(D,["tt","mc"])}
function hqChotTab(D){
  if(phaseOf(D)!=="live")return `<div class="empty"><strong>Mở khi giải đã bắt đầu</strong>Trao giải, chi thật, gửi kết quả và chốt sổ nằm ở đây.</div>`;
  const G=isG(D.c),GD=G&&(D.c.giai||{}).locked?gDerive(D):null,M=money(D),pz=prizes(D,M);
  const st=(n,t,s)=>`<button class="hqst" data-act="step" data-v="chot"><span class="n">${n}</span><span class="t"><b>${t}</b> · ${s}</span><span aria-hidden="true">›</span></button>`;
  if(dhAw)return `<button class="lnk hnback" data-act="dhaw0">‹ Về các bước chốt</button>`+dhAward(D);
  return `<section class="hqbox"><span class="cap">${GD?`Đã đánh xong ${GD.resolved}/${GD.total} trận`:`${D.done.length} trận đã xong${D.playing.length?` · ${D.playing.length} đang đánh`:""}`}</span><div class="hqsts">${`<button class="hqst" data-act="dhaw0"><span class="n">1</span><span class="t"><b>Trao giải</b> · bục 1-2-3, loa đọc từ hạng 3</span><span aria-hidden="true">›</span></button>`}${st(2,"Chi thật",COSTS.filter(([k])=>+D.c.costs[k]>0).map(([k,l])=>`${l.toLowerCase()} ${fmtK(+D.c.costs[k])}`).join(" · ")||"nhập chi phí sân, bóng, nước")}${st(3,"Gửi kết quả","vào nhóm Zalo, thẻ thành tích")}</div>
    ${D.playing.length?`<p class="rule">Còn ${D.playing.length} trận trên sân: lưu hoặc huỷ trước khi chốt.</p>`:""}<p class="rule">Chưa chốt thì vẫn đánh tiếp được. Chốt rồi vẫn mở lại để sửa được.</p></section>`;
}
function hqView(D){
  const c=D.c,G=isG(c),X=xCur(),live=phaseOf(D)==="live",n=D.players.filter(p=>p.active!==false).length;
  xAutoPrep(D);
  let cur=hqTab||(live?"nguoi":"san");if(cur==="chot"&&!live)cur="san";
  let h=(!X&&!live&&hnQuick&&isAdm()&&hnList().length?`<button class="lnk hnback" data-act="hnquickx">‹ Về danh sách giải</button>`:"");
  h+=hqTabsBar(D,cur,live);
  h+=({san:hqSanSang,nguoi:hqNguoi,tien:hqTien,luat:hqLuat,tt:hqTT,chot:hqChotTab}[cur])(D);
  if(live)return h+`<div class="hqcta">${cur==="chot"?`<button class="ball wide" data-act="step" data-v="chot">🏆 Kết thúc và chốt giải</button>`:`<button class="ball wide" data-act="step" data-v="live">← Về Đang đánh</button>`}</div>`;
  if(G)return h+gStartBar(D,c.giai||{pairs:[]});
  return h+`<div class="hqcta"><button class="ball wide go" data-act="start">▶ Khai mạc giải · ${n} người</button>${n<4?`<small>Cần ít nhất 4 người có mặt, hiện có ${n}.</small>`:`<small>Loa đọc thể thức → trận đầu tự vào sân</small>`}</div>`;
}

/* ---------- Đang đánh: dải trực tiếp + báo chờ duyệt ---------- */
function hqLive(D){
  const G=isG(D.c),all=[...D.done,...D.playing],t0=all.reduce((m,x)=>Math.min(m,typeof x.createdAt==="number"?x.createdAt:Infinity),Infinity);
  const el=isFinite(t0)?Math.max(0,Math.round((Date.now()-t0)/6e4)):0,dt=m=>m>=60?`${Math.floor(m/60)}h${String(m%60).padStart(2,"0")}′`:`${m}′`;
  let tx=isFinite(t0)?`Đã đánh ${dt(el)}`:"Vừa bắt đầu";
  if(G&&(D.c.giai||{}).locked){const GD=gDerive(D),left=GD.total-GD.resolved,est=Math.ceil(left/Math.max(1,D.c.courts))*GSLOT;
    tx+=left?` · còn ${left} trận · xong ~${hm(Date.now()+est*6e4)}`:" · đã đánh hết"}
  else tx+=` · ${D.done.length} trận xong`;
  let h=`<div class="hqlive"><span class="k"><i class="ldot"></i>TRỰC TIẾP</span><span class="v num">${tx}</span></div>`;
  const X=ckSched(),P=X&&isAdm()?ckPending().filter(r=>r.sid===X.id):[];
  if(P.length)h+=`<button class="hqban" data-act="ckview" data-id="${esc(P[0].id)}"><span><b>${P.length} người chờ duyệt check-in</b> · ${P.slice(0,3).map(r=>esc(ckName(D,r))).join(", ")}</span><span class="go">Duyệt ›</span></button>`;
  return h;
}
// Sân để lâu chưa nhập điểm (quá 20 phút)
const hqStale=m=>typeof m.createdAt==="number"&&Date.now()-m.createdAt>20*6e4?`<span class="hqold">● ${Math.round((Date.now()-m.createdAt)/6e4)}′ chưa nhập điểm</span>`:"";

/* ---------- Danh sách check-in đầy đủ ---------- */
let ckAllOpen=false,ckAllF="all";
function ckAll(D){
  const X=ckSched();if(!X){ckAllOpen=false;return ""}
  const s=ckStats(D,X),L=s.L,q=String(val("ck-q","")).trim().toLowerCase();
  const P=L.filter(r=>r.ci&&!r.arrived),N=L.filter(r=>!r.arrived&&!r.ci),A=L.filter(r=>r.arrived).sort((a,b)=>(b.arrivedAt||0)-(a.arrivedAt||0));
  const f=ckAllF,mt=r=>!q||String(ckName(D,r)).toLowerCase().includes(q);
  const sub=r=>{const p=r.pid?D.pmap.get(r.pid):null,g=(p?.gender||r.gender)==="F"?"Nữ":"Nam",lv=p?r2(D.st.get(p.id)?.rating??3):(r.lv||"");
    return `${g}${lv?` · ${lv}`:""} · ${r.guest?"ngoài CLB":"thành viên"}`};
  const pay=r=>`<span class="hqpay ${r.pay==="ok"?"ok":r.pay==="sent"?"sent":"no"}">${ckPayLb(r)}</span>`;
  const row=(r,right,extra="")=>`<div class="hqck big">${ckPic(D,r,"ckpic")}<span class="t"><b>${esc(ckName(D,r))}${r.walkin&&!r.arrived?` <i class="tag">XIN VÀO</i>`:""}</b><small>${sub(r)}${extra}</small>${pay(r)}</span>${right}</div>`;
  let h=`<div class="hqhd"><button data-act="ckallx" aria-label="Quay lại">‹</button><b>Bàn đón · ${esc(xName(X))}</b></div>
    <div class="hqqr"><span class="ic" aria-hidden="true">⌗</span><span class="t"><b>QUÉT ĐỂ CHECK-IN</b><small>Mở mã toàn màn hình, quay về phía người tới · mã đổi mỗi 30 giây</small></span><button class="nv" data-act="ckopen" data-id="${esc(X.id)}">Mở mã</button></div>
    <div class="hqtiles"><span><b class="num">${s.arr}<small>/${L.length}</small></b><small>ĐÃ TỚI</small></span><span><b class="num y">${P.length}</b><small>CHỜ DUYỆT</small></span><span><b class="num">${N.length}</b><small>CHƯA TỚI</small></span><span><b class="num">${fmtK(s.due)}</b><small>CẦN THU</small></span></div>
    <div class="xbfl">${[["all","Tất cả",L.length],["pend","Chờ duyệt",P.length],["no","Chưa tới",N.length],["yes","Đã tới",A.length]].map(([k,l,n])=>`<button data-act="ckallf" data-v="${k}" aria-pressed="${f===k}">${l} ${n}</button>`).join("")}</div>`;
  if(L.length>10)h+=`<label class="srch xbq"><span class="sr">Tìm tên</span><input id="ck-q" data-draft="ck-q" data-live="1" type="search" placeholder="Tìm tên…" value="${esc(val("ck-q",""))}"></label>`;
  const sec=(k,t,R,fn)=>(f==="all"||f===k)&&R.filter(mt).length?`<span class="xsec">${t}</span><div class="hqcks">${R.filter(mt).map(fn).join("")}</div>`:"";
  h+=sec("pend","Chờ duyệt · bấm để so mặt và thu tiền",P,r=>row(r,`<button class="ckbtn" data-act="ckview" data-id="${esc(r.id)}">Duyệt</button>`,r.ci?` · quét ${hm(r.ci)}`:""));
  if(N.length&&(f==="all"||f==="no"))h+=`<button class="line hqcall" data-act="ckcallall">📣 Loa gọi ${N.length} người chưa tới</button>`;
  h+=sec("no","Chưa tới",N,r=>row(r,`<button class="ckbtn line" data-act="ckman" data-id="${esc(r.id)}">${armed("ckman:"+r.id)?"Bấm lần nữa":"Check-in tay"}</button>`));
  h+=sec("yes","Đã tới · mới nhất trước",A,r=>row(r,`<span class="ckby ${r.arrBy==="btc"?"btc":"qr"}">${r.arrBy==="btc"?"✋ TAY":"⌗ QR"}</span><button class="ckbtn line ckun" data-act="ckundo" data-id="${esc(r.id)}" aria-label="Hoàn tác check-in">${armed("ckundo:"+r.id)?"Hoàn tác?":"↶"}</button>`,r.arrivedAt?` · ${hm(r.arrivedAt)}`:""));
  if(!L.length)h+=`<div class="empty"><strong>Chưa có ai trong danh sách</strong>Người đăng ký giải sẽ hiện ở đây.</div>`;
  return h+`<div class="hqcta two"><button class="btn-line" data-act="hnlate" data-id="${esc(X.id)}">＋ Đến muộn</button><button class="ball" data-act="ckallx">Xong · về Quản lý</button></div>`;
}
function hqAct(act,b){
  if(act==="ckall"){ckAllOpen=true;ckAllF="all";render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ckallx"){ckAllOpen=false;render();return true}
  if(act==="ckcallall"){const D=derive(),X=ckSched();if(!X)return true;const N=ckList(D,X).filter(r=>!r.arrived&&!r.ci).map(r=>ckName(D,r));
    if(!N.length)return true;if(typeof loaMuted==="function"&&loaMuted()){toast("Loa đang tắt trên máy này.");return true}
    speak(`Mời các vận động viên ${N.join(", ")} tới bàn ban tổ chức để check-in.`,"","ckcall");return true}
  if(act==="ckallf"){ckAllF=b.dataset.v||"all";render();return true}
  if(act==="hqlock"){toast("Mục này mở khi giải đã bắt đầu.");return true}
  if(act==="hqtab"){const v=b.dataset.v;if(v==="chot"&&phaseOf(derive())!=="live"){toast("Thẻ Chốt mở khi giải đã bắt đầu.");return true}hqTab=v;ckAllOpen=false;render();try{scrollTo({top:0})}catch(e){}return true}
  return false;
}
