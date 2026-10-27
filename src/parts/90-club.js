/* ---------- CLB & tài khoản ---------- */
const BANKS=[["mb","970422","MB Bank"],["vcb","970436","Vietcombank"],["tcb","970407","Techcombank"],["bidv","970418","BIDV"],["icb","970415","VietinBank"],["acb","970416","ACB"],["tpb","970423","TPBank"],["vpb","970432","VPBank"],["vba","970405","Agribank"],["shb","970443","SHB"],["ocb","970448","OCB"],["msb","970426","MSB"],["stb","970403","Sacombank"],["hdb","970437","HDBank"],["vib","970441","VIB"],["cake","546034","Cake"]];
const ROLE_LB={owner:"Chủ CLB",admin:"Quản lý",scorer:"Trọng tài",pin:"Trọng tài (PIN)"};
const isAdm=()=>ROLE==="owner"||ROLE==="admin";
const isGoogle=u=>!!u&&!u.isAnonymous&&!/^zalo_/.test(String(u.uid||""));
const isZaloU=u=>!!u&&/^zalo_/.test(String(u.uid||""));
const inApp=()=>/Zalo|FBAN|FBAV|Instagram|Line\//i.test(navigator.userAgent||"");
let unsubAdm=[],unsubRef=null;
// Trọng tài: theo dõi sân được giao (ban tổ chức đổi là máy trọng tài cập nhật ngay)
function watchRef(){
  if(unsubRef){try{unsubRef()}catch(e){}unsubRef=null}MYCT0=[];applyRef();
  if(!(ROLE==="scorer"||ROLE==="pin")||legacy||!authUser)return;
  const path=PFX+(ROLE==="scorer"?"members/":"editors/")+authUser.uid;
  try{unsubRef=FB.onSnapshot(FB.doc(FB.fs,path),{},s=>{MYCT0=((s.exists()&&s.data().courts)||[]).map(Number);applyRef();render()},()=>{})}catch(e){}
}
function watchAdmin(){
  unsubAdm.forEach(f=>{try{f()}catch(e){}});unsubAdm=[];
  if(legacy||!isAdm())return;
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"members"),{},q=>{S.members=q.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{}));
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"editors"),{},q=>{S.editors=q.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{}));
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"links"),{},q=>{S.links=q.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{}));
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"contacts"),{},q=>{S.contacts=Object.fromEntries(q.docs.map(d=>[d.id,String(d.data().phone||"")]));render()},()=>{}));
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"refqr"),{},q=>{S.refqr=Object.fromEntries(q.docs.map(d=>[d.id,d.data()]));render()},()=>{}));
  unsubAdm.push(FB.onSnapshot(FB.collection(FB.fs,PFX+"refs"),{},q=>{const t0=Date.now()-20*36e5;S.refsQ=q.docs.map(d=>({id:d.id,...d.data()})).filter(r=>(r.at||0)>t0);render()},()=>{}));
}
async function refreshRole(){
  // Tính xong mới gán một lần: không để trang nháy sang giao diện người chơi trong lúc chờ
  const u=authUser;let role=null,ed=false;
  if(u){
    const [m,e]=await Promise.all([legacy?null:FB.getDoc(FB.doc(FB.fs,PFX+"members/"+u.uid)).catch(()=>null),isEditor(u.uid)]);
    if(m&&m.exists())role=m.data().role;ed=e;if(!role&&ed)role="pin";
    if(legacy&&ed)S.rootEditor=true;
  }
  if(u!==authUser)return;
  ROLE=role;canWrite=!!role;REF=!legacy&&(ROLE==="scorer"||ROLE==="pin");if(REF)canWrite=false;S.authReady=true;
  if(MINI&&!legacy)lsSet("pb-role-"+CID,role||"");
  watchRef();watchRefQ();watchAdmin();watchLink();watchCalls();
}
// Bỏ mã mời khỏi địa chỉ sau khi đã dùng (Mini App giữ ?clb=… trên địa chỉ)
function dropInviteTok(){try{sessionStorage.removeItem("pb-inv-"+CID)}catch(e){}try{const q=new URLSearchParams(location.search);q.delete("moi");history.replaceState(null,"",location.pathname+(q.toString()?"?"+q:"")+location.hash)}catch(e){}}
const inviteTok=()=>{if(INVITE)return INVITE;const t=new URLSearchParams(location.search).get("moi");if(t)return t;try{return MINI?sessionStorage.getItem("pb-inv-"+CID):null}catch(e){return null}};
async function acceptInvite(){
  const tok=inviteTok(),zl=!!authUser&&/^zalo_/.test(String(authUser.uid||""));
  if(!tok||legacy||!(isGoogle(authUser)||zl))return;
  if(ROLE&&ROLE!=="pin"){if(MINI){dropInviteTok();toast(`Bạn đã là ${ROLE_LB[ROLE]} của ${CLUB?.name||"CLB"}.`)}return}
  try{const s=await FB.getDoc(FB.doc(FB.fs,PFX+"invites/"+tok));if(!s.exists()){toast("Link mời không còn hiệu lực.");return}
    const iv=s.data();if(iv.exp<Date.now()){toast("Link mời đã hết hạn, nhờ quản lý tạo link mới.");return}
    await FB.setDoc(FB.doc(FB.fs,PFX+"members/"+authUser.uid),zl?{role:iv.role,invite:tok,name:String(zaloProf().n||"Thành viên Zalo").slice(0,40),email:"",via:"zalo",at:Date.now()}:{role:iv.role,invite:tok,name:authUser.displayName||"",email:authUser.email||"",at:Date.now()});
    await refreshRole();toast(iv.link?`Đã liên kết tài khoản · ${ROLE_LB[iv.role]} của ${CLUB?.name||"CLB"}.`:`Đã nhận quyền ${ROLE_LB[iv.role]} của ${CLUB?.name||"CLB"}.`);
    if(iv.link){try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"invites/"+tok))}catch(e){}}
    if(zl){dropInviteTok();if(MINI)mxSetMode("ql")}
    INVITE=null;route="home";setPath(pathOf("home"),1);
    render();
  }catch(e){toast("Không nhận được lời mời, thử lại.")}
}
function loginBar(){
  if(canWrite)return "";
  const u=authUser,tok=inviteTok();
  let h=`<div class="ro login"><span>${tok&&!legacy?"Bạn được mời vào ban tổ chức của CLB. Đăng nhập Google để nhận quyền.":isZaloU(u)?`Đã đăng nhập bằng Zalo${zaloProf().n?" ("+esc(zaloProf().n)+")":""} nhưng tài khoản này chưa có quyền ở CLB này. Nhờ chủ CLB giao quyền ở trang Thành viên, hoặc gửi link mời.`:isGoogle(u)?`Đã đăng nhập ${esc(u.email||u.displayName||"")} nhưng chưa có quyền ở CLB này. Nhờ chủ CLB gửi link mời, hoặc nhập PIN trọng tài.`:"Bạn đang xem trực tiếp. Ban tổ chức đăng nhập Google hoặc Zalo, trọng tài nhập PIN để nhập tỉ số."}</span>
    <span class="bar" style="gap:6px">${isGoogle(u)||isZaloU(u)?`<button class="ghost" data-act="logout">Đổi tài khoản</button>`:`<button class="gbtn" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập Google</button>${qrlBtn("gbtn zbtn")}`}
    <input id="pinname" data-draft="pinname" maxlength="30" autocomplete="off" placeholder="Tên trọng tài" value="${esc(val("pinname",""))}" style="width:130px"><input id="pin" data-draft="pin" type="password" autocomplete="off" placeholder="PIN trọng tài" value="${esc(val("pin",""))}" style="width:120px"><button class="primary" data-act="login">Vào bằng PIN</button></span>
    ${errs.pin?`<p class="err" style="width:100%">${esc(errs.pin)}</p>`:""}${inApp()?`<p class="rule" style="width:100%">Trình duyệt trong Zalo/Facebook không cho đăng nhập Google. Bấm nút ⋯ ở góc trên rồi chọn Mở bằng trình duyệt.</p>`:""}</div>`;
  return h.replace(/<\/div>$/,qrlBox()+"</div>");
}
function bankName(b){const x=BANKS.find(z=>z[0]===b.code);return x?x[2]:(b.name||b.code||"")}
let cdOpen=new Set(),cdPage=null,cdGrp=null;
function clubAdmin(D){
  if(!canWrite)return "";
  if(legacy){
    if(CID!=="aep")return "";
    if(!isGoogle(authUser))return `<div class="panel clubp"><h2>Tài khoản CLB</h2><p class="rule">Dữ liệu CLB đang ở chế độ cũ (PIN chung). Để chuyển sang tài khoản riêng, chủ CLB đăng nhập Google rồi nhập PIN một lần.</p><div class="bar" style="margin-top:10px"><button class="gbtn" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập Google</button></div></div>`;
    return `<div class="panel clubp"><h2>Chuyển sang tài khoản CLB</h2><p class="rule">Bạn đang đăng nhập ${esc(authUser.email||"")}. Bấm nút dưới để tạo không gian riêng cho CLB với bạn là chủ CLB, rồi chép toàn bộ thành viên, các trận, lịch sử và quỹ sang. Dữ liệu cũ vẫn được giữ nguyên làm bản sao lưu.</p>
      <p class="rule" style="margin-top:6px"><b>Nên làm khi không có giải đấu nào đang đánh.</b> Sau khi chuyển, mọi máy đang mở trang cần tải lại.</p>
      <div class="bar" style="margin-top:10px"><button class="ball" data-act="migrate">${armed("migrate:x")?"Bấm lần nữa để bắt đầu chuyển":"Chuyển dữ liệu sang tài khoản CLB"}</button></div>${S.migMsg?`<p class="rule" style="margin-top:8px">${esc(S.migMsg)}</p>`:""}</div>`;
  }
  if(!isAdm())return `<div class="panel clubp"><h2>Tài khoản</h2><p class="rule">Bạn đang có quyền ${esc(ROLE_LB[ROLE]||"")} ở ${esc(CLUB?.name||"CLB")}. Chỉ chủ CLB và quản lý mới đổi được cài đặt CLB.</p></div>`;
  const b=CLUB?.bank||{},mem=[...(S.members||[])].sort((a,b)=>(a.role==="owner"?-1:b.role==="owner"?1:0)||String(a.name).localeCompare(String(b.name),"vi"));
  const link=absUrl("/"+CID);
  const sInfo=`<section class="card2"><h2>Thông tin CLB</h2><div class="cb">
      <div class="logoed">${clubAv(CLUB||{id:CID},"big")}<span class="t"><label class="lnkbtn">${logoOk(CLUB)?"Đổi ảnh đại diện":"Thêm ảnh đại diện"}<input type="file" accept="image/*" data-clogo="1" class="sr"></label>${logoOk(CLUB)?`<button class="ghost danger" data-act="clogodel">Xoá ảnh</button>`:""}<small class="rule">Ảnh vuông, app tự thu nhỏ. Hiện trên đầu trang và danh sách CLB.</small></span></div>
      <label class="fld"><span class="lbl">Tên CLB · hiện trên đầu trang</span><input id="cl-name" data-draft="cl-name" maxlength="60" value="${esc(val("cl-name",CLUB?.name||""))}"></label>
      <button class="wide" data-act="cname">Lưu tên CLB</button>
      <div class="fld"><span class="lbl">Ai được xem</span><span class="seg segw"><button data-act="pub" data-v="1" aria-pressed="${CLUB?.public!==false}">Ai có link</button><button data-act="pub" data-v="0" aria-pressed="${CLUB?.public===false}">Chỉ ban tổ chức</button></span></div>
      <div class="linkrow"><span>${esc(link.replace(/^https?:\/\//,""))}</span><button class="primary" data-act="clubshare">Chia sẻ</button></div></div></section>`;
  const sBank=`<section class="card2"><h2>Ngân hàng nhận phí</h2><div class="cb">
      <label class="fld"><span class="lbl">Ngân hàng</span><select id="bk-code" data-draft="bk-code">${BANKS.map(([c,,n])=>`<option value="${c}" ${val("bk-code",b.code||"mb")===c?"selected":""}>${n}</option>`).join("")}</select></label>
      <label class="fld"><span class="lbl">Số tài khoản</span><input id="bk-acc" data-draft="bk-acc" inputmode="numeric" value="${esc(val("bk-acc",b.acc||""))}"></label>
      <label class="fld"><span class="lbl">Chủ tài khoản (không dấu)</span><input id="bk-holder" data-draft="bk-holder" value="${esc(val("bk-holder",b.holder||""))}"></label>
      <span class="meta">${b.acc?`Đang dùng: ${esc(bankName(b))} · ${esc(b.acc)} · ${esc(b.holder||"")}`:"Chưa khai ngân hàng: nút Chuyển khoản sẽ bị ẩn."}</span>
      <button class="wide" data-act="bsave">Lưu ngân hàng</button></div></section>`;
  const sPin=`    <section class="card2"><h2>PIN trọng tài</h2><div class="cb">
      <p class="rule">Trọng tài mở ${esc(link.replace(/^https?:\/\//,""))}/dang-nhap, nhập PIN là nhập được tỉ số, không cần tài khoản. Đổi PIN không làm mất quyền của các máy đã vào.</p>
      <div class="pinst${CLUB?.pinAt?" ok":""}">${CLUB?.pinAt?`✓ Đã có PIN · đổi lần cuối ${dmy(CLUB.pinAt)}`:"Chưa đặt PIN: trọng tài chưa vào được bằng PIN."}</div>
      <div class="pinrow"><label><span class="sr">PIN mới</span><input id="newpin" data-draft="newpin" type="text" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="PIN mới, ít nhất 4 số" value="${esc(val("newpin",""))}"></label><button class="dark" data-act="pinset">Đặt PIN</button></div>
      ${errs.pinset?`<p class="err">${esc(errs.pinset)}</p>`:""}
      <div class="bar"><span class="meta grow">${(S.editors||[]).length} máy đang dùng PIN</span>${(S.editors||[]).length?`<button class="ghost danger" data-act="edclear">${armed("edclear:x")?"Bấm lần nữa":"Thu hồi tất cả"}</button>`:""}</div></div></section>`;
  const sTeam=`    <section class="card2"><h2>Ban tổ chức</h2>${mem.map(m=>`<div class="mrow3">${av({name:m.name||m.email||"?"},"sm")}<span class="t"><b>${esc(m.name||m.email||m.id)}</b><small>${esc(m.email||(m.via==="zalo"?"Tài khoản Zalo":""))}</small></span><span class="rtag${m.role==="owner"?" o":""}">${ROLE_LB[m.role]||m.role}</span>${m.role!=="owner"&&m.id!==authUser?.uid?(armed("mrm:"+m.id)?`<button class="danger" data-act="mrm" data-id="${m.id}">Bấm lần nữa</button>`:`<button class="ghost danger" data-act="mrm" data-id="${m.id}">Gỡ</button>`):""}</div>`).join("")}
      <div class="cb"><div class="two"><button class="line" data-act="inv" data-v="admin">Mời quản lý</button><button class="line" data-act="inv" data-v="scorer">Mời trọng tài</button></div>
      ${invBox()}
      <p class="rule">Người được mời bấm link trong Zalo là mở Pikeco và có quyền ngay, không cần Google. Muốn quản lý trên máy tính thì mở link web rồi đăng nhập Google. Quản lý sửa được mọi thứ trừ gỡ chủ CLB; trọng tài chỉ nhập được tỉ số ở sân được giao.</p></div></section>`;
  const c=mfCfg(),cur=mfKey(),MM=mfMembers(D).filter(p=>!p.hold),np=MM.filter(p=>mfPaid(p.id,cur)).length,nEd=(S.editors||[]).length,nSc=mem.filter(m=>m.role==="scorer").length;
  const vc=(typeof VOICE_LIST!=="undefined"&&(VOICE_LIST.find(x=>x[0]===(cfg().voice||VOICE_LIST[0][0]))||VOICE_LIST[0]))||["",""];
  const G=[
    ["CÂU LẠC BỘ",[
      ["info","🏠","Thông tin CLB",`${esc(CLUB?.name||"")} · ${CLUB?.public===false?"chỉ ban tổ chức xem":"ai có link đều xem"}`,0,sInfo],
      ["intro","📣","Trang giới thiệu",CLUB?.about?"Đã có giới thiệu, lịch đánh, sân":"Chưa viết giới thiệu cho người mới",!CLUB?.about,introCard()],
      ["fv","👁","Thành viên xem quỹ",FV[(CLUB&&CLUB.fundView)||"flow"],0,`<section class="card2"><div class="cb">${fvCard()}</div></section>`]]],
    ["PHÍ & THANH TOÁN",[
      ["mf","💳","Phí thành viên cố định",mfOn()?`${fmtK(c.k)}/${c.per==="m"?"tháng":c.per==="q"?"quý":"năm"} · ${mfLb(cur)} ${np}/${MM.length} đã đóng`:"Đang tắt · bật để thu phí theo tháng/quý/năm",0,`<section class="card2"><div class="cb">${mfCard(D)}</div></section>`,`<button class="cdsw" data-act="mfon" aria-pressed="${mfOn()}" aria-label="Bật tắt phí thành viên">${gbSw(mfOn())}</button>`],
      ["bank","🏦","Ngân hàng nhận phí",CLUB?.bank?.acc?`${esc(bankName(CLUB.bank))} · ${esc(CLUB.bank.acc)}`:"Chưa khai: người chơi không quét QR được",!CLUB?.bank?.acc,sBank]]],
    ["NGƯỜI & QUYỀN",[
      ["team","👥","Ban tổ chức",`${mem.length} người · mời quản lý, trọng tài`,0,sTeam],
      ["pin","🔑","PIN trọng tài",CLUB?.pinAt?`Đã đặt · ${nEd} máy đang dùng`:"Chưa đặt PIN",!CLUB?.pinAt,sPin],
      ["ref","🎯","Giao sân cho trọng tài",`${nSc+nEd} trọng tài`,0,refCard()]]],
    ["GIẢI & DỮ LIỆU",[
      ["ls","📅","Lịch sử các giải đấu",`${S.hist.length} giải đã chốt`,0,"",0,`href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"`],
      ["bxh","🏆","Bảng xếp hạng",`${D.players.filter(p=>!p.guest).length} thành viên`,0,"",0,`href="${pathOf("app",{tab:"bxh"})}" data-go="app" data-t="bxh"`],
      ...(ROLE==="owner"?[["del","🗑","Giải đấu đã xóa",delList&&delList.length?`${delList.length} giải khôi phục được`:"Khôi phục giải đấu lỡ tay xoá",0,delCard()]]:[])]],
    ["LOA & ỨNG DỤNG",[["voice","🔊","Giọng đọc gọi vào sân",esc(vc[1]||""),0,voiceCard()],
      ["gt","🪪","Xem trang giới thiệu CLB","Như người mới nhìn thấy",0,"",0,`href="${pathOf("app",{tab:"gt"})}" data-go="app" data-t="gt"`],
      ...(MINI?[["web","↗","Mở bản web đầy đủ","pikeco.app trên trình duyệt",0,"",0,`data-act="openweb" data-v="${esc(pathOf("caidat"))}"`]]:[])]]];
  const P=cdPage&&G.flatMap(x=>x[1]).find(r=>r[0]===cdPage&&r[5]);
  if(P)return `<div class="cdsub"><button class="gdback" data-act="cdback" aria-label="Quay lại">‹</button><span class="t"><b>${P[2]}</b><small>${P[3]}</small></span>${P[6]||""}</div><div class="cdbody">${P[5]}</div>`;
  const ALL=G.flatMap(x=>x[1]);
  const rows=R=>`<div class="cdlist">${R.map(([k,ic,t,sum,warn,html,sw,lk])=>{
    const inner=`<i class="cdic" aria-hidden="true">${ic}</i><span class="t"><b>${t}</b><small class="${warn?"warn":""}">${warn?"⚠ ":""}${sum}</small></span>`;
    if(lk)return `<div class="cdrow"><div class="cdh">${/data-act=/.test(lk)?`<button class="cdb" ${lk}>${inner}<i class="cdch" aria-hidden="true">↗</i></button>`:`<a class="cdb" ${lk}>${inner}<i class="cdch" aria-hidden="true">›</i></a>`}</div></div>`;
    return `<div class="cdrow"><div class="cdh"><button class="cdb" data-act="cdo" data-v="${k}">${inner}${sw?"":`<i class="cdch" aria-hidden="true">›</i>`}</button>${sw?sw+`<button class="cdch b" data-act="cdo" data-v="${k}" aria-label="Mở ${t}">›</button>`:""}</div></div>`}).join("")}</div>`;
  const GR=[["clb","🏠","CLB của tôi","Tên, ảnh, giới thiệu cho người mới, ai xem quỹ",["info","intro","fv"]],["nguoi","🤝","Người giúp việc","Mời quản lý, trọng tài, PIN nhập điểm",["team","pin","ref"]],
    ["tien","🏦","Nhận tiền","Ngân hàng, phí thành viên hằng tháng",["bank","mf"]],["loa","🔊","Loa","Giọng đọc gọi vào sân",["voice"]],["ls","📅","Lịch sử, xếp hạng","Các giải đã xong, rating, trang giới thiệu",["ls","bxh","gt","web","del"]],["help","❓","Hướng dẫn, hỏi đáp","Làm sao để… · lỡ bấm nhầm thì sao",[]]];
  const hd=(t,a)=>gmHd(t,a);
  if(cdGrp==="help")return hd("Hướng dẫn, hỏi đáp","cdgrpx")+cdHelp();
  const g=GR.find(x=>x[0]===cdGrp);
  if(g)return hd(g[2],"cdgrpx")+`<small class="rule">${g[3]}</small>`+rows(ALL.filter(r=>g[4].includes(r[0])));
  const q=noAcc(String(val("cdq","")).trim().toLowerCase());
  let h=`<label class="tvq cdq"><span class="sr">Tìm cài đặt</span><input id="cdq" data-draft="cdq" data-live="1" type="search" placeholder="🔍 Tìm: “ngân hàng”, “PIN”, “loa”…" value="${esc(val("cdq",""))}" autocomplete="off"></label>`;
  if(q){const M=ALL.filter(r=>noAcc((r[2]+" "+String(r[3]).replace(/<[^>]*>/g,"")).toLowerCase()).includes(q));return h+(M.length?rows(M):`<p class="rule">Không thấy mục nào. Thử từ khác.</p>`)}
  return h+`<div class="gmlist">${GR.map(([k,i,t,s2,ks])=>{const w=ALL.some(r=>ks.includes(r[0])&&r[4]);
    return `<button class="gmli" data-act="${k==="loa"?"cdo":"cdgrp"}" data-v="${k==="loa"?"voice":k}"><i>${i}</i><span class="t"><b>${t}</b><small>${s2}</small></span>${w?`<span class="gmtag y">THIẾU</span>`:`<span aria-hidden="true">›</span>`}</button>`}).join("")}</div>`;
}
function cdHelp(){
  const Q=[["Tạo giải giao lưu thế nào?","Vào tab Giải › Tạo giải mới, trả lời 3 câu là xong. App gửi sẵn tin nhắn vào nhóm Zalo.",`data-act="xnew"`,"Tạo giải ngay"],
    ["Người chơi đăng ký ra sao?","Người chơi bấm link giải trong nhóm Zalo, chọn tên mình, bấm Đăng ký. Không cần cài gì.",MINI?`data-act="mxmode" data-v="choi"`:"","Xem như người chơi"],
    ["Thu tiền, ai chưa trả?","Vào Quỹ › ô vàng “còn nợ”. Chạm Đã nhận khi nhận tiền, hoặc nhắc cả nhóm qua Zalo.",`data-go="app" data-t="tien"`,"Mở Quỹ"],
    ["Nhờ người nhập điểm?","Trong giải, chặng Ngày đánh › Thêm việc › Trọng tài: đưa mã QR từng sân cho người nhập điểm quét.","",""],
    ["Lỡ bấm nhầm thì sao?","Không có gì khoá chết: giải sửa lúc nào cũng được, chốt rồi vẫn mở lại trong Lịch sử, trận lưu nhầm thì hoàn tác.","",""]];
  return `<div class="gmlist cdhelp">${Q.map(([t,a,act,bl])=>`<details class="cdqa"><summary><i>❓</i><b>${t}</b></summary><p>${a}</p>${act?`<button class="btn-line" ${act}>${bl} ›</button>`:""}</details>`).join("")}</div>`;
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
  if(u&&u.isAnonymous&&(canWrite||REF))h+=`<div class="acct"><span class="t"><b>Trọng tài (PIN)</b><small>${REF?(MYCT.length?"Nhập tỉ số sân "+MYCT.join(", "):"Chưa được giao sân"):"Máy này đang nhập được tỉ số"}</small></span><button data-act="logout">Thoát</button></div>`;
  else if(isPlayer(u)&&(canWrite||REF)){const pn=S.link&&S.link.status==="ok"&&D.pmap.get(S.link.pid)?.name;h+=`<div class="acct">${av({name:pn||zaloProf().n||"Z"},"sm")}<span class="t"><b>${esc(pn||zaloProf().n||"Tài khoản Zalo")}</b><small>${esc(ROLE_LB[ROLE]||"")} · đăng nhập bằng Zalo</small></span></div>`}
  else if(isPlayer(u)){const pn=S.link&&S.link.status==="ok"&&D.pmap.get(S.link.pid)?.name;h+=`<div class="acct">${av({name:pn||"?"},"sm")}<span class="t"><b>${esc(pn||"Người chơi")}</b><small>${pn?"Người chơi · máy này":"Chưa được chủ CLB duyệt"}</small></span>${u.isAnonymous?"":`<button data-act="logout">Thoát</button>`}</div>`}
  else if(isGoogle(u))h+=`<div class="acct">${av({name:u.displayName||u.email||"?"},"sm")}<span class="t"><b>${esc(u.email||u.displayName||"")}</b><small>${esc(ROLE_LB[ROLE]||"Chưa có quyền ở CLB này")}</small></span><button data-act="logout">Thoát</button></div>`;
  h+=`</div>`;
  if(REF)return h+`<section class="card2"><h2>Quyền trọng tài</h2><div class="cb"><p class="rule">${MYCT.length?`Bạn được giao sân ${MYCT.join(", ")}. Chỉ nhập được tỉ số ở các sân này.`:"Bạn chưa được giao sân. Báo chủ CLB hoặc quản lý giao sân trong Cài đặt."}</p><a class="cta b" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Vào sân</a></div></section>`;
  if(!canWrite)return h+clubLoginBody();
  const mq=MINI&&isAdm()&&!legacy;
  if(mq)h="";
  if(!cdPage&&!mq)h+=acctLinkCard();
  if(!cdPage&&!cdGrp&&!legacy&&isAdm()){const T=[["Khai ngân hàng nhận phí","Để người chơi quét QR chuyển tiền",!!CLUB?.bank?.acc,`data-act="cdo" data-v="bank"`],["Thêm thành viên","Gửi link mời vào nhóm Zalo",D.players.length>0,`data-go="app" data-t="nguoi"`],["Mời người cùng quản lý","Quản lý, trọng tài giúp anh",(S.members||[]).length>1,`data-act="cdo" data-v="team"`]],m=T.filter(t=>!t[2]);
    if(m.length)h+=`<button class="gmnext qnext" ${m[0][3]}><span class="cap">👉 Còn ${m.length} việc để CLB chạy trơn tru</span><b>${m[0][0]}</b><small>${m[0][1]}</small></button>`}
  return h+clubAdmin(D)+(mq&&!cdPage&&!cdGrp?acctLinkCard():"");
}
const clubFoot=()=>`<footer class="pfoot"><a href="/">pikeco.app</a> · quản lý CLB pickleball${isPA()?` · <a href="/quan-tri">Quản trị nền tảng</a>`:""}</footer>`;
function clubLoginBody(){
  const u=authUser,tok=inviteTok();
  let h="";
  if(MINI)return PLAYER_ON()?`<section class="card2"><h2>Người chơi</h2><div class="cb">${isPlayer(u)?`<p class="rule">Bạn đã vào bằng Zalo. Đăng ký giải đấu ở trang Sân đấu.</p><a class="cta b" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Vào trang đăng ký</a>`:zaloBtn("Vào bằng Zalo")}</div></section><p class="rule">Ban tổ chức quản lý CLB trên pikeco.app.</p>`:"";
  if(!tok&&!legacy&&PLAYER_ON())h+=`<section class="card2"><h2>Người chơi</h2><div class="cb">${isPlayer(u)?`<p class="rule">Máy này đã tham gia. Bạn đăng ký giải đấu ở trang Sân đấu.</p><a class="cta b" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Vào trang đăng ký</a>`:`<p class="rule">Tự đăng ký giải đấu, không cần tài khoản. Chạm vào tên mình, chủ CLB duyệt một lần là xong. Mở được ngay trong Zalo.</p>${zaloBtn()}`}</div></section>`;
  h+=`<section class="card2"><h2>${tok?"Nhận lời mời ban tổ chức":"Chủ CLB, quản lý"}</h2><div class="cb">`;
  if(isGoogle(u)&&!canWrite)h+=`<p class="rule">Đang đăng nhập ${esc(u.email||"")} nhưng tài khoản này chưa có quyền ở CLB. Nhờ chủ CLB gửi link mời, hoặc đổi tài khoản.</p><button class="line" data-act="logout">Đổi tài khoản Google</button>`;
  else if(isZaloU(u)&&!canWrite)h+=`<p class="rule">Đang đăng nhập bằng Zalo nhưng tài khoản này chưa có quyền ở CLB. Nhờ chủ CLB giao quyền ở trang Thành viên, hoặc gửi link mời.</p><button class="line" data-act="logout">Đổi tài khoản</button>`;
  else h+=`<p class="rule">${tok?"Bạn được mời vào ban tổ chức. Đăng nhập Google hoặc Zalo để nhận quyền.":"Đăng nhập để sửa cài đặt, xếp sân và quản lý thành viên."}</p>${qrlBtn()}${qrlBox()}<button class="gwide" data-act="glogin"><span class="g" aria-hidden="true">G</span>Đăng nhập bằng Google</button>`;
  if(inApp())h+=`<p class="rule">Trình duyệt trong Zalo/Facebook không cho đăng nhập Google. Bấm nút ⋯ ở góc trên rồi chọn Mở bằng trình duyệt.</p>`;
  h+=`</div></section>`;
  if(!tok)h+=`<section class="card2"><h2>Trọng tài · vào nhanh bằng PIN</h2><div class="cb"><p class="rule">Không cần tài khoản. Nhập PIN chủ CLB đưa là nhập được tỉ số trên máy này.</p>
    <label class="fld"><span class="lbl">Tên trọng tài · để ban tổ chức giao sân</span><input id="pinname" data-draft="pinname" maxlength="30" autocomplete="off" placeholder="Ví dụ: Hùng" value="${esc(val("pinname",""))}"></label><div class="pinrow"><label><span class="sr">PIN trọng tài</span><input id="pin" data-draft="pin" type="password" inputmode="numeric" autocomplete="off" placeholder="Nhập PIN" value="${esc(val("pin",""))}"></label><button class="dark" data-act="login">Vào bằng PIN</button></div>
    ${errs.pin?`<p class="err">${esc(errs.pin)}</p>`:""}</div></section>`;
  return h;
}
function vClubLogin(D){
  let h=`<div class="dhead"><a class="bk" href="${pathOf("home")}" data-go="home">‹ ${esc(CLUB?.name||D.c.title)}</a><h1>Đăng nhập</h1></div>`;
  if(canWrite)return h+`<section class="card2"><div class="cb"><p class="rule">Máy này đang có quyền ${esc(ROLE_LB[ROLE]||"nhập tỉ số")}.</p><a class="cta b" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">Vào sân</a><button class="line" data-act="logout">Thoát</button></div></section>`;
  return h+clubLoginBody();
}

