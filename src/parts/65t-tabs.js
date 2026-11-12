/* ---------- Mini App · khung 5 tab (Tìm · Lịch · ＋ · Tin · Tôi) — canvas trang "Hệ sinh thái · Lịch đánh" ----------
   MXT: tab đang mở (null = đang ở một trang tổ chức / trang con). Mở app không kèm link → Lịch (hoặc Tìm nếu chưa có gì).
   Mở bằng link trang tổ chức (?clb=) → vào thẳng trang đó như trước. */
let mtBankWant=false,MXT=null,mxTS=[],mxO="lich",mtSeg="tg",mtTyp="all",mtPlusWant=false,mtBusy=false;
const MT_T={tim:"Lịch đánh gần bạn",lich:"Lịch đánh của tôi",tin:"Tin",toi:"Tôi",tao:"Tạo lịch đánh"};
const MT_LOAI={s:["Social","s"],m:["Mini game","m"],g:["Giải","g"]};
// Loại lịch đánh: lưu ở sched.loai; lịch cũ suy ra từ thể thức
const xLoai=x=>{x=x||{};if(MT_LOAI[x.loai])return x.loai;return !x.fmt||x.fmt==="xoay"?"s":"g"};
const mtBadge=x=>{const [t,k]=MT_LOAI[xLoai(x)];return zTag(t,k)};
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
  return `<nav class="mxnav n5">${it("tim","find","Tìm")}${it("lich","hist","Lịch")}<a class="mtplus${cur==="tao"?" on":""}" href="#" data-act="mtplus" aria-label="Tạo lịch đánh"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg><span>Tạo</span></a>${it("tin","bell","Tin",n?`<i class="mxbadge">${n>9?"9+":n}</i>`:"")}${it("toi","me","Tôi")}</nav>`;
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
  return zRow({lead:zDate(z.x.at),top:mtBadge(z.x),t:esc(xName(z.x)),s:`${hm(z.x.at||0)}${z.x.place?` · ${esc(z.x.place)}`:""} · ${esc(z.cn)}`,m:`<span style="color:${cl==="w"?"#c4170f":cl==="ok"?"#1c7a3f":"var(--ink)"}">${esc(st)}</span>`,chev:true,cls:"ev",attrs:mtGo(z.c,z.x.id)})}

