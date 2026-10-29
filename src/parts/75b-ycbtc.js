/* ---------- Yêu cầu của trọng tài trên máy BTC (canvas Y1–Y6) ----------
   Dải đỏ dưới đầu trang (màn gốc thay dải ĐANG ĐÁNH, trong giải nằm dưới thanh chặng), ô sân đỏ lên đầu,
   chạm vào mở bảng xử lý theo lý do; nhiều việc thì mở danh sách. Máy trọng tài thấy dòng "Đã gọi BTC" tới khi BTC xử lý. */
let ycList=false;
const ycBtc=()=>dhCalls("btc");
const ycLoa=()=>loaAutoCalls()&&loaDev()===DEVID?[]:dhCalls("loa");
const ycAll=()=>[...ycBtc(),...ycLoa()];
// Dải đỏ: 1 sân → "SÂN n CẦN BTC · lý do · Tới ›"; nhiều việc → "n VIỆC CẦN BTC · Xem ›"
function ycBan(D){
  if(!canWrite||legacy||REF||!MINI)return "";
  const A=ycAll();if(!A.length)return "";
  const B=ycBtc();
  if(A.length===1&&B.length===1){const x=B[0],w=x.wait&&x.wait>Date.now();
    return `<button class="ycban" data-act="dhsc" data-id="${esc(x.id)}"><b>🔴 SÂN ${esc(cName(x.court))} CẦN BTC</b><span>${esc(x.why||"")}${w?` · chờ tới ${hm(x.wait)}`:""}</span><i>Tới ›</i></button>`}
  const parts=[...new Set(B.map(x=>"Sân "+cName(x.court)))].concat(A.length>B.length?["loa"]:[]);
  return `<button class="ycban" data-act="yclist"><b>🔴 ${A.length} VIỆC CẦN BTC</b><span>${esc(parts.join(", "))}</span><i>Xem ›</i></button>`;
}
// Thẻ sân đỏ (dùng trong Đang đánh)
function ycCourt(D,m,x,lb){
  const R=m.ref&&m.ref.started?ttRun(D,m):null,sc=R?` · ${R.s.a}–${R.s.b}`:"";
  return `<div class="g4c red"><span class="h"><b>SÂN ${esc(cName(m.court))} · CẦN BTC</b>${lb?`<em>${lb}</em>`:""}</span><span class="t"><b>${g4Nm(D,m.a)}</b> <span>gặp</span> <b>${g4Nm(D,m.b)}</b>${sc}</span>
    <small class="why">${esc(x.why||"Cần BTC")} · ${esc(x.by||"Trọng tài")} gọi ${x.at?hm(x.at):""}${x.wait&&x.wait>Date.now()?` · chờ tới ${hm(x.wait)}`:" · trận tạm dừng"}</small><button class="ball go" data-act="dhsc" data-id="${esc(x.id)}">Tới sân ${esc(cName(m.court))} · xem</button></div>`;
}
// Bảng xử lý theo lý do (Y3, Y4) và danh sách nhiều việc (Y5)
function ycSheets(D){
  if(!MINI||!canWrite)return "";
  if(dhSC){const x=(S.calls||[]).find(z=>z.id===dhSC);if(!x||x.st!=="new"){dhSC=null;return ""}
    const m=D.playing.find(z=>Number(z.court)===Number(x.court)),R=m&&m.ref&&m.ref.started?ttRun(D,m):null,i=DH_WHY.findIndex(w=>w[0]===x.why);
    const sc=m?` · ${g4Nm(D,m.a)} ${R?`${R.s.a}–${R.s.b}`:"đang đánh"} ${g4Nm(D,m.b)}`:"";
    const it=(ic,t,s,a,id,red,v)=>`<button class="gmli" data-act="${a}" data-id="${esc(id||"")}"${v!=null?` data-v="${esc(v)}"`:""}><i>${ic}</i><span class="t"><b${red?` class="red"`:""}>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`;
    let L="",ok=`<button class="ball go wide" data-act="dhscok" data-id="${esc(x.id)}">✓ Đã xử lý · đánh tiếp</button>`;
    if(m&&i===0)L=it("📜","Xem lịch sử từng pha","Ai ghi điểm, lúc nào","dhhist",m.id)+it("✎","Sửa điểm","Chỉnh lại tỉ số rồi đánh tiếp","tt",m.id);
    if(m&&(i===1||i===2)){const tgt=+(mRule(m)||{}).to||+D.c.target||11;
      L=it("⏳","Chờ thêm 5 phút","Trọng tài thấy đồng hồ đếm","ycwait",x.id)
       +it("🏳",armed("ycff:"+m.id+":a")?"Bấm lần nữa để xử thua":`Xử thua ${g4Nm(D,m.a)}`,`${g4Nm(D,m.b)} thắng ${tgt}–0`,"ycff",m.id,1,"a")
       +it("🏳",armed("ycff:"+m.id+":b")?"Bấm lần nữa để xử thua":`Xử thua ${g4Nm(D,m.b)}`,`${g4Nm(D,m.a)} thắng ${tgt}–0`,"ycff",m.id,1,"b");
      ok=`<button class="btn-line wide" data-act="dhscok" data-id="${esc(x.id)}">✓ Đã xử lý</button>`}
    return dhDim("dhscx")+`<div class="mxsheet dhsh gmsh" role="dialog" aria-label="Sân ${esc(cName(x.court))} cần BTC"><span class="grab"></span><b class="mxh">Sân ${esc(cName(x.court))} · ${esc(x.why||"Cần BTC")}</b>
      <small class="rule">${esc(x.by||"Trọng tài")} gọi ${x.at?hm(x.at):""}${sc}${x.wait&&x.wait>Date.now()?` · chờ tới ${hm(x.wait)}`:m?" · trận đang tạm dừng":""}</small>${L?`<div class="gmlist">${L}</div>`:""}${ok}</div>`}
  if(ycList){const B=ycBtc(),Lo=ycLoa();if(!B.length&&!Lo.length){ycList=false;return ""}
    const row=(tg,c,t,s,b)=>`<div class="ycrow"><span class="g2tag ${c}">${tg}</span><span class="t"><b>${t}</b><small>${s}</small></span>${b}</div>`;
    return dhDim("yclistx")+`<div class="mxsheet dhsh gmsh" role="dialog" aria-label="Việc cần BTC"><span class="grab"></span><b class="mxh">${B.length+Lo.length} việc cần BTC</b>
      ${B.map(x=>row("GẤP","r",`Sân ${esc(cName(x.court))} cần BTC`,`${esc(x.why||"")} · ${x.at?hm(x.at):""}`,`<button class="btn-line sm" data-act="dhsc" data-id="${esc(x.id)}">Tới</button>`)).join("")}
      ${Lo.map(x=>row("LOA","o",esc(String(x.txt||"").slice(0,70)),`${esc(x.by||"Trọng tài")} nhờ đọc`,`<button class="btn-line sm" data-act="dhloa" data-id="${esc(x.id)}">Đọc</button>`)).join("")}
      <small class="rule">Việc gấp lên đầu. Xử lý xong tự biến mất.</small></div>`}
  return "";
}
// Máy trọng tài: dòng "Đã gọi BTC" tới khi BTC xử lý (Y6)
function ycMine(){
  const u=authUser&&authUser.uid;if(!u)return "";
  const x=(S.calls||[]).filter(z=>z.k==="btc"&&z.st==="new"&&z.uid===u).sort((a,b)=>(b.at||0)-(a.at||0))[0];if(!x)return "";
  const w=x.wait&&x.wait>Date.now();
  return `<div class="ycmine"><span class="cap">📣 Đã gọi BTC · ${x.at?hm(x.at):""}</span><b>${esc(x.why||"Cần BTC")} · ${w?`BTC cho chờ tới ${hm(x.wait)}`:"trận tạm dừng"}</b><small>Máy BTC đang hiện dải đỏ. Chờ BTC tới.</small><button class="btn-line sm" data-act="yccancel" data-id="${esc(x.id)}">Huỷ gọi</button></div>`;
}
async function ycAct(act,b){
  const id=b.dataset.id,D=derive();
  if(act==="yclist"){ycList=true;render();return true}
  if(act==="yclistx"){ycList=false;render();return true}
  if(act==="yccancel"){await write(()=>db.collection("calls").doc(id).update({st:"skip",doneAt:Date.now()}),"Đã huỷ gọi BTC");return true}
  if(!canWrite)return false;
  if(act==="ycwait"){await write(()=>db.collection("calls").doc(id).update({wait:Date.now()+5*6e4}),"Cho chờ thêm 5 phút");dhSC=null;return true}
  if(act==="ycff"){const m=(S.matches||[]).find(x=>x.id===id),t=b.dataset.v;if(!m)return true;if(!armOr("ycff:"+id+":"+t))return true;
    const tgt=+(mRule(m)||{}).to||+D.c.target||11,sa=t==="a"?0:tgt,sb=t==="a"?tgt:0,x=(S.calls||[]).find(z=>z.id===dhSC);
    await write(async()=>{await db.collection("matches").doc(id).update({sa,sb,status:"done",doneAt:Date.now(),ff:t});if(x)await db.collection("calls").doc(x.id).update({st:"done",doneAt:Date.now(),doneBy:who()})},`Đã xử thua · ${t==="a"?g4Nm(D,m.b):g4Nm(D,m.a)} thắng`);
    dhSC=null;if(m.giai&&autoNext()){await new Promise(r=>setTimeout(r,60));await gFill()}return true}
  return false;
}
