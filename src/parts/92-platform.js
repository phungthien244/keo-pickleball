/* ---------- nền tảng: tạo CLB, duyệt, quản trị ---------- */
const PA_EMAIL=window.PA_OVERRIDE||"phungthien244@gmail.com";
const isPA=()=>isGoogle(authUser)&&authUser.email===PA_EMAIL;
const RESERVED=["aep","admin","www","quantri","tao","start","api","app","pikeco","clb","login","help","tao-clb","dang-nhap","quan-tri","cai-dat","assets","moi","buoi"];
const ST_LB={pending:"Chờ duyệt",active:"Đang hoạt động",locked:"Đã khoá",rejected:"Từ chối"};
const clubSt=c=>(c&&c.status)||"active";
const slugOf=t=>noAcc(t).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,20);
let clubsLoading=false,codesLoading=false;
function loadClubs(force){
  if(!window.FB||clubsLoading||(S.clubs&&!force))return;clubsLoading=true;
  FB.getDocs(FB.collection(FB.fs,"clubs")).then(async q=>{let L=q.docs.map(d=>({id:d.id,...d.data()}));if(isPA())L=await Promise.all(L.map(c=>FB.getDoc(FB.doc(FB.fs,"clubs/"+c.id+"/private/info")).then(s=>s.exists()?{...c,...s.data()}:c).catch(()=>c)));S.clubs=L;clubsLoading=false;render()}).catch(()=>{S.clubs=[];clubsLoading=false;render()});
}
function loadCodes(force){
  if(!window.FB||codesLoading||(S.codes&&!force)||!isPA())return;codesLoading=true;
  Promise.all([FB.getDocs(FB.collection(FB.fs,"codes")),FB.getDoc(FB.doc(FB.fs,"platform/config"))]).then(([q,p])=>{S.codes=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at||0)-(a.at||0));S.pcfg=p.exists()?p.data():{};codesLoading=false;render()}).catch(()=>{S.codes=[];S.pcfg={};codesLoading=false;render()});
}
function loadMyClub(){
  const u=authUser;S.myClub=undefined;if(!isGoogle(u)||!window.FB)return;
  FB.getDoc(FB.doc(FB.fs,"users/"+u.uid)).then(async s=>{S.myClub=s.exists()?s.data().club:null;
    if(S.myClub===null&&!legacy&&ROLE==="owner"&&CLUB&&CLUB.owner===u.uid){try{await FB.setDoc(FB.doc(FB.fs,"users/"+u.uid),{club:CID,at:Date.now()});S.myClub=CID}catch(e){}}
    render()}).catch(()=>{S.myClub=null;render()});
}
const gBtn=`<button class="gbtn" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập Google</button>`;
const clubUrl=id=>absUrl("/"+id);
const clubCard=c=>MINI?`<button class="ccard" data-act="miniclub" data-id="${esc(c.id)}"><span class="i">${logoHtml(c,c.name||c.id)}</span><span class="b"><b>${esc(c.name||c.id)}</b><span>${esc(c.city||"Pickleball")}${c.size?" · "+esc(c.size)+" người":""}</span></span><span class="c" aria-hidden="true">›</span></button>`:`<a class="ccard" href="/${esc(c.id)}"><span class="i">${logoHtml(c,c.name||c.id)}</span><span class="b"><b>${esc(c.name||c.id)}</b><span>pikeco.app/${esc(c.id)}${c.city?" · "+esc(c.city):""}</span></span><span class="c" aria-hidden="true">›</span></a>`;
const publicClubs=()=>(S.clubs||[]).filter(c=>c.public!==false&&clubSt(c)==="active").sort((a,b)=>String(a.name).localeCompare(String(b.name),"vi"));
const lab=(t,more="")=>`<div class="lab"><span class="eyebrow">${t}</span>${more}</div>`;
const pfoot=()=>`<footer class="pfoot2"><b>PIKECO.APP</b><span>Quản lý CLB pickleball · miễn phí cho CLB${isPA()?` · <a href="/quan-tri" data-go="qt">Quản trị nền tảng</a>`:""}</span></footer>`;
function vStart(){
  loadClubs();
  const list=publicClubs();
  const F=[["Xoay cặp theo trình","Tự ghép đôi cân trình, ai chờ lâu đánh trước, có nghỉ giữa trận."],["Cặp cố định xoay vòng","Vòng tròn đến 10 cặp, lịch tự xếp, bảng xếp hạng và đối đầu."],["Rating kiểu DUPR","So điểm thực tế với dự kiến, chốt rating sau mỗi buổi."],["Quỹ và giải thưởng","Kèo, chia đều hoặc lệ phí; trích quỹ trao giải; chuyển khoản QR."]];
  let h=`<div class="hero"><span class="eyebrow y">Miễn phí cho CLB</span><h1>Quản lý CLB<br>pickleball<br><span style="color:var(--yellow)">trực tiếp</span></h1>
    <p class="lead">Xếp sân, nhập tỉ số ngay tại sân, rating sau mỗi buổi, quỹ và giải thưởng. Một đường link cho cả CLB.</p>
    <div class="ctas"><a class="cta y" href="/tao-clb" data-go="tao">Tạo CLB của bạn</a><a class="cta o" href="/clb" data-go="clb">Tìm CLB của bạn</a></div></div>`;
  h+=lab("Các CLB đang dùng");
  h+=!S.clubs?`<p class="rule">Đang tải…</p>`:list.length?`<div class="clist">${list.slice(0,6).map(clubCard).join("")}</div>${list.length>6?`<a class="btn-line" href="/clb" data-go="clb">Xem tất cả ${list.length} CLB</a>`:""}`:`<p class="rule">Chưa có CLB công khai nào. Hãy là CLB đầu tiên.</p>`;
  h+=lab("Có gì trong app")+`<div class="feat2">${F.map(([t,d],i)=>`<div><span class="no">${String(i+1).padStart(2,"0")}</span><span><b>${t}</b><span>${d}</span></span></div>`).join("")}</div>
  <div class="steps3"><b>3 BƯỚC ĐỂ BẮT ĐẦU</b><ol><li>Đăng nhập Google, đặt tên và đường dẫn CLB.</li><li>Khai ngân hàng, đặt PIN trọng tài, thêm thành viên.</li><li>Gửi link pikeco.app/tên-clb vào nhóm Zalo.</li></ol><a class="cta b" href="/tao-clb" data-go="tao">Tạo CLB ngay</a></div>`;
  return h+pfoot();
}
function vClb(){
  loadClubs();
  const q=noAcc(String(val("cq",""))).toLowerCase().trim(),all=publicClubs(),list=all.filter(c=>!q||noAcc(`${c.name} ${c.city||""} ${c.id}`).toLowerCase().includes(q));
  const mine=MINI?myClubs():[];
  let h=`<div class="dhead"><span class="eyebrow y">${MINI?"Khám phá":"pikeco.app"}</span><h1>${MINI?"Tìm CLB pickleball":"Các CLB"}</h1>${MINI?"":`<p class="rule">Thành viên đăng ký buổi chơi trong Zalo Mini App Pikeco. Mở CLB rồi bấm Đăng ký.</p>`}</div>
  ${mine.length?lab("CLB của bạn")+`<div class="clist">${mine.map(c=>clubCard({...(S.clubs||[]).find(x=>x.id===c.id)||{},id:c.id,name:c.name})).join("")}</div>`+lab("Tất cả CLB"):""}
  <label class="srch"><span class="sr">Tìm CLB</span><input id="cq" data-draft="cq" type="search" placeholder="Tên CLB hoặc tỉnh thành" value="${esc(val("cq",""))}"></label>`;
  h+=!S.clubs?`<p class="rule">Đang tải…</p>`:list.length?`<div class="clist">${list.map(clubCard).join("")}</div>`:`<p class="rule">${all.length?"Không có CLB nào khớp.":"Chưa có CLB công khai nào."}</p>`;
  if(MINI)return h+`<button class="btn-line" data-act="openweb" data-v="/tao-clb">Bạn quản lý CLB? Tạo CLB miễn phí</button>`;
  return h+`<a class="btn-line" href="/tao-clb" data-go="tao">CLB của bạn chưa có ở đây? Tạo CLB</a>`+pfoot();
}
function vLogin(){
  const u=authUser;
  let h=`<div class="hero login"><span class="eyebrow y">Ban tổ chức</span><h1>Vào CLB<br>của bạn</h1>`;
  if(!isGoogle(u))return h+`<p class="lead">Chủ CLB và quản lý đăng nhập bằng Google. Đăng nhập xong, app mở thẳng CLB của bạn.</p>
    <button class="gwide" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập bằng Google</button>
    <div class="tip"><b>Trọng tài?</b><span>Không cần tài khoản. Mở link CLB, vào tab Sân, nhập PIN chủ CLB đưa.</span></div>
    <div class="tip"><b>Mở từ Zalo?</b><span>Zalo chặn đăng nhập Google. Bấm ⋯ ở góc trên, chọn Mở bằng trình duyệt.</span></div>
    <div class="hfoot"><span>Chưa có CLB trên pikeco.app?</span><a class="cta y" href="/tao-clb" data-go="tao">Tạo CLB miễn phí</a></div></div>`;
  if(S.myClub===undefined){loadMyClub();return h+`<p class="lead">Đang tìm CLB của bạn…</p></div>`}
  if(S.myClub){if(!S.loginJump){S.loginJump=true;setTimeout(()=>{location.href="/"+S.myClub},300)}
    return h+`<p class="lead">Đang mở CLB của bạn…</p><a class="cta b" href="/${esc(S.myClub)}">Mở pikeco.app/${esc(S.myClub)}</a></div>`}
  return h+`<p class="lead">${esc(u.email||"")} chưa làm chủ CLB nào. Nếu bạn là quản lý hoặc trọng tài, hãy mở link mời chủ CLB gửi.</p>
    <a class="cta y" href="/tao-clb" data-go="tao">Tạo CLB</a><button class="cta o" data-act="logout">Đổi tài khoản</button>${isPA()?`<a class="cta o" href="/quan-tri" data-go="qt">Quản trị nền tảng</a>`:""}</div>`;
}
function renderPlatform(){
  if(MINI){if(!splashGone)hideSplash();document.title="pikeco.app";const ae=document.activeElement,aid=ae&&ae.id;$("#view").innerHTML=`<section class="mx">${mxExplore()}</section>`;if(aid){const el=document.getElementById(aid);if(el)el.focus()}return}
  const u=authUser,t=$(".tkwrap"),tb=$("#tabs"),lg=$("#clogo");if(t)t.hidden=true;if(tb)tb.hidden=true;if(lg)lg.hidden=true;
  $("#title").innerHTML=`pikeco<span class="dotapp">.app</span>`;$("#curl").textContent="";
  $("#hact").innerHTML=MINI?"":isGoogle(u)?`${S.myClub?`<a href="/${esc(S.myClub)}">CLB của tôi</a>`:""}<button data-act="logout">Thoát</button>`:`<a href="/dang-nhap" data-go="login">Đăng nhập</a>`;
  $("#sub").innerHTML="";
  if(!splashGone)hideSplash();
  document.title={start:"pikeco.app · Quản lý CLB pickleball",clb:"Các CLB · pikeco.app",tao:"Tạo CLB · pikeco.app",login:"Đăng nhập · pikeco.app",qt:"Quản trị · pikeco.app"}[route]||"pikeco.app";
  const v={start:vStart,clb:vClb,tao:vTao,login:vLogin,qt:vQt}[route]||vStart;
  const ae=document.activeElement,aid=ae&&ae.id,sel=aid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  const akey="p|"+route,doAnim=akey!==lastAnim;lastAnim=akey;
  $("#view").innerHTML=`<section class="${doAnim?"anim":""}">${v()}</section>`;
  if(aid){const el=document.getElementById(aid);if(el){el.focus();if(sel&&el.setSelectionRange)try{el.setSelectionRange(...sel)}catch(e){}}}
}
function vTao(){
  let h=`<div class="dhead"><span class="eyebrow y">pikeco.app</span><h1>Tạo CLB</h1></div>`;
  const u=authUser;
  if(!isGoogle(u))return h+`<div class="panel clubp"><p class="rule">Đăng nhập bằng tài khoản Google của người làm chủ CLB. Tài khoản này sẽ là Chủ CLB, mời thêm quản lý sau.</p><div class="bar" style="margin-top:10px">${gBtn}</div>${inApp()?`<p class="rule" style="margin-top:8px">Trình duyệt trong Zalo/Facebook không cho đăng nhập Google. Bấm nút ⋯ ở góc trên rồi chọn Mở bằng trình duyệt.</p>`:""}</div>`;
  if(S.myClub===undefined){loadMyClub();return h+`<p class="rule">Đang kiểm tra tài khoản…</p>`}
  if(S.myClub)return h+`<div class="panel clubp"><h2>Tài khoản này đã có CLB</h2><p class="rule">${esc(u.email||"")} đang là chủ CLB <b>${esc(S.myClub)}</b>. Mỗi tài khoản Google tạo được một CLB.</p><div class="bar" style="margin-top:10px"><a class="back" href="/${esc(S.myClub)}" style="background:var(--blue);color:#fff;padding:0 16px;min-height:44px">Mở CLB của bạn ›</a><button class="ghost" data-act="logout">Đổi tài khoản</button></div></div>`;
  const name=val("nc-name",""),sug=slugOf(name),slug=val("nc-slug","")||sug;
  const inp=(k,l,v,extra="")=>`<label><span class="lbl">${l}</span><input id="${k}" data-draft="${k}" value="${esc(v)}" ${extra}></label>`;
  h+=`<div class="panel clubp"><p class="rule">Đang đăng nhập ${esc(u.email||"")} · tài khoản này sẽ là Chủ CLB.</p>
    <div class="form" style="margin-top:8px">${inp("nc-name","Tên CLB",name,'placeholder="Ví dụ: CLB Pickleball Quận 7" maxlength="60"')}
      <label><span class="lbl">Đường dẫn</span><input id="nc-slug" data-draft="nc-slug" value="${esc(slug)}" placeholder="vd: q7-pickleball" maxlength="20" autocapitalize="off"><span class="meta">pikeco.app/${esc(slug||"…")}</span></label>
      ${inp("nc-city","Tỉnh / thành",val("nc-city",""),'maxlength="40"')}
      <label><span class="lbl">Số thành viên</span><select id="nc-size" data-draft="nc-size">${["Dưới 20","20–50","50–100","Trên 100"].map(x=>`<option ${val("nc-size","20–50")===x?"selected":""}>${x}</option>`).join("")}</select></label>
      ${inp("nc-contact","Số Zalo liên hệ",val("nc-contact",""),'inputmode="tel" maxlength="15"')}
      ${inp("nc-code","Mã mời (nếu có)",val("nc-code",""),'maxlength="12" autocapitalize="characters"')}</div>
    ${errs.tao?`<p class="err" style="margin-top:8px">${esc(errs.tao)}</p>`:""}
    <div class="bar" style="margin-top:12px"><button class="ball" data-act="nc-create">${S.creating?"Đang tạo…":"Tạo CLB"}</button></div>
    <p class="rule" style="margin-top:8px">Không có mã mời: CLB ở trạng thái Chờ duyệt cho tới khi quản trị pikeco.app duyệt. Trong lúc chờ, bạn khai ngân hàng, đặt PIN trọng tài và mời quản lý được.</p></div>`;
  return h;
}
async function createClub(){
  const u=authUser;if(!isGoogle(u)||S.creating)return;
  const name=String(val("nc-name","")).trim(),slug=String(val("nc-slug","")||slugOf(name)).trim().toLowerCase(),city=String(val("nc-city","")).trim(),size=val("nc-size","20–50"),contact=String(val("nc-contact","")).replace(/\s/g,""),code=String(val("nc-code","")).trim().toUpperCase();
  const bad=m=>{errs.tao=m;render()};
  if(name.length<3)return bad("Tên CLB cần ít nhất 3 ký tự.");
  if(!/^[a-z0-9-]{3,20}$/.test(slug)||/^-|-$/.test(slug))return bad("Đường dẫn 3–20 ký tự, chỉ gồm chữ thường không dấu, số và gạch ngang.");
  if(RESERVED.includes(slug))return bad("Đường dẫn này đã được giữ, chọn tên khác.");
  if(!/^0\d{8,10}$/.test(contact))return bad("Nhập số Zalo liên hệ, ví dụ 0901234567.");
  delete errs.tao;S.creating=true;render();
  try{
    if((await FB.getDoc(FB.doc(FB.fs,"clubs/"+slug))).exists()){S.creating=false;return bad("Đường dẫn đã có CLB dùng, chọn tên khác.")}
    if(code){const cs=await FB.getDoc(FB.doc(FB.fs,"codes/"+code));if(!cs.exists()||cs.data().used){S.creating=false;return bad("Mã mời không đúng hoặc đã được dùng.")}}
    const now=Date.now(),b=FB.writeBatch(FB.fs),club={name,public:true,owner:u.uid,status:code?"active":"pending",city,size,createdAt:now};
    if(code)club.code=code;
    b.set(FB.doc(FB.fs,"clubs/"+slug),club);
    b.set(FB.doc(FB.fs,"clubs/"+slug+"/private/info"),{contact,ownerEmail:u.email||""});
    b.set(FB.doc(FB.fs,"clubs/"+slug+"/members/"+u.uid),{role:"owner",name:u.displayName||"",email:u.email||"",at:now});
    b.set(FB.doc(FB.fs,"users/"+u.uid),{club:slug,at:now});
    if(code)b.update(FB.doc(FB.fs,"codes/"+code),{used:true,club:slug,by:u.uid,at:now});
    await b.commit();
    await notifyEmail({club_name:name,club_link:clubUrl(slug),club_slug:slug,owner_email:u.email||"",city,size,contact,status:ST_LB[club.status],admin_link:absUrl("/quan-tri")});
    ["nc-name","nc-slug","nc-city","nc-size","nc-contact","nc-code"].forEach(k=>delete drafts[k]);
    location.href=`/${slug}/cai-dat`;
  }catch(x){S.creating=false;bad("Chưa tạo được CLB ("+((x&&x.code)||"lỗi")+"). Thử lại sau ít phút.")}
}
async function notifyEmail(p){
  try{const s=await FB.getDoc(FB.doc(FB.fs,"platform/config"));const e=s.exists()&&s.data().emailjs;if(!e||!e.service||!e.template||!e.key)return;
    await fetch("https://api.emailjs.com/api/v1.0/email/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service_id:e.service,template_id:e.template,user_id:e.key,template_params:p})})}catch(x){}
}
function vQt(){
  let h=`<div class="dhead"><span class="eyebrow y">pikeco.app</span><h1>Quản trị</h1></div>`;
  if(!isPA())return h+`<div class="panel clubp"><p class="rule">Trang này chỉ dành cho quản trị nền tảng.</p>${isGoogle(authUser)?`<p class="rule">Đang đăng nhập ${esc(authUser.email||"")}.</p>`:`<div class="bar" style="margin-top:10px">${gBtn}</div>`}</div>`;
  loadClubs();loadCodes();
  const all=S.clubs||[],by=st=>all.filter(c=>clubSt(c)===st).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  const row=(c,btns)=>`<div class="qrow"><span class="mname"><b>${esc(c.name||c.id)}</b> <span class="pill ${clubSt(c)==="active"?"win":clubSt(c)==="pending"?"keo":"lose"}">${ST_LB[clubSt(c)]}</span><span class="meta" style="display:block"><a href="/${esc(c.id)}">pikeco.app/${esc(c.id)}</a>${c.ownerEmail?" · "+esc(c.ownerEmail):""}${c.city?" · "+esc(c.city):""}${c.size?" · "+esc(c.size)+" người":""}${c.contact?" · Zalo "+esc(c.contact):""}${c.createdAt?" · tạo "+dmy(c.createdAt):""}${c.code?" · mã "+esc(c.code):""}</span>${c.statusNote?`<span class="meta" style="display:block">Ghi chú: ${esc(c.statusNote)}</span>`:""}</span><span class="bt">${btns}</span></div>`;
  const pend=by("pending");
  h+=`<div class="panel clubp"><h2>Chờ duyệt (${pend.length})</h2>${!S.clubs?`<p class="rule">Đang tải…</p>`:pend.length?pend.map(c=>row(c,`<button class="primary" data-act="qa-ok" data-id="${esc(c.id)}">Duyệt</button>${armed("qa-no:"+c.id)?`<button class="danger" data-act="qa-no" data-id="${esc(c.id)}">Bấm lần nữa</button>`:`<button class="ghost danger" data-act="qa-no" data-id="${esc(c.id)}">Từ chối</button>`}`)).join(""):`<p class="rule">Không có CLB nào chờ duyệt.</p>`}
    ${pend.length?`<label class="form" style="margin-top:8px"><span class="lbl">Lý do từ chối (gửi kèm, không bắt buộc)</span><input id="qa-note" data-draft="qa-note" value="${esc(val("qa-note",""))}" maxlength="120"></label>`:""}</div>`;
  h+=`<div class="panel clubp"><h2>Đang hoạt động (${by("active").length})</h2>${by("active").map(c=>row(c,c.id==="aep"?"":armed("qa-lock:"+c.id)?`<button class="danger" data-act="qa-lock" data-id="${esc(c.id)}">Bấm lần nữa</button>`:`<button class="ghost danger" data-act="qa-lock" data-id="${esc(c.id)}">Khoá</button>`)).join("")||`<p class="rule">Chưa có.</p>`}</div>`;
  const off=[...by("locked"),...by("rejected")];
  if(off.length)h+=`<div class="panel clubp"><h2>Đã khoá / từ chối (${off.length})</h2>${off.map(c=>row(c,`<button class="ghost" data-act="qa-ok" data-id="${esc(c.id)}">${clubSt(c)==="locked"?"Mở khoá":"Duyệt lại"}</button>`)).join("")}</div>`;
  const codes=S.codes||[];
  h+=`<div class="panel clubp"><h2>Mã mời tạo CLB</h2><p class="rule">Người có mã mời tạo CLB xong là dùng được ngay, không cần chờ duyệt. Mỗi mã dùng một lần.</p>
    <div class="bar" style="margin-top:8px"><button data-act="qa-code">Tạo mã mới</button></div>
    ${codes.map(k=>`<div class="mrow2"><span class="mname"><b class="num">${esc(k.id)}</b><span class="meta" style="display:block">${k.used?`Đã dùng cho ${esc(k.club||"")}`:"Chưa dùng"}</span></span>${k.used?"":`<button data-act="cp" data-v="${esc(k.id)}">Copy</button>`}${k.used?"":`<button class="ghost danger" data-act="qa-codedel" data-id="${esc(k.id)}">Xoá</button>`}</div>`).join("")}</div>`;
  const e=(S.pcfg&&S.pcfg.emailjs)||{};
  h+=`<div class="panel clubp"><h2>Email báo CLB mới</h2><p class="rule">Dùng EmailJS (miễn phí 200 email/tháng). Có CLB mới, trình duyệt của người tạo gửi email cho bạn với tên CLB, chủ CLB, số Zalo và link duyệt.</p>
    <div class="form" style="margin-top:8px"><label><span class="lbl">Service ID</span><input id="ej-s" data-draft="ej-s" value="${esc(val("ej-s",e.service||""))}"></label><label><span class="lbl">Template ID</span><input id="ej-t" data-draft="ej-t" value="${esc(val("ej-t",e.template||""))}"></label><label><span class="lbl">Public key</span><input id="ej-k" data-draft="ej-k" value="${esc(val("ej-k",e.key||""))}"></label></div>
    <div class="bar" style="margin-top:8px"><span class="meta grow">${e.service&&e.template&&e.key?"Đã bật email":"Chưa bật email"}</span><button data-act="qa-mailtest">Gửi thử</button><button class="primary" data-act="qa-mail">Lưu</button></div></div>`;
  return h;
}
function vStatus(D){
  const st=clubSt(CLUB),own=isAdm();
  let h=`<div class="empty"><strong>${st==="pending"?"CLB đang chờ duyệt":st==="locked"?"CLB tạm khoá":"Yêu cầu tạo CLB chưa được duyệt"}</strong>${st==="pending"?`${esc(CLUB.name||CID)} đã được tạo và đang chờ quản trị pikeco.app duyệt, thường trong vòng một ngày. Trong lúc chờ, chủ CLB khai ngân hàng, đặt PIN trọng tài và mời quản lý ở bên dưới.`:st==="locked"?"CLB này đang tạm khoá. Liên hệ quản trị pikeco.app để biết thêm.":`${esc(CLUB.statusNote||"")} Bạn có thể tạo yêu cầu mới với tên khác.`}</div>`;
  if(st==="rejected"&&isGoogle(authUser)&&CLUB.owner===authUser.uid)h+=`<a class="back" href="/tao-clb" data-go="tao">Tạo yêu cầu mới ›</a>`;
  if(st==="pending")h+=own?clubAdmin(D):loginBar();
  return h;
}
async function platformAct(act,id,b){
  if(act==="nc-create"){await createClub();return true}
  if(!act.startsWith("qa-"))return false;
  if(!isPA())return true;
  const upd=(cid,patch,msg)=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+cid),patch).then(()=>{toast(msg);loadClubs(true)}).catch(x=>toast("Chưa lưu được ("+((x&&x.code)||"lỗi")+")"));
  if(act==="qa-ok"){await upd(id,{status:"active",reviewedAt:Date.now(),statusNote:""},"Đã duyệt CLB "+id)}
  else if(act==="qa-no"){if(!armOr("qa-no:"+id))return true;const c=(S.clubs||[]).find(z=>z.id===id);
    await upd(id,{status:"rejected",reviewedAt:Date.now(),statusNote:String(drafts["qa-note"]||"").trim()},"Đã từ chối "+id);
    if(c&&c.owner)try{await FB.deleteDoc(FB.doc(FB.fs,"users/"+c.owner))}catch(x){}delete drafts["qa-note"]}
  else if(act==="qa-lock"){if(!armOr("qa-lock:"+id))return true;await upd(id,{status:"locked",reviewedAt:Date.now()},"Đã khoá "+id)}
  else if(act==="qa-code"){const A="ABCDEFGHJKLMNPQRSTUVWXYZ23456789",r=crypto.getRandomValues(new Uint8Array(8)),k=Array.from(r,x=>A[x%A.length]).join("");
    try{await FB.setDoc(FB.doc(FB.fs,"codes/"+k),{used:false,at:Date.now()});toast("Đã tạo mã "+k);loadCodes(true)}catch(x){toast("Chưa tạo được mã")}}
  else if(act==="qa-codedel"){try{await FB.deleteDoc(FB.doc(FB.fs,"codes/"+id));loadCodes(true)}catch(x){toast("Chưa xoá được")}}
  else if(act==="qa-mail"){const e={service:String(val("ej-s",S.pcfg?.emailjs?.service||"")).trim(),template:String(val("ej-t",S.pcfg?.emailjs?.template||"")).trim(),key:String(val("ej-k",S.pcfg?.emailjs?.key||"")).trim()};
    try{await FB.setDoc(FB.doc(FB.fs,"platform/config"),{...(S.pcfg||{}),emailjs:e});["ej-s","ej-t","ej-k"].forEach(k=>delete drafts[k]);toast("Đã lưu cài đặt email");loadCodes(true)}catch(x){toast("Chưa lưu được")}}
  else if(act==="qa-mailtest"){await notifyEmail({club_name:"CLB thử nghiệm",club_link:clubUrl("thu"),club_slug:"thu",owner_email:authUser.email||"",city:"",size:"",contact:"",status:"Thử",admin_link:absUrl("/quan-tri")});toast("Đã gửi thử, kiểm tra hộp thư (cả mục Spam).")}
  return true;
}
