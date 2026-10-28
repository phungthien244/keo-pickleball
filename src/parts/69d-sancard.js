/* ----- Thẻ sân ở chặng Đang đánh (K14 và giải thường, giải cặp) -----
   Trạng thái theo máy trọng tài: Điểm danh → Bốc thăm → Bắt đầu → Kết thúc.
   Kết thúc: Đọc kết quả + Tạo trận mới. Cài đặt "Xếp trận tiếp": BTC bấm (mặc định) hoặc Tự động.
   ⋯ từng sân: mời vào sân, lịch sử pha, chuyển sân, mở lại trận, huỷ trận (có hoàn tác 1 phút). */
let scSh=null,scUndo=null,scAutoT=0;
// Mini App mặc định BTC bấm; web giữ như cũ (tự xếp sau khi lưu) trừ khi đã chọn
const autoNext=()=>{const v=cfg().autoNext;return v===true||(v!==false&&!MINI)};
const SC_ST=["Điểm danh","Bốc thăm","Bắt đầu","Kết thúc"];
// 0: không có trọng tài · 1 điểm danh · 2 bốc thăm (gồm bước vị trí) · 3 đang đánh · 4 xong
function scStep(D,m){const f=m.ref;if(!f)return 0;if(m.status==="done")return 4;
  if(f.started)return ttRun(D,m).done?4:3;return (f.st||1)>=2||(f.toss&&f.toss.ch)?2:1}
