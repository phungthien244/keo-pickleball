/* ---------- Điều hành giải: máy loa, yêu cầu (calls), ô sân, hộp việc, nghỉ giữa giờ, thông báo loa, sự cố,
   trọng tài nhận sân bằng QR, Sân của tôi, trao giải ----------
   calls/{id}: {k:"loa"|"btc", court, txt, why, by, uid, at, sid, st:"new"|"done"|"skip"}
   refqr/{court}: {code, at} (BTC tạo, in QR) · refs/{uid}: {court, code, name, at} (trọng tài quét QR nhận sân)
   app/config: loaDev (máy nối loa), loaMode "auto"|"duyet", pause {at, until}, award {i: ts} */
const DEVID=(()=>{try{let d=localStorage.getItem("pb-dev");if(!d){d=Math.random().toString(36).slice(2,10);localStorage.setItem("pb-dev",d)}return d}catch(e){return "dev"}})();
const loaDev=()=>(cfg()||{}).loaDev||"";
const isLoaDev=()=>!loaDev()||loaDev()===DEVID;
const dhCalls=(k,st="new")=>(S.calls||[]).filter(x=>x.k===k&&(!st||x.st===st)).sort((a,b)=>(a.at||0)-(b.at||0));
let unsubCalls=null,dhPumpT=null;
function watchCalls(){
  if(unsubCalls){try{unsubCalls()}catch(e){}unsubCalls=null}
  if(dhPumpT){clearInterval(dhPumpT);dhPumpT=null}
  if(legacy||!authUser||!(canWrite||REF)||!window.FB||!FB.onSnapshot)return;
  try{unsubCalls=FB.onSnapshot(FB.collection(FB.fs,PFX+"calls"),{},q=>{const t0=Date.now()-12*36e5;S.calls=q.docs.map(d=>({id:d.id,...d.data()})).filter(x=>(x.at||0)>t0);render();dhPump()},()=>{})}catch(e){}
  if(canWrite&&typeof setInterval==="function")dhPumpT=setInterval(dhPump,3000);
}
async function dhAddCall(o){
  const D=derive();
  try{await db.collection("calls").doc().set({...o,at:Date.now(),uid:(authUser&&authUser.uid)||"",by:who(),sid:D.sid,st:"new"});return true}
  catch(e){toast("Chưa gửi được, kiểm tra mạng rồi thử lại.");return false}
}
// Máy không nối loa: lời đọc thành yêu cầu gửi về máy loa (chống gọi lặp trong 1 phút)
function loaRoute(text){
  if(legacy||isLoaDev()||!(canWrite||REF))return false;
  const dup=(S.calls||[]).find(x=>x.k==="loa"&&x.txt===text&&Date.now()-(x.at||0)<60e3);
  if(dup){toast("Đã nhờ đọc câu này rồi, chờ máy loa.");return true}
  dhAddCall({k:"loa",txt:String(text).slice(0,400)}).then(ok=>{if(ok)toast("Đã gửi tới máy loa · chờ BTC đọc")});
  return true;
}
// Máy loa: tự đọc lần lượt các yêu cầu (cách nhau ít nhất 3 giây)
let dhLastSpk=0;
function dhPump(){
  if(!canWrite||!loaDev()||loaDev()!==DEVID||(cfg().loaMode||"auto")!=="auto"||loaMuted()||LOA.key!==null||Date.now()-dhLastSpk<3000)return;
  const x=dhCalls("loa")[0];if(!x)return;
  dhLastSpk=Date.now();db.collection("calls").doc(x.id).update({st:"done",doneAt:Date.now()}).catch(()=>{});
  speak(x.txt,"","call:"+x.id,true);
}
const pausedNow=()=>{const p=(cfg()||{}).pause;return !!(p&&p.at&&(!p.until||p.until>Date.now()))};

