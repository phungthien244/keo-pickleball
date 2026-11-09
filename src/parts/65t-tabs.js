/* ---------- Mini App · khung 5 tab (Tìm · Lịch · ＋ · Tin · Tôi) — canvas trang "Hệ sinh thái · Lịch đánh" ----------
   MXT: tab đang mở (null = đang ở một trang tổ chức / trang con). Mở app không kèm link → Lịch (hoặc Tìm nếu chưa có gì).
   Mở bằng link trang tổ chức (?clb=) → vào thẳng trang đó như trước. */
let MXT=null,mxTS=[],mxO="lich",mtSeg="tg",mtTyp="all",mtPlusWant=false,mtBusy=false;
const MT_T={tim:"Lịch đánh gần bạn",lich:"Lịch đánh của tôi",tin:"Tin",toi:"Tôi",tao:"Tạo lịch đánh"};
const MT_LOAI={s:["SOCIAL","s"],m:["MINI GAME","m"],g:["GIẢI","g"]};
// Loại lịch đánh: lưu ở sched.loai; lịch cũ suy ra từ thể thức
const xLoai=x=>{x=x||{};if(MT_LOAI[x.loai])return x.loai;return !x.fmt||x.fmt==="xoay"?"s":"g"};
const mtBadge=x=>{const [t,k]=MT_LOAI[xLoai(x)];return `<span class="mtty ${k}">${t}</span>`};
(function mtInit(){
  if(!MINI)return;let ss=null,so=null;
  try{ss=sessionStorage.getItem("pb-mxt");so=sessionStorage.getItem("pb-mxo");sessionStorage.removeItem("pb-mxt")}catch(e){}
  if(so&&MT_T[so])mxO=so;
  const q=/[?&]clb=/.test(location.search||""),h=String(location.hash||"").slice(1);
  if(ss)MXT=ss==="-"?null:ss;else if(!q&&!h)MXT=MODE==="club"?"lich":"tim";
  if(MXT){mxO=MXT;try{mxModeV="choi"}catch(e){}}
})();
const mtKeep=t=>{try{sessionStorage.setItem("pb-mxt",t);sessionStorage.setItem("pb-mxo",mxO)}catch(e){}};
function mtTab(t){
  MXT=t;mxSheet=null;if(t!=="tao")mxO=t;mxTS=[];
  if(MODE==="club"&&typeof mxMgr==="function"&&mxMgr())mxSetMode("choi");
  if(t==="tin")mtSeen();
  try{scrollTo({top:0})}catch(e){}render();
}
// Thanh dưới 5 nút: ＋ nằm chính giữa
function mtNav(D){
  const cur=MXT||mxO,n=mtNew(D);
  const it=(k,ic,lb,b="")=>`<a class="${cur===k?"on":""}" href="#" data-act="mtab" data-v="${k}">${mxSvg(ic)}<span>${lb}</span>${b}</a>`;
  return `<nav class="mxnav n5">${it("tim","find","Tìm")}${it("lich","hist","Lịch")}<a class="mtplus${cur==="tao"?" on":""}" href="#" data-act="mtplus" aria-label="Tạo lịch đánh"><i aria-hidden="true">＋</i><span>Tạo</span></a>${it("tin","bell","Tin",n?`<i class="mxbadge">${n>9?"9+":n}</i>`:"")}${it("toi","me","Tôi")}</nav>`;
}
const mtWrap=(t,body,right="",D=null)=>mxHeadP(esc(t),right)+`<div class="mxbody mt">${body}</div>`+mtNav(D)+mxSheetHtml();