/* ----- Tab Lịch ----- */
function mtLich(D){
  loadMyRegs();
  const seg=`<div class="mtseg" role="tablist">${[["tg","Tôi tham gia"],["tc","Tôi tổ chức"+(mtOrgN()?` · ${mtOrgN()}`:"")]].map(([k,l])=>`<button role="tab" data-act="mtseg" data-v="${k}" aria-pressed="${mtSeg===k}">${l}</button>`).join("")}</div>`;
  if(mtSeg==="tc")return mtWrap(MT_T.lich,seg+mtOrg(D),"",D);
  const now=Date.now(),A=mtMine(),day=new Date(now);day.setHours(23,59,59,999);
  const up=A.filter(z=>(z.x.at||0)>now-4*3600e3),past=A.filter(z=>(z.x.at||0)<=now-4*3600e3).slice(-3).reverse();
  let h=seg;
  // Đang đánh ở trang đang mở: một chạm vào sân
  if(D&&MODE==="club"&&pLive(D)){const p=mxMe(D);if(p&&p.active!==false)h+=zSec("",zRow({lead:zIco("live"),top:`<span class="ztag r"><i class="dot"></i>Đang đánh</span>`,t:esc(sessTitle(D.c,D.sid)),s:`${esc((CLUB&&CLUB.name)||"")} · ${D.playing.length} sân đang đánh`,right:zPill("Xem sân","p"),cls:"b",attrs:`href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san"`}))+mxTurn(D)}
  const td=up.filter(z=>z.x.at&&z.x.at<=day.getTime());
  if(td.length)h+=zSec("Hôm nay",td.map(z=>{const left=Math.max(0,Math.round((z.x.at-now)/60e3));
    return zRow({lead:zDate(z.x.at,true),top:mtBadge(z.x),t:esc(xName(z.x)),s:`${hm(z.x.at)}${z.x.place?` · ${esc(z.x.place)}`:""}${left>0?` · còn ${left>=60?Math.floor(left/60)+" giờ":left+" phút"}`:""}`,m:esc(mtPay(z)[0]),right:zPill("Mở vé","p"),cls:"ev",attrs:mtGo(z.c,z.x.id)})}).join(""));
  const rest=up.filter(z=>!td.includes(z));
  if(rest.length)h+=zSec("Sắp tới",rest.map(mtRow).join(""));
  if(past.length)h+=zSec("Đã chơi",past.map(z=>zRow({lead:zDate(z.x.at),t:esc(xName(z.x)),s:`${esc(mtWhen(z.x.at))} · ${esc(z.cn)}`,chev:true,cls:"ev",attrs:mtGo(z.c,z.x.id)})).join(""));
  if(!up.length&&!past.length&&!(D&&pLive(D)))h+=MR===null&&authUser&&!authUser.isAnonymous?`<div class="mxcard sk-card" aria-hidden="true"><span class="sk" style="height:14px;width:60%"></span><span class="sk" style="height:10px;width:40%"></span></div>`
    :zSec("",`<div class="zempty"><b>Bạn chưa đăng ký lịch đánh nào</b><small>Tìm social, mini game hay giải quanh bạn rồi đăng ký trong vài chạm.</small><button class="primary" data-act="mtab" data-v="tim">Tìm lịch đánh</button></div>`);
  return mtWrap(MT_T.lich,h,"",D);
}
/* Tôi tổ chức: các trang tôi làm chủ/quản lý; trang đang mở hiện từng lịch đánh sắp tới */
const mtMgrHere=()=>MODE==="club"&&!legacy&&(mxAs?mxAs.cw:canWrite);
function mtOrgClubs(){const L=myClubs().filter(c=>/Chủ|Quản lý/.test(c.role||""));if(mtMgrHere()&&!L.some(c=>c.id===CID))L.unshift({id:CID,name:(CLUB&&CLUB.name)||CID,role:ROLE==="owner"?"Chủ":"Quản lý"});return L}
function mtOrgN(){if(!mtMgrHere())return 0;return (typeof schedUp==="function"?schedUp():[]).filter(x=>x.st!=="draft").length}
function mtOrg(D){
  const C=mtOrgClubs();let h="";
  if(mtMgrHere()){const U=schedUp(),now=Date.now();h+=ovBanner();
    const row=x=>{const R=(S.regs||[]).filter(r=>r.sid===x.id&&!r.cancel),n=R.length,max=+x.max||0,un=mtFee(x)>0?R.filter(r=>(r.pay||"none")!=="ok").length:0,pct=max?Math.min(100,Math.round(n*100/max)):0;
      const cnt=`${n}${max?`/${max}`:""} người · ${max?(n>=max?"Đã đủ":`Còn ${max-n} chỗ`):"Không giới hạn"}`;
      return zRow({lead:zDate(x.at,sameDay(x.at||0,now)),top:mtBadge(x),t:esc(xName(x)),s:`${x.st==="draft"?"Nháp · ":""}${hm(x.at||0)}${x.place?` · ${esc(x.place)}`:""}`,m:cnt,
        after:(max&&!+x.san?zBar(pct):"")+hvBar(x,R)+(un?`<span class="zun">${un} người chưa trả tiền · nhắc qua Zalo</span>`:""),chev:true,cls:"ev",attrs:`data-act="mtql" data-x="${esc(x.id)}"`})};
    const td=U.filter(x=>sameDay(x.at||0,now)),rest=U.filter(x=>!td.includes(x));
    if(td.length)h+=zSec("Hôm nay",td.map(row).join(""));
    if(rest.length)h+=zSec(`Sắp tới · ${rest.length}`,rest.map(row).join(""));
    if(!U.length)h+=zSec("",`<div class="zempty"><b>Chưa có lịch đánh sắp tới</b><small>Bấm Tạo ở thanh dưới để tạo lịch đánh.</small></div>`);
    h+=zSec("",zRow({lead:clubAv(CLUB||{id:CID},"s40"),t:`Quản lý ${esc((CLUB&&CLUB.name)||"")}`,s:"Điểm danh, thu tiền, cài đặt trang",chev:true,attrs:`data-act="mtql"`}))}
  const others=C.filter(c=>!(mtMgrHere()&&c.id===CID));
  if(others.length)h+=zSec(mtMgrHere()?"Trang khác tôi tổ chức":"Trang tôi tổ chức",others.map(c=>zRow({lead:clubAv(c,"s40"),t:esc(c.name||c.id),s:esc(c.role||""),chev:true,attrs:`data-act="mtqlc" data-id="${esc(c.id)}"`})).join(""));
  if(!h)h=zSec("",`<div class="zempty"><b>Bạn chưa tổ chức lịch đánh nào</b><small>Ai cũng tổ chức được: social tối thứ 7, mini game cuối tuần hay một giải nhỏ. App lo đăng ký, xếp sân, thu tiền.</small><button class="primary" data-act="mtplus">Tạo lịch đánh</button></div>`);
  return h;
}

