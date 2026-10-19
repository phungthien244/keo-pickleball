/* ---------- Lịch buổi: nhiều buổi sắp tới, mỗi buổi đăng ký riêng, lặp lại hằng tuần ----------
   clubs/{c}/sched/{id}  một buổi: name, fmt, at, end, place, map, note, courts, target, max, lvMin, lvMax, guests,
                         thu, fee, phi, feeG, pay, dlH, lockH, deadline, lockAt, hang, st, openAt, series, num
     st: draft (nháp) · open (đang nhận) · plan (tự mở lúc openAt) · done (đã chốt) · cancel (đã hủy)
   clubs/{c}/series/{id} lịch lặp: days [0..6], time, end, tpl {các trường của buổi}, auto, openD, on
   Đăng ký của buổi trong lịch: regs.sid = mã buổi (chuỗi). Buổi đang chuẩn bị ở tab Sân: app/config.schedId */
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
const xOpen=x=>xState(x)==="open"&&!(x.deadline&&Date.now()>x.deadline)&&!(x.at&&Date.now()>x.at);
const xShown=x=>x&&x.st!=="done"&&x.st!=="cancel"&&((x.at||0)>Date.now()-10*3600e3||cfg().schedId===x.id);
const schedAll=()=>(S.sched||[]).slice().sort((a,b)=>(a.at||0)-(b.at||0));
const schedUp=()=>schedAll().filter(xShown);
const schedById=id=>(S.sched||[]).find(x=>x.id===id)||null;
const xCur=()=>{const id=cfg().schedId;return id?schedById(id):null};
const xName=x=>x.name||(x.fmt==="giai"?"Giải cặp cố định":"Buổi đánh");
const xFmt=x=>x.fmt==="giai"?"Cặp cố định":"Xoay cặp";
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
    await db.collection("sched").doc(id).set(xBuild({...s.tpl,at,end:s.end||s.tpl.end||""},{series:s.id,st:s.auto?"plan":"draft",openAt:s.auto?at-(+s.openD||2)*864e5:0}));
  }
}
function xBuild(f,extra){
  const lockH=Math.max(0,+f.lockH||0),dlH=Math.max(0,+f.dlH||0);
  return xClean({...f,lockH,dlH,deadline:f.at?f.at-dlH*3600e3:0,lockAt:f.at&&lockH?f.at-lockH*3600e3:0,createdAt:Date.now(),...extra});
}

