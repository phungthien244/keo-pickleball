/* ---------- events ---------- */
document.addEventListener("compositionend",e=>{const t=e.target,k=t&&t.dataset&&t.dataset.draft;if(k&&(t.dataset.live||LIVEQ.includes(k))){drafts[k]=t.value;render()}});
document.addEventListener("input",e=>{const k=e.target.dataset&&e.target.dataset.draft;if(k){drafts[k]=e.target.value;if(errs[k.slice(3)])delete errs[k.slice(3)];if(k==="q"||k==="hq"||k==="cq"||e.target.dataset.live)render()}});
document.addEventListener("change",e=>{
  const t=e.target;
  if(t.dataset&&t.dataset.me){setMe(t.value);return}
  if(t.dataset&&t.dataset.gsphoto){const f=t.files&&t.files[0];t.value="";if(!f)return;if(!/^image\//.test(f.type)){toast("File này không phải ảnh.");return}
    shrink(f).then(d=>{gsPhoto=d;delete errs.gs;render()}).catch(()=>toast("Không đọc được ảnh này, thử ảnh khác."));return}
  if(t.dataset&&t.dataset.myphoto){const f=t.files&&t.files[0];t.value="";const pid=myPid();if(!f||!pid)return;
    if(!/^image\//.test(f.type)){toast("File này không phải ảnh.");return}
    shrink(f).then(d=>FB.updateDoc(FB.doc(FB.fs,PFX+"players/"+pid),{photo:d})).then(()=>toast("Đã đổi ảnh đại diện")).catch(()=>toast("Chưa đổi được ảnh, thử ảnh khác."));return}
  if(t.dataset&&t.dataset.photo){const f=t.files&&t.files[0],id=t.dataset.photo;t.value="";if(!f||!canWrite)return;
    if(!/^image\//.test(f.type)){toast("File này không phải ảnh.");return}
    shrink(f).then(d=>write(()=>db.collection("players").doc(id).update({photo:d}),"Đã cập nhật ảnh")).catch(()=>toast("Không đọc được ảnh này, thử ảnh khác."));return}
  if(t.dataset&&t.dataset.clogo){const f=t.files&&t.files[0];t.value="";if(!f||!isAdm())return;
    if(!/^image\//.test(f.type)){toast("File này không phải ảnh.");return}
    shrink(f).then(d=>write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{logo:d}),"Đã cập nhật ảnh CLB")).catch(()=>toast("Không đọc được ảnh này, thử ảnh khác."));return}
  if(t.dataset&&t.dataset.pick){t.checked?pickSel.add(t.dataset.pick):pickSel.delete(t.dataset.pick);render();return}
  const s=t.dataset&&t.dataset.save;if(!s)return;
  if(s==="cname"){if(!canWrite)return;const i=+t.dataset.i,c=cfg(),L=[...(c.cnames||[])];while(L.length<i)L.push("");L[i-1]=String(t.value||"").trim().slice(0,12);
    write(()=>saveCfg({cnames:L}).then(()=>delete drafts["cn-"+i]),L[i-1]?`Đã đặt tên sân ${L[i-1]}`:`Sân thứ ${i} dùng tên mặc định`);return}
  if(s==="gprize"){if(!canWrite)return;const i=+t.dataset.i,pz=[...(cfg().giai?.prizes||[0,0,0])];pz[i]=Math.max(0,Number(t.value)||0);write(()=>saveG({prizes:pz}).then(()=>delete drafts["gz-"+i]));return}
  if(s==="reg"){if(!canWrite)return;const k=t.dataset.key,r={...regCfg()};let v=t.value;
    if(k==="at"||k==="deadline"){const ms=v?new Date(v).getTime():0;r[k]=Number.isFinite(ms)?ms:0}
    else if(k==="end")r.end=/^\d{1,2}:\d{2}$/.test(v)?v:"";
    else if(k==="place")r.place=String(v||"").trim().slice(0,60);
    else if(k==="note")r.note=String(v||"").trim().slice(0,300);
    else if(k==="map"){v=String(v||"").trim();if(v&&!/^https:\/\/[^\s]+$/.test(v)){toast("Link bản đồ cần bắt đầu bằng https://");return}r.map=v.slice(0,300)}
    else if(k==="lvMin"||k==="lvMax"){const n=Math.round((Number(v)||0)*2)/2;r[k]=n?String(Math.min(8,Math.max(1,n))):""}
    else if(k==="feeG"&&String(v).trim()==="")r.feeG="";
    else r[k]=Math.max(0,Math.floor(Number(v)||0));
    r.lockAt=r.at?r.at-(+r.lockH||0)*3600e3:0;write(()=>saveCfg({reg:r}));return}
  if(s==="name"){const v=t.value.trim();if(!v){toast("Tên không được để trống.");return}
    write(()=>db.collection("players").doc(t.dataset.id).update({name:v}).then(()=>{delete drafts[t.dataset.draft];S.everWrote=true}))}
  else if(s==="rating0")write(()=>db.collection("players").doc(t.dataset.id).update({rating0:Number(t.value)}).then(()=>S.everWrote=true));
  else if(s==="cfg"){const k=t.dataset.key;let v=t.value;
    if(["court","water","ball","other"].includes(k)){const n=Math.max(0,Number(v)||0);write(()=>saveCfg({costs:{[k]:n}}).then(()=>delete drafts["cf-"+k]))}
    else if(k==="keo")write(()=>saveCfg({keo:v==="1"}));
    else if(k==="thr")write(()=>saveCfg({thr:Number(v)}));
    else if(k==="mc"){v=v.trim().slice(0,1100);const D=derive();if(v===mcDefault({...D,c:{...D.c,mc:""}}))v="";write(()=>saveCfg({mc:v}).then(()=>delete drafts["cf-mc"]),v?"Đã lưu lời MC":"Lời MC tự tạo theo cài đặt")}
    else if(k==="sname"){v=v.trim().slice(0,60);write(()=>saveCfg({sname:v}).then(()=>delete drafts["cf-sname"]))}
    else if(k==="title"){v=v.trim()||DEF.title;write(()=>saveCfg({title:v}).then(()=>delete drafts["cf-title"]))}
    else{const n=Math.max(0,Number(v)||0);write(()=>saveCfg({[k]:n}).then(()=>delete drafts["cf-"+k]))}}
});
document.addEventListener("click",onAct=async e=>{
  {const pv=e.target.closest("[data-pid]");if(pv&&!e.target.closest("label")&&!e.target.closest(".ppt")){e.preventDefault&&e.preventDefault();go("vdv",{pid:pv.dataset.pid});return}}
  const tb=e.target.closest("[data-tab]");if(tb){const t=tb.dataset.tab;if(t==="home"){go("home");return}
    try{localStorage.setItem("pb-tab",t)}catch(x){}go("app",{tab:t});return}
  const gl=e.target.closest("[data-go]");if(gl){e.preventDefault();go(gl.dataset.go,{sid:gl.dataset.id,tab:gl.dataset.t,x:gl.dataset.x});return}
  const b=e.target.closest("[data-act]");if(!b)return;
  const act=b.dataset.act,id=b.dataset.id;
  // Nút dạng <a href="#">: không để trình duyệt đổi đường dẫn (Mini App dùng # để định tuyến, đổi # sẽ nhảy về CLB cũ)
  if(b.tagName==="A"&&b.getAttribute&&b.getAttribute("href")==="#"&&e.preventDefault)e.preventDefault();
  if(act==="cfmok"){await cfmOk();return}
  if(act==="cfmx"){cfmClose();return}
  LASTDS={...b.dataset};
  if(act==="login"){
    // Đọc thẳng ô đang nhập (bàn phím điện thoại có khi không báo sự kiện gõ), ưu tiên ô cùng khung với nút bấm
    const box=(b.closest&&b.closest("section,.cb,.pinrow,.bar,form"))||document;
    const pick=k=>{const L=[...((box.querySelectorAll&&box.querySelectorAll(`[data-draft="${k}"]`))||[]),...((document.querySelectorAll&&document.querySelectorAll(`[data-draft="${k}"]`))||[])];
      const el=L.find(x=>String(x.value||"").trim());return String((el&&el.value)||drafts[k]||"").trim()};
    const pin=pick("pin");if(!pin){errs.pin="Nhập PIN trước.";render();return}
    delete errs.pin;
    try{
      const u=authUser||(await FB.signInAnonymously(FB.auth)).user;if(!authUser)authUser=u;
      // Máy này đã vào bằng PIN trước đó thì không cần ghi lại
      if(!(await isEditor(u.uid))){
        const pn=pick("pinname").slice(0,30);
        const ref=FB.doc(FB.fs,PFX+"editors/"+u.uid);
        if(pn&&!legacy){try{await FB.setDoc(ref,{pin,at:Date.now(),name:pn})}catch(x){if(!(x&&x.code==="permission-denied"))throw x;await FB.setDoc(ref,{pin,at:Date.now()})}}
        else await FB.setDoc(ref,{pin,at:Date.now()});
      }
      await refreshRole();if(legacy)canWrite=true;delete drafts.pin;toast("Đã mở quyền nhập tỉ số trên máy này.");if(route==="clogin"){go("app",{tab:"san"});return}
    }catch(x){
      if(authUser&&await isEditor(authUser.uid)){await refreshRole();if(legacy)canWrite=true;delete drafts.pin}
      else errs.pin=x&&x.code==="permission-denied"?`Sai PIN.${CLUB&&CLUB.pinAt?` PIN được đổi lần cuối lúc ${dhm(CLUB.pinAt)}, hỏi chủ CLB PIN mới.`:""}`:"Không kết nối được, thử lại.";
    }
    render();return}
  if(act==="meclr"){setMe(null);return}
  if(act==="mepick"){delete drafts["me-q"];meAll=false;meOpen=false;setMe(id);return}
  if(act==="meall"){meAll=true;render();return}
  if(act==="meopen"){meOpen=!meOpen;if(!meOpen){meAll=false;delete drafts["me-q"]}render();return}
  if(act==="gpick"){const L=[drafts.gp1,drafts.gp2].filter(Boolean);const k=L.indexOf(id);if(k>=0)L.splice(k,1);else{if(L.length>=2)L.shift();L.push(id)}drafts.gp1=L[0]||"";drafts.gp2=L[1]||"";delete errs.gadd;render();return}
  if(act==="logout"){if(!armOr("logout:x"))return;try{await FB.signOut(FB.auth)}catch(x){}canWrite=false;ROLE=null;S.rootEditor=false;S.link=undefined;watchAdmin();watchLink();render();return}
  if(act==="glogin"){if(inApp()){toast("Mở trang bằng Chrome hoặc Safari để đăng nhập Google.");return}
    const pr=new FB.GoogleAuthProvider();try{await FB.signInWithPopup(FB.auth,pr)}catch(x){const c=(x&&x.code)||"";if(/popup-blocked|operation-not-supported|web-storage/.test(c)){try{try{sessionStorage.setItem("pb-rd","1")}catch(z){}await FB.signInWithRedirect(FB.auth,pr)}catch(y){toast("Chưa đăng nhập được, thử lại.")}}else if(!/popup-closed|cancelled-popup/.test(c))toast("Chưa đăng nhập được: "+c)}return}
  if(act==="copy"){const txt=summaryText(derive());
    try{await navigator.clipboard.writeText(txt);toast("Đã copy, dán vào nhóm Zalo nhé.")}
    catch(x){const box=$("#copybox");box.hidden=false;box.value=txt;box.focus();box.select();toast("Chọn sẵn rồi, bấm giữ để copy.")}
    return}
  if(act==="bxf"){bxF=b.dataset.v;render();return}
  if(act==="hf"){hF=b.dataset.v;render();return}
  if(act==="lshare"){const D=derive(),u=absUrl(pathOf("app",{tab:"san"})),txt=liveShareText(D);
    if(navigator.share){try{await navigator.share({title:"Đang đánh trực tiếp",text:txt+"\n",url:u})}catch(x){}return}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy, dán vào nhóm Zalo nhé.")}catch(x){toast(u)}return}
  if(act==="pshare"){const D=derive(),u=absUrl(pathOf("vdv",{pid:id})),txt=profileShare(D,id);
    if(navigator.share){try{await navigator.share({title:"Hồ sơ vận động viên",text:txt+"\n",url:u})}catch(x){}return}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy, dán vào nhóm Zalo nhé.")}catch(x){toast(u)}return}
  if(act==="vtry"){speak(VOICE_SAMPLE,b.dataset.v,"v:"+b.dataset.v,true);return}
  if(act==="spkstop"){stopSpeak();return}
  if(act==="champsay"){const k=b.dataset.k,D=derive();let txt="";
    if(k==="champ:live"){const GD=gDerive(D);if(GD)txt=champLive(D,GD)}
    else{const sid=k.slice(6),x=sessList(D).find(z=>String(z.sid)===sid),s=x&&x.snap,T=(s&&s.giai&&s.giai.table||[]).filter(t=>!t.out).slice(0,3);
      const pp=(id,n)=>{const p=D.pmap.get(id);return {name:n||p?.name||"?",gender:p?.gender||"M"}};
      if(T.length)txt=champText(s.sname||"Giải đấu",T.map(t=>({ppl:[pp(t.a,t.na),pp(t.b,t.nb)],w:t.w,l:t.l,pf:t.pf,pa:t.pa})))}
    if(txt)speak(txt,"",k);return}
  if(act==="step"){const v=b.dataset.v,D=derive();
    // Giữ vị trí: thanh 3 bước nằm yên chỗ cũ, không nhảy lên đầu trang
    const y0=window.scrollY||0;
    const natY=()=>{try{const bar=document.querySelector(".bsteps");if(!bar)return null;const st=bar.style.position;bar.style.position="static";const y=bar.getBoundingClientRect().top+(window.scrollY||0)-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tabh"))||49);bar.style.position=st;return Math.max(0,y)}catch(e){return null}};
    const barY=natY();
    const keepPos=()=>{if(barY!=null){const nY=natY();try{scrollTo({top:y0>=barY&&nY!=null?nY:Math.min(y0,nY??y0)})}catch(e){}}repaint()};
    noAnimOnce=true;
    if(v==="chot"){stepView=null;sheetOpen=false;go("chot",{keep:1});keepPos();return}
    if(v==="live"&&phaseOf(D)!=="live"){toast("Giải đấu chưa bắt đầu. Bấm “Bắt đầu giải đấu” ở cuối trang Chuẩn bị.");if(route!=="app"||tab!=="san"){stepView=null;go("app",{tab:"san",keep:1});keepPos()}return}
    stepView=v==="prep"?"prep":null;sheetOpen=false;
    if(route!=="app"||tab!=="san")go("app",{tab:"san",keep:1});else render();keepPos();return}
  if(act==="cnopen"){cnOpen=!cnOpen;render();return}
  if(act==="gview"){gView=b.dataset.v==="luot"?"luot":"san";render();return}
  if(act==="attadd"){attAdd=!attAdd;render();return}
  if(act==="undoopen"){undoOpen=!undoOpen;render();return}
  if(act==="mute"){const m=!loaMuted();loaSetMute(m);if(m)stopSpeak();toast(m?"Đã tắt loa trên máy này":"Đã bật loa");render();return}
  if(act==="vgrp"){const g=b.dataset.g;VGOPEN.has(g)?VGOPEN.delete(g):VGOPEN.add(g);render();return}
  if(act==="vpick"){if(!canWrite)return;const v=b.dataset.v;write(()=>saveCfg({voice:v}),"Đã đổi giọng đọc");speak(VOICE_SAMPLE,v,"v:"+v,true);return}
  if(act==="speakrules"){const D=derive();const el=document.getElementById&&document.getElementById("cf-mc");speak((el&&el.value.trim())||mcText(D),"","rules");return}
  if(act==="mcreset"){if(!canWrite)return;if(!armOr("mcreset:x"))return;delete drafts["cf-mc"];write(()=>saveCfg({mc:""}),"Đã về mẫu tự tạo");return}
  if(act==="speak"){const D=derive(),m=D.SM.find(x=>x.id===id);if(m)speak(callText(D,m),"","c:"+id);return}
  if(act==="qv"){qView=b.dataset.v==="so"?"so":"buoi";render();return}
  if(act==="payx"){if(b.classList.contains("sheetbg")&&e.target.closest("[data-stop]")&&!e.target.closest('[data-act="payx"]:not(.sheetbg)'))return;payOpen=null;showSheet();return}
  if(act==="pay"){payOpen={sid:Number(b.dataset.sid),name:b.dataset.n,k:Number(b.dataset.k)};showSheet();return}
  if(act==="saveqr"){try{const r=await fetch(b.dataset.v),bl=await r.blob(),fn=`QR-${b.dataset.n.replace(/\s+/g,"-")}.png`,file=new File([bl],fn,{type:bl.type||"image/png"});
      if(navigator.canShare&&navigator.canShare({files:[file]})){try{await navigator.share({files:[file],title:"Mã QR chuyển khoản"})}catch(x){}return}
      const u=URL.createObjectURL(bl),a=document.createElement("a");a.href=u;a.download=fn;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);toast("Đã lưu mã QR")}
    catch(x){window.open(b.dataset.v,"_blank")}return}
  if(act==="cp"){try{await navigator.clipboard.writeText(b.dataset.v);toast("Đã copy: "+b.dataset.v)}catch(x){toast(b.dataset.v)}return}
  if(act==="paid"){if(!canWrite)return;const sid=Number(id),h=S.hist.find(z=>z.sid===sid);if(!h)return;const pd={...(h.paid||{})};pd[b.dataset.p]=!pd[b.dataset.p];
    write(()=>db.doc("app/hist-"+sid).update({paid:pd}),pd[b.dataset.p]?"Đã đánh dấu đã nhận phí":"Đã bỏ đánh dấu");return}
  if(act==="share"||act==="copylink"){const u=shareUrl(id),D=derive(),x=sessList(D).find(z=>String(z.sid)===String(id)),txt=x?(x.snap?.type==="giai"?giaiShare(D,x):shareText(D,x)):"Tổng kết giải đấu";
    if(act==="share"&&navigator.share){try{await navigator.share({title:"Tổng kết giải đấu",text:txt+"\n",url:u})}catch(x){}return}
    try{await navigator.clipboard.writeText(txt+"\n"+u);toast("Đã copy tin nhắn kèm link, dán vào nhóm Zalo nhé.")}catch(x){toast(u)}return}
  if(act==="sess"){const k="s-"+id;editing.has(k)?editing.delete(k):editing.add(k);render();return}
  if(act==="copysess"){const D=derive(),x=sessList(D).find(z=>String(z.sid)===String(id));if(!x)return;
    const txt=(x.snap?.type==="giai"?giaiShare(D,x):shareText(D,x))+"\n"+shareUrl(x.sid);try{await navigator.clipboard.writeText(txt);toast("Đã copy tin nhắn, dán vào nhóm Zalo nhé.")}catch(e){toast("Không copy được trên trình duyệt này.")}return}
  if(await platformAct(act,id,b))return;
  if(await zaloAct(act,b,id))return;
  if(act==="pinset"){if(!isAdm()){toast("Chỉ chủ CLB và quản lý đăng nhập Google mới đặt được PIN.");return}
    const el=document.getElementById&&document.getElementById("newpin"),p=String((el&&el.value)||drafts.newpin||"").trim();
    if(!/^\S{4,12}$/.test(p)){errs.pinset="PIN cần 4–12 ký tự, không có khoảng trắng.";render();return}
    delete errs.pinset;
    try{await FB.setDoc(FB.doc(FB.fs,PFX+"secret/pin"),{value:p});delete drafts.newpin;if(el)el.value="";
      try{await FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{pinAt:Date.now()})}catch(x){}
      toast("Đã đặt PIN trọng tài. Báo PIN mới cho trọng tài.")}
    catch(x){errs.pinset=x&&x.code==="permission-denied"?"Tài khoản này chưa có quyền quản lý CLB. Đăng nhập Google bằng tài khoản chủ CLB rồi thử lại.":"Chưa lưu được PIN ("+((x&&x.code)||"mất kết nối")+"). Thử lại."}
    render();return}
  // Trọng tài chỉ được lưu tỉ số ở sân được giao
  const REF_ACTS=["savechk","savex","save","cancelx"];
  if(!canWrite&&!(REF&&REF_ACTS.includes(act)&&canScore(S.matches.find(x=>x.id===id))))return;
  if(canWrite&&!legacy&&await ckAct(act,b,id))return;
  if(canWrite&&!legacy&&await zaloAdminAct(act,b,id))return;
  if(act==="migrate"){if(!legacy||!isGoogle(authUser)||!S.rootEditor){toast("Cần đăng nhập Google và nhập PIN trước.");return}if(!armOr("migrate:x"))return;try{await migrate()}catch(x){S.migMsg="Chuyển chưa xong ("+((x&&x.code)||"lỗi")+"). Kiểm tra luật Firestore mới đã xuất bản chưa rồi thử lại.";render()}return}
  if(act==="bsave"&&isAdm()){const code=val("bk-code",CLUB?.bank?.code||"mb"),bk=BANKS.find(z=>z[0]===code)||BANKS[0],acc=String(val("bk-acc",CLUB?.bank?.acc||"")).replace(/\s/g,""),hd=noAcc(val("bk-holder",CLUB?.bank?.holder||""));
    if(!/^\d{6,19}$/.test(acc)){toast("Số tài khoản chỉ gồm 6–19 chữ số.");return}if(!hd){toast("Nhập tên chủ tài khoản.");return}
    write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{bank:{code:bk[0],bin:bk[1],name:bk[2],acc,holder:hd}}).then(()=>{["bk-code","bk-acc","bk-holder"].forEach(k=>delete drafts[k])}),"Đã lưu ngân hàng");return}
  if(act==="cintro"&&isAdm()){const rd=k=>{const el=document.getElementById&&document.getElementById("ci-"+k);return String((el&&el.value!=null?el.value:drafts["ci-"+k])??CLUB?.[k]??"").trim()};
    const d={about:rd("about").slice(0,500)};for(const [k,,,mx] of INTRO)d[k]=rd(k).slice(0,mx);d.zalo=d.zalo.replace(/[^\d]/g,"").slice(0,15);
    write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),d).then(()=>{["about",...INTRO.map(x=>x[0])].forEach(k=>delete drafts["ci-"+k])}),"Đã lưu giới thiệu CLB");return}
  if(act==="cname"&&isAdm()){const v=String(val("cl-name",CLUB?.name||"")).trim();if(v.length<3){toast("Tên CLB cần ít nhất 3 ký tự.");return}
    write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{name:v}).then(()=>{delete drafts["cl-name"];if(CLUB)CLUB.name=v}),"Đã lưu tên CLB");return}
  if(act==="clogodel"&&isAdm()){if(!armOr("clogodel:x"))return;write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{logo:""}),"Đã xoá ảnh CLB");return}
  if(act==="pub"&&isAdm()){write(()=>FB.updateDoc(FB.doc(FB.fs,"clubs/"+CID),{public:b.dataset.v==="1"}),"Đã lưu");return}
  if(act==="edclear"&&isAdm()){if(!armOr("edclear:x"))return;write(async()=>{for(const e of S.editors||[])await FB.deleteDoc(FB.doc(FB.fs,PFX+"editors/"+e.id))},"Đã thu hồi quyền các máy dùng PIN");return}
  if(act==="mrm"&&isAdm()){if(!armOr("mrm:"+id))return;write(()=>FB.deleteDoc(FB.doc(FB.fs,PFX+"members/"+id)),"Đã gỡ khỏi ban tổ chức");return}
  if(act==="inv"&&isAdm()){const role=b.dataset.v==="admin"?"admin":"scorer",tok=Array.from(crypto.getRandomValues(new Uint8Array(9))).map(x=>x.toString(16).padStart(2,"0")).join("");
    await write(()=>FB.setDoc(FB.doc(FB.fs,PFX+"invites/"+tok),{role,exp:Date.now()+7*864e5,by:authUser.uid,at:Date.now()}),"Đã tạo link mời");
    S.invLink={role,url:absUrl(`/${CID}/moi/${tok}`),zalo:miniLink(CID)+"&moi="+tok};render();return}
  if(act==="invshare"&&S.invLink){const t=`Mời bạn làm ${ROLE_LB[S.invLink.role]} của ${CLUB?.name||"CLB"} trên Pikeco. Bấm link để mở trong Zalo và nhận quyền (hết hạn sau 7 ngày):`,u=S.invLink.zalo;if(navigator.share){try{await navigator.share({title:"Lời mời",text:t,url:u})}catch(x){}}else{try{await navigator.clipboard.writeText(t+"\n"+u);toast("Đã copy lời mời, dán vào Zalo")}catch(x){toast(u)}}return}
  if(await sessionAct(act,id,b,e))return;
  if(act==="cset"&&b.dataset.k!=="fmt"){const k=b.dataset.k,v=b.dataset.v;
    if(cfg()[k]===v)return;const patch={[k]:v};if(k==="gt"){patch.gtv=v==="trich"?30:v==="codinh"?200:v==="gop"?20:0;if(v==="hang"&&cfg().hang1==null)Object.assign(patch,{hang1:200,hang2:100,hang3:50})}if(k==="thu"&&v==="phi"&&!cfg().phi)patch.phi=50;
    ["cf-gtv","cf-phi"].forEach(x=>delete drafts[x]);write(()=>saveCfg(patch));return}
  if(act==="fmt"||(act==="cset"&&b.dataset.k==="fmt")){const v=b.dataset.v==="giai"?"giai":"xoay";if(derive().SM.length){toast("Giải đấu đã có trận, không đổi thể thức được.");return}
    if(cfg().fmt===v||(v==="xoay"&&!cfg().fmt))return;
    const keep=sheetOpen||phaseOf(derive())==="live";write(()=>saveCfg({fmt:v,giai:cfg().giai||{pairs:[],prizes:[0,0,0],out:{},locked:false},...(keep?{phase:"live"}:{})}),v==="giai"?"Đã chọn thể thức Cặp cố định xoay vòng":"Đã chọn thể thức Xoay cặp");return}
  if(act==="capadd"&&await capAct(act,b,id))return;
  if(await gbAct(act,b,id))return;
  if(await koAct(act,b,id))return;
  if(act==="gaddopen"){gAddOpen=true;delete drafts.gp1;delete drafts.gp2;delete drafts["gp-q"];delete errs.gadd;render();return}
  if(act==="gaddx"){gAddOpen=false;render();return}
  if(act==="gauto"){const D=derive(),P=cfg().giai?.pairs||[],used=new Set(P.flatMap(p=>[p.a,p.b])),rt=id=>D.st.get(id)?.rating??2.5;
    const F=D.players.filter(p=>p.active!==false&&!used.has(p.id)).sort((a,b)=>rt(b.id)-rt(a.id)),add=[];
    // Mạnh nhất ghép yếu nhất cho các cặp cân trình
    for(let i=0,j=F.length-1;i<j&&P.length+add.length<gMax(cfg().giai);i++,j--)add.push({id:"c"+Date.now().toString(36)+i,a:F[i].id,b:F[j].id});
    if(!add.length){toast("Không còn đủ người để ghép.");return}
    write(()=>saveG({pairs:[...P,...add]}),`Đã ghép ${add.length} cặp cân trình`);return}
  if(act==="gadd"){const a=String(drafts.gp1||""),bb=String(drafts.gp2||""),P=cfg().giai?.pairs||[];
    if(!a||!bb){errs.gadd="Chọn đủ 2 người.";render();return}
    if(a===bb){errs.gadd="Hai người phải khác nhau.";render();return}
    if(P.length>=gMax(cfg().giai)){errs.gadd=`Tối đa ${gMax(cfg().giai)} cặp.`;render();return}
    if(P.some(p=>[p.a,p.b].includes(a)||[p.a,p.b].includes(bb))){errs.gadd="Người này đã có cặp.";render();return}
    delete errs.gadd;gAddOpen=b.dataset.v==="more";delete drafts["gp-q"];write(()=>saveG({pairs:[...P,{id:"c"+Date.now().toString(36),a,b:bb}]}).then(()=>{delete drafts.gp1;delete drafts.gp2}),"Đã thêm cặp");return}
  if(act==="gnowopen"){gNowOpen=!gNowOpen;gNowSel=[];render();return}
  if(act==="gnowpick"){const k=gNowSel.indexOf(id);if(k>=0)gNowSel.splice(k,1);else{if(gNowSel.length>=2)gNowSel.shift();gNowSel.push(id)}render();return}
  if(act==="gnow"){const [x,y]=gNowSel;if(!x||!y)return;await gPlace(Number(b.dataset.c),x,y);gNowSel=[];gNowOpen=false;render();return}
  if(act==="gnext"){const [x,y]=gNowSel;if(!x||!y)return;const G=G0(),L=(G.presets||[]).filter(p=>gk(p.x,p.y)!==gk(x,y));
    await write(()=>saveG({preOn:true,presets:[{id:"gp"+Date.now().toString(36),x,y},...L]}),"Trận này sẽ vào sân đầu tiên khi có sân trống");gNowSel=[];gNowOpen=false;render();return}
  if(act==="gpreon"){const on=G0().preOn!==true;write(()=>saveG({preOn:on}),on?"Bật xếp sẵn trận đầu":"Tắt xếp sẵn, app tự gọi trận");return}
  if(act==="gprepick"){const k=gpreSel.indexOf(id);if(k>=0)gpreSel.splice(k,1);else{if(gpreSel.length>=2)gpreSel.shift();gpreSel.push(id)}delete errs.gpre;render();return}
  if(act==="gpreadd"){if(gpreSel.length<2){errs.gpre="Chọn đủ 2 cặp.";render();return}
    const L=G0().presets||[],[x,y]=gpreSel;if(L.some(p=>gk(p.x,p.y)===gk(x,y))){errs.gpre="Trận này đã có trong danh sách.";render();return}
    if(G0().locked){const GD=gDerive(derive()),g=GD&&GD.games.find(q=>q.key===gk(x,y));if(g&&g.st!=="wait"){errs.gpre="Hai cặp này đã đánh hoặc đang đánh với nhau.";render();return}}
    gpreSel=[];delete errs.gpre;write(()=>saveG({presets:[...L,{id:"gp"+Date.now().toString(36),x,y}]}),`Đã thêm trận định sẵn #${L.length+1}`);return}
  if(act==="gpremv"){const L=[...(G0().presets||[])],i=L.findIndex(p=>p.id===id),j=i+Number(b.dataset.d);if(i<0||j<0||j>=L.length)return;[L[i],L[j]]=[L[j],L[i]];write(()=>saveG({presets:L}));return}
  if(act==="gpredel"){if(!armOr("gpredel:"+id))return;write(()=>saveG({presets:(G0().presets||[]).filter(p=>p.id!==id)}),"Đã bỏ trận định sẵn");return}
  if(act==="gdel"){if(!armOr("gdel:"+id))return;write(()=>saveG({pairs:(cfg().giai?.pairs||[]).filter(p=>p.id!==id)}),"Đã bỏ cặp");return}
  if(act==="gstart"){const P=cfg().giai?.pairs||[];if(P.length<3){errs.giai="Cần ít nhất 3 cặp.";render();return}if(isKO(cfg().giai)&&!koGroupsOk(cfg().giai)){errs.giai="Bốc chia bảng trước khi tạo lịch.";render();return}delete errs.giai;if(!armOr("gstart:x"))return;
    await write(()=>saveCfg({phase:"live",giai:{...(cfg().giai||{}),locked:true,startedAt:Date.now(),out:{}}}),"Đã tạo lịch thi đấu");await gFill();return}
  if(act==="gfill"){const n=await gFill();toast(n?`Đã đưa ${n} trận vào sân`:"Chưa đưa được trận nào: sân đã đầy hoặc các cặp còn lại đang đánh.");return}
  if(act==="gout"){if(derive().playing.some(m=>m.giai&&(m.pa===id||m.pb===id))){toast("Cặp này đang trên sân, lưu tỉ số hoặc hủy trận trước.");return}
    if(!armOr("gout:"+id))return;await write(()=>saveG({out:{...(cfg().giai?.out||{}),[id]:true}}),"Đã ghi nhận cặp bỏ giải");await gFill();return}
  if(act==="grest"){const r={...(cfg().giai?.rest||{})};const on=!r[id];if(on)r[id]=true;else delete r[id];await write(()=>saveG({rest:r}),on?"Đã cho cặp này nghỉ":"Cặp đã vào lại");if(!on)await gFill();return}
  if(act==="gin"){const o={...(cfg().giai?.out||{})};delete o[id];write(()=>saveG({out:o}),"Cặp đã quay lại giải");return}
  if(act==="gcancel"){const D=derive();if(D.done.some(m=>m.giai)){toast("Đã có trận xong, không hủy lịch được.");return}
    if(!armOr("gcancel:x"))return;
    await write(async()=>{await trashMatches(D.playing.filter(m=>m.giai),"gcancel");await saveG({locked:false})},"Đã hủy lịch, có thể ghép lại cặp");return}
  if(act==="gend"){if(!armOr("gend:x"))return;await endGiai();return}
  if(act==="gmode"){const v=b.dataset.v==="same"?"same":"mix";if(cfg().gmode!==v)write(()=>saveCfg({gmode:v}),v==="same"?"Đã chuyển sang ưu tiên cùng giới":"Đã chuyển sang ưu tiên khác giới");return}
  if(act==="phdel"){if(!armOr("phdel:"+id))return;write(()=>db.collection("players").doc(id).update({photo:""}),"Đã xóa ảnh");return}
  if(act==="picktoggle"){pickOpen=!pickOpen;render();return}
  if(act==="pickall"){const away=S.players.filter(p=>p.active===false);if(pickSel.size===away.length)pickSel.clear();else away.forEach(p=>pickSel.add(p.id));render();return}
  if(act==="pickadd"){const ids=[...pickSel];if(!ids.length){toast("Chọn ít nhất một người.");return}
    await write(async()=>{for(const i of ids)await db.collection("players").doc(i).update({active:true});S.everWrote=true;pickSel.clear();pickOpen=false},`Đã thêm ${ids.length} người vào giải đấu`);return}
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
    toast(added||back?`Đã thêm ${added} người mới${back?`, ${back} người cũ vào giải đấu`:""}`:"Các tên này đã có mặt.")}
  else if(act==="codes"){
    const lock=await db.doc("app/lock").acquire({holder,ttlMs:8000});
    if(!lock.acquired){toast("Có người khác đang cập nhật, thử lại sau vài giây.");return}
    write(()=>assignCodes().then(()=>S.everWrote=true),"Đã cấp mã")}
  else if(act==="checkin")write(()=>db.collection("players").doc(id).update({active:true}),"Đã thêm vào giải đấu")
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
  else if(act==="mdel"){if(!armOr("mdel:"+id))return;const m=findMatch(id);write(()=>m?trashMatches([m],"del"):db.collection("matches").doc(id).delete(),"Đã xóa trận · có thể hoàn tác")}
  else if(act==="sdel"){if(!armOr("sdel:"+id))return;const sid=Number(id);
    await write(async()=>{
      const M=(await db.collection("matches").where("session",sid).get()).docs.map(d=>({id:d.id,...d.data()}));
      const B=(await db.collection("batches").where("session",sid).get()).docs.map(d=>({id:d.id,...d.data()}));
      const h=S.hist.find(x=>x.sid===sid)||null;
      // Trả lại rating: bỏ phần cộng/trừ của buổi này khỏi trình hiện tại của từng người (ghi lại để khôi phục đúng)
      const adj={},upd=[];
      if(h)for(const r of h.rows||[]){const p=S.players.find(x=>x.id===r.id),d=Number(r.d);if(p&&Number.isFinite(d)&&d){const old=Number(p.rating0)||3,nw=Math.round(Math.min(8,Math.max(1,old-d))*100)/100;adj[p.id]=Math.round((old-nw)*100)/100;upd.push([p.id,nw])}}
      const {id:_hid,...hd}=h||{};
      await db.collection("deleted").doc("s"+sid+"-"+Date.now().toString(36)).set({sid,hist:h?hd:null,matches:M,batches:B,adj,at:Date.now(),by:who()});
      for(const m of M)await db.collection("matches").doc(m.id).delete();
      for(const x of B)await db.collection("batches").doc(x.id).delete();delete S.pm[sid];
      for(const [pid,nw] of upd)await db.collection("players").doc(pid).update({rating0:nw});
      if(h)await db.doc("app/hist-"+sid).delete();
      delList=null;editing.delete("s-"+sid)},`Đã xóa giải đấu #${sid}, rating đã tự trừ lại. Chủ CLB khôi phục được trong Cài đặt.`)}
  else if(act==="toggle"){const p=S.players.find(p=>p.id===id);write(()=>db.collection("players").doc(id).update({active:p.active===false}))}
  else if(act==="del"){if(!armOr("del:"+id))return;write(()=>db.collection("players").doc(id).delete(),"Đã xóa")}
  else if(act==="cancel"){if(!armOr("cancel:"+id))return;pendSave.delete(id);pendCancel.delete(id);const m=S.matches.find(x=>x.id===id);if(!m)return;write(()=>trashMatches([m],"cancel"),"Đã hủy trận · bấm Hoàn tác nếu nhầm")}
  else if(act==="cancelx"){pendCancel.delete(id);render()}
  else if(act==="cancelok"){pendCancel.delete(id);const m=S.matches.find(x=>x.id===id);if(!m)return;write(()=>trashMatches([m],"cancel"),"Đã hủy trận · bấm Hoàn tác nếu nhầm")}
  else if(act==="ccol"){const i=+b.dataset.i,c=cfg(),L=[...(c.ccolors||[])];while(L.length<i)L.push("");L[i-1]=b.dataset.v;write(()=>saveCfg({ccolors:L}))}
  else if(act==="refct"){const [t,uid]=String(b.dataset.k).split(":"),c=Number(b.dataset.c);
    const L=t==="m"?(S.members||[]):(S.editors||[]),r=L.find(x=>x.id===uid);if(!r)return;
    const cur=(r.courts||[]).map(Number),next=cur.includes(c)?cur.filter(x=>x!==c):[...cur,c].sort((x,y)=>x-y);
    try{await FB.updateDoc(FB.doc(FB.fs,PFX+(t==="m"?"members/":"editors/")+uid),{courts:next});toast(next.includes(c)?`Đã giao sân ${c}`:`Đã bỏ sân ${c}`)}
    catch(x){toast(x&&x.code==="permission-denied"?"Máy chủ chưa cho giao sân: cần cập nhật quyền dữ liệu (Firestore Rules).":"Chưa lưu được, thử lại.")}
    render()}
  else if(act==="srestore"){if(ROLE!=="owner"&&!legacy)return;if(!armOr("srestore:"+id))return;let r;await write(async()=>{r=await restoreSession(id)});if(r)toast(r)}
  else if(act==="undoone"){if(!armOr("undoone:"+id))return;let r;await write(async()=>{r=await undoAll(id)});if(r)toast(r.n?"Đã khôi phục trận":"Chưa khôi phục được: người chơi đang ở sân khác hoặc hết sân trống")}
  else if(act==="undoall"){if(!armOr("undoall:x"))return;let r;await write(async()=>{r=await undoAll()});if(r)toast(r.k?`Đã khôi phục ${r.n} trận, ${r.k} trận chưa khôi phục được vì người chơi đang ở sân khác`:`Đã khôi phục ${r.n} trận`)}
  else if(act==="savechk"){const m=S.matches.find(x=>x.id===id);if(!m)return;const ra=val("sa-"+id,""),rb=val("sb-"+id,""),a=Number(ra),bb=Number(rb);
    const msg=ra===""||rb===""?"Nhập điểm hai đội.":vPtsM(m,a,bb);if(msg){errs[id]=msg;pendSave.delete(id);render();return}
    delete errs[id];pendSave.add(id);render()}
  else if(act==="savex"){pendSave.delete(id);render()}
  else if(act==="readres"){const D=derive(),m=D.SM.find(x=>x.id===id);if(!m)return;speak(resultText(D,m,Number(val("sa-"+id,"")),Number(val("sb-"+id,""))),"","r:"+id)}
  else if(act==="save"||act==="edit-save"){
    const m=S.matches.find(x=>x.id===id);const pre=act==="save"?["sa-","sb-"]:["ea-","eb-"];
    const a=Number(val(pre[0]+id,act==="save"?"":m.sa)),bb=Number(val(pre[1]+id,act==="save"?"":m.sb));
    pendSave.delete(id);const msg=(val(pre[0]+id,"")===""&&act==="save")||(val(pre[1]+id,"")===""&&act==="save")?"Nhập điểm hai đội.":vPtsM(m,a,bb);
    if(msg){errs[id]=msg;render();return}
    delete errs[id];
    if(act==="save"&&b.dataset.read&&!loaMuted()){const D=derive();if(m)speak(resultText(D,m,a,bb),"","r:"+id)}
    await write(()=>db.collection("matches").doc(id).update(act==="save"?{sa:a,sb:bb,status:"done",doneAt:Date.now()}:{sa:a,sb:bb}).then(()=>{S.everWrote=true;delete drafts[pre[0]+id];delete drafts[pre[1]+id];editing.delete(id)}),act==="save"?"Đã lưu tỉ số":"Đã sửa tỉ số");
    if(m.giai&&act==="save"&&!errs[id]&&canWrite){if(m.status!=="done")Object.assign(m,{sa:a,sb:bb,status:"done",doneAt:Date.now()});await new Promise(r=>setTimeout(r,60));await gFill()}}
  else if(act==="edit"){editing.add(id);render()}
  else if(act==="edit-x"){editing.delete(id);delete errs[id];render()}
  else if(act==="reset"||act==="chot"){if(!armOr("chot:x"))return;await chotBuoi()}
});

