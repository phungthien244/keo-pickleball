/* ---------- Luồng trọng tài · Mini App (canvas trang rf) ----------
   Quét mã → nhận sân (R1) → màn chính chỉ có sân của mình (R2), trận mới nổi bật (R3) →
   chuẩn bị 3 bước (R4–R6, nút của bản cũ) → nhập điểm (màn cũ, đầu trang SÂN n · Trọng tài) → lưu → chờ trận tiếp (R11).
   Nhờ BTC gọi tên: hộp xác nhận + dải trạng thái (đã gửi / BTC đã đọc / lỗi) theo yêu cầu loa trong calls. */
let rfStep=1,rfAsk=null,rfErr={},rfSeen={},rfBye=null,rfNameEd=false;
const rfName=()=>String(val("rf-name","")||who()).trim().slice(0,40)||who();
const rfOn=()=>MINI&&REF&&!canWrite;
const rfLb=(D,m)=>{if(!m.giai)return "";const GD=gDerive(D);if(!GD)return "";if(m.ko)return koMName(GD,m.ko)||"";const g=(GD.games||[]).find(q=>q.m&&q.m.id===m.id);return g&&g.grp!=null?`Bảng ${KOG[g.grp]}`:""};
const rfBadge=c=>`<span class="rfb">SÂN ${esc(cName(c))}</span>`;
const rfGiaiNm=D=>{const X=xCur();return X?xName(X):(D.c.sname||"Giải đấu")};
// Đầu trang trọng tài: ô vàng SÂN n · Trọng tài · dòng phụ
function rfHead(c,sub,back){return `<div class="tthd rf">${back?`<button class="ttbk" data-act="${back}" aria-label="Quay lại">‹</button>`:""}${rfBadge(c)}<span class="t"><b>Trọng tài</b><small>${sub}</small></span></div>`}
// Trận dự kiến ở sân này (giải cặp): theo lịch dự kiến từng sân
function rfPlan(D,c){if(!isG(D.c))return [];const GD=gDerive(D);if(!GD||!GD.locked)return [];return (gPlan(D,GD).get(Number(c))||[])}
// Câu loa khi nhờ gọi tên
const rfCallTx=(D,m,pid)=>{const t=m.a.includes(pid)?m.a:m.b;return `Mời vận động viên ${ttPN(D,pid)}, đội ${t.map(id=>ttPN(D,id)).join(" và ")}, ra sân ${cName(m.court)} thi đấu.`};
// Trạng thái nhờ gọi tên của một người: "", sent, done, skip, err
function rfCallSt(D,m,pid){
  if(rfErr[pid])return {s:"err"};const u=authUser&&authUser.uid,tx=rfCallTx(D,m,pid);
  const x=(S.calls||[]).filter(z=>z.k==="loa"&&z.uid===u&&z.txt===tx).sort((a,b)=>(b.at||0)-(a.at||0))[0];
  if(!x)return {s:""};if(x.st==="new")return {s:"sent",x};if(x.st==="skip")return {s:"skip",x};return {s:"done",x};
}
function rfCallStrip(D,m){
  const L=[...m.a,...m.b].map(pid=>({pid,...rfCallSt(D,m,pid)})).filter(o=>o.s);if(!L.length)return "";
  const o=L.sort((a,b)=>((b.x&&(b.x.doneAt||b.x.at))||Date.now())-((a.x&&(a.x.doneAt||a.x.at))||Date.now()))[0],n=esc(ttPN(D,o.pid));
  if(o.s==="sent")return `<div class="rfst y"><b>⏳ Đã gửi về máy BTC · ${hm(o.x.at)}</b><small>Chờ BTC đọc tên ${n} qua loa</small></div>`;
  if(o.s==="done"){const t=o.x.doneAt||o.x.at;if(Date.now()-t>10e3)return "";setTimeout(render,10e3-(Date.now()-t)+50);return `<div class="rfst g"><b>🔊 BTC đã gọi tên ${n} · ${hm(t)}</b><small>Chờ ${n} ra sân, hoặc bấm Gọi BTC nếu lâu quá</small></div>`}
  return `<div class="rfst r"><span><b>⚠ Chưa gửi được yêu cầu gọi tên</b><small>Mất mạng, hoặc BTC đã bỏ qua</small></span><button class="ttln" data-act="ttcallgo" data-v="${esc(o.pid)}" data-m="${esc(m.id)}">Gửi lại</button></div>`;
}
function rfCallBtn(D,m,pid){const s=rfCallSt(D,m,pid).s;
  return s==="sent"?`<span class="rftag y">⏳ Đã nhờ</span>`:s==="done"?`<span class="rftag g">🔊 Đã gọi</span>`:`<button class="ttln" data-act="ttcallp" data-v="${esc(pid)}" data-m="${esc(m.id)}">📣 Nhờ BTC gọi tên</button>`}