/* ----- Giao sân cho trọng tài ----- */
function refRows(){
  const n=Math.max(1,+cfg().courts||2),R=[...(S.members||[]).filter(m=>m.role==="scorer").map(m=>({k:"m:"+m.id,nm:m.name||m.email||"Trọng tài",sub:"Tài khoản Google",ct:m.courts||[]})),
    ...(S.editors||[]).map(e=>({k:"e:"+e.id,nm:e.name||"Máy chưa đặt tên",sub:`Vào bằng PIN${e.at?" · "+dmy(e.at):""}`,ct:e.courts||[]}))];
  return R.length?R.map(r=>`<div class="refrow"><span class="t"><b>${esc(r.nm)}</b><small>${esc(r.sub)}</small></span><span class="refct">${Array.from({length:n},(_,i)=>i+1).map(c=>{const on=r.ct.map(Number).includes(c);return `<button class="${on?"on":""}" data-act="refct" data-k="${r.k}" data-c="${c}" aria-pressed="${on}" style="--cc:${cColor(c)}">S${esc(cName(c))}</button>`}).join("")}</span></div>`).join(""):`<p class="rule">Chưa có trọng tài nào vào. Mời bằng link Google hoặc gửi link vào bằng PIN bên dưới.</p>`;
}
function refCard(){
  return `<section class="card2"><h2>Giao sân cho trọng tài</h2><div class="cb"><p class="rule">Trọng tài chỉ nhập được tỉ số ở sân được tick. Không sửa giải đấu, không xếp trận, không điểm danh, không xóa được gì. Giao sân nhanh hơn ở mục Trọng tài trong trang Chuẩn bị của giải đấu.</p>${refRows()}</div></section>`;
}
/* ----- Buổi đã xóa: chủ CLB khôi phục ----- */
let delList=null;
function delCard(){
  if(delList===null){delList=[];db.collection("deleted").get().then(q=>{delList=q.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.at||0)-(a.at||0));render()}).catch(()=>{delList=[];})}
  return `<section class="card2"><h2>Giải đấu đã xóa</h2><div class="cb">${delList.length?delList.map(x=>`<div class="refrow"><span class="t"><b>${esc(x.hist&&x.hist.sname?x.hist.sname+" · ":"")}Giải đấu #${x.sid}</b><small>${x.matches?.length||0} trận${x.hist&&x.hist.endedAt?" · đánh "+dmy(x.hist.endedAt):""} · xóa ${dhm(x.at)}${x.by?" bởi "+esc(x.by):""}</small></span><button class="${armed("srestore:"+x.id)?"primary":"line"}" data-act="srestore" data-id="${x.id}">${armed("srestore:"+x.id)?"Bấm lần nữa":"Khôi phục"}</button></div>`).join(""):`<p class="rule">Chưa có giải đấu nào bị xóa.</p>`}
    <p class="rule">Khôi phục sẽ đưa lại trận, kết quả, chi phí giải đấu đó và cộng lại rating cho từng người.</p></div></section>`;
}
async function restoreSession(id){
  const ref=db.collection("deleted").doc(id),snap=await ref.get();if(!snap.exists)return "Không tìm thấy giải đấu này.";
  const x=snap.data(),sid=x.sid;
  if(S.hist.some(h=>h.sid===sid))return `Giải đấu #${sid} đang có trong Lịch sử, không khôi phục chồng lên được.`;
  for(const {id:mid,...d} of x.matches||[])await db.collection("matches").doc(mid).set(d);
  for(const {id:bid,...d} of x.batches||[])await db.collection("batches").doc(bid).set(d);
  if(x.hist)await db.doc("app/hist-"+sid).set(x.hist);
  // Cộng lại đúng phần rating đã trừ khi xóa
  for(const [pid,d] of Object.entries(x.adj||{})){const p=S.players.find(q=>q.id===pid);if(p&&d)await db.collection("players").doc(pid).update({rating0:Math.round(Math.min(8,Math.max(1,(Number(p.rating0)||3)+Number(d)))*100)/100})}
  await ref.delete();delList=null;delete S.pm[sid];
  return `Đã khôi phục giải đấu #${sid}, rating đã tự cộng lại.`;
}

