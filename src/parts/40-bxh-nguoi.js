const LV=[2.5,3,3.25,3.5,3.75,4,4.25,4.5,5,5.5];
const code=p=>p.code||"chưa có mã";
function standings(D){
  return D.players.filter(p=>p.active!==false||D.st.get(p.id).g>0).map(p=>({p,s:D.st.get(p.id)})).sort((x,y)=>{
    const a=x.s,b=y.s; if(!!a.g!==!!b.g)return a.g?-1:1;
    const wa=a.g?a.w/a.g:0,wb=b.g?b.w/b.g:0; if(wb!==wa)return wb-wa;
    const da=a.pf-a.pa,dbb=b.pf-b.pa; if(dbb!==da)return dbb-da; return b.rating-a.rating;});
}
function vBxh(D){
  const all=standings(D);
  if(!all.length)return `<div class="empty"><strong>Bảng xếp hạng trống</strong>Thêm người có mặt hôm nay và lưu vài trận, bảng sẽ tự cập nhật.</div>`;
  const gF=r=>r.p.gender==="F", played=all.filter(r=>r.s.g);
  const tm=played.find(r=>!gF(r)), tf=played.find(gF);
  const card=(k,r)=>`<div><div class="t"><span class="k">${k}</span><span class="n">${r?esc(r.p.name):"–"}</span><span class="v num">${r?`${r.s.w}–${r.s.l}`:"–"}</span></div>${r?av(r.p,"lg"):""}</div>`;
  const nM=all.filter(r=>!gF(r)).length,nF=all.length-nM;
  const rows=all.filter(r=>bxF==="all"||(bxF==="F")===gF(r));
  const fb=(v,l,n)=>`<button data-act="bxf" data-v="${v}" aria-pressed="${bxF===v}">${l} · ${n}</button>`;
  return `${meBox(D,{pay:false})}${played.length?`<div class="no1">${card("Số 1 · Nam",tm)}${card("Số 1 · Nữ",tf)}</div>`:""}
  <div class="bar"><span class="lbl grow">${played.length} người đã đánh</span><span class="seg" role="group" aria-label="Lọc theo giới">${fb("all","Tất cả",all.length)}${fb("M","Nam",nM)}${fb("F","Nữ",nF)}</span></div>
  <div class="rkl">${rows.map(r=>{const s=r.s,diff=s.pf-s.pa,i=all.indexOf(r);return `<div class="rkr${i===0&&s.g?" top1":""}${r.p.id===ME?" me":""}"><span class="rk num">${s.g?i+1:"–"}</span>${av(r.p,"sm")}<span class="t"><b>${esc(r.p.name)}</b><small>${s.g?`${s.w} thắng ${s.l} thua · ${diff>0?"hơn":diff<0?"kém":"hòa"} ${Math.abs(diff)} điểm`:"chưa đánh hôm nay"}${r.p.active===false?" · đã nghỉ":""}</small></span><span class="rt"><b class="num">${r2(s.rating)}</b><small class="${s.d>0.004?"up":s.d<-0.004?"down":""} num">${s.g&&Math.abs(s.d)>0.004?(s.d>0?"▲ ":"▼ ")+Math.abs(s.d).toFixed(2):""}</small></span></div>`}).join("")}</div>
  <details class="why"><summary>Xếp hạng tính thế nào?</summary><p>Xếp theo tỉ lệ thắng, bằng nhau thì xét hơn kém điểm, rồi tới rating. Rating tính giống DUPR: mỗi trận app đoán trước tỉ số, đánh tốt hơn dự đoán thì tăng kể cả khi thua, kém hơn thì giảm kể cả khi thắng. Số tiền mỗi người góp xem ở tab Quỹ.</p></details>`;
}

