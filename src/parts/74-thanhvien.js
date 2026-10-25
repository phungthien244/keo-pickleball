/* ---------- Quản lý thành viên (ban tổ chức): danh sách gọn, lọc nhanh, hồ sơ có tiền, ghi chú, tạm nghỉ ----------
   players/{id}.hold = true: tạm nghỉ dài ngày (ẩn khỏi điểm danh, không tính nợ phí thành viên)
   notes/{pid} = {t, at, by}: ghi chú nội bộ, chỉ ban tổ chức đọc */
let tvF="all",tvSort="rt",tvAdd=false,tvG="",tvSel=null;
const TVF=[["all","Tất cả"],["pend","Chờ duyệt"],["btc","BTC"],["debt","Còn nợ"],["nozalo","Chưa Zalo"],["here","Có mặt"],["guest","Ngoài CLB"],["hold","Tạm nghỉ"]];
const TV_MAIN=["all","pend","btc","debt","nozalo"];
const tvRole=(p,I)=>p.zuid?I.role.get(p.zuid)||"":"";
const tvFlt=I=>({pend:()=>false,all:p=>!p.guest&&!p.hold,here:p=>p.active!==false,btc:p=>!!tvRole(p,I),debt:p=>I.debtOf(p.id)>0||I.mfNo(p),nozalo:p=>!p.guest&&!p.zuid,guest:p=>p.guest,hold:p=>p.hold});
function tvInfo(D){
  const dt=new Map();for(const x of debts())dt.set(x.id,(dt.get(x.id)||0)+x.k);
  const role=new Map((S.members||[]).map(m=>[m.id,m.role]));
  const cur=mfKey(),mf=mfOn();
  return {dt,role,cur,mf,debtOf:id=>(dt.get(id)||0),mfNo:p=>mf&&!p.guest&&!p.hold&&!mfPaid(p.id,cur)};
}
function tvTags(D,p,I){
  const t=[],tg=(x,c)=>t.push(`<i class="tvt ${c}">${x}</i>`),r=p.zuid&&I.role.get(p.zuid);
  if(r==="owner")tg("CHỦ CLB","o");else if(r==="admin")tg("QUẢN LÝ","a");else if(r==="scorer")tg("TRỌNG TÀI","s");
  if(p.guest)tg("NGOÀI CLB","g");
  if(p.hold)tg("TẠM NGHỈ","h");
  if(p.zuid)tg("ZALO ✓","z");
  if(I.mf&&!p.guest&&!p.hold)tg(mfPaid(p.id,I.cur)?`PHÍ ${mfShort(I.cur)} ✓`:`NỢ PHÍ ${mfShort(I.cur)}`,mfPaid(p.id,I.cur)?"ok":"no");
  const d=I.debtOf(p.id);if(d)tg(`NỢ GIẢI ${fmtK(d)}`,"d");
  return t.join("");
}
function vTV(D){
  if(!canWrite||legacy)return vNguoi(D);
  if(tvAdd)return tvAddPage(D);
  const I=tvInfo(D),busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const mem=D.players.filter(p=>!p.guest),here=D.players.filter(p=>p.active!==false),pend=pendCount();
  const nDebt=D.players.filter(p=>I.debtOf(p.id)||I.mfNo(p)).length;
  const q=String(val("tvq","")).trim();
  const FL=tvFlt(I),flt=FL[tvF]||(()=>true),gOk=p=>!tvG||(p.gender==="F"?"F":"M")===tvG;
  const L=D.players.filter(p=>flt(p)&&gOk(p)&&hasQ(q,p.name,p.code,p.nick)).sort(tvSort==="nm"?(a,b)=>a.name.localeCompare(b.name,"vi"):(a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating);
  const cnt=k=>D.players.filter(p=>FL[k](p)&&gOk(p)).length,gc=g=>D.players.filter(p=>flt(p)&&(p.gender==="F"?"F":"M")===g).length;
  let h=`<div class="tvstat">${[[mem.length,"THÀNH VIÊN",""],[here.length,"CÓ MẶT",""],[pend,"CHỜ DUYỆT",pend?"y":""],[nDebt,"CÒN NỢ",nDebt?"r":""]].map(([a,b,c])=>`<span><b class="num ${c}">${a}</b><small>${b}</small></span>`).join("")}</div>`;
  h+=`<nav class="hqtabs qtabs tvtabs" aria-label="Lọc thành viên">${TV_MAIN.map(k=>{const l=TVF.find(x=>x[0]===k)[1],n=k==="pend"?pend:k==="all"?null:cnt(k);
    return `<button data-act="tvf" data-v="${k}" aria-pressed="${tvF===k}">${l}${n?`<i>${n}</i>`:""}</button>`}).join("")}</nav>`;
  if(tvF==="pend"){const A=approvals(D);return h+(A||`<div class="empty"><strong>Không có ai chờ duyệt</strong>Người bấm link mời và chọn tên sẽ hiện ở đây để bạn duyệt.</div>`)+`<button class="tvfab" data-act="tvadd">＋ Thêm thành viên</button>`+rrPanel()}
  if(pend&&tvF==="all")h+=`<button class="qnolink tvpend" data-act="tvf" data-v="pend"><span>${pend} người chờ duyệt</span><b>Duyệt ›</b></button>`;
  h+=`<label class="tvq"><span class="sr">Tìm thành viên</span><input id="tvq" data-draft="tvq" data-live="1" type="search" placeholder="🔍 Tìm tên, biệt danh, mã…" value="${esc(val("tvq",""))}" autocomplete="off"></label>
    <div class="tvchips">${TVF.filter(([k])=>!TV_MAIN.includes(k)).map(([k,l])=>{const n=cnt(k);return !n&&tvF!==k?"":`<button data-act="tvf" data-v="${tvF===k?"all":k}" aria-pressed="${tvF===k}">${l} ${n}</button>`}).join("")}${[["M",`Nam ${gc("M")}`],["F",`Nữ ${gc("F")}`]].map(([v,l])=>`<button data-act="tvg" data-v="${tvG===v?"":v}" aria-pressed="${tvG===v}">${l}</button>`).join("")}</div>
    <div class="tvsort"><span>Xếp theo: <button class="lnk" data-act="tvsort">${tvSort==="nm"?"Tên A–Z":"Rating"} ▾</button></span><span>${L.length} người</span></div>
    ${tvF==="btc"?`<small class="rule">Mở một người để giao hoặc thu quyền Quản lý, Trọng tài. Người cần đã liên kết Zalo.</small>`:""}`;
  h+=L.length?`<div class="tvlist">${L.map(p=>{const on=p.active!==false;
    return `<div class="tvrow"><button class="tvm" data-act="tvsel" data-id="${p.id}"><span class="tvav">${av(p,"md",1)}${on?`<i class="dot"></i>`:""}</span>
      <span class="t"><span class="n"><b>${esc(p.name)}</b><small class="${p.gender==="F"?"f":"m"}">${p.gender==="F"?"Nữ":"Nam"}</small></span><span class="tags">${tvTags(D,p,I)}</span></span>
      <span class="r"><b class="num">${r2(D.st.get(p.id).rating)}</b><small>rating</small></span></button></div>`}).join("")}</div>`
    :`<div class="empty"><strong>${D.players.length?"Không có ai khớp":"Chưa có thành viên"}</strong>${D.players.length?"Đổi bộ lọc hoặc từ khoá.":"Bấm “＋ Thêm thành viên” để thêm người."}</div>`;
  h+=`<small class="rule">Chạm một người để xem nhanh tiền, quyền, ghi chú.</small>`;
  h+=`<button class="tvfab" data-act="tvadd">＋ Thêm thành viên</button>`;
  return h+tvSheet(D,I,busy)+rrPanel();
}
// Bảng xem nhanh một người (trượt từ dưới lên)
function tvSheet(D,I,busy){
  const p=tvSel&&D.pmap.get(tvSel);if(!p)return "";
  const st=D.st.get(p.id)||{},on=p.active!==false,b=busy.has(p.id);
  return `<div class="mxdim" data-act="tvselx"></div><div class="mxsheet dhsh tvsh" role="dialog" aria-label="${esc(p.name)}"><span class="grab"></span>
    <div class="tvshh">${av(p,"md",1)}<span class="t"><b>${esc(p.name)}</b><span class="tags">${tvTags(D,p,I)}</span></span><span class="r"><b class="num">${r2(st.rating||0)}</b><small>${st.g||0} trận</small></span></div>
    ${p.hold?"":`<button class="gbopt" data-act="att" data-id="${p.id}" aria-pressed="${on}" ${b?"disabled":""}><span><b>Có mặt hôm nay</b><br><small class="rule">${b?"Đang trên sân":on?"Được xếp trận":"Không xếp trận"}</small></span>${gbSw(on)}</button>`}
    ${tvMgr(D,p)}
    <div class="two"><button class="line" data-act="tvselx">Đóng</button><a class="btn-line" href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}">Hồ sơ đầy đủ ›</a></div></div>`;
}
// Trang thêm thành viên: link mời Zalo, thêm nhanh nhiều người, chuyển VĐV ngoài CLB thành thành viên
function qrSvgText(t,px=96){let q;try{q=qrcode(0,"M");q.addData(t);q.make()}catch(e){return ""}
  const n=q.getModuleCount(),m=2,N=n+2*m;let d="";for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))d+=`M${c+m} ${r+m}h1v1h-1z`;
  return `<svg class="vqr" viewBox="0 0 ${N} ${N}" width="${px}" height="${px}" shape-rendering="crispEdges" role="img" aria-label="Mã QR"><rect width="${N}" height="${N}" fill="#fff"/><path d="${d}" fill="#000"/></svg>`}
