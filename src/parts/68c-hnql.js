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
function hqView(D){
  const c=D.c,G=isG(c),X=xCur(),live=phaseOf(D)==="live",n=D.players.filter(p=>p.active!==false).length;
  xAutoPrep(D);
  let h=(!X&&!live&&hnQuick&&isAdm()&&hnList().length?`<button class="lnk hnback" data-act="hnquickx">‹ Về danh sách giải</button>`:"");
  h+=hqQuick(D);
  // Nhóm 1: giải hôm nay
  const T=isAdm()?xToday():[],many=T.length>1&&!live&&!D.SM.length;
  let gb=xPrepHero(D);
  if(!X){gb+=xNoSched(D)+card(live?"Giải đấu này":"Giải đấu nhanh · không cần đăng ký trước",buoiBlock(D))}
  h+=`<div class="hqgs">`+hqGrp("gio","Giải hôm nay",esc([X?xName(X):(c.sname||"Giải đấu nhanh"),fmtTxt(c)].filter(Boolean).join(" · "))+(many||(X&&!live)?" · đổi giải":""),gb);
  h+=hqGrp("ck","Điểm danh, check-in",hqCkSum(D),hqCkBody(D));
  {const M=hqMoney(D);h+=hqGrp("tien","Tiền",M.sum,M.body)}
  h+=hqGrp("san","Sân và luật điểm",esc(`${c.courts} sân · chạm ${c.target}${winBy2(c)?" cách 2":""}${ptMax(c)?`, trần ${ptMax(c)}`:""}${live?" · đổi sân giữa giải":""}`),fmtBlock(D));
  if(G){const g=c.giai||{pairs:[]},P=g.pairs||[];
    const body=g.locked?gRun(D,gDerive(D),"ql"):gSetup(D,g,{prep:!live});
    h+=hqGrp("cap",isKO(g)?"Cặp, chia bảng":"Các cặp",`${P.length} cặp${isKO(g)?` · ${koNEff(g)} bảng`:""}${g.locked?" · đã khoá lịch":""}`,body)}
  h+=`</div>`;
  h+=prepRows(D);
  h+=`<div class="hqgs">${hqChot(D)}</div>`;
  if(live)return h+`<div class="hqcta"><button class="ball wide" data-act="step" data-v="live">← Về Đang đánh</button></div>`;
  if(G)return h+gStartBar(D,c.giai||{pairs:[]});
  return h+`<div class="hqcta"><button class="ball wide" data-act="start">Bắt đầu giải · ${n} người →</button>${n<4?`<small>Cần ít nhất 4 người có mặt, hiện có ${n}.</small>`:""}</div>`;
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
  let h=`<div class="hqhd"><button data-act="ckallx" aria-label="Quay lại">‹</button><b>Check-in · ${esc(xName(X))}</b></div>
    <div class="hqtiles"><span><b class="num">${s.arr}<small>/${L.length}</small></b><small>ĐÃ TỚI</small></span><span><b class="num y">${P.length}</b><small>CHỜ DUYỆT</small></span><span><b class="num">${N.length}</b><small>CHƯA TỚI</small></span><span><b class="num">${fmtK(s.due)}</b><small>CẦN THU</small></span></div>
    <div class="xbfl">${[["all","Tất cả",L.length],["pend","Chờ duyệt",P.length],["no","Chưa tới",N.length],["yes","Đã tới",A.length]].map(([k,l,n])=>`<button data-act="ckallf" data-v="${k}" aria-pressed="${f===k}">${l} ${n}</button>`).join("")}</div>`;
  if(L.length>10)h+=`<label class="srch xbq"><span class="sr">Tìm tên</span><input id="ck-q" data-draft="ck-q" data-live="1" type="search" placeholder="Tìm tên…" value="${esc(val("ck-q",""))}"></label>`;
  const sec=(k,t,R,fn)=>(f==="all"||f===k)&&R.filter(mt).length?`<span class="xsec">${t}</span><div class="hqcks">${R.filter(mt).map(fn).join("")}</div>`:"";
  h+=sec("pend","Chờ duyệt · bấm để so mặt và thu tiền",P,r=>row(r,`<button class="ckbtn" data-act="ckview" data-id="${esc(r.id)}">Duyệt</button>`,r.ci?` · quét ${hm(r.ci)}`:""));
  h+=sec("no","Chưa tới",N,r=>row(r,`<button class="ckbtn line" data-act="ckman" data-id="${esc(r.id)}">${armed("ckman:"+r.id)?"Bấm lần nữa":"Check-in tay"}</button>`));
  h+=sec("yes","Đã tới · mới nhất trước",A,r=>row(r,`<span class="ckby ${r.arrBy==="btc"?"btc":"qr"}">${r.arrBy==="btc"?"✋ TAY":"⌗ QR"}</span><button class="ckbtn line ckun" data-act="ckundo" data-id="${esc(r.id)}" aria-label="Hoàn tác check-in">${armed("ckundo:"+r.id)?"Hoàn tác?":"↶"}</button>`,r.arrivedAt?` · ${hm(r.arrivedAt)}`:""));
  if(!L.length)h+=`<div class="empty"><strong>Chưa có ai trong danh sách</strong>Người đăng ký giải sẽ hiện ở đây.</div>`;
  return h+`<div class="hqcta two"><button class="btn-line" data-act="hnlate" data-id="${esc(X.id)}">＋ Đến muộn</button><button class="ball" data-act="ckopen" data-id="${esc(X.id)}">⌗ Mở mã check-in</button></div>`;
}
function hqAct(act,b){
  if(act==="ckall"){ckAllOpen=true;ckAllF="all";render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ckallx"){ckAllOpen=false;render();return true}
  if(act==="ckallf"){ckAllF=b.dataset.v||"all";render();return true}
  if(act==="hqlock"){toast("Mục này mở khi giải đã bắt đầu.");return true}
  return false;
}
