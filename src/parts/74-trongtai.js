/* ---------- Màn trọng tài: nhập điểm từng pha theo luật pickleball đôi ----------
   Lưu trên chính trận đấu: matches/{id}.ref = {by, at, rally, toss, first, left, pos:{a:[phải,trái], b:[phải,trái]}, started, ev:[…], un:[…], sign}
   ev: {k:"p",w} thắng pha · {k:"to",t} timeout · {k:"toe"} hết timeout sớm · {k:"mt",pid} timeout y tế · {k:"mte"} · {k:"sw"} đổi bên · {k:"ff",t,why} bỏ cuộc
   Luật giao bóng (đánh đôi, tính điểm truyền thống): gọi điểm = đội giao – đội nhận – người giao; ván mở đầu 0-0-2.
   Đội giao thắng pha: +1 điểm, người giao đổi ô với đồng đội. Đội nhận thắng: người 1 → người 2; người 2 → đổi giao, người ô phải của đội mới giao. */
let ttId=null,ttV=null,ttHG=null,ttFace=null,ttFF=null,ttMT=false,ttTick=null,ttCoin=0;
const ttO=t=>t==="a"?"b":"a";
const ttM=()=>ttId?(S.matches||[]).find(x=>x.id===ttId):null;
function ttRule(D,m){const R=mRule(m)||{to:+D.c.target||11,w2:winBy2(D.c),cap:ptMax(D.c)||0,sets:1};return {to:+R.to||11,w2:R.w2!==false,cap:+R.cap||0,sets:Math.max(1,+R.sets||1)}}
const ttOver=(R,x,y)=>{const hi=Math.max(x,y),lo=Math.min(x,y);return (R.cap&&hi>=R.cap)||(hi>=R.to&&(!R.w2||hi-lo>=2))};
const ttPN=(D,id)=>D.pmap.get(id)?.name||"?";
const ttTN=(D,m,t)=>(t==="a"?m.a:m.b).map(id=>ttPN(D,id)).join(" & ");
const ttShort=(D,m,t)=>(t==="a"?m.a:m.b).map(id=>{const w=String(ttPN(D,id)).trim().split(/\s+/);return w[w.length-1]}).join(" & ");
// Chạy lại toàn bộ diễn biến → trạng thái hiện tại
function ttRun(D,m){
  const f=m.ref||{},R=ttRule(D,m),rally=!!f.rally,need=Math.ceil(R.sets/2),half=Math.ceil(R.to/2);
  const P0={a:(f.pos&&f.pos.a)||m.a,b:(f.pos&&f.pos.b)||m.b},first=f.first==="b"?"b":"a";
  const X={R,rally,need,half,games:[],gw:{a:0,b:0},g:0,s:{a:0,b:0},st:first,firstG:first,sn:rally?1:2,right:{a:P0.a[0],b:P0.b[0]},left:f.left==="b"?"b":"a",
    to:{a:2,b:2},rallies:0,sides:0,log:[],done:false,win:null,toAct:null,mtAct:null,ff:null,swDone:false,t0:f.started||0,tEnd:0};
  X.sv=X.right[X.st];
  const mate=(t,id)=>{const L=t==="a"?m.a:m.b;return L[0]===id?L[1]:L[0]};
  const tn=t=>ttTN(D,m,t),pn=id=>ttPN(D,id);
  X.call=()=>rally?`${X.s[X.st]}-${X.s[ttO(X.st)]}`:`${X.s[X.st]}-${X.s[ttO(X.st)]}-${X.sn}`;
  const deciding=()=>X.gw.a===need-1&&X.gw.b===need-1;
  for(const e of f.ev||[]){
    if(X.done)break;
    if(e.k==="p"&&(e.w==="a"||e.w==="b")){
      const before=X.call(),srv=X.sv;let tx;X.rallies++;
      if(e.w===X.st){X.s[X.st]++;X.right[X.st]=mate(X.st,X.right[X.st]);tx=`${tn(e.w)} ghi điểm`}
      else if(rally){X.s[e.w]++;X.st=e.w;X.sv=X.right[e.w];X.sides++;tx=`${tn(e.w)} ghi điểm · đổi giao`}
      else if(X.sn===1){X.sn=2;X.sv=mate(X.st,X.sv);tx=`${tn(e.w)} thắng pha · giao sang ${pn(X.sv)}`}
      else{X.st=e.w;X.sn=1;X.sv=X.right[e.w];X.sides++;tx=`${tn(e.w)} thắng pha · đổi giao`}
      X.log.push({at:e.at,g:X.g,k:"p",w:e.w,before,after:X.call(),tx:`${pn(srv)} giao · ${tx}`});X.toAct=null;
      if(ttOver(R,X.s.a,X.s.b)){const w=X.s.a>X.s.b?"a":"b";X.games.push({a:X.s.a,b:X.s.b,w});X.gw[w]++;
        X.log.push({at:e.at,g:X.g,k:"g",tx:`Hết ván ${X.g+1}: ${tn(w)} thắng ${X.s[w]}–${X.s[ttO(w)]}`});
        if(X.gw[w]>=need){X.done=true;X.win=w;X.tEnd=e.at}
        else{X.g++;X.s={a:0,b:0};X.firstG=ttO(X.firstG);X.st=X.firstG;X.sn=rally?1:2;X.right={a:P0.a[0],b:P0.b[0]};X.sv=X.right[X.st];X.left=ttO(X.left);X.to={a:2,b:2};X.swDone=false}}
    }else if(e.k==="to"&&(e.t==="a"||e.t==="b")){X.to[e.t]=Math.max(0,X.to[e.t]-1);X.toAct={t:e.t,at:e.at};X.log.push({at:e.at,g:X.g,k:"to",tx:`Timeout ${tn(e.t)} (còn ${X.to[e.t]})`})}
    else if(e.k==="toe")X.toAct=null;
    else if(e.k==="mt"){X.mtAct={pid:e.pid,at:e.at};X.log.push({at:e.at,g:X.g,k:"mt",tx:`✚ Timeout y tế · ${pn(e.pid)}`})}
    else if(e.k==="mte"){if(X.mtAct)X.log.push({at:e.at,g:X.g,k:"mt",tx:`Hết timeout y tế · ${pn(X.mtAct.pid)} nghỉ ${gdMMSS(e.at-X.mtAct.at)}`});X.mtAct=null}
    else if(e.k==="sw"){X.swDone=true;X.left=ttO(X.left);X.log.push({at:e.at,g:X.g,k:"sw",tx:`Đổi bên sân ở ${X.call()}`})}
    else if(e.k==="ff"&&(e.t==="a"||e.t==="b")){X.ff={t:e.t,why:e.why||"",at:e.at};X.done=true;X.win=ttO(e.t);X.tEnd=e.at;X.log.push({at:e.at,g:X.g,k:"ff",tx:`${tn(e.t)} bỏ cuộc${e.why?` · ${e.why}`:""}`})}
  }
  for(const u of f.un||[])X.log.push({at:u.at,g:u.g??X.g,k:"un",tx:`↶ Hoàn tác: ${u.tx||"pha trước"}`});
  X.log.sort((a,b)=>(a.at||0)-(b.at||0));
  X.needSw=!X.done&&!X.swDone&&deciding()&&Math.max(X.s.a,X.s.b)>=half&&Math.max(X.s.a,X.s.b)<R.to;
  const srvRight=X.sv===X.right[X.st],rt=ttO(X.st);
  X.srvRight=srvRight;X.rcv=srvRight?X.right[rt]:mate(rt,X.right[rt]);
  return X;
}
// Kết quả lưu vào giải: nhiều set → số set thắng; một ván → điểm
function ttResult(X){if(X.R.sets>1)return {a:X.gw.a,b:X.gw.b};const g=X.games[0];return g?{a:g.a,b:g.b}:{a:X.s.a,b:X.s.b}}
const ttLiveTx=(D,m)=>{if(!m.ref||!m.ref.started)return "";const X=ttRun(D,m);return X.done?`Xong · ${X.games.map(g=>`${g.a}–${g.b}`).join(", ")}`:`${X.call()}${X.R.sets>1?` · ván ${X.g+1}`:""}`};
// Dòng dưới thẻ sân: trọng tài đang nhập / nút mở màn trọng tài
function ttCourtLine(D,m){
  const f=m.ref,can=canScore(m);
  if(!f&&!can)return "";
  const X=f&&f.started?ttRun(D,m):null;
  return `<div class="ttcl">${f?`<span class="t"><i class="ldot"></i>${esc(f.byName||"Trọng tài")} ${X?`đang nhập · <b class="num">${esc(X.done?"xong":X.call())}</b> <small class="num">${X.s.a}–${X.s.b}${X.R.sets>1?` · ván ${X.g+1}`:""}</small>`:"đang chuẩn bị trận"}</span>`:`<span class="t">Chưa có trọng tài · nhập nhanh ở trên hoặc</span>`}${can?`<button class="lnk" data-act="tt" data-id="${esc(m.id)}">${f?"Màn trọng tài ›":"Bắt trọng tài ›"}</button>`:""}</div>`;
}
async function ttWrite(m,ref){
  Object.assign(m,{ref});render();
  try{await db.collection("matches").doc(m.id).update({ref})}catch(e){toast("Chưa lưu được, kiểm tra mạng rồi thử lại.")}
}
const ttPush=(m,e)=>ttWrite(m,{...m.ref,ev:[...(m.ref.ev||[]),{...e,at:Date.now()}]});