/* ----- Giới thiệu CLB: hiện trong Zalo Mini App cho người mới ----- */
const INTRO=[["city","Khu vực","TP.HCM · Quận 10",40],["sched","Ghi chú lịch đánh","Nghỉ lễ, Tết thông báo trong nhóm",80],["venue","Sân","Sân Kỳ Hòa, 3 Cao Thắng, Q10",100],["level","Trình độ","2.5–3.5, nhận người mới",60],["feeTxt","Chi phí","50k/giải đấu, VĐV ngoài CLB 70k",60],["zalo","Số Zalo liên hệ (công khai)","0901234567",15]];
function introCard(){
  const c=CLUB||{};
  return `<section class="card2"><h2>Giới thiệu CLB</h2><div class="cb"><p class="rule">Hiện ở trang giới thiệu CLB trong Zalo Mini App, giúp người mới quyết định tham gia.</p>
    <label class="fld"><span class="lbl">Giới thiệu ngắn</span><textarea id="ci-about" data-draft="ci-about" maxlength="500" rows="3" placeholder="CLB vui vẻ, chơi đều mỗi tuần, có chấp cân trình">${esc(val("ci-about",c.about||""))}</textarea></label>
    ${INTRO.map(([k,l,ph,mx])=>`<label class="fld"><span class="lbl">${l}</span><input id="ci-${k}" data-draft="ci-${k}" maxlength="${mx}" ${k==="zalo"?'inputmode="tel"':""} placeholder="${ph}" value="${esc(val("ci-"+k,c[k]||""))}"></label>`).join("")}
    ${introExtra()}<button class="wide" data-act="cintro">Lưu giới thiệu</button></div></section>`;
}