/* ----- Lịch tôi tham gia ở mọi trang tổ chức (đọc regs của tôi + lịch tương ứng) ----- */
let MR=null,MRrun=false;
function mtClubIds(){return [...new Set([...(MODE==="club"&&!legacy?[CID]:[]),...myClubs().map(c=>c.id)])].slice(0,12)}
async function loadMyRegs(force){
  if((MRrun&&!force)||!authUser||authUser.isAnonymous||!window.FB)return;MRrun=true;
  const out=[],nm=c=>(c===CID&&CLUB&&CLUB.name)||(myClubs().find(z=>z.id===c)||{}).name||c;
  await Promise.all(mtClubIds().map(async c=>{try{
    const q=await FB.getDocs(FB.query(FB.collection(FB.fs,`clubs/${c}/regs`),FB.where("uid","==",authUser.uid)));
    await Promise.all(q.docs.map(async d=>{const r=d.data();if(!r||r.cancel||typeof r.sid!=="string")return;
      const s=await FB.getDoc(FB.doc(FB.fs,`clubs/${c}/sched/${r.sid}`));if(!s.exists())return;
      out.push({c,cn:nm(c),x:{id:s.id,...s.data()},r:{...r,id:d.id}})}))}catch(e){}}));
  MR=out;render();
}
// Trang đang mở dùng dữ liệu trực tiếp (mới nhất); trang khác dùng bản đã tải
function mtMine(){
  const L=(MR||[]).filter(z=>!(MODE==="club"&&z.c===CID));
  if(MODE==="club"&&!legacy&&authUser){for(const r of (S.regs||[]))if(r.uid===authUser.uid&&!r.cancel&&typeof r.sid==="string"){const x=schedById(r.sid);if(x)L.push({c:CID,cn:(CLUB&&CLUB.name)||CID,x,r})}}
  return L.sort((a,b)=>(a.x.at||0)-(b.x.at||0));
}
const mtWhen=t=>t?`${dowVN(t)} ${new Date(t).getDate()}/${new Date(t).getMonth()+1} · ${hm(t)}`:"Chưa đặt giờ";
const mtFee=x=>+(x.cp===false?0:(x.fee||0));
function mtPay(z){const p=z.r.pay||"none",k=mtFee(z.x);
  if(p==="ok")return ["Đã trả ✓","ok"];if(p==="sent")return ["Chờ xác nhận phí",""];if(k>0)return [`Chưa trả ${fmtK(k)}`,"w"];return ["Đã đăng ký ✓","ok"]}
const mtGo=(c,x)=>`data-act="miniclub" data-id="${esc(c)}"${x?` data-x="${esc(x)}"`:""}`;
function mtRow(z){const [st,cl]=mtPay(z);
  return `<button class="mtrow" ${mtGo(z.c,z.x.id)}><span class="t">${mtBadge(z.x)}<b>${esc(xName(z.x))}</b><small>${esc(mtWhen(z.x.at))}${z.x.place?` · ${esc(z.x.place)}`:""}</small><small class="org">${esc(z.cn)}</small></span><em class="${cl}">${esc(st)}</em></button>`}

