/* ---------- Trang giới thiệu CLB (Mini App) + chỉnh sửa trong Cài đặt ----------
   clubs/{id}: cover (ảnh bìa JPEG nhỏ), tags [chuỗi], days [0..6, 0 = CN], t1/t2 "19:00", map (link Google Maps) */
const GT_TAGS=["Nhận người mới","Có chấp cân trình","Vui vẻ, giao lưu","Thi đấu nghiêm túc","Có HLV hướng dẫn","Cho mượn vợt","Sân có mái che","Có chỗ gửi xe","Nhiều bạn nữ","Có giải hằng tháng"];
const GT_DAYS=[[1,"T2"],[2,"T3"],[3,"T4"],[4,"T5"],[5,"T6"],[6,"T7"],[0,"CN"]];
const gtDays=c=>Array.isArray(c&&c.days)?c.days.map(Number):[];
const gtTags=c=>Array.isArray(c&&c.tags)?c.tags.filter(x=>typeof x==="string"):[];
const gtUrl=u=>/^https:\/\//.test(String(u||""))?String(u):"";
async function shrinkCover(file){
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
    const W=720,H=320,w=img.naturalWidth,h=img.naturalHeight,r=Math.min(w/W,h/H),sw=W*r,sh=H*r,c=document.createElement("canvas");c.width=W;c.height=H;
    const x=c.getContext("2d");x.imageSmoothingQuality="high";x.drawImage(img,(w-sw)/2,(h-sh)/2,sw,sh,0,0,W,H);
    let q=.72,d=c.toDataURL("image/jpeg",q);while(d.length>90000&&q>.35){q-=.1;d=c.toDataURL("image/jpeg",q)}return d}
  finally{URL.revokeObjectURL(url)}
}
// Kết quả giải gần đây: nhà vô địch (giải) hoặc MVP (giải đấu thường)
function gtRecent(D){
  return [...(S.hist||[])].sort((a,b)=>b.sid-a.sid).slice(0,3).map(h=>{
    const nm=id=>esc(D.pmap.get(id)?.name||(h.rows||[]).find(r=>r.id===id)?.name||"?");
    let w="";if(h.type==="giai"){const T=((h.giai||{}).table||[]).filter(t=>!t.out);if(T[0])w=`🏆 ${nm(T[0].a)} &amp; ${nm(T[0].b)} vô địch`}
    else if((h.rows||[]).length>1)w=`⭐ MVP ${nm(h.rows[0].id)}`;
    return `<div class="gtres"><span class="d num">${dmy(h.startedAt||h.endedAt).replace(/\/\d{4}$/,"")}</span><span class="t"><b>${esc(h.sname||`Giải đấu #${h.sid}`)}</b><small>${(h.rows||[]).length} người chơi${w?" · "+w:""}</small></span></div>`}).join("");
}
function mxIntro(D){
  const c=CLUB||{},M=D.players.filter(x=>!x.guest),n=M.length,top=[...M].sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating).slice(0,3);
  const R=M.map(p=>D.st.get(p.id).rating).filter(Number.isFinite),avg=R.length?R.reduce((a,b)=>a+b,0)/R.length:0,lo=R.length?Math.min(...R):0,hi=R.length?Math.max(...R):0;
  const cov=String(c.cover||"").startsWith("data:image/")?c.cover:"",days=gtDays(c),tags=gtTags(c),map=gtUrl(c.map),zl=String(c.zalo||"").replace(/\D/g,"");
  let h=mxBack("home","Trang chủ");
  h+=`<section class="gthero${cov?" img":""}"${cov?` style="background-image:linear-gradient(180deg,rgba(8,33,58,.05),rgba(8,33,58,.85)),url('${cov}')"`:""}>
    <div class="gtid">${clubAv(c,"big")}<span class="t"><b>${esc(c.name||"")}</b><small>${esc(c.city||"CLB pickleball")}</small></span></div></section>
    <div class="gtstat"><span><b class="num">${n}</b><small>THÀNH VIÊN</small></span><span><b class="num">${(S.hist||[]).length}</b><small>GIẢI ĐẤU</small></span><span><b class="num">${avg?r2(avg):"–"}</b><small>RATING TB</small></span></div>`;
  if(n)h+=`<div class="gtfaces">${M.slice(0,8).map(p=>av(p,"sm",1)).join("")}${n>8?`<span class="more">+${n-8}</span>`:""}<small>đang chơi cùng nhau</small></div>`;
  if(c.about||tags.length)h+=`<div class="mxcard gtab">${c.about?`<p>${esc(c.about)}</p>`:""}${tags.length?`<div class="gttags">${tags.map(t=>`<span>${esc(t)}</span>`).join("")}</div>`:""}</div>`;
  // Lịch, sân, trình độ, chi phí
  let info="";
  if(days.length||c.sched)info+=`<div class="gtrow"><span class="k">Lịch đánh</span>${days.length?`<div class="gtdays">${GT_DAYS.map(([d,l])=>`<i class="${days.includes(d)?"on":""}">${l}</i>`).join("")}</div>`:""}<b>${c.t1?`${esc(c.t1)}${c.t2?`–${esc(c.t2)}`:""}`:""}${c.t1&&c.sched?" · ":""}${esc(c.sched||"")}</b></div>`;
  if(c.venue||map)info+=`<div class="gtrow"><span class="k">Sân</span><b>${esc(c.venue||"")}</b>${map?`<button class="line sm" data-act="openurl" data-v="${esc(map)}">📍 Chỉ đường</button>`:""}</div>`;
  if(c.level||R.length>1)info+=`<div class="gtrow"><span class="k">Trình độ</span><b>${esc(c.level||"")}</b>${R.length>1?`<div class="gtlv"><i style="left:${Math.max(0,Math.min(100,(lo-2)/3*100))}%;right:${Math.max(0,Math.min(100,(5-hi)/3*100))}%"></i></div><small class="gtlvl"><span>2.0</span><span>rating thành viên ${r2(lo)}–${r2(hi)}</span><span>5.0</span></small>`:""}</div>`;
  const fee=c.feeTxt||(D.c.thu==="phi"?`${fmtK(+D.c.phi||0)}/giải đấu`:"");
  if(fee||mfOn())info+=`<div class="gtrow"><span class="k">Chi phí</span><b>${esc(fee)}</b>${mfOn()?`<small>Phí thành viên ${fmtK(mfCfg().k)}/${mfCfg().per==="m"?"tháng":mfCfg().per==="q"?"quý":"năm"} · ${esc(mfPerkTx())}</small>`:""}</div>`;
  if(info)h+=`<div class="mxcard gtinfo">${info}</div>`;
  {const XC=(S.sched||[]).length?xPlayerCards(D):"";if(XC)h+=`<span class="mxsec">Giải đấu sắp tới</span>${XC}`;else if(regOpen())h+=mxSessCard(D,true)}
  const rec=gtRecent(D);if(rec)h+=`<span class="mxsec">Kết quả gần đây</span><div class="mxcard list">${rec}</div>`;
  if(top.length>=3)h+=`<span class="mxsec">Top rating</span><div class="gtpod">${[1,0,2].map(i=>{const x=top[i];return `<div class="p p${i+1}" data-pid="${x.id}">${av(x,i?"md":"lg",1)}<b>${esc(x.name)}</b><small class="num">${r2(D.st.get(x.id).rating)}</small><i>${i+1}</i></div>`}).join("")}</div>`;
  else if(top.length)h+=`<div class="mxcard"><div class="mxhd"><b>Top rating</b></div>${top.map((x,i)=>`<div class="mxli" data-pid="${x.id}"><span class="no">${i+1}</span>${av(x,"sm",1)}<span class="t">${esc(x.name)}</span><b class="num">${r2(D.st.get(x.id).rating)}</b></div>`).join("")}</div>`;
  if(!mxPid())h+=`<div class="mxcard gtfirst"><b>Lần đầu tới chơi?</b><ol><li>Bấm <b>Tham gia</b>, chọn tên của bạn hoặc tạo hồ sơ mới.</li><li>Đăng ký giải đấu tới, chuyển khoản bằng mã QR ngay trong app.</li><li>Tới sân, quét mã check-in ở quầy là vào danh sách xếp trận.</li></ol>${zl?`<small>Còn thắc mắc? Nhắn chủ CLB qua Zalo bên dưới.</small>`:""}</div>`;
  const cta=`<div class="gtcta">${zl?`<button class="line wide" data-act="openurl" data-v="https://zalo.me/${zl}">💬 Nhắn Zalo</button>`:""}${mxPid()?"":`<a class="primary wide" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk">${regOpen()||schedUp().some(xOpen)?"Đăng ký giải đấu tới":"Tham gia CLB"}</a>`}</div>`;
  return mxShell(D,h,cta);
}
// Cài đặt: phần thêm cho Giới thiệu CLB (ảnh bìa, nhãn, ngày đánh, giờ, bản đồ)
function introExtra(){
  const c=CLUB||{},cov=String(c.cover||"").startsWith("data:image/")?c.cover:"",days=gtDays(c),tags=gtTags(c);
  return `<div class="fld"><span class="lbl">Ảnh bìa · ảnh ngang sân hoặc cả CLB</span><div class="gtcovEd"${cov?` style="background-image:url('${cov}')"`:""}>${cov?"":`<span>Chưa có ảnh bìa</span>`}</div>
      <span class="bar" style="gap:6px"><label class="lnkbtn">${cov?"Đổi ảnh bìa":"Thêm ảnh bìa"}<input type="file" accept="image/*" data-ccover="1" class="sr"></label>${cov?`<button class="ghost danger" data-act="gtcovdel">Xoá ảnh bìa</button>`:""}</span></div>
    <div class="fld"><span class="lbl">Ngày đánh cố định</span><div class="gtdays ed">${GT_DAYS.map(([d,l])=>`<button data-act="gtday" data-v="${d}" aria-pressed="${days.includes(d)}">${l}</button>`).join("")}</div></div>
    <div class="fld"><span class="lbl">Giờ đánh</span><span class="gttime"><input id="ci-t1" data-draft="ci-t1" type="time" value="${esc(val("ci-t1",c.t1||""))}"><span>đến</span><input id="ci-t2" data-draft="ci-t2" type="time" value="${esc(val("ci-t2",c.t2||""))}"></span></div>
    <div class="fld"><span class="lbl">Điểm nổi bật · chọn vài cái</span><div class="gttags ed">${GT_TAGS.map(t=>`<button data-act="gttag" data-v="${esc(t)}" aria-pressed="${tags.includes(t)}">${esc(t)}</button>`).join("")}</div></div>
    <label class="fld"><span class="lbl">Link Google Maps của sân</span><input id="ci-map" data-draft="ci-map" maxlength="300" inputmode="url" placeholder="https://maps.app.goo.gl/…" value="${esc(val("ci-map",c.map||""))}"></label>`;
}
async function gtAct(act,b){
  if(!/^gt(day|tag|covdel)$/.test(act))return false;
  if(!isAdm())return true;
  const ref=FB.doc(FB.fs,"clubs/"+CID);
  if(act==="gtday"){const d=Number(b.dataset.v),L=gtDays(CLUB);const nx=L.includes(d)?L.filter(x=>x!==d):[...L,d];await write(()=>FB.updateDoc(ref,{days:nx}),"Đã lưu ngày đánh");return true}
  if(act==="gttag"){const t=b.dataset.v,L=gtTags(CLUB);if(!GT_TAGS.includes(t))return true;const nx=L.includes(t)?L.filter(x=>x!==t):[...L,t].slice(0,6);await write(()=>FB.updateDoc(ref,{tags:nx}),"Đã lưu");return true}
  if(act==="gtcovdel"){if(!armOr("gtcovdel:x"))return true;await write(()=>FB.updateDoc(ref,{cover:""}),"Đã xoá ảnh bìa");return true}
  return false;
}