/* ----- Ô sân theo trạng thái + thẻ sân của ô đang chọn ----- */
let dhCt=null;
function dhBoard(D,o){
  const c=D.c,n=Math.max(1,+c.courts||1),btc=dhCalls("btc"),now=Date.now();
  const tm=ids=>ids.map(id=>{const w=String(D.pmap.get(id)?.name||"?").trim().split(/\s+/);return w[w.length-1]}).join("&amp;");
  let h=`<div class="dhgrid">`;
  for(let k=1;k<=n;k++){const m=o.live.find(x=>Number(x.court)===k),call=btc.find(x=>Number(x.court)===k),age=m&&typeof m.createdAt==="number"?Math.round((now-m.createdAt)/6e4):0;
    const st=call?"x":m?(!m.ref&&age>=20?"w":"g"):"e",ref=m&&m.ref?m.ref.byName||"Trọng tài":m?"BTC nhập":"trống";
    const big=call?"CẦN BTC":m?(m.ref&&m.ref.started?ttLiveTx(D,m):`${age}′`):"—";
    const sub=call?esc(call.why||"gọi BTC"):m?`${tm(m.a)} · ${tm(m.b)}`:(o.fill?"Đưa trận kế ›":"chờ trận");
    h+=`<button class="dhct ${st}${dhCt===k?" on":""}" data-act="dhct" data-v="${k}"><span class="h"><b>SÂN ${esc(cName(k))}</b><small>${esc(ref)}</small></span><b class="big num">${esc(big)}</b><small>${sub}${st==="w"?" · chưa nhập điểm":""}</small></button>`}
  h+=`</div>`;
  // (bản test: hiện mọi thẻ sân như trước để kiểm tra nhập điểm)
  if(typeof window!=="undefined"&&window.__PBTEST&&!dhCt)h+=o.live.map(m=>o.card(m)).join("");
  else if(dhCt){const m=o.live.find(x=>Number(x.court)===dhCt);
    h+=m?o.card(m):`<div class="dhempty"><span>Sân ${esc(cName(dhCt))} đang trống</span>${o.fill?`<button class="ball" data-act="${o.fill}">Đưa trận kế vào sân</button>`:""}</div>`}
  else h+=`<small class="dhhint">Bấm ô sân để mở thẻ sân: nhập điểm nhanh, huỷ trận, màn trọng tài</small>`;
  return h;
}
// Hộp "Việc cần xử lý": gấp trước
function dhInbox(D){
  const L=[],X=ckSched(),auto=(cfg().loaMode||"auto")==="auto"&&loaDev()===DEVID;
  for(const x of dhCalls("btc"))L.push(`<div class="dhin"><span class="tg r">GẤP</span><span class="t"><b>Sân ${esc(cName(x.court))} cần BTC</b><small>${esc(x.why||"")} · ${esc(x.by||"")} ${x.at?hm(x.at):""}</small></span><button class="sm" data-act="dhsc" data-id="${esc(x.id)}">Tới</button></div>`);
  if(!auto)for(const x of dhCalls("loa"))L.push(`<div class="dhin"><span class="tg y">LOA</span><span class="t"><b>${esc(String(x.txt).slice(0,70))}</b><small>${esc(x.by||"")} nhờ · ${x.at?hm(x.at):""}</small></span><span class="bb"><button class="sm" data-act="dhloa" data-id="${esc(x.id)}">Đọc</button><button class="sm ln" data-act="dhloax" data-id="${esc(x.id)}">Bỏ</button></span></div>`);
  if(X&&isAdm())for(const r of ckPending().filter(r=>r.sid===X.id))L.push(`<div class="dhin"><span class="tg b">CHECK-IN</span><span class="t"><b>${esc(ckName(D,r))}${r.walkin?" xin vào":" vừa quét"}</b><small>${esc(ckPayLb(r))}</small></span><button class="sm" data-act="ckview" data-id="${esc(r.id)}">Duyệt</button></div>`);
  for(const m of D.playing)if(!m.ref&&typeof m.createdAt==="number"&&Date.now()-m.createdAt>20*6e4)L.push(`<div class="dhin"><span class="tg y">SÂN</span><span class="t"><b>Sân ${esc(cName(m.court))} · ${Math.round((Date.now()-m.createdAt)/6e4)}′ chưa nhập điểm</b><small>trận #${m.seq}</small></span><button class="sm" data-act="dhct" data-v="${Number(m.court)}">Xem</button></div>`);
  const q=auto?dhCalls("loa").length:0;
  return `<section class="dhbox"><span class="cap">Việc cần xử lý · ${L.length}${q?` · loa đang đọc ${q} yêu cầu`:""}</span>${L.join("")||`<small class="rule">Không có việc gì. Yêu cầu của trọng tài, check-in chờ duyệt, sân lâu chưa nhập điểm sẽ hiện ở đây.</small>`}</section>`;
}
function dhPauseBar(){
  const p=cfg().pause;if(!pausedNow())return "";
  return `<div class="dhpause"><span><b>⏸ Đang nghỉ giữa giờ</b>${p.until?` · còn <b class="num" data-cd="${p.until}">${gdMMSS(p.until-Date.now())}</b>`:" · tới khi BTC mở lại"}</span>${canWrite?`<button class="sm" data-act="dhresume">Đánh tiếp</button>`:""}</div>`;
}
const dhFoot=()=>`<div class="two dhfoot"><button class="line" data-act="dhps">⏸ Nghỉ giữa giờ</button><button class="line" data-act="dhan">📣 Thông báo loa</button></div>`;
function dhLive(D,o){if(o.live.length||D.c.courts)gdTick();return dhPauseBar()+dhBoard(D,o)+dhInbox(D)+dhFoot()}

