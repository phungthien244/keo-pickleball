/* ---------- Giải: trang danh sách giải, tạo giải 3 câu, quản lý giải 4 chặng ----------
   Nguyên tắc: mỗi màn một nút chính ở dưới; mỗi giải có "Việc tiếp theo"; lời thường, không thuật ngữ.
   4 chặng bấm qua lại tự do: Đăng ký · Ngày đánh · Đang đánh · Chốt. Chỉ "Bắt đầu đánh" và "Xong giải" đổi trạng thái.
   Chức năng phụ: nút "Thêm việc ⋯" của từng chặng. Mọi tuỳ chỉnh: "✎ Sửa giải".
   Dữ liệu: giải trong lịch (sched). Giải đang chạy ở sân (config, trận) là cfg().schedId; không có lịch thì là giải đánh nhanh. */
let gmSt={},gmMore=false,gmSw=false,gmEdit=false,gmSec=null,gmMade=null,xQ=false,xQs=1;
const GM_ST=["Đăng ký","Ngày đánh","Đang đánh","Chốt"];
const gmCur=X=>X?cfg().schedId===X.id:true;
const gmLive=D=>phaseOf(D)==="live";
// Chặng tự nhiên của giải lúc này
function gmStageOf(D,X){
  if(X&&(X.st==="done"))return 3;
  const cur=gmCur(X);
  if(cur&&(gmLive(D)||D.SM.length))return 2;
  if(!X)return 1;
  if(cur||(X.at&&sameDay(X.at,Date.now())))return 1;
  return 0;
}
const gmBar=(n,done)=>`<span class="gmbar" aria-hidden="true">${GM_ST.map((_,i)=>`<i class="${done||i<n?"ok":i===n?"on":""}"></i>`).join("")}</span>`;
const gmTag=X=>{const s=xState(X),st=X?null:"live";
  if(!X||s==="live")return `<span class="gmtag r">ĐANG ĐÁNH</span>`;
  if(X.st==="done")return `<span class="gmtag">ĐÃ XONG</span>`;
  if(X.at&&sameDay(X.at,Date.now()))return `<span class="gmtag b">HÔM NAY</span>`;
  return {draft:`<span class="gmtag y">NHÁP</span>`,plan:`<span class="gmtag y">CHỜ MỞ</span>`,open:`<span class="gmtag g">ĐĂNG KÝ</span>`,cancel:`<span class="gmtag">ĐÃ HUỶ</span>`}[s]||"";
};
const gmLink=X=>X?`href="${pathOf("app",{tab:"dk",x:X.id})}" data-go="app" data-t="dk" data-x="${esc(X.id)}"`:`href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"`;
// Việc tiếp theo của một giải: {t, s, b: nút}
function gmNext(D,X){
  const st=gmStageOf(D,X),cur=gmCur(X);
  if(st===3)return {t:"Đã xong",s:X&&X.num?`Kết quả ở Lịch sử · giải đấu #${X.num}`:"",b:""};
  if(st===2)return {t:`Đang đánh · ${D.playing.length} sân`,s:`${D.done.length} trận xong · nhập điểm, xếp trận tiếp`,b:`<a class="gmgo" ${gmLink(X)}>Mở sân ›</a>`};
  if(st===1){
    if(cur){const C=hqChecks(D).find(x=>!x[1]);return {t:C?C[2]:"Sẵn sàng · bắt đầu đánh",s:C?"Còn việc trước giờ đánh":"Điểm danh đủ rồi bấm Bắt đầu đánh",b:`<a class="gmgo" ${gmLink(X)}>Điểm danh ›</a>`}}
    return {t:"Hôm nay đánh · điểm danh",s:"Chọn giải này để điểm danh, xếp sân",b:`<a class="gmgo" ${gmLink(X)}>Mở giải ›</a>`};
  }
  const s=xState(X);
  if(s==="draft")return {t:"Mở đăng ký",s:"Giải còn là nháp, người chơi chưa thấy",b:`<button class="gmgo" data-act="xopen" data-id="${esc(X.id)}">Mở đăng ký</button>`};
  if(s==="plan")return {t:`Tự mở đăng ký ${dowVN(X.openAt)} ${hm(X.openAt)}`,s:"Hoặc mở ngay bây giờ",b:`<button class="gmgo ln" data-act="xopen" data-id="${esc(X.id)}">Mở ngay</button>`};
  if(s==="cancel")return {t:"Giải đã huỷ",s:"",b:""};
  const R=withX(X,()=>regList(D)),left=R.max<999?Math.max(0,R.max-R.conf.length):null;
  return {t:left===0?"Đủ chỗ · gửi danh sách vào nhóm":left!=null?`Còn ${left} chỗ · gửi nhắc vào nhóm`:`${R.conf.length} người đã đăng ký · gửi nhắc vào nhóm`,
    s:X.deadline?`Hạn đăng ký ${hm(X.deadline)} ${dowVN(X.deadline)}`:"",b:`<button class="gmgo" data-act="regshare" data-id="${esc(X.id)}">📣 Gửi nhắc</button>`};
}
const gmNextBox=(n,btn)=>`<div class="gmnext"><span class="cap">👉 Việc tiếp theo</span><b>${n.t}</b>${n.s?`<small>${esc(n.s)}</small>`:""}${btn&&n.b?n.b:""}</div>`;
// Dải đỏ: giải đang đánh, ghim ở các trang khác
function gmLiveBan(D){
  {const y=ycBan(D);if(y)return y}
  if(!canWrite||legacy||REF||!(gmLive(D)||D.SM.length))return "";
  const X=xCur();
  return `<a class="gmlive" ${gmLink(X)}><b>● ĐANG ĐÁNH</b><span>${esc(X?xName(X):(D.c.sname||"Giải đánh nhanh"))} · ${D.playing.length} sân · ${D.done.length} trận xong</span><i>Mở ›</i></a>`;
}