/* ----- Tab Lịch ----- */
function mtLich(D){
  loadMyRegs();
  const seg=`<div class="mtseg" role="group">${[["tg","Tôi tham gia"],["tc","Tôi tổ chức"+(mtOrgN()?` · ${mtOrgN()}`:"")]].map(([k,l])=>`<button data-act="mtseg" data-v="${k}" aria-pressed="${mtSeg===k}">${l}</button>`).join("")}</div>`;
  if(mtSeg==="tc")return mtWrap(MT_T.lich,seg+mtOrg(D),"",D);
  const now=Date.now(),A=mtMine(),day=new Date(now);day.setHours(23,59,59,999);
  const up=A.filter(z=>(z.x.at||0)>now-4*3600e3),past=A.filter(z=>(z.x.at||0)<=now-4*3600e3).slice(-3).reverse();
  let h=seg;
  // Đang đánh ở trang đang mở: một chạm vào sân
  if(D&&MODE==="club"&&phaseOf(D)==="live"){const p=mxMe(D);if(p&&p.active!==false)h+=`<a class="mttoday live" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"><span class="cap">● Đang đánh · ${esc((CLUB&&CLUB.name)||"")}</span><b>${esc(sessTitle(D.c,D.sid))}</b><span>${D.playing.length} sân đang đánh · xem sân của bạn ›</span></a>`+mxTurn(D)}
  const td=up.filter(z=>z.x.at&&z.x.at<=day.getTime());
  for(const z of td){const left=Math.max(0,Math.round((z.x.at-now)/60e3));
    h+=`<button class="mttoday" ${mtGo(z.c,z.x.id)}><span class="cap">Hôm nay${left>0?` · còn ${left>=60?Math.floor(left/60)+" giờ":left+" phút"}`:""}</span><b>${esc(xName(z.x))}</b><span>${hm(z.x.at)}${z.x.place?` · ${esc(z.x.place)}`:""} · ${esc(mtPay(z)[0])}</span><i>Mở vé của bạn ›</i></button>`}
  const rest=up.filter(z=>!td.includes(z));
  if(rest.length)h+=`<span class="mxsec">Sắp tới</span>`+rest.map(mtRow).join("");
  if(past.length)h+=`<span class="mxsec">Đã chơi</span>`+past.map(z=>`<button class="mtrow" ${mtGo(z.c,z.x.id)}><span class="t">${mtBadge(z.x)}<b>${esc(xName(z.x))}</b><small>${esc(mtWhen(z.x.at))} · ${esc(z.cn)}</small></span><em class="lk">Xem ›</em></button>`).join("");
  if(!up.length&&!past.length&&!(D&&phaseOf(D)==="live"))h+=MR===null&&authUser&&!authUser.isAnonymous?`<div class="mxcard sk-card" aria-hidden="true"><span class="sk" style="height:14px;width:60%"></span><span class="sk" style="height:10px;width:40%"></span></div>`
    :`<div class="mtempty"><b>Bạn chưa đăng ký lịch đánh nào</b><span>Tìm social, mini game hay giải quanh bạn rồi đăng ký trong vài chạm.</span><button class="primary wide" data-act="mtab" data-v="tim">Tìm lịch đánh</button></div>`;
  return mtWrap(MT_T.lich,h,"",D);
}
/* Tôi tổ chức: các trang tôi làm chủ/quản lý; trang đang mở hiện từng lịch đánh sắp tới */
const mtMgrHere=()=>MODE==="club"&&!legacy&&(mxAs?mxAs.cw:canWrite);
function mtOrgClubs(){const L=myClubs().filter(c=>/Chủ|Quản lý/.test(c.role||""));if(mtMgrHere()&&!L.some(c=>c.id===CID))L.unshift({id:CID,name:(CLUB&&CLUB.name)||CID,role:ROLE==="owner"?"Chủ":"Quản lý"});return L}
function mtOrgN(){if(!mtMgrHere())return 0;return (typeof schedUp==="function"?schedUp():[]).filter(x=>x.st!=="draft").length}
function mtOrg(D){
  const C=mtOrgClubs();let h="";
  if(mtMgrHere()){const U=schedUp();
    h+=U.length?U.map(x=>{const R=(S.regs||[]).filter(r=>r.sid===x.id&&!r.cancel),n=R.length,max=+x.max||0,un=mtFee(x)>0?R.filter(r=>(r.pay||"none")!=="ok").length:0,pct=max?Math.min(100,Math.round(n*100/max)):0;
      return `<button class="mtorg" data-act="mtql" data-x="${esc(x.id)}"><span class="hd">${mtBadge(x)}<small>${x.st==="draft"?"Nháp · ":""}${esc(mtWhen(x.at))}</small></span><b>${esc(xName(x))}</b>${max?`<span class="mtbar"><i style="width:${pct}%"></i></span>`:""}<span class="kv"><b>${n}${max?`/${max}`:""} người</b><small>${max?(n>=max?"Đã đủ":`Còn ${max-n} chỗ`):"Không giới hạn"}</small></span>${un?`<span class="un">${un} người chưa trả tiền <b>Xem ›</b></span>`:""}</button>`}).join("")
      :`<div class="mtempty"><b>Chưa có lịch đánh sắp tới</b><span>Bấm ＋ ở giữa thanh dưới để tạo.</span></div>`;
    h+=`<button class="line wide" data-act="mtql">Quản lý ${esc((CLUB&&CLUB.name)||"")} ›</button>`}
  const others=C.filter(c=>!(mtMgrHere()&&c.id===CID));
  if(others.length)h+=`<span class="mxsec">${mtMgrHere()?"Trang khác tôi tổ chức":"Trang tôi tổ chức"}</span><div class="mxcard list">${others.map(c=>`<button class="mxli" data-act="mtqlc" data-id="${esc(c.id)}">${clubAv(c,"s40")}<span class="t">${esc(c.name||c.id)}<small>${esc(c.role||"")}</small></span><span>›</span></button>`).join("")}</div>`;
  if(!h)h=`<div class="mtempty"><b>Bạn chưa tổ chức lịch đánh nào</b><span>Ai cũng tổ chức được: social tối thứ 7, mini game cuối tuần hay một giải nhỏ. App lo đăng ký, xếp sân, thu tiền.</span><button class="primary wide" data-act="mtplus">＋ Tạo lịch đánh</button></div>`;
  return h;
}

