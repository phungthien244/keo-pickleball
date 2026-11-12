/* ---------- Yêu cầu của trọng tài trên máy BTC (canvas Y1–Y6) ----------
   Dải đỏ dưới đầu trang (màn gốc thay dải Đang đánh, trong giải nằm dưới thanh chặng), ô sân đỏ lên đầu,
   chạm vào mở bảng xử lý theo lý do; nhiều việc thì mở danh sách. Máy trọng tài thấy dòng "Đã gọi BTC" tới khi BTC xử lý. */
let ycList=false;
const ycBtc=()=>dhCalls("btc");
const ycLoa=()=>dhCalls("loa");
const ycAll=()=>[...ycBtc(),...ycLoa()];
// Trạng thái một yêu cầu: Mới / Đang chờ 5′ / Đã đọc / Đã xử lý / Bỏ qua / Trọng tài huỷ
function ycSt(x){
  if(x.st==="new")return x.wait&&x.wait>Date.now()?{t:"Đang chờ 5′",c:"o"}:{t:"Mới",c:"r"};
  if(x.st==="done")return x.k==="loa"?{t:"Đã đọc",c:"g"}:{t:"Đã xử lý",c:"g"};
  return x.doneBy?{t:"Bỏ qua",c:"n"}:{t:"TT huỷ",c:"n"};
}
// Mọi yêu cầu của giải hiện tại: mới lên đầu (gọi BTC trước loa), rồi mới nhất
function ycHist(D){const sid=D.sid;
  return (S.calls||[]).filter(x=>(x.k==="loa"||x.k==="btc")&&(x.sid==null||x.sid===sid)).sort((a,b)=>(a.st==="new"?0:1)-(b.st==="new"?0:1)||(a.st==="new"&&b.st==="new"?(a.k==="btc"?0:1)-(b.k==="btc"?0:1):0)||(b.at||0)-(a.at||0))}