// Dòng tiêu đề màn đi sâu: Mini App (Quản lý) đưa lên đầu trang, web giữ trong thân trang
function gmHd(t,back,o={}){
  if(typeof mxDrOn==="function"&&mxDrOn())return mxDr({t,back,...o});
  return `<div class="gmhd"><button class="gmbk" data-act="${back}"${o.v!=null?` data-v="${esc(o.v)}"`:""} aria-label="${o.x?"Đóng":"Quay lại"}">${o.x?"✕":"‹"}</button><b>${esc(t)}</b></div>`;
}
const gmDot=()=>MINI?`<button class="btn-line gmdot" data-act="gmmore" aria-label="Thêm việc">⋯</button>`:`<button class="btn-line" data-act="gmmore">Thêm việc ⋯</button>`;

/* ----- Trang Giải ----- */
function gmCard(D,X,big){
  const n=gmNext(D,X),st=gmStageOf(D,X),when=X?[X.at?`${dowVN(X.at)} ${dmy(X.at).slice(0,5)}`:"",X.at?xTime(X):"",X.place].filter(Boolean).join(" · "):"Không cần đăng ký trước";
  const reg=X&&st===0?(()=>{const R=withX(X,()=>regList(D)),po=payOn(),paid=R.all.filter(x=>x.pay==="ok").length;return `<span class="gmnum"><b class="num">${R.conf.length}${R.max<999?`/${R.max}`:""}</b> đăng ký${po?` · <b class="num">${paid}</b> đã trả`:""}${R.wait.length?` · ${R.wait.length} chờ`:""}</span>`})():"";
  return `<div class="gmcard${big?" big":""}"><a class="gmc" ${gmLink(X)}><span class="h"><span class="t"><b>${esc(X?xName(X):(D.c.sname||"Giải đánh nhanh"))}</b><small>${esc(when)}</small></span>${gmTag(X)}</span>${X&&X.st==="cancel"?"":gmBar(st,X&&X.st==="done")}${reg}</a>
    ${X&&(X.st==="cancel"||X.st==="done")?"":big?gmNextBox(n,true):`<span class="gmn">👉 <b>${n.t}</b></span>`}</div>`;
}
function vGiaiHub(D){
  const U=schedUp(),now=Date.now(),cx=xCur();
  const today=U.filter(x=>x.at&&sameDay(x.at,now)&&x.st!=="draft"),drafts=U.filter(x=>x.st==="draft"),up=U.filter(x=>!today.includes(x)&&!drafts.includes(x));
  const quick=!cx&&(gmLive(D)||D.SM.length);
  const done=schedAll().filter(x=>x.st==="done"||x.st==="cancel").reverse().slice(0,12);
  if(!U.length&&!quick&&!done.length&&S.schedReady)return gmFirst(D);
  let h=gmLiveBan(D);
  const pend=pendCount();
  if(pend)h+=`<a class="gmpend" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi"><b>${pend} người xin vào CLB</b><span>Duyệt ở Thành viên ›</span></a>`;
  // Giải gấp nhất nổi lên đầu với nút làm luôn
  const first=quick?null:[...today,...up,...drafts].find(Boolean);
  const sec=(t,L)=>L.length?`<span class="gmsec">${t} · ${L.length}</span>`+L.map(x=>gmCard(D,x,x===first)).join(""):"";
  if(quick)h+=`<span class="gmsec">Hôm nay</span>`+gmCard(D,null,true);
  h+=sec("Hôm nay",today)+sec("Sắp tới",up)+sec("Nháp",drafts);
  if(!S.schedReady)h+=`<p class="rule">Đang tải…</p>`;
  else if(!U.length&&!quick)h+=`<div class="gmempty"><b>Chưa có giải nào sắp tới</b><span>Bấm “Tạo giải mới” ở dưới.</span></div>`;
  const SR=(S.series||[]).filter(s=>s.on);
  if(SR.length)h+=`<span class="gmsec">Lặp hằng tuần</span>`+SR.map(s=>`<div class="gmser"><span class="t"><b>${(s.days||[]).slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DOW[d]).join(" & ")} · ${esc(s.time||"")}</b><small>${esc(xName(s.tpl||{}))} · ${s.auto?`tự mở đăng ký trước ${+s.openD||2} ngày`:"tự bấm mở đăng ký"}</small></span><button class="lnk" data-act="xsedit" data-id="${s.id}">Sửa</button><button class="lnk" data-act="xsoff" data-id="${s.id}">${armed("xsoff:"+s.id)?"Tắt?":"Tắt"}</button></div>`).join("");
  if(done.length)h+=`<button class="gmdone" data-act="xdone" aria-expanded="${xDoneOpen}"><span>Đã xong · ${done.length} giải gần đây</span><span>${xDoneOpen?"−":"›"}</span></button>`+(xDoneOpen?done.map(x=>gmCard(D,x)).join(""):"");
  if(!cx&&!quick&&isAdm())h+=`<button class="lnk gmquick" data-act="gmquick">⚡ Đánh nhanh · không cần đăng ký trước</button>`;
  return h+`<div class="hqcta"><button class="ball wide nv" data-act="xnew">＋ Tạo giải mới</button></div>`;
}
// Lần đầu: chưa có giải nào
function gmFirst(D){
  const nm=String((S.link&&S.link.status==="ok"&&D.pmap.get(S.link.pid)?.name)||zaloProf().n||"").trim().split(/\s+/).pop();
  return `<div class="gmhi"><b>Chào${nm?" "+esc(nm):""} 👋</b><span>Pikeco giúp mở giải, xếp sân, tính tiền. Bắt đầu bằng giải đầu tiên nhé.</span></div>
    <button class="gmopt on" data-act="xqfmt" data-v="xoay"><i>🔄</i><span><b>Buổi giao lưu</b><small>Ai đến cũng đánh. App tự xếp cặp đổi liên tục, tính tiền sân cho từng người. Hợp buổi tập hằng tuần.</small></span><em>PHỔ BIẾN</em></button>
    <button class="gmopt" data-act="xqfmt" data-v="giai"><i>🏆</i><span><b>Giải có cặp cố định</b><small>Đăng ký theo cặp, chia bảng, có giải thưởng. Hợp giải tháng, giải giao hữu.</small></span></button>
    <button class="lnk gmquick" data-act="gmquick">⚡ Đánh nhanh ngay · không cần đăng ký trước</button><div class="hqcta"><button class="ball wide nv" data-act="xnew">＋ Tạo giải mới</button></div>`;
}