/* ----- Tab Tìm: một ô gõ, lọc thời gian và loại ----- */
function mtTim(){
  exCacheLoad();if(S.clubsStale&&!clubsLoading){S.clubsStale=false;loadClubs(true)}else loadClubs();loadOpenSess();
  const q=noAcc(String(val("cq",""))).toLowerCase().trim(),f=mxSeg.ex||"all",now=new Date(),endDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime(),wk=d=>[0,6].includes(new Date(d).getDay());
  const O=(mxOpen||[]).filter(x=>(!q||noAcc(`${x.club.name} ${x.club.city||""} ${x.r.place||""} ${x.cf.sname||""}`).toLowerCase().includes(q))&&(f==="all"||(f==="nay"&&x.r.at&&x.r.at<endDay)||(f==="tuan"&&x.r.at&&wk(x.r.at)))&&(mtTyp==="all"||xLoai(x.r)===mtTyp));
  const fb=(v,l)=>`<button data-act="mxseg" data-k="ex" data-v="${v}" aria-pressed="${f===v}">${l}</button>`,tb=(v,l)=>`<button data-act="mttyp" data-v="${v}" aria-pressed="${mtTyp===v}">${l}</button>`;
  let h=`<label class="srch mtsrch"><span class="sr">Tìm lịch đánh</span><input id="cq" data-draft="cq" data-live="1" type="search" placeholder="Tìm theo khu vực, sân, tên…" value="${esc(val("cq",""))}"></label>`;
  h+=`<div class="mxseg sm">${fb("all","Tất cả")}${fb("nay","Hôm nay")}${fb("tuan","Cuối tuần")}</div><div class="mxseg sm mtty-f">${tb("all","Mọi loại")}${tb("g","Giải")}${tb("m","Mini game")}${tb("s","Social")}</div>`;
  h+=!mxOpen?skSess()+skSess():O.map(x=>{const left=x.n==null?null:+x.r.max?Math.max(0,+x.r.max-x.n):null,fee=+(x.r.feeG||((x.cf.thu==="phi")?x.cf.phi:x.r.fee)||0);
    return `<button class="mtcard ${xLoai(x.r)}" id="os-${esc(x.club.id)}-${esc(String(x.x||x.sid||""))}" ${mtGo(x.club.id,x.x)}><span class="hd">${mtBadge(x.r)}${left!=null?`<b class="${left<=3?"w":""}">${left?`Còn ${left} chỗ`:"Hết chỗ"}</b>`:+x.r.max?`<b>${+x.r.max} chỗ</b>`:""}</span><b class="tt">${esc(x.cf.sname||xName(x.r))}</b><span>🗓 ${esc(mtWhen(x.r.at))}${x.r.place?` · 📍 ${esc(x.r.place)}`:""}</span>${fee?`<span>Lệ phí <b>${fmtK(fee)}</b></span>`:""}<span class="org">${clubAv(x.club,"s20")} ${esc(x.club.name)}</span></button>`}).join("");
  if(mxOpen&&!O.length)h+=`<div class="mtempty dash"><b>${q||f!=="all"||mtTyp!=="all"?"Không có lịch đánh phù hợp":"Chưa có lịch đánh nào đang mở"}</b><span>Tự tổ chức một buổi, app lo đăng ký và xếp sân.</span><button class="primary wide" data-act="mtplus">＋ Tạo lịch đánh</button></div>`;
  if(q){const R=publicClubs().filter(c=>noAcc(`${c.name} ${c.city||""} ${c.id}`).toLowerCase().includes(q));
    if(R.length)h+=`<span class="mxsec">Trang tổ chức · ${R.length}</span>`+R.map(clubCard).join("")}
  return mtWrap(MT_T.tim,h);
}