function mtTim(){
  exCacheLoad();if(S.clubsStale&&!clubsLoading){S.clubsStale=false;loadClubs(true)}else loadClubs();loadOpenSess();
  const q=noAcc(String(val("cq",""))).toLowerCase().trim(),f=mxSeg.ex||"all",now=new Date(),endDay=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1).getTime(),wk=d=>[0,6].includes(new Date(d).getDay());
  const O=(mxOpen||[]).filter(x=>(!q||noAcc(`${x.club.name} ${x.club.city||""} ${x.r.place||""} ${x.cf.sname||""}`).toLowerCase().includes(q))&&(f==="all"||(f==="nay"&&x.r.at&&x.r.at<endDay)||(f==="tuan"&&x.r.at&&wk(x.r.at)))&&(mtTyp==="all"||xLoai(x.r)===mtTyp));
  const fb=(v,l)=>`<button data-act="mxseg" data-k="ex" data-v="${v}" aria-pressed="${f===v}">${l}</button>`,tb=(v,l)=>`<button data-act="mttyp" data-v="${v}" aria-pressed="${mtTyp===v}">${l}</button>`;
  let h=`<div class="ztop"><label class="zsearch">${zIco("search",20)}<span class="sr">Tìm lịch đánh</span><input id="cq" data-draft="cq" data-live="1" type="search" placeholder="Tìm theo khu vực, sân, tên…" value="${esc(val("cq",""))}"></label>`;
  h+=`<div class="zchips" role="group" aria-label="Thời gian">${fb("all","Tất cả")}${fb("nay","Hôm nay")}${fb("tuan","Cuối tuần")}</div><div class="zchips" role="group" aria-label="Loại">${tb("all","Mọi loại")}${tb("s","Social")}${tb("m","Mini game")}${tb("g","Giải")}</div></div>`;
  h+=!mxOpen?skSess()+skSess():O.length?zSec("Sắp tới",O.map(x=>{const left=x.n==null?null:+x.r.max?Math.max(0,+x.r.max-x.n):null,fee=+(x.r.id&&typeof xFee==="function"?xFee(x.r):(x.cf.thu==="phi"?x.cf.phi:x.r.fee))||0;
    const m=[left!=null?(left?(left<=3?`<span style="color:#c4170f">Còn ${left} chỗ</span>`:`Còn ${left} chỗ`):"Hết chỗ"):+x.r.max?`${+x.r.max} chỗ`:"",fee?`<b style="font-weight:500">${fmtK(fee)}</b>`:""].filter(Boolean).join(" · ");
    return zRow({lead:zDate(x.r.at,x.r.at&&sameDay(x.r.at,Date.now())),top:mtBadge(x.r),t:esc(x.cf.sname||xName(x.r)),s:`${x.r.at?hm(x.r.at):""}${x.r.place?` · ${esc(x.r.place)}`:""} · ${esc(x.club.name)}`,m,right:left===0?zPill("Chờ chỗ","n"):zPill("Đăng ký"),cls:"ev",attrs:`id="os-${esc(x.club.id)}-${esc(String(x.x||x.sid||""))}" ${mtGo(x.club.id,x.x)}`})}).join("")):"";
  if(mxOpen&&!O.length)h+=`<div class="zsec"><div class="zempty"><b>${q||f!=="all"||mtTyp!=="all"?"Không có lịch đánh phù hợp":"Chưa có lịch đánh nào đang mở"}</b><small>Tự tổ chức một buổi, app lo đăng ký và xếp sân.</small><button class="primary" data-act="mtplus">Tạo lịch đánh</button></div>`;
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
    I.push(...ovTin());
    const ck=typeof ckPending==="function"?ckPending().length:0;if(ck)I.push({at:Math.max(0,...ckPending().map(x=>+x.ci||0)),ic:"🏦",t:`${ck} chuyển khoản chờ xác nhận`,s:"Kiểm tra rồi bấm Đã nhận",go:`data-act="mtql"`})}
  return I.sort((a,b)=>b.at-a.at).slice(0,30);
}
let mtSeenAt=0;try{mtSeenAt=+(localStorage.getItem("pb-tin-seen"))||0}catch(e){}
function mtSeen(){mtSeenAt=Date.now();try{localStorage.setItem("pb-tin-seen",String(mtSeenAt))}catch(e){}}
function mtNew(D){try{return mtItems(D||null).filter(x=>x.at>mtSeenAt).length}catch(e){return 0}}
function mtTin(D){
  loadMyRegs();const I=mtItems(D);
  const IC={"⏰":"clock","💸":"money","🙋":"users","🏦":"money","💰":"money"};
  const h=I.length?zSec("",I.map(x=>zRow({lead:`<span class="zic${x.at>mtSeenAt?" new":""}">${zIco(IC[x.ic]||"bell")}</span>`,t:esc(x.t),s:esc(x.s),chev:true,attrs:x.go})).join(""))
    :zSec("",`<div class="zempty"><b>Chưa có tin mới</b><small>Nhắc lịch sắp tới, người đăng ký, chuyển khoản… sẽ hiện ở đây.</small></div>`);
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
  h+=zSec("",zRow({lead:P.p?`<img class="zav" src="${esc(P.p)}" alt="">`:`<span class="zav">${nm?esc(nm.charAt(0).toUpperCase()):zIco("user")}</span>`,t:esc(nm||(p&&p.name)||"Người dùng Zalo"),s:`Tài khoản Zalo · đã xác minh`,right:`<span style="color:#1c7a3f;display:flex">${zIco("check",20)}</span>`,cls:"b me"}));
  const EI={"📜":"hist","👤":"user","⚙":"gear","🤝":"users","＋":"plus","🎚":"level","🏟":"home"};
  const li=(a,i,t,s)=>zRow({lead:zIco(EI[i]||"list"),t,s,chev:true,attrs:a});
  // Thành tích thật thay cho rating (canvas B04)
  if(p){const A=lvAch(D,p.id);
    h+=`<div class="mtst"><span><b>${A.ses}</b><small>buổi đã chơi</small></span><span><b>${A.games}</b><small>trận</small></span><span><b>${A.gold}</b><small>lần vô địch</small></span></div>`;
    if(A.T.length)h+=zSec("Thành tích",A.T.slice(0,5).map(x=>zRow({lead:zIco("trophy"),t:`${x.m===1?"Vô địch":"Á quân"} · ${esc(x.t)}`,s:`${esc((CLUB&&CLUB.name)||"")}${x.at?" · "+dmy(x.at):""}`})).join(""))}
  const lv=myLv();
  h+=`<section class="zsec">`
    +(mtLvEd?`<div class="mtren">${lvPick("mt-lv")}<span class="two"><button class="ghost" data-act="mtlvx">Huỷ</button><button class="primary" data-act="mtlvok">✓ Lưu trình</button></span></div>`
      :zRow({lead:zIco("level"),t:`Trình của tôi: ${lv?lvName(lv):"chưa chọn"}`,s:"Chỉ bạn thấy · dùng để ghép cặp cân sức",right:zPill(lv?"Sửa":"Chọn"),attrs:`data-act="mtlv"`}))
    +(p?li(`href="${pathOf("app",{tab:"ls"})}" data-go="app" data-t="ls"`,"📜","Lịch sử trận",`${D.all.get(p.id).g} trận`)+li(`href="${pathOf("vdv",{pid:p.id})}" data-go="vdv" data-pid="${p.id}"`,"👤","Hồ sơ, sửa ảnh",""):"")
    +`</section>`;
  h+=`<section class="zsec"><div class="zsh"><h3>Tôi tổ chức</h3></div>`;
  if(S.myClub){const nm=mtMyName();
    h+=mtRen?`<div class="mtren"><label class="fld"><span class="lbl">Tên trang tổ chức</span><input id="mt-nm" data-draft="mt-nm" maxlength="60" placeholder="VD: Pickleball Q7 tối thứ 7" value="${esc(val("mt-nm",nm))}"></label>${errs.mtn?`<p class="err">${esc(errs.mtn)}</p>`:""}<span class="two"><button class="ghost" data-act="mtrenx">Huỷ</button><button class="primary" data-act="mtrenok">✓ Lưu tên</button></span></div>`
      :zRow({lead:zIco("home"),t:esc(nm||"Trang tổ chức của tôi"),s:"Người chơi thấy tên này trong Tìm và Lịch",right:zPill("Đổi tên"),attrs:`data-act="mtren"`});
    h+=li(`data-act="mtqlc" data-id="${esc(S.myClub)}"`,"⚙","Quản lý trang","Ảnh bìa, tài khoản nhận tiền, người cùng tổ chức")}
  const co=mtOrgClubs().filter(c=>c.id!==S.myClub);
  for(const c of co)h+=li(`data-act="mtqlc" data-id="${esc(c.id)}"`,"🤝",esc(c.name||c.id),`Cùng tổ chức · ${esc(c.role||"Quản lý")}`);
  if(!S.myClub&&!co.length)h+=li(`data-act="mtplus"`,"＋","Tạo lịch đánh đầu tiên","App tự lập trang tổ chức cho bạn, không cần duyệt");
  h+=`</section>`;
  h+=`<section class="zsec">${zRow({lead:zIco("link"),t:"Nhập link mời quản lý / trọng tài",right:`<span style="color:var(--muted);display:flex">${zIco(mxInvOpen?"chev":"plus",20)}</span>`,attrs:`data-act="mxinv"`})}${mxInvOpen?mxInvBtn().replace(/^<button[^]*?<\/button>/,""):""}${zRow({lead:zIco("doc"),t:"Điều khoản sử dụng",right:`<span style="color:#b9bdc1;display:flex">${zIco("ext",20)}</span>`,attrs:`data-act="openurl" data-v="https://mini.zalo.me/legal/terms-preview/${MINI_APP_ID}"`})}${MODE==="club"&&S.link?zRow({lead:`<span style="color:#c4170f;display:flex">${zIco("out")}</span>`,t:`<span style="color:#c4170f">${armed("mxleave:x")?`Bấm lần nữa: rời ${esc((CLUB&&CLUB.name)||"trang")} và xoá thông tin của tôi`:`Rời ${esc((CLUB&&CLUB.name)||"trang này")}`}</span>`,attrs:`data-act="mxleave"`}):""}</section>`;
  return mtWrap(MT_T.toi,h,"",D);
}

