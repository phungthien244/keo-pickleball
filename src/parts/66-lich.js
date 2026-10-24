/* ---------- Lịch buổi: nhiều buổi sắp tới, mỗi buổi đăng ký riêng, lặp lại hằng tuần ----------
   clubs/{c}/sched/{id}  một giải đấu: name, fmt, at, end, place, map, note, courts, target, max, lvMin, lvMax, guests,
                         thu, fee, phi, feeG, pay, dlH, lockH, deadline, lockAt, hang, st, openAt, series, num
     st: draft (nháp) · open (đang nhận) · plan (tự mở lúc openAt) · done (đã chốt) · cancel (đã hủy)
   clubs/{c}/series/{id} lịch lặp: days [0..6], time, end, tpl {các trường của giải đấu}, auto, openD, on
   Đăng ký của giải đấu trong lịch: regs.sid = mã giải đấu (chuỗi). Giải đấu đang chuẩn bị ở tab Sân: app/config.schedId */
let RX=null,xNew=null,xEdit=null,xSEdit=null,xDay=null,xDoneOpen=false,xQr=null;
const withX=(X,fn)=>{const o=RX;RX=X||null;try{return fn()}finally{RX=o}};
const regKey=D=>RX?RX.id:D.sid;
const DOW=["CN","T2","T3","T4","T5","T6","T7"];
const sameDay=(a,b)=>new Date(a).toDateString()===new Date(b).toDateString();
const dayStart=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const ymd=t=>{const d=new Date(t);return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}`};
const isoDay=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const payNoteX=(X,name)=>`${noAcc(CID)} N${new Date(X.at||Date.now()).getDate()}${String(new Date(X.at||Date.now()).getMonth()+1).padStart(2,"0")} ${noAcc(name)}`.slice(0,25).trim();

/* ----- Trạng thái ----- */
function xState(x){
  if(!x)return "none";
  if(cfg().schedId===x.id&&MODE==="club"&&x.st!=="done"&&x.st!=="cancel"&&(cfg().phase==="live"||(S.matches||[]).length))return "live";
  if(x.st==="plan")return x.openAt&&Date.now()>=x.openAt?"open":"plan";
  return x.st||"draft";
}
const xOpen=x=>x.reg!==false&&xState(x)==="open"&&!(x.deadline&&Date.now()>x.deadline)&&!(x.at&&Date.now()>x.at);
const xShown=x=>x&&x.st!=="done"&&x.st!=="cancel"&&((x.at||0)>Date.now()-10*3600e3||cfg().schedId===x.id);
const schedAll=()=>(S.sched||[]).slice().sort((a,b)=>(a.at||0)-(b.at||0));
const schedUp=()=>schedAll().filter(xShown);
const schedById=id=>(S.sched||[]).find(x=>x.id===id)||null;
const xCur=()=>{const id=cfg().schedId;return id?schedById(id):null};
const xIsKo=()=>xEdit?!!schedById(xEdit)?.ko:xSEdit?!!((S.series||[]).find(z=>z.id===xSEdit)?.tpl?.ko):xNew==="bang";
const xName=x=>x.name||(x.fmt==="giai"?(x.ko?"Giải vòng bảng":"Giải cặp cố định"):"Giải đấu");
const xFmt=x=>x.fmt==="giai"?(x.ko?"Vòng bảng → Knockout":"Cặp cố định"):"Xoay cặp";
const xTime=x=>x.at?`${hm(x.at)}${x.end?`–${x.end}`:""}`:"Chưa đặt giờ";
const xFee=x=>Math.max(0,(x.thu||"keo")==="phi"?+x.phi||0:+x.fee||0);
const xRegN=x=>(S.regs||[]).filter(r=>r.sid===x.id&&!r.cancel).length;
// Buổi cho người chơi: buổi trên đường dẫn, không thì buổi gần nhất đang nhận đăng ký
function xPick(){if(routeX)return schedById(routeX);const U=schedUp().filter(x=>x.st!=="draft");return U.find(xOpen)||null}
// Buổi đang xem khi bấm nút (đăng ký, hủy, xác nhận tiền…)
const xCtx=()=>route==="app"&&tab==="dk"?(routeX?schedById(routeX):(isAdm()&&!(MINI&&mxMode()==="choi")?null:xPick())):null;
const xPaySid=(x,D)=>typeof x.sid==="number"||cfg().schedId===x.sid;
function xChip(x){
  const s=xState(x),t=Date.now();
  if(x.reg===false&&(s==="open"||s==="plan"))return `<span class="xchip ok">Đến là chơi · không cần đăng ký</span>`;
  if(s==="live")return `<span class="xchip ok">Đang đánh</span>`;
  if(s==="open")return (x.deadline&&t>x.deadline)||(x.at&&t>x.at)?`<span class="xchip">Đã đóng đăng ký</span>`:`<span class="xchip ok">Đang nhận đăng ký</span>`;
  if(s==="plan")return `<span class="xchip warn">Tự mở ${DOW[new Date(x.openAt).getDay()]} ${dmy(x.openAt).slice(0,5)}, ${hm(x.openAt)}</span>`;
  if(s==="draft")return `<span class="xchip">Nháp</span>`;
  if(s==="cancel")return `<span class="xchip bad">Đã hủy</span>`;
  return `<span class="xchip">Đã xong</span>`;
}
const xDate=(t,dark)=>{const d=new Date(t||Date.now());return `<span class="xdate${dark?" on":""}"><small>${DOW[d.getDay()]}</small><b>${t?d.getDate():"?"}</b><small>TH ${d.getMonth()+1}</small></span>`};
function xProg(x){const n=xRegN(x),m=+x.max||0;
  return m?`<span class="xprog"><i><b style="width:${Math.min(100,Math.round(n/m*100))}%"></b></i><b class="num">${n}/${m}</b></span>`:(n?`<small class="xmeta">${n} người đã đăng ký</small>`:"")}

/* ----- Tự chạy khi quản lý mở app: chuyển đăng ký cách cũ sang lịch, tạo sẵn buổi của lịch lặp 2 tuần tới ----- */
let xEnsuring=false,xEnsured="";
async function xEnsure(D){
  if(!isAdm()||legacy||!S.schedReady||!S.seriesReady||xEnsuring)return;
  const k=JSON.stringify([(S.series||[]).map(s=>[s.id,s.on,s.at||0]),(S.sched||[]).length,!!(cfg().reg&&cfg().reg.on),dayStart(Date.now())]);
  if(xEnsured===k)return;xEnsuring=true;
  try{
    const r=cfg().reg;
    if(r&&r.on&&(r.sid==null||r.sid===D.sid)){const id="m"+D.sid,c=D.c;
      if(!schedById(id)){
        await db.collection("sched").doc(id).set(xClean({name:c.sname||"",fmt:isG(c)?"giai":"xoay",at:r.at||0,end:r.end||"",place:r.place||"",map:r.map||"",note:r.note||"",courts:+c.courts||2,target:+c.target||11,
          max:+r.max||0,lvMin:r.lvMin||"",lvMax:r.lvMax||"",guests:!!r.guests,thu:c.thu||"keo",fee:+r.fee||0,phi:+c.phi||0,feeG:r.feeG??"",pay:r.pay||"off",lockH:r.lockH??2,dlH:0,deadline:r.deadline||0,lockAt:r.at?r.at-(+r.lockH||0)*3600e3:0,st:"open",createdAt:Date.now()}));
        for(const x of (S.regs||[]).filter(z=>z.sid===D.sid)){const {id:oid,...d}=x;await db.collection("regs").doc(oid.replace(/^\d+_/,id+"_")).set({...d,sid:id});await db.collection("regs").doc(oid).delete()}
      }
      await saveCfg({reg:{...r,on:false},schedId:id});
    }
    for(const s of (S.series||[]).filter(s=>s.on))await xMaterialize(s);
    xEnsured=k;
  }catch(e){}finally{xEnsuring=false}
}
const xClean=o=>{const r={};for(const [k,v] of Object.entries(o))if(v!==undefined)r[k]=v;return r};
// Tạo các buổi của lịch lặp trong 14 ngày tới (mã buổi cố định theo ngày nên không tạo trùng)
async function xMaterialize(s){
  const [h,m]=String(s.time||"19:00").split(":").map(Number),now=Date.now();
  for(let d=0;d<14;d++){
    const day=new Date(dayStart(now)+d*864e5+3600e3);day.setHours(h||0,m||0,0,0);const at=day.getTime();
    if(!(s.days||[]).includes(day.getDay())||at<now||(s.from&&at<s.from))continue;
    const id=s.id+"-"+ymd(at);
    if(schedById(id)||(S.sched||[]).some(x=>x.series===s.id&&sameDay(x.at,at)))continue;
    await db.collection("sched").doc(id).set(xBuild({...s.tpl,at,end:s.end||s.tpl.end||""},{...(s.byZ?{byZ:s.byZ,byN:s.byN||""}:{}),series:s.id,st:s.auto?"plan":"draft",openAt:s.auto?at-(+s.openD||2)*864e5:0}));
  }
}
// Người tạo giải: tên + mã chat Zalo (tạo trong Mini App) để người chơi bấm Nhắn tin
function xBy(){const z=myZid();if(!z)return {};const me=S.link&&S.link.status==="ok"&&derive().pmap.get(S.link.pid);return {byZ:z,byN:String(me?.name||zaloProf().n||who()).slice(0,40)}}
function xBuild(f,extra){
  const lockH=Math.max(0,+f.lockH||0),dlH=Math.max(0,+f.dlH||0);
  return xClean({...f,lockH,dlH,deadline:f.at?f.at-dlH*3600e3:0,lockAt:f.at&&lockH?f.at-lockH*3600e3:0,createdAt:Date.now(),...xBy(),...extra});
}

/* ----- Quản lý: tab Tạo (Mini App) / Lịch buổi (web) ----- */
function vLichAdm(D){
  if(legacy)return `<div class="empty"><strong>Chưa dùng được</strong>CLB cần chuyển sang tài khoản CLB trước.</div>`;
  if(!isAdm())return vLichPlayer(D);
  xEnsure(D);
  if(xNew||xEdit||xSEdit)return xForm(D);
  if(routeX){const X=schedById(routeX);if(X)return xAdminDetail(D,X);if(S.schedReady)return `<div class="empty"><strong>Không thấy giải đấu này</strong>Giải đấu đã bị xoá.</div><a class="line wide" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk">Về lịch giải đấu</a>`}
  let h=approvals(D);
  h+=`<button class="xnewbtn" data-act="xnew">+ Tạo giải đấu mới</button>`;
  for(const s of (S.series||[]).filter(s=>s.on))h+=`<div class="xser"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>
    <span class="t"><b>Lặp hằng tuần: ${(s.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DOW[d]).join(" & ")} · ${esc(s.time||"")}</b><small>${esc(xName(s.tpl||{}))} · ${xFmt(s.tpl||{})} · ${s.auto?`tự mở đăng ký trước ${+s.openD||2} ngày`:"tự bấm mở đăng ký"}</small></span>
    <button class="lnk" data-act="xsedit" data-id="${s.id}">Sửa</button><button class="lnk" data-act="xsoff" data-id="${s.id}">${armed("xsoff:"+s.id)?"Tắt?":"Tắt"}</button></div>`;
  const U=schedUp();
  h+=xStrip(U);
  const L=U.filter(x=>!xDay||sameDay(x.at,xDay));
  h+=`<span class="xsec">${xDay?`${dowVN(xDay)}, ${dmy(xDay).slice(0,5)}`:"Sắp tới"}</span>`;
  h+=!S.schedReady?`<p class="rule">Đang tải…</p>`:L.length?L.map(x=>xAdminCard(D,x)).join(""):`<div class="xempty">${xDay?"Ngày này chưa có giải đấu.":"Chưa có giải đấu nào sắp tới. Bấm “Tạo giải đấu mới” để lên lịch và mở đăng ký."}</div>`;
  const done=schedAll().filter(x=>x.st==="done"||x.st==="cancel").reverse().slice(0,12);
  if(done.length)h+=`<button class="xdonebtn" data-act="xdone" aria-expanded="${xDoneOpen}"><span>Đã xong · ${done.length} giải đấu gần đây</span><span>${xDoneOpen?"−":"›"}</span></button>`+(xDoneOpen?done.map(x=>xAdminCard(D,x)).join(""):"");
  return h;
}
function xStrip(U){
  const t0=dayStart(Date.now());
  return `<div class="xstrip" role="group" aria-label="Lọc theo ngày">${Array.from({length:7},(_,i)=>{const t=t0+i*864e5+3600e3,on=xDay&&sameDay(xDay,t),has=U.some(x=>sameDay(x.at,t));
    return `<button data-act="xday" data-v="${t}" aria-pressed="${!!on}"><small>${i?DOW[new Date(t).getDay()]:"Nay"}</small><b>${new Date(t).getDate()}</b><i class="${has?"y":""}"></i></button>`}).join("")}</div>`;
}
function xAdminCard(D,x){
  const fee=xFee(x),sub=[xTime(x),xFmt(x),x.courts?`${x.courts} sân`:"",fee?fmtK(fee):""].filter(Boolean).join(" · ");
  const btn=x.st==="draft"&&x.at>Date.now()?`<button class="line sm" data-act="xopen" data-id="${x.id}">Mở đăng ký</button>`:"";
  return `<div class="xcard${x.st==="cancel"?" off":""}"><a class="xmain" href="${pathOf("app",{tab:"dk",x:x.id})}" data-go="app" data-t="dk" data-x="${esc(x.id)}">${xDate(x.at,xState(x)==="open"||xState(x)==="live")}
    <span class="t"><b>${esc(xName(x))}</b><small>${esc(sub)}</small><span class="xrow">${xChip(x)}${x.series?`<small class="xmeta">↻ hằng tuần</small>`:""}</span>${xProg(x)}</span></a>${btn?`<div class="xact">${btn}</div>`:""}</div>`;
}
function xAdminDetail(D,X){
  return withX(X,()=>{
    const s=xState(X),R=regList(D),fee=xFee(X),got=R.all.filter(x=>x.pay==="ok").reduce((a,x)=>a+feeOf(x),0),link=miniLink(CID,X.id),today=sameDay(X.at,Date.now());
    let h=`<a class="xback" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk">‹ Lịch giải đấu</a>`;
    if(X.poster){const pi=posterCache[X.id];if(pi===undefined)posterGet(X.id).then(()=>render());else if(pi)h+=`<img class="gdposter" src="${esc(pi)}" alt="Poster ${esc(xName(X))}">`}
    h+=`<section class="xhero"><span class="k">${X.at?`${esc(dowVN(X.at))} · ${esc(dmy(X.at))} · `:""}${esc(xTime(X))}</span><h1>${esc(xName(X))}</h1>
      <span class="sub">${esc([xFmt(X),X.courts&&`${X.courts} sân`,X.target&&`chạm ${X.target}`,fee&&fmtK(fee),X.place].filter(Boolean).join(" · "))}</span>
      <span class="xrow">${xChip(X)}${X.series?`<span class="xchip dk">↻ hằng tuần</span>`:""}${X.guests?`<span class="xchip dk">Nhận VĐV ngoài CLB</span>`:""}</span>
      ${+X.max?`<span class="xprog big"><i><b style="width:${Math.min(100,Math.round(R.conf.length/X.max*100))}%"></b></i><b class="num">${R.conf.length}/${X.max}</b></span>`:`<b class="num" style="font-size:20px">${R.conf.length} người đã đăng ký</b>`}
      <small>${[R.wait.length&&`${R.wait.length} người chờ chỗ`,payOn()&&`đã nhận ${kVND(got)}`,X.deadline&&`đóng đăng ký ${hm(X.deadline)} ${dowVN(X.deadline)}`].filter(Boolean).join(" · ")}</small></section>`;
    if(s==="draft"||s==="plan")h+=`<button class="primary wide" data-act="xopen" data-id="${X.id}">Mở đăng ký ngay</button>`;
    if(today&&s!=="live"&&s!=="done"&&s!=="cancel")h+=`<a class="dkban" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><span class="t"><b>Giải đấu hôm nay</b><small>Vào tab Sân để điểm danh và bắt đầu</small></span><span aria-hidden="true">›</span></a>`;
    if(s==="open"||s==="plan"||s==="live")h+=`<div class="xlinks"><button class="primary" data-act="regshare" data-id="${X.id}">Gửi link vào Zalo</button><button class="line" data-act="cplink" data-v="${esc(link)}">Copy link</button><button class="line" data-act="xqr" data-id="${X.id}">${xQr===X.id?"Ẩn QR":"Mã QR"}</button></div>
      ${xQr===X.id?`<div class="dkqr">${qrSvgText(link,180)}<small class="rule">Quét bằng Zalo để mở trang đăng ký giải này.</small></div>`:""}`;
    h+=xPeople(D,X);
    h+=`<div class="xlist">
      <button class="xli" data-act="xedit" data-id="${X.id}"><span>Sửa cài đặt giải đấu</span><span>›</span></button>
      ${s==="open"?`<button class="xli" data-act="xpause" data-id="${X.id}"><span>Tạm dừng đăng ký</span><span>›</span></button>`:""}
      ${s!=="cancel"&&s!=="done"&&s!=="live"?`<button class="xli danger" data-act="xcancel" data-id="${X.id}"><span>${armed("xcancel:"+X.id)?"Bấm lần nữa để hủy giải đấu":"Hủy giải đấu này"}</span><span>›</span></button>`:""}
      ${!R.all.length&&s!=="live"?`<button class="xli danger" data-act="xdel" data-id="${X.id}"><span>${armed("xdel:"+X.id)?"Bấm lần nữa để xoá":"Xoá giải đấu"}</span><span>›</span></button>`:""}</div>`;
    if(s==="cancel"&&R.all.length)h+=`<small class="rule">Giải đấu đã hủy: nhắn người đã đăng ký trong nhóm Zalo, hoàn phí người đã chuyển ở danh sách trên.</small>`;
    return h;
  });
}