/* ----- Tab Tin: suy ra từ dữ liệu sẵn có ----- */
function mtItems(D){
  const I=[],now=Date.now();
  for(const z of mtMine()){const a=z.x.at||0;if(a<now||a>now+48*3600e3)continue;
    I.push({at:a-48*3600e3,ic:"⏰",t:`Sắp tới: ${xName(z.x)}`,s:`${mtWhen(a)}${z.x.place?" · "+z.x.place:""}`,go:mtGo(z.c,z.x.id)});
    const [st,cl]=mtPay(z);if(cl==="w")I.push({at:a-48*3600e3+1,ic:"💸",t:`${st} · ${xName(z.x)}`,s:"Bấm để chuyển khoản",go:mtGo(z.c,z.x.id)})}
  if(D&&MODE==="club"&&mtMgrHere()){
    // Gộp theo lịch đánh: một dòng "+N người" thay vì mỗi người một tin
    const G=new Map();for(const r of (S.regs||[]))if(!r.cancel&&typeof r.sid==="string"&&r.at&&r.at>now-3*864e5){const b=String(r.sid).split("~")[0],x=schedById(b)||schedById(r.sid);if(!x||(x.at||0)<=now)continue;const g=G.get(x.id)||{x,n:0,at:0,last:""};g.n++;if(r.at>=g.at){g.at=r.at;g.last=r.name||""}G.set(x.id,g)}
    for(const g of G.values()){const tot=(S.regs||[]).filter(y=>!y.cancel&&typeof y.sid==="string"&&(y.sid===g.x.id||y.sid.startsWith(g.x.id+"~"))).length;
      I.push({at:g.at,ic:"🙋",t:g.n>1?`${xName(g.x)}: +${g.n} người đăng ký`:`${g.last||"Một người"} đăng ký ${xName(g.x)}`,s:`Tổng ${tot}${+g.x.max?"/"+g.x.max:""} người${g.n>1&&g.last?` · mới nhất ${g.last}`:""}`,go:`data-act="mtql" data-x="${esc(g.x.id)}"`})}
    const pc=typeof pendCount==="function"?pendCount():0;if(pc)I.push({at:Math.max(0,...(S.links||[]).filter(x=>x.status==="pending").map(x=>+x.at||0)),ic:"👋",t:`${pc} người xin vào ${(CLUB&&CLUB.name)||"trang"}`,s:"Duyệt một chạm",go:`data-act="mtqlt" data-v="nguoi"`});
    const ck=typeof ckPending==="function"?ckPending().length:0;if(ck)I.push({at:Math.max(0,...ckPending().map(x=>+x.ci||0)),ic:"🏦",t:`${ck} chuyển khoản chờ xác nhận`,s:"Kiểm tra rồi bấm Đã nhận",go:`data-act="mtql"`})}
  return I.sort((a,b)=>b.at-a.at).slice(0,30);
}
let mtSeenAt=0;try{mtSeenAt=+(localStorage.getItem("pb-tin-seen"))||0}catch(e){}
function mtSeen(){mtSeenAt=Date.now();try{localStorage.setItem("pb-tin-seen",String(mtSeenAt))}catch(e){}}
function mtNew(D){try{return mtItems(D||null).filter(x=>x.at>mtSeenAt).length}catch(e){return 0}}
function mtTin(D){
  loadMyRegs();const I=mtItems(D);
  const h=I.length?`<div class="mxcard list">${I.map(x=>`<button class="mxli mtin" ${x.go}><i aria-hidden="true">${x.ic}</i><span class="t">${esc(x.t)}<small>${esc(x.s)}</small></span><span>›</span></button>`).join("")}</div>`
    :`<div class="mtempty"><b>Chưa có tin mới</b><span>Nhắc lịch sắp tới, người đăng ký, chuyển khoản… sẽ hiện ở đây.</span></div>`;
  return mtWrap(MT_T.tin,h,"",D);
}

/* ----- Tab Tôi ----- */
let mtRen=false,mtLvEd=false;
function mtMyName(){const id=S.myClub;if(!id)return "";if(MODE==="club"&&CID===id&&CLUB)return CLUB.name||"";
  const c=(S.clubs||[]).find(z=>z.id===id)||myClubs().find(z=>z.id===id);if(c&&c.name)return c.name;
  if(!mtMyName.ld){mtMyName.ld=1;FB.getDoc(FB.doc(FB.fs,"clubs/"+id)).then(x=>{if(x.exists()){const L=myClubs().filter(z=>z.id!==id);L.unshift({id,name:x.data().name,role:"Chủ"});try{localStorage.setItem("pb-mini-clubs",JSON.stringify(L.slice(0,10)))}catch(e){}render()}}).catch(()=>{})}
  return ""}