const ycN=D=>{const L=ycHist(D),n=L.filter(x=>x.st==="new").length;return n?`${n} việc mới đang chờ`:L.length?`${L.length} yêu cầu · đã xử lý hết`:"Gọi tên, gọi BTC từ máy trọng tài"};
// Dải đỏ: 1 sân → "Sân n Cần BTC · lý do · Tới ›"; nhiều việc → "n Việc cần BTC · Xem ›"
function ycBan(D){
  if(!canWrite||legacy||REF||!MINI)return "";
  const A=ycAll();if(!A.length)return "";
  const B=ycBtc();
  if(A.length===1&&B.length===1){const x=B[0],w=x.wait&&x.wait>Date.now();
    return `<button class="ycban" data-act="dhsc" data-id="${esc(x.id)}"><b>🔴 Sân ${esc(cName(x.court))} Cần BTC</b><span>${esc(x.why||"")}${w?` · chờ tới ${hm(x.wait)}`:""}</span><i>Tới ›</i></button>`}
  if(!B.length&&A.length===1){const x=A[0];return `<button class="ycban" data-act="yclist"><b>📣 Trọng tài nhờ gọi tên</b><span>${esc(String(x.txt||"").slice(0,60))}</span><i>Xem ›</i></button>`}
  const parts=[...new Set(B.map(x=>"Sân "+cName(x.court)))].concat(A.length>B.length?[`${A.length-B.length} nhờ gọi tên`]:[]);
  return `<button class="ycban" data-act="yclist"><b>🔴 ${A.length} Việc cần BTC</b><span>${esc(parts.join(", "))}</span><i>Xem ›</i></button>`;
}
// Thẻ sân đỏ (dùng trong Đang đánh)
function ycCourt(D,m,x,lb){
  const R=m.ref&&m.ref.started?ttRun(D,m):null,sc=R?` · ${R.s.a}–${R.s.b}`:"";
  return `<div class="g4c red"><span class="h"><b>Sân ${esc(cName(m.court))} · Cần BTC</b>${lb?`<em>${lb}</em>`:""}</span><span class="t"><b>${g4Nm(D,m.a)}</b> <span>gặp</span> <b>${g4Nm(D,m.b)}</b>${sc}</span>
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
    if(m&&i===4){const tgt=+(mRule(m)||{}).to||+D.c.target||11,miss=s=>(m[s]||[]).filter(id=>!rfHere(m,id)).length,ord=miss("b")>miss("a")?["b","a"]:["a","b"];
      L=ord.map(s=>`<button class="gmli" data-act="scabs" data-id="${esc(m.id)}" data-v="${s}" data-c="${esc(x.id)}"><i>⏱</i><span class="t"><b>Gọi cặp vắng · ${g4Nm(D,m[s])}</b><small>Loa gọi tên, chờ ${absWait()} phút, hết giờ BTC quyết xử thua</small></span><span aria-hidden="true">›</span></button>`).join("")
       +it("🏳",armed("ycff:"+m.id+":"+ord[0])?"Bấm lần nữa để xử thua":`Xử thua ${g4Nm(D,m[ord[0]])} ngay`,`${g4Nm(D,m[ord[0]==="a"?"b":"a"])} thắng ${tgt}–0`,"ycff",m.id,1,ord[0]);
      ok=`<button class="btn-line wide" data-act="dhscok" data-id="${esc(x.id)}">✓ Đã tới · đánh bình thường</button>`}
    if(x.zid&&MINI)L+=it("💬",`Nhắn Zalo cho ${esc(x.by||"trọng tài")}`,"Mở khung chat Zalo","yczc",x.zid);
    return dhDim("dhscx")+`<div class="mxsheet dhsh gmsh" role="dialog" aria-label="Sân ${esc(cName(x.court))} cần BTC"><span class="grab"></span><b class="mxh">Sân ${esc(cName(x.court))} · ${esc(x.why||"Cần BTC")}</b>
      <small class="rule">${esc(x.by||"Trọng tài")} gọi ${x.at?hm(x.at):""}${sc}${x.wait&&x.wait>Date.now()?` · chờ tới ${hm(x.wait)}`:m?" · trận đang tạm dừng":""}</small>${L?`<div class="gmlist">${L}</div>`:""}${ok}</div>`}
  if(ycList){const L=ycHist(D);
    const row=x=>{const st=ycSt(x),loa=x.k==="loa",t=loa?esc(String(x.txt||"").slice(0,90)):`Sân ${esc(cName(x.court))} cần BTC · ${esc(x.why||"")}`;
      const s=`${esc(x.by||"Trọng tài")}${x.court!=null&&loa?"":""} ${loa?"nhờ đọc":"gọi"} ${x.at?hm(x.at):""}${x.doneAt&&x.st!=="new"?` · ${st.t.toLowerCase()} ${hm(x.doneAt)}`:""}`;
      const B=x.st==="new"?(loa?`<button class="btn-line sm" data-act="dhloa" data-id="${esc(x.id)}">🔊 Đọc</button>`:`<button class="btn-line sm" data-act="dhsc" data-id="${esc(x.id)}">Tới</button>`)+`<button class="lnk sm" data-act="ycskip" data-id="${esc(x.id)}">Bỏ qua</button>`
        :loa?`<button class="btn-line sm" data-act="dhloa" data-id="${esc(x.id)}">${x.st==="done"?"↻ Đọc lại":"🔊 Đọc"}</button>`:`<button class="btn-line sm" data-act="ycredo" data-id="${esc(x.id)}">↻ Xử lý lại</button>`;
      return `<div class="ycrow${x.st==="new"?" new":""}"><span class="g2tag ${st.c}">${st.t}</span><span class="t"><b>${loa?"🔊 ":"🔴 "}${t}</b><small>${s}</small></span><span class="b">${B}</span></div>`};
    const n=L.filter(x=>x.st==="new").length;
    return dhDim("yclistx")+`<div class="mxsheet dhsh gmsh" role="dialog" aria-label="Yêu cầu trọng tài"><span class="grab"></span><b class="mxh">Yêu cầu trọng tài${n?` · ${n} mới`:""}</b>
      ${L.length?`<div class="yclist">${L.map(row).join("")}</div>`:`<p class="rule">Chưa có yêu cầu nào trong giải này. Trọng tài bấm Gọi tên hoặc Gọi BTC thì hiện ở đây.</p>`}
      <small class="rule">Việc mới lên đầu. Bấm Đọc lại hoặc Xử lý lại nếu cần làm lần nữa. Máy trọng tài thấy BTC đã làm gì.</small></div>`}
  return "";
}
// Máy trọng tài: dòng "Đã gọi BTC" tới khi BTC xử lý (Y6)
function ycMine(){
  const u=authUser&&authUser.uid;if(!u)return "";
  const x=(S.calls||[]).filter(z=>z.k==="btc"&&z.uid===u&&!(z.st==="skip"&&!z.doneBy)).sort((a,b)=>(b.at||0)-(a.at||0))[0];if(!x)return "";
  if(x.st==="new"){const w=x.wait&&x.wait>Date.now();
    return `<div class="ycmine${w?" w":""}"><span class="cap">📣 Đã gọi BTC · ${x.at?hm(x.at):""}</span><b>${esc(x.why||"Cần BTC")} · ${w?`BTC cho chờ tới ${hm(x.wait)}`:"trận tạm dừng"}</b><small>${w?"BTC đã thấy, cho chờ thêm 5 phút.":"Máy BTC đang hiện dải đỏ. Chờ BTC tới."}</small><button class="btn-line sm" data-act="yccancel" data-id="${esc(x.id)}">Huỷ gọi</button></div>`}
  const t=x.doneAt||x.at||0;if(Date.now()-t>10*6e4)return "";
  return x.st==="done"?`<div class="rfst g"><b>✓ BTC đã xử lý · ${hm(t)}</b><small>${esc(x.why||"Gọi BTC")}${x.doneBy?` · ${esc(x.doneBy)}`:""} · đánh tiếp</small></div>`
    :`<div class="rfst r"><b>BTC đã bỏ qua yêu cầu · ${hm(t)}</b><small>${esc(x.why||"Gọi BTC")} · cần thì bấm Gọi BTC lần nữa</small></div>`;
}
async function ycAct(act,b){
  const id=b.dataset.id,D=derive();
  if(act==="yczc"){await zChat(id,"");return true}
  if(act==="yclist"){ycList=true;gmMore=false;kSh=null;render();return true}
  if(act==="yclistx"){ycList=false;render();return true}
  if(act==="yccancel"){await write(()=>db.collection("calls").doc(id).update({st:"skip",doneAt:Date.now()}),"Đã huỷ gọi BTC");return true}
  if(!canWrite)return false;
  if(act==="ycskip"){await write(()=>db.collection("calls").doc(id).update({st:"skip",doneAt:Date.now(),doneBy:who()}),"Đã bỏ qua");return true}
  if(act==="ycredo"){await write(()=>db.collection("calls").doc(id).update({st:"new",wait:null,doneAt:null}));ycList=false;dhSC=id;render();return true}
  if(act==="ycwait"){await write(()=>db.collection("calls").doc(id).update({wait:Date.now()+5*6e4}),"Cho chờ thêm 5 phút");dhSC=null;return true}
  if(act==="ycff"){const m=(S.matches||[]).find(x=>x.id===id),t=b.dataset.v;if(!m)return true;if(!armOr("ycff:"+id+":"+t))return true;
    const tgt=+(mRule(m)||{}).to||+D.c.target||11,sa=t==="a"?0:tgt,sb=t==="a"?tgt:0,x=(S.calls||[]).find(z=>z.id===dhSC);
    await write(async()=>{await db.collection("matches").doc(id).update({sa,sb,status:"done",doneAt:Date.now(),ff:t});if(x)await db.collection("calls").doc(x.id).update({st:"done",doneAt:Date.now(),doneBy:who()})},`Đã xử thua · ${t==="a"?g4Nm(D,m.b):g4Nm(D,m.a)} thắng`);
    dhSC=null;scSh=null;if(m.giai&&autoNext()){await new Promise(r=>setTimeout(r,60));await gFill()}return true}
  return false;
}
