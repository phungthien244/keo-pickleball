/* ---------- Người chơi: đăng nhập Zalo, nhận hồ sơ, đăng ký buổi ---------- */
const isZalo=u=>!!u&&/^zalo_/.test(String(u.uid||""));
let unsubLink=null;
function zaloProf(){try{return JSON.parse(localStorage.getItem("pb-zprof")||"{}")}catch(e){return {}}}
function zaloStart(){
  if(window.FB_TARGET==="mock"){FB.signInWithCustomToken(FB.auth,"demo").then(()=>location.reload());return}
  location.href="/api/zalo?start=1&back="+encodeURIComponent(location.pathname);
}
// Trang vừa được Zalo trả về: #zt=<token>&zn=<tên>&zp=<ảnh> hoặc #zerr=<lỗi>
async function zaloHash(){
  const h=String(location.hash||"");if(!/[#&](zt|zerr)=/.test(h))return;
  const q=new URLSearchParams(h.slice(1));
  try{history.replaceState(null,"",location.pathname+location.search)}catch(e){}
  if(q.get("zerr")){setTimeout(()=>toast(q.get("zerr")),600);return}
  try{localStorage.setItem("pb-zprof",JSON.stringify({n:q.get("zn")||"",p:q.get("zp")||""}))}catch(e){}
  try{await FB.signInWithCustomToken(FB.auth,q.get("zt"));toast("Đã đăng nhập bằng Zalo")}catch(e){toast("Đăng nhập Zalo chưa được, thử lại.")}
}
// Theo dõi yêu cầu nhận hồ sơ của chính mình
function watchLink(){
  if(unsubLink){try{unsubLink()}catch(e){}unsubLink=null}S.link=undefined;
  if(legacy||!isZalo(authUser))return;
  try{unsubLink=FB.onSnapshot(FB.doc(FB.fs,PFX+"links/"+authUser.uid),{},s=>{S.link=s.exists()?s.data():null;
    if(S.link&&S.link.status==="ok"&&S.link.pid&&ME!==S.link.pid){ME=S.link.pid;try{localStorage.setItem("pb-me-"+CID,ME)}catch(e){}}
    render()},()=>{S.link=null;render()})}catch(e){}
}
const zaloBtn=(label="Đăng nhập với Zalo")=>`<button class="zalobtn" data-act="zlogin"><b>Z</b>${label}</button>`;

/* ----- Thẻ cho người chơi đăng nhập Zalo nhưng chưa có hồ sơ ----- */
let lnkPick=null,lnkNew=false;
function linkCard(D){
  if(MODE!=="club"||legacy||!isZalo(authUser)||canWrite||REF)return "";
  const L=S.link,zp=zaloProf();
  if(L===undefined)return "";
  if(L&&L.status==="ok")return "";
  if(L&&L.status==="pending")return `<div class="lnkcard wait"><b>Đang chờ chủ CLB duyệt</b><span>${L.pid?`Bạn đã chọn hồ sơ <b>${esc(D.pmap.get(L.pid)?.name||L.name||"")}</b>.`:`Bạn đăng ký là người mới: <b>${esc(L.newName||"")}</b>.`} Duyệt xong là bạn đăng ký buổi được.</span><button class="lnk" data-act="lnkcancel">Chọn lại</button></div>`;
  const free=D.players.filter(p=>!p.zuid).sort((a,b)=>String(a.name).localeCompare(String(b.name),"vi"));
  let h=`<div class="lnkcard"><b>Chào ${esc(zp.n||"bạn")}! Bạn là ai trong CLB?</b><span>Chạm vào tên của bạn. Chủ CLB duyệt một lần, sau đó bạn tự đăng ký buổi được.</span>`;
  if(!lnkNew){
    h+=pplPick(D,free,{act:"lnkpick",key:"lnk",sel:lnkPick?[lnkPick]:[]});
    h+=`<div class="bar" style="margin-top:8px"><button class="line" data-act="lnknew">Tôi là người mới</button><span class="grow"></span><button class="primary" data-act="lnksend" ${lnkPick?"":"disabled"}>Gửi yêu cầu</button></div>`;
  }else{
    h+=`<label class="fld"><span class="lbl">Tên của bạn trong CLB</span><input id="lnk-name" data-draft="lnk-name" maxlength="30" value="${esc(val("lnk-name",zp.n||""))}"></label>
      <div class="fld"><span class="lbl">Giới tính</span><span class="seg"><button data-act="lnkg" data-v="M" aria-pressed="${val("lnk-g","M")==="M"}">Nam</button><button data-act="lnkg" data-v="F" aria-pressed="${val("lnk-g","M")==="F"}">Nữ</button></span></div>
      <div class="bar" style="margin-top:8px"><button class="line" data-act="lnknew">‹ Chọn trong danh sách</button><span class="grow"></span><button class="primary" data-act="lnksend">Gửi yêu cầu</button></div>`;
  }
  return h+`</div>`;
}

/* ----- Đăng ký buổi ----- */
const regCfg=()=>cfg().reg||{};
const regOpen=()=>regCfg().on===true;
function regList(D){
  const max=Math.max(1,+regCfg().max||999);
  const L=[...(S.regs||[])].filter(r=>r.sid===D.sid).sort((a,b)=>(a.at||0)-(b.at||0));
  return {all:L,conf:L.slice(0,max),wait:L.slice(max),max};
}
const regLockAt=()=>{const r=regCfg();return r.at?r.at-(+r.lockH||0)*3600e3:0};
const dowVN=t=>["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"][new Date(t).getDay()];
const regWhen=t=>t?`${dowVN(t)} ${hm(t)} · ${dmy(t)}`:"";
function regCard(D){
  if(MODE!=="club"||!regOpen()||phaseOf(D)==="live")return "";
  const r=regCfg(),R=regList(D),u=authUser,myUid=u&&u.uid,mine=R.all.find(x=>x.uid&&x.uid===myUid);
  const pos=mine?R.all.indexOf(mine):-1,locked=r.at&&Date.now()>regLockAt();
  const face=x=>{const p=D.pmap.get(x.pid);return `<span class="rgp">${av(p||{name:x.name},"sm",1)}<small>${esc(p?.name||x.name||"?")}</small></span>`};
  let act="";
  if(canWrite)act=`<small class="rule">Bạn là ban tổ chức: thêm hoặc bỏ người ở mục Mở đăng ký trong Chuẩn bị.</small>`;
  else if(!isZalo(u))act=zaloBtn("Đăng nhập Zalo để đăng ký");
  else if(!S.link||S.link.status!=="ok")act=`<small class="rule">Chọn hồ sơ của bạn ở trên và chờ chủ CLB duyệt để đăng ký.</small>`;
  else if(mine)act=`<div class="rgme ${pos<R.max?"in":"wt"}"><b>${pos<R.max?"✓ Bạn đã đăng ký":`Bạn đang chờ · thứ ${pos-R.max+1}`}</b>${locked?`<small>Đã khóa hủy (${r.lockH} tiếng trước giờ đánh)</small>`:`<button class="ghost danger" data-act="regout">Hủy đăng ký</button>`}</div>`;
  else act=`<button class="primary wide" data-act="regin">${R.conf.length>=R.max?"Vào danh sách chờ":"Đăng ký tham gia"}</button>`;
  return `<section class="regcard"><div class="rh"><span class="lbl">Đăng ký buổi</span><b>${esc(D.c.sname||"Buổi đánh")}</b><span>${esc(regWhen(r.at))}${r.place?` · ${esc(r.place)}`:""}</span></div>
    <div class="rgn"><b class="num">${R.conf.length}/${R.max<999?R.max:"∞"}</b><span>đã đăng ký${R.wait.length?` · ${R.wait.length} người chờ`:""}${r.lockH&&r.at?` · khóa hủy ${r.lockH} tiếng trước giờ đánh`:""}</span></div>
    ${act}
    ${R.conf.length?`<div class="rgl">${R.conf.map(face).join("")}</div>`:""}
    ${R.wait.length?`<span class="lbl" style="margin-top:6px">Danh sách chờ</span><div class="rgl wt">${R.wait.map(face).join("")}</div>`:""}</section>`;
}

/* ----- Ban tổ chức: mở đăng ký + duyệt người chơi ----- */
function regAdmin(D){
  const r=regCfg(),R=regList(D);
  if(!regOpen())return `<small class="rule">Người chơi đăng nhập Zalo tự đăng ký buổi, có giới hạn chỗ và danh sách chờ. Tích để mở.</small>`;
  const dt=r.at?new Date(r.at-new Date(r.at).getTimezoneOffset()*6e4).toISOString().slice(0,16):"";
  const nm=x=>esc(D.pmap.get(x.pid)?.name||x.name||"?");
  return `<label class="fld"><span class="lbl">Giờ đánh</span><input type="datetime-local" data-save="reg" data-key="at" value="${dt}"></label>
    <label class="fld"><span class="lbl">Địa điểm (không bắt buộc)</span><input data-save="reg" data-key="place" maxlength="60" value="${esc(r.place||"")}" placeholder="Ví dụ: Sân Kỳ Hòa"></label>
    <div class="form f3"><label class="fld"><span class="lbl">Số chỗ</span><input type="number" min="1" inputmode="numeric" data-save="reg" data-key="max" value="${+r.max||""}" placeholder="Không giới hạn"></label>
    <label class="fld"><span class="lbl">Khóa hủy trước (giờ)</span><input type="number" min="0" inputmode="numeric" data-save="reg" data-key="lockH" value="${r.lockH??2}"></label></div>
    <div class="lab" style="margin:8px 0 4px"><span class="lbl">Đã đăng ký ${R.conf.length}${R.wait.length?` · chờ ${R.wait.length}`:""}</span>${R.all.length?`<button class="lnk" data-act="regatt">Điểm danh theo đăng ký</button>`:""}</div>
    ${R.all.length?`<div class="prel">${R.all.map((x,i)=>`<div class="prer${i>=R.max?" done":""}"><b class="no num">${i+1}</b><span class="pm">${nm(x)}${i>=R.max?` <small>· chờ</small>`:""}<small>${hm(x.at)} ${dmy(x.at)}${x.by?" · "+esc(x.by):""}</small></span><span class="pb"><button class="ghost danger" data-act="regdel" data-id="${x.id}" aria-label="Bỏ">✕</button></span></div>`).join("")}</div>`:`<small class="rule">Chưa ai đăng ký.</small>`}
    <div class="two" style="margin-top:8px"><button class="line" data-act="regshare">📤 Gửi link đăng ký</button><button class="line" data-act="regadd">+ Thêm người</button></div>
    ${regAddOpen?`<div class="gadd">${pplPick(D,D.players.filter(p=>!R.all.some(x=>x.pid===p.id)),{act:"regaddp",key:"rga"})}</div>`:""}`;
}
let regAddOpen=false;
function approvals(D){
  if(!isAdm()||legacy)return "";
  const L=(S.links||[]).filter(x=>x.status==="pending");if(!L.length)return "";
  return `<section class="card2 apv"><h2>Người chơi chờ duyệt (${L.length})</h2><div class="cb">${L.map(x=>`<div class="refrow"><span class="t"><b>${esc(x.zname||"Người dùng Zalo")}</b><small>${x.pid?`Nhận hồ sơ: <b>${esc(D.pmap.get(x.pid)?.name||"?")}</b>${D.pmap.get(x.pid)?.zuid?" (đã có người nhận)":""}`:`Người mới: <b>${esc(x.newName||"")}</b> · ${x.gender==="F"?"Nữ":"Nam"}`}</small></span><button class="primary" data-act="lnkok" data-id="${x.id}">Duyệt</button><button class="ghost danger" data-act="lnkno" data-id="${x.id}">Từ chối</button></div>`).join("")}</div></section>`;
}

/* ----- Xử lý bấm ----- */
async function zaloAct(act,b,id){
  if(act==="zlogin"){zaloStart();return true}
  if(act==="lnkpick"){lnkPick=lnkPick===id?null:id;render();return true}
  if(act==="lnknew"){lnkNew=!lnkNew;render();return true}
  if(act==="lnkg"){drafts["lnk-g"]=b.dataset.v;render();return true}
  if(act==="lnkcancel"){try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"links/"+authUser.uid))}catch(e){}lnkPick=null;return true}
  if(act==="lnksend"){if(!isZalo(authUser))return true;const zp=zaloProf();
    const el=document.getElementById&&document.getElementById("lnk-name"),nn=String((el&&el.value)||drafts["lnk-name"]||zp.n||"").trim().slice(0,30);
    if(!lnkNew&&!lnkPick){toast("Chạm vào tên của bạn trước.");return true}
    if(lnkNew&&!nn){toast("Nhập tên của bạn.");return true}
    const d={status:"pending",zname:String(zp.n||"").slice(0,40),photo:String(zp.p||"").slice(0,400),at:Date.now()};
    if(lnkNew){d.newName=nn;d.gender=drafts["lnk-g"]==="F"?"F":"M"}else d.pid=lnkPick;
    try{await FB.setDoc(FB.doc(FB.fs,PFX+"links/"+authUser.uid),d);toast("Đã gửi, chờ chủ CLB duyệt")}catch(e){toast("Chưa gửi được, thử lại.")}
    return true}
  if(act==="regin"){const D=derive(),L=S.link;if(!isZalo(authUser)||!L||L.status!=="ok")return true;
    if(regList(D).all.some(x=>x.pid===L.pid)){toast("Bạn đã có trong danh sách.");return true}
    if(regCfg().at&&Date.now()>regCfg().at){toast("Buổi này đã qua giờ đăng ký.");return true}
    try{await FB.setDoc(FB.doc(FB.fs,PFX+"regs/"+D.sid+"_"+authUser.uid),{sid:D.sid,uid:authUser.uid,pid:L.pid,name:D.pmap.get(L.pid)?.name||"",at:Date.now()});toast("Đã đăng ký")}catch(e){toast("Chưa đăng ký được, thử lại.")}
    return true}
  if(act==="regout"){const D=derive();if(!armOr("regout:x"))return true;
    const mine=regList(D).all.find(x=>x.uid===authUser.uid);if(!mine)return true;
    try{await FB.deleteDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id));toast("Đã hủy đăng ký")}catch(e){toast("Đã quá giờ hủy hoặc chưa hủy được.")}
    return true}
  return false;
}
async function zaloAdminAct(act,b,id){
  const D=derive();
  if(act==="regon"){const on=!regOpen();await write(()=>saveCfg({reg:{lockH:2,...regCfg(),on}}),on?"Đã mở đăng ký":"Đã đóng đăng ký");return true}
  if(act==="regadd"){regAddOpen=!regAddOpen;render();return true}
  if(act==="regaddp"){const p=D.pmap.get(id);if(!p)return true;await write(()=>db.collection("regs").doc(D.sid+"_p_"+id).set({sid:D.sid,uid:p.zuid||null,pid:id,name:p.name,at:Date.now(),by:who()}),`Đã thêm ${p.name}`);return true}
  if(act==="regdel"){if(!armOr("regdel:"+id))return true;await write(()=>db.collection("regs").doc(id).delete(),"Đã bỏ khỏi danh sách");return true}
  if(act==="regatt"){const R=regList(D),inS=new Set(R.conf.map(x=>x.pid));if(!armOr("regatt:x"))return true;
    await write(async()=>{for(const p of D.players){const on=inS.has(p.id);if((p.active!==false)!==on)await db.collection("players").doc(p.id).update({active:on})}},`Điểm danh ${inS.size} người theo danh sách đăng ký`);return true}
  if(act==="regshare"){const r=regCfg(),R=regList(D),u=absUrl(pathOf("app",{tab:"san"})),club=(CLUB&&CLUB.name)||D.c.title;
    const txt=`📣 ${club}: mở đăng ký ${D.c.sname||"buổi đánh"}\n🗓 ${regWhen(r.at)}${r.place?`\n📍 ${r.place}`:""}\n✅ Đã đăng ký ${R.conf.length}${+r.max?`/${r.max}`:""} người${+r.max&&R.conf.length>=+r.max?" · hết chỗ, vẫn vào danh sách chờ được":""}\n👉 Bấm link, đăng nhập Zalo để đăng ký:`;
    if(navigator.share){try{await navigator.share({title:"Mở đăng ký",text:txt+"\n",url:u})}catch(x){}return true}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy, dán vào nhóm Zalo nhé.")}catch(x){toast(u)}return true}
  if(act==="lnkok"){const x=(S.links||[]).find(z=>z.id===id);if(!x)return true;
    await write(async()=>{let pid=x.pid;
      if(!pid){const ref=db.collection("players").doc();pid=ref.id;await ref.set({name:x.newName||x.zname||"Người chơi",gender:x.gender==="F"?"F":"M",rating0:2.5,active:false,createdAt:Date.now(),code:"PB-"+String(nextCode()).padStart(3,"0"),zuid:id})}
      else await db.collection("players").doc(pid).update({zuid:id});
      await FB.updateDoc(FB.doc(FB.fs,PFX+"links/"+id),{status:"ok",pid})},"Đã duyệt");return true}
  if(act==="lnkno"){if(!armOr("lnkno:"+id))return true;await write(()=>FB.deleteDoc(FB.doc(FB.fs,PFX+"links/"+id)),"Đã từ chối");return true}
  return false;
}