async function mtRename(){
  const id=S.myClub,v=String(val("mt-nm",mtMyName())).trim().replace(/\s+/g," ");
  if(v.length<3){errs.mtn="Tên cần ít nhất 3 chữ.";render();return}
  if(typeof tcBadName==="function"&&tcBadName(v)){errs.mtn="Tên này chưa phù hợp, đặt tên khác nhé.";render();return}
  try{await FB.updateDoc(FB.doc(FB.fs,"clubs/"+id),{name:v.slice(0,60)});
    if(MODE==="club"&&CID===id&&CLUB)CLUB.name=v;const c=(S.clubs||[]).find(z=>z.id===id);if(c)c.name=v;
    try{const L=myClubs().filter(z=>z.id!==id);L.unshift({id,name:v,role:"Chủ"});localStorage.setItem("pb-mini-clubs",JSON.stringify(L.slice(0,10)))}catch(e){}
    delete drafts["mt-nm"];delete errs.mtn;mtRen=false;toast("Đã đổi tên trang");render()}
  catch(e){errs.mtn="Chưa đổi được tên, thử lại.";render()}
}
function mtToi(D){
  const P=zaloProf(),nm=String(P.n||"").trim(),p=D&&MODE==="club"?mxMe(D):null,C=myClubs();
  if(S.myClub===undefined&&isZaloU(authUser))loadMyClub();
  let h=(typeof dbgCard==="function"?dbgCard():"");
  h+=`<div class="mtme">${P.p?`<img class="mxav" src="${esc(P.p)}" alt="">`:`<span class="mxav">${nm?esc(nm.charAt(0).toUpperCase()):mxSvg("me")}</span>`}<span class="t"><b>${esc(nm||(p&&p.name)||"Người dùng Zalo")}</b><small>Tài khoản Zalo · đã xác minh ✓</small></span></div>`;
  const li=(a,i,t,s)=>`<${a.startsWith("href")?"a":"button"} class="mxli" ${a}><i aria-hidden="true">${i}</i><span class="t">${t}${s?`<small>${s}</small>`:""}</span><span>›</span></${a.startsWith("href")?"a":"button"}>`;
  // Thành tích thật thay cho rating (canvas B04)
  if(p){const A=lvAch(D,p.id);
    h+=`<div class="mtst"><span><b>${A.ses}</b><small>buổi đã chơi</small></span><span><b>${A.games}</b><small>trận</small></span><span><b>${A.gold}</b><small>lần vô địch</small></span></div>`;
    if(A.T.length)h+=`<span class="mxsec">Thành tích</span><div class="mxcard list">${A.T.slice(0,5).map(x=>`<div class="mxli"><i aria-hidden="true">${x.m===1?"🏆":"🥈"}</i><span class="t">${x.m===1?"Vô địch":"Á quân"} · ${esc(x.t)}<small>${esc((CLUB&&CLUB.name)||"")}${x.at?" · "+dmy(x.at):""}</small></span></div>`).join("")}</div>`}
  const lv=myLv();
  h+=`<div class="mxcard list">`
    +(mtLvEd?`<div class="mtren">${lvPick("mt-lv")}<span class="two"><button class="ghost" data-act="mtlvx">Huỷ</button><button class="primary" data-act="mtlvok">✓ Lưu trình</button></span></div>`
      :`<div class="mxli"><i aria-hidden="true">🎚</i><span class="t">Trình của tôi: ${lv?lvName(lv):"chưa chọn"}<small>Chỉ bạn thấy · dùng để ghép cặp cân sức</small></span><button class="mxsm" data-act="mtlv">${lv?"Sửa":"Chọn"}</button></div>`)
    +(p?li(`href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"`,"📜","Lịch sử trận",`${D.all.get(p.id).g} trận`)+li(`href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}"`,"👤","Hồ sơ, sửa ảnh",""):"")
    +li(`data-act="mxsheet"`,"⭐","Trang tổ chức đã tham gia",C.length?`${C.length} trang`:"Chưa có")+`</div>`;
  h+=`<span class="mxsec">Tôi tổ chức</span><div class="mxcard list">`;
  if(S.myClub){const nm=mtMyName();
    h+=mtRen?`<div class="mtren"><label class="fld"><span class="lbl">Tên trang tổ chức</span><input id="mt-nm" data-draft="mt-nm" maxlength="60" placeholder="VD: Pickleball Q7 tối thứ 7" value="${esc(val("mt-nm",nm))}"></label>${errs.mtn?`<p class="err">${esc(errs.mtn)}</p>`:""}<span class="two"><button class="ghost" data-act="mtrenx">Huỷ</button><button class="primary" data-act="mtrenok">✓ Lưu tên</button></span></div>`
      :`<div class="mxli"><i aria-hidden="true">🏟</i><span class="t">${esc(nm||"Trang tổ chức của tôi")}<small>Người chơi thấy tên này trong Tìm và Lịch</small></span><button class="mxsm" data-act="mtren">Đổi tên</button></div>`;
    h+=li(`data-act="mtqlc" data-id="${esc(S.myClub)}"`,"⚙","Quản lý trang","Ảnh bìa, tài khoản nhận tiền, người cùng tổ chức")}
  const co=mtOrgClubs().filter(c=>c.id!==S.myClub);
  for(const c of co)h+=li(`data-act="mtqlc" data-id="${esc(c.id)}"`,"🤝",esc(c.name||c.id),`Cùng tổ chức · ${esc(c.role||"Quản lý")}`);
  if(!S.myClub&&!co.length)h+=li(`data-act="mtplus"`,"＋","Tạo lịch đánh đầu tiên","App tự lập trang tổ chức cho bạn, không cần duyệt");
  h+=`</div>`;
  h+=`<div class="mxcard list">${mxInvBtn()}<button class="mxli" data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}"><span class="t">Điều khoản sử dụng</span><span>↗</span></button>${MODE==="club"&&S.link?`<button class="mxli" data-act="mxleave"><span class="t" style="color:var(--lose)">${armed("mxleave:x")?`Bấm lần nữa: rời ${esc((CLUB&&CLUB.name)||"trang")} và xoá thông tin của tôi`:`Rời ${esc((CLUB&&CLUB.name)||"trang này")}`}</span></button>`:""}</div>`;
  return mtWrap(MT_T.toi,h,"",D);
}