function tvAddPage(D){
  const away=D.players.filter(p=>p.active===false),G=D.players.filter(p=>p.guest).sort((a,b)=>(D.all.get(b.id)?.ses.size||0)-(D.all.get(a.id)?.ses.size||0)),link=miniLink(CID);
  let h=`<div class="tvhd"><button class="gdback" data-act="tvadd" aria-label="Quay lại">‹</button><b>Thêm thành viên</b></div>`;
  h+=`<section class="tvsec hl"><h3>① Gửi link mời vào nhóm Zalo <em>NHANH NHẤT</em></h3><p class="rule">Người chơi bấm link, chọn tên mình trong CLB (hoặc tạo mới). Bạn duyệt một lần là xong: họ tự đăng ký giải, check-in, xem rating.</p>
    <div class="tvinv">${qrSvgText(link,104)}<span><button class="primary wide" data-act="tvshare">GỬI VÀO NHÓM ZALO</button><button class="line wide" data-act="cp" data-v="${esc(link)}">COPY LINK</button></span></div></section>`;
  h+=`<section class="tvsec"><h3>② Thêm nhanh nhiều người</h3>${addPanel(D,away)}<small class="rule">Mỗi dòng một người. Ghi giới tính sau dấu |, ví dụ “Hà | nữ”.</small></section>`;
  if(G.length)h+=`<section class="tvsec"><h3>③ Từ VĐV ngoài CLB đã từng chơi</h3>${G.slice(0,30).map(p=>{const A=D.all.get(p.id);return `<div class="tvg">${av(p,"sm",1)}<span class="t"><b>${esc(p.name)}</b><small>${A?.ses.size||0} giải đấu · rating ${r2(D.st.get(p.id).rating)}</small></span><button class="line sm" data-act="tvmem" data-id="${p.id}">+ Thành viên</button></div>`}).join("")}</section>`;
  return h;
}
/* ----- Quyền trong CLB: giao Quản lý / Trọng tài cho người đã liên kết Zalo ----- */
const TV_ROLES=[["","Người chơi"],["scorer","Trọng tài"],["admin","Quản lý"]];
function tvRoleBox(D,p,I){
  const r=tvRole(p,I);
  let h=`<div class="tvbox"><div class="tvbh"><h3>Quyền trong CLB</h3><b class="tvrb ${r||"pl"}">${r?ROLE_LB[r]:"Người chơi"}</b></div>`;
  if(r==="owner")h+=`<p class="rule">Chủ CLB. Không đổi được quyền của chủ CLB.</p>`;
  else if(!p.zuid)h+=`<p class="rule">${esc(p.name)} chưa liên kết Zalo nên chưa giao quyền thẳng được. Gửi link mời: họ bấm trong Zalo là nhận quyền.</p><div class="two"><button class="line" data-act="inv" data-v="admin">Link mời quản lý</button><button class="line" data-act="inv" data-v="scorer">Link mời trọng tài</button></div>${invBox()}`;
  else h+=`<div class="seg segw tvrole">${TV_ROLES.map(([v,l])=>`<button data-act="tvrole" data-id="${p.id}" data-v="${v}" aria-pressed="${r===v}">${l}</button>`).join("")}</div>
    <small class="rule">Quản lý: sửa mọi thứ trừ gỡ chủ CLB. Trọng tài: chỉ nhập tỉ số ở sân được giao. Người được giao thấy quyền mới khi mở lại Pikeco trong Zalo.</small>`;
  return h+`</div>`;
}
/* ----- Hồ sơ (ban tổ chức xem): tiền, ghi chú nội bộ, tạm nghỉ ----- */
const tvNotes={};
function tvMgr(D,p){
  if(!canWrite||legacy||!isAdm()||(MINI&&mxMode()==="choi"))return "";
  const I=tvInfo(D),dts=debts().filter(x=>x.id===p.id),mf=I.mf&&!p.guest,cur=I.cur,keys=[cur,mfPrev(cur),mfPrev(mfPrev(cur))];
  const tot=dts.reduce((a,x)=>a+x.k,0)+(mf&&!p.hold?keys.filter(k=>k===cur&&!mfPaid(p.id,k)).length*(+mfCfg().k||0):0);
  if(tvNotes[p.id]===undefined&&window.FB){tvNotes[p.id]=null;FB.getDoc(FB.doc(FB.fs,PFX+"notes/"+p.id)).then(s=>{tvNotes[p.id]=s.exists()?s.data():{};render()}).catch(()=>{tvNotes[p.id]={}})}
  const N=tvNotes[p.id]||{};
  let h=`<section class="tvmgr"><div class="tvmh"><b>Ban tổ chức</b><small>Chỉ quản lý thấy phần này</small></div>`;
  h+=tvRoleBox(D,p,I);
  h+=`<div class="tvbox"><div class="tvbh"><h3>Tiền</h3>${tot?`<b class="neg">Đang nợ ${fmtK(tot)}</b>`:`<b class="pos">Không nợ</b>`}</div>`;
  if(mf)h+=keys.map(k=>{const ok=mfPaid(p.id,k);return `<div class="tvli"><span class="t">Phí thành viên ${mfLb(k)}<small>${fmtK(mfCfg().k)}${k===cur?` · hạn ngày ${mfCfg().due}`:""}</small></span>${ok?`<button class="ghost sm pos" data-act="mfpaid" data-id="${p.id}" data-v="${k}">✓ đã đóng</button>`:`<button class="primary sm" data-act="mfpaid" data-id="${p.id}" data-v="${k}">ĐÃ THU</button>`}</div>`}).join("");
  h+=dts.map(x=>`<div class="tvli"><span class="t">Giải đấu #${x.sid}<small>còn nợ ${fmtK(x.k)}</small></span><button class="primary sm" data-act="paid" data-id="${x.sid}" data-p="${p.id}">ĐÃ NHẬN</button></div>`).join("");
  if(!mf&&!dts.length)h+=`<p class="rule">Không có khoản nào cần thu.</p>`;
  if(tot)h+=`<button class="line wide" data-act="tvremind" data-id="${p.id}">💬 Nhắc ${esc(p.name)} qua Zalo</button>`;
  else if(MINI&&zidOfP(p))h+=`<button class="line wide" data-act="zchat" data-v="${esc(zidOfP(p))}" data-n="${esc(p.name)}">💬 Nhắn tin cho ${esc(p.name)}</button>`;
  h+=`</div>`;
  h+=`<div class="tvbox"><h3>Ghi chú nội bộ</h3><textarea id="tvn-${p.id}" data-draft="tvn-${p.id}" rows="3" maxlength="500" placeholder="Ví dụ: hay tới trễ, đánh tay trái, đang chấn thương nhẹ…">${esc(val("tvn-"+p.id,N.t||""))}</textarea>
    <div class="tvbh"><small class="rule">${N.at?`Sửa ${dmy(N.at)} · ${esc(N.by||"")}`:"Người chơi không thấy ghi chú này."}</small><button class="line sm" data-act="tvnote" data-id="${p.id}">Lưu ghi chú</button></div></div>`;
  h+=`<div class="tvbox"><button class="gbopt" data-act="tvhold" data-id="${p.id}" aria-pressed="${!!p.hold}"><span><b>Tạm nghỉ dài ngày</b><br><small class="rule">Ẩn khỏi danh sách điểm danh, không tính nợ phí thành viên</small></span>${gbSw(!!p.hold)}</button>
    ${p.guest?`<button class="line wide" data-act="tvmem" data-id="${p.id}">Chuyển thành thành viên CLB</button>`:""}</div>`;
  return h+`</section>`;
}
async function tvAct(act,b,id){
  if(!/^tv/.test(act))return false;
  if(act==="tvf"){tvF=TVF.some(x=>x[0]===b.dataset.v)?b.dataset.v:"all";tvSel=null;render();return true}
  if(act==="tvsel"){tvSel=id||null;render();return true}
  if(act==="tvselx"){tvSel=null;render();return true}
  if(act==="tvg"){tvG=["M","F"].includes(b.dataset.v)?b.dataset.v:"";render();return true}
  if(act==="tvsort"){tvSort=tvSort==="nm"?"rt":"nm";render();return true}
  if(act==="tvadd"){tvAdd=!tvAdd;tvSel=null;render();try{window.scrollTo(0,0)}catch(e){}return true}
  if(!canWrite)return true;
  if(act==="tvshare"){await shareOut({title:"Mời vào CLB",text:`🏓 Mời mọi người tham gia ${CLUB?.name||"CLB"} trên Pikeco (Zalo): chọn tên của mình, đăng ký giải đấu, xem rating.`,path:"/"+CID,miniOnly:true});return true}
  const D=derive(),p=D.pmap.get(id);if(!p)return true;
  if(act==="tvrole"){const v=["admin","scorer"].includes(b.dataset.v)?b.dataset.v:"",I=tvInfo(D),cur=tvRole(p,I);
    if(!p.zuid||cur==="owner"||cur===v)return true;if(!armOr("tvrole:"+id+"|"+v))return true;
    const ref=FB.doc(FB.fs,PFX+"members/"+p.zuid);
    await write(()=>!v?FB.deleteDoc(ref):cur?FB.updateDoc(ref,{role:v}):FB.setDoc(ref,{role:v,name:p.name,via:"zalo",pid:p.id,at:Date.now(),by:who()}),v?`${p.name} là ${ROLE_LB[v]}`:`Đã thu quyền của ${p.name}`);return true}
  if(act==="tvmem"){await write(()=>db.collection("players").doc(id).update({guest:false}),`${p.name} đã là thành viên CLB`);return true}
  if(act==="tvhold"){const on=!p.hold;if(on&&D.playing.some(m=>[...m.a,...m.b].includes(id))){toast("Người này đang trên sân.");return true}
    await write(()=>db.collection("players").doc(id).update(on?{hold:true,active:false}:{hold:false}),on?`${p.name} tạm nghỉ dài ngày`:`${p.name} đã quay lại`);return true}
  if(act==="tvnote"){const t=String(val("tvn-"+id,"")).trim().slice(0,500),d={t,at:Date.now(),by:who()};
    await write(()=>FB.setDoc(FB.doc(FB.fs,PFX+"notes/"+id),d),"Đã lưu ghi chú");tvNotes[id]=d;delete drafts["tvn-"+id];render();return true}
  if(act==="tvremind"){const I=tvInfo(D),dts=debts().filter(x=>x.id===id),L=[];
    if(I.mfNo(p))L.push(`phí thành viên ${mfLb(I.cur)} ${fmtK(mfCfg().k)}`);for(const x of dts)L.push(`giải đấu #${x.sid} ${fmtK(x.k)}`);
    const txt=`Chào ${p.name} 👋 ${CLUB?.name||"CLB"} nhắc nhẹ: bạn còn ${L.join(", ")}. Mở Pikeco › Tôi để quét mã QR chuyển khoản nhé. Cảm ơn bạn!\n${miniPathOf(pathOf("app",{tab:"toi"}))}`;
    if(MINI&&zidOfP(p)&&await zChat(zidOfP(p),txt))return true;
    await sendText(txt,"Đã copy lời nhắc, gửi riêng qua Zalo");return true}
  return false;
}
