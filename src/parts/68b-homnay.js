/* ---------- Tab Hôm nay: chọn giải để điểm danh, người đến muộn, vãng lai xin vào ----------
   Ban tổ chức: chưa chọn giải → danh sách giải hôm nay / 7 ngày tới (điểm danh sớm được), "Đánh nhanh" là lối phụ.
   Người đến muộn: BTC thêm tay (thành viên hoặc người mới) kèm cách trả tiền, vào thẳng giải.
   Vãng lai: quét mã check-in đang hiện trên máy BTC → gửi "Xin vào" (reg.walkin) → BTC duyệt tại bàn như check-in.
   Trả chỗ: người đã đăng ký mà vắng không giữ chỗ; người chờ chỗ / vãng lai đã có mặt được vào. */
let hnQuick=false,lateOpen=null,wkReq=null;
const hnList=()=>schedUp().filter(x=>x.st!=="draft"&&x.st!=="cancel"&&x.st!=="done"&&x.at&&x.at<Date.now()+7*864e5).sort((a,b)=>a.at-b.at).slice(0,6);
const hnWalkOn=X=>!!X&&X.walkin!==false;
const hnPayFirst=X=>!!X&&X.payFirst!==false;
// Danh sách ở sân: người giữ chỗ + người chờ chỗ / vãng lai đã có mặt hoặc đang xin vào
function ckList(D,X){const R=withX(X,()=>regList(D));return [...R.conf,...R.wait.filter(r=>r.arrived||r.ci)]}
const hnDays=t=>Math.round((new Date(t).setHours(0,0,0,0)-new Date().setHours(0,0,0,0))/864e5);

function hnPick(D){
  const L=hnList(),now=Date.now();
  let h=`<section class="hnhd"><small>HÔM NAY · ${esc(dowVN(now)).toUpperCase()} ${dmy(now).slice(0,5)}</small><b>${L.length?"Chọn giải để điểm danh":"Chưa có giải theo lịch"}</b><span>${L.length?"Danh sách đăng ký, tiền và check-in đi theo giải bạn chọn.":"Tạo giải ở tab Tạo để mở đăng ký, hoặc đánh nhanh không cần đăng ký."}</span></section>`;
  h+=L.map(X=>{const R=withX(X,()=>regList(D)),arr=R.all.filter(r=>r.arrived).length,dd=hnDays(X.at),td=dd<=0;
    return `<div class="hncard${td?" td":""}">${mxDate(X.at)}<span class="t"><small>${td?"HÔM NAY":dd===1?"NGÀY MAI":`CÒN ${dd} NGÀY`} · ${esc(xTime(X))}</small><b>${esc(xName(X))}</b><span>${esc(xFmt(X))} · ${R.conf.length}${R.max<999?`/${R.max}`:""} đăng ký${R.wait.length?` · chờ ${R.wait.length}`:""}${arr?` · đã tới ${arr}`:""}</span></span><button class="${td?"primary":"line"}" data-act="xprep" data-id="${esc(X.id)}">${td?"Điểm danh":"Điểm danh sớm"}</button></div>`}).join("");
  return h+`<button class="btn-line" data-act="hnquick">⚡ Đánh nhanh · không cần đăng ký</button>`;
}
// Chọn giải hiện ở tab Hôm nay thay cho form giải nhanh (chỉ khi chưa đánh trận nào)
const hnShowPick=D=>{xAutoPrep(D);return hnPickOk(D)};
const hnPickOk=D=>isAdm()&&!legacy&&!xCur()&&phaseOf(D)!=="live"&&!D.SM.length&&!hnQuick&&hnList().length>0;