/* ----- Quản lý: tab Tạo (Mini App) / Lịch buổi (web) ----- */
function vLichAdm(D){
  if(legacy)return `<div class="empty"><strong>Chưa dùng được</strong>CLB cần chuyển sang tài khoản CLB trước.</div>`;
  if(!isAdm())return vLichPlayer(D);
  xEnsure(D);
  if(xNew||xEdit||xSEdit)return xForm(D);
  if(routeX){const X=schedById(routeX);if(X)return xAdminDetail(D,X);if(S.schedReady)return `<div class="empty"><strong>Không thấy buổi này</strong>Buổi đã bị xoá.</div><a class="line wide" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk">Về lịch buổi</a>`}
  let h=approvals(D);
  h+=`<button class="xnewbtn" data-act="xnew">+ Tạo buổi mới</button>`;
  for(const s of (S.series||[]).filter(s=>s.on))h+=`<div class="xser"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M17 2l4 4-4 4"/><path d="M3 11V9a3 3 0 0 1 3-3h15"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a3 3 0 0 1-3 3H3"/></svg>
    <span class="t"><b>Lặp hằng tuần: ${(s.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DOW[d]).join(" & ")} · ${esc(s.time||"")}</b><small>${esc(xName(s.tpl||{}))} · ${xFmt(s.tpl||{})} · ${s.auto?`tự mở đăng ký trước ${+s.openD||2} ngày`:"tự bấm mở đăng ký"}</small></span>
    <button class="lnk" data-act="xsedit" data-id="${s.id}">Sửa</button><button class="lnk" data-act="xsoff" data-id="${s.id}">${armed("xsoff:"+s.id)?"Tắt?":"Tắt"}</button></div>`;
  const U=schedUp();
  h+=xStrip(U);
  const L=U.filter(x=>!xDay||sameDay(x.at,xDay));
  h+=`<span class="xsec">${xDay?`${dowVN(xDay)}, ${dmy(xDay).slice(0,5)}`:"Sắp tới"}</span>`;
  h+=!S.schedReady?`<p class="rule">Đang tải…</p>`:L.length?L.map(x=>xAdminCard(D,x)).join(""):`<div class="xempty">${xDay?"Ngày này chưa có buổi.":"Chưa có buổi nào sắp tới. Bấm “Tạo buổi mới” để lên lịch và mở đăng ký."}</div>`;
  const done=schedAll().filter(x=>x.st==="done"||x.st==="cancel").reverse().slice(0,12);
  if(done.length)h+=`<button class="xdonebtn" data-act="xdone" aria-expanded="${xDoneOpen}"><span>Đã xong · ${done.length} buổi gần đây</span><span>${xDoneOpen?"−":"›"}</span></button>`+(xDoneOpen?done.map(x=>xAdminCard(D,x)).join(""):"");
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
    let h=`<a class="xback" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk">‹ Lịch buổi</a>`;
    h+=`<section class="xhero"><span class="k">${X.at?`${esc(dowVN(X.at))} · ${esc(dmy(X.at))} · `:""}${esc(xTime(X))}</span><h1>${esc(xName(X))}</h1>
      <span class="sub">${esc([xFmt(X),X.courts&&`${X.courts} sân`,X.target&&`chạm ${X.target}`,fee&&fmtK(fee),X.place].filter(Boolean).join(" · "))}</span>
      <span class="xrow">${xChip(X)}${X.series?`<span class="xchip dk">↻ hằng tuần</span>`:""}${X.guests?`<span class="xchip dk">Nhận khách</span>`:""}</span>
      ${+X.max?`<span class="xprog big"><i><b style="width:${Math.min(100,Math.round(R.conf.length/X.max*100))}%"></b></i><b class="num">${R.conf.length}/${X.max}</b></span>`:`<b class="num" style="font-size:20px">${R.conf.length} người đã đăng ký</b>`}
      <small>${[R.wait.length&&`${R.wait.length} người chờ chỗ`,payOn()&&`đã nhận ${kVND(got)}`,X.deadline&&`đóng đăng ký ${hm(X.deadline)} ${dowVN(X.deadline)}`].filter(Boolean).join(" · ")}</small></section>`;
    if(s==="draft"||s==="plan")h+=`<button class="primary wide" data-act="xopen" data-id="${X.id}">Mở đăng ký ngay</button>`;
    if(today&&s!=="live"&&s!=="done"&&s!=="cancel")h+=`<a class="dkban" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><span class="t"><b>Buổi hôm nay</b><small>Vào tab Sân để điểm danh và bắt đầu</small></span><span aria-hidden="true">›</span></a>`;
    if(s==="open"||s==="plan"||s==="live")h+=`<div class="two"><button class="primary" data-act="regshare" data-id="${X.id}">Gửi link vào Zalo</button><button class="line" data-act="xqr" data-id="${X.id}">${xQr===X.id?"Ẩn mã QR":"Mã QR"}</button></div>
      <div class="linkrow"><span>${esc(link.replace(/^https?:\/\//,""))}</span><button class="line" data-act="cp" data-v="${esc(link)}">Copy</button></div>
      ${xQr===X.id?`<div class="dkqr"><img alt="Mã QR mở trang đăng ký buổi" width="180" height="180" src="https://api.qrserver.com/v1/create-qr-code/?size=360x360&margin=8&data=${encodeURIComponent(link)}"><button class="line" data-act="cp" data-v="${esc(link)}">Copy link</button></div>`:""}`;
    h+=regPeople(D);
    h+=`<div class="xlist">
      <button class="xli" data-act="xedit" data-id="${X.id}"><span>Sửa cài đặt buổi</span><span>›</span></button>
      ${s==="open"?`<button class="xli" data-act="xpause" data-id="${X.id}"><span>Tạm dừng đăng ký</span><span>›</span></button>`:""}
      ${s!=="cancel"&&s!=="done"&&s!=="live"?`<button class="xli danger" data-act="xcancel" data-id="${X.id}"><span>${armed("xcancel:"+X.id)?"Bấm lần nữa để hủy buổi":"Hủy buổi này"}</span><span>›</span></button>`:""}
      ${!R.all.length&&s!=="live"?`<button class="xli danger" data-act="xdel" data-id="${X.id}"><span>${armed("xdel:"+X.id)?"Bấm lần nữa để xoá":"Xoá buổi"}</span><span>›</span></button>`:""}</div>`;
    if(s==="cancel"&&R.all.length)h+=`<small class="rule">Buổi đã hủy: nhắn người đã đăng ký trong nhóm Zalo, hoàn tiền người đã chuyển ở danh sách trên.</small>`;
    return h;
  });
}

