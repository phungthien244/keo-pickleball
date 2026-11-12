/* ---------- Đăng ký theo cặp (giải cặp cố định, sched.pairReg = "pair") ----------
   Mỗi người vẫn có 1 đăng ký riêng (lệ phí, ảnh, check-in như cũ). Cặp = 2 đăng ký cùng reg.team.
   Người rủ: team = mã đăng ký của mình, want/wantName = đồng đội muốn mời (thành viên CLB), hoặc gửi link mời (&doi=mã).
   Người được mời: nhận lời → đăng ký với team = mã đó. Chưa có đồng đội: seek = true, BTC ghép (bốc thăm, cân trình) ở bước Tùy chọn. */
const pairRegOn=x=>!!(x&&x.fmt==="giai"&&x.pairReg==="pair");
let gdJoin="";
const capRegs=(sid,code)=>(S.regs||[]).filter(r=>r.sid===sid&&r.team===code&&!r.cancel&&!isHeldOut(r));
const capMate=r=>r&&r.team?capRegs(r.sid,r.team).find(x=>x.id!==r.id)||null:null;
const capName=(D,r)=>r?(r.pid?D.pmap.get(r.pid)?.name||r.name:r.name)||"?":"?";
const capLink=(sid,code)=>miniLink(CID,sid)+"&doi="+encodeURIComponent(code);
function capParam(){try{const q=new URLSearchParams(location.search||""),d=q.get("doi"),x=q.get("buoi");if(d&&x)sessionStorage.setItem("pb-doi",JSON.stringify({d,x}))}catch(e){}}
// Lời mời đánh cặp cho tôi ở giải đang xem: qua link, hoặc người rủ chọn đúng tên tôi
function capInvite(D){
  if(!RX||!pairRegOn(RX))return null;const me=S.link&&S.link.status==="ok"?S.link.pid:null;
  let code="";try{const p=JSON.parse(sessionStorage.getItem("pb-doi")||"null");if(p&&p.x===RX.id)code=p.d}catch(e){}
  const L=(S.regs||[]).filter(r=>r.sid===RX.id&&!r.cancel&&!isHeldOut(r)&&r.team===r.id&&capRegs(RX.id,r.id).length<2);
  const host=L.find(r=>r.id===code)||(me?L.find(r=>r.want===me):null);
  if(host&&(capNo||[]).some(x=>x.host===host.id&&x.uid===(authUser&&authUser.uid)))return null;
  return host&&host.uid!==(authUser&&authUser.uid)?host:null;
}
// Lời mời đánh cặp (canvas B03): người rủ đã trả cho cả cặp thì bạn cặp chỉ cần Xác nhận
const capPaid=host=>!!(host&&host.payFor==="pair");
const capBanner=(D,host)=>`<div class="capinv"><span class="ic">🤝</span><span class="t"><b>${esc(capName(D,host))} mời bạn đánh cặp</b><small>${capPaid(host)?`💚 ${esc(capName(D,host))} đã trả lệ phí ${fmtK(feeGuest())} cho bạn, bạn không cần chuyển khoản.`:"Nhận lời là hai bạn thành một cặp cố định ở giải này."}</small></span><span class="two"><button class="ghost" data-act="capno" data-v="${esc(host.id)}">Từ chối</button><button class="primary" data-act="gdjoin" data-v="${esc(host.id)}">${capPaid(host)?"Xác nhận":"Nhận lời"}</button></span></div>`;
// Người được mời đã từ chối (clubs/c/capno/{mã cặp}_{uid})
let capNo=null,capNoAt=0;
function capNoLoad(){if(!window.FB||Date.now()-capNoAt<15e3)return;capNoAt=Date.now();
  FB.getDocs(FB.collection(FB.fs,PFX+"capno")).then(q=>{capNo=q.docs.map(d=>({id:d.id,...d.data()}));render()}).catch(()=>{})}