/* ----- ＋ Tạo lịch đánh: chưa có trang → chọn loại ở đây, app tự lập trang rồi vào khung trò chuyện ----- */
function mtTao(){
  if(isZaloU(authUser)&&S.myClub===undefined)loadMyClub();
  const nm=String(zaloProf().n||"").trim();
  let h=`<b class="tgt">Tổ chức một buổi chơi trong 1 phút</b><small class="rule">Chọn loại, AI hỏi vài câu bằng nút bấm. App tự lập trang tổ chức cho bạn, không cần chờ duyệt.</small>`;
  if(!nm)h+=`<label class="fld"><span class="lbl">Tên của bạn</span><input id="mt-me" data-draft="mt-me" maxlength="30" autocomplete="name" placeholder="Tên hiện trên trang tổ chức" value="${esc(val("mt-me",""))}"></label>`;
  h+=TN_FC.map(([k,ic,t,s,f,l])=>`<button class="tgfc ${l}" data-act="mtnew" data-v="${k}"${mtBusy?" disabled":""}><i aria-hidden="true">${ic}</i><span><b>${t}</b><small>${s}</small><em>${f}</em></span><span aria-hidden="true">›</span></button>`).join("");
  if(errs.mt)h+=`<p class="err">${esc(errs.mt)}</p>`;
  if(mtBusy)h+=`<p class="rule">Đang lập trang tổ chức…</p>`;
  return mtWrap(MT_T.tao,h);
}
async function mtAutoClub(){
  if(MINI&&!isZaloU(authUser)){const ok=await miniLogin();if(!ok)throw new Error("login")}
  const u=authUser,zp=zaloProf(),me=String(zp.n||val("mt-me","")).trim().slice(0,40);if(me.length<2)throw new Error("name");
  const name=`Trang của ${me}`.slice(0,60),base=(slugOf(me)||"nguoi").slice(0,14).replace(/-+$/,"");
  let slug="";for(let i=0;i<3&&!slug;i++){const s=`${base}-${Math.random().toString(36).slice(2,6)}`;if(!(await FB.getDoc(FB.doc(FB.fs,"clubs/"+s))).exists())slug=s}
  if(!slug)throw new Error("slug");
  const now=Date.now(),b=FB.writeBatch(FB.fs);
  b.set(FB.doc(FB.fs,"clubs/"+slug),{name,public:true,owner:u.uid,status:"active",city:"",size:"",createdAt:now});
  b.set(FB.doc(FB.fs,"clubs/"+slug+"/private/info"),{contact:"",ownerEmail:u.email||""});
  b.set(FB.doc(FB.fs,"clubs/"+slug+"/members/"+u.uid),{role:"owner",name:me,via:"zalo",at:now});
  b.set(FB.doc(FB.fs,"users/"+u.uid),{club:slug,at:now});
  await b.commit();S.myClub=slug;
  try{const L=myClubs().filter(x=>x.id!==slug);L.unshift({id:slug,name,role:"Chủ"});localStorage.setItem("pb-mini-clubs",JSON.stringify(L.slice(0,10)))}catch(e){}
  if(typeof notifyEmail==="function")notifyEmail({club_name:name,club_link:clubUrl(slug),club_slug:slug,owner_email:u.email||"",city:"",size:"",contact:"",status:"Tự lập khi tạo lịch đánh",admin_link:absUrl("/quan-tri")});
  return slug;
}
// Vào khung tạo lịch đánh của trang tôi tổ chức (đang mở trang đó thì vào luôn, không thì mở trang rồi vào)
function mtOpenTao(slug,v){
  if(MODE==="club"&&CID===slug&&canWrite&&!legacy){mxSetMode("ql");MXT=null;mxTS=[];tnPg="pick";tn=null;tnEd=null;tnG=null;
    if(route!=="app"||tab!=="dk"||routeX)go("app",{tab:"dk"});else render();
    if(v&&TN_FC.some(x=>x[0]===v))setTimeout(()=>tnAct("tnfmt",{dataset:{v}}),0);return}
  try{sessionStorage.setItem("pb-mxplus",v||"1");localStorage.setItem("pb-mxm-"+slug,"ql")}catch(e){}mtKeep("-");quickNext();setPath("/"+slug);location.reload();
}
// Sau khi mở lại đúng trang: chạy tiếp yêu cầu tạo
function mtResume(){
  if(!MINI||MODE!=="club"||legacy||!canWrite)return;let v=null;try{v=sessionStorage.getItem("pb-mxplus");if(v)sessionStorage.removeItem("pb-mxplus")}catch(e){}
  if(v)setTimeout(()=>mtOpenTao(CID,v==="1"?null:v),0);
}
function mtPlus(){
  if(isZaloU(authUser)&&S.myClub===undefined){mtPlusWant=true;loadMyClub();toast("Đang mở…");return}
  if(S.myClub){mtOpenTao(S.myClub);return}
  // Chưa có trang riêng nhưng đang cùng tổ chức trang khác: tạo ở trang đó, không lập trang mới
  if(mtMgrHere()){mtOpenTao(CID);return}
  const m=mtOrgClubs()[0];if(m){mtOpenTao(m.id);return}
  MXT="tao";try{scrollTo({top:0})}catch(e){}render();
}