/* ----- Form tạo / sửa buổi ----- */
const XF_KEYS=["name","date","time","end","place","map","note","courts","target","max","lvMin","lvMax","guests","thu","fee","phi","feeG","pay","dlH","lockH","h1","h2","h3","rep","days","auto","openD"];
function xFmtLast(f){return schedAll().filter(x=>x.fmt===f&&x.st!=="cancel").pop()||null}
function xSrc(D){
  const c=D.c,now=Date.now();
  if(xEdit){const X=schedById(xEdit)||{};return {...xDef(c,X.fmt),...X,date:X.at?isoDay(X.at):"",time:X.at?hm(X.at):"",h1:(X.hang||[])[0]||0,h2:(X.hang||[])[1]||0,h3:(X.hang||[])[2]||0,rep:"0"}}
  if(xSEdit){const s=(S.series||[]).find(z=>z.id===xSEdit)||{tpl:{}},t=s.tpl||{};return {...xDef(c,t.fmt),...t,time:s.time||"19:00",end:s.end||t.end||"",date:"",h1:(t.hang||[])[0]||0,h2:(t.hang||[])[1]||0,h3:(t.hang||[])[2]||0,rep:"1",days:(s.days||[]).join(","),auto:s.auto?"1":"0",openD:+s.openD||2}}
  const f=xNew==="giai"?"giai":"xoay",L=xFmtLast(f),tm=new Date(now+864e5);tm.setHours(19,0,0,0);
  const base={...xDef(c,f),...(L?{name:L.name,end:L.end,place:L.place,map:L.map,note:L.note,courts:L.courts,target:L.target,max:L.max,lvMin:L.lvMin,lvMax:L.lvMax,guests:L.guests,thu:L.thu,fee:L.fee,phi:L.phi,feeG:L.feeG,pay:L.pay,dlH:L.dlH,lockH:L.lockH}:{})};
  const at=L&&L.at?(()=>{const d=new Date(L.at);const t=new Date(now+864e5);t.setHours(d.getHours(),d.getMinutes(),0,0);return t.getTime()})():tm.getTime();
  return {...base,date:isoDay(at),time:hm(at),h1:(L&&L.hang||[])[0]||0,h2:(L&&L.hang||[])[1]||0,h3:(L&&L.hang||[])[2]||0,rep:"0",days:String(new Date(at).getDay()),auto:"1",openD:2};
}
function xDef(c,f){return {fmt:f==="giai"?"giai":"xoay",name:"",end:"",place:"",map:"",note:"",courts:+c.courts||2,target:+c.target||11,max:f==="giai"?16:0,lvMin:"",lvMax:"",guests:false,thu:c.thu||"keo",fee:0,phi:+c.phi||50,feeG:"",pay:"off",dlH:0,lockH:2}}
let xSrcCache=null;
const xv=(D,k)=>{const s=xSrcCache||xSrc(D);const v=s[k];return val("xf-"+k,typeof v==="boolean"?(v?"1":"0"):v==null?"":v)};
function xForm(D){
  if(xNew==="pick")return xPickFmt(D);
  xSrcCache=null;xSrcCache=xSrc(D);
  const fmt=xEdit?(schedById(xEdit)?.fmt||"xoay"):xSEdit?(xSrcCache.fmt||"xoay"):xNew,G=fmt==="giai",inS=xEdit&&schedById(xEdit)?.series;
  const v=k=>xv(D,k),inp=(k,label,attrs="")=>`<label class="fld"><span class="lbl">${label}</span><input id="xf-${k}" data-draft="xf-${k}" value="${esc(v(k))}" ${attrs}></label>`;
  const seg=(k,opts)=>`<span class="seg segw">${opts.map(([val2,l])=>`<button data-act="xfset" data-k="${k}" data-v="${val2}" aria-pressed="${String(v(k))===String(val2)}">${l}</button>`).join("")}</span>`;
  const stp=(k,label,unit,min,max)=>`<div class="srow"><span>${label}</span><span class="stepper"><button data-act="xfstep" data-k="${k}" data-d="-1" data-min="${min}" data-max="${max}" aria-label="Bớt">−</button><span class="num">${esc(v(k))}${unit}</span><button data-act="xfstep" data-k="${k}" data-d="1" data-min="${min}" data-max="${max}" aria-label="Thêm">+</button></span></div>`;
  const sec=(t,b,cls="")=>`<section class="xsecbox${cls}"><span class="xsech">${t}</span>${b}</section>`;
  const thu=v("thu"),rep=v("rep")==="1",days=String(v("days")).split(",").filter(Boolean).map(Number);
  let h=`<div class="xfhead"><span class="k">${xEdit?"Sửa buổi":xSEdit?"Sửa lịch lặp":"Tạo buổi · bước 2/2"}</span><div class="xrow2"><h1>${G?"Cặp cố định, vòng tròn":"Xoay cặp"}</h1>${xNew?`<button class="lnk" data-act="xnew">Đổi thể thức</button>`:""}</div>${xNew?`<span class="xsteps"><i class="on"></i><i class="on"></i></span>`:""}</div>`;
  h+=sec("Thời gian · địa điểm",`${inp("name",G?"Tên giải":"Tên buổi",`maxlength="60" placeholder="${G?"Giải cặp tháng này":"Kèo tối thứ 5"}"`)}
    <div class="form">${xSEdit?"":inp("date","Ngày",'type="date"')}${inp("time","Bắt đầu",'type="time"')}${inp("end","Kết thúc",'type="time"')}</div>
    ${inp("place","Sân",'maxlength="60" placeholder="Sân Kỳ Hòa, Q10"')}${inp("map","Link Google Maps (không bắt buộc)",'type="url" maxlength="300" placeholder="https://maps.app.goo.gl/…"')}`);
  if(!xEdit)h+=sec(`<span class="xrow2">Lặp lại hằng tuần ${xSEdit?"":`<button class="xsw${rep?" on":""}" data-act="xfset" data-k="rep" data-v="${rep?"0":"1"}" role="switch" aria-checked="${rep}" aria-label="Lặp lại hằng tuần"><i></i></button>`}</span>`,
    rep?`<div class="xdays">${[1,2,3,4,5,6,0].map(d=>`<button data-act="xfday" data-v="${d}" aria-pressed="${days.includes(d)}">${DOW[d]}</button>`).join("")}</div>
      <div class="fld"><span class="lbl">Mở đăng ký cho các buổi lặp</span>${seg("auto",[["1","Tự mở"],["0","Tôi tự bấm mở"]])}</div>
      ${v("auto")==="1"?stp("openD","Tự mở trước buổi"," ngày",1,7):""}
      <small class="rule">${v("auto")==="1"?`App tạo sẵn các buổi của 2 tuần tới. Tới giờ, buổi tự mở đăng ký, người chơi thấy ngay trong Zalo.`:`App tạo sẵn các buổi ở dạng nháp, bạn bấm “Mở đăng ký” khi muốn.`}</small>`
    :`<small class="rule">Bật để app tự tạo buổi các tuần sau theo đúng cài đặt này.</small>`,rep?" hi":"");
  else if(inS)h+=`<small class="rule">Buổi này thuộc lịch lặp hằng tuần. Sửa ở đây chỉ đổi buổi này, các buổi khác giữ nguyên.</small>`;
  h+=sec(G?"Luật giải":"Luật xoay cặp",`${stp("courts","Số sân","",1,30)}${stp("target","Chạm điểm","",5,31)}`);
  h+=sec("Người chơi",`${stp("max",G?"Số người tối đa":"Tối đa (0 là không giới hạn)","",0,200)}${G?`<small class="rule">Đăng ký từng người, bạn ghép cặp ở bước Chuẩn bị của tab Sân.</small>`:""}
    <div class="form">${inp("lvMin","Trình từ",'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="2.5"')}${inp("lvMax","đến",'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="4.0"')}</div>
    <div class="fld"><span class="lbl">Đối tượng</span>${seg("guests",[["0","Chỉ thành viên"],["1","Cả khách vãng lai"]])}</div>`);
  h+=sec(G?"Lệ phí · giải thưởng":"Chi phí",`<div class="fld"><span class="lbl">Cách thu</span>${seg("thu",[["phi","Phí cố định"],["deu","Chia đều"],["keo","Kèo thua góp"]])}</div>
    <div class="form">${thu==="phi"?inp("phi","Mỗi người (k)",'type="number" min="0" inputmode="numeric"'):inp("fee","Dự kiến mỗi người (k)",'type="number" min="0" inputmode="numeric" placeholder="0"')}${v("guests")==="1"?inp("feeG","Khách (k)",'type="number" min="0" inputmode="numeric" placeholder="như thành viên"'):""}</div>
    ${G?`<div class="form f3">${inp("h1","Giải nhất (k)",'type="number" min="0" inputmode="numeric"')}${inp("h2","Giải nhì (k)",'type="number" min="0" inputmode="numeric"')}${inp("h3","Giải ba (k)",'type="number" min="0" inputmode="numeric"')}</div>`:""}
    <div class="fld"><span class="lbl">Chuyển khoản lúc đăng ký</span>${seg("pay",[["off","Không"],["opt","Tùy chọn"],["req","Bắt buộc"]])}</div>
    ${v("pay")!=="off"&&!(BANK&&BANK.acc)?`<small class="rule" style="color:var(--lose)">Cần khai ngân hàng nhận tiền ở Cài đặt CLB.</small>`:""}`);
  h+=sec("Hạn",`${stp("dlH","Đóng đăng ký trước buổi"," giờ",0,72)}${stp("lockH","Khóa hủy trước buổi"," giờ",0,72)}
    <label class="fld"><span class="lbl">Ghi chú cho người chơi</span><textarea id="xf-note" data-draft="xf-note" maxlength="300" rows="2" placeholder="Mang giày đế bằng, CLB có bóng">${esc(v("note"))}</textarea></label>`);
  if(errs.xf)h+=`<p class="err">${esc(errs.xf)}</p>`;
  h+=`<div class="xfbar">${xEdit||xSEdit?`<button class="line" data-act="xclose">Hủy</button><button class="primary" data-act="xsave" data-v="save">Lưu</button>`:`<button class="line" data-act="xsave" data-v="draft">Lưu nháp</button><button class="primary" data-act="xsave" data-v="open">Tạo và mở đăng ký</button>`}</div>`;
  return h;
}
function xPickFmt(D){
  const L=schedAll().filter(x=>x.st!=="cancel").pop();
  return `<div class="xfhead"><span class="k">Tạo buổi · bước 1/2</span><div class="xrow2"><h1>Chọn thể thức</h1><button class="lnk" data-act="xclose">Đóng</button></div><span class="xsteps"><i class="on"></i><i></i></span></div>
    ${L?`<button class="xreuse" data-act="xfmt" data-v="${L.fmt==="giai"?"giai":"xoay"}"><b>Dùng lại buổi trước:</b> ${esc(xName(L))} · ${xFmt(L)}<span>›</span></button>`:""}
    <button class="xfmt on" data-act="xfmt" data-v="xoay"><span class="ic"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="14" cy="14" r="5"/><circle cx="34" cy="14" r="5"/><circle cx="14" cy="34" r="5"/><circle cx="34" cy="34" r="5"/><path d="M20 14h8M34 20v8M28 34h-8M14 28v-8"/></svg></span>
      <span class="t"><b>Xoay cặp</b><span>Kèo thường ngày. Đổi cặp liên tục, ai cũng đánh với nhiều người, tính rating. Ai thua góp tiền.</span><span class="rgchips"><span>8–40 người</span><span>Phổ biến nhất</span></span></span></button>
    <button class="xfmt" data-act="xfmt" data-v="giai"><span class="ic"><svg viewBox="0 0 48 48" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M14 12h10M24 12v8M14 28h10M24 28v-8M24 20h10M14 36h20"/><circle cx="40" cy="20" r="4"/></svg></span>
      <span class="t"><b>Cặp cố định, vòng tròn</b><span>Giải nhỏ trong CLB. Mỗi cặp gặp tất cả các cặp còn lại. Có giải nhất, nhì, ba.</span><span class="rgchips"><span>4–12 cặp</span><span>Có giải thưởng</span></span></span></button>
    <span class="xsec">Sắp có</span><div class="xsoon"><b>Vua sân (King of the court)</b><small>Thắng ở lại sân, thua xuống chờ</small></div><div class="xsoon"><b>Chia bảng + loại trực tiếp</b><small>Cho giải đông cặp</small></div>`;
}
// Đọc form thành dữ liệu buổi
function xRead(D){
  const v=k=>{const el=document.getElementById&&document.getElementById("xf-"+k);return String(el&&el.value!=null?el.value:xv(D,k)).trim()};
  const n=(k,d=0)=>{const x=parseFloat(v(k));return Number.isFinite(x)?x:d};
  const fmt=xEdit?(schedById(xEdit)?.fmt||"xoay"):xSEdit?((S.series||[]).find(z=>z.id===xSEdit)?.tpl?.fmt||"xoay"):(xNew==="giai"?"giai":"xoay");
  const f={name:v("name").slice(0,60),fmt,end:v("end").slice(0,5),place:v("place").slice(0,60),map:/^https?:\/\//.test(v("map"))?v("map").slice(0,300):"",note:v("note").slice(0,300),
    courts:Math.max(1,Math.round(n("courts",2))),target:Math.max(5,Math.round(n("target",11))),max:Math.max(0,Math.round(n("max",0))),lvMin:v("lvMin"),lvMax:v("lvMax"),guests:v("guests")==="1",
    thu:["phi","deu","keo"].includes(v("thu"))?v("thu"):"keo",fee:Math.max(0,n("fee",0)),phi:Math.max(0,n("phi",0)),feeG:v("feeG")===""?"":Math.max(0,n("feeG",0)),pay:["off","opt","req"].includes(v("pay"))?v("pay"):"off",
    dlH:Math.max(0,n("dlH",0)),lockH:Math.max(0,n("lockH",2))};
  if(fmt==="giai")f.hang=[n("h1",0),n("h2",0),n("h3",0)];
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
    await write(()=>db.collection("sched").doc(X.id).set(xBuild({...f,at},{st:X.st,openAt:X.openAt||0,series:X.series||null,num:X.num??null,createdAt:X.createdAt||Date.now()})),"Đã lưu buổi");
    xEdit=null;xClearDraft();render();return}
  const id=db.collection("sched").doc().id;let sid=null;
  await write(async()=>{
    if(rep){sid=db.collection("series").doc().id;await db.collection("series").doc(sid).set({days,time:t,end:f.end,tpl:f,auto,openD,on:true,from:dayStart(at),at:Date.now()})}
    await db.collection("sched").doc(rep?sid+"-"+ymd(at):id).set(xBuild({...f,at},{st:mode==="open"?"open":"draft",openAt:0,series:sid}));
    if(rep)await xMaterialize({id:sid,days,time:t,end:f.end,tpl:f,auto,openD,from:dayStart(at)});
  },mode==="open"?"Đã tạo buổi và mở đăng ký":"Đã lưu nháp");
  xNew=null;xClearDraft();go("app",{tab:"dk",x:rep?sid+"-"+ymd(at):id});
}
const xClearDraft=()=>{for(const k of XF_KEYS)delete drafts["xf-"+k];xSrcCache=null};