/* ----- Thanh tuỳ chọn của giải ở thẻ check-in: nhận vãng lai, khách trả trước ----- */
function hnOpts(X){
  const b=(k,on,l)=>`<button class="hnopt${on?" on":""}" data-act="hnopt" data-k="${k}" data-id="${esc(X.id)}" aria-pressed="${on}"><i aria-hidden="true">${on?"✓":""}</i>${l}</button>`;
  return `<div class="hnopts">${b("walkin",hnWalkOn(X),"Nhận vãng lai")}${b("payFirst",hnPayFirst(X),"Khách trả trước")}</div>`;
}

/* ----- BTC thêm người đến muộn ----- */
function hnLate(D){
  if(!lateOpen||!canWrite)return "";
  const X=schedById(lateOpen);if(!X){lateOpen=null;return ""}
  const have=new Set((S.regs||[]).filter(r=>r.sid===X.id&&!r.cancel&&r.pid).map(r=>r.pid));
  const q=noAcc(String(val("late-q",""))).toLowerCase().trim(),pick=drafts["late-pid"]||"";
  const M=D.players.filter(p=>!have.has(p.id)&&(!q||noAcc(p.name).toLowerCase().includes(q))).sort((a,b)=>String(a.name).localeCompare(String(b.name),"vi")).slice(0,q?12:8);
  const isNew=!pick,pay=drafts["late-pay"]||"cash",pf=hnPayFirst(X)&&isNew;
  const k=withX(X,()=>feeOf(isNew?{guest:true}:{pid:pick}));
  const seg=(key,v,l,dis)=>`<button data-act="hnset" data-k="${key}" data-v="${v}" aria-pressed="${(drafts[key]||({"late-pay":"cash","late-g":"M","late-lv":"3.0"})[key])===v}"${dis?" disabled":""}>${l}</button>`;
  let h=`<div class="mxdim" data-act="hnlatex"></div><div class="mxsheet hnsheet" role="dialog" aria-label="Thêm người đến muộn"><span class="grab"></span>
    <b class="mxh">Người đến muộn</b><span class="t2">${esc(xName(X))} · vào thẳng giải, ghi tiền luôn</span>
    <label class="srch"><span class="sr">Tìm thành viên</span><input id="late-q" data-draft="late-q" data-live="1" type="search" placeholder="Tìm thành viên CLB…" value="${esc(val("late-q",""))}"></label>
    <div class="attc">${M.map(p=>`<button class="ac${pick===p.id?" on":""}" data-act="hnset" data-k="late-pid" data-v="${pick===p.id?"":esc(p.id)}" aria-pressed="${pick===p.id}">${pick===p.id?"✓ ":""}${esc(p.name)}</button>`).join("")||`<span class="t2">Không thấy thành viên “${esc(val("late-q",""))}”.</span>`}</div>`;
  if(isNew)h+=`<span class="mxsec">Hoặc người mới (khách)</span>
    <label class="fld"><span class="lbl">Tên</span><input id="late-nm" data-draft="late-nm" maxlength="40" placeholder="Tên người chơi" value="${esc(val("late-nm",""))}"></label>
    <div class="two"><div class="fld"><span class="lbl">Giới tính</span><div class="mxseg sm">${seg("late-g","M","Nam")}${seg("late-g","F","Nữ")}</div></div>
    <div class="fld"><span class="lbl">Trình (tự nhận)</span><div class="mxseg sm">${["2.5","3.0","3.5","4.0","4.5"].map(v=>seg("late-lv",v,v)).join("")}</div></div></div>`;
  h+=`<span class="mxsec">Lệ phí ${k>0?kVND(k):"· miễn phí"}</span>`;
  if(k>0)h+=`<div class="mxseg">${seg("late-pay","cash","Tiền mặt")}${seg("late-pay","ck","Chuyển khoản")}${seg("late-pay","no","Ghi nợ",pf)}</div>${pf?`<span class="t2">Khách ngoài CLB phải trả trước khi vào sân (tắt ở thẻ check-in).</span>`:""}`;
  if(errs.late)h+=`<p class="err">${esc(errs.late)}</p>`;
  h+=`<button class="primary wide" data-act="hnlateadd" data-id="${esc(X.id)}">Thêm vào giải${k>0&&!(pay==="no"&&!pf)?` · đã thu ${kVND(k)}`:""}</button><button class="ghost wide" data-act="hnlatex">Đóng</button></div>`;
  return h;
}
async function hnLateAdd(D,X){
  const pick=drafts["late-pid"]||"",nm=String(val("late-nm","")).trim().slice(0,40),isNew=!pick;
  if(isNew&&!nm){errs.late="Chọn một thành viên hoặc nhập tên người mới.";render();return}
  const k=withX(X,()=>feeOf(isNew?{guest:true}:{pid:pick}));let pay=k>0?(drafts["late-pay"]||"cash"):"free";
  if(pay==="no"&&isNew&&hnPayFirst(X)){errs.late="Khách ngoài CLB phải trả trước khi vào sân.";render();return}
  delete errs.late;const now=Date.now(),by=who(),ok=pay==="cash"||pay==="ck";
  const r={sid:X.id,uid:"btc",name:isNew?nm:(D.pmap.get(pick)?.name||""),at:now,walkin:true,addBy:by,arrived:true,arrBy:"btc",arrivedAt:now,pay:ok?"ok":"none",...(ok?{okAt:now,okBy:by,payBy:pay}:{})};
  if(isNew)Object.assign(r,{guest:true,gender:drafts["late-g"]==="F"?"F":"M",lv:drafts["late-lv"]||"3.0"});else r.pid=pick;
  await write(async()=>{const ref=db.collection("regs").doc();await ref.set(r);const pid=await ckAttend(D,{...r,id:ref.id});
    if(ok&&pid&&cfg().schedId===X.id)await savePay(D.sid,nx=>{nx.paid[pid]=true})},`Đã thêm ${r.name} vào ${xName(X)}`);
  ["late-q","late-nm","late-pid","late-pay"].forEach(x=>delete drafts[x]);lateOpen=null;render();
}