/* ----- giao diện ----- */
const ttAv=(D,id,cls="md")=>`<button class="ttav" data-act="ttface" data-v="${esc(id)}" aria-label="Xem mặt ${esc(ttPN(D,id))}">${av(D.pmap.get(id),cls,1)}</button>`;
const ttAvs=(D,ids,cls="sm")=>`<span class="ttavs">${ids.map(id=>av(D.pmap.get(id),cls,1)).join("")}</span>`;
function ttHead(D,m,title,back="ttx"){
  return `<div class="tthd"><button class="ttbk" data-act="${back}" aria-label="Quay lại">‹</button><b>${title}</b></div>`;
}
// Sơ đồ sân: cột trái là đội bên trái lưới. Đội trái: trên = ô trái, dưới = ô phải. Đội phải: trên = ô phải, dưới = ô trái.
function ttCourt(D,m,X,o={}){
  const mate=(t,id)=>{const L=t==="a"?m.a:m.b;return L[0]===id?L[1]:L[0]};
  const L=X.left,Rt=ttO(L),cell=(t,id,court)=>{
    const sv=!o.pre&&id===X.sv,rc=!o.pre&&id===X.rcv,first=o.pre&&t===X.st&&id===X.right[t];
    const sub=sv?`đang giao · ô ${court}`:rc?`nhận bóng · ô ${court}`:first?`ô ${court} · giao đầu`:`ô ${court}`;
    return `<div class="ttc t${t}${sv||first?" sv":""}${rc?" rc":""}"${o.pre?` data-act="ttswap" data-v="${t}" role="button" tabindex="0" aria-label="Đổi ô ${esc(ttTN(D,m,t))}"`:""}>${ttAv(D,id)}<span class="n"><b>${esc(ttPN(D,id))}${sv||first?` <i>●</i>`:""}</b><small>${sub}</small></span></div>`};
  const rL=X.right[L],lL=mate(L,rL),rR=X.right[Rt],lR=mate(Rt,rR);
  return `<div class="ttcourt">${cell(L,lL,"trái")}<i class="net"></i>${cell(Rt,rR,"phải")}${cell(L,rL,"phải")}${cell(Rt,lR,"trái")}</div>`;
}
function ttPre(D,m,X){
  const f=m.ref,T=f.toss||{},tn=t=>esc(ttTN(D,m,t));
  let h=ttHead(D,m,`Sân ${esc(cName(m.court))} · trước trận`);
  const tossTx=T.w?`<b>${tn(T.w)}</b> thắng bốc thăm${T.pick?`, chọn ${{serve:"giao trước",recv:"nhận trước",side:"bên sân",defer:"nhường"}[T.pick]||""}`:""}`:"Chưa bốc thăm";
  h+=`<section class="ttbox"><span class="cap">1 · Bốc thăm</span><div class="ttrow"><span class="coin sm${T.res?"":" off"}">${T.res==="N"?"NGỬA":T.res==="S"?"SẤP":"?"}</span><span class="grow">${tossTx}</span><button class="ttln" data-act="ttv" data-v="toss">${T.w?"Bốc lại":"🪙 Bốc thăm"}</button></div>
    <span class="cap">Đội giao trước</span><div class="ttseg">${["a","b"].map(t=>`<button data-act="ttfirst" data-v="${t}" aria-pressed="${X.st===t}">${ttAvs(D,t==="a"?m.a:m.b,"xs")}${tn(t)}</button>`).join("")}</div></section>`;
  h+=`<section class="ttbox"><span class="cap">2 · Vị trí đứng ban đầu · bấm ô để đổi chỗ</span>${ttCourt(D,m,X,{pre:true})}
    <div class="ttrow"><small class="grow">Bấm ảnh để xem to, so mặt. Người ở ô phải của đội giao trước giao bóng đầu tiên.</small><button class="ttln" data-act="ttside">⇄ Đổi bên sân</button></div></section>`;
  h+=`<section class="ttbox"><span class="cap">3 · Luật trận</span><div class="ttrule"><span>Chạm</span><b>${X.R.to}${X.R.w2?" · cách 2":""}${X.R.cap?` · tối đa ${X.R.cap}`:""}</b></div><div class="ttrule"><span>Số ván</span><b>${X.R.sets>1?`Thắng ${X.need}/${X.R.sets}`:"1 ván"}</b></div>
    <div class="ttrule"><span>Tính điểm</span><span class="ttseg sm"><button data-act="ttrally" data-v="0" aria-pressed="${!X.rally}">Truyền thống</button><button data-act="ttrally" data-v="1" aria-pressed="${X.rally}">Rally</button></span></div>
    <small>Theo luật của giải. Timeout 2 lần/ván, 1 phút · timeout y tế không giới hạn · đổi bên khi tới ${X.half} điểm ở ván quyết định.</small></section>`;
  return h+`<div class="ttft"><button class="ttgo" data-act="ttstart">▶ Bắt đầu trận · ${X.rally?"0-0":"0-0-2"}</button></div>`;
}
function ttToss(D,m,X){
  const T=m.ref.toss||{},tn=t=>esc(ttTN(D,m,t));
  let h=ttHead(D,m,`Bốc thăm · Sân ${esc(cName(m.court))}`,"ttpre");
  h+=`<section class="ttbox"><span class="cap">1 · Đội nào chọn mặt đồng xu?</span><div class="ttseg">${["a","b"].map(t=>`<button data-act="tttc" data-v="${t}" aria-pressed="${T.ch===t}">${ttAvs(D,t==="a"?m.a:m.b,"xs")}${tn(t)}</button>`).join("")}</div>`;
  if(T.ch)h+=`<span class="cap">${tn(T.ch)} chọn mặt</span><div class="ttseg">${[["S","Sấp"],["N","Ngửa"]].map(([v,l])=>`<button data-act="tttcall" data-v="${v}" aria-pressed="${T.call===v}">${l}</button>`).join("")}</div>`;
  h+=`</section>`;
  if(T.ch&&T.call){
    h+=`<section class="ttbox ctr"><span class="cap">2 · Tung đồng xu</span><span class="coin${T.res?"":" off"}${ttCoin&&Date.now()-ttCoin<1200?" spin":""}">${T.res==="N"?"NGỬA":T.res==="S"?"SẤP":"?"}</span>
      ${T.res?`<b>Ra ${T.res==="N"?"Ngửa":"Sấp"} · ${tn(T.w)} thắng bốc thăm</b><small>Tung lỗi thì bấm tung lại</small>`:""}<button class="ttln" data-act="ttflip">${T.res?"↻ Tung lại":"🪙 Tung đồng xu"}</button></section>`;
  }
  if(T.w){const pk=T.pk||[],cur=pk.length&&pk[pk.length-1].v==="defer"?ttO(T.w):T.w,done=T.first!=null;
    const opts=[["serve","Giao trước"],["recv","Nhận trước"],["side","Chọn bên sân"],["defer","Nhường chọn"]].filter(([v])=>!(v==="defer"&&pk.some(p=>p.v==="defer")));
    const sideBy=pk.find(p=>p.v==="side");
    h+=`<section class="ttbox"><span class="cap">3 · ${tn(cur)} chọn một · đội kia lấy phần còn lại</span>`;
    h+=`<div class="ttopts">${opts.map(([v,l])=>`<button data-act="ttpick" data-v="${v}" aria-pressed="${pk.some(p=>p.t===cur&&p.v===v)}"><b>${l}</b><small>${v==="serve"||v==="recv"?`${tn(ttO(cur))} chọn bên sân`:v==="side"?`${tn(ttO(cur))} chọn giao/nhận`:`${tn(ttO(cur))} chọn trước`}</small></button>`).join("")}</div>`;
    if(sideBy&&T.first==null)h+=`<span class="cap">${tn(ttO(sideBy.t))} chọn giao hay nhận</span><div class="ttseg">${[["serve","Giao trước"],["recv","Nhận trước"]].map(([v,l])=>`<button data-act="ttpick2" data-v="${v}">${l}</button>`).join("")}</div>`;
    if(done)h+=`<b class="ttok">✓ ${tn(T.first)} giao trước</b>`;
    h+=`</section>`;
    return h+`<div class="ttft"><button class="ttgo" data-act="ttv" data-v="pre" ${done?"":"disabled"}>Tiếp: vị trí đứng ›</button></div>`;
  }
  return h;
}
function ttMain(D,m,X){
  const tn=t=>esc(ttShort(D,m,t)),last=[...X.log].reverse().find(l=>l.k==="p"),st=X.st,rt=ttO(st);
  const el=X.t0?Math.max(0,Math.round((Date.now()-X.t0)/6e4)):0,mate=id=>{const L=st==="a"?m.a:m.b;return L[0]===id?L[1]:L[0]};
  let h=`<div class="tthd"><button class="ttbk" data-act="ttx" aria-label="Quay lại">‹</button><b>Sân ${esc(cName(m.court))} · Ván ${X.g+1}${X.R.sets>1?` · ${X.gw.a}–${X.gw.b}`:""}</b><button class="ttun" data-act="ttundo" ${(m.ref.ev||[]).length?"":"disabled"}>↶ Hoàn tác</button></div>`;
  // ô điểm hai đội, xếp theo bên sân; đội đang giao tô đậm màu đội
  const tile=t=>{const on=t===st;return `<div class="tttile t${t}${on?" on":""}">${ttAvs(D,t==="a"?m.a:m.b,"xs")}<span class="n">${esc(ttTN(D,m,t))}</span><b class="num">${X.s[t]}</b><span class="k">${on?(X.rally?"ĐANG GIAO":`ĐANG GIAO · TAY ${X.sn}`):"đang nhận"}</span></div>`};
  h+=`<div class="tttiles">${tile(X.left)}${tile(ttO(X.left))}</div>
    <div class="ttcall"><b class="num">${X.call()}</b><span><b>${esc(ttPN(D,X.sv))}</b> giao từ ô ${X.srvRight?"phải":"trái"} · ${esc(ttPN(D,X.rcv))} nhận</span></div>`;
  h+=ttCourt(D,m,X);
  h+=`<div class="ttsc"><span>Ô vàng: đang giao · khung gạch: nhận bóng</span><span class="num">Chạm ${X.R.to} · đổi bên ở ${X.half} · ⏱ <b data-ttel="${X.t0||Date.now()}">${el}</b>′</span></div>
    <div class="tttools">${["a","b"].map(t=>`<button data-act="ttto" data-v="${t}" ${X.to[t]?"":"disabled"}>Timeout<small>${tn(t)} · còn ${X.to[t]}</small></button>`).join("")}<button data-act="ttmt">✚ Y tế</button><button data-act="ttv" data-v="hist">Lịch sử</button><button class="red" data-act="ttff">Bỏ cuộc</button></div>
    <div class="ttlast">${last?`Pha trước: ${esc(last.tx)} (${last.before} → ${last.after})`:"Chưa có pha nào · bấm nút dưới sau mỗi pha bóng"}</div>`;
  // 2 nút cố định: trái = mất giao (tay 2 / đổi giao), phải = +1 điểm cho đội đang giao
  const lose=X.rally?{c:"so",l:"ĐỘI NHẬN GHI ĐIỂM",s:`+1 cho ${esc(ttTN(D,m,rt))} · đổi giao`}:X.sn===1?{c:"t2",l:`TAY 2 · ${esc(ttPN(D,mate(X.sv)))} giao`,s:`${esc(ttPN(D,X.sv))} mất lượt giao`}:{c:"so",l:"ĐỔI GIAO",s:`sang ${esc(ttTN(D,m,rt))}`};
  h+=`<div class="ttbar"><button class="${lose.c}" data-act="ttp" data-v="${rt}"><b>${lose.l}</b><small>${lose.s}</small></button><button class="p1 t${st}" data-act="ttp" data-v="${st}"><b>+1 ĐIỂM</b><small>${esc(ttTN(D,m,st))} ghi điểm</small></button></div>`;
  // lớp phủ: timeout, timeout y tế, đổi bên
  if(X.toAct&&Date.now()-X.toAct.at<60e3)h+=`<div class="ttov"><div class="ttovb"><span class="cap">Timeout · ${esc(ttTN(D,m,X.toAct.t))}</span><b class="big num" data-ttcd="${X.toAct.at+60e3}">${gdMMSS(X.toAct.at+60e3-Date.now())}</b><small>${esc(ttTN(D,m,X.toAct.t))} còn ${X.to[X.toAct.t]} timeout ván này</small><div class="two"><button data-act="tttoe">Kết thúc sớm</button><button class="ln" data-act="ttundo">Huỷ (bấm nhầm)</button></div></div></div>`;
  else if(X.mtAct)h+=`<div class="ttov"><div class="ttovb"><span class="cap">✚ Timeout y tế · đếm lên</span>${ttAv(D,X.mtAct.pid,"lg")}<b>${esc(ttPN(D,X.mtAct.pid))} đang được chăm sóc</b><b class="big num" data-ttcu="${X.mtAct.at}">${gdMMSS(Date.now()-X.mtAct.at)}</b><small>Không giới hạn thời gian · bắt đầu ${hm(X.mtAct.at)} · không trừ timeout thường</small><button class="go" data-act="ttmte">✓ Tiếp tục thi đấu · ${X.call()}</button><button class="ln red" data-act="ttff" data-v="${(m.a.includes(X.mtAct.pid)?"a":"b")}" data-why="inj">Không thể tiếp tục → Bỏ cuộc</button></div></div>`;
  else if(X.needSw)h+=`<div class="ttov"><div class="ttovb"><span class="cap">Đổi bên sân</span><b class="big num">${X.half}</b><small>${X.half} điểm ván quyết định · hai đội đổi bên. Vị trí đứng, người giao và điểm số giữ nguyên.</small><b>${esc(ttTN(D,m,ttO(X.left)))} ⇄ ${esc(ttTN(D,m,X.left))}</b><button class="go" data-act="ttsw">Đã đổi bên · tiếp tục ${X.call()}</button><button class="ln" data-act="ttundo">↶ Hoàn tác pha vừa rồi</button></div></div>`;
  if(ttMT&&!X.mtAct)h+=`<div class="ttov"><div class="ttovb"><span class="cap">✚ Timeout y tế · chọn người</span><div class="ttpick4">${[...m.a,...m.b].map(id=>`<button data-act="ttmtgo" data-v="${esc(id)}">${av(D.pmap.get(id),"md",1)}<b>${esc(ttPN(D,id))}</b></button>`).join("")}</div><small>Đồng hồ đếm lên, không giới hạn. Điểm, người giao và vị trí giữ nguyên.</small><button class="ln" data-act="ttmtx">Thôi</button></div></div>`;
  return h;
}
function ttHist(D,m,X){
  const gs=[...new Set([...X.log.map(l=>l.g),X.g])].sort((a,b)=>a-b),g=ttHG!=null&&gs.includes(ttHG)?ttHG:X.g;
  const L=X.log.filter(l=>l.g===g).reverse(),P=L.filter(l=>l.k==="p"),sides=P.filter(l=>/đổi giao/.test(l.tx)).length;
  const t0=P.length?P[P.length-1].at:0,t1=P.length?P[0].at:0;
  let h=ttHead(D,m,`Lịch sử · Sân ${esc(cName(m.court))}`,"ttmain");
  h+=`<div class="ttseg tabs">${gs.map(i=>{const G=X.games[i];return `<button data-act="tthg" data-v="${i}" aria-pressed="${i===g}">Ván ${i+1} · ${G?`${G.a}–${G.b}`:"đang đánh"}</button>`}).join("")}</div>
    <div class="hqtiles three"><span><b class="num">${P.length}</b><small>PHA BÓNG</small></span><span><b class="num">${sides}</b><small>ĐỔI GIAO</small></span><span><b class="num">${P.length>1?Math.max(1,Math.round((t1-t0)/6e4)):0}′</b><small>THỜI GIAN</small></span></div>
    <div class="tthist"><div class="hh"><span>Giờ</span><span>Gọi điểm</span><span>Diễn biến</span></div>${L.map(l=>`<div class="hr k${l.k}"><span class="num">${l.at?hm(l.at):""}</span><b class="num">${l.k==="p"?l.before:"—"}</b><span>${esc(l.tx)}${l.k==="p"?` → <b class="num">${l.after}</b>`:""}</span></div>`).join("")||`<p class="rule">Chưa có diễn biến.</p>`}</div>
    <small class="rule">Mỗi pha lưu giờ, người giao, điểm gọi. Hoàn tác chỉ gỡ pha mới nhất và cũng được ghi lại.</small>`;
  return h;
}
function ttEnd(D,m,X){
  const w=X.win,f=m.ref,sg=f.sign||{},tn=t=>esc(ttTN(D,m,t)),dur=X.t0&&X.tEnd?Math.max(1,Math.round((X.tEnd-X.t0)/6e4)):0;
  let h=`<div class="ttendhd"><span class="cap">${X.ff?"Thắng do đối thủ bỏ cuộc":X.R.sets>1?`Thắng ${X.gw[w]}–${X.gw[ttO(w)]}`:"Thắng"}</span>${ttAvs(D,w==="a"?m.a:m.b,"md")}<b>${tn(w)}</b>
    <div class="gs">${X.games.map(g=>`<span class="num">${g.a}–${g.b}</span>`).join("")}${X.ff&&(X.s.a||X.s.b)?`<span class="num ff">${X.s.a}–${X.s.b} · bỏ cuộc</span>`:""}</div><small>${dur?`${dur} phút · `:""}${X.rallies} pha bóng · ${X.sides} lần đổi giao</small></div>`;
  if(!X.ff){
    h+=`<section class="ttbox"><span class="cap">Xác nhận kết quả · không bắt buộc</span>${["a","b"].map(t=>`<div class="ttrow"><span class="grow">${tn(t)}</span>${sg[t]?`<span class="ok">✓ Đã ký ${hm(sg[t])}</span>`:`<button class="ttln" data-act="ttsign" data-v="${t}">Ký trên máy</button>`}</div>`).join("")}<small>Có khiếu nại thì để trống, quản lý xem lại lịch sử từng pha trước khi lưu.</small></section>`;
    const r=ttResult(X);
    h+=`<section class="ttbox"><span class="cap">Sẽ lưu vào giải</span><b class="num">${tn("a")} ${r.a} – ${r.b} ${tn("b")}</b><small>${X.R.sets>1?"Giải nhiều set lưu số set thắng. ":""}Xếp hạng, rating và tiền tự cập nhật. Sân trống sẽ nhận trận kế.</small></section>`;
  }
  h+=`<button class="lnk ttc2" data-act="ttv" data-v="hist">Xem lịch sử từng pha ›</button>`;
  return h+`<div class="ttft two"><button class="ttln" data-act="ttundo">↶ Hoàn tác pha cuối</button>${X.ff?`<button class="ttgo" data-act="ttx">Đóng</button>`:`<button class="ttgo" data-act="ttsave">✓ Lưu tỉ số vào giải</button>`}</div>`;
}
function ttFaceV(D,m){
  const ids=[...m.a,...m.b],id=ids.includes(ttFace)?ttFace:ids[0],p=D.pmap.get(id)||{},t=m.a.includes(id)?"a":"b";
  const X=ckSched(),r=X?(S.regs||[]).find(x=>x.sid===X.id&&x.pid===id&&!x.cancel):null,lk=!!(D.pmap.get(id)||{}).zuid;
  return `<div class="ttface"><div class="tthd"><button class="ttbk" data-act="ttfacex" aria-label="Đóng">✕</button><b>Đối chiếu VĐV</b></div>
    <div class="big">${p.photo?`<img src="${esc(p.photo)}" alt="">`:`<span>${esc(String(p.name||"?").trim().split(/\s+/).pop().charAt(0).toUpperCase())}</span>`}</div>
    <b class="nm">${esc(p.name||"?")}</b><small>${esc([p.code,p.gender==="F"?"Nữ":"Nam",`rating ${r2(D.st.get(id)?.rating??3)}`,`đội ${esc(ttShort(D,m,t))}`].filter(Boolean).join(" · "))}</small>
    ${r?`<span class="chip ${r.arrived?"ok":""}">${r.arrived?`✓ Đã check-in ${r.arrivedAt?hm(r.arrivedAt):""} · ${r.arrBy==="btc"?"tay":"QR"}`:"Chưa check-in"}</span>`:""}${lk?`<span class="chip ok">Zalo đã liên kết</span>`:""}
    <div class="thumbs">${ids.map(x=>`<button data-act="ttface" data-v="${esc(x)}" aria-pressed="${x===id}">${av(D.pmap.get(x),"sm",1)}</button>`).join("")}</div>
    <div class="two"><button class="ln" data-act="ttnotme" data-v="${esc(id)}">Không phải người này</button><button class="go" data-act="ttfacex">✓ Đúng người</button></div></div>`;
}
function ttFFV(D,m,X){
  const F=ttFF,tn=t=>esc(ttTN(D,m,t)),why=[["inj","Chấn thương (sau timeout y tế)"],["left","Tự rời sân giữa trận"],["abs","Không có mặt khi gọi trận (xử thua)"]];
  const t=F.t,w=t?ttO(t):null;
  return `<div class="mxdim" data-act="ttffx"></div><div class="mxsheet ttffs" role="dialog" aria-label="Bỏ cuộc"><span class="grab"></span><b class="ttred">Bỏ cuộc</b>
    <span class="cap">Đội nào bỏ cuộc?</span><div class="ttseg">${["a","b"].map(x=>`<button class="${t===x?"red":""}" data-act="ttffs" data-v="${x}" aria-pressed="${t===x}">${ttAvs(D,x==="a"?m.a:m.b,"xs")}${tn(x)}</button>`).join("")}</div>
    <span class="cap">Lý do</span><div class="ttlist">${why.map(([k,l])=>`<button data-act="ttffw" data-v="${k}" aria-pressed="${F.why===k}">${F.why===k?"●":"○"} ${l}</button>`).join("")}</div>
    ${t?`<div class="ttsum"><span class="cap">Kết quả sẽ lưu</span><b>${tn(w)} thắng · ${tn(t)} bỏ cuộc</b><span>${X.games.map((g,i)=>`Ván ${i+1} ${g.a}–${g.b}`).concat(X.done?[]:[`Ván ${X.g+1} dừng ở ${X.s.a}–${X.s.b} (ghi “bỏ cuộc”)`]).join(" · ")}</span>
      <small>${m.giai?"Giải cặp / vòng bảng: trận này và các trận còn lại của cặp bỏ cuộc tính thắng cho đối thủ, không cộng hiệu số. Rating của trận bỏ cuộc không thay đổi.":"Xoay cặp: trận này huỷ, không tính điểm, tiền và rating. Diễn biến vẫn lưu trong thùng rác để xem lại."}</small></div>`:""}
    <div class="two"><button class="ln" data-act="ttffx">Quay lại</button><button class="redb" data-act="ttffok" ${t&&F.why?"":"disabled"}>${armed("ttffok:"+m.id)?"Bấm lần nữa để xác nhận":"Xác nhận bỏ cuộc"}</button></div></div>`;
}
function ttLayer(D){
  if(!ttId)return "";
  const m=ttM();if(!m||m.status==="done"||!canScore(m)){ttId=null;return ""}
  if(!m.ref)return "";
  const X=ttRun(D,m),f=m.ref;
  let v=ttV||(f.started?"main":"pre");if(X.done&&v==="main")v="end";if(!f.started&&(v==="main"||v==="end"))v="pre";
  const body=ttFace?ttFaceV(D,m):v==="toss"?ttToss(D,m,X):v==="pre"?ttPre(D,m,X):v==="hist"?ttHist(D,m,X):v==="end"?ttEnd(D,m,X):ttMain(D,m,X);
  ttTickOn();
  return `<div class="ttfs${v==="main"&&!ttFace?" main":""}" role="dialog" aria-label="Màn trọng tài · ${ttFace?"mat":v}">${body}${ttFF?ttFFV(D,m,X):""}</div>`;
}
function ttTickOn(){if(ttTick||typeof setInterval!=="function"||typeof document==="undefined"||!document.querySelectorAll)return;
  ttTick=setInterval(()=>{if(!ttId){clearInterval(ttTick);ttTick=null;return}let re=false;
    document.querySelectorAll("[data-ttcd]").forEach(el=>{const l=+el.dataset.ttcd-Date.now();el.textContent=gdMMSS(l);if(l<=0)re=true;if(l<=15e3&&l>14e3)try{navigator.vibrate&&navigator.vibrate([200,100,200])}catch(e){}});
    document.querySelectorAll("[data-ttcu]").forEach(el=>{el.textContent=gdMMSS(Date.now()-+el.dataset.ttcu)});
    document.querySelectorAll("[data-ttel]").forEach(el=>{el.textContent=Math.max(0,Math.round((Date.now()-+el.dataset.ttel)/6e4))});
    if(re)render()},1000)}

