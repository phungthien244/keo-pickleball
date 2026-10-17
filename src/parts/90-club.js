/* ---------- CLB & tài khoản ---------- */
const BANKS=[["mb","970422","MB Bank"],["vcb","970436","Vietcombank"],["tcb","970407","Techcombank"],["bidv","970418","BIDV"],["icb","970415","VietinBank"],["acb","970416","ACB"],["tpb","970423","TPBank"],["vpb","970432","VPBank"],["vba","970405","Agribank"],["shb","970443","SHB"],["ocb","970448","OCB"],["msb","970426","MSB"],["stb","970403","Sacombank"],["hdb","970437","HDBank"],["vib","970441","VIB"],["cake","546034","Cake"]];
const ROLE_LB={owner:"Chủ CLB",admin:"Quản lý",scorer:"Trọng tài",pin:"Trọng tài (PIN)"};
const isAdm=()=>ROLE==="owner"||ROLE==="admin";
const isGoogle=u=>!!u&&!u.isAnonymous;
const inApp=()=>/Zalo|FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent||"");
let unsubAdm=[];
function watchAdmin(){
  unsubAdm.forEach(f=>{try{f()}catch(e){}});unsubAdm=[];
  if(legacy||!isAdm())return;
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"members"),{},q=>{S.members=q.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{}));
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"editors"),{},q=>{S.editors=q.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{}));
}
async function refreshRole(){
  ROLE=null;canWrite=false;const u=authUser;
  if(u){
    if(!legacy){try{const m=await FB.getDoc(FB.doc(FB.fs,PFX+"members/"+u.uid));if(m.exists())ROLE=m.data().role}catch(e){}}
    const ed=await isEditor(u.uid);if(!ROLE&&ed)ROLE="pin";canWrite=!!ROLE;
    if(legacy&&ed)S.rootEditor=true;
  }
  watchAdmin();
}
const inviteTok=()=>INVITE||new URLSearchParams(location.search).get("moi");
async function acceptInvite(){
  const tok=inviteTok();if(!tok||legacy||!isGoogle(authUser)||(ROLE&&ROLE!=="pin"))return;
  try{const s=await FB.getDoc(FB.doc(FB.fs,PFX+"invites/"+tok));if(!s.exists()){toast("Link mời không còn hiệu lực.");return}
    const iv=s.data();if(iv.exp<Date.now()){toast("Link mời đã hết hạn, nhờ quản lý tạo link mới.");return}
    await FB.setDoc(FB.doc(FB.fs,PFX+"members/"+authUser.uid),{role:iv.role,invite:tok,name:authUser.displayName||"",email:authUser.email||"",at:Date.now()});
    await refreshRole();toast(`Đã nhận quyền ${ROLE_LB[iv.role]} của ${CLUB?.name||"CLB"}.`);
    INVITE=null;route="home";try{history.replaceState(null,"",pathOf("home"))}catch(e){}
    render();
  }catch(e){toast("Không nhận được lời mời, thử lại.")}
}
function loginBar(){
  if(canWrite)return "";
  const u=authUser,tok=inviteTok();
  let h=`<div class="ro login"><span>${tok&&!legacy?"Bạn được mời vào ban tổ chức của CLB. Đăng nhập Google để nhận quyền.":isGoogle(u)?`Đã đăng nhập ${esc(u.email||u.displayName||"")} nhưng chưa có quyền ở CLB này. Nhờ chủ CLB gửi link mời, hoặc nhập PIN trọng tài.`:"Bạn đang xem trực tiếp. Ban tổ chức đăng nhập Google, trọng tài nhập PIN để nhập tỉ số."}</span>
    <span class="bar" style="gap:6px">${isGoogle(u)?`<button class="ghost" data-act="logout">Đổi tài khoản</button>`:`<button class="gbtn" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập Google</button>`}
    <input id="pin" data-draft="pin" type="password" autocomplete="off" placeholder="PIN trọng tài" value="${esc(val("pin",""))}" style="width:140px"><button class="primary" data-act="login">Vào bằng PIN</button></span>
    ${errs.pin?`<p class="err" style="width:100%">${esc(errs.pin)}</p>`:""}${inApp()?`<p class="rule" style="width:100%">Trình duyệt trong Zalo/Facebook không cho đăng nhập Google. Bấm nút ⋯ ở góc trên rồi chọn Mở bằng trình duyệt.</p>`:""}</div>`;
  return h;
}
function bankName(b){const x=BANKS.find(z=>z[0]===b.code);return x?x[2]:(b.name||b.code||"")}
function clubAdmin(D){
  if(!canWrite)return "";
  if(legacy){
    if(CID!=="aep")return "";
    if(!isGoogle(authUser))return `<div class="panel clubp"><h2>Tài khoản CLB</h2><p class="rule">Dữ liệu CLB đang ở chế độ cũ (PIN chung). Để chuyển sang tài khoản riêng, chủ CLB đăng nhập Google rồi nhập PIN một lần.</p><div class="bar" style="margin-top:10px"><button class="gbtn" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập Google</button></div></div>`;
    return `<div class="panel clubp"><h2>Chuyển sang tài khoản CLB</h2><p class="rule">Bạn đang đăng nhập ${esc(authUser.email||"")}. Bấm nút dưới để tạo không gian riêng cho CLB với bạn là chủ CLB, rồi chép toàn bộ thành viên, các trận, lịch sử và quỹ sang. Dữ liệu cũ vẫn được giữ nguyên làm bản sao lưu.</p>
      <p class="rule" style="margin-top:6px"><b>Nên làm khi không có buổi nào đang đánh.</b> Sau khi chuyển, mọi máy đang mở trang cần tải lại.</p>
      <div class="bar" style="margin-top:10px"><button class="ball" data-act="migrate">${armed("migrate:x")?"Bấm lần nữa để bắt đầu chuyển":"Chuyển dữ liệu sang tài khoản CLB"}</button></div>${S.migMsg?`<p class="rule" style="margin-top:8px">${esc(S.migMsg)}</p>`:""}</div>`;
  }
  if(!isAdm())return `<div class="panel clubp"><h2>Tài khoản</h2><p class="rule">Bạn đang có quyền ${esc(ROLE_LB[ROLE]||"")} ở ${esc(CLUB?.name||"CLB")}. Chỉ chủ CLB và quản lý mới đổi được cài đặt CLB.</p></div>`;
  const b=CLUB?.bank||{},mem=[...(S.members||[])].sort((a,b)=>(a.role==="owner"?-1:b.role==="owner"?1:0)||String(a.name).localeCompare(String(b.name),"vi"));
  const link=absUrl("/"+CID);
  let h=`<section class="card2"><h2>Thông tin CLB</h2><div class="cb">
      <div class="logoed"><span class="clogo big">${logoHtml(CLUB,CLUB?.name)}</span><span class="t"><label class="lnkbtn">${logoOk(CLUB)?"Đổi ảnh đại diện":"Thêm ảnh đại diện"}<input type="file" accept="image/*" data-clogo="1" class="sr"></label>${logoOk(CLUB)?`<button class="ghost danger" data-act="clogodel">Xoá ảnh</button>`:""}<small class="rule">Ảnh vuông, app tự thu nhỏ. Hiện trên đầu trang và danh sách CLB.</small></span></div>
      <label class="fld"><span class="lbl">Tên CLB · hiện trên đầu trang</span><input id="cl-name" data-draft="cl-name" maxlength="60" value="${esc(val("cl-name",CLUB?.name||""))}"></label>
      <button class="wide" data-act="cname">Lưu tên CLB</button>
      <div class="fld"><span class="lbl">Ai được xem</span><span class="seg segw"><button data-act="pub" data-v="1" aria-pressed="${CLUB?.public!==false}">Ai có link</button><button data-act="pub" data-v="0" aria-pressed="${CLUB?.public===false}">Chỉ ban tổ chức</button></span></div>
      <div class="linkrow"><span>${esc(link.replace(/^https?:\/\//,""))}</span><button class="primary" data-act="cp" data-v="${esc(link)}">Copy link</button></div></div></section>
    <section class="card2"><h2>Ngân hàng nhận tiền</h2><div class="cb">
      <label class="fld"><span class="lbl">Ngân hàng</span><select id="bk-code" data-draft="bk-code">${BANKS.map(([c,,n])=>`<option value="${c}" ${val("bk-code",b.code||"mb")===c?"selected":""}>${n}</option>`).join("")}</select></label>
      <label class="fld"><span class="lbl">Số tài khoản</span><input id="bk-acc" data-draft="bk-acc" inputmode="numeric" value="${esc(val("bk-acc",b.acc||""))}"></label>
      <label class="fld"><span class="lbl">Chủ tài khoản (không dấu)</span><input id="bk-holder" data-draft="bk-holder" value="${esc(val("bk-holder",b.holder||""))}"></label>
      <span class="meta">${b.acc?`Đang dùng: ${esc(bankName(b))} · ${esc(b.acc)} · ${esc(b.holder||"")}`:"Chưa khai ngân hàng: nút Chuyển tiền sẽ bị ẩn."}</span>
      <button class="wide" data-act="bsave">Lưu ngân hàng</button></div></section>
    <section class="card2"><h2>PIN trọng tài</h2><div class="cb">
      <p class="rule">Trọng tài mở ${esc(link.replace(/^https?:\/\//,""))}/dang-nhap, nhập PIN là nhập được tỉ số, không cần tài khoản. Đổi PIN không làm mất quyền của các máy đã vào.</p>
      <div class="pinst${CLUB?.pinAt?" ok":""}">${CLUB?.pinAt?`✓ Đã có PIN · đổi lần cuối ${dmy(CLUB.pinAt)}`:"Chưa đặt PIN: trọng tài chưa vào được bằng PIN."}</div>
      <div class="pinrow"><label><span class="sr">PIN mới</span><input id="newpin" data-draft="newpin" type="text" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="PIN mới, ít nhất 4 số" value="${esc(val("newpin",""))}"></label><button class="dark" data-act="pinset">Đặt PIN</button></div>
      ${errs.pinset?`<p class="err">${esc(errs.pinset)}</p>`:""}
      <div class="bar"><span class="meta grow">${(S.editors||[]).length} máy đang dùng PIN</span>${(S.editors||[]).length?`<button class="ghost danger" data-act="edclear">${armed("edclear:x")?"Bấm lần nữa":"Thu hồi tất cả"}</button>`:""}</div></div></section>
    <section class="card2"><h2>Ban tổ chức</h2>${mem.map(m=>`<div class="mrow3">${av({name:m.name||m.email||"?"},"sm")}<span class="t"><b>${esc(m.name||m.email||m.id)}</b><small>${esc(m.email||"")}</small></span><span class="rtag${m.role==="owner"?" o":""}">${ROLE_LB[m.role]||m.role}</span>${m.role!=="owner"&&m.id!==authUser?.uid?(armed("mrm:"+m.id)?`<button class="danger" data-act="mrm" data-id="${m.id}">Bấm lần nữa</button>`:`<button class="ghost danger" data-act="mrm" data-id="${m.id}">Gỡ</button>`):""}</div>`).join("")}
      <div class="cb"><div class="two"><button class="line" data-act="inv" data-v="admin">Mời quản lý</button><button class="line" data-act="inv" data-v="scorer">Mời trọng tài</button></div>
      ${S.invLink?`<div class="sharebox"><span class="lbl">Link mời ${esc(ROLE_LB[S.invLink.role])} · hết hạn sau 7 ngày</span><span class="url">${esc(S.invLink.url.replace(/^https?:\/\//,""))}</span><div class="bt"><button class="primary" data-act="invshare">Gửi qua Zalo</button><button data-act="cp" data-v="${esc(S.invLink.url)}">Copy link</button></div></div>`:""}
      <p class="rule">Người được mời mở link, đăng nhập Google là có quyền. Quản lý sửa được mọi thứ trừ gỡ chủ CLB; trọng tài chỉ cần nhập tỉ số.</p></div></section>`;
  return h;
}
async function migrate(){
  const u=authUser,now=Date.now(),base="clubs/"+CID+"/";
  const put=(p,d)=>FB.setDoc(FB.doc(FB.fs,base+p),d);
  const strip=o=>{const {id,...r}=o;return r};
  S.migMsg="Đang tạo CLB…";render();
  await FB.setDoc(FB.doc(FB.fs,"clubs/"+CID),{name:cfg().title||"CLB",public:true,owner:u.uid,bank:BANK||DEF_BANK,createdAt:now});
  await put("members/"+u.uid,{role:"owner",name:u.displayName||"",email:u.email||"",at:now});
  if(S.cfg)await put("app/config",S.cfg);
  let n=0;const all=[...S.hist.map(h=>["app/"+h.id,strip(h)]),...S.players.map(p=>["players/"+p.id,strip(p)]),...(await db.collection("matches").get()).docs.map(d=>["matches/"+d.id,d.data()]),...(await db.collection("batches").get()).docs.map(d=>["batches/"+d.id,d.data()])];
  for(const [p,d] of all){await put(p,d);n++;if(n%10===0){S.migMsg=`Đang chép ${n}/${all.length}…`;render()}}
  S.migMsg=`Đã chép ${all.length} mục. Đang tải lại…`;render();
  setTimeout(()=>location.reload(),900);
}
function vCaiDat(D){
  const u=authUser;
  let h=`<div class="dhead"><a class="bk" href="${pathOf("home")}" data-go="home">‹ ${esc(CLUB?.name||D.c.title)}</a><h1>Cài đặt CLB</h1>`;
  if(u&&u.isAnonymous&&canWrite)h+=`<div class="acct"><span class="t"><b>Trọng tài (PIN)</b><small>Máy này đang nhập được tỉ số</small></span><button data-act="logout">Thoát</button></div>`;
  else if(isGoogle(u))h+=`<div class="acct">${av({name:u.displayName||u.email||"?"},"sm")}<span class="t"><b>${esc(u.email||u.displayName||"")}</b><small>${esc(ROLE_LB[ROLE]||"Chưa có quyền ở CLB này")}</small></span><button data-act="logout">Thoát</button></div>`;
  h+=`</div>`;
  if(!canWrite)return h+clubLoginBody();
  if(!legacy&&isAdm()){const T=[["Khai ngân hàng nhận tiền",!!CLUB?.bank?.acc],["Đặt PIN trọng tài",(S.editors||[]).length>0],["Thêm thành viên",D.players.length>0],["Mời người cùng quản lý",(S.members||[]).length>1]],ok=T.filter(t=>t[1]).length;
    if(ok<T.length)h+=`<div class="todo"><b>Bắt đầu · ${ok}/${T.length} việc đã xong</b><div class="bar2x"><i style="width:${Math.round(ok/T.length*100)}%"></i></div>${T.map(([l,d])=>`<div class="it${d?" ok":""}"><span class="ck" aria-hidden="true">${d?"✓":""}</span>${l}</div>`).join("")}</div>`}
  return h+clubAdmin(D);
}
const clubFoot=()=>`<footer class="pfoot"><a href="/">pikeco.app</a> · quản lý CLB pickleball${isPA()?` · <a href="/quan-tri">Quản trị nền tảng</a>`:""}</footer>`;
function clubLoginBody(){
  const u=authUser,tok=inviteTok();
  let h="";
  h+=`<section class="card2"><h2>${tok?"Nhận lời mời ban tổ chức":"Chủ CLB, quản lý"}</h2><div class="cb">`;
  if(isGoogle(u)&&!canWrite)h+=`<p class="rule">Đang đăng nhập ${esc(u.email||"")} nhưng tài khoản này chưa có quyền ở CLB. Nhờ chủ CLB gửi link mời, hoặc đổi tài khoản.</p><button class="line" data-act="logout">Đổi tài khoản Google</button>`;
  else h+=`<p class="rule">${tok?"Bạn được mời vào ban tổ chức. Đăng nhập Google để nhận quyền.":"Đăng nhập Google để sửa cài đặt, xếp sân và quản lý thành viên."}</p><button class="gwide" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập bằng Google</button>`;
  if(inApp())h+=`<p class="rule">Trình duyệt trong Zalo/Facebook không cho đăng nhập Google. Bấm nút ⋯ ở góc trên rồi chọn Mở bằng trình duyệt.</p>`;
  h+=`</div></section>`;
  if(!tok)h+=`<section class="card2"><h2>Trọng tài · vào nhanh bằng PIN</h2><div class="cb"><p class="rule">Không cần tài khoản. Nhập PIN chủ CLB đưa là nhập được tỉ số trên máy này.</p>
    <div class="pinrow"><label><span class="sr">PIN trọng tài</span><input id="pin" data-draft="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="Nhập PIN" value="${esc(val("pin",""))}"></label><button class="dark" data-act="login">Vào bằng PIN</button></div>
    ${errs.pin?`<p class="err">${esc(errs.pin)}</p>`:""}</div></section>`;
  return h;
}
function vClubLogin(D){
  let h=`<div class="dhead"><a class="bk" href="${pathOf("home")}" data-go="home">‹ ${esc(CLUB?.name||D.c.title)}</a><h1>Đăng nhập</h1></div>`;
  if(canWrite)return h+`<section class="card2"><div class="cb"><p class="rule">Máy này đang có quyền ${esc(ROLE_LB[ROLE]||"nhập tỉ số")}.</p><a class="cta b" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Vào sân</a><button class="line" data-act="logout">Thoát</button></div></section>`;
  return h+clubLoginBody();
}