function rfAskDlg(D){
  if(!rfAsk)return "";const m=(S.matches||[]).find(x=>x.id===rfAsk.m);if(!m){rfAsk=null;return ""}
  return `<div class="rfdlg"><div class="b"><b class="h">Nhờ BTC gọi tên ${esc(ttPN(D,rfAsk.p))}?</b><div class="q">🔊 “${esc(rfCallTx(D,m,rfAsk.p))}”</div><small>Câu này gửi về máy BTC đang nối loa. Cùng một tên chỉ gửi lại được sau 1 phút.</small>
    <div class="two"><button class="ttln" data-act="ttcallx">Huỷ</button><button class="ttgo" data-act="ttcallgo" data-v="${esc(rfAsk.p)}" data-m="${esc(m.id)}">📣 Gửi cho BTC</button></div></div></div>`;
}
const rfCk=(pid)=>{const X0=ckSched(),r=X0?(S.regs||[]).find(r=>r.sid===X0.id&&r.pid===pid&&!r.cancel):null;return !X0?{ok:true,t:"có mặt"}:r&&r.arrived?{ok:true,t:`check-in ${r.arrivedAt?hm(r.arrivedAt):""}`}:{ok:false,t:"chưa check-in"}};
// Chuẩn bị 3 bước (R4 kiểm tra người · R5 bốc thăm · R6 vị trí & luật)
function rfPre(D,m,X){
  const f=m.ref,T=f.toss||{},tn=t=>esc(ttTN(D,m,t)),st=Math.max(1,Math.min(3,rfStep)),sub=`${esc(rfGiaiNm(D))} · Trọng tài ${esc(f.byName||rfName())}`;
  const bar=`<div class="rfsteps"><span class="cap">Chuẩn bị ${st}/3 · ${["Kiểm tra người","Bốc thăm","Vị trí & luật"][st-1]}</span><span class="b">${[1,2,3].map(i=>`<i class="${i<st?"ok":i===st?"on":""}"></i>`).join("")}</span></div>`;
  let h=rfHead(m.court,sub,st>1?"ttstep":"ttx").replace('data-act="ttstep"',`data-act="ttstep" data-v="${st-1}"`)+(st===1?rfCallStrip(D,m):"")+bar,ft="";
  if(st===1){h+=`<section class="ttbox"><span class="cap">Bấm ảnh để so mặt</span>${[...m.a,...m.b].map(pid=>{const c=rfCk(pid);
      return `<div class="ttrow">${ttAv(D,pid,"sm")}<span class="grow"><b>${esc(ttPN(D,pid))}</b><br><small class="${c.ok?"okc":"wac"}">${c.ok&&c.t!=="có mặt"?"đã ":""}${c.t}</small></span>${c.ok?"":rfCallBtn(D,m,pid)}</div>`}).join("")}
      <small>Người đã check-in thì không cần gọi. Ai chưa tới: bấm “Nhờ BTC gọi tên”, máy BTC đọc qua loa.</small></section>`;
    ft=`<button class="ttln" data-act="ttx" aria-label="Quay lại">‹</button><button class="ttgo" data-act="ttstep" data-v="2">Tiếp: bốc thăm ›</button>`}
  if(st===2){h+=`<section class="ttbox"><span class="cap">Đội nào chọn mặt đồng xu?</span><div class="ttseg">${["a","b"].map(t=>`<button data-act="tttc" data-v="${t}" aria-pressed="${T.ch===t}">${ttAvs(D,t==="a"?m.a:m.b,"xs")}${tn(t)}</button>`).join("")}</div>
      ${T.ch?`<div class="ttseg">${[["S","Sấp"],["N","Ngửa"]].map(([v,l])=>`<button data-act="tttcall" data-v="${v}" aria-pressed="${T.call===v}">${l}</button>`).join("")}</div>`:""}</section>`;
    if(T.ch&&T.call)h+=`<section class="ttbox ctr"><span class="coin${T.res?"":" off"}${ttCoin&&Date.now()-ttCoin<1200?" spin":""}">${T.res==="N"?"NGỬA":T.res==="S"?"SẤP":"?"}</span>${T.res?`<b>Ra ${T.res==="N"?"Ngửa":"Sấp"} · ${tn(T.w)} thắng bốc thăm</b>`:""}<button class="ttln" data-act="ttflip">${T.res?"↻ Tung lại":"🪙 Tung đồng xu"}</button></section>`;
    if(T.w){const pk=T.pk||[],cur=pk.length&&pk[pk.length-1].v==="defer"?ttO(T.w):T.w,sideBy=pk.find(p=>p.v==="side");
      const opts=[["serve","Giao trước"],["recv","Nhận trước"],["side","Chọn bên sân"],["defer","Nhường chọn"]].filter(([v])=>!(v==="defer"&&pk.some(p=>p.v==="defer")));
      h+=`<section class="ttbox"><span class="cap">${tn(cur)} chọn một · đội kia lấy phần còn lại</span><div class="ttopts">${opts.map(([v,l])=>`<button data-act="ttpick" data-v="${v}" aria-pressed="${pk.some(p=>p.t===cur&&p.v===v)}"><b>${l}</b><small>${v==="serve"||v==="recv"?`${tn(ttO(cur))} chọn bên sân`:v==="side"?`${tn(ttO(cur))} chọn giao/nhận`:`${tn(ttO(cur))} chọn trước`}</small></button>`).join("")}</div>
        ${sideBy&&T.first==null?`<span class="cap">${tn(ttO(sideBy.t))} chọn giao hay nhận</span><div class="ttseg">${[["serve","Giao trước"],["recv","Nhận trước"]].map(([v,l])=>`<button data-act="ttpick2" data-v="${v}">${l}</button>`).join("")}</div>`:""}
        ${T.first!=null?`<b class="ttok">✓ ${tn(T.first)} giao trước</b>`:""}</section>`}
    ft=`<button class="ttln" data-act="ttstep" data-v="1" aria-label="Quay lại">‹</button><button class="ttgo" data-act="ttstep" data-v="3" ${T.first!=null?"":"disabled"}>Tiếp: vị trí đứng ›</button>`}
  if(st===3){h+=`<section class="ttbox"><span class="cap">Vị trí đứng ban đầu · bấm ô để đổi chỗ</span>${ttCourt(D,m,X,{pre:true})}<div class="ttrow"><small class="grow">Người ở ô phải của đội giao trước giao bóng đầu tiên.</small><button class="ttln" data-act="ttside">⇄ Đổi bên sân</button></div></section>
      <section class="ttbox"><span class="cap">Luật trận · BTC đã cài</span><div class="ttrule"><span>Chạm</span><b>${X.R.to}${X.R.w2?" · cách 2":""}${X.R.cap?` · tối đa ${X.R.cap}`:""}</b></div><div class="ttrule"><span>Số ván</span><b>${X.R.sets>1?`Thắng ${X.need}/${X.R.sets}`:"1 ván"}</b></div><div class="ttrule"><span>Tính điểm</span><b>${X.rally?"Rally":"Truyền thống"}</b></div><div class="ttrule"><span>Timeout</span><b>2 lần/ván · 1 phút</b></div></section>`;
    ft=`<button class="ttln" data-act="ttstep" data-v="2" aria-label="Quay lại">‹</button><button class="ttgo" data-act="ttstart">▶ Bắt đầu trận · ${X.rally?"0-0":"0-0-2"}</button>`}
  return h+`<div class="ttft">${ft}</div>`+rfAskDlg(D);
}
// Màn chính trọng tài: chỉ sân của mình (R2 chờ trận, R3 trận mới, R11 vừa lưu)
function rfMain(D){
  const cs=[...MYCT].sort((a,b)=>a-b);if(!cs.length)return dhPauseBar()+ycMine()+`<section class="rfwait"><b>Chưa được giao sân</b><span>Quét mã QR trọng tài của BTC để nhận sân.</span></section>`;
  let h=dhPauseBar()+ycMine();
  for(const k of cs){const m=D.playing.find(x=>Number(x.court)===k);
    if(m){const X=m.ref&&m.ref.started?ttRun(D,m):null;
      if(!rfSeen[k]||rfSeen[k]!==m.id){if(rfSeen[k]&&typeof navigator!=="undefined"&&navigator.vibrate)try{navigator.vibrate([250,120,250])}catch(e){}rfSeen[k]=m.id}
      if(X){h+=`<section class="dhnew"><span class="cap">● Đang nhập · ${esc(X.call())}</span><span class="tm">${ttAvs(D,m.a)}<b>${esc(ttTN(D,m,"a"))}</b></span><small>gặp</small><span class="tm">${ttAvs(D,m.b)}<b>${esc(ttTN(D,m,"b"))}</b></span><button class="ttgo" data-act="tt" data-id="${esc(m.id)}">Tiếp tục nhập điểm ›</button></section>`;continue}
      const R=mRule(m)||{to:+D.c.target||11,w2:winBy2(D.c),sets:1},lb=rfLb(D,m);
      const team=(ids,c)=>{const n=ids.filter(id=>rfCk(id).ok).length;return `<div class="rfteam" style="--tc:${c}"><div class="h"><b>${esc(ttTN(D,m,ids===m.a?"a":"b"))}</b><small>${n}/${ids.length} có mặt</small></div>${ids.map(id=>{const c2=rfCk(id);return `<div class="p">${av(D.pmap.get(id),"md",1)}<span class="t"><b>${esc(ttPN(D,id))}</b><small class="${c2.ok?"okc":"wac"}">${c2.ok?"✓ "+c2.t:"chưa check-in"}</small></span>${c2.ok?"":rfCallBtn(D,m,id)}</div>`}).join("")}</div>`};
      h+=`<section class="rfnew"><span class="cap">🔔 Máy đang rung · ${typeof m.createdAt==="number"?hm(m.createdAt):""}</span><b>TRẬN MỚI<br>VÀO SÂN ${esc(cName(k))}</b><span class="chips">${[lb.toUpperCase(),`Trận #${m.seq}`,`Chạm ${R.to}${R.w2?" · cách 2":""}`,R.sets>1?`${R.sets} set`:"1 ván"].filter(Boolean).map(t=>`<i>${esc(t)}</i>`).join("")}</span></section>`
        +rfCallStrip(D,m)+team(m.a,"#1f6fd1")+`<div class="rfvs"><i></i><b>VS</b><i></i></div>`+team(m.b,"#d9480f")
        +`<details class="dhquick"><summary>▸ Nhập nhanh tỉ số (không dùng màn trọng tài)</summary><div class="courts">${isG(D.c)?gCourt(D,gDerive(D),m):courtCard(D,m)}</div></details>`;
      h+=`<div class="ttft"><button class="ttln" data-act="dhcb" data-v="${k}">📣 Gọi BTC</button><button class="ttgo big" data-act="tt" data-id="${esc(m.id)}">NHẬN TRẬN ›</button></div>`+rfAskDlg(D);continue}
    rfSeen[k]=rfSeen[k]||"_";
    const last=[...D.done].filter(x=>Number(x.court)===k).pop();
    if(last&&last.doneAt&&Date.now()-last.doneAt<5*6e4)h+=`<div class="rfst g"><b>✓ Đã lưu vào giải</b><small>${last.a.map(id=>esc(nm(D,id))).join(" &amp; ")} ${last.sa}–${last.sb} ${last.b.map(id=>esc(nm(D,id))).join(" &amp; ")}</small></div>`;
    h+=`<section class="rfwait"><b>Chờ trận vào sân</b><span>BTC đưa trận vào là máy rung và hiện ở đây.</span></section>`;
    const P=rfPlan(D,k);if(P[0]){const GD=gDerive(D),g=P[0],A=GD.T.get(g.x),B=GD.T.get(g.y);h+=`<section class="ttbox"><span class="cap">Trận sau ở sân này (dự kiến)</span><span><b>${A?pairNm(D,A.p):"?"}</b> gặp <b>${B?pairNm(D,B.p):"?"}</b></span><small>${g.ko?esc(g.rn):g.grp!=null?`Bảng ${KOG[g.grp]}`:""} · ${esc(ruleTx(g.rule||koBase()))}</small></section>`}
  }
  const done=[...D.done].filter(m=>cs.includes(Number(m.court))).reverse(),busy=D.playing.some(m=>cs.includes(Number(m.court)));
  if(done.length&&!busy)h+=`<section class="ttbox"><span class="cap">Đã xong · ${done.length} trận</span>${done.slice(0,8).map(m=>`<div class="ttrow"><span class="grow">${m.a.map(id=>esc(nm(D,id))).join(" &amp; ")} ${m.sa}–${m.sb} ${m.b.map(id=>esc(nm(D,id))).join(" &amp; ")}</span><small>${m.doneAt?hm(m.doneAt):""}</small></div>`).join("")}</section>`;
  // Lối ra để kín: chỉ hiện khi sân trống, chữ nhỏ cuối trang
  if(!D.playing.some(m=>cs.includes(Number(m.court)))&&REFQ)h+=`<div class="rflinks"><button data-act="rfaway">Chế độ người chơi</button><span>·</span><button data-act="rfendask">Kết thúc ca</button></div>`;
  if(!D.playing.some(m=>cs.includes(Number(m.court))))h+=`<div class="ttft"><button class="ttln wide" data-act="dhcb" data-v="${cs[0]}">📣 Gọi BTC</button></div>`;
  return h;
}
// Nhận sân (R1)
function rfClaim(D){
  const q=dhClaim();if(!q||!q.c||legacy||!authUser)return "";
  if(REFQ&&Number(REFQ.court)===Number(q.c)&&REFQ.sid===D.sid){try{sessionStorage.removeItem("pb-ttq")}catch(e){}return ""}
  const P=rfPlan(D,q.c);
  return `<div class="ttfs rfc" role="dialog" aria-label="Nhận vai trọng tài">${rfHead(q.c,"Mã của ban tổ chức")}
    <div class="rfcb"><small>${esc(CLUB?.name||"")} · ${esc(rfGiaiNm(D))}</small><b class="big">SÂN ${esc(cName(q.c))}</b><span>Bạn được mời làm <b>trọng tài</b> sân này.</span>
      <section class="ttbox"><div class="ttrow"><span class="grow">Tên hiện cho BTC</span>${rfNameEd?`<input id="rf-name" data-draft="rf-name" maxlength="40" value="${esc(rfName())}">`:`<b>${esc(rfName())}</b><button class="lnk" data-act="ttname" aria-label="Sửa tên">✎</button>`}</div>${P.length?`<div class="ttrow"><span class="grow">Hôm nay</span><b>${P.length} trận dự kiến</b></div>`:""}</section></div>
    <div class="ttft"><button class="ttln" data-act="dhclaimx">Không phải tôi</button><button class="ttgo" data-act="dhclaimok">✓ Nhận sân ${esc(cName(q.c))}</button></div></div>`;
}
// BTC thu hồi sân (R13)
function rfByeLayer(D){
  if(!rfBye)return "";if(rfBye.n==null)rfBye.n=D.done.filter(m=>Number(m.court)===Number(rfBye.c)).length;
  const c=esc(cName(rfBye.c)),tx=rfBye.why==="chot"?`Giải đã chốt · quyền trọng tài sân ${c} đã hết`:rfBye.why==="self"?`Bạn đã kết thúc ca ở sân ${c}`:`BTC đã thu hồi sân ${c}, hoặc sân đã giao cho trọng tài khác`;
  return `<div class="ttfs rfc" role="dialog" aria-label="Cảm ơn">${rfHead(rfBye.c,"Đã kết thúc ca trọng tài")}<div class="rfcb"><span class="em">🙏</span><b class="h">Cảm ơn bạn đã làm trọng tài</b><span>${tx} · bạn làm ${rfBye.n} trận.</span><small>Máy này đã về chế độ bình thường.</small></div>
    <div class="ttft"><button class="ttgo" data-act="ttbye">Về trang giải</button></div></div>`;
}