function memberEdit(p){
  return `<div class="form" style="margin-top:8px">
    <label><span class="lbl">Tên</span><input id="nm-${p.id}" data-draft="nm-${p.id}" value="${esc(val("nm-"+p.id,p.name))}"></label>
    <label><span class="lbl">Giới tính</span><select id="gd-${p.id}" data-draft="gd-${p.id}"><option value="M" ${val("gd-"+p.id,p.gender||"M")==="M"?"selected":""}>Nam</option><option value="F" ${val("gd-"+p.id,p.gender||"M")==="F"?"selected":""}>Nữ</option></select></label>
    <label><span class="lbl">Trình hiện tại</span><select id="rt-${p.id}" data-draft="rt-${p.id}">${LV.concat(LV.includes(Number(p.rating0))?[]:[Number(p.rating0)||3]).sort((a,b)=>a-b).map(x=>`<option value="${x}" ${Number(val("rt-"+p.id,p.rating0??3))===x?"selected":""}>${x.toFixed(2)}</option>`).join("")}</select></label>
  </div>${errs["p-"+p.id]?`<p class="err">${esc(errs["p-"+p.id])}</p>`:""}
  <div class="bar" style="margin-top:8px">${p.photo?`<button class="ghost danger" data-act="phdel" data-id="${p.id}">Xóa ảnh</button>`:""}<span class="grow"></span><button class="ghost" data-act="pedit-x" data-id="${p.id}">Thôi</button><button class="primary" data-act="pedit-save" data-id="${p.id}">Lưu</button></div>`;
}
function memberRow(D,p,here,busy){
  const s=D.st.get(p.id),A=D.all.get(p.id),ed=editing.has("p-"+p.id);
  const stat=here?`Hôm nay ${s.g} trận · ${s.w}T-${s.l}B · chờ ${s.sits} lượt${busy?" · đang đánh":""}`
                 :`${A.g} trận · ${A.ses.size} buổi · thắng ${A.g?Math.round(A.w/A.g*100):0}% · rating ${r2(Number(p.rating0)||3)}`;
  let btn="";
  if(canWrite){
    btn=`<button class="ghost" data-act="pedit" data-id="${p.id}">Sửa</button>`;
    if(here)btn+=busy?`<span class="pill">Đang trên sân</span>`:`<button data-act="checkout" data-id="${p.id}">Cho nghỉ</button>`;
    else btn+=`<button class="primary" data-act="checkin" data-id="${p.id}">Thêm vào buổi</button>`;
    if(!busy)btn+=delBtn("pdel",p.id,"Xóa");
  }
  return `<div class="mrow"><div class="mhead"><span class="avr">${canWrite?`<label class="avup" title="Đổi ảnh đại diện">${av(p,"md")}<input type="file" accept="image/*" data-photo="${p.id}" aria-label="Chọn ảnh cho ${esc(p.name)}"><i aria-hidden="true">+</i></label>`:av(p,"md")}<span class="code num" title="Rating">${r2(here?s.rating:Number(p.rating0)||3)}</span></span>
    <div class="mname"><b>${esc(p.name)}</b> ${gPill(p.gender==="F"?"F":"M")}<div class="meta num">${stat}</div></div>
    <div class="bar" style="gap:6px;justify-content:flex-end">${btn}</div></div>${ed?memberEdit(p):""}</div>`;
}
let pickOpen=false;const pickSel=new Set();
function pickPanel(D,away){
  if(!pickOpen)return "";
  if(!away.length)return `<p class="rule" style="margin-top:10px">Tất cả thành viên đều đang có mặt hôm nay.</p>`;
  const list=[...away].sort((a,b)=>a.name.localeCompare(b.name,"vi"));
  for(const id of [...pickSel])if(!away.some(p=>p.id===id))pickSel.delete(id);
  return `<div class="pick"><div class="bar" style="padding:6px 4px"><span class="lbl grow">Thành viên các buổi trước (${list.length})</span><button class="ghost" data-act="pickall">${pickSel.size===list.length?"Bỏ chọn hết":"Chọn hết"}</button></div>${list.map(p=>{const A=D.all.get(p.id);return `<label class="pickrow"><input type="checkbox" data-pick="${p.id}" ${pickSel.has(p.id)?"checked":""}>${av(p,"sm")}<span class="mname"><b>${esc(p.name)}</b> ${gPill(p.gender==="F"?"F":"M")}<span class="meta num" style="display:block">${A.g} trận · ${A.ses.size} buổi</span></span></label>`}).join("")}</div>
  <div class="bar" style="margin-top:10px"><span class="grow"></span><button class="primary" data-act="pickadd">Thêm ${pickSel.size} người vào buổi</button></div>`;
}
function addPanel(D,away){
  return `<textarea id="bulk" data-draft="bulk" rows="4" placeholder="Mỗi dòng một người&#10;Tuấn&#10;Hà | nữ">${esc(val("bulk",""))}</textarea>
    <div class="bar" style="margin-top:10px"><label class="bar"><span class="lbl">Trình ban đầu</span>
      <select id="lvl" data-draft="lvl">${LV.map(x=>`<option value="${x}" ${String(val("lvl","2.5"))===String(x)?"selected":""}>${x.toFixed(2)}</option>`).join("")}</select></label>
      <label class="bar"><span class="lbl">Giới tính</span><select id="gnd" data-draft="gnd"><option value="M" ${val("gnd","M")==="M"?"selected":""}>Nam</option><option value="F" ${val("gnd","M")==="F"?"selected":""}>Nữ</option></select></label>
      <button data-act="picktoggle">${pickOpen?"Đóng danh sách":"Chọn từ danh sách"}</button><span class="grow"></span><button class="primary" data-act="add">Thêm và vào buổi luôn</button></div>${pickPanel(D,away)}`;
}
function vNguoi(D){
  let h="";
  const busyS=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const here=D.players.filter(p=>p.active!==false), away=D.players.filter(p=>p.active===false);
  if(canWrite)h+=`<div class="panel"><h2 style="margin-bottom:4px">Thêm thành viên mới</h2>${addPanel(D,away)}</div>`;
  if(!D.players.length)return h+`<div class="empty"><strong>Chưa có thành viên</strong>Nhập tên ở khung trên, mỗi dòng một người.</div>`;
  if(canWrite&&D.players.some(p=>!p.code))h+=`<div class="ro bar"><span class="grow">${D.players.filter(p=>!p.code).length} người chưa có mã thành viên.</span><button data-act="codes">Cấp mã</button></div>`;
  h+=`<div class="panel"><div class="bar" style="margin-bottom:4px"><h2 class="grow">Có mặt hôm nay</h2><span class="pill win num">${here.length} người</span></div>`;
  h+=here.length?here.map(p=>memberRow(D,p,true,busyS.has(p.id))).join(""):`<p class="rule">Chưa ai vào buổi. Bấm “Thêm vào buổi” ở danh sách bên dưới.</p>`;
  h+=`</div>`;
  const q=String(val("q","")).trim().toLowerCase();
  const list=away.filter(p=>!q||p.name.toLowerCase().includes(q)||String(p.code||"").toLowerCase().includes(q)||String(p.duprId||"").toLowerCase().includes(q));
  h+=`<div class="panel"><div class="bar" style="margin-bottom:8px"><h2 class="grow">Thành viên khác</h2><span class="meta num">${away.length} người</span></div>
    <input id="q" data-draft="q" type="search" placeholder="Tìm theo tên" value="${esc(val("q",""))}" style="width:100%;margin-bottom:4px">`;
  h+=list.length?list.map(p=>memberRow(D,p,false,false)).join(""):`<p class="rule" style="margin-top:8px">${away.length?"Không tìm thấy ai khớp.":"Tất cả thành viên đều đang có mặt."}</p>`;
  h+=`</div>`+rrPanel();
  return h;
}