// Người đăng ký của một buổi: 3 tab Đã đăng ký · Chờ chỗ · Đã hủy, mỗi người một dòng có tiền và nút xác nhận
let xPTab="dk";
// Mã chat Zalo của người đăng ký: lưu lúc đăng ký trong Mini App, hoặc từ yêu cầu tham gia CLB (đã liên kết Zalo)
const zidOfP=p=>{if(!p||!p.zuid)return "";const L=(S.links||[]).find(l=>l.id===p.zuid);return L&&L.zid||""};
const zidOf=(D,x)=>x.zid||zidOfP(x.pid&&D.pmap.get(x.pid))||"";
function xPeople(D,X){
  const R=regList(D),po=payOn(),cancel=(S.regs||[]).filter(r=>r.sid===X.id&&r.cancel);
  const nm=x=>x.guest?x.name:(D.pmap.get(x.pid)?.name||x.name||"?");
  const row=(x,i,wait)=>{const p=D.pmap.get(x.pid),pay=x.pay||"none",k=feeOf(x),s=p&&D.st.get(p.id);
    const sub=[x.guest?`VĐV ngoài CLB${x.lv?" · "+x.lv:""}`:s?`${r2(s.rating)} · thành viên`:"thành viên",x.by?`thêm bởi ${x.by}`:`${hm(x.at)} ${dmy(x.at).slice(0,5)}`].filter(Boolean).join(" · ");
    const chip=po&&k?`<span class="paychip ${pay}">${pay==="ok"?`Đã nhận ${kVND(k)}`:pay==="sent"?"Báo đã chuyển":"Chưa trả"}</span>`:"";
    return `<div class="xp${wait?" wt":""}"><span class="no num">${i+1}</span>${av(p||{name:nm(x)},"sm",1)}<span class="t"><b>${esc(nm(x))}${x.arrived?` <small class="atag q">✓ đã đến</small>`:""}</b><small>${esc(sub)}</small>${capTag(D,x)}${chip}</span>
      <span class="b">${MINI&&zidOf(D,x)?`<button class="ghost sm" data-act="zchat" data-v="${esc(zidOf(D,x))}" data-n="${esc(nm(x))}" aria-label="Nhắn Zalo cho ${esc(nm(x))}">💬</button>`:""}${po&&k&&pay!=="ok"?`<button class="${pay==="sent"?"primary":"line"} sm" data-act="regpayok" data-id="${x.id}">✓ Nhận</button>`:""}${po&&pay==="ok"?`<button class="ghost sm" data-act="regpayundo" data-id="${x.id}" aria-label="Bỏ xác nhận phí">↺</button>`:""}<button class="ghost danger sm" data-act="regdel" data-id="${x.id}" aria-label="Bỏ khỏi danh sách">${armed("regdel:"+x.id)?"Bỏ?":"✕"}</button></span></div>`};
  const tb=(k,l)=>`<button data-act="xptab" data-v="${k}" aria-pressed="${xPTab===k}">${l}</button>`;
  let h=`<section class="xppl"><div class="xptabs">${tb("dk",`Đã đăng ký ${R.conf.length}`)}${tb("wait",`Chờ chỗ ${R.wait.length}`)}${tb("huy",`Đã hủy ${cancel.length}`)}</div><div class="xpl">`;
  if(xPTab==="dk")h+=R.conf.length?R.conf.map((x,i)=>row(x,i)).join(""):`<p class="rule">Chưa ai đăng ký.</p>`;
  else if(xPTab==="wait")h+=R.wait.length?R.wait.map((x,i)=>row(x,i,1)).join(""):`<p class="rule">Không có ai chờ chỗ.</p>`;
  else h+=cancel.length?cancel.map(x=>`<div class="xp"><span class="t"><b>${esc(nm(x))}</b><small>hủy lúc ${hm(x.cancelAt)} ${dmy(x.cancelAt||0).slice(0,5)}${po&&feeOf(x)?` · ${kVND(feeOf(x))} · ${x.pay==="refund"?"đã hoàn phí":x.pay==="sent"||x.pay==="ok"?"cần hoàn phí":"chưa trả"}`:""}</small></span><span class="b">${(x.pay==="sent"||x.pay==="ok")?`<button class="line sm" data-act="regrefund" data-id="${x.id}">Đã hoàn</button>`:""}<button class="ghost danger sm" data-act="regdel" data-id="${x.id}" aria-label="Xoá">${armed("regdel:"+x.id)?"Xoá?":"✕"}</button></span></div>`).join(""):`<p class="rule">Không có ai hủy.</p>`;
  h+=`</div>`;
  if(R.expired.length)h+=`<small class="rule" style="padding:0 14px">${R.expired.length} người giữ chỗ quá 30 phút chưa chuyển khoản, đã nhường chỗ.</small>`;
  if(R.all.length&&cfg().schedId===X.id)h+=`<button class="xaddp" data-act="regatt">${armed("regatt:x")?"Bấm lần nữa":"Điểm danh theo danh sách đăng ký"}</button>`;
  h+=`<button class="xaddp" data-act="regadd">${regAddOpen?"Đóng":"+ Thêm người vào giải đấu"}</button>${regAddOpen?`<div class="gadd" style="padding:0 12px 12px">${pplPick(D,D.players.filter(p=>!R.all.some(x=>x.pid===p.id)),{act:"regaddp",key:"rga"})}</div>`:""}</section>`;
  return h;
}