const scSpk=(D,ids)=>ids.map(id=>D.pmap.get(id)?.name||"").filter(Boolean).join(" và ");
const scInvTx=(D,m)=>`Mời ${scSpk(D,m.a)}, ${scSpk(D,m.b)} vào sân ${cName(m.court)} chuẩn bị thi đấu`;
const scBar=st=>st?`<div class="scst">${SC_ST.map((t,i)=>`<i class="${i+1<st||st===4?"ok":i+1===st?"on":""}">${t}</i>`).join("")}</div>`:"";
const scLast=(D,k)=>[...D.done].filter(m=>Number(m.court)===Number(k)&&m.status==="done").sort((a,b)=>(a.doneAt||0)-(b.doneAt||0)).pop();
// Thẻ một sân đang có trận
function scCard(D,m,lb,nA,nB){
  const k=Number(m.court),st=scStep(D,m),R=st>=3?ttRun(D,m):null,age=typeof m.createdAt==="number"?Math.max(0,Math.round((Date.now()-m.createdAt)/6e4)):0;
  let body;
  if(R)body=`<div class="scsc"><span>${nA}</span><b class="num">${R.s.a}</b></div><div class="scsc"><span>${nB}</span><b class="num">${R.s.b}</b></div><small class="rule">${st===4?"Trọng tài đang xác nhận kết quả":`Ván ${R.g+1} · ${esc(R.call())}`}</small>`;
  else{body=`<span class="t"><b>${nA}</b> <span>gặp</span> <b>${nB}</b></span>`;
    if(st===1){const ids=[...m.a,...m.b],miss=ids.filter(id=>!rfCk(id).ok);body+=`<small class="${miss.length?"wac":"okc"}">${ids.length-miss.length}/${ids.length} có mặt${miss.length?` · thiếu ${miss.map(id=>esc(ttPN(D,id))).join(", ")}`:""}</small>`}}
  const prev=autoNext()?scLast(D,k):null,pv=prev&&prev.doneAt&&Date.now()-prev.doneAt<60e3&&prev.doneAt<(m.createdAt||0)+5e3?prev:null;
  if(pv)setTimeout(render,60e3-(Date.now()-pv.doneAt)+50);
  const btn=st&&st>=3?`<button class="btn-line" data-act="dhhist" data-id="${esc(m.id)}">Lịch sử từng pha</button>`
    :`<button class="btn-line" data-act="scinv" data-id="${esc(m.id)}">📣 Mời vào sân</button>${!m.ref&&canScore(m)?`<button class="ball go" data-act="g4m" data-id="${esc(m.id)}">Nhập điểm</button>`:""}`;
  return `<div class="g4c sc${st?" s"+st:""}"><span class="h"><b>SÂN ${esc(cName(k))}</b>${lb?`<em>${lb}</em>`:""}<small class="live">${m.ref?`TT ${esc(m.ref.byName||"")} · `:""}● ${age}′</small></span>${scBar(st)}${body}
    ${pv?`<div class="scprev"><span>Trận trước: ${g4Nm(D,pv.a)} ${pv.sa}–${pv.sb} ${g4Nm(D,pv.b)}</span><button class="btn-line sm" data-act="scread" data-id="${esc(pv.id)}" aria-label="Đọc kết quả">🔊</button></div>`:""}
    <div class="scbt"><button class="btn-line gmdot" data-act="scsh" data-v="${k}" aria-label="Thêm việc sân ${esc(cName(k))}">⋯</button>${btn}</div></div>`;
}
// Thẻ sân vừa kết thúc (sân đang trống)
function scEnd(D,m,lb,nA,nB,canFill){
  const k=Number(m.court),aw=m.sa>m.sb,W=aw?nA:nB;
  return `<div class="g4c sc end"><span class="h"><b>SÂN ${esc(cName(k))}</b>${lb?`<em>${lb}</em>`:""}<small>${m.ref?`TT ${esc(m.ref.byName||"")} · `:""}${m.doneAt?hm(m.doneAt):""}</small></span>${m.ref?scBar(4):""}
    <b class="scend">✓ Kết thúc · ${W} thắng ${Math.max(m.sa,m.sb)}–${Math.min(m.sa,m.sb)}</b><small class="rule">${nA} <span>gặp</span> ${nB}</small>
    <div class="scbt"><button class="btn-line gmdot" data-act="scsh" data-v="${k}" aria-label="Thêm việc sân ${esc(cName(k))}">⋯</button><button class="btn-line" data-act="scread" data-id="${esc(m.id)}">🔊 Đọc kết quả</button>${canFill?`<button class="ball go" data-act="scfill" data-v="${k}">▶ Tạo trận mới</button>`:""}</div></div>`;
}
// Dải hoàn tác sau khi huỷ trận (1 phút)
function scUndoBar(){
  if(!scUndo)return "";const left=60e3-(Date.now()-scUndo.at);if(left<=0){scUndo=null;return ""}
  setTimeout(render,left+50);
  return `<div class="scun"><span>Đã huỷ trận sân ${esc(cName(scUndo.c))}</span><button class="btn-line sm" data-act="scundo" data-id="${esc(scUndo.id)}">↶ Hoàn tác</button></div>`;
}
// ⋯ của một sân
function scSheet(D){
  if(scSh==null)return "";const k=Number(scSh),m=D.playing.find(x=>Number(x.court)===k),last=m?null:scLast(D,k);
  const it=(i,t,s,a,id,v,red)=>`<button class="gmli" data-act="${a}"${id?` data-id="${esc(id)}"`:""}${v!=null?` data-v="${esc(v)}"`:""}><i>${i}</i><span class="t"><b${red?` class="red"`:""}>${t}</b>${s?`<small>${s}</small>`:""}</span><span aria-hidden="true">›</span></button>`;
  let b="";
  if(m){const st=scStep(D,m);
    if(st<3)b+=it("📣","Mời vào sân","Loa đọc tên 2 cặp và số sân","scinv",m.id);
    if(m.ref&&m.ref.started)b+=it("📜","Lịch sử từng pha","Trọng tài nhập từng pha","dhhist",m.id);
    const used=new Set(D.playing.map(x=>Number(x.court))),free=Array.from({length:Math.max(1,+D.c.courts||1)},(_,i)=>i+1).filter(c=>!used.has(c));
    if(free.length)b+=`<span class="mxsec">⇄ Chuyển sang sân khác</span><div class="dhfree">${free.map(c=>`<button class="line sm" data-act="dhmove" data-id="${esc(m.id)}" data-v="${c}">Sân ${esc(cName(c))}</button>`).join("")}</div>`;
    b+=it("✕",armed("sccancel:"+m.id)?"Bấm lần nữa để huỷ trận":"Huỷ trận","Trận bị xoá, hoàn tác được trong 1 phút","sccancel",m.id,null,1)}
  else if(last)b+=it("🔊","Đọc kết quả","","scread",last.id)+(last.ref&&last.ref.started?it("📜","Lịch sử từng pha","","dhhist",last.id):"")+it("↶",armed("screopen:"+last.id)?"Bấm lần nữa để mở lại":"Mở lại trận","Đưa trận về đang đánh để sửa điểm","screopen",last.id);
  else{scSh=null;return ""}
  return `<div class="mxdim" data-act="scshx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Sân ${esc(cName(k))}"><span class="grab"></span><b class="mxh">Sân ${esc(cName(k))}</b>${b}</div>`;
}
// Tự động xếp trận tiếp: máy loa (hoặc máy BTC khi chưa chọn máy loa) đưa trận vào sân vừa xong
function scAuto(){
  if(!canWrite||legacy||cfg().autoNext!==true||pausedNow()||Date.now()-scAutoT<6000)return;
  const L=loaDev();if(L&&L!==DEVID)return;
  const D=derive();if(phaseOf(D)!=="live")return;
  const used=new Set(D.playing.map(m=>Number(m.court)));let k=0;
  for(let i=1;i<=Math.max(1,+D.c.courts||1);i++)if(!used.has(i)&&scLast(D,i)){k=i;break}
  if(!k)return;scAutoT=Date.now();
  if(isG(D.c))gFill(true);
  else if(L===DEVID){const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));if(D.players.filter(p=>p.active!==false&&!busy.has(p.id)).length>=4)generate()}
}
async function scAct(act,b){
  const id=b.dataset.id,v=b.dataset.v,D=derive(),m=id?(S.matches||[]).find(x=>x.id===id):null;
  if(act==="scsh"){scSh=Number(v);render();return true}
  if(act==="scshx"){scSh=null;render();return true}
  if(act==="scinv"){if(!m)return true;scSh=null;speak(scInvTx(D,m),"","inv:"+m.id);render();return true}
  if(act==="scread"){if(!m)return true;scSh=null;speak(resultText(D,m,m.sa,m.sb),"","r:"+m.id);render();return true}
  if(act==="scfill"){if(isG(D.c)){const n=await gFill(false,Number(v));if(!n)toast("Chưa có trận nào đưa vào được: hết trận hoặc cặp đang bận.")}else await generate(Number(v));return true}
  if(act==="scauto"){gmMore=false;kSh=null;const on=!autoNext();await write(()=>saveCfg({autoNext:on}),on?"Xếp trận tiếp: tự động":"Xếp trận tiếp: BTC bấm");return true}
  if(act==="sccancel"){if(!m||!armOr("sccancel:"+m.id))return true;scSh=null;const c=Number(m.court);
    await write(()=>trashMatches([m],"cancel"),`Đã huỷ trận sân ${cName(c)}`);scUndo={id:m.id,c,at:Date.now()};render();return true}
  if(act==="scundo"){scUndo=null;let r;await write(async()=>{r=await undoAll(id)});toast(r&&r.n?"Đã khôi phục trận":"Chưa khôi phục được: người chơi đang ở sân khác hoặc hết sân trống");return true}
  if(act==="screopen"){if(!m||!armOr("screopen:"+m.id))return true;scSh=null;
    if(D.playing.some(x=>Number(x.court)===Number(m.court))){toast("Sân này đã có trận mới. Sửa điểm ở mục Kết quả.");return true}
    const up={status:"playing",sa:null,sb:null,doneAt:null};if(m.ref)up.ref={...m.ref,end:null};
    await write(()=>db.collection("matches").doc(m.id).update(up),`Đã mở lại trận sân ${cName(m.court)}`);return true}
  return false;
}