/* ----- Vẽ tab ----- */
function mtView(D){
  if(mtPlusWant&&S.myClub!==undefined){mtPlusWant=false;setTimeout(mtPlus,0)}
  const t=MXT||"tim";
  if(t==="lich")return mtLich(D);if(t==="tin")return mtTin(D);if(t==="toi")return mtToi(D);if(t==="tao")return mtTao();return mtTim();
}
async function mtAct(act,b,id){
  const v=b.dataset.v;
  if(act==="mtab"){mtTab(MT_T[v]?v:"tim");return true}
  if(act==="mtseg"){mtSeg=v==="tc"?"tc":"tg";render();return true}
  if(act==="mttyp"){mtTyp=MT_LOAI[v]?v:"all";render();return true}
  if(act==="mtplus"){mtPlus();return true}
  if(act==="mtnew"){if(mtBusy)return true;delete errs.mt;mtBusy=true;render();
    try{const slug=S.myClub||await mtAutoClub();mtBusy=false;mtOpenTao(slug,v)}
    catch(e){mtBusy=false;errs.mt=e&&e.message==="name"?"Nhập tên của bạn (ít nhất 2 chữ).":e&&e.message==="login"?"Chưa vào được bằng Zalo, thử lại.":"Chưa lập được trang tổ chức, thử lại sau ít phút.";render()}
    return true}
  if(act==="mtql"){if(!mtMgrHere())return true;mxSetMode("ql");MXT=null;mxTS=[];const x=b.dataset.x;go("app",{tab:"dk",x:x||null});return true}
  if(act==="mtqlt"){if(!mtMgrHere())return true;mxSetMode("ql");MXT=null;mxTS=[];go("app",{tab:v||"dk"});return true}
  if(act==="mtqlc"){if(MODE==="club"&&id===CID&&mtMgrHere()){mxSetMode("ql");MXT=null;mxTS=[];go("app",{tab:"dk"});return true}
    try{localStorage.setItem("pb-mxm-"+id,"ql")}catch(e){}mtKeep("-");quickNext();setPath("/"+id);location.reload();return true}
  if(act==="mtlv"){mtLvEd=true;delete drafts["mt-lv"];render();return true}
  if(act==="mtlvx"){mtLvEd=false;delete drafts["mt-lv"];render();return true}
  if(act==="mtlvok"){const v=lvSnap(drafts["mt-lv"]!=null?drafts["mt-lv"]:(myLv()||"3.0"));await saveMyLv(v);mtLvEd=false;delete drafts["mt-lv"];toast("Đã lưu trình: "+lvName(v));render();return true}
  if(act==="mtren"){mtRen=true;delete drafts["mt-nm"];delete errs.mtn;render();return true}
  if(act==="mtrenx"){mtRen=false;delete errs.mtn;render();return true}
  if(act==="mtrenok"){await mtRename();return true}
  if(act==="mtexit"){mxSetMode("choi");mtTab(mxO||"lich");return true}
  return false;
}
