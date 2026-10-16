/* ---------- events ---------- */
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.draft;if(k){drafts[k]=e.target.value;if(errs[k.slice(3)])delete errs[k.slice(3)];if(k==="q"||k==="hq"||k==="cq")render()}});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.me){setMe(t.value);return}
  if(t.dataset&&t.dataset.photo){const f=t.files&&t.files[0],id=t.dataset.photo;t.value="";if(!f||!canWrite)return;
    if(!/^image\//.test(f.type)){toast("File này không phải ảnh.");return}
    shrink(f).then(d=>write(()=>db.collection("players").doc(id).update({photo:d}),"Đã cập nhật ảnh")).catch(()=>toast("Không đọc được ảnh này, thử ảnh khác."));return}
  if(t.dataset&&t.dataset.pick){t.checked?pickSel.add(t.dataset.pick):pickSel.delete(t.dataset.pick);render();return}
  const s=t.dataset&&t.dataset.save;if(!s)return;
  if(s==="gprize"){if(!canWrite)return;const i=+t.dataset.i,pz=[...(cfg().giai?.prizes||[0,0,0])];pz[i]=Math.max(0,Number(t.value)||0);write(()=>saveG({prizes:pz}).then(()=>delete drafts["gz-"+i]));return}
  if(s==="name"){const v=t.value.trim();if(!v){toast("Tên không được để trống.");return}
    write(()=>db.collection("players").doc(t.dataset.id).update({name:v}).then(()=>{delete drafts[t.dataset.draft];S.everWrote=true}))}
  else if(s==="rating0")write(()=>db.collection("players").doc(t.dataset.id).update({rating0:Number(t.value)}).then(()=>S.everWrote=true));
  else if(s==="cfg"){const k=t.dataset.key;let v=t.value;
    if(["court","water","ball","other"].includes(k)){const n=Math.max(0,Number(v)||0);write(()=>saveCfg({costs:{[k]:n}}).then(()=>delete drafts["cf-"+k]))}
    else if(k==="keo")write(()=>saveCfg({keo:v==="1"}));
    else if(k==="thr")write(()=>saveCfg({thr:Number(v)}));
    else if(k==="title"){v=v.trim()||DEF.title;write(()=>saveCfg({title:v}).then(()=>delete drafts["cf-title"]))}
    else{const n=Math.max(0,Number(v)||0);write(()=>saveCfg({[k]:n}).then(()=>delete drafts["cf-"+k]))}}
});
document.addEventListener("click",async e=>{
  const tb=e.target.closest("[data-tab]");if(tb){const t=tb.dataset.tab;if(t==="home"){go("home");return}
    try{localStorage.setItem("pb-tab",t)}catch(x){}go("app",{tab:t});return}
  const gl=e.target.closest("[data-go]");if(gl){e.preventDefault();go(gl.dataset.go,{sid:gl.dataset.id,tab:gl.dataset.t});return}
  const b=e.target.closest("[data-act]");if(!b)return;
  const act=b.dataset.act,id=b.dataset.id;
  if(act==="login"){
    const pin=String(drafts.pin||"").trim();if(!pin){errs.pin="Nhập PIN trước.";render();return}
    delete errs.pin;
    try{
      const u=authUser||(await FB.signInAnonymously(FB.auth)).user;
      await FB.setDoc(FB.doc(FB.fs,PFX+"editors/"+u.uid),{pin,at:Date.now()});
      await refreshRole();canWrite=true;delete drafts.pin;toast("Đã mở quyền nhập tỉ số trên máy này.");if(route==="clogin"){go("app",{tab:"san"});return}
    }catch(x){
      if(authUser&&await isEditor(authUser.uid)){canWrite=true;delete drafts.pin}
      else errs.pin=x&&x.code==="permission-denied"?"Sai PIN.":"Không kết nối được, thử lại.";
    }
    render();return}
  if(act==="meclr"){setMe(null);return}
  if(act==="logout"){try{await FB.signOut(FB.auth)}catch(x){}canWrite=false;ROLE=null;S.rootEditor=false;watchAdmin();render();return}
  if(act==="glogin"){if(inApp()){toast("Mở trang bằng Chrome hoặc Safari để đăng nhập Google.");return}
    const pr=new FB.GoogleAuthProvider();try{await FB.signInWithPopup(FB.auth,pr)}catch(x){const c=(x&&x.code)||"";if(/popup-blocked|operation-not-supported|web-storage/.test(c)){try{try{sessionStorage.setItem("pb-rd","1")}catch(z){}await FB.signInWithRedirect(FB.auth,pr)}catch(y){toast("Chưa đăng nhập được, thử lại.")}}else if(!/popup-closed|cancelled-popup/.test(c))toast("Chưa đăng nhập được: "+c)}return}
  if(act==="copy"){const txt=summaryText(derive());
    try{await navigator.clipboard.writeText(txt);toast("Đã copy, dán vào nhóm Zalo nhé.")}
    catch(x){const box=$("#copybox");box.hidden=false;box.value=txt;box.focus();box.select();toast("Chọn sẵn rồi, bấm giữ để copy.")}
    return}
  if(act==="bxf"){bxF=b.dataset.v;render();return}
  if(act==="hf"){hF=b.dataset.v;render();return}
  if(act==="qv"){qView=b.dataset.v==="so"?"so":"buoi";render();return}
  if(act==="payx"){if(b.classList.contains("sheetbg")&&e.target.closest("[data-stop]")&&!e.target.closest('[data-act="payx"]:not(.sheetbg)'))return;payOpen=null;showSheet();return}
  if(act==="pay"){payOpen={sid:Number(b.dataset.sid),name:b.dataset.n,k:Number(b.dataset.k)};showSheet();return}
  if(act==="saveqr"){try{const r=await fetch(b.dataset.v),bl=await r.blob(),fn=`QR-${b.dataset.n.replace(/\s+/g,"-")}.png`,file=new File([bl],fn,{type:bl.type||"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"Mã QR chuyển khoản"})}catch(x){}return}
      const u=URL.createObjectURL(bl),a=document.createElement("a");a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast("Đã lưu mã QR")}
    catch(x){window.open(b.dataset.v,"_blank")}return}
  if(act==="cp"){try{await navigator.clipboard.writeText(b.dataset.v);toast("Đã copy: "+b.dataset.v)}catch(x){toast(b.dataset.v)}return}
  if(act==="paid"){if(!canWrite)return;const sid=Number(id),h=S.hist.find(z=>z.sid===sid);if(!h)return;const pd={...(h.paid||{})};pd[b.dataset.p]=!pd[b.dataset.p];
    write(()=>db.doc("app/hist-"+sid).update({paid:pd}),pd[b.dataset.p]?"Đã đánh dấu đã nhận tiền":"Đã bỏ đánh dấu");return}
  if(act==="share"||act==="copylink"){const u=shareUrl(id),D=derive(),x=sessList(D).find(z=>String(z.sid)===String(id)),txt=x?(x.snap?.type==="giai"?giaiShare(D,x):shareText(D,x)):`Tổng kết buổi #${id}`;
    if(act==="share"&&navigator.share){try{await navigator.share({title:`Tổng kết buổi #${id}`,text:txt+"\n",url:u})}catch(x){}return}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy tin nhắn kèm link, dán vào nhóm Zalo nhé.")}catch(x){toast(u)}return}
  if(act==="sess"){const k="s-"+id;editing.has(k)?editing.delete(k):editing.add(k);render();return}
  if(act==="copysess"){const D=derive(),x=sessList(D).find(z=>String(z.sid)===String(id));if(!x)return;
    const m=x.snap?.money,L=[`TỔNG KẾT BUỔI #${x.sid} – ${dmy(x.at)}`];
    if(m)L.push(`Quỹ kèo: ${fmtK(m.fund)} | Chi: ${fmtK(m.cost)} | ${m.gap>=0?"Dư":"Thiếu"}: ${fmtK(Math.abs(m.gap))}`);
    L.push("","BẢNG XẾP HẠNG");x.rows.forEach((r,i)=>L.push(`${i+1}. ${r.name} — ${r.w}T-${r.l}B, HS ${r.pf-r.pa>0?"+":""}${r.pf-r.pa}${x.snap?`, phải đóng ${fmtK(r.pay)}`:""}`));
    const txt=L.join("\n");try{await navigator.clipboard.writeText(txt);toast("Đã copy tổng kết buổi.")}catch(e){toast("Không copy được trên trình duyệt này.")}return}
  if(await platformAct(act,id,b))return;
  if(!canWrite)return;
  if(act==="migrate"){if(!legacy||!isGoogle(authUser)||!S.rootEditor){toast("Cần đăng nhập Google và nhập PIN trước.");return}if(!armOr("migrate:x"))return;try{await migrate()}catch(x){S.migMsg="Chuyển chưa xong ("+((x&&x.code)||"lỗi")+"). Kiểm tra luật Firestore mới đã xuất bản chưa rồi thử lại.";render()}return}
  if(act==="bsave"&&isAdm()){const code=val("bk-code",CLUB?.bank?.code||"mb"),bk=BANKS.find(z=>z[0]===code)||BANKS[0],acc=String(val("bk-acc",CLUB?.bank?.acc||"")).replace(/\s/g,""),hd=noAcc(val("bk-holder",CLUB?.bank?.holder||""));
    if(!/^\d{6,19}$/.test(acc)){toast("Số tài khoản chỉ gồm 6–19 chữ số.");return}if(!hd){toast("Nhập tên chủ tài khoản.");return}
    write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{bank:{code:bk[0],bin:bk[1],name:bk[2],acc,holder:hd}}).then(()=>{["bk-code","bk-acc","bk-holder"].forEach(k=>delete drafts[k])}),"Đã lưu ngân hàng");return}
  if(act==="pub"&&isAdm()){write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{public:b.dataset.v==="1"}),"Đã lưu");return}
  if(act==="pinset"&&isAdm()){const p=String(drafts.newpin||"").trim();if(p.length<4){toast("PIN cần ít nhất 4 ký tự.");return}write(()=>FB.setDoc(FB.doc(FB.fs,PFX+"secret/pin"),{value:p}).then(()=>delete drafts.newpin),"Đã đặt PIN trọng tài");return}
  if(act==="edclear"&&isAdm()){if(!armOr("edclear:x"))return;write(async()=>{for(const e of S.editors||[])await FB.deleteDoc(FB.doc(FB.fs,PFX+"editors/"+e.id))},"Đã thu hồi quyền các máy dùng PIN");return}
  if(act==="mrm"&&isAdm()){if(!armOr("mrm:"+id))return;write(()=>FB.deleteDoc(FB.doc(FB.fs,PFX+"members/"+id)),"Đã gỡ khỏi ban tổ chức");return}
  if(act==="inv"&&isAdm()){const role=b.dataset.v==="admin"?"admin":"scorer",tok=Array.from(crypto.getRandomValues(new Uint8Array(9))).map(x=>x.toString(16).padStart(2,"0")).join("");
    await write(()=>FB.setDoc(FB.doc(FB.fs,PFX+"invites/"+tok),{role,exp:Date.now()+7*864e5,by:authUser.uid,at:Date.now()}),"Đã tạo link mời");
    S.invLink={role,url:absUrl(`/${CID}/moi/${tok}`)};render();return}
  if(act==="invshare"&&S.invLink){const t=`Mời bạn vào ban tổ chức ${CLUB?.name||""} (${ROLE_LB[S.invLink.role]}). Mở link bằng Chrome/Safari rồi đăng nhập Google:`;if(navigator.share){try{await navigator.share({title:"Lời mời",text:t,url:S.invLink.url})}catch(x){}}else{try{await navigator.clipboard.writeText(t+"\n"+S.invLink.url);toast("Đã copy lời mời")}catch(x){toast(S.invLink.url)}}return}
  if(await sessionAct(act,id,b,e))return;
  if(act==="cset"&&b.dataset.k!=="fmt"){const k=b.dataset.k,v=b.dataset.v;
    if(cfg()[k]===v)return;const patch={[k]:v};if(k==="gt")patch.gtv=v==="trich"?30:v==="codinh"?200:v==="gop"?20:0;if(k==="thu"&&v==="phi"&&!cfg().phi)patch.phi=50;
    ["cf-gtv","cf-phi"].forEach(x=>delete drafts[x]);write(()=>saveCfg(patch));return}
  if(act==="fmt"||(act==="cset"&&b.dataset.k==="fmt")){const v=b.dataset.v==="giai"?"giai":"xoay";if(derive().SM.length){toast("Buổi đã có trận, không đổi thể thức được.");return}
    if(cfg().fmt===v||(v==="xoay"&&!cfg().fmt))return;
    write(()=>saveCfg({fmt:v,giai:cfg().giai||{pairs:[],prizes:[0,0,0],out:{},locked:false}}),v==="giai"?"Đã chọn thể thức Cặp cố định":"Đã chọn thể thức Xoay cặp");return}
  if(act==="gadd"){const a=String(drafts.gp1||""),bb=String(drafts.gp2||""),P=cfg().giai?.pairs||[];
    if(!a||!bb){errs.gadd="Chọn đủ 2 người.";render();return}
    if(a===bb){errs.gadd="Hai người phải khác nhau.";render();return}
    if(P.length>=GMAX){errs.gadd=`Tối đa ${GMAX} cặp.`;render();return}
    if(P.some(p=>[p.a,p.b].includes(a)||[p.a,p.b].includes(bb))){errs.gadd="Người này đã có cặp.";render();return}
    delete errs.gadd;write(()=>saveG({pairs:[...P,{id:"c"+Date.now().toString(36),a,b:bb}]}).then(()=>{delete drafts.gp1;delete drafts.gp2}),"Đã thêm cặp");return}
  if(act==="gdel"){write(()=>saveG({pairs:(cfg().giai?.pairs||[]).filter(p=>p.id!==id)}),"Đã bỏ cặp");return}
  if(act==="gstart"){const P=cfg().giai?.pairs||[];if(P.length<3){errs.giai="Cần ít nhất 3 cặp.";render();return}delete errs.giai;
    await write(()=>saveG({locked:true,startedAt:Date.now(),out:{}}),"Đã tạo lịch thi đấu");await gFill();return}
  if(act==="gfill"){const n=await gFill();toast(n?`Đã đưa ${n} trận vào sân`:"Chưa đưa được trận nào: sân đã đầy hoặc các cặp còn lại đang đánh.");return}
  if(act==="gout"){if(derive().playing.some(m=>m.giai&&(m.pa===id||m.pb===id))){toast("Cặp này đang trên sân, lưu tỉ số hoặc hủy trận trước.");return}
    if(!armOr("gout:"+id))return;await write(()=>saveG({out:{...(cfg().giai?.out||{}),[id]:true}}),"Đã ghi nhận cặp bỏ giải");await gFill();return}
  if(act==="grest"){const r={...(cfg().giai?.rest||{})};const on=!r[id];if(on)r[id]=true;else delete r[id];await write(()=>saveG({rest:r}),on?"Đã cho cặp này nghỉ":"Cặp đã vào lại");if(!on)await gFill();return}
  if(act==="gin"){const o={...(cfg().giai?.out||{})};delete o[id];write(()=>saveG({out:o}),"Cặp đã quay lại giải");return}
  if(act==="gcancel"){const D=derive();if(D.done.some(m=>m.giai)){toast("Đã có trận xong, không hủy lịch được.");return}
    if(!armOr("gcancel:x"))return;
    await write(async()=>{for(const m of D.playing.filter(m=>m.giai))await db.collection("matches").doc(m.id).delete();await saveG({locked:false})},"Đã hủy lịch, có thể ghép lại cặp");return}
  if(act==="gend"){if(!armOr("gend:x"))return;await endGiai();return}
  if(act==="gmode"){const v=b.dataset.v==="same"?"same":"mix";if(cfg().gmode!==v)write(()=>saveCfg({gmode:v}),v==="same"?"Đã chuyển sang ưu tiên cùng giới":"Đã chuyển sang ưu tiên khác giới");return}
  if(act==="phdel"){write(()=>db.collection("players").doc(id).update({photo:""}),"Đã xóa ảnh");return}
  if(act==="picktoggle"){pickOpen=!pickOpen;render();return}
  if(act==="pickall"){const away=S.players.filter(p=>p.active===false);if(pickSel.size===away.length)pickSel.clear();else away.forEach(p=>pickSel.add(p.id));render();return}
  if(act==="pickadd"){const ids=[...pickSel];if(!ids.length){toast("Chọn ít nhất một người.");return}
    await write(async()=>{for(const i of ids)await db.collection("players").doc(i).update({active:true});S.everWrote=true;pickSel.clear();pickOpen=false},`Đã thêm ${ids.length} người vào buổi`);return}
  if(act==="courts"){const n=Math.min(12,Math.max(1,cfg().courts+Number(b.dataset.d)));write(()=>saveCfg({courts:n}))}
  else if(act==="gen")generate();
  else if(act==="add"){
    const lines=String(drafts.bulk||"").split(/\n/).map(x=>x.trim()).filter(Boolean);
    if(!lines.length){toast("Nhập ít nhất một tên.");return}
    const lock=await db.doc("app/lock").acquire({holder,ttlMs:8000});
    if(!lock.acquired){toast("Có người khác đang cập nhật, thử lại sau vài giây.");return}
    const have=new Map(S.players.map(p=>[p.name.toLowerCase(),p]));const lvl=Number(drafts.lvl||2.5);let t=Date.now(),added=0,back=0;
    let n=nextCode();
    await write(async()=>{
      await assignCodes();n=nextCode();
      for(const line of lines){const parts=line.split("|").map(x=>x.trim());const nmv=parts[0];if(!nmv)continue;let du="",gd=drafts.gnd||"M";for(const x of parts.slice(1)){const l=x.toLowerCase();if(["nữ","nu","f","female"].includes(l))gd="F";else if(["nam","m","male"].includes(l))gd="M";else if(x)du=x}
        const ex=have.get(nmv.toLowerCase());
        if(ex){if(ex.active===false){await db.collection("players").doc(ex.id).update({active:true});back++}continue}
        const doc={name:nmv,rating0:lvl,gender:gd,active:true,createdAt:t++,code:"PB-"+String(n++).padStart(3,"0")};if(du)doc.duprId=du;
        await db.collection("players").doc().set(doc);have.set(nmv.toLowerCase(),doc);added++}
      S.everWrote=true;delete drafts.bulk},null);
    toast(added||back?`Đã thêm ${added} người mới${back?`, ${back} người cũ vào buổi`:""}`:"Các tên này đã có mặt.")}
  else if(act==="codes"){
    const lock=await db.doc("app/lock").acquire({holder,ttlMs:8000});
    if(!lock.acquired){toast("Có người khác đang cập nhật, thử lại sau vài giây.");return}
    write(()=>assignCodes().then(()=>S.everWrote=true),"Đã cấp mã")}
  else if(act==="checkin")write(()=>db.collection("players").doc(id).update({active:true}),"Đã thêm vào buổi")
  else if(act==="checkout"){if(derive().playing.some(m=>[...m.a,...m.b].includes(id))){toast("Người này đang trên sân, lưu tỉ số trước.");return}
    write(()=>db.collection("players").doc(id).update({active:false}),"Đã cho nghỉ")}
  else if(act==="pedit"){editing.add("p-"+id);render()}
  else if(act==="pedit-x"){editing.delete("p-"+id);delete errs["p-"+id];["nm-","du-","rt-"].forEach(k=>delete drafts[k+id]);render()}
  else if(act==="pedit-save"){const p=S.players.find(x=>x.id===id);
    const nmv=String(val("nm-"+id,p.name)).trim(),du=String(val("du-"+id,p.duprId||"")).trim(),rt=Number(val("rt-"+id,p.rating0??3)),gd=val("gd-"+id,p.gender||"M");
    if(!nmv){errs["p-"+id]="Tên không được để trống.";render();return}
    if(S.players.some(x=>x.id!==id&&x.name.toLowerCase()===nmv.toLowerCase())){errs["p-"+id]="Đã có người trùng tên, thêm họ hoặc biệt danh để phân biệt.";render();return}
    delete errs["p-"+id];
    await write(()=>db.collection("players").doc(id).update({name:nmv,duprId:du,rating0:rt,gender:gd}).then(()=>{S.everWrote=true;editing.delete("p-"+id);["nm-","du-","rt-","gd-"].forEach(k=>delete drafts[k+id])}),"Đã lưu")}
  else if(act==="pdel"){if(derive().playing.some(m=>[...m.a,...m.b].includes(id))){toast("Người này đang trên sân, lưu hoặc hủy trận trước.");return}
    if(!armOr("pdel:"+id))return;write(()=>db.collection("players").doc(id).delete(),"Đã xóa người chơi")}
  else if(act==="mdel"){if(!armOr("mdel:"+id))return;write(()=>db.collection("matches").doc(id).delete(),"Đã xóa trận")}
  else if(act==="sdel"){if(!armOr("sdel:"+id))return;const sid=Number(id);
    await write(async()=>{for(const d of (await db.collection("matches").where("session",sid).get()).docs)await db.collection("matches").doc(d.id).delete();
      for(const d of (await db.collection("batches").where("session",sid).get()).docs)await db.collection("batches").doc(d.id).delete();delete S.pm[sid];
      if(S.hist.some(h=>h.sid===sid))await db.doc("app/hist-"+sid).delete();editing.delete("s-"+sid)},`Đã xóa buổi #${sid}`)}
  else if(act==="toggle"){const p=S.players.find(p=>p.id===id);write(()=>db.collection("players").doc(id).update({active:p.active===false}))}
  else if(act==="del")write(()=>db.collection("players").doc(id).delete(),"Đã xóa");
  else if(act==="cancel")write(()=>db.collection("matches").doc(id).delete(),"Đã hủy trận");
  else if(act==="save"||act==="edit-save"){
    const m=S.matches.find(x=>x.id===id);const pre=act==="save"?["sa-","sb-"]:["ea-","eb-"];
    const a=Number(val(pre[0]+id,act==="save"?"":m.sa)),bb=Number(val(pre[1]+id,act==="save"?"":m.sb));
    const msg=(val(pre[0]+id,"")===""&&act==="save")||(val(pre[1]+id,"")===""&&act==="save")?"Nhập điểm hai đội.":(m.giai?validG(a,bb):validScore(a,bb,cfg().target));
    if(msg){errs[id]=msg;render();return}
    delete errs[id];
    await write(()=>db.collection("matches").doc(id).update(act==="save"?{sa:a,sb:bb,status:"done",doneAt:Date.now()}:{sa:a,sb:bb}).then(()=>{S.everWrote=true;delete drafts[pre[0]+id];delete drafts[pre[1]+id];editing.delete(id)}),act==="save"?"Đã lưu tỉ số":"Đã sửa tỉ số");
    if(m.giai&&act==="save"&&!errs[id]){if(m.status!=="done")Object.assign(m,{sa:a,sb:bb,status:"done",doneAt:Date.now()});await new Promise(r=>setTimeout(r,60));await gFill()}}
  else if(act==="edit"){editing.add(id);render()}
  else if(act==="edit-x"){editing.delete(id);delete errs[id];render()}
  else if(act==="reset"||act==="chot"){if(!armOr("chot:x"))return;await chotBuoi()}
});