/* ----- Form tạo / sửa buổi ----- */
const XF_KEYS=["koN","koQ","koThird","koGt","koGw","koGc","koGs","koKt","koKw","koKc","koKs","koFt","koFw","koFc","koFs","pairReg","name","date","time","end","place","map","note","courts","target","max","lvMin","lvMax","guests","thu","fee","phi","feeG","pay","dlH","lockH","h1","h2","h3","rep","days","auto","openD","reg","cp","gton","gt","gtv","trao","c1","c2","c3","adv","win2","ptMax","gmode","refOn","preOn","noteOn","incl"];
// Các trường của buổi được chép từ buổi trước (Dùng lại) và lưu vào lịch lặp
const XCOPY=["ko","koN","koQ","koThird","koGt","koGw","koGc","koGs","koKt","koKw","koKc","koKs","koFt","koFw","koFc","koFs","pairReg","name","end","place","map","note","courts","target","max","lvMin","lvMax","guests","thu","fee","phi","feeG","pay","dlH","lockH","reg","cp","gton","gt","gtv","trao","adv","win2","ptMax","gmode","refOn","preOn","incl"];
function xFmtLast(f,ko){return schedAll().filter(x=>x.fmt===f&&x.st!=="cancel"&&(f!=="giai"||!!x.ko===!!ko)).pop()||null}
// Giá trị phẳng cho form từ một buổi (hang, chia → ô riêng)
const xFlat=X=>{const r={};for(const k of XCOPY)if(X[k]!==undefined)r[k]=X[k];const h=X.hang||[],ch=X.chia||[];
  if(h.length)Object.assign(r,{h1:h[0]||0,h2:h[1]||0,h3:h[2]||0});if(ch.length)Object.assign(r,{c1:ch[0],c2:ch[1],c3:ch[2]});if(X.note)r.noteOn=true;return r};