/* ----- Bảng trượt: sự cố, nghỉ, thông báo, QR trọng tài, gọi BTC, bàn giao ----- */
let dhSC=null,dhPS=false,dhAN=false,dhQR=false,dhCB=null,dhGV=false,dhAw=false;
const dhDim=a=>`<div class="mxdim" data-act="${a}"></div>`;
const DH_ANN=["Mời các vận động viên chưa check-in tới bàn ban tổ chức","Còn 10 phút bắt đầu vòng knockout","Nước uống đã có ở bàn ban tổ chức","Xin mời các vận động viên giữ trật tự khu vực sân đang thi đấu"];
const DH_WHY=[["Tranh cãi điểm","Trận tạm dừng · BTC xem lịch sử từng pha"],["Chấn thương","Gửi kèm timeout y tế"],["Thiếu người, bỏ cuộc","BTC xác nhận xử thua"],["Cần bóng, nước, việc khác",""]];
function dhSheets(D){
  let h="";
  if(dhSC){const x=(S.calls||[]).find(z=>z.id===dhSC);if(!x){dhSC=null}else{
    const m=D.playing.find(z=>Number(z.court)===Number(x.court)),X=m&&m.ref&&m.ref.started?ttRun(D,m):null,last=X?X.log.filter(l=>l.k==="p").slice(-3).reverse():[];
    const used=new Set(D.playing.map(z=>Number(z.court))),free=Array.from({length:Math.max(1,+D.c.courts||1)},(_,i)=>i+1).filter(k=>!used.has(k));
    h+=dhDim("dhscx")+`<div class="mxsheet dhsh" role="dialog" aria-label="Sự cố sân ${esc(cName(x.court))}"><span class="grab"></span>
      <div class="dhsch"><span class="s">S${esc(cName(x.court))}</span><span><b>Sân ${esc(cName(x.court))} · ${esc(x.why||"cần BTC")}</b><small>${esc(x.by||"")} gọi ${x.at?hm(x.at):""}${X?` · đang ở ${X.call()}`:""}</small></span></div>
      ${m?`<span class="mxsec">Trận đang đánh</span><span>${m.a.map(id=>nm(D,id)).join(" &amp; ")} <span class="l">vs</span> ${m.b.map(id=>nm(D,id)).join(" &amp; ")}</span>${last.length?`<div class="dhlast">${last.map(l=>`<span>${l.at?hm(l.at):""} · ${esc(l.tx)} → <b>${l.after}</b></span>`).join("")}</div>`:""}
      <div class="two">${X?`<button class="line" data-act="dhhist" data-id="${esc(m.id)}">Xem lịch sử từng pha</button><button class="line" data-act="dhundo" data-id="${esc(m.id)}">${armed("dhundo:"+m.id)?"Bấm lần nữa":"Hoàn tác pha cuối"}</button>`:""}</div>
      ${free.length?`<span class="mxsec">Chuyển trận sang sân khác (sân hỏng, đèn tắt…)</span><div class="dhfree">${free.map(k=>`<button class="line sm" data-act="dhmove" data-id="${esc(m.id)}" data-v="${k}">Sân ${esc(cName(k))}</button>`).join("")}</div>`:""}`:`<small class="rule">Sân này hiện không có trận.</small>`}
      <div class="two b"><button class="line" data-act="dhscx">Để sau</button><button class="primary" data-act="dhscok" data-id="${esc(x.id)}">✓ Xong · cho đánh tiếp</button></div></div>`}}
  if(dhPS)h+=dhDim("dhpsx")+`<div class="mxsheet dhsh" role="dialog" aria-label="Nghỉ giữa giờ"><span class="grab"></span><b class="mxh">Nghỉ giữa giờ</b><span class="mxsec">Bao lâu?</span>
    <div class="dhopts">${[[5,"5′"],[10,"10′"],[15,"15′"],[0,"Tới khi mở"]].map(([v,l])=>`<button class="line" data-act="dhpsgo" data-v="${v}">${l}</button>`).join("")}</div>
    <small class="rule">Trong lúc nghỉ: không đưa trận mới vào sân, trận đang đánh vẫn đánh xong. Loa thông báo giờ đánh tiếp, màn người chơi hiện đồng hồ đếm ngược.</small><button class="line" data-act="dhpsx">Huỷ</button></div>`;
  if(dhAN)h+=dhDim("dhanx")+`<div class="mxsheet dhsh" role="dialog" aria-label="Thông báo loa"><span class="grab"></span><b class="mxh">📣 Thông báo loa</b><span class="mxsec">Câu mẫu · bấm để chọn</span>
    <div class="dhann">${DH_ANN.map((t,i)=>`<button class="line" data-act="dhanpick" data-v="${i}">${esc(t)}</button>`).join("")}</div>
    <span class="mxsec">Hoặc gõ câu riêng</span><textarea id="dh-ann" data-draft="dh-ann" rows="3" placeholder="Mời các cặp bảng B tập trung ở sân 4…">${esc(val("dh-ann",""))}</textarea>
    <small class="rule">${isLoaDev()?"Đọc ngay trên máy này.":"Gửi tới máy loa, chen trước hàng chờ."}</small>
    <div class="two b"><button class="line" data-act="dhanx">Huỷ</button><button class="primary" data-act="dhango">📣 Đọc ngay</button></div></div>`;
  if(dhQR){const n=Math.max(1,+D.c.courts||1),Q=S.refqr||{},k=Math.min(n,Math.max(1,+dhQR||1)),q=Q[k],R=(S.refsQ||[]).filter(r=>Number(r.court)===k);
    h+=dhDim("dhqrx")+`<div class="mxsheet dhsh" role="dialog" aria-label="QR trọng tài Sân ${esc(cName(k))}"><span class="grab"></span><b class="mxh">QR trọng tài</b><small class="rule">Chọn sân, đưa trọng tài sân đó quét bằng Zalo. Mỗi lần chỉ hiện một mã để không quét nhầm.</small>
      <div class="dhqrct" role="group" aria-label="Chọn sân">${Array.from({length:n},(_,i)=>i+1).map(c=>{const has=(S.refsQ||[]).some(r=>Number(r.court)===c);return `<button data-act="dhqrk" data-v="${c}" aria-pressed="${c===k}">Sân ${esc(cName(c))}${has?" ✓":""}</button>`}).join("")}</div>
      <div class="dhqr one"><b>SÂN ${esc(cName(k))}</b>${q?qrSvgText(dhRefLink(k,q.code),230):`<span class="sk"></span>`}<small>${R.length?`Trọng tài: ${R.map(r=>esc(r.name||"?")).join(", ")}`:"Chưa có trọng tài nhận sân này"}</small></div>
      ${R.map(r=>`<div class="srow"><span>${esc(r.name||"Trọng tài")}</span><button class="ghost" data-act="dhrefx" data-id="${esc(r.id)}">${armed("dhrefx:"+r.id)?"Bấm lần nữa":"Thu hồi"}</button></div>`).join("")}
      ${q?`<button class="line" data-act="cplink" data-v="${esc(dhRefLink(k,q.code))}">Copy link trọng tài Sân ${esc(cName(k))}</button>`:""}
      <div class="two b"><button class="line" data-act="dhqrx">Đóng</button><button class="line red" data-act="dhqrnew">${armed("dhqrnew:x")?"Bấm lần nữa":"Đổi mã · thu hồi tất cả"}</button></div></div>`}
  if(dhCB!=null)h+=dhDim("dhcbx")+`<div class="mxsheet dhsh" role="dialog" aria-label="Gọi BTC"><span class="grab"></span><span class="mxsec">Gọi BTC tới Sân ${esc(cName(dhCB))}</span><b class="mxh">Chuyện gì xảy ra?</b>
    <div class="dhwhy">${DH_WHY.map(([t,s],i)=>`<button class="line" data-act="dhcbgo" data-v="${i}"><b>${t}</b>${s?`<small>${s}</small>`:""}</button>`).join("")}</div><button class="line" data-act="dhcbx">Huỷ</button></div>`;
  if(dhGV){const c=REFQ&&REFQ.court;
    h+=dhDim("dhgvx")+`<div class="mxsheet dhsh" role="dialog" aria-label="Bàn giao sân"><span class="grab"></span><b class="mxh">Bàn giao ${c?"Sân "+esc(cName(c)):"sân"}</b>
      <small class="rule">Người nhận quét QR dán ở sân để làm trọng tài tiếp. Đang giữa trận thì lưu tỉ số trước, hoặc người sau mở Màn trọng tài nhập tiếp đúng điểm.</small>
      <div class="two b"><button class="line" data-act="dhgvx">Huỷ</button><button class="primary" data-act="dhgvok">${armed("dhgvok:x")?"Bấm lần nữa":"Kết thúc ca trọng tài"}</button></div></div>`}
  return h;
}