const capNos=code=>(capNo||[]).filter(x=>x.host===code);
// Bước 1: chọn đồng đội
function capReg1(D){
  if(!pairRegOn(RX))return "";
  if(gdJoin){const host=(S.regs||[]).find(r=>r.id===gdJoin);
    if(host&&MINI)return zSec("Đồng đội",zRow({lead:av(D.pmap.get(host.pid)||{name:capName(D,host)},"md",1),t:`Đánh cặp với ${esc(capName(D,host))}`,s:capPaid(host)?`${esc(capName(D,host))} đã trả lệ phí cho bạn · chỉ cần xác nhận`:"Bạn nhận lời mời · đăng ký xong là thành cặp",right:`<button class="sm" data-act="gdmate" data-v="x">Bỏ</button>`,cls:"b"}));
    if(host)return `<span class="xsec">Đồng đội</span><div class="capok"><span>🤝</span><span class="t"><b>Đánh cặp với ${esc(capName(D,host))}</b><small>${capPaid(host)?`💚 ${esc(capName(D,host))} đã trả lệ phí cho bạn · chỉ cần xác nhận`:"Bạn nhận lời mời · đăng ký xong là thành cặp"}</small></span><button class="lnk" data-act="gdmate" data-v="x">Bỏ</button></div>`}
  // Mini App: không còn danh sách thành viên; gõ tên bạn cặp, gửi link Zalo sau khi đăng ký; chọn ai trả lệ phí (canvas B02)
  if(MINI){if(!gdOpt.mate)gdOpt.mate="inv";if(!gdOpt.pf)gdOpt.pf="pair";
    {const f=feeGuest();let h=zOpt("mate","inv",gdOpt.mate==="inv","Tôi rủ đồng đội","Đăng ký xong gửi link qua Zalo, bạn cặp bấm Xác nhận")+zOpt("mate","seek",gdOpt.mate==="seek","Chưa có đồng đội","Ban tổ chức ghép cặp lúc tới sân");
      if(gdOpt.mate==="inv"){h+=`<div class="zfld"><label class="fld"><span class="lbl">Tên bạn đánh cặp</span><input id="gd-mn" data-draft="gd-mn" maxlength="40" placeholder="VD: Minh Trần" value="${esc(val("gd-mn",""))}"></label></div>`;
        if(f>0)h+=`<div class="zsh"><h3>Ai trả lệ phí?</h3></div>`+zOpt("pf","pair",gdOpt.pf==="pair","Tôi trả luôn cho cả cặp","Bạn cặp chỉ cần bấm Xác nhận",fmtK(f*2))+zOpt("pf","self",gdOpt.pf==="self","Mỗi người tự trả","Bạn cặp chuyển phần của mình khi xác nhận",fmtK(f))
          +`<p class="gdnote zfld">Bạn cặp từ chối hoặc quá hạn: gửi link cho người khác, tiền đã trả giữ nguyên. Không tìm được ai thì ban tổ chức hoàn phần của bạn cặp.</p>`}
      return zSec("Đồng đội · đăng ký theo cặp",h)}
    const o=(k,v,t,s,pr)=>`<button class="gdopt${gdOpt[k]===v?" on":""}" data-act="gdopt" data-k="${k}" data-v="${v}"><span class="rd"></span><span class="t"><b>${t}</b><small>${s}</small></span>${pr?`<b class="pr">${pr}</b>`:""}</button>`,f=feeGuest();
    let h=`<span class="xsec">Đồng đội · giải đăng ký theo cặp</span>`+o("mate","inv","Tôi rủ đồng đội","Đăng ký xong gửi link qua Zalo, bạn cặp bấm Xác nhận")+o("mate","seek","Chưa có đồng đội","Ban tổ chức ghép cặp (bốc thăm hoặc cân trình) lúc tới sân");
    if(gdOpt.mate==="inv"){h+=`<label class="fld"><span class="lbl">Tên bạn đánh cặp</span><input id="gd-mn" data-draft="gd-mn" maxlength="40" placeholder="VD: Minh Trần" value="${esc(val("gd-mn",""))}"></label>`;
      if(f>0)h+=`<span class="xsec">Ai trả lệ phí?</span>`+o("pf","pair","Tôi trả luôn cho cả cặp","Bạn cặp chỉ cần bấm Xác nhận, không phải chuyển khoản",fmtK(f*2))+o("pf","self","Mỗi người tự trả","Bạn cặp chuyển khoản phần của mình khi xác nhận",fmtK(f))
        +`<span class="gdnote">Bạn cặp từ chối hoặc quá hạn: bạn gửi link cho người khác, tiền đã trả giữ nguyên cho người mới. Không tìm được ai thì ban tổ chức hoàn phần của bạn cặp.</span>`}
    return h}
  const me=S.link&&S.link.status==="ok"?S.link.pid:null,taken=new Set((S.regs||[]).filter(r=>r.sid===RX.id&&!r.cancel&&!isHeldOut(r)&&r.pid).map(r=>r.pid));
  if(!gdOpt.mate)gdOpt.mate="inv";
  const o=(v,t,s)=>`<button class="gdopt${gdOpt.mate===v?" on":""}" data-act="gdopt" data-k="mate" data-v="${v}"><span class="rd"></span><span class="t"><b>${t}</b><small>${s}</small></span></button>`;
  let h=`<span class="xsec">Đồng đội · giải đăng ký theo cặp</span>`+o("inv","Tôi rủ đồng đội","Chọn tên đồng đội trong CLB, hoặc gửi link mời qua Zalo sau khi đăng ký")+o("seek","Chưa có đồng đội","Ban tổ chức ghép cặp (bốc thăm hoặc cân trình) lúc tới sân");
  if(gdOpt.mate==="inv"){const q=noAcc(String(val("gd-mq",""))).toLowerCase().trim(),sel=gdOpt.want||"";
    const L=D.players.filter(p=>p.id!==me&&!p.guest&&(!q||noAcc(p.name).toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name,"vi")).slice(0,q?30:12);
    h+=`<div class="gdbox capbox"><label class="ppq"><span class="sr">Tìm đồng đội</span><input id="gd-mq" data-draft="gd-mq" data-live="1" type="search" placeholder="Tìm tên đồng đội trong CLB…" value="${esc(val("gd-mq",""))}" autocomplete="off"></label>
      <div class="capl">${L.map(p=>{const t=taken.has(p.id);return `<button class="capp${sel===p.id?" on":""}" data-act="gdmate" data-v="${p.id}" ${t?"disabled":""}>${av(p,"sm",1)}<span class="t">${esc(p.name)}<small>${t?"đã đăng ký giải này":r2(D.st.get(p.id)?.rating||+p.rating0||0)}</small></span><span class="ck">${sel===p.id?"✓":""}</span></button>`}).join("")||`<p class="rule">Không có tên phù hợp.</p>`}</div>
      <span class="gdnote">${sel?`Đồng đội <b>${esc(D.pmap.get(sel)?.name||"")}</b> sẽ thấy lời mời khi mở app. Bạn cũng gửi được link mời qua Zalo ở vé.`:"Đồng đội ngoài CLB hoặc chưa có tên: cứ đăng ký, rồi bấm “Mời đồng đội” ở vé để gửi link qua Zalo."}</span></div>`}
  return h;
}
// Trường thêm vào đăng ký
function capFields(rid){
  if(!pairRegOn(RX))return {};
  if(gdJoin){const host=(S.regs||[]).find(r=>r.id===gdJoin);return {team:gdJoin,...(capPaid(host)?{paidBy:gdJoin}:{})}}
  if(gdOpt.mate==="seek")return {seek:true};
  if(MINI){const nm=String(val("gd-mn","")).trim().slice(0,40);return {team:rid,...(nm?{wantName:nm}:{}),...(gdOpt.pf!=="self"&&feeGuest()>0?{payFor:"pair"}:{})}}
  const w=gdOpt.want||"",p=w?derive().pmap.get(w):null;
  return {team:rid,...(p?{want:w,wantName:p.name}:{})};
}
// Vé: tình trạng cặp
function capTicket(D,mine){
  if(!pairRegOn(RX))return "";
  const m=capMate(mine);
  if(m)return `<div class="capok big"><span>🤝</span><span class="t"><small>Cặp của bạn</small><b>${esc(capName(D,mine))} &amp; ${esc(capName(D,m))}</b></span></div>`;
  if(mine.seek)return `<div class="capwait"><b>Đang chờ ghép cặp</b><span>Ban tổ chức ghép cặp cho người chưa có đồng đội lúc tới sân.</span></div>`;
  if(mine.team&&mine.team!==mine.id)return `<div class="capwait"><b>Cặp chưa đủ</b><span>Người rủ bạn đã hủy đăng ký. Ban tổ chức sẽ ghép đồng đội mới cho bạn.</span></div>`;
  capNoLoad();const no=capNos(mine.team||mine.id);
  const paid=mine.payFor==="pair"?`<small class="capok2">Bạn đã trả ${fmtK(feeGuest())} cho bạn cặp${(mine.pay||"none")==="ok"?" ✓":(mine.pay==="sent"?" · chờ BTC xác nhận":"")}${no.length?" · tiền giữ cho người mới":""}</small>`:"";
  if(no.length)return `<div class="capwait"><b>${esc(no[no.length-1].name||"Bạn cặp")} đã từ chối</b>${paid}<span>Gửi link cho người khác, ai bấm Xác nhận trước là thành cặp với bạn.</span><button class="primary wide" data-act="capshare">🤝 Mời người khác qua Zalo</button></div>`;
  return `<div class="capwait"><b>${mine.wantName?`Đang chờ ${esc(mine.wantName)} xác nhận`:"Chưa có đồng đội"}</b>${paid}<span>Gửi link mời qua Zalo: bạn cặp bấm vào, ${mine.payFor==="pair"?"bấm Xác nhận":"đăng ký"} là hai bạn thành một cặp.</span><button class="primary wide" data-act="capshare">🤝 Mời đồng đội qua Zalo</button></div>`;
}
// Quản lý: nhãn cặp trong danh sách đăng ký
function capTag(D,r){
  if(!r||!r.sid||typeof r.sid!=="string")return "";const X=schedById(r.sid);if(!pairRegOn(X))return "";
  const m=capMate(r),pf=r.payFor==="pair"?" · trả cả cặp":r.paidBy?" · được trả hộ":"";
  if(m)return `<small class="captag ok">🤝 cặp với ${esc(capName(D,m))}${pf}</small>`;
  if(r.seek)return `<small class="captag">tìm đồng đội</small>`;
  capNoLoad();const no=capNos(r.team||r.id);
  return `<small class="captag w">${no.length?`${esc(no[no.length-1].name||"bạn cặp")} đã từ chối`:`chờ ${esc(r.wantName||"đồng đội")} xác nhận`}${pf}</small>`;
}
// Quản lý: các cặp đăng ký sẵn đã có mặt, chưa vào danh sách cặp của giải
function capReady(D){
  const sid=D.c.schedId,X=sid&&schedById(sid);if(!pairRegOn(X))return [];
  const P=(D.c.giai&&D.c.giai.pairs)||[],used=new Set(P.flatMap(p=>[p.a,p.b])),act=new Set(D.players.filter(p=>p.active!==false).map(p=>p.id));
  const seen=new Set(),out=[];
  for(const r of (S.regs||[]).filter(r=>r.sid===sid&&!r.cancel&&r.team&&r.team===r.id)){
    const m=capMate(r);if(!m||!r.pid||!m.pid||seen.has(r.id))continue;seen.add(r.id);
    if(used.has(r.pid)||used.has(m.pid)||!act.has(r.pid)||!act.has(m.pid))continue;out.push([r.pid,m.pid])}
  return out;
}
function capBox(D){
  const sid=D.c.schedId,X=sid&&schedById(sid);if(!pairRegOn(X)||(D.c.giai&&D.c.giai.locked))return "";
  const R=capReady(D),regs=(S.regs||[]).filter(r=>r.sid===sid&&!r.cancel),teams=regs.filter(r=>r.team===r.id&&capMate(r)).length,seek=regs.filter(r=>!capMate(r)).length;
  return `<div class="capmgr"><span class="t"><b>🤝 Đăng ký theo cặp: ${teams} cặp đủ người${seek?` · ${seek} người chưa có cặp`:""}</b><small>${R.length?`${R.length} cặp đã có mặt, chưa vào danh sách cặp.`:"Cặp vào danh sách khi cả hai người có mặt (check-in hoặc điểm danh)."}${seek?" Người chưa có cặp: dùng Bốc thăm A/B hoặc Ghép tự động.":""}</small></span>${R.length?`<button class="primary" data-act="capadd">+ Thêm ${R.length} cặp</button>`:""}</div>`;
}
async function capAct(act,b,id){
  if(act==="gdmate"){const v=b.dataset.v;if(v==="x"){gdJoin="";render();return true}gdOpt.want=gdOpt.want===v?"":v;render();return true}
  if(act==="gdjoin"){if(!isPlayer(authUser)){zaloStart();return true}gdJoin=b.dataset.v||"";gdOpt.mate="";mxDk="reg1";render();try{window.scrollTo(0,0)}catch(e){}return true}
  if(act==="capshare"){const D=derive(),mine=gdMine(RX);if(!mine)return true;const txt=`🤝 ${capName(D,mine)} rủ bạn đánh cặp ở ${xName(RX)} · ${whenFull(RX)}. Bấm để nhận lời và đăng ký:`;
    await shareOut({title:"Mời đồng đội",text:txt,path:pathOf("app",{tab:"dk",x:RX.id}),q:"&buoi="+encodeURIComponent(RX.id)+"&doi="+encodeURIComponent(mine.team||mine.id),miniOnly:true});return true}
  if(act==="capno"){const host=(S.regs||[]).find(r=>r.id===b.dataset.v);if(!host||!authUser)return true;
    try{await FB.setDoc(FB.doc(FB.fs,PFX+"capno/"+host.id+"_"+authUser.uid),{host:host.id,uid:authUser.uid,name:String(zaloProf().n||"").slice(0,40)||"Bạn cặp",at:Date.now()});
      (capNo=capNo||[]).push({host:host.id,uid:authUser.uid});try{sessionStorage.removeItem("pb-doi")}catch(e){}toast("Đã báo từ chối");render()}catch(e){toast("Chưa gửi được, thử lại.")}return true}
  // Người tổ chức: người rủ đã trả cả cặp nhưng không có bạn cặp → huỷ cặp, ghi nhớ phải hoàn phần bạn cặp
  if(act==="caprf"&&canWrite){const r=(S.regs||[]).find(x=>x.id===id);if(!r||r.payFor!=="pair"||capMate(r))return true;const f=feeGuest();
    await write(()=>db.collection("regs").doc(id).update({payFor:"",hoan:f}),`Nhớ chuyển lại ${fmtK(f)} cho ${capName(derive(),r)}`);return true}
  if(act==="capadd"&&canWrite){const D=derive(),R=capReady(D),P=cfg().giai?.pairs||[],room=gMax(cfg().giai)-P.length;if(!R.length)return true;
    const t=Date.now().toString(36),add=R.slice(0,room).map(([a,bb],i)=>({id:"c"+t+"r"+i,a,b:bb,reg:1}));
    await write(()=>saveG({pairs:[...P,...add]}),`Đã thêm ${add.length} cặp đăng ký sẵn`);return true}
  return false;
}
if(MINI)capParam();

// Người tổ chức: bạn cặp được trả hộ → trạng thái tiền theo người rủ (chạy trên máy ban tổ chức)
const capSyncDone=new Set();
function capPaySync(){
  if(!canWrite||legacy||!window.FB)return;
  for(const r of (S.regs||[]))if(r.paidBy&&!r.cancel){const h=(S.regs||[]).find(x=>x.id===r.paidBy);if(!h||h.payFor!=="pair")continue;
    const want=h.pay||"none";if((r.pay||"none")===want||!["sent","ok"].includes(want))continue;const k=r.id+want;if(capSyncDone.has(k))continue;capSyncDone.add(k);
    FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+r.id),{pay:want}).catch(()=>capSyncDone.delete(k))}
}