function xSrc(D){
  const c=D.c,now=Date.now();
  if(xEdit){const X=schedById(xEdit)||{};return {...xDef(c,X.fmt),...xFlat(X),date:X.at?isoDay(X.at):"",time:X.at?hm(X.at):"",rep:"0"}}
  if(xSEdit){const s=(S.series||[]).find(z=>z.id===xSEdit)||{tpl:{}},t=s.tpl||{};return {...xDef(c,t.fmt),...xFlat(t),time:s.time||"19:00",end:s.end||t.end||"",date:"",rep:"1",days:(s.days||[]).join(","),auto:s.auto?"1":"0",openD:+s.openD||2}}
  const f=xNew==="giai"||xNew==="bang"?"giai":"xoay",L=xFmtLast(f,xNew==="bang"),tm=new Date(now+864e5);tm.setHours(19,0,0,0);
  const at=L&&L.at?(()=>{const d=new Date(L.at);const t=new Date(now+864e5);t.setHours(d.getHours(),d.getMinutes(),0,0);return t.getTime()})():tm.getTime();
  return {...xDef(c,f),...(L?xFlat(L):{}),date:isoDay(at),time:hm(at),rep:"0",days:String(new Date(at).getDay()),auto:"1",openD:2};
}
function xDef(c,f){const G=f==="giai",ch=chiaOf(c),k=hangOf(c);
  return {fmt:G?"giai":"xoay",pairReg:"solo",koN:"4",koQ:"8",koThird:"1",koGt:String(+c.target||11),koGw:"0",koGc:"0",koGs:"1",koKt:String(+c.target||11),koKw:"0",koKc:"0",koKs:"1",koFt:"15",koFw:"0",koFc:"0",koFs:"1",name:"",end:"",place:"",map:"",note:"",courts:+c.courts||2,target:+c.target||11,max:G?16:0,lvMin:"",lvMax:"",guests:false,thu:c.thu||"keo",fee:0,phi:+c.phi||50,feeG:"",pay:"off",dlH:0,lockH:2,
    reg:true,cp:c.cphi!==false,gton:G||(c.gt||"khong")!=="khong",gt:G?"hang":((c.gt&&c.gt!=="khong")?c.gt:"trich"),gtv:+c.gtv||30,trao:c.trao||"namnu",c1:ch[0],c2:ch[1],c3:ch[2],h1:k[0]||(G?300:200),h2:k[1]||(G?150:100),h3:k[2]||50,
    adv:false,win2:winBy2(c),ptMax:+c.ptMax||0,gmode:c.gmode||"mix",refOn:c.refOn===true,preOn:c.preOn===true,noteOn:false,incl:""}}