/* ----- Trọng tài nhận sân bằng QR ----- */
let REFQ=null,unsubRefQ=null,MYCT0=[];
const dhRefLink=(k,code)=>miniLink(CID)+`&tt=${encodeURIComponent(k)}&ttk=${encodeURIComponent(code)}`;
function dhRefParam(){try{const q=new URLSearchParams(location.search||""),c=q.get("tt"),k=q.get("ttk");if(c&&k)sessionStorage.setItem("pb-ttq",JSON.stringify({c:+c||0,k}))}catch(e){}}
if(MINI)dhRefParam();
const dhClaim=()=>{try{return JSON.parse(sessionStorage.getItem("pb-ttq")||"null")}catch(e){return null}};
function applyRef(){
  const q=REFQ&&Date.now()-(REFQ.at||0)<20*36e5?Number(REFQ.court):0;
  MYCT=[...new Set([...MYCT0,...(q?[q]:[])])];
  if(!canWrite)REF=(ROLE==="scorer"||ROLE==="pin")&&!legacy||!!q;
}
function watchRefQ(){
  if(unsubRefQ){try{unsubRefQ()}catch(e){}unsubRefQ=null}REFQ=null;
  if(legacy||!authUser||!window.FB||!FB.onSnapshot){applyRef();return}
  try{unsubRefQ=FB.onSnapshot(FB.doc(FB.fs,PFX+"refs/"+authUser.uid),{},s=>{REFQ=s.exists()?s.data():null;applyRef();watchCalls();render()},()=>{})}catch(e){}
}
function dhClaimLayer(D){
  const q=dhClaim();if(!q||!q.c||legacy||!authUser)return "";
  return `<div class="ttfs" role="dialog" aria-label="Nhận vai trọng tài"><div class="dhclaim"><span class="s">S${esc(cName(q.c))}</span><span class="cap">${esc(CLUB?.name||"")} · hôm nay</span><b>Bạn sẽ làm trọng tài<br>Sân ${esc(cName(q.c))}</b>
    <span>Bạn nhập điểm cho các trận ở Sân ${esc(cName(q.c))}. Loa do máy BTC phát, bạn chỉ cần bấm nhờ gọi.</span><span class="who">${esc(who())}</span>
    <button class="ttgo" data-act="dhclaimok">✓ Nhận làm trọng tài Sân ${esc(cName(q.c))}</button><button class="ttln" data-act="dhclaimx">Không phải tôi</button></div></div>`;
}