// Hộp link mời vừa tạo: link Zalo (mở Mini App, nhận quyền bằng Zalo) và link web (đăng nhập Google)
function invBox(role){
  const L=S.invLink;if(!L||(role&&L.role!==role))return "";
  return `<div class="sharebox"><span class="lbl">Link mời ${esc(ROLE_LB[L.role])} · hết hạn sau 7 ngày</span><span class="url">${esc(L.zalo.replace(/^https?:\/\//,""))}</span>
    <div class="bt"><button class="primary" data-act="invshare">Gửi qua Zalo</button><button data-act="cp" data-v="${esc(L.zalo)}">Copy link Zalo</button></div>
    <small class="rule">Quản lý trên máy tính: <button class="lnk" data-act="cp" data-v="${esc(L.url)}">copy link web</button>, mở bằng Chrome/Safari rồi đăng nhập Google.</small></div>`;
}

// Mini App: dùng vai trò lần trước trong lúc chờ kiểm tra lại (tránh trang nháy giữa giao diện người chơi và quản lý)
function roleGuess(){if(!MINI||MODE!=="club"||ROLE||legacy)return;const r=lsGet("pb-role-"+CID)||"";if(!r)return;
  ROLE=r;canWrite=true;REF=r==="scorer"||r==="pin";if(REF)canWrite=false}