/* ----- Tạo giải 3 câu ----- */
const gmDays=()=>{const t0=dayStart(Date.now());return Array.from({length:4},(_,i)=>t0+i*864e5+3600e3)};
function xQuickForm(D){
  const pick=xNew==="pick";
  if(!pick){xSrcCache=null;xSrcCache=xSrc(D)}
  const v=k=>pick?"":xv(D,k),bar=`<div class="gmq3" aria-hidden="true">${[1,2,3].map(i=>`<i class="${i<=xQs?"on":""}"></i>`).join("")}</div>`;
  const q=(n,t,s)=>`<div class="gmq"><span class="cap">Câu ${n}/3</span><b>${t}</b>${s?`<small>${s}</small>`:""}</div>`;
  const chip=(act,k,val2,l,on)=>`<button class="gmchip${on?" on":""}" data-act="${act}" data-k="${k}" data-v="${esc(val2)}" aria-pressed="${!!on}">${l}</button>`;
  if(mxDrOn()&&gsPg==="opt"&&xQs===3)return gsNewPage(D);
  let h=gmHd(`Tạo giải${mxDrOn()?` · ${pick?1:xQs}/3`:""}`,"xclose",{x:true})+bar;
  if(xQs===1||pick){
    const L=schedAll().filter(x=>x.st!=="cancel").pop(),lk=L?(L.fmt==="giai"?(L.ko?"bang":"giai"):"xoay"):"",cur=pick?(lk||"xoay"):xNew;
    h+=q(1,"Lần này đánh kiểu gì?");
    if(L)h+=`<button class="gmsame" data-act="xqsame" data-v="${lk}"><i>↺</i><span><b>Giống lần trước</b><small>${esc(xName(L))}${L.courts?` · ${L.courts} sân`:""}${xFee(L)?` · ${fmtK(xFee(L))}`:""}</small></span><em>Dùng ›</em></button>`;
    h+=`<button class="gmopt${cur==="xoay"?" on":""}" data-act="xqsel" data-v="xoay"><i>🔄</i><span><b>Giao lưu xoay cặp</b><small>Ai đến cũng đánh, app tự đổi cặp mỗi trận.</small></span></button>
      <button class="gmopt${cur==="giai"?" on":""}" data-act="xqsel" data-v="giai"><i>🏆</i><span><b>Giải có cặp cố định</b><small>Mỗi cặp gặp tất cả các cặp khác. Có nhất, nhì, ba.</small></span></button>
      <button class="gmopt${cur==="bang"?" on":""}" data-act="xqsel" data-v="bang"><i>▦</i><span><b>Chia bảng, đánh loại trực tiếp</b><small>Như giải thật: vòng bảng rồi tứ kết, bán kết, chung kết.</small></span></button>
`;
    return h+`<div class="hqcta"><button class="ball go" data-act="xqgo" data-v="2">Tiếp ›</button></div>`;
  }
  if(xQs===2){
    const KB=xNew==="bang",ds=gmDays().slice(0,3),dv=v("date"),tv=v("time"),T3=KB?["07:00","07:30","08:00"]:["18:00","19:00","19:30"],dO=gsDO||(!!dv&&!ds.some(t=>isoDay(t)===dv)),tO=gsTO||(!!tv&&!T3.includes(tv));
    h+=q(2,"Đánh khi nào, ở đâu?");
    h+=`<span class="gmlb">Ngày</span><div class="gmchips c4">${ds.map((t,i)=>chip("xfset","date",isoDay(t),i===0?"Hôm nay":i===1?"Mai":`${DOW[new Date(t).getDay()]} ${dmy(t).slice(0,5)}`,!dO&&dv===isoDay(t))).join("")}${chip("gsk","","d","📅 Khác",dO)}</div>
      ${dO?`<label class="fld gmsm"><span class="lbl">Ngày khác</span><input id="xf-date" data-draft="xf-date" type="date" value="${esc(dv)}"></label>`:""}
      <span class="gmlb">Giờ bắt đầu</span><div class="gmchips c4">${T3.map(t=>chip("xfset","time",t,t,!tO&&tv===t)).join("")}${chip("gsk","","t","Khác",tO)}</div>
      ${tO?`<label class="fld gmsm"><span class="lbl">Giờ khác</span><input id="xf-time" data-draft="xf-time" type="time" value="${esc(tv)}"></label>`:""}
      <label class="fld"><span class="lbl">Sân${v("place")?" · nhớ từ lần trước":""}</span><input id="xf-place" data-draft="xf-place" maxlength="60" placeholder="📍 Sân Kỳ Hòa, Q10" value="${esc(v("place"))}"></label>
      <div class="gmstp"><span><b>Mấy sân?</b><small>${KB?"Giải chia bảng nên có 3–4 sân":"Mỗi sân 4 người một lúc"}</small></span><span class="stepper big"><button data-act="xfstep" data-k="courts" data-d="-1" data-min="1" data-max="30" aria-label="Bớt sân">−</button><b class="num">${esc(v("courts"))}</b><button data-act="xfstep" data-k="courts" data-d="1" data-min="1" data-max="30" aria-label="Thêm sân">＋</button></span></div>${KB?kbEst(D):""}`;
    return h+`${errs.xf?`<p class="err">${esc(errs.xf)}</p>`:""}<div class="hqcta two"><button class="btn-line" data-act="xqgo" data-v="1">‹ Lại</button><button class="ball" data-act="xqgo" data-v="3">Tiếp ›</button></div>`;
  }
  if(xNew==="bang")return h+kbQ3(D,q);
  const G=xNew!=="xoay",cp=String(v("cp"))==="1"||v("cp")===true,thu=v("thu"),amt=cp?(thu==="phi"?+v("phi")||0:+v("fee")||0):0,F=[0,50,60,100];
  const fc=!cp?"0":F.includes(amt)?String(amt):"khac";
  h+=q(3,"Bao nhiêu người, mỗi người bao nhiêu?");
  h+=`<div class="gmstp"><span><b>Tối đa bao nhiêu người?</b><small>Đủ chỗ thì người sau vào danh sách chờ</small></span><span class="stepper big"><button data-act="xfstep" data-k="max" data-d="-2" data-min="0" data-max="200" aria-label="Bớt">−</button><b class="num">${esc(v("max"))}</b><button data-act="xfstep" data-k="max" data-d="2" data-min="0" data-max="200" aria-label="Thêm">＋</button></span></div>
    <span class="gmlb">Lệ phí mỗi người</span><div class="gmchips c5">${[["0","Miễn phí"],["50","50k"],["60","60k"],["100","100k"],["khac","Khác"]].map(([k,l])=>chip("xqfee","",k,l,fc===k)).join("")}</div>
    ${fc==="khac"?`<label class="fld gmsm"><span class="lbl">Số tiền mỗi người (k)</span><input id="xf-${thu==="phi"?"phi":"fee"}" data-draft="xf-${thu==="phi"?"phi":"fee"}" type="number" min="0" inputmode="numeric" value="${esc(amt||"")}"></label>`:""}
    ${cp&&!G?`<span class="gmlb">Thu tiền kiểu nào?</span><div class="gmchips c3">${[["phi","Cố định"],["deu","Chia đều sân"],["keo","Ai thua góp"]].map(([k,l])=>chip("xfset","thu",k,l,thu===k)).join("")}</div>`:""}
    ${mxDrOn()?`<div class="gmlist"><button class="gmli gsrow" data-act="gspg"><i>⚙</i><span class="t"><b>Tuỳ chọn thêm</b><small>Trình độ, luật, giải thưởng, lặp lại…</small></span><em>${GS_NEW.length} mục</em><span aria-hidden="true">›</span></button></div>`:`<button class="gmmore" data-act="xqfull"><span>Tuỳ chọn thêm <small>· trình độ, luật điểm, giải thưởng, lặp hằng tuần, ảnh bìa</small></span><b>▾</b></button>`}`;
  return h+`${errs.xf?`<p class="err">${esc(errs.xf)}</p>`:""}<div class="hqcta two"><button class="btn-line" data-act="xqgo" data-v="2">‹ Lại</button><button class="ball go" data-act="xsave" data-v="open">✓ Tạo giải</button></div>`;
}
function gmAutoName(D){
  const f=xNew==="xoay"?"Giao lưu":xNew==="bang"?"Giải chia bảng":"Giải cặp";
  const d=xv(D,"date"),t=d?new Date(d+"T12:00").getTime():Date.now(),hh=parseInt(xv(D,"time"))||19;
  return `${f} ${hh<11?"sáng":hh<17?"chiều":"tối"} ${dowVN(t).toLowerCase()}`;
}
// Tạo xong: thiệp mời, gửi nhóm một chạm
function gmMadeView(D,X){
  const fee=xFee(X),link=miniLink(CID,X.id);
  if(X.ko&&mxDrOn()){const n=Math.round((+X.max||0)/2),q=+X.koQ||8;mxDr({t:"Đã tạo giải",back:"gmmadex",x:true});
    return `<section class="gmmade kb"><span class="cap">✓ ${xState(X)==="open"?"Đã mở đăng ký":"Đã lưu nháp"}</span><b>${esc(xName(X))}</b><span>${esc([X.at&&`${dowVN(X.at)} ${dmy(X.at).slice(0,5)}`,X.at&&hm(X.at),X.place].filter(Boolean).join(" · "))}</span><span>${esc([DT_LB[X.dt||"free"],n&&`${n} cặp`,fee?`${fmtK(fee)}/người`:"miễn phí"].filter(Boolean).join(" · "))}</span><small>${+X.koN||4} bảng → ${kbRounds(q).join(" → ")}</small></section>
      <div class="gmbox"><span class="cap">Tin nhắn gửi vào nhóm</span><p>🏆 ${esc(xName(X))} · ${esc(DT_LB[X.dt||"free"].toLowerCase())}${X.at?`, ${esc(dowVN(X.at))} ${dmy(X.at).slice(0,5)} ${hm(X.at)}`:""}${X.place?` tại ${esc(X.place)}`:""}.${n?` ${n} cặp`:""}${fee?`, ${fmtK(fee)}/người`:""}. Rủ đồng đội rồi đăng ký: ${esc(link)}</p></div>
      <div class="hqcta two"><button class="btn-line" data-act="cplink" data-v="${esc(link)}">Copy link</button><button class="ball go" data-act="regshare" data-id="${esc(X.id)}">💬 Gửi vào nhóm Zalo</button></div>`}
  return (mxDrOn()?mxDr({t:"Đã tạo giải",back:"gmmadex",x:true}):"")+`<section class="gmmade"><span class="cap">✓ ${xState(X)==="open"?"Đã mở đăng ký":"Đã lưu nháp"}</span><b>${esc(xName(X))}</b><span>${esc([X.at&&`${dowVN(X.at)} ${dmy(X.at).slice(0,5)}`,xTime(X),X.place].filter(Boolean).join(" · "))}</span><span>${esc([X.courts&&`${X.courts} sân`,+X.max&&`${X.max} chỗ`,fee?`${fmtK(fee)}/người`:"miễn phí"].filter(Boolean).join(" · "))}</span></section>
    <div class="gmbox"><span class="cap">Tin nhắn gửi vào nhóm</span><p>🏓 ${esc(xName(X))}${X.at?`, ${esc(dowVN(X.at))} ${dmy(X.at).slice(0,5)} ${hm(X.at)}`:""}${X.place?` tại ${esc(X.place)}`:""}.${+X.max?` ${X.max} chỗ`:""}${fee?`, ${fmtK(fee)}/người`:""}. Bấm để đăng ký: ${esc(link)}</p></div>
    ${mxDrOn()?`<div class="hqcta two"><button class="btn-line" data-act="cplink" data-v="${esc(link)}">Copy link</button><button class="ball go" data-act="regshare" data-id="${esc(X.id)}">💬 Gửi vào nhóm Zalo</button></div>`
      :`<small class="rule" style="text-align:center">Người chơi bấm link là đăng ký được, không cần cài gì.</small><div class="hqcta"><button class="ball wide go" data-act="regshare" data-id="${esc(X.id)}">💬 Gửi vào nhóm Zalo</button><div class="gmrow"><button class="btn-line" data-act="cplink" data-v="${esc(link)}">Copy link</button><button class="btn-line" data-act="gmmadex">Xong</button></div></div>`}`;
}