/* ----- Sân của tôi (trọng tài) ----- */
function vSanToi(D){
  const cs=[...MYCT].sort((a,b)=>a-b);
  let h=dhPauseBar()+`<div class="dhme"><span class="cap">Sân của tôi</span><b>${cs.length?cs.map(k=>"Sân "+esc(cName(k))).join(", "):"Chưa được giao sân"}</b>${REFQ?`<small>Nhận qua QR lúc ${hm(REFQ.at||Date.now())}</small>`:""}</div>`;
  for(const k of cs){const m=D.playing.find(x=>Number(x.court)===k);
    if(m){const X=m.ref&&m.ref.started?ttRun(D,m):null;
      h+=`<section class="dhnew"><span class="cap">${X?"● Đang nhập":"● Trận mới vào sân"}${typeof m.createdAt==="number"?` · ${hm(m.createdAt)}`:""}</span>
        <span class="tm">${ttAvs(D,m.a)}<b>${esc(ttTN(D,m,"a"))}</b></span><small>gặp</small><span class="tm">${ttAvs(D,m.b)}<b>${esc(ttTN(D,m,"b"))}</b></span>
        <small>Sân ${esc(cName(k))} · trận #${m.seq}${X?` · ${esc(X.call())}`:""}</small><button class="ttgo" data-act="tt" data-id="${esc(m.id)}">${X?"Tiếp tục nhập điểm ›":"Nhận trận ›"}</button></section>
        ${X?"":`<details class="dhquick"><summary>Nhập nhanh tỉ số (không dùng màn trọng tài)</summary><div class="courts">${isG(D.c)?gCourt(D,gDerive(D),m):courtCard(D,m)}</div></details>`}`}
    else h+=`<section class="dhnew e"><span class="cap">Sân ${esc(cName(k))}</span><b>Chờ BTC đưa trận vào sân</b><small>Có trận mới thì hiện ở đây.</small></section>`}
  const done=[...D.done].filter(m=>cs.includes(Number(m.court))).reverse().slice(0,6);
  if(done.length)h+=`<section class="dhbox"><span class="cap">Đã xong · ${done.length}</span>${done.map(m=>`<div class="dhin"><span class="t"><b>${m.a.map(id=>nm(D,id)).join(" &amp; ")} ${m.sa}–${m.sb} ${m.b.map(id=>nm(D,id)).join(" &amp; ")}</b><small>${m.doneAt?hm(m.doneAt):""}</small></span></div>`).join("")}</section>`;
  return h+`<div class="two dhfoot"><button class="line" data-act="dhcb" data-v="${cs[0]||1}">📣 Gọi BTC</button>${REFQ?`<button class="line" data-act="dhgv">Bàn giao sân</button>`:""}</div>`;
}