let rfGone=false;
// Khung tập trung: trọng tài nhận sân bằng QR chỉ thấy sân của mình, không có thanh tab
function rfShell(D){const c=[...MYCT].sort((a,b)=>a-b)[0];
  const hd=rfHead(c,`${esc(rfGiaiNm(D))} · Trọng tài ${esc((REFQ&&REFQ.name)||rfName())}`);
  return `<div class="rfsh">${hd}<div class="mxbody rf">${rfMain(D)}</div></div>${dhSheets(D)}${rfMenuV(c)}`}
let rfAway=false,rfMenu=false,rfEndAsk=false;
// ⋯ của trọng tài: xem trang CLB (vẫn giữ sân), kết thúc ca (có xác nhận)
function rfMenuV(c){
  if(rfEndAsk)return `<div class="rfdlg"><div class="b"><b class="h">Kết thúc ca trọng tài sân ${esc(cName(c))}?</b><small>Sân trả lại cho BTC. Muốn làm tiếp phải quét mã mới trên máy BTC.</small>
    <div class="two"><button class="ttln" data-act="rfendx">Huỷ</button><button class="ttgo" data-act="rfend">Kết thúc ca</button></div></div></div>`;
  if(!rfMenu)return "";
  return `<div class="mxdim" data-act="rfmenux"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Trọng tài"><span class="grab"></span><b class="mxh">Trọng tài sân ${esc(cName(c))}</b>
    <button class="gmli" data-act="rfaway"><i>🏠</i><span class="t"><b>Xem trang CLB</b><small>Vẫn giữ sân · có dải để quay lại</small></span><span aria-hidden="true">›</span></button>
    <button class="gmli" data-act="rfendask"><i>⏻</i><span class="t"><b class="red">Kết thúc ca trọng tài</b><small>Trả sân cho BTC, máy về chế độ bình thường</small></span><span aria-hidden="true">›</span></button></div>`;
}
// Dải nhắc khi đang xem trang CLB
function rfAwayBar(D){
  if(!((rfOn()||(MINI&&mxAs&&mxAs.rf&&!mxAs.cw))&&REFQ&&rfAway))return "";const c=Number(REFQ.court),m=D.playing.find(x=>Number(x.court)===c),nw=m&&!(m.ref&&m.ref.started);
  return `<button class="rfaway${nw?" new":""}" data-act="rfback"><span>${nw?`🔔 Trận mới vào sân ${esc(cName(c))}`:`⚑ Bạn đang làm trọng tài sân ${esc(cName(c))}`}</span><b>Về sân ›</b></button>`;
}
// Hết giải (đã chốt) thì quyền trọng tài hết: tự trả sân, hiện cảm ơn
function rfCheckEnd(D){
  if(!MINI||canWrite||!REFQ||!authUser||rfGone)return;
  if(REFQ.sid!=null&&D.sid&&REFQ.sid!==D.sid){rfGone=true;rfBye={c:Number(REFQ.court),why:"chot",n:null};rfAway=false;
    db.collection("refs").doc(authUser.uid).delete().catch(()=>{})}
}
async function rfAct2(act,b){
  if(act==="rfmenu"){rfMenu=true;render();return true}
  if(act==="rfmenux"){rfMenu=false;render();return true}
  if(act==="rfaway"){rfMenu=false;rfAway=true;if(mxMode()!=="choi")mxSetMode("choi");go("home");return true}
  if(act==="rfback"){rfAway=false;go("app",{tab:"san"});return true}
  if(act==="rfendask"){rfMenu=false;rfEndAsk=true;render();return true}
  if(act==="rfendx"){rfEndAsk=false;render();return true}
  if(act==="rfend"){rfEndAsk=false;if(!authUser||!REFQ)return true;const c=Number(REFQ.court),D=derive();
    rfGone=true;rfAway=false;rfBye={c,why:"self",n:D.done.filter(m=>Number(m.court)===c).length};
    await write(()=>db.collection("refs").doc(authUser.uid).delete(),"Đã kết thúc ca trọng tài");render();return true}
  return false;
}
// Máy BTC: mã dùng 1 lần (quét xong tự đổi), mỗi sân 1 trọng tài (người nhận sau thay người trước), bỏ hồ sơ của giải cũ
let rfGuardOn=false;
async function rfGuard(){
  if(!canWrite||legacy||rfGuardOn||!S.refsQ||!S.refqr)return;rfGuardOn=true;
  try{const sid=(cfg().session||1),Q=S.refqr,by={};
    for(const r of S.refsQ){if(r.sid!=null&&r.sid!==sid){await db.collection("refs").doc(r.id).delete().catch(()=>{});continue}(by[r.court]=by[r.court]||[]).push(r)}
    for(const [c,L] of Object.entries(by)){L.sort((a,b)=>(b.at||0)-(a.at||0));
      for(const r of L.slice(1))await db.collection("refs").doc(r.id).delete().catch(()=>{});
      const q=Q[c];if(q&&q.code===L[0].code)await db.collection("refqr").doc(String(c)).set({code:ckRand(),at:Date.now(),sid}).catch(()=>{})}}
  finally{rfGuardOn=false}
}
// Thao tác riêng của luồng trọng tài Mini App
async function rfAct(act,b){
  const v=b.dataset.v;
  if(act==="ttstep"){rfStep=Math.max(1,Math.min(3,+v||1));{const m=ttM();if(m&&m.ref&&!m.ref.started&&(m.ref.st||1)!==rfStep)ttWrite(m,{...m.ref,st:rfStep})}render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ttname"){rfNameEd=true;render();return true}
  if(act==="ttbye"){rfBye=null;go("home");return true}
  if(act==="ttcallx"){rfAsk=null;render();return true}
  if(act==="ttcallp"&&rfOn()){rfAsk={p:v,m:b.dataset.m||ttId};render();return true}
  if(act==="ttcallgo"){const m=(S.matches||[]).find(x=>x.id===(b.dataset.m||ttId));rfAsk=null;if(!m){render();return true}
    const D=derive(),tx=rfCallTx(D,m,v),u=authUser&&authUser.uid;
    const dup=(S.calls||[]).find(x=>x.k==="loa"&&x.uid===u&&x.txt===tx&&x.st!=="skip"&&Date.now()-(x.at||0)<60e3);
    if(dup){toast("Cùng một tên chỉ gửi lại được sau 1 phút.");render();return true}
    delete rfErr[v];render();
    const ok=await dhAddCall({k:"loa",txt:tx.slice(0,400)});
    if(!ok)rfErr[v]=1;render();return true}
  return false;
}