/* ----- ＋ Tạo lịch đánh: chưa có trang → chọn loại ở đây, app tự lập trang rồi vào khung trò chuyện ----- */
function mtTao(){
  if(isZaloU(authUser)&&S.myClub===undefined)loadMyClub();
  const nm=String(zaloProf().n||"").trim(),ICF={xoay:"swap",giai:"users",bang:"trophy"};
  let h=`<div class="zhead"><h2>Tạo lịch đánh</h2><small>Chọn loại, app điền sẵn mọi thông số. Trang tổ chức của bạn được lập tự động, không cần chờ duyệt.</small></div>`;
  if(!nm)h+=zSec("",`<div class="zfld" style="padding-top:12px"><label class="fld"><span class="lbl">Tên của bạn</span><input id="mt-me" data-draft="mt-me" maxlength="30" autocomplete="name" placeholder="Tên hiện trên trang tổ chức" value="${esc(val("mt-me",""))}"></label></div>`);
  h+=zSec("Chọn loại",TN_FC.map(([k,ic,t,s2,f,l])=>zRow({lead:`<span class="zic ${l}">${zIco(ICF[k])}</span>`,t,s:s2,chev:true,cls:"b tgfc "+l,attrs:`data-act="mtnew" data-v="${k}"${mtBusy?" disabled":""}`})).join(""));
  if(errs.mt)h+=`<p class="err">${esc(errs.mt)}</p>`;
  if(mtBusy)h+=`<p class="gdnote" style="text-align:center">Đang lập trang tổ chức…</p>`;
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
  if(act==="mtbank"){await mtBankSave();return true}
  if(act==="mtbankx"){mtBankWant=false;render();return true}
  if(act==="mtexit"){mxSetMode("choi");mtTab(mxO||"lich");return true}
  return false;
}