/* ----- Quản lý một giải: 4 chặng ----- */
function vGiaiMgr(D,X){
  if(mxDrOn()&&gmEdit&&X&&!xNew&&!xSEdit)return gsEdit(D,X,gmCur(X))+dhSheets(D);
  if(xNew||xEdit||xSEdit)return xQ&&xNew&&!xEdit&&!xSEdit?xQuickForm(D):xForm(D);
  if(mxDrOn()&&X&&xbBulk)return gmBulkPg(D,X);
  if(mxDrOn()&&X&&kPg&&kOn(X)){const k=kPage(D,X);if(k!=null)return k}
  if(mxDrOn()&&X&&regAddOpen)return gmAddPg(D,X);
  if(mxDrOn()&&X&&ckBtc===X.id)return ckBtcPg(D,X);
  if(mxDrOn()&&loaPgOn)return loaPg(D,X);
  if(ciOpen)return ckScreen(D);
  if(ckAllOpen&&ckSched())return ckAll(D)+hnLate(D)+dhSheets(D);
  if(X&&gmMade===X.id)return gmMadeView(D,X);
  if(!X||(X.at&&sameDay(X.at,Date.now())))xAutoPrep(D);
  const cur=gmCur(X),nat=gmStageOf(D,X),id=X?X.id:"_q";
  let st=gmSt[id];if(st==null||st<0||st>3)st=nat;
  if(gmEdit)return gmEditView(D,X,cur)+dhSheets(D);
  if(mxDrOn()&&st===2&&g4V&&cur&&(gmLive(D)||D.SM.length))return gmPlayV(D,X)+dhSheets(D);
  const nm=X?xName(X):(D.c.sname||"Giải đánh nhanh");
  const when=X?[X.at?`${dowVN(X.at)} ${dmy(X.at).slice(0,5)}`:"",X.at?xTime(X):"",X.place].filter(Boolean).join(" · "):"Không cần đăng ký trước";
  const nC=Math.max(1,+(X&&X.courts)||+D.c.courts||1),sub=st===2&&cur&&(gmLive(D)||D.SM.length)?`● Đang đánh · ${D.done.length} trận xong`:st===3?`Chốt · ${D.done.length} trận · ${D.players.filter(p=>p.active!==false).length} người`:st===1&&(!X||(X.at&&sameDay(X.at,Date.now())))?`Hôm nay${X&&X.at?" "+hm(X.at):""} · ${nC} sân`:when;
  let h=mxDrOn()?mxDr({t:nm,tact:"gmsw",sub:esc(sub),go:`href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk"`})
    :`<div class="gmhd">${MINI?"":`<a class="gmbk" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk" aria-label="Về danh sách giải">‹</a>`}<button class="gmname" data-act="gmsw"><b>${esc(nm)}</b><i aria-hidden="true">▾</i></button><button class="gmed" data-act="gmedit">✎ Sửa</button></div>`;
  h+=`<nav class="gmst" aria-label="Các chặng của giải">${GM_ST.map((t,i)=>`<button data-act="gmst" data-v="${i}" aria-pressed="${i===st}" class="${i<nat||(X&&X.st==="done")?"ok":i===nat?"now":""}">${i<nat||(X&&X.st==="done")?"✓ ":i===nat?"● ":""}${t}</button>`).join("")}</nav>`;
  h+=ycBan(D);
  if(st!==nat&&!(X&&X.st==="done"))h+=`<button class="gmback" data-act="gmst" data-v="${nat}"><span>Đang xem lại <b>${GM_ST[st]}</b> · giải đang ở <b>${GM_ST[nat]}</b></span><b>Về ${GM_ST[nat]} ›</b></button>`;
  h+=[gmS0,gmS1,gmS2,gmS3][st](D,X,cur);
  return h+gmSheets(D,X,st,cur)+hnLate(D)+dhSheets(D);
}
// Chặng 1 · Đăng ký
function gmS0(D,X){
  if(mxDrOn()&&X)return gmRegV(D,X);
  if(!X)return `<div class="gmempty"><b>Giải đánh nhanh</b><span>Không có đăng ký trước. Ai có mặt ở sân thì điểm danh ở chặng Ngày đánh.</span></div><div class="hqcta two">${gmDot()}<button class="ball" data-act="gmst" data-v="1">Sang Ngày đánh ›</button></div>`;
  const s=xState(X),today=X.at&&sameDay(X.at,Date.now());
  let main="";
  if(s==="draft"||s==="plan")main=`<button class="ball go" data-act="xopen" data-id="${esc(X.id)}">Mở đăng ký</button>`;
  else if(s==="open"&&!today)main=`<button class="ball go" data-act="regshare" data-id="${esc(X.id)}">📣 Gửi nhắc vào nhóm</button>`;
  else if(s!=="done"&&s!=="cancel")main=`<button class="ball" data-act="gmst" data-v="1">Sang Ngày đánh ›</button>`;
  const n=gmNext(D,X);
  return gmNextBox(n,false)+xBtc(D,X,{bare:true})+(s==="done"||s==="cancel"?"":`<div class="hqcta two">${MINI?`<button class="btn-line gmdot" data-act="xbmenu" aria-label="Thêm việc">⋯</button>`:`<button class="btn-line" data-act="xbmenu">Thêm việc ⋯</button>`}${main}</div>`);
}
// Chặng 2 · Ngày đánh: điểm danh rồi bắt đầu
function gmS1(D,X,cur){
  if(!cur){
    const other=xCur(),busy=other&&(gmLive(D)||D.SM.length);
    if(X&&X.st==="done")return `<div class="gmempty"><b>Giải đã xong</b></div>`;
    return `<div class="gmempty"><b>${busy?"Đang có giải khác ở sân":"Giải này chưa được chọn để đánh"}</b><span>${busy?`${esc(xName(other))} đang đánh. Chốt giải đó xong mới điểm danh giải này.`:"Chọn để điểm danh, xếp sân cho giải này. Có thể điểm danh sớm trước ngày đánh."}</span></div>`
      +(busy?"":`<div class="hqcta"><button class="ball wide go" data-act="xprep" data-id="${esc(X.id)}">Điểm danh giải này</button></div>`);
  }
  if(mxDrOn()&&X)return gmDayV(D,X);
  const C=hqChecks(D),miss=C.find(x=>!x[1]),G=isG(D.c),n=D.players.filter(p=>p.active!==false).length,live=gmLive(D)||D.SM.length;
  let h=gmNextBox({t:miss?miss[2]:live?"Giải đang đánh":"Sẵn sàng · bắt đầu đánh",s:miss?"Xong mục này rồi bắt đầu đánh":live?"":"Loa đọc thể thức, trận đầu tự vào sân"},false);
  const T=isAdm()?xToday():[];
  if(T.length>1&&!live)h+=`<span class="gmlb">Hôm nay có ${T.length} giải · đang điểm danh</span><div class="xpick" role="group" aria-label="Chọn giải đấu hôm nay">${T.slice().sort((a,b)=>a.at-b.at).map(x=>`<button data-act="xprep" data-id="${x.id}" aria-pressed="${X&&X.id===x.id}"><b>${hm(x.at)}</b>${esc(xName(x))}</button>`).join("")}</div>`;
  h+=hqNguoi(D);
  if(live)return h+`<div class="hqcta two">${gmDot()}<button class="ball" data-act="gmst" data-v="2">Về Đang đánh ›</button></div>`;
  if(G)return h+`<div class="gmgbar">${gmDot()}${gStartBar(D,D.c.giai||{pairs:[]})}</div>`;
  return h+`<div class="hqcta two">${gmDot()}<button class="ball go" data-act="start">▶ Bắt đầu đánh · ${n} người</button></div>${n<4?`<small class="rule gmwarn">Cần ít nhất 4 người có mặt.</small>`:""}`;
}
// Chặng 3 · Đang đánh: sân, tiếp theo, kết quả (dùng lại màn đang đánh, bỏ thanh 2 tab cũ)
function gmS2(D,X,cur){
  if(!cur||!(gmLive(D)||D.SM.length))return `<div class="gmempty"><b>Chưa bắt đầu đánh</b><span>Điểm danh xong ở chặng Ngày đánh rồi bấm Bắt đầu đánh.</span></div><div class="hqcta"><button class="ball wide" data-act="gmst" data-v="1">‹ Về Ngày đánh</button></div>`;
  if(mxDrOn())return gmPlayV(D,X);
  const sv=stepView;stepView=null;let body;
  try{body=(isG(D.c)?vGiaiSan:vSan)(D)}finally{stepView=sv}
  body=body.replace(/<nav class="bsteps b2"[\s\S]*?<\/nav>/,"");
  return body+`<div class="hqcta two">${gmDot()}<button class="ball nv" data-act="gmst" data-v="3">🏁 Hết giờ · sang chốt</button></div>`;
}
// Chặng 4 · Chốt
function gmS3(D,X,cur){
  if(X&&X.st==="done")return `<div class="gmempty"><b>Giải đã chốt</b><span>Kết quả, tiền đã ghi vào sổ quỹ.</span></div>${X.num?`<a class="ball wide btnlike" href="${pathOf("buoi",{sid:X.num})}" data-go="buoi" data-id="${X.num}">Xem kết quả giải ›</a>`:""}`;
  if(!cur||!(gmLive(D)||D.SM.length))return `<div class="gmempty"><b>Mở khi giải đã bắt đầu</b><span>Trao giải, thu nốt tiền, chi thật, tổng kết và ghi sổ quỹ ở đây.</span></div>`;
  return mxDrOn()?gmChotV(D,X):chotBody(D);
}
// Bảng trượt: đổi giải · thêm việc
function gmSheets(D,X,st,cur){
  if(gmSw){const U=schedUp(),cx=xCur(),L=[...(!cx&&(gmLive(D)||D.SM.length)?[null]:[]),...U];
    return `<div class="mxdim" data-act="gmswx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Đổi giải"><span class="grab"></span><b class="mxh">Đổi sang giải khác</b>
      ${L.map(x=>`<a class="gmli" ${gmLink(x)}><span class="t"><b>${esc(x?xName(x):"Giải đánh nhanh")}</b><small>${esc(x?[x.at&&`${dowVN(x.at)} ${dmy(x.at).slice(0,5)}`,x.at&&hm(x.at)].filter(Boolean).join(" · "):"đang ở sân")}</small></span>${gmTag(x)}${(x?x.id:"_q")===(X?X.id:"_q")?`<b class="ck">✓</b>`:""}</a>`).join("")||`<p class="rule">Chưa có giải nào khác.</p>`}
      ${MINI?"":`<a class="btn-line" href="${pathOf("app",{tab:"dk",x:null})}" data-go="app" data-t="dk">Xem tất cả giải</a>`}<button class="ball" data-act="xnew">＋ Tạo giải mới</button></div>`}
  if(!gmMore)return "";
  const live=gmLive(D)||D.SM.length,ck=ckSched(),R=[];
  const others=[...(!xCur()&&live&&X?[null]:[]),...schedUp()].filter(x=>(x?x.id:"_q")!==(X?X.id:"_q"));
  const LO=["🔊","Loa · câu đọc","Tự đọc, sửa câu đọc của giải này","lpg",""],ED=["✎","Sửa giải",st===1?"Giờ, sân, luật, tiền":"Giờ, sân, luật, tiền, giải thưởng","gmedit",""],SW=["⇄","Đổi sang giải khác",others.length?others.slice(0,2).map(x=>x?xName(x):"Giải đánh nhanh").join(" · "):"Chưa có giải khác","gmsw",""];
  if(st<=1){
    if(MINI&&st===0)R.push(ED,SW,LO);
    if(MINI){if(cur&&ck&&st===1)R.push(["⌗","Mã QR check-in","Người tới quét bằng Zalo, tự điểm danh","ckopen",ck.id]);if(X&&st===1)R.push(["✋","BTC check-in giùm","Tích chọn người đã tới sân","ckbtc",X.id])}
    else if(cur&&ck){R.push(["⌗","Bàn đón · check-in","Danh sách ai đã tới, duyệt người quét mã","ckall",""],["▣","Mã QR check-in","Mở mã toàn màn hình cho người tới quét","ckopen",ck.id],["＋","Người đến muộn","Thêm người chưa đăng ký vào giải","hnlate",ck.id])}
    R.push(["🎯","Trọng tài","QR nhận sân","dhqr",""],["📣","Đọc thể thức qua loa","Loa đọc luật, cách tính điểm","speakrules",""]);
    if(!MINI&&cur&&X&&!live)R.push(["↺","Chọn giải khác để đánh","Bỏ chọn giải này ở sân","hnunpick",""]);
    if(MINI&&st===1)R.push(ED,SW,LO);
  }else if(MINI){
    R.push(["⚙","Xếp trận tiếp",autoNext()?"Đang: Tự động · bấm để chuyển BTC bấm":"Đang: BTC bấm · bấm để chuyển Tự động","scauto",""]);
    R.push(ED,SW,LO,["🎯","Trọng tài","QR từng sân","dhqr",""],["📣","Thông báo loa","Gõ câu, máy loa đọc","dhan",""],["⏸","Nghỉ giữa giờ","Tạm dừng đưa trận mới","dhps",""],["↗","Chia sẻ trực tiếp","Gửi link xem điểm","lshare",""]);
  }else{
    R.push(["🎯","Trọng tài","QR từng sân, ai đang nhập điểm","dhqr",""],["📣","Thông báo loa","Gõ câu, máy loa đọc ngay","dhan",""],["⏸","Nghỉ giữa giờ","Tạm dừng đưa trận mới vào sân","dhps",""],["↗","Chia sẻ trực tiếp","Gửi link xem điểm vào nhóm","lshare",""]);
    if(ck)R.push(["⌗","Bàn đón","Người đến muộn, check-in","ckall",""]);
  }
  const nm=X?xName(X):(D.c.sname||"Giải đánh nhanh");
  return `<div class="mxdim" data-act="gmmorex"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Thêm việc"><span class="grab"></span><b class="mxh">${MINI?esc(nm):`Thêm việc · ${GM_ST[st].toLowerCase()}`}</b>
    ${R.map(([i,t,s,a,id])=>`<button class="gmli" data-act="gmdo" data-a="${a}" data-id="${esc(id)}"><i>${i}</i><span class="t"><b>${t}</b><small>${esc(s)}</small></span><span aria-hidden="true">›</span></button>`).join("")}
    ${MINI?"":`<button class="btn-line" data-act="gmmorex">Đóng</button>`}</div>`;
}
// ✎ Sửa giải: mọi tuỳ chỉnh gom một chỗ
const GM_ED=[["info","🗓","Thông tin, đăng ký","Tên, ngày giờ, địa điểm, số chỗ, hạn đăng ký, ai được đăng ký, ảnh bìa"],["nguoi","👥","Người chơi","Điểm danh, bàn đón, VĐV ngoài CLB, nội dung đôi, ghép cặp, chia bảng"],["tien","💰","Tiền, giải thưởng","Lệ phí, chia tiền sân, thu trước, giải thưởng"],["luat","🏓","Sân, luật","Số sân, tên sân, chạm mấy điểm, thể thức"],["tt","🎯","Trọng tài, loa","Giao sân, QR trọng tài, giọng đọc, máy phát loa"],["khac","📋","Khác","Lưu làm mẫu, nhân bản, gửi thông báo, huỷ hoặc xoá giải"]];
function gmEditView(D,X,cur){
  const hd=(t,a)=>gmHd(t,a);
  if(gmSec&&cur){const f={nguoi:hqNguoi,tien:hqTien,luat:hqLuat,tt:hqTT}[gmSec];if(f)return hd(`Sửa giải · ${GM_ED.find(x=>x[0]===gmSec)[2]}`,"gmsecx")+f(D)}
  return hd("Sửa giải","gmeditx")+`<small class="rule">Sửa lúc nào cũng được, kể cả khi đang đánh.</small>
    <div class="gmlist">${GM_ED.filter(([k])=>X||k!=="khac").map(([k,i,t,s])=>`<button class="gmli" data-act="gmsec" data-v="${k}"><i>${i}</i><span class="t"><b>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`).join("")}</div>`;
}
async function gmAct(act,b){
  const id=b.dataset.id,v=b.dataset.v,D=derive(),X=routeX?schedById(routeX):(route==="app"&&tab==="san"?xCur():null),key=X?X.id:"_q";
  const top=()=>{try{scrollTo({top:0})}catch(e){}};
  if(act==="gmst"){g4V=null;g4Back=null;gmSt[key]=Math.max(0,Math.min(3,+v||0));gmMore=false;render();top();return true}
  if(act==="gmmore"){gmMore=true;render();return true}
  if(act==="gmmorex"){gmMore=false;render();return true}
  if(act==="gmsw"){gmSw=true;render();return true}
  if(act==="gmswx"){gmSw=false;render();return true}
  if(act==="gmedit"){gmEdit=true;gmSec=null;render();top();return true}
  if(act==="gmeditx"){gmEdit=false;gmSec=null;gsOpt=null;if(MINI){xEdit=null;xClearDraft()}render();top();return true}
  if(act==="gmsecx"){gmSec=null;gsOpt=null;if(MINI){xEdit=null;xClearDraft()}render();top();return true}
  if(act==="gmsec"&&mxDrOn()&&X){gmSec=v;gsOpt=null;xClearDraft();xEdit=v==="tt"||(gmCur(X)&&v!=="info")?null:X.id;render();top();return true}
  if(act==="gmsec"){
    if(v==="khac"){gmEdit=false;xbMenu=true;gmSt[key]=0;render();return true}
    if(X&&(v==="info"||!gmCur(X))){gmEdit=false;await xAct("xedit",{dataset:{}},X.id,D);if(v!=="info")xStep=v==="tien"?3:2;render();return true}
    if(!X&&v==="info"){gmSec="luat";render();top();return true}
    gmSec=v;render();top();return true}
  if(act==="gmdo"){gmMore=false;const a=b.dataset.a;await onAct({target:{closest:s=>s==="[data-act]"?{dataset:{act:a,...(id?{id}:{})},closest:()=>null}:null}});render();return true}
  if(act==="gmmadex"){gmMade=null;render();return true}
  if(act==="gmquick"){hnQuick=true;go("app",{tab:"san"});return true}
  return false;
}
// Tạo 3 câu: các nút
async function xqAct(act,b){
  const v=b.dataset.v,D=derive();
  if(act==="xqfmt"){xQ=true;xNew=["giai","bang"].includes(v)?v:"xoay";xClearDraft();xQs=2;if(route!=="app"||tab!=="dk"||routeX)go("app",{tab:"dk"});else render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xqsame"){xQ=true;xNew=["giai","bang"].includes(v)?v:"xoay";xClearDraft();xQs=2;
    // ngày: cùng thứ của tuần tới gần nhất, giờ như lần trước
    const L=schedAll().filter(x=>x.st!=="cancel").pop();if(L&&L.at){const d=new Date(L.at),t=new Date();t.setHours(d.getHours(),d.getMinutes(),0,0);let k=0;while((t.getDay()!==d.getDay()||t.getTime()<Date.now())&&k<8){t.setDate(t.getDate()+1);k++}drafts["xf-date"]=isoDay(t.getTime());drafts["xf-time"]=hm(t.getTime())}
    render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xqsel"){xQ=true;xNew=["giai","bang"].includes(v)?v:"xoay";xClearDraft();render();return true}
  if(act==="xqgo"&&+v===2&&xNew==="pick"){const L=schedAll().filter(x=>x.st!=="cancel").pop();xNew=L?(L.fmt==="giai"?(L.ko?"bang":"giai"):"xoay"):"xoay";xQ=true;xClearDraft()}
  if(act==="xqgo"){if(+v===3){const d=xv(D,"date"),t=xv(D,"time");if(!/^\d{4}-\d{2}-\d{2}$/.test(String(d))){errs.xf="Chọn ngày đánh.";render();return true}if(!/^\d{1,2}:\d{2}$/.test(String(t))){errs.xf="Chọn giờ bắt đầu.";render();return true}}
    delete errs.xf;xQs=Math.max(1,Math.min(3,+v||1));render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="xqfee"){if(v==="0"){drafts["xf-cp"]="0"}else{drafts["xf-cp"]="1";if(v!=="khac"){if(String(xv(D,"thu"))==="phi"||xNew!=="xoay"){drafts["xf-thu"]="phi"}drafts["xf-phi"]=v;drafts["xf-fee"]=v}else{drafts["xf-phi"]="";drafts["xf-fee"]="";if(xNew!=="xoay")drafts["xf-thu"]="phi"}}render();return true}
  if(act==="xqfull"){xQ=false;xStep=3;render();try{scrollTo({top:0})}catch(e){}return true}
  return false;
}
