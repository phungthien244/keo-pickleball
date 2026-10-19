let noAnimOnce=false;
function derive(){
  const c=cfg();
  const players=[...S.players].sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  const pmap=new Map(players.map(p=>[p.id,p]));
  const rating=new Map(players.map(p=>[p.id,Number(p.rating0)||3]));
  const st=new Map(players.map(p=>[p.id,{w:0,l:0,pf:0,pa:0,g:0,fee:0,losses:0,last:-1,sits:0,d:0}]));
  const sid=c.session||1, SM=S.matches.filter(m=>(m.session||1)===sid), SB=S.batches.filter(b=>(b.session||1)===sid);
  const all=new Map(players.map(p=>[p.id,{g:0,w:0,ses:new Set()}]));
  for(const h of S.hist)if(h.sid!==sid)for(const r of (h.rows||[])){const x=all.get(r.id);if(x){x.g+=(r.w||0)+(r.l||0);x.w+=(r.w||0);x.ses.add(h.sid)}}
  for(const m of S.matches)if(m.status==="done"){const aWin=m.sa>m.sb;
    for(const id of m.a){const x=all.get(id);if(x){x.g++;if(aWin)x.w++;x.ses.add(m.session||1)}}
    for(const id of m.b){const x=all.get(id);if(x){x.g++;if(!aWin)x.w++;x.ses.add(m.session||1)}}}
  const done=SM.filter(m=>m.status==="done").sort((a,b)=>(a.doneAt||0)-(b.doneAt||0)||(a.seq-b.seq));
  const info=new Map();
  const avg=ids=>ids.reduce((s,id)=>s+(rating.get(id)??3),0)/ids.length;
  for(const m of done){
    const ra=avg(m.a),rb=avg(m.b),pA=expect(ra,rb);
    const aWin=m.sa>m.sb, share=m.sa/(m.sa+m.sb);
    const eS=expShare(pA), dA=K*(share-eS);
    const loserP=aWin?1-pA:pA, fee=(c.thu||"keo")!=="keo"?0:feeFor(loserP,c);
    for(const id of m.a){const s=st.get(id);if(!s)continue;s.g++;s.pf+=m.sa;s.pa+=m.sb;s.last=Math.max(s.last,m.seq);if(aWin)s.w++;else{s.l++;s.fee+=fee;if(!m.giai)s.losses++}rating.set(id,Math.min(8,Math.max(1,rating.get(id)+dA)))}
    for(const id of m.b){const s=st.get(id);if(!s)continue;s.g++;s.pf+=m.sb;s.pa+=m.sa;s.last=Math.max(s.last,m.seq);if(!aWin)s.w++;else{s.l++;s.fee+=fee;if(!m.giai)s.losses++}rating.set(id,Math.min(8,Math.max(1,rating.get(id)-dA)))}
    info.set(m.id,{pA,dA,fee,aWin,eS});
  }
  for(const m of SM.filter(m=>m.status!=="done")){
    for(const id of [...m.a,...m.b]){const s=st.get(id);if(s)s.last=Math.max(s.last,m.seq)}
    info.set(m.id,{pA:expect(avg(m.a),avg(m.b))});
  }
  for(const b of SB)for(const id of (b.sitting||[])){const s=st.get(id);if(s)s.sits++}
  for(const p of players){const s=st.get(p.id);s.rating=rating.get(p.id);s.d=s.rating-(Number(p.rating0)||3);s.charged=Math.min(s.fee,c.cap);s.capped=s.fee>c.cap}
  return {c,sid,SM,SB,all,players,pmap,st,info,done,playing:SM.filter(m=>m.status!=="done").sort((a,b)=>a.court-b.court)};
}
const nm=(D,id)=>esc(D.pmap.get(id)?.name||"(đã xóa)");