let xSrcCache=null;
const xv=(D,k)=>{const s=xSrcCache||xSrc(D);const v=s[k];return val("xf-"+k,typeof v==="boolean"?(v?"1":"0"):v==null?"":v)};
// Poster giải (không bắt buộc): ảnh thẻ chia sẻ Zalo, xem trước link web, ảnh đầu trang giải
let xfPoster=null; // {src,mode:"fit"|"fill",pos,out} | {del:true}
function xPosterField(){
  const X=xEdit&&schedById(xEdit),old=X&&X.poster?(posterCache[X.id]===undefined?(posterGet(X.id).then(()=>render()),null):posterCache[X.id]):null;
  const P=xfPoster,cur=P&&P.del?null:(P&&P.out)||old,busy=P&&P.src&&!P.out;
  const seg=(k,opts,v)=>`<span class="seg segw">${opts.map(([a,l])=>`<button data-act="${k}" data-v="${a}" aria-pressed="${String(v)===String(a)}">${l}</button>`).join("")}</span>`;
  return `<div class="fld xposter"><span class="lbl">Poster giải · không bắt buộc</span>
    ${cur?`<img class="xpimg" src="${esc(cur)}" alt="Poster giải">`:`<div class="xpnone">${busy?"Đang xử lý ảnh…":"Chưa có poster: khi chia sẻ dùng ảnh tự vẽ theo thông tin giải"}</div>`}
    ${P&&P.src?`${seg("xpmode",[["fit","Vừa khung"],["fill","Cắt ngang"]],P.mode)}${P.mode==="fill"?seg("xppos",[["0","Phần trên"],["0.5","Giữa"],["1","Phần dưới"]],P.pos):""}`:""}
    <span class="bar" style="gap:6px"><label class="lnkbtn">${cur?"Đổi poster":"Tải poster lên"}<input type="file" accept="image/*" data-xposter="1" class="sr"></label>${cur?`<button class="ghost danger" data-act="xpdel">Xoá poster</button>`:""}</span>
    <small class="rule">Hiện khi chia sẻ giải qua Zalo và trên đầu trang giải. Khung ngang 1200×630: poster dọc chọn "Vừa khung" để giữ trọn ảnh.</small></div>`;
}
async function xPosterRedo(){const P=xfPoster;if(!P||!P.src)return;P.out=null;render();P.out=await posterMake(P.src,P.mode,P.pos);render()}
async function posterCommit(sid){
  const P=xfPoster;if(!P)return undefined;
  if(P.del){try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"the/poster_"+sid))}catch(e){}posterCache[sid]=null;return null}
  if(!P.out)return undefined;
  await FB.setDoc(FB.doc(FB.fs,PFX+"the/poster_"+sid),{img:P.out,at:Date.now()});posterCache[sid]=P.out;return Date.now();
}
// Form tạo/sửa giải: các nhóm thu gọn, bấm tiêu đề mới xổ ra
let xfOpen=new Set(),xfOpenK="";const XOK=new Set();
const xfHead=(k,title,sum,o)=>`<button class="xot" data-act="xfo" data-k="${k}" aria-expanded="${o}"><span class="t"><b>${title}</b><small>${esc(sum)}</small></span><i class="xch" aria-hidden="true">${o?"▴":"▾"}</i></button>`;
function xForm(D){
  if(xNew==="pick")return xPickFmt(D);
  xSrcCache=null;xSrcCache=xSrc(D);
  const fmt=xEdit?(schedById(xEdit)?.fmt||"xoay"):xSEdit?(xSrcCache.fmt||"xoay"):(xNew==="bang"?"giai":xNew),G=fmt==="giai",KO=xIsKo(),inS=xEdit&&schedById(xEdit)?.series;
  const v=k=>xv(D,k),on=k=>String(v(k))==="1"||v(k)===true,inp=(k,label,attrs="")=>`<label class="fld"><span class="lbl">${label}</span><input id="xf-${k}" data-draft="xf-${k}" value="${esc(v(k))}" ${attrs}></label>`;
  const seg=(k,opts)=>`<span class="seg segw">${opts.map(([val2,l])=>`<button data-act="xfset" data-k="${k}" data-v="${val2}" aria-pressed="${String(v(k))===String(val2)}">${l}</button>`).join("")}</span>`;
  const stp=(k,label,unit,min,max)=>`<div class="srow"><span>${label}</span><span class="stepper"><button data-act="xfstep" data-k="${k}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="Bớt">−</button><span class="num">${esc(v(k))}${unit}</span><button data-act="xfstep" data-k="${k}" data-d="1" data-min="${min}" data-max="${max}" aria-label="Thêm">+</button></span></div>`;
  // Một dòng tùy chọn: tên + tóm tắt + công tắc; bật thì hiện phần cài đặt
  {const fk=[xEdit,xNew,xSEdit].map(x=>x||"").join("|");if(fk!==xfOpenK){xfOpenK=fk;xfOpen=new Set(xEdit||xSEdit?[]:["_base"]);xfPoster=null}}
  const opt=(k,title,sum,body)=>{const o=on(k),x=o&&!!body&&xfOpen.has(k);XOK.add(k);return `<div class="xopt${o?" on":""}${x?" open":""}"><div class="xoh">${xfHead(k,title,o?sum:"Tắt · bấm để bật",x).replace(o&&body?"":'<i class="xch" aria-hidden="true">▾</i>',"")}<button class="xsw${o?" on":""}" data-act="xfset" data-k="${k}" data-v="${o?"0":"1"}" role="switch" aria-checked="${o}" aria-label="${esc(title)}"><i></i></button></div>${x?`<div class="xob">${body}</div>`:""}</div>`};
  const thu=v("thu"),days=String(v("days")).split(",").filter(Boolean).map(Number),gt=v("gt"),top3=G||gt==="hang"||v("trao")==="top3";
  const fee=thu==="phi"?+v("phi")||0:+v("fee")||0;
  let h=`<div class="xfhead"><span class="k">${xEdit?"Sửa giải đấu":xSEdit?"Sửa lịch lặp":"Tạo giải đấu · bước 2/2"}</span><div class="xrow2"><h1>${KO?"Vòng bảng → Knockout":G?"Cặp cố định, vòng tròn":"Xoay cặp"}</h1>${xNew?`<span class="xhl"><button data-act="xnew">Đổi thể thức</button><button data-act="xclose">Đóng</button></span>`:""}</div>${xNew?`<span class="xsteps"><i class="on"></i><i class="on"></i></span>`:""}</div>`;
  {const bo=xfOpen.has("_base"),bs=[v("name"),!xSEdit&&v("date")?dmy(new Date(v("date")+"T00:00").getTime()).slice(0,-5):"",v("time")&&`${v("time")}${v("end")?"–"+v("end"):""}`,v("place"),`${v("courts")} sân · chạm ${v("target")}`].filter(Boolean).join(" · ");
  h+=`<section class="xsecbox xgrp${bo?" open":""}">${xfHead("_base",G?"Giải này":"Giải đấu này",bs,bo)}`;
  if(bo)h+=`<div class="xgb">${inp("name",G?"Tên giải":"Tên giải đấu",`maxlength="60" placeholder="${G?"Giải cặp tháng này":"Giải đấu tối thứ 5"}"`)}
    <div class="form">${xSEdit?"":inp("date","Ngày",'type="date"')}${inp("time","Bắt đầu",'type="time"')}${inp("end","Kết thúc",'type="time"')}</div>
    ${inp("place","Sân",'maxlength="60" placeholder="Sân Kỳ Hòa, Q10"')}${inp("map","Link Google Maps (không bắt buộc)",'type="url" maxlength="300" placeholder="https://maps.app.goo.gl/…"')}
    ${stp("courts","Số sân","",1,30)}${stp("target","Chạm điểm","",5,31)}${xSEdit?"":xPosterField()}</div>`;
  h+=`</section>`}
  h+=`<span class="xsec">Tùy chọn · bật cái nào dùng cái đó</span><div class="xopts">`;
  if(!xEdit)h+=opt("rep","Lặp lại hằng tuần",`${days.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DOW[d]).join(" & ")||"Chưa chọn ngày"} · ${v("auto")==="1"?`tự mở đăng ký trước ${v("openD")} ngày`:"tự bấm mở đăng ký"}`,
    `<div class="xdays">${[1,2,3,4,5,6,0].map(d=>`<button data-act="xfday" data-v="${d}" aria-pressed="${days.includes(d)}">${DOW[d]}</button>`).join("")}</div>
      <div class="fld"><span class="lbl">Mở đăng ký cho các giải đấu lặp</span>${seg("auto",[["1","Tự mở"],["0","Tôi tự bấm mở"]])}</div>
      ${v("auto")==="1"?stp("openD","Tự mở trước giải đấu"," ngày",1,7):""}<small class="rule">App tạo sẵn các giải đấu của 2 tuần tới theo đúng cài đặt này.</small>`);
  else if(inS)h+=`<small class="rule">Giải đấu này thuộc lịch lặp hằng tuần. Sửa ở đây chỉ đổi giải đấu này.</small>`;
  if(KO){const st=(X,title)=>`<div class="kofr"><b>${title}</b>${stp("ko"+X+"t","Chạm","",5,31)}${seg("ko"+X+"w",[["0","Chạm là thắng"],["1","Cách 2"]])}${v("ko"+X+"w")==="1"?stp("ko"+X+"c","Giới hạn (0 = không giới hạn)","",0,51):""}${seg("ko"+X+"s",[["1","1 set"],["3","3 set"],["5","5 set"]])}</div>`;
    const ko=xfOpen.has("_ko");
    h+=`<section class="xsecbox kosec xgrp${ko?" open":""}">${xfHead("_ko","▦ Vòng bảng → Knockout",`${v("koN")} bảng · ${v("koQ")} cặp vào knockout${v("koThird")==="1"?" · tranh hạng ba":""} · luật điểm từng vòng`,ko)}${ko?`<div class="xgb">
      ${stp("koN","Số bảng","",1,16)}
      <div class="fld"><span class="lbl">Vào knockout</span>${seg("koQ",[["2","2 cặp"],["4","4 cặp"],["8","8 cặp"],["16","16 cặp"]])}</div>
      <div class="fld"><span class="lbl">Tranh hạng ba</span>${seg("koThird",[["1","Có"],["0","Không"]])}</div>
      <span class="xsech" style="margin-top:6px">Luật điểm từng vòng</span>
      ${st("G","Vòng bảng")}${st("K","Tứ kết · bán kết · hạng ba")}${st("F","Chung kết")}
      <small class="rule">Nhất các bảng vào knockout trước, còn chỗ thì lấy nhì (ba) có thành tích tốt nhất. Lẻ cặp vẫn đánh được. Ít cặp quá thì app tự giảm số bảng (mỗi bảng ít nhất 2 cặp). Hạt giống từng bảng chọn ở tab Sân trước khi bốc chia bảng. Luật điểm vẫn đổi được khi đang đánh.</small></div>`:""}</section>`}
  h+=opt("reg","Đăng ký qua Zalo",[+v("max")?`${v("max")} ${G?"người":"chỗ"}`:"không giới hạn",(v("lvMin")||v("lvMax"))&&`trình ${v("lvMin")||"…"}–${v("lvMax")||"…"}`,v("guests")==="1"?"nhận VĐV ngoài CLB":"chỉ thành viên"].filter(Boolean).join(" · "),
    `${stp("max",G?"Số người tối đa":"Số chỗ (0 là không giới hạn)","",0,200)}${G?`<div class="fld"><span class="lbl">Cách đăng ký</span>${seg("pairReg",[["solo","Từng người"],["pair","Theo cặp (tự rủ đồng đội)"]])}</div>`:""}${G&&v("pairReg")==="pair"?`<small class="rule">Mỗi người tự đăng ký và đóng lệ phí riêng, chọn hoặc mời đồng đội. Người chưa có đồng đội được BTC ghép (bốc thăm A/B, cân trình) lúc tới sân.</small>`:G?`<small class="rule">${KO?"Đăng ký từng người. Ngày đánh, ở bước Tùy chọn của tab Sân: bốc thăm cặp nhóm A/B, chọn số bảng rồi bốc chia bảng.":"Đăng ký từng người, bạn ghép cặp ở bước Tùy chọn của tab Sân."}</small>`:""}
     <div class="form">${inp("lvMin","Trình từ",'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="2.5"')}${inp("lvMax","đến",'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="4.0"')}</div>
     <div class="fld"><span class="lbl">Đối tượng</span>${seg("guests",[["0","Chỉ thành viên"],["1","Cả VĐV ngoài CLB"]])}</div>
     ${stp("dlH","Đóng đăng ký trước giải đấu"," giờ",0,72)}${stp("lockH","Khóa hủy trước giải đấu"," giờ",0,72)}`);
  h+=opt("cp",G?"Lệ phí":"Thu chi phí",`${THU[thu]||""}${fee?` · ${fmtK(fee)}`:""}${v("pay")!=="off"?` · chuyển khoản ${v("pay")==="req"?"bắt buộc":"tùy chọn"}`:""}`,
    `<div class="fld"><span class="lbl">Cách thu</span>${seg("thu",[["keo","Thua góp"],["deu","Chia đều"],["phi","Phí cố định"]])}</div>
     <div class="form">${thu==="phi"?inp("phi","Mỗi người (k)",'type="number" min="0" inputmode="numeric"'):inp("fee","Dự kiến mỗi người (k)",'type="number" min="0" inputmode="numeric" placeholder="0"')}${v("guests")==="1"?inp("feeG","VĐV ngoài CLB (k)",'type="number" min="0" inputmode="numeric" placeholder="như thành viên"'):""}</div>
     ${inp("incl","Lệ phí gồm những gì (không bắt buộc)",'maxlength="120" placeholder="Tiền sân, bóng thi đấu, nước"')}
     <div class="fld"><span class="lbl">Chuyển khoản lúc đăng ký</span>${seg("pay",[["off","Không"],["opt","Tùy chọn"],["req","Bắt buộc"]])}</div>
     ${v("pay")!=="off"&&!(BANK&&BANK.acc)?`<small class="rule" style="color:var(--lose)">Cần khai ngân hàng nhận phí ở Cài đặt CLB.</small>`:""}`);
  h+=opt("gton","Giải thưởng",gt==="hang"?`Nhất ${fmtK(+v("h1")||0)} · Nhì ${fmtK(+v("h2")||0)} · Ba ${fmtK(+v("h3")||0)}`:`${GT[gt]||""}${G||top3?" · hạng 1, 2, 3":" · Số 1 nam & nữ"}`,
    `<div class="fld"><span class="lbl">Lập quỹ giải</span>${seg("gt",(G?["hang","trich","gop"]:["hang","trich","codinh","gop"]).map(x=>[x,GT[x]]))}</div>
     ${!G&&gt!=="hang"?`<div class="fld"><span class="lbl">Trao cho</span>${seg("trao",[["namnu","Số 1 nam & Số 1 nữ"],["top3","Hạng 1, 2, 3"]])}</div>`:""}
     ${gt==="hang"?`<div class="form f3">${inp("h1","Nhất (k)",'type="number" min="0" inputmode="numeric"')}${inp("h2","Nhì (k)",'type="number" min="0" inputmode="numeric"')}${inp("h3","Ba (k)",'type="number" min="0" inputmode="numeric"')}</div>`
       :`${inp("gtv",gt==="trich"?"Trích bao nhiêu % phần dư":gt==="codinh"?"Quỹ CLB bỏ ra (k)":"Mỗi người góp thêm (k)",'type="number" min="0" inputmode="numeric"')}${top3?`<div class="form f3">${inp("c1","Nhất %",'type="number" min="0" inputmode="numeric"')}${inp("c2","Nhì %",'type="number" min="0" inputmode="numeric"')}${inp("c3","Ba %",'type="number" min="0" inputmode="numeric"')}</div>`:""}`}`);
  h+=opt("adv","Luật điểm nâng cao",[v("win2")==="1"?"thắng cách 2":"chạm là thắng",+v("ptMax")?`trần ${v("ptMax")}`:"",!G?(v("gmode")==="same"?"ghép cùng giới":"ghép khác giới"):""].filter(Boolean).join(" · "),
    `<div class="fld"><span class="lbl">Thắng</span>${seg("win2",[["1","Phải cách 2 điểm"],["0","Chạm là thắng"]])}</div>
     ${v("win2")==="1"?stp("ptMax","Điểm trần (0 là không có)","",0,40):""}
     ${G?"":`<div class="fld"><span class="lbl">Ưu tiên ghép</span>${seg("gmode",[["mix","Khác giới"],["same","Cùng giới"]])}</div>`}`);
  h+=opt("refOn","Trọng tài nhập điểm","Giao sân cho trọng tài ở tab Sân",`<small class="rule">Mời trọng tài qua Zalo hoặc dùng PIN, giao sân ở mục Trọng tài của tab Sân.</small>`);
  h+=opt("preOn",G?"Định sẵn các trận đầu":"Xếp sẵn các trận đầu","Chọn cặp đấu ở tab Sân trước giờ đánh",`<small class="rule">Tới ngày, vào tab Sân chọn sẵn vài trận đầu; sau đó app tự xếp như cũ.</small>`);
  h+=opt("noteOn","Ghi chú cho người chơi",String(v("note")).slice(0,60),`<label class="fld"><span class="sr">Ghi chú</span><textarea id="xf-note" data-draft="xf-note" maxlength="300" rows="2" placeholder="Mang giày đế bằng, CLB có bóng">${esc(v("note"))}</textarea></label>`);
  h+=`</div>`;
  if(errs.xf)h+=`<p class="err">${esc(errs.xf)}</p>`;
  const reg=on("reg");
  h+=`<div class="xfbar">${xEdit||xSEdit?`<button class="line" data-act="xclose">Hủy</button><button class="primary" data-act="xsave" data-v="save">Lưu</button>`:`<button class="line" data-act="xsave" data-v="draft">Lưu nháp</button><button class="primary" data-act="xsave" data-v="open">${reg?"Tạo và mở đăng ký":"Tạo giải đấu"}</button>`}</div>`;
  return h;
}
function xPickFmt(D){
  const L=schedAll().filter(x=>x.st!=="cancel").pop();
  return `<div class="xfhead"><span class="k">Tạo giải đấu · bước 1/2</span><div class="xrow2"><h1>Chọn thể thức</h1><button class="lnk" data-act="xclose">Đóng</button></div><span class="xsteps"><i class="on"></i><i></i></span></div>
    ${L?`<button class="xreuse" data-act="xfmt" data-v="${L.fmt==="giai"?(L.ko?"bang":"giai"):"xoay"}"><b>Dùng lại giải đấu trước:</b> ${esc(xName(L))} · ${xFmt(L)}<span>›</span></button>`:""}
    <button class="xfmt on" data-act="xfmt" data-v="xoay"><span class="ic"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="14" r="5"/><circle cx="34" cy="14" r="5"/><circle cx="14" cy="34" r="5"/><circle cx="34" cy="34" r="5"/><path d="M20 14h8M34 20v8M28 34h-8M14 28v-8"/></svg></span>
      <span class="t"><b>Xoay cặp</b><span>Giải đấu thường ngày. Đổi cặp liên tục, ai cũng đánh với nhiều người, tính rating. Ai thua góp.</span><span class="rgchips"><span>8–40 người</span><span>Phổ biến nhất</span></span></span></button>
    <button class="xfmt" data-act="xfmt" data-v="giai"><span class="ic"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M14 12h10M24 12v8M14 28h10M24 28v-8M24 20h10M14 36h20"/><circle cx="40" cy="20" r="4"/></svg></span>
      <span class="t"><b>Cặp cố định, vòng tròn</b><span>Giải nhỏ trong CLB. Mỗi cặp gặp tất cả các cặp còn lại. Có giải nhất, nhì, ba.</span><span class="rgchips"><span>4–12 cặp</span><span>Có giải thưởng</span></span></span></button>
    <button class="xfmt vb" data-act="xfmt" data-v="bang"><span class="ic"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="square" aria-hidden="true"><rect x="4" y="6" width="10" height="7"/><rect x="4" y="17" width="10" height="7"/><rect x="4" y="28" width="10" height="7"/><rect x="4" y="39" width="10" height="5"/><path d="M14 9h6v12h-6M14 31h6v10h-6M20 15h8M20 36h8M28 15v21M28 25h8"/><circle cx="40" cy="25" r="4"/></svg></span>
      <span class="t"><b>Vòng bảng → Knockout <em class="xnew">MỚI</em></b><span>Chia bảng đánh vòng tròn, nhất nhì mỗi bảng vào tứ kết, bán kết, chung kết. Như giải thật.</span><span class="rgchips"><span>8–32 cặp</span><span>Bốc thăm chia bảng</span><span>Tranh hạng ba</span></span></span></button>
    <span class="xsec">Sắp có</span><div class="xsoon"><b>Vua sân (King of the court)</b><small>Thắng ở lại sân, thua xuống chờ</small></div>`;
}
// Đọc form thành dữ liệu buổi
function xRead(D){
  const v=k=>{const el=document.getElementById&&document.getElementById("xf-"+k);return String(el&&el.value!=null?el.value:xv(D,k)).trim()};
  const n=(k,d=0)=>{const x=parseFloat(v(k));return Number.isFinite(x)?x:d},b=k=>v(k)==="1"||v(k)==="true";
  const fmt=xEdit?(schedById(xEdit)?.fmt||"xoay"):xSEdit?((S.series||[]).find(z=>z.id===xSEdit)?.tpl?.fmt||"xoay"):(xNew==="giai"||xNew==="bang"?"giai":"xoay");
  const f={name:v("name").slice(0,60),fmt,ko:fmt==="giai"&&xIsKo(),pairReg:fmt==="giai"&&v("pairReg")==="pair"?"pair":"solo",
    ...(fmt==="giai"&&xIsKo()?(()=>{const o={koN:String(Math.max(1,Math.min(16,Math.round(n("koN",4))))),koQ:["2","4","8","16"].includes(v("koQ"))?v("koQ"):"8",koThird:v("koThird")==="0"?"0":"1"};
      for(const X of ["G","K","F"]){o["ko"+X+"t"]=String(Math.max(5,Math.min(31,Math.round(n("ko"+X+"t",11)))));o["ko"+X+"w"]=v("ko"+X+"w")==="1"?"1":"0";o["ko"+X+"c"]=String(Math.max(0,Math.min(51,Math.round(n("ko"+X+"c",0)))));o["ko"+X+"s"]=["1","3","5"].includes(v("ko"+X+"s"))?v("ko"+X+"s"):"1"}
      return o})():{}),
    courts:Math.max(1,Math.round(n("courts",2))),target:Math.max(5,Math.round(n("target",11))),max:Math.max(0,Math.round(n("max",0))),lvMin:v("lvMin"),lvMax:v("lvMax"),guests:v("guests")==="1",
    thu:["phi","deu","keo"].includes(v("thu"))?v("thu"):"keo",fee:Math.max(0,n("fee",0)),phi:Math.max(0,n("phi",0)),feeG:v("feeG")===""?"":Math.max(0,n("feeG",0)),pay:["off","opt","req"].includes(v("pay"))?v("pay"):"off",
    dlH:Math.max(0,n("dlH",0)),lockH:Math.max(0,n("lockH",2)),
    reg:b("reg"),cp:b("cp"),gton:b("gton"),gt:["hang","trich","codinh","gop"].includes(v("gt"))?v("gt"):"trich",gtv:Math.max(0,n("gtv",0)),trao:v("trao")==="top3"?"top3":"namnu",
    hang:[n("h1",0),n("h2",0),n("h3",0)],chia:[n("c1",50),n("c2",30),n("c3",20)],adv:b("adv"),win2:v("win2")==="1",ptMax:Math.max(0,n("ptMax",0)),gmode:v("gmode")==="same"?"same":"mix",refOn:b("refOn"),preOn:b("preOn"),incl:v("incl").slice(0,120)};
  if(!f.cp){f.pay="off";f.fee=0;f.incl=""}
  const t=v("time"),d=v("date");
  return {f,t,d,rep:v("rep")==="1",days:String(xv(D,"days")).split(",").filter(Boolean).map(Number),auto:v("auto")!=="0",openD:Math.max(1,n("openD",2))};
}
async function xSave(D,mode){
  const {f,t,d,rep,days,auto,openD}=xRead(D);
  if(!/^\d{1,2}:\d{2}$/.test(t)){errs.xf="Nhập giờ bắt đầu.";render();return}
  if(xSEdit){
    if(!days.length){errs.xf="Chọn ít nhất một ngày trong tuần.";render();return}
    const s=(S.series||[]).find(z=>z.id===xSEdit);if(!s)return;delete errs.xf;
    await write(async()=>{const {id:_sid,...rest}=s;await db.collection("series").doc(s.id).set({...rest,days,time:t,end:f.end,tpl:f,auto,openD,on:true,at:Date.now()});
      // Buổi chưa ai đăng ký, chưa mở: tạo lại theo lịch mới
      for(const x of (S.sched||[]).filter(x=>x.series===s.id&&(x.st==="plan"||x.st==="draft")&&x.at>Date.now()&&!xRegN(x)))await db.collection("sched").doc(x.id).delete();
      S.sched=(S.sched||[]).filter(x=>!(x.series===s.id&&(x.st==="plan"||x.st==="draft")&&x.at>Date.now()&&!xRegN(x)));
      await xMaterialize({...s,days,time:t,end:f.end,tpl:f,auto,openD})},"Đã lưu lịch lặp");
    xSEdit=null;xClearDraft();render();return}
  if(!/^\d{4}-\d{2}-\d{2}$/.test(d)){errs.xf="Chọn ngày.";render();return}
  const at=new Date(`${d}T${t.padStart(5,"0")}:00`).getTime();
  if(!Number.isFinite(at)){errs.xf="Ngày giờ chưa đúng.";render();return}
  if(!xEdit&&at<Date.now()-3600e3){errs.xf="Ngày giờ này đã qua.";render();return}
  if(rep&&!days.length){errs.xf="Chọn ít nhất một ngày trong tuần để lặp.";render();return}
  delete errs.xf;
  if(xEdit){const X=schedById(xEdit);if(!X)return;
    await write(async()=>{const pv=await posterCommit(X.id);
      await db.collection("sched").doc(X.id).set(xBuild({...f,at},{st:X.st,openAt:X.openAt||0,series:X.series||null,num:X.num??null,createdAt:X.createdAt||Date.now(),...(X.byZ?{byZ:X.byZ,byN:X.byN||""}:{}),poster:pv===undefined?(X.poster||null):pv}))},"Đã lưu giải đấu");
    xEdit=null;xClearDraft();render();return}
  const id=db.collection("sched").doc().id;let sid=null;
  await write(async()=>{
    if(rep){sid=db.collection("series").doc().id;await db.collection("series").doc(sid).set({days,time:t,end:f.end,tpl:f,auto,openD,on:true,from:dayStart(at),at:Date.now(),...xBy()})}
    await db.collection("sched").doc(rep?sid+"-"+ymd(at):id).set(xBuild({...f,at},{st:mode==="open"?"open":"draft",openAt:0,series:sid}));
    {const nid=rep?sid+"-"+ymd(at):id,pv=await posterCommit(nid);if(pv)await db.collection("sched").doc(nid).update({poster:pv})}
    if(rep)await xMaterialize({id:sid,days,time:t,end:f.end,tpl:f,auto,openD,from:dayStart(at)});
  },mode==="open"?"Đã tạo giải đấu và mở đăng ký":"Đã lưu nháp");
  xNew=null;xClearDraft();go("app",{tab:"dk",x:rep?sid+"-"+ymd(at):id});
}
const xClearDraft=()=>{for(const k of XF_KEYS)delete drafts["xf-"+k];xSrcCache=null;xfPoster=null};