/* ----- Người chơi: danh sách buổi sắp tới (Trang chủ Mini App, trang Đăng ký trên web) ----- */
function xPlayerCards(D,o={}){
  const U=schedUp().filter(x=>x.st!=="draft"&&(o.all||xState(x)!=="plan"||x.openAt-Date.now()<7*864e5));
  return U.slice(0,o.max||99).map(x=>{const mine=authUser&&(S.regs||[]).find(r=>r.sid===x.id&&r.uid===authUser.uid&&!r.cancel),s=xState(x),n=xRegN(x),m=+x.max||0,fee=xFee(x);
    const st=s==="live"?`<span class="xchip ok">Đang đánh</span>`:mine?`<span class="xchip ok">✓ Bạn đã đăng ký${mine.pay==="ok"?" · đã trả":mine.pay==="sent"?" · chờ xác nhận tiền":""}</span>`:s==="plan"?xChip(x):xOpen(x)?(m&&n>=m?`<span class="xchip warn">Hết chỗ · vào danh sách chờ</span>`:`<span class="xchip ok">Đang nhận đăng ký${m?` · còn ${m-n} chỗ`:""}</span>`):`<span class="xchip">Đã đóng đăng ký</span>`;
    return `<a class="xcard pl${mine?" mine":""}" href="${s==="live"?pathOf("app",{tab:"san"}):pathOf("app",{tab:"dk",x:x.id})}" ${s==="live"?`data-go="app" data-t="san"`:`data-go="app" data-t="dk" data-x="${esc(x.id)}"`}>${xDate(x.at,!!mine||s==="live")}
      <span class="t"><b>${esc(xName(x))}</b><small>${esc([xTime(x),xFmt(x),fee&&fmtK(fee),m&&`${n}/${m}`].filter(Boolean).join(" · "))}</small><span class="xrow">${st}</span>${!mine&&xOpen(x)?`<span class="xgo">${m&&n>=m?"Vào danh sách chờ":"Đăng ký"} ›</span>`:""}</span></a>`}).join("");
}
// Trang Đăng ký khi chưa chọn buổi: danh sách các buổi
function vLichPlayer(D){
  const X=routeX?schedById(routeX):null;
  if(X)return withX(X,()=>dkPlayer(D));
  const c=xPlayerCards(D,{all:true});
  if(c)return `<span class="xsec">Buổi sắp tới</span>${c}`+(PLAYER_ON()?linkCard(D):"");
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
  let h="";
  if(T.length>1&&phaseOf(D)!=="live"&&!D.SM.length)h+=`<div class="xpick" role="group" aria-label="Chọn buổi hôm nay">${T.slice().sort((a,b)=>a.at-b.at).map(x=>`<button data-act="xprep" data-id="${x.id}" aria-pressed="${X&&X.id===x.id}"><b>${hm(x.at)}</b>${esc(xName(x))}</button>`).join("")}</div>`;
  h+=`<section class="xhero prephd"><span class="k">${esc(sessTitle(c,D.sid))} · chuẩn bị${X&&X.at?` · ${esc(xTime(X))}`:""}</span>
    <div class="xrow2"><h1>${esc(X?xName(X):(c.sname||"Buổi nhanh"))}</h1>${X?`<a class="xedit" href="${pathOf("app",{tab:"dk",x:X.id})}" data-go="app" data-t="dk" data-x="${esc(X.id)}">Sửa buổi ›</a>`:""}</div>
    <span class="sub">${esc([fmtTxt(c),`${c.courts} sân`,`chạm ${c.target}${winBy2(c)?" cách 2":""}`,c.cphi===false?"không thu tiền":THU[thu]+(thu==="phi"?` ${fmtK(+c.phi||0)}`:""),X&&`${xRegN(X)} người đăng ký`].filter(Boolean).join(" · "))}</span></section>`;
  return h;
}
function xNoSched(D){
  if(legacy||!isAdm()||phaseOf(D)==="live")return "";
  const nx=schedUp().find(x=>x.at>Date.now()&&x.st!=="draft");
  return `<a class="dkban" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk"><span class="t"><b>Hôm nay chưa có buổi theo lịch</b><small>${nx?`Buổi tới: ${esc(dowVN(nx.at))} ${esc(dmy(nx.at).slice(0,5))} · ${esc(xTime(nx))} · ${esc(xName(nx))}`:"Lên lịch buổi để người chơi đăng ký trước"}</small></span><span aria-hidden="true">›</span></a>`;
}
// Áp cài đặt buổi trong lịch vào buổi hiện tại (tab Sân), điểm danh theo đăng ký
async function xApply(D,X,quiet){
  const p={schedId:X.id,sname:X.name||"",courts:+X.courts||D.c.courts,target:+X.target||D.c.target,thu:X.thu||D.c.thu||"keo"};
  if(X.thu==="phi")p.phi=+X.phi||0;
  if(X.fmt==="giai"){p.fmt="giai";p.giai=D.c.giai&&isG(D.c)?D.c.giai:{pairs:[],prizes:[0,0,0],out:{},locked:false};const k=X.hang||[];if(k.some(v=>+v>0))Object.assign(p,{gt:"hang",hang1:+k[0]||0,hang2:+k[1]||0,hang3:+k[2]||0})}
  else p.fmt="xoay";
  let n=0;
  await write(async()=>{await saveCfg(p);await db.collection("sched").doc(X.id).update({num:D.sid});
    const R=withX(X,()=>regList(D)),inS=new Set(R.conf.map(x=>x.pid).filter(Boolean));
    n=await withX(X,()=>regStart(D));
    // Có người đăng ký: điểm danh đúng theo danh sách (người khác bấm thêm ở Điểm danh)
    if(inS.size)for(const pl of D.players){const on=inS.has(pl.id);if((pl.active!==false)!==on)await db.collection("players").doc(pl.id).update({active:on})}
  },quiet?null:`Đã chọn ${xName(X)}`);
  if(n)toast(`Đã điểm danh ${n} người theo đăng ký`);
}
// Chốt buổi: buổi trong lịch chuyển sang Đã xong
async function xFinish(D){const X=xCur();if(X)await db.collection("sched").doc(X.id).update({st:"done",num:D.sid,doneAt:Date.now()})}