/* ----- Người chơi: chưa đăng ký mà quét mã ở sân → xin vào ----- */
function wkSheet(D){
  if(!wkReq||!MINI)return "";
  const X=schedById(wkReq.x);if(!X){wkReq=null;return ""}
  const linked=S.link&&S.link.status==="ok",me=linked?D.pmap.get(S.link.pid):null,P=zaloProf();
  const R=withX(X,()=>regList(D)),present=R.all.filter(r=>r.arrived).length,full=R.max<999&&present>=R.max;
  const k=withX(X,()=>feeOf(me?{pid:me.id}:{guest:true})),G=isG(cfg())&&cfg().schedId===X.id&&(cfg().giai||{}).locked;
  const seg=(key,v,l)=>`<button data-act="hnset" data-k="${key}" data-v="${v}" aria-pressed="${(drafts[key]||({"wk-g":"M","wk-lv":"3.0"})[key])===v}">${l}</button>`;
  let h=`<div class="mxdim" data-act="wkx"></div><div class="mxsheet hnsheet" role="dialog" aria-label="Xin vào chơi"><span class="grab"></span>
    <b class="mxh">Xin vào chơi</b><span class="t2">${esc(xName(X))} · bạn chưa đăng ký giải này. Gửi yêu cầu, ban tổ chức duyệt tại bàn.</span>`;
  if(me)h+=`<div class="mxcard muted"><b>${esc(me.name)}</b><span>Thành viên ${esc(CLUB?.name||"")}</span></div>`;
  else h+=`<label class="fld"><span class="lbl">Tên của bạn</span><input id="wk-nm" data-draft="wk-nm" maxlength="40" autocomplete="name" value="${esc(val("wk-nm",P.n||""))}"></label>
    <div class="two"><div class="fld"><span class="lbl">Giới tính</span><div class="mxseg sm">${seg("wk-g","M","Nam")}${seg("wk-g","F","Nữ")}</div></div>
    <div class="fld"><span class="lbl">Trình (tự nhận)</span><div class="mxseg sm">${["2.5","3.0","3.5","4.0","4.5"].map(v=>seg("wk-lv",v,v)).join("")}</div></div></div>`;
  h+=`<div class="mxkv"><span>Lệ phí</span><b>${k>0?kVND(k):"Miễn phí"}</b></div>${k>0&&!me&&hnPayFirst(X)?`<span class="t2">Trả trước khi vào sân: tiền mặt hoặc chuyển khoản tại bàn ban tổ chức.</span>`:""}
    <div class="mxkv"><span>Chỗ</span><b>${full?"Đã đủ người · bạn vào hàng chờ":R.max<999?`Còn ${R.max-present} chỗ`:"Còn chỗ"}</b></div>`;
  if(G)h+=`<span class="t2">Giải cặp đang chạy: bạn chỉ vào được khi có cặp vắng cần người thay.</span>`;
  if(errs.wk)h+=`<p class="err">${esc(errs.wk)}</p>`;
  return h+`<button class="primary wide" data-act="wkgo">Gửi yêu cầu xin vào</button><button class="ghost wide" data-act="wkx">Để sau</button></div>`;
}
async function wkGo(D){
  const X=schedById(wkReq&&wkReq.x);if(!X||!authUser)return;
  const linked=S.link&&S.link.status==="ok",nm=String(val("wk-nm",zaloProf().n||"")).trim().slice(0,40);
  if(!linked&&!nm){errs.wk="Nhập tên để ban tổ chức gọi bạn.";render();return}
  const r={sid:X.id,uid:authUser.uid,at:Date.now(),pay:"none",walkin:true,ci:Date.now(),ciCode:wkReq.c,zid:myZid()};
  if(linked)Object.assign(r,{pid:S.link.pid,guest:false,name:D.pmap.get(S.link.pid)?.name||nm});
  else Object.assign(r,{guest:true,name:nm,gender:drafts["wk-g"]==="F"?"F":"M",lv:drafts["wk-lv"]||"3.0"});
  try{await FB.setDoc(FB.doc(FB.fs,PFX+"regs/"+X.id+"_"+authUser.uid),r);delete errs.wk;wkReq=null;toast("Đã gửi · chờ ban tổ chức duyệt tại bàn");go("app",{tab:"dk",x:X.id})}
  catch(e){errs.wk="Chưa gửi được: mã đã đổi hoặc giải không nhận vãng lai. Quét lại mã đang hiện trên máy ban tổ chức.";render()}
}