/* ----- Người chơi: danh sách buổi sắp tới (Trang chủ Mini App, trang Đăng ký trên web) ----- */
function xPlayerCards(D,o={}){
  const U=schedUp().filter(x=>x.st!=="draft"&&(o.all||xState(x)!=="plan"||x.openAt-Date.now()<7*864e5));
  return U.slice(0,o.max||99).map(x=>gdCard(D,x)).join("");
}
// Trang Đăng ký khi chưa chọn buổi: danh sách các buổi
function vLichPlayer(D){
  const X=routeX?schedById(routeX):null;
  if(X)return withX(X,()=>!MINI&&!REF?gdPage(D):dkPlayer(D));
  const c=xPlayerCards(D,{all:true});
  if(c)return `<span class="xsec">Giải đấu sắp tới</span>${c}`+(PLAYER_ON()?linkCard(D):"");
  return dkPlayer(D);
}
// Tab Sân · Sẵn sàng: buổi hôm nay theo lịch được chọn sẵn
const xToday=()=>schedUp().filter(x=>sameDay(x.at,Date.now())&&x.st!=="cancel"&&x.st!=="done").sort((a,b)=>Math.abs(a.at-Date.now())-Math.abs(b.at-Date.now()));
const xAutoDone=new Set();
function xAutoPrep(D){
  if(legacy||!isAdm()||!S.schedReady||!S.regs)return;
  const X=xCur();
  // Chưa chọn buổi: lấy buổi hôm nay gần giờ nhất (một lần)
  if(!X&&phaseOf(D)!=="live"&&!D.SM.length){const T=xToday()[0];
    if(T&&!xAutoDone.has(D.sid+"|"+T.id)){xAutoDone.add(D.sid+"|"+T.id);setTimeout(()=>xApply(derive(),T,true),0)}return}
  // Người quét QR ở sân: tự đánh dấu có mặt
  if(X)for(const r of (S.regs||[]).filter(r=>r.sid===X.id&&r.arrived&&r.pid&&!r.cancel)){const p=D.pmap.get(r.pid),k="arr|"+r.id;
    if(p&&p.active===false&&!xAutoDone.has(k)){xAutoDone.add(k);setTimeout(()=>write(()=>db.collection("players").doc(p.id).update({active:true})),0)}}
}
function xPrepHead(D){
  const X=xCur(),c=D.c,thu=c.thu||"keo",T=isAdm()?xToday():[];
  let h=ckCard(D);
  if(T.length>1&&phaseOf(D)!=="live"&&!D.SM.length)h+=`<div class="xpick" role="group" aria-label="Chọn giải đấu hôm nay">${T.slice().sort((a,b)=>a.at-b.at).map(x=>`<button data-act="xprep" data-id="${x.id}" aria-pressed="${X&&X.id===x.id}"><b>${hm(x.at)}</b>${esc(xName(x))}</button>`).join("")}</div>`;
  h+=`<section class="xhero prephd"><span class="k">${esc(sessTitle(c,D.sid))} · chuẩn bị${X&&X.at?` · ${esc(xTime(X))}`:""}</span>
    <div class="xrow2"><h1>${esc(X?xName(X):(c.sname||"Giải đấu nhanh"))}</h1>${X?`<a class="xedit" href="${pathOf("app",{tab:"dk",x:X.id})}" data-go="app" data-t="dk" data-x="${esc(X.id)}">Sửa giải đấu ›</a>`:""}</div>
    <span class="sub">${esc([fmtTxt(c),c.cphi===false?"không thu phí":THU[thu]+(thu==="phi"?` ${fmtK(+c.phi||0)}`:"")].filter(Boolean).join(" · "))}</span>${xStats(D)}</section>`;
  return h;
}
// 4 con số đầu trang Tùy chọn
function xStats(D){
  const c=D.c,st=(v,l)=>`<span><b class="num">${v}</b><small>${l}</small></span>`;
  if(isG(c)&&isKO(c.giai)){const n=((c.giai||{}).pairs||[]).length,k=koCount(c.giai),K=koK(c.giai),tot=k.grp+k.ko,mins=Math.ceil(tot/Math.max(1,c.courts))*GSLOT;
    return `<div class="xstats">${st(`${n}`,"Cặp")}${st(`${koNEff(c.giai)}`,"Bảng")}${st(tot,`Trận (${k.grp}+${k.ko})`)}${st(n>1?"~"+dur(mins):"–",`Với ${c.courts} sân`)}</div>`}
  if(isG(c)){const P=(c.giai||{}).pairs||[],n=P.length,tot=n*(n-1)/2,mins=Math.ceil(tot/Math.max(1,c.courts))*GSLOT;
    return `<div class="xstats">${st(`${n}`,"Cặp")}${st(tot,"Trận")}${st(Math.max(0,n-1),"Trận/cặp")}${st(n>1?"~"+dur(mins):"–",`Với ${c.courts} sân`)}</div>`}
  const n=D.players.filter(p=>p.active!==false).length,X=xCur();
  return `<div class="xstats">${st(n,"Có mặt")}${st(c.courts,"Sân")}${st(c.target,"Chạm")}${st(X?xRegN(X):"–","Đăng ký")}</div>`;
}
function xNoSched(D){
  if(legacy||!isAdm()||phaseOf(D)==="live")return "";
  const nx=schedUp().find(x=>x.at>Date.now()&&x.st!=="draft");
  return `<a class="dkban" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk"><span class="t"><b>Hôm nay chưa có giải đấu theo lịch</b><small>${nx?`Giải đấu tới: ${esc(dowVN(nx.at))} ${esc(dmy(nx.at).slice(0,5))} · ${esc(xTime(nx))} · ${esc(xName(nx))}`:"Lên lịch giải đấu để người chơi đăng ký trước"}</small></span><span aria-hidden="true">›</span></a>`;
}
// Áp cài đặt buổi trong lịch vào buổi hiện tại (tab Sân), điểm danh theo đăng ký
async function xApply(D,X,quiet){
  const p={schedId:X.id,sname:X.name||"",courts:+X.courts||D.c.courts,target:+X.target||D.c.target,thu:X.thu||D.c.thu||"keo"};
  if(X.thu==="phi")p.phi=+X.phi||0;
  if(X.fmt==="giai"){p.fmt="giai";p.giai=D.c.giai&&isG(D.c)?D.c.giai:{pairs:[],prizes:[0,0,0],out:{},locked:false};
    if(!p.giai.locked)p.giai={...p.giai,ko:X.ko?{...koDef(),...(p.giai.ko||{}),...(X.koN?koFromX(X):{})}:null};
    if(p.giai.ko&&p.giai.ko.groups&&p.giai.ko.groups.length!==p.giai.ko.n)p.giai.ko.groups=null;const k=X.hang||[];if(X.gton==null&&k.some(v=>+v>0))Object.assign(p,{gt:"hang",hang1:+k[0]||0,hang2:+k[1]||0,hang3:+k[2]||0})}
  else p.fmt="xoay";
  // Tùy chọn bật/tắt khi tạo buổi (buổi tạo trước khi có tùy chọn thì giữ cài đặt cũ)
  if(X.cp!=null)p.cphi=X.cp!==false;
  if(X.gton!=null){if(X.gton){const k=X.hang||[0,0,0],ch=X.chia||[50,30,20];Object.assign(p,{gt:X.gt||"trich",gtv:+X.gtv||0,trao:X.trao||"namnu",hang1:+k[0]||0,hang2:+k[1]||0,hang3:+k[2]||0,chia1:+ch[0]||0,chia2:+ch[1]||0,chia3:+ch[2]||0})}else p.gt="khong"}
  if(X.adv!=null)Object.assign(p,X.adv?{win2:!!X.win2,ptMax:X.win2?+X.ptMax||0:0,gmode:X.gmode||"mix"}:{win2:null,ptMax:0,gmode:"mix"});
  if(X.refOn!=null)p.refOn=!!X.refOn;
  if(X.preOn!=null&&X.fmt!=="giai")p.preOn=!!X.preOn;
  let n=0;
  await write(async()=>{await saveCfg(p);await db.collection("sched").doc(X.id).update({num:D.sid});
    const R=withX(X,()=>regList(D)),inS=new Set(R.conf.filter(x=>x.arrived).map(x=>x.pid).filter(Boolean));
    n=await withX(X,()=>regStart(D));
    // Có người đăng ký: danh sách có mặt = người đã check-in (chưa ai tới thì để trống, check-in xong mới vào)
    if(R.conf.length)for(const pl of D.players){const on=inS.has(pl.id);if((pl.active!==false)!==on)await db.collection("players").doc(pl.id).update({active:on})}
  },quiet?null:`Đã chọn ${xName(X)}`);
  if(n)toast(`Đã điểm danh ${n} người đã check-in`);
}
// Chốt buổi: buổi trong lịch chuyển sang Đã xong
async function xFinish(D){const X=xCur();if(X)await db.collection("sched").doc(X.id).update({st:"done",num:D.sid,doneAt:Date.now()})}