function render(){
  if(MODE==="platform")return renderPlatform();
  const D=derive(), c=D.c;
  {const nm=String(c.title||CLUB?.name||"CLB").trim();$("#title").textContent=nm;$("#clogo").innerHTML=logoHtml(CLUB,nm);$("#curl").textContent="pikeco.app/"+CID;
    const tk=$("#tick");if(tk&&tk.setAttribute)tk.setAttribute("href",pathOf("app",{tab:"san"}));
    $("#hact").innerHTML=(canWrite||REF)?`<a href="${pathOf("caidat")}" data-go="caidat" aria-label="Cài đặt CLB"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 0 0-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 0 0-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 0 0-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 0 0-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 0 0 1.066-2.573c-.94-1.543.826-3.31 2.37-2.37 1 .608 2.296.07 2.572-1.065z"/><circle cx="12" cy="12" r="3"/></svg></a>`:`<a href="${pathOf("clogin")}" data-go="clogin">Đăng nhập</a>`}
  ticker(D);
  try{const tb=document.getElementById("tabs");if(tb&&tb.offsetHeight)document.documentElement.style.setProperty("--tabh",tb.offsetHeight+"px")}catch(e){}
  const active=D.players.filter(p=>p.active!==false).length;
  $("#sub").innerHTML=S.offline?`<span class="dot"></span> Không kết nối được dữ liệu chung`:"";
  if(!splashGone&&(S.offline||S.noClub||(S.live&&S.mReady&&S.hReady)))hideSplash();
  if(!MINI&&autoRoute&&route==="home"&&S.live&&S.mReady){autoRoute=false;if(D.playing.length){route="app";tab="san"}}
  {const tb=document.querySelector('#tabs [data-tab="dk"]');if(tb){const n=pendCount();tb.hidden=!(isAdm()&&!legacy);tb.textContent=n?`Đăng ký (${n})`:"Đăng ký"}}
  if(MINI){rememberClub();if(ME&&ME!==myPid())ME=myPid();const cu=document.getElementById("curl");if(cu)cu.textContent="";const tb=document.getElementById("tabs");if(tb)tb.hidden=true;const tk=document.querySelector(".tkwrap");if(tk)tk.hidden=true;
    $("#hact").innerHTML=miniHact(D)}
  const selTab=route==="home"?"home":route==="buoi"?"ls":route==="chot"?"san":route==="vdv"?"bxh":(route==="caidat"||route==="clogin")?"":tab;
  document.querySelectorAll("#tabs button").forEach(b=>b.setAttribute("aria-selected",b.dataset.tab===selTab));
  // Đang có buổi đánh: người xem qua link không thấy tab Quỹ và Lịch sử
  const hideV=!canWrite&&MODE==="club"&&phaseOf(D)==="live";
  if(hideV&&route==="app"&&(tab==="tien"||tab==="ls"))tab="san";
  {const tb=document.querySelector('#tabs [data-tab="tien"]');if(tb)tb.style.display=hideV||(isG(c)&&(c.thu||"keo")==="khong"&&(c.gt||"khong")==="khong")?"none":""}
  {const tb=document.querySelector('#tabs [data-tab="ls"]');if(tb)tb.style.display=hideV?"none":""}
  document.title=route==="buoi"?`Tổng kết buổi #${routeSid} · ${c.title}`:route==="caidat"?`Cài đặt · ${c.title}`:route==="chot"?`Chốt buổi #${D.sid} · ${c.title}`:route==="vdv"?`${D.pmap.get(routePid)?.name||"Hồ sơ"} · ${c.title}`:c.title;
  const ae=document.activeElement, aid=ae&&ae.id, sel=aid&&ae.selectionStart!=null?[ae.selectionStart,ae.selectionEnd]:null;
  const v=(!legacy&&CLUB&&clubSt(CLUB)!=="active"&&!isPA())?vStatus:S.noClub?(()=>`<div class="empty"><strong>Không tìm thấy CLB</strong>Đường dẫn CLB “${esc(CID)}” không tồn tại.</div>`):S.priv?(()=>`<div class="empty"><strong>CLB riêng tư</strong>Chỉ ban tổ chức xem được trang này.</div>`+loginBar()):route==="home"?vHome:route==="caidat"?vCaiDat:route==="clogin"?vClubLogin:route==="chot"?vChot:route==="vdv"?(D=>vHoSo(D,routePid)):route==="buoi"?(D=>vBuoi(D,routeSid)):({san:isG(c)?vGiaiSan:vSan,bxh:isG(c)?(D=>vGiaiBxh(D,gDerive(D))):vBxh,nguoi:vNguoi,tien:vTien,ls:vLs,dk:vDk,toi:vToi}[tab]||vSan);
  const loading=!S.offline&&!S.noClub&&!S.priv&&!(S.mReady&&S.hReady&&S.pReady);
  const akey=route+"|"+routeSid+"|"+tab+"|"+(S.live?1:0)+"|"+D.sid, doAnim=akey!==lastAnim&&!noAnimOnce; lastAnim=akey; noAnimOnce=false;
  if(MINI&&MODE==="club"&&!legacy&&!S.noClub){$("#view").innerHTML=`<section class="mx">${loading?skeleton():renderMini(D)}</section>`;mxCheckin(D);
    if(aid){const el=document.getElementById(aid);if(el){el.focus();if(sel&&el.setSelectionRange)try{el.setSelectionRange(...sel)}catch(e){}}}return}
  $("#view").innerHTML=`<section class="${doAnim?"anim":""}">${route==="app"?pageHead(D):""}${loading?skeleton():v(D)}${MINI?"":clubFoot()}</section>${miniNav()}`;
  syncSheet(D);
  if(S.live){for(const m of D.SM)seen.add(m.id+(m.status==="done"?"d":"p"));seenReady=true}
  if(aid){const el=document.getElementById(aid);if(el){el.focus();if(sel&&el.setSelectionRange)try{el.setSelectionRange(...sel)}catch(e){}}}
}
const val=(key,def)=>drafts[key]!==undefined?drafts[key]:def;
let lastAnim="",seenReady=false,bxF="all";const seen=new Set();
const isNew=k=>seenReady&&!seen.has(k);
const today=()=>{const d=new Date();return `${d.getDate()}/${d.getMonth()+1}`};
function pageHead(D){
  const H={dk:[(CLUB?.name||D.c.title),"Đăng ký buổi"],toi:["Mini App Pikeco","CLB của bạn"],san:[sessTitle(D.c,D.sid)+" · "+today(),"Sân đấu"],bxh:[sessTitle(D.c,D.sid)+" · hôm nay","Xếp hạng"],nguoi:[(CLUB?.name||D.c.title),"Thành viên"],tien:[sessTitle(D.c,D.sid)+" · "+today(),"Quỹ"],ls:["Các buổi đã đánh","Lịch sử"],...(MINI?{bxh:[(CLUB?.name||D.c.title),"Bảng xếp hạng"]}:{})}[tab]||["",""];
  if(isG(D.c)){if(tab==="san"||tab==="tien")H[1]="Cặp cố định xoay vòng";if(tab==="bxh"){H[0]=D.c.sname?sessTitle(D.c,D.sid):"Cặp cố định xoay vòng";H[1]="Xếp hạng cặp"}}
  return `<div class="phead"><span class="eyebrow">${esc(H[0])}</span><h2 class="ptitle">${esc(H[1])}</h2></div>`;
}
let tkItems=[],tkI=0,tkKey="";
function ticker(D){
  let label,items;
  if(D.playing.length){label="Đang đánh";items=D.playing.map(m=>`Sân ${mName(m)} · ${m.a.map(id=>D.pmap.get(id)?.name||"?").join(" & ")} vs ${m.b.map(id=>D.pmap.get(id)?.name||"?").join(" & ")}`)}
  else if(D.done.length){label="Vừa xong";items=[...D.done].reverse().slice(0,4).map(m=>`Sân ${mName(m)} · ${m.a.map(id=>D.pmap.get(id)?.name||"?").join(" & ")} ${m.sa}–${m.sb} ${m.b.map(id=>D.pmap.get(id)?.name||"?").join(" & ")}`)}
  else{label=S.live?"Trực tiếp":"Kết nối";items=[S.offline?"Không kết nối được dữ liệu chung":S.live?`Buổi #${D.sid} · chưa có trận nào`:"Đang kết nối…"]}
  const k=label+"|"+items.join("||");if(k===tkKey)return;tkKey=k;tkItems=items;if(tkI>=items.length)tkI=0;
  $("#tkl").textContent=label;tkShow();
}
function tkShow(){const el=$("#tkt");if(!el)return;el.textContent=tkItems[tkI]||"";el.classList.remove("swap");void el.offsetWidth;el.classList.add("swap")}
setInterval(()=>{if(tkItems.length>1&&!document.hidden){tkI=(tkI+1)%tkItems.length;tkShow()}},4500);

const skeleton=()=>`<div class="skel" aria-busy="true" aria-label="Đang tải dữ liệu"><i style="height:96px"></i><i style="height:12px;width:180px"></i><i style="height:180px"></i><div class="tiles"><i style="height:84px"></i><i style="height:84px"></i></div><i style="height:64px"></i><i style="height:64px"></i></div>`;