/* ----- Trao giải ----- */
function dhAward(D){
  const M=money(D),pz=prizes(D,M),aw=cfg().award||{},order=pz.map((p,i)=>i).reverse(),nx=order.find(i=>!aw[i]);
  const nmOf=p=>p.ids.map(id=>esc(D.pmap.get(id)?.name||"?")).join(" &amp; ");
  if(!pz.length)return `<div class="empty"><strong>Giải này không có giải thưởng</strong>Bật Giải thưởng ở thẻ Tiền nếu muốn trao.</div>`;
  const pod=[1,0,2].filter(i=>pz[i]).map(i=>`<div class="pd p${i}"><span class="avs">${pz[i].ids.map(id=>av(D.pmap.get(id),"sm",1)).join("")}</span><small>${nmOf(pz[i])}</small><span class="bx"><b>${i+1}</b></span></div>`).join("");
  return `<section class="dhpod"><span class="cap">${nx!=null?"Trao giải":"✓ Đã trao xong"}</span><div class="pods">${pod}</div></section>
    <section class="dhbox">${order.map(i=>{const p=pz[i],done=!!aw[i];return `<div class="dhin"><span class="tg ${done?"g":"y"}">${done?"ĐÃ TRAO":"CHƯA"}</span><span class="t"><b>${esc(p.label)} · ${fmtK(p.k)}</b><small>${nmOf(p)}</small></span>${spkBtn("aw:"+i,`<button class="sm${done?" ln":""}" data-act="dhaw" data-v="${i}">📣 ${done?"Đọc lại":"Gọi lên"}</button>`)}</div>`}).join("")}</section>`;
}
const dhAwText=(D,p)=>`${p.label}${p.k?`, trị giá ${fmtK(p.k).replace("tr"," triệu").replace("k"," nghìn")}`:""}, xin chúc mừng ${p.ids.map(id=>D.pmap.get(id)?.name||"").filter(Boolean).join(" và ")}. Xin mời lên nhận giải.`;

/* ----- Mẫu giải: tạo nhanh giải giống giải đã lưu làm mẫu ----- */
function dhTplStrip(D){
  if(route!=="app"||routeX)return "";
  const T=(S.sched||[]).filter(x=>x.tpl).slice(0,6);if(!T.length)return "";
  return `<section class="dhbox"><span class="cap">Tạo nhanh từ mẫu</span>${T.map(x=>`<div class="dhin"><span class="t"><b>${esc(xName(x))}</b><small>${esc([xFmt(x),x.at?`${dowVN(x.at)} ${hm(x.at)}`:"",x.courts?`${x.courts} sân`:""].filter(Boolean).join(" · "))}</small></span><button class="sm" data-act="dhtpl" data-id="${esc(x.id)}">Tạo</button></div>`).join("")}</section>`;
}