/* ----- Bấm ----- */
async function xAct(act,b,id,D){
  if(act==="xnew"){xNew="pick";xEdit=null;xSEdit=null;xClearDraft();delete errs.xf;if(route!=="app"||tab!=="dk"||routeX)go("app",{tab:"dk"});else{render();try{scrollTo({top:0})}catch(e){}}return true}
  if(act==="xfmt"){xNew=b.dataset.v==="giai"?"giai":"xoay";xClearDraft();render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xclose"){xNew=null;xEdit=null;xSEdit=null;xClearDraft();delete errs.xf;render();return true}
  if(act==="xedit"){xEdit=id;xNew=null;xSEdit=null;xClearDraft();render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xsedit"){xSEdit=id;xNew=null;xEdit=null;xClearDraft();render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xfset"){drafts["xf-"+b.dataset.k]=b.dataset.v;render();return true}
  if(act==="xfstep"){const k=b.dataset.k,cur=parseFloat(xv(D,k))||0;drafts["xf-"+k]=String(Math.min(+b.dataset.max,Math.max(+b.dataset.min,cur+Number(b.dataset.d))));render();return true}
  if(act==="xfday"){const d=Number(b.dataset.v),L=String(xv(D,"days")).split(",").filter(Boolean).map(Number),i=L.indexOf(d);if(i>=0)L.splice(i,1);else L.push(d);drafts["xf-days"]=L.join(",");render();return true}
  if(act==="xsave"){await xSave(D,b.dataset.v);return true}
  if(act==="xday"){const t=Number(b.dataset.v);xDay=xDay&&sameDay(xDay,t)?null:t;render();return true}
  if(act==="xdone"){xDoneOpen=!xDoneOpen;render();return true}
  if(act==="xqr"){xQr=xQr===id?null:id;render();return true}
  if(act==="xopen"){await write(()=>db.collection("sched").doc(id).update({st:"open",openAt:0}),"Đã mở đăng ký");return true}
  if(act==="xpause"){await write(()=>db.collection("sched").doc(id).update({st:"draft"}),"Đã tạm dừng đăng ký");return true}
  if(act==="xcancel"){if(!armOr("xcancel:"+id))return true;await write(()=>db.collection("sched").doc(id).update({st:"cancel"}),"Đã hủy buổi");return true}
  if(act==="xdel"){if(!armOr("xdel:"+id))return true;await write(()=>db.collection("sched").doc(id).delete(),"Đã xoá buổi");go("app",{tab:"dk"});return true}
  if(act==="xsoff"){if(!armOr("xsoff:"+id))return true;
    await write(async()=>{await db.collection("series").doc(id).update({on:false});
      for(const x of (S.sched||[]).filter(x=>x.series===id&&(x.st==="plan"||x.st==="draft")&&x.at>Date.now()&&!xRegN(x)))await db.collection("sched").doc(x.id).delete()},"Đã tắt lặp lại. Các buổi đã có người đăng ký vẫn giữ.");return true}
  if(act==="xprep"){const X=schedById(id);if(X)await xApply(D,X);return true}
  return false;
}
