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
  return host&&host.uid!==(authUser&&authUser.uid)?host:null;
}
const capBanner=(D,host)=>`<div class="capinv"><span class="ic">🤝</span><span class="t"><b>${esc(capName(D,host))} mời bạn đánh cặp</b><small>Nhận lời là hai bạn thành một cặp cố định ở giải này.</small></span><button class="primary" data-act="gdjoin" data-v="${esc(host.id)}">NHẬN LỜI</button></div>`;
// Bước 1: chọn đồng đội
function capReg1(D){
  if(!pairRegOn(RX))return "";
  if(gdJoin){const host=(S.regs||[]).find(r=>r.id===gdJoin);
    if(host)return `<span class="xsec">Đồng đội</span><div class="capok"><span>🤝</span><span class="t"><b>Đánh cặp với ${esc(capName(D,host))}</b><small>Bạn nhận lời mời · đăng ký xong là thành cặp</small></span><button class="lnk" data-act="gdmate" data-v="x">Bỏ</button></div>`}
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
  if(gdJoin)return {team:gdJoin};
  if(gdOpt.mate==="seek")return {seek:true};
  const w=gdOpt.want||"",p=w?derive().pmap.get(w):null;
  return {team:rid,...(p?{want:w,wantName:p.name}:{})};
}
// Vé: tình trạng cặp
function capTicket(D,mine){
  if(!pairRegOn(RX))return "";
  const m=capMate(mine);
  if(m)return `<div class="capok big"><span>🤝</span><span class="t"><small>CẶP CỦA BẠN</small><b>${esc(capName(D,mine))} &amp; ${esc(capName(D,m))}</b></span></div>`;
  if(mine.seek)return `<div class="capwait"><b>Đang chờ ghép cặp</b><span>Ban tổ chức ghép cặp cho người chưa có đồng đội lúc tới sân.</span></div>`;
  if(mine.team&&mine.team!==mine.id)return `<div class="capwait"><b>Cặp chưa đủ</b><span>Người rủ bạn đã hủy đăng ký. Ban tổ chức sẽ ghép đồng đội mới cho bạn.</span></div>`;
  return `<div class="capwait"><b>${mine.wantName?`Đang chờ ${esc(mine.wantName)} nhận lời`:"Chưa có đồng đội"}</b><span>Gửi link mời qua Zalo: đồng đội bấm vào, đăng ký là hai bạn thành một cặp.</span><button class="primary wide" data-act="capshare">🤝 MỜI ĐỒNG ĐỘI QUA ZALO</button></div>`;
}
// Quản lý: nhãn cặp trong danh sách đăng ký
function capTag(D,r){
  if(!r||!r.sid||typeof r.sid!=="string")return "";const X=schedById(r.sid);if(!pairRegOn(X))return "";
  const m=capMate(r);if(m)return `<small class="captag ok">🤝 cặp với ${esc(capName(D,m))}</small>`;
  if(r.seek)return `<small class="captag">tìm đồng đội</small>`;
  return `<small class="captag w">chờ ${esc(r.wantName||"đồng đội")}</small>`;
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
  if(act==="capshare"){const D=derive(),mine=gdMine(RX);if(!mine)return true;const u=capLink(RX.id,mine.team||mine.id),txt=`🤝 ${capName(D,mine)} rủ bạn đánh cặp ở ${xName(RX)} · ${whenFull(RX)}. Bấm để nhận lời và đăng ký:`;
    if(window.ZMP&&window.ZMP.openShareSheet){try{await window.ZMP.openShareSheet({type:"link",data:{link:u,chatOnly:false}});return true}catch(e){}}
    if(navigator.share){try{await navigator.share({text:txt,url:u})}catch(e){}return true}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy link mời đồng đội")}catch(e){toast(u)}return true}
  if(act==="capadd"&&canWrite){const D=derive(),R=capReady(D),P=cfg().giai?.pairs||[],room=gMax(cfg().giai)-P.length;if(!R.length)return true;
    const t=Date.now().toString(36),add=R.slice(0,room).map(([a,bb],i)=>({id:"c"+t+"r"+i,a,b:bb,reg:1}));
    await write(()=>saveG({pairs:[...P,...add]}),`Đã thêm ${add.length} cặp đăng ký sẵn`);return true}
  return false;
}
if(MINI)capParam();