async function hnAct(act,b,id){
  if(act==="hnquick"){hnQuick=true;render();return true}
  if(act==="hnquickx"){hnQuick=false;render();return true}
  if(act==="hnset"){drafts[b.dataset.k]=b.dataset.v;delete errs.late;delete errs.wk;render();return true}
  if(act==="wkx"){wkReq=null;delete errs.wk;render();return true}
  if(act==="wkgo"){await wkGo(derive());return true}
  if(!canWrite)return false;
  if(act==="hnunpick"){hnQuick=false;await write(()=>saveCfg({schedId:null}),"Chọn lại giải ở tab Hôm nay");return true}
  if(act==="hnlate"){lateOpen=id;delete errs.late;render();return true}
  if(act==="hnlatex"){lateOpen=null;delete errs.late;render();return true}
  if(act==="hnlateadd"){const X=schedById(id);if(X)await hnLateAdd(derive(),X);return true}
  if(act==="hnopt"){const X=schedById(id),k=b.dataset.k;if(!X||!["walkin","payFirst"].includes(k))return true;
    const on=k==="walkin"?!hnWalkOn(X):!hnPayFirst(X);
    await write(()=>db.collection("sched").doc(X.id).update({[k]:on}),k==="walkin"?(on?"Nhận vãng lai xin vào":"Không nhận vãng lai"):(on?"Khách ngoài CLB trả trước khi vào sân":"Khách được trả sau"));return true}
  return false;
}