/* ----- thao tác ----- */
async function dhAct(act,b){
  if(!act.startsWith("dh"))return false;
  const id=b.dataset.id,v=b.dataset.v,D=derive();
  // trọng tài và BTC đều dùng
  if(act==="dhclaimx"){try{sessionStorage.removeItem("pb-ttq")}catch(e){}render();return true}
  if(act==="dhclaimok"){const q=dhClaim();if(!q||!authUser)return true;
    try{await db.collection("refs").doc(authUser.uid).set({court:Number(q.c),code:String(q.k),name:who(),at:Date.now(),sid:D.sid});try{sessionStorage.removeItem("pb-ttq")}catch(e){}toast(`Bạn là trọng tài Sân ${cName(q.c)} hôm nay`);go("app",{tab:"san"})}
    catch(e){toast("Mã QR đã đổi hoặc hết hạn. Nhờ BTC đưa mã mới.")}return true}
  if(act==="dhcb"){dhCB=Number(v)||1;render();return true}
  if(act==="dhcbx"){dhCB=null;render();return true}
  if(act==="dhcbgo"){const w=DH_WHY[+v];const c=dhCB;dhCB=null;if(w&&c&&await dhAddCall({k:"btc",court:c,why:w[0]}))toast("Đã gọi BTC · máy BTC hiện thông báo đỏ");render();return true}
  if(act==="dhgv"){dhGV=true;render();return true}
  if(act==="dhgvx"){dhGV=false;render();return true}
  if(act==="dhgvok"){if(!armOr("dhgvok:x"))return true;dhGV=false;if(authUser)await write(()=>db.collection("refs").doc(authUser.uid).delete(),"Đã kết thúc ca trọng tài");return true}
  if(!canWrite)return true;
  if(act==="dhct"){const k=Number(v);dhCt=dhCt===k?null:k;render();return true}
  if(act==="dhsc"){dhSC=id;render();return true}
  if(act==="dhscx"){dhSC=null;render();return true}
  if(act==="dhscok"){dhSC=null;await write(()=>db.collection("calls").doc(id).update({st:"done",doneAt:Date.now(),doneBy:who()}),"Đã xử lý · sân đánh tiếp");return true}
  if(act==="dhhist"){const m=(S.matches||[]).find(x=>x.id===id);if(!m)return true;dhSC=null;ttId=m.id;ttV="hist";render();return true}
  if(act==="dhundo"){const m=(S.matches||[]).find(x=>x.id===id);if(!m||!m.ref)return true;if(!armOr("dhundo:"+id))return true;const ev=[...(m.ref.ev||[])];if(!ev.length)return true;ev.pop();
    await ttWrite(m,{...m.ref,ev,un:[...(m.ref.un||[]),{at:Date.now(),tx:"BTC hoàn tác pha cuối"}]});toast("Đã hoàn tác pha cuối");return true}
  if(act==="dhmove"){const m=(S.matches||[]).find(x=>x.id===id),k=Number(v);if(!m||!k)return true;
    await write(()=>db.collection("matches").doc(m.id).update({court:k,cn:cName(k)}),`Đã chuyển trận sang Sân ${cName(k)}`);try{if(!loaMuted())speak(`Trận ở sân ${cName(m.court)} chuyển sang sân ${cName(k)}`,"","mv")}catch(e){}dhCt=k;return true}
  if(act==="dhloa"){const x=(S.calls||[]).find(z=>z.id===id);if(!x)return true;await db.collection("calls").doc(id).update({st:"done",doneAt:Date.now()}).catch(()=>{});speak(x.txt,"","call:"+id,true);return true}
  if(act==="dhloax"){await write(()=>db.collection("calls").doc(id).update({st:"skip",doneAt:Date.now()}));return true}
  if(act==="dhps"){dhPS=true;render();return true}
  if(act==="dhpsx"){dhPS=false;render();return true}
  if(act==="dhpsgo"){const mn=Number(v)||0,until=mn?Date.now()+mn*6e4:0;dhPS=false;
    await write(()=>saveCfg({pause:{at:Date.now(),until}}),mn?`Nghỉ ${mn} phút`:"Đã tạm dừng đưa trận mới");
    try{if(!loaMuted())speak(mn?`Ban tổ chức xin thông báo, giải nghỉ giữa giờ ${mn} phút, ${hm(until).replace(":"," giờ ")} đánh tiếp.`:"Ban tổ chức xin thông báo, giải tạm nghỉ giữa giờ. Mời các vận động viên chờ thông báo đánh tiếp.","","pause")}catch(e){}return true}
  if(act==="dhresume"){await write(()=>saveCfg({pause:null}),"Đánh tiếp");try{if(!loaMuted())speak("Hết giờ nghỉ, mời các vận động viên trở lại sân thi đấu.","","pause")}catch(e){}
    if(isG(D.c))await gFill(true);return true}
  if(act==="dhan"){dhAN=true;render();return true}
  if(act==="dhanx"){dhAN=false;render();return true}
  if(act==="dhanpick"){drafts["dh-ann"]=DH_ANN[+v]||"";render();return true}
  if(act==="dhango"){const t=String(val("dh-ann","")).trim();if(!t){toast("Chọn câu mẫu hoặc gõ câu cần đọc.");return true}dhAN=false;delete drafts["dh-ann"];speak("Ban tổ chức xin thông báo. "+t,"","ann");render();return true}
  if(act==="dhqrk"){dhQR=+v||1;render();return true}
  if(act==="dhqr"){dhQR=+v||1;const n=Math.max(1,+D.c.courts||1),Q=S.refqr||{};
    for(let k=1;k<=n;k++)if(!Q[k])await db.collection("refqr").doc(String(k)).set({code:ckRand(),at:Date.now()}).catch(()=>{});render();return true}
  if(act==="dhqrx"){dhQR=false;render();return true}
  if(act==="dhqrnew"){if(!armOr("dhqrnew:x"))return true;const n=Math.max(1,+D.c.courts||1);
    await write(async()=>{for(let k=1;k<=n;k++)await db.collection("refqr").doc(String(k)).set({code:ckRand(),at:Date.now()});for(const r of (S.refsQ||[]))await db.collection("refs").doc(r.id).delete()},"Đã đổi mã, thu hồi trọng tài nhận qua QR");return true}
  if(act==="dhrefx"){if(!armOr("dhrefx:"+id))return true;await write(()=>db.collection("refs").doc(id).delete(),"Đã thu hồi");return true}
  if(act==="dhloadev"){const on=loaDev()!==DEVID;await write(()=>saveCfg({loaDev:on?DEVID:""}),on?"Máy này là máy loa của giải":"Đã bỏ máy loa · máy nào cũng tự đọc");if(on&&loaMuted())loaSetMute(false);watchCalls();return true}
  if(act==="dhloamode"){await write(()=>saveCfg({loaMode:v==="duyet"?"duyet":"auto"}));return true}
  if(act==="dhtpl"){const X=schedById(id);if(!X)return true;const skip=new Set(["id","num","st","doneAt","log","openAt","createdAt","tpl","series"]),n={};for(const [k,vv] of Object.entries(X))if(!skip.has(k))n[k]=vv;
    let d=0;if(+X.at){while(+X.at+d<Date.now()+36e5)d+=7*864e5}for(const k of ["at","deadline","lockAt"])if(+n[k])n[k]=+n[k]+d;n.st="draft";n.createdAt=Date.now();
    let nid=null;await write(async()=>{const ref=db.collection("sched").doc();nid=ref.id;await ref.set(n)},`Đã tạo ${xName(X)} từ mẫu (nháp)`);if(nid)go("app",{tab:"dk",x:nid});return true}
  if(act==="dhaw0"){dhAw=!dhAw;render();return true}
  if(act==="dhaw"){const M=money(D),p=prizes(D,M)[+v];if(!p)return true;speak(dhAwText(D,p),"","aw:"+v);await write(()=>saveCfg({award:{...(cfg().award||{}),[v]:Date.now()}}));return true}
  return true;
}
// Thẻ Trọng tài trong Quản lý: giao sân (người + QR), máy loa
function dhTTBox(D){
  const n=Math.max(1,+D.c.courts||1),cov=hqRefCov(),Q=S.refsQ||[];
  let h=`<section class="hqbox"><span class="cap">Trọng tài từng sân</span>`;
  for(let k=1;k<=n;k++){const R=[...(S.members||[]).filter(m=>m.role==="scorer"&&(m.courts||[]).map(Number).includes(k)).map(m=>m.name||"Trọng tài"),...(S.editors||[]).filter(e=>(e.courts||[]).map(Number).includes(k)).map(e=>e.name||"Máy PIN")],q=Q.filter(r=>Number(r.court)===k);
    h+=`<div class="dhin"><span class="tg ${R.length||q.length?"g":"y"}">SÂN ${esc(cName(k))}</span><span class="t"><b>${esc([...R,...q.map(r=>r.name||"Trọng tài")].join(", ")||"Chưa có · BTC tự nhập")}</b>${q.length?`<small>nhận qua QR ${q.map(r=>hm(r.at||0)).join(", ")}</small>`:""}</span>${q.map(r=>`<button class="sm ln" data-act="dhrefx" data-id="${esc(r.id)}">${armed("dhrefx:"+r.id)?"Chắc?":"Thu hồi"}</button>`).join("")}</div>`}
  h+=`<button class="line" data-act="dhqr">🖨 QR trọng tài từng sân</button></section>`;
  const me=loaDev()===DEVID,mode=cfg().loaMode||"auto";
  h+=`<section class="hqbox"><div class="dhsw"><span><b>Máy này nối loa</b><small>${loaDev()?(me?"Đang là máy loa của giải":"Máy loa là máy khác · máy này gửi yêu cầu"):"Chưa chọn · máy nào cũng tự đọc"}</small></span><button class="xsw${me?" on":""}" data-act="dhloadev" role="switch" aria-checked="${me}" aria-label="Máy này nối loa"><i></i></button></div>
    ${me?`<span class="cap">Yêu cầu từ trọng tài</span><div class="seg segw"><button data-act="dhloamode" data-v="auto" aria-pressed="${mode==="auto"}">Tự đọc lần lượt</button><button data-act="dhloamode" data-v="duyet" aria-pressed="${mode==="duyet"}">BTC duyệt rồi đọc</button></div><small class="rule">Cùng một câu chỉ nhận lại sau 1 phút. Máy khác bấm loa sẽ gửi về đây.</small>`:""}</section>`;
  return h;
}
