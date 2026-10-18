function vSan(D){
  if(!canWrite)return vSanView(D);
  if(phaseOf(D)==="prep"||stepView==="prep")return steps3(1,D)+vPrep(D);
  const c=D.c, busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const waiting=D.players.filter(p=>p.active!==false&&!busy.has(p.id));
  const free=Math.max(0,c.courts-D.playing.length), can=Math.min(free,Math.floor(waiting.length/4));
  let h=steps3(2,D)+cfgChip(D);
  if(!D.players.length)return h+`<div class="empty"><strong>Chưa có người chơi</strong>Vào tab Thành viên thêm người, hoặc bấm Sửa để điểm danh.</div>`;
  if(!D.playing.length)h+=`<div class="lab"><span class="lbl">Sân</span><span class="bar">${courtStep(c)}</span></div><div class="empty"><strong>Sân đang trống</strong>Bấm “Xếp trận” để app ghép đôi tự động: ai chờ lâu, đánh ít được vào trước; ưu tiên đôi nam nữ hoặc cùng giới theo cài đặt; không bao giờ đôi nam gặp đôi nữ.</div>`;
  else h+=`<div class="lab"><span class="lbl">Sân đang đánh</span><span class="bar">${courtStep(c)}</span></div><div class="courts">${D.playing.map(m=>courtCard(D,m)).join("")}</div>`;
  h+=queueBox(D,true);
  h+=`<button class="ball wide" data-act="gen">${can?`Xếp trận cho ${can} sân trống`:"Xếp trận tiếp"}</button>`;
  if(errs.gen)h+=`<p class="err">${esc(errs.gen)}</p>`;
  h+=moneyMini(D);
  h+=`<a class="btn-line" href="${pathOf("chot")}" data-go="chot">Kết thúc &amp; chốt buổi →</a><p class="rule" style="text-align:center;margin-top:-6px">Chưa chốt thì vẫn đánh tiếp được. Chốt rồi vẫn mở lại để sửa được.</p>`;
  return h+doneBox(D)+undoBar();
}
function queueBox(D,org){
  const Q=waitQueue(D),pos=new Map(Q.map((p,i)=>[p.id,i+1]));
  const col=(t,L)=>`<div class="qcol"><span class="qh">${t} · ${L.length}</span>${L.length?L.map(p=>{const s=D.st.get(p.id);return `<span class="qi${p.id===ME?" me":""}"><b class="qn num">${pos.get(p.id)}</b>${av(p,"xs")}<span class="qnm">${esc(p.name)}</span><small class="num">${s.g}</small></span>`}).join(""):`<small class="rule">Không ai</small>`}</div>`;
  return `<div><div class="lab"><span class="lbl">Hàng chờ (${Q.length}) · số nhỏ lên trước</span>${org?`<button class="lnk" data-act="sheet">+ Người đến muộn</button>`:""}</div>${Q.length?`<div class="qgrid">${col("Nam",Q.filter(p=>p.gender!=="F"))}${col("Nữ",Q.filter(p=>p.gender==="F"))}</div><small class="rule">Số bên phải là số trận đã đánh.</small>`:`<p class="rule">Không ai đang chờ.</p>`}</div>`;
}
function doneBox(D){
  const hist=[...D.done].filter(myCourt).reverse();
  return `<div class="panel"><div class="bar" style="margin-bottom:6px"><h2 class="grow">Trận đã xong</h2><span class="meta num">${hist.length} trận</span></div>`+
    (hist.length?`<div class="hist">${hist.map(m=>histRow(D,m)).join("")}</div>`:`<p class="rule">Kết quả sẽ hiện ở đây sau khi lưu tỉ số.</p>`)+`</div>`;
}
function refNote(){
  if(!REF)return "";
  return `<div class="refnote${MYCT.length?"":" warn"}"><b>Bạn là trọng tài${MYCT.length?` · sân ${MYCT.join(", ")}`:""}</b><span>${MYCT.length?"Chỉ nhập được tỉ số ở sân được giao. Sân khác chỉ xem.":"Chưa được giao sân. Báo chủ CLB hoặc quản lý giao sân trong Cài đặt."}</span></div>`;
}
function vSanView(D){
  const c=D.c,act=D.players.filter(p=>p.active!==false);
  if(phaseOf(D)==="prep"){
    const last=[...S.hist].sort((a,b)=>b.sid-a.sid)[0],meIn=ME&&act.some(p=>p.id===ME),thu=c.thu||"keo";
    const box=act.length?`<div class="soon"><span class="lbl">Sắp bắt đầu</span><b>${esc(sessTitle(c,D.sid))} sắp bắt đầu</b><span>${fmtTxt(c)} · ${c.courts} sân · ${act.length} người đã điểm danh${c.cphi===false?" · không thu tiền":thu==="phi"?` · ${fmtK(+c.phi||0)}/người`:` · ${esc(THU[thu])}`} · ${esc(ruleTxt(c))}</span>${ME?`<span class="${meIn?"in":""}">${meIn?"Có bạn trong danh sách hôm nay.":"Bạn chưa có trong danh sách hôm nay."}</span>`:""}</div>`
      :`<div class="soon"><b>Hôm nay chưa có buổi</b><span>${last?`Buổi gần nhất: #${last.sid} · ${dmy(last.endedAt||last.startedAt)}. <a href="${pathOf("buoi",{sid:last.sid})}" data-go="buoi" data-id="${last.sid}">Xem kết quả</a>`:"Ban tổ chức sẽ mở buổi ở đây. Trang tự cập nhật."}</span></div>`;
    return meBox(D,{pay:false})+box;
  }
  let h=refNote()+`<div class="liveln"><span class="dot"></span><span class="grow">${esc(sessTitle(c,D.sid))} · đang đánh · ${D.playing.length} sân · ${act.length} người</span>${liveShareBtn()}</div>`+meBox(D);
  const PL=D.playing.filter(myCourt);
  h+=PL.length?`<div class="lab"><span class="lbl">${REF?"Sân của bạn":"Đang đánh"}</span></div><div class="courts">${PL.map(m=>courtCard(D,m)).join("")}</div>`:REF?`<div class="empty"><strong>Sân của bạn đang trống</strong>Chờ ban tổ chức xếp trận vào sân ${MYCT.join(", ")||"được giao"}.</div>`:`<div class="empty"><strong>Sân đang trống</strong>Chờ ban tổ chức xếp trận. Trang tự cập nhật, không cần tải lại.</div>`;
  return h+queueBox(D,false)+doneBox(D);
}
const gOf=(D,id)=>D.pmap.get(id)?.gender==="F"?"F":"M";
const tType=(D,ids)=>ids.map(id=>gOf(D,id)).sort().join("");
const T_LABEL={FM:"Đôi nam nữ",MM:"Đôi nam",FF:"Đôi nữ"};
const KIND={mixed:"Đôi nam nữ",gender:"Cùng giới",hybrid:"Trận lai"};
const kindOf=(D,m)=>m.kind||(()=>{const a=tType(D,m.a),b=tType(D,m.b);return a==="FM"&&b==="FM"?"mixed":a===b?"gender":"hybrid"})();
const AVC=["#1f8fe5","#3a6ea5","#1a7f45","#c9302c","#7a4cc2","#c7770b","#127a8a","#b0337a"];
function av(p,cls="",nolink){
  if(!p)return `<span class="av ${cls}"></span>`;
  const n=String(p.name||"?").trim(),w=n.split(/\s+/),ini=(w[w.length-1]||"?").charAt(0).toUpperCase();
  const lk=!nolink&&p.id&&MODE==="club"&&S.players.some(x=>x.id===p.id)?` data-pid="${esc(p.id)}" title="Xem hồ sơ ${esc(n)}"`:"";
  if(p.photo&&/^data:image\//.test(p.photo))return `<span class="av ${cls}"${lk}><img src="${esc(p.photo)}" alt="" decoding="async"></span>`;
  let h=0;for(const ch of n)h=(h*31+ch.charCodeAt(0))>>>0;
  return `<span class="av ${cls}" style="background:${AVC[h%AVC.length]}" aria-hidden="true"${lk}>${esc(ini)}</span>`;
}
const avId=(D,id,cls)=>av(D.pmap.get(id),cls);
async function shrink(file){
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
    const w=img.naturalWidth,h=img.naturalHeight,s=Math.min(w,h),N=160,c=document.createElement("canvas");c.width=c.height=N;
    const x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(img,(w-s)/2,(h-s)/2,s,s,0,0,N,N);return c.toDataURL("image/jpeg",.8)}
  finally{URL.revokeObjectURL(url)}
}
const gPill=g=>`<span class="pill g${g}">${g==="F"?"Nữ":"Nam"}</span>`;
function teamLine(D,ids){
  const st=ids.map(id=>D.st.get(id)?.rating??3), a=(st[0]+st[1])/2;
  return `<div class="tl"><span class="avs">${ids.map(id=>avId(D,id,"md")).join("")}</span><div>${ids.map(id=>nm(D,id)).join(" &amp; ")}<small class="num">${T_LABEL[tType(D,ids)]} · Rating TB ${r2(a)}</small></div></div>`;
}
function keoPill(c,pA){
  const fav=Math.max(pA,1-pA);
  if(c.keo&&fav>=c.thr)return `<span class="pill keo">Kèo lệch: đội mạnh thua ${c.hi}k, đội yếu thua ${c.lo}k</span>`;
  return `<span class="pill">Thua ${c.fee}k/người</span>`;
}
function courtCard(D,m){
  const c=D.c,i=D.info.get(m.id),pA=i.pA, ka=`sa-${m.id}`,kb=`sb-${m.id}`;
  return `<article class="court${isNew(m.id+"p")?" new":""}" style="--cc:${cColor(m.court)}">
    <div class="court-h"><h3>Sân ${esc(cName(m.court))}</h3><span class="num">${KIND[kindOf(D,m)]} · Trận #${m.seq}</span>${canScore(m)?spkBtn("c:"+m.id,`<button class="spk" data-act="speak" data-id="${m.id}" aria-label="Đọc loa mời vào sân ${esc(cName(m.court))}"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>Mời</button>`):""}</div>${refTag(m.court)}
    <div class="team"><div class="names">${teamLine(D,m.a)}</div><input class="score num" id="${ka}" data-draft="${ka}" type="number" inputmode="numeric" min="0" max="99" aria-label="Điểm đội 1" value="${esc(val(ka,""))}" ${canScore(m)?"":"disabled"}></div>
    <div class="prob" title="Xác suất thắng dự kiến"><i style="width:${Math.round(pA*100)}%"></i></div>
    <div class="bar" style="justify-content:space-between;padding:6px 16px 0"><span class="lbl num" style="color:var(--navy)">${Math.round(pA*100)}% thắng</span><span class="lbl num">${Math.round((1-pA)*100)}% thắng</span></div>
    <div class="team"><div class="names">${teamLine(D,m.b)}</div><input class="score num" id="${kb}" data-draft="${kb}" type="number" inputmode="numeric" min="0" max="99" aria-label="Điểm đội 2" value="${esc(val(kb,""))}" ${canScore(m)?"":"disabled"}></div>
    <div class="court-f">${keoPill(c,pA)}<span style="flex:1"></span>${canWrite?`<button class="ghost danger" data-act="cancel" data-id="${m.id}">Hủy</button>`:""}${canScore(m)?`<button class="primary" data-act="savechk" data-id="${m.id}">Lưu tỉ số</button>`:""}</div>${saveConfirm(D,m)}${cancelConfirm(D,m)}
    ${errs[m.id]?`<p class="err" style="padding:0 14px 12px">${esc(errs[m.id])}</p>`:""}
  </article>`;
}
function histRow(D,m){
  const i=D.info.get(m.id)||{},ka=`ea-${m.id}`,kb=`eb-${m.id}`;
  if(editing.has(m.id))return `<div class="hrow"><span class="meta">S${esc(mName(m))}</span>
    <div class="who">${m.a.map(id=>nm(D,id)).join(" &amp; ")} <span class="l">vs</span> ${m.b.map(id=>nm(D,id)).join(" &amp; ")}
    <div class="bar" style="margin-top:6px"><input class="score num" style="width:64px;font-size:20px" id="${ka}" data-draft="${ka}" type="number" inputmode="numeric" value="${esc(val(ka,m.sa))}" aria-label="Điểm đội 1"> <span>–</span> <input class="score num" style="width:64px;font-size:20px" id="${kb}" data-draft="${kb}" type="number" inputmode="numeric" value="${esc(val(kb,m.sb))}" aria-label="Điểm đội 2"></div>
    ${errs[m.id]?`<p class="err">${esc(errs[m.id])}</p>`:""}</div>
    <div class="bar"><button class="ghost" data-act="edit-x" data-id="${m.id}">Thôi</button><button class="primary" data-act="edit-save" data-id="${m.id}">Lưu</button></div></div>`;
  const A=m.a.map(id=>nm(D,id)).join(" &amp; "),B=m.b.map(id=>nm(D,id)).join(" &amp; ");
  return `<div class="hrow${isNew(m.id+"d")?" new":""}"><span class="meta num">S${esc(mName(m))}<br>#${m.seq}</span>
    <div class="who">${i.aWin?`<b>${A}</b>`:`<span class="l">${A}</span>`} <span class="l">vs</span> ${!i.aWin?`<b>${B}</b>`:`<span class="l">${B}</span>`}
      <div class="bar" style="margin-top:4px;gap:6px"><span class="pill lose">Thua góp ${i.fee}k/người</span><span class="pill">${KIND[kindOf(D,m)]}</span><span class="pill num" title="Rating thay đổi theo điểm thực tế so với dự kiến, giống DUPR">Dự kiến ${expScore(i.eS,D.c.target)} · đội thắng ${sgn(i.aWin?i.dA:-i.dA)}</span></div></div>
    <div style="text-align:right"><div class="sc num">${m.sa}–${m.sb}</div>${canWrite?`<button class="ghost" data-act="edit" data-id="${m.id}">Sửa</button>${delBtn("mdel",m.id,"Xóa")}`:""}</div></div>`;
}


/* ----- Chia sẻ buổi đang đánh vào nhóm ----- */
const liveShareBtn=()=>`<button class="lshare" data-act="lshare" aria-label="Chia sẻ buổi đang đánh">📤 Chia sẻ</button>`;
function liveShareText(D){
  const c=D.c,act=D.players.filter(p=>p.active!==false).length,club=(CLUB&&CLUB.name)||c.title||"CLB";
  return `📣 ${club}: ${shareName(c.sname,"Buổi đánh hôm nay")} đang diễn ra!\n${D.playing.length} sân · ${act} người. Mời cả nhà vào xem trực tiếp:\n• Lượt trận đang đánh và ai sắp tới lượt\n• Tỉ số, kết quả từng trận cập nhật ngay\n• Bảng xếp hạng buổi hôm nay`;
}