/* ----- Bấm ----- */
async function xAct(act,b,id,D){
  if(act==="xnew"){xNew="pick";xEdit=null;xSEdit=null;xClearDraft();delete errs.xf;if(route!=="app"||tab!=="dk"||routeX)go("app",{tab:"dk"});else{render();try{scrollTo({top:0})}catch(e){}}return true}
  if(act==="xfmt"){xNew=["giai","bang"].includes(b.dataset.v)?b.dataset.v:"xoay";xClearDraft();render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xclose"){xNew=null;xEdit=null;xSEdit=null;xClearDraft();delete errs.xf;render();return true}
  if(act==="xedit"){xEdit=id;xNew=null;xSEdit=null;xClearDraft();render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xsedit"){xSEdit=id;xNew=null;xEdit=null;xClearDraft();render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xfset"){drafts["xf-"+b.dataset.k]=b.dataset.v;if(XOK.has(b.dataset.k)){if(b.dataset.v==="1")xfOpen.add(b.dataset.k);else xfOpen.delete(b.dataset.k)}render();return true}
  if(act==="xpmode"){if(xfPoster){xfPoster.mode=b.dataset.v==="fill"?"fill":"fit";xPosterRedo()}return true}
  if(act==="xppos"){if(xfPoster){xfPoster.pos=Math.max(0,Math.min(1,+b.dataset.v||0));xPosterRedo()}return true}
  if(act==="xpdel"){if(!armOr("xpdel:x"))return true;xfPoster={del:true};render();return true}
  if(act==="xfo"){const k=b.dataset.k;if(XOK.has(k)&&String(xv(derive(),k))!=="1"){drafts["xf-"+k]="1";xfOpen.add(k)}else xfOpen.has(k)?xfOpen.delete(k):xfOpen.add(k);render();return true}
  if(act==="xfstep"){const k=b.dataset.k,cur=parseFloat(xv(D,k))||0;drafts["xf-"+k]=String(Math.min(+b.dataset.max,Math.max(+b.dataset.min,cur+Number(b.dataset.d))));render();return true}
  if(act==="xfday"){const d=Number(b.dataset.v),L=String(xv(D,"days")).split(",").filter(Boolean).map(Number),i=L.indexOf(d);if(i>=0)L.splice(i,1);else L.push(d);drafts["xf-days"]=L.join(",");render();return true}
  if(act==="xsave"){await xSave(D,b.dataset.v);return true}
  if(act==="xday"){const t=Number(b.dataset.v);xDay=xDay&&sameDay(xDay,t)?null:t;render();return true}
  if(act==="xdone"){xDoneOpen=!xDoneOpen;render();return true}
  if(act==="xptab"){xPTab=b.dataset.v;render();return true}
  if(act==="xqr"){xQr=xQr===id?null:id;render();return true}
  if(act==="xopen"){await write(()=>db.collection("sched").doc(id).update({st:"open",openAt:0}),"Đã mở đăng ký");return true}
  if(act==="xpause"){if(!armOr("xpause:"+id))return true;await write(()=>db.collection("sched").doc(id).update({st:"draft"}),"Đã tạm dừng đăng ký");return true}
  if(act==="xcancel"){if(!armOr("xcancel:"+id))return true;await write(()=>db.collection("sched").doc(id).update({st:"cancel"}),"Đã hủy giải đấu");return true}
  if(act==="xdel"){if(!armOr("xdel:"+id))return true;await write(()=>db.collection("sched").doc(id).delete(),"Đã xoá giải đấu");go("app",{tab:"dk"});return true}
  if(act==="xsoff"){if(!armOr("xsoff:"+id))return true;
    await write(async()=>{await db.collection("series").doc(id).update({on:false});
      for(const x of (S.sched||[]).filter(x=>x.series===id&&(x.st==="plan"||x.st==="draft")&&x.at>Date.now()&&!xRegN(x)))await db.collection("sched").doc(x.id).delete()},"Đã tắt lặp lại. Các giải đấu đã có người đăng ký vẫn giữ.");return true}
  if(act==="xprep"){const X=schedById(id);if(X)await xApply(D,X);return true}
  return false;
}

// Cài đặt vòng bảng trong lịch → config.giai.ko
function koFromX(X){const r=k=>({to:+X["ko"+k+"t"]||11,w2:X["ko"+k+"w"]==="1",cap:X["ko"+k+"w"]==="1"?(+X["ko"+k+"c"]||0):0,sets:+X["ko"+k+"s"]||1});
  return {n:+X.koN||4,q:+X.koQ||(+X.koN||4)*2,third:X.koThird!=="0",...(X.koGt?{rg:r("G"),rk:r("K"),rf:r("F")}:{})}}