/* ----- Tài khoản nhận tiền: hỏi một lần khi lịch đánh đầu tiên có thu tiền (canvas T02) ----- */
function mtBankSheet(){
  if(!mtBankWant||!canWrite||(BANK&&BANK.acc))return "";
  const zn=noAcc(String(zaloProf().n||"")).toUpperCase().trim(),hd=noAcc(String(val("bk-holder",zn))).toUpperCase().trim(),same=zn&&hd&&hd===zn;
  return `<div class="mxdim" data-act="mtbankx"></div><div class="mxsheet gmsh" role="dialog" aria-label="Tài khoản nhận tiền"><span class="grab"></span><b class="mxh">Tài khoản nhận tiền</b>
    <small class="rule">Người chơi quét QR chuyển đúng số tiền, đúng nội dung vào tài khoản này. Hỏi một lần, lần sau dùng lại.</small>
    <label class="fld"><span class="lbl">Ngân hàng</span><select id="bk-code" data-draft="bk-code">${BANKS.map(([c,,n])=>`<option value="${c}" ${val("bk-code","vcb")===c?"selected":""}>${esc(n)}</option>`).join("")}</select></label>
    <label class="fld"><span class="lbl">Số tài khoản</span><input id="bk-acc" data-draft="bk-acc" inputmode="numeric" value="${esc(val("bk-acc",""))}"></label>
    <label class="fld"><span class="lbl">Tên chủ tài khoản (không dấu)</span><input id="bk-holder" data-draft="bk-holder" data-live="1" value="${esc(val("bk-holder",zn))}"></label>
    ${zn?`<small class="${same?"bkok":"rule"}">${same?`✓ Khớp tên Zalo · ${esc(zaloProf().n)}`:"Tên khác tên Zalo: vẫn lưu được, nhưng chưa có huy hiệu Nhận tiền đúng tên."}</small>`:""}
    <div class="two"><button class="ghost" data-act="mtbankx">Để sau</button><button class="primary" data-act="mtbank">✓ Lưu tài khoản</button></div></div>`;
}
async function mtBankSave(){
  const code=val("bk-code","vcb"),bk=BANKS.find(z=>z[0]===code)||BANKS[0],acc=String(val("bk-acc","")).replace(/\s/g,""),hd=noAcc(String(val("bk-holder",zaloProf().n||""))).toUpperCase().trim();
  if(!/^\d{6,19}$/.test(acc)){toast("Số tài khoản chỉ gồm 6–19 chữ số.");return}if(!hd){toast("Nhập tên chủ tài khoản.");return}
  const bank={code:bk[0],bin:bk[1],name:bk[2],acc,holder:hd};
  try{await FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{bank});if(CLUB)CLUB.bank=bank;BANK=bank;mtBankWant=false;["bk-code","bk-acc","bk-holder"].forEach(k=>delete drafts[k]);toast("Đã lưu tài khoản nhận tiền");render()}
  catch(e){toast("Chưa lưu được, thử lại.")}
}