/* ----- thao tác ----- */
async function ttAct(act,b){
  if(!act.startsWith("tt"))return false;
  const id=b.dataset.id;
  if(act==="tt"){const m=(S.matches||[]).find(x=>x.id===id);if(!m||!canScore(m))return true;ttId=id;ttV=null;ttFace=null;ttFF=null;ttMT=false;ttHG=null;
    if(!m.ref)await ttWrite(m,{by:authUser?.uid||"",byName:who(),at:Date.now(),pos:{a:[...m.a],b:[...m.b]},first:"a",left:"a",rally:false,ev:[]});else render();
    try{scrollTo({top:0})}catch(e){}return true}
  const m=ttM();if(!m||!canScore(m)){ttId=null;render();return true}
  const D=derive(),f=m.ref||{},X=ttRun(D,m),v=b.dataset.v;
  if(act==="ttx"){ttId=null;ttV=null;ttFF=null;ttFace=null;ttMT=false;render();return true}
  if(act==="ttv"){ttV=v;ttHG=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="ttpre"){ttV="pre";render();return true}
  if(act==="ttmain"){ttV=null;render();return true}
  if(act==="tthg"){ttHG=+v;render();return true}
  if(act==="ttface"){ttFace=v;render();return true}
  if(act==="ttfacex"){ttFace=null;render();return true}
  if(act==="ttnotme"){ttFace=null;toast(`Đã ghi chú: ${ttPN(D,v)} không đúng người. Báo BTC kiểm tra.`);await ttWrite(m,{...f,un:[...(f.un||[]),{at:Date.now(),g:X.g,tx:`Không đúng người: ${ttPN(D,v)}`}]});return true}
  // trước trận
  if(act==="ttfirst"){await ttWrite(m,{...f,first:v==="b"?"b":"a"});return true}
  if(act==="ttswap"){const t=v==="b"?"b":"a",P=(f.pos||{})[t]||(t==="a"?m.a:m.b);await ttWrite(m,{...f,pos:{...(f.pos||{a:m.a,b:m.b}),[t]:[P[1],P[0]]}});return true}
  if(act==="ttside"){await ttWrite(m,{...f,left:f.left==="b"?"a":"b"});return true}
  if(act==="ttrally"){await ttWrite(m,{...f,rally:v==="1"});return true}
  if(act==="ttstart"){await ttWrite(m,{...f,started:Date.now(),ev:[]});ttV=null;toast(`Bắt đầu trận · ${f.rally?"0-0":"0-0-2"}`);return true}
  // bốc thăm
  if(act==="tttc"){await ttWrite(m,{...f,toss:{ch:v}});return true}
  if(act==="tttcall"){await ttWrite(m,{...f,toss:{ch:(f.toss||{}).ch,call:v}});return true}
  if(act==="ttflip"){const T=f.toss||{};if(!T.ch||!T.call)return true;const r=(typeof crypto!=="undefined"&&crypto.getRandomValues?crypto.getRandomValues(new Uint8Array(1))[0]:Math.floor(Math.random()*256))%2?"N":"S";
    ttCoin=Date.now();await ttWrite(m,{...f,toss:{ch:T.ch,call:T.call,res:r,w:r===T.call?T.ch:ttO(T.ch),at:Date.now(),pk:[]}});return true}
  if(act==="ttpick"||act==="ttpick2"){const T={...(f.toss||{})},pk=[...(T.pk||[])];if(!T.w)return true;
    if(act==="ttpick"){const cur=pk.length&&pk[pk.length-1].v==="defer"?ttO(T.w):T.w;const keep=pk.filter(p=>p.v==="defer"&&p.t!==cur);
      const n=[...keep,{t:cur,v}];T.pk=n;T.pick=v;T.first=v==="serve"?cur:v==="recv"?ttO(cur):null}
    else{const sb=pk.find(p=>p.v==="side");if(!sb)return true;const o=ttO(sb.t);T.pk=[...pk.filter(p=>p.t!==o||p.v==="defer"),{t:o,v}];T.first=v==="serve"?o:sb.t}
    await ttWrite(m,{...f,toss:T,first:T.first??f.first});return true}
  // trong trận
  if(!f.started)return true;
  if(act==="ttp"){if(X.done){ttV="end";render();return true}if(X.needSw){toast("Đổi bên sân trước rồi nhập tiếp.");return true}
    await ttPush(m,{k:"p",w:v==="b"?"b":"a"});const Y=ttRun(D,m);if(Y.done)ttV="end";return true}
  if(act==="ttundo"){const ev=[...(f.ev||[])];if(!ev.length)return true;const e=ev.pop(),last=[...X.log].reverse().find(l=>l.at===e.at&&l.k!=="un");
    ttV=null;await ttWrite(m,{...f,ev,un:[...(f.un||[]),{at:Date.now(),g:X.g,tx:last?last.tx:e.k==="sw"?"đổi bên":"thao tác trước"}]});return true}
  if(act==="ttto"){if(!X.to[v])return true;await ttPush(m,{k:"to",t:v==="b"?"b":"a"});return true}
  if(act==="tttoe"){await ttPush(m,{k:"toe"});return true}
  if(act==="ttmt"){ttMT=true;render();return true}
  if(act==="ttmtx"){ttMT=false;render();return true}
  if(act==="ttmtgo"){ttMT=false;await ttPush(m,{k:"mt",pid:v});return true}
  if(act==="ttmte"){await ttPush(m,{k:"mte"});return true}
  if(act==="ttsw"){await ttPush(m,{k:"sw"});return true}
  if(act==="ttsign"){await ttWrite(m,{...f,sign:{...(f.sign||{}),[v]:Date.now()}});return true}
  if(act==="ttff"){ttFF={t:v==="a"||v==="b"?v:null,why:b.dataset.why||""};render();return true}
  if(act==="ttffx"){ttFF=null;render();return true}
  if(act==="ttffs"){ttFF={...ttFF,t:v};render();return true}
  if(act==="ttffw"){ttFF={...ttFF,why:v};render();return true}
  if(act==="ttffok"){const F=ttFF;if(!F||!F.t||!F.why)return true;
    if(m.giai&&!canWrite){toast("Bỏ cuộc ở giải cặp cần ban tổ chức xác nhận. Báo BTC mở màn này.");return true}
    if(!armOr("ttffok:"+m.id))return true;
    const why={inj:"chấn thương",left:"tự rời sân",abs:"không có mặt"}[F.why]||"";
    const ref={...f,ev:[...(f.ev||[]),{k:"ff",t:F.t,why,at:Date.now()}]};
    ttFF=null;ttId=null;
    await write(async()=>{await db.collection("matches").doc(m.id).update({ref});Object.assign(m,{ref});await trashMatches([m],"cancel");
      if(m.giai&&canWrite){const pid=F.t==="a"?m.pa:m.pb;if(pid)await saveG({out:{...(cfg().giai?.out||{}),[pid]:true}})}},`${ttTN(D,m,F.t)} bỏ cuộc · đã ghi nhận`);
    if(m.giai&&canWrite){await new Promise(r=>setTimeout(r,60));await gFill()}
    return true}
  if(act==="ttsave"){if(!X.done||X.ff)return true;const r=ttResult(X),msg=vPtsM(m,r.a,r.b);if(msg){toast(msg);return true}
    await write(()=>db.collection("matches").doc(m.id).update({sa:r.a,sb:r.b,status:"done",doneAt:Date.now(),ref:{...f,end:Date.now()}}).then(()=>{S.everWrote=true}),`Đã lưu tỉ số ${r.a}–${r.b}`);
    ttId=null;ttV=null;
    if(m.giai&&canWrite){if(m.status!=="done")Object.assign(m,{sa:r.a,sb:r.b,status:"done",doneAt:Date.now()});await new Promise(r=>setTimeout(r,60));await gFill()}
    render();return true}
  return true;
}
