/* ---------- boot ---------- */
// Chỉ hỏi kết quả đăng nhập chuyển hướng khi vừa quay về từ Google: tránh tải khung auth (~1s) cho người chỉ xem
function fromRedirect(){let f=null;try{f=sessionStorage.getItem("pb-rd");sessionStorage.removeItem("pb-rd")}catch(e){}if(f&&FB.getRedirectResult)FB.getRedirectResult(FB.auth).catch(()=>{})}
async function isEditor(uid){try{return (await FB.getDoc(FB.doc(FB.fs,PFX+"editors/"+uid))).exists()}catch(e){return false}}
function makeDb(pfx){
  const wrapDoc=s=>({id:s.id,exists:s.exists(),data:()=>s.data(),metadata:s.metadata});
  const ref=path=>{const r=FB.doc(FB.fs,pfx+path);return{
    id:r.id,path,
    set:d=>FB.setDoc(r,d),update:d=>FB.updateDoc(r,d),delete:()=>FB.deleteDoc(r),
    get:async()=>wrapDoc(await FB.getDoc(r)),
    onSnapshot:(n,e)=>FB.onSnapshot(r,{includeMetadataChanges:true},s=>n(wrapDoc(s)),e),
    acquire:async({holder,ttlMs})=>{try{return await FB.runTransaction(FB.fs,async t=>{
      const s=await t.get(r),d=s.exists()?s.data():null,now=Date.now();
      if(d&&d.holder!==holder&&d.expires>now)return{acquired:false};
      t.set(r,{holder,expires:now+(ttlMs||5000)});return{acquired:true}})}catch(e){return{acquired:false}}}
  }};
  return{doc:ref,collection:path=>{const c=FB.collection(FB.fs,pfx+path);return{
    path,doc:id=>ref(path+"/"+(id||FB.doc(c).id)),
    onSnapshot:(n,e)=>FB.onSnapshot(c,{includeMetadataChanges:true},n,e),
    get:()=>FB.getDocs(c),
    where:(f,v)=>{const q=FB.query(c,FB.where(f,"==",v));return{onSnapshot:(n,e)=>FB.onSnapshot(q,{includeMetadataChanges:true},n,e),get:()=>FB.getDocs(q)}}}}};
}
const clubBank=()=>CLUB&&CLUB.bank&&CLUB.bank.acc?CLUB.bank:(CID==="aep"?DEF_BANK:null);
(async()=>{
  // CLB thường (và AEP nếu lần trước đã là CLB mới): biết sẵn đường dẫn dữ liệu ngay từ lần vẽ đầu
  if(MODE==="club"&&(CID!=="aep"||(MINI&&lsGet("pb-role-aep")!==null))){PFX="clubs/"+CID+"/";legacy=false}
  roleGuess();
  render();
  if(MODE==="platform"){
    if(!window.FB)return;
    fromRedirect();
    FB.onAuthStateChanged(FB.auth,u=>{authUser=u;S.codes=null;S.loginJump=false;S.myClub=undefined;loadMyClub();render()});
    return}
  if(!window.FB){S.offline=true;render();return}
  // CLB thường (không phải AEP cũ): biết sẵn đường dẫn dữ liệu, tải thông tin CLB song song với các phần khác
  let clubP=Promise.resolve();
  if(CID!=="aep"){PFX="clubs/"+CID+"/";legacy=false;
    clubP=FB.getDoc(FB.doc(FB.fs,"clubs/"+CID)).then(s=>{if(s.exists()){CLUB=s.data();BANK=clubBank()}else S.noClub=true},()=>{S.offline=true}).then(()=>{clubChecked=true;if(S.noClub)hideSplash();render()});
  }else{
    try{const s=await FB.getDoc(FB.doc(FB.fs,"clubs/"+CID));
      if(s.exists()){CLUB=s.data();PFX="clubs/"+CID+"/";legacy=false;BANK=clubBank()}
      else{PFX="";legacy=true;ROLE=null;canWrite=false;REF=false}
    }catch(e){}
    clubChecked=true;
  }
  db=makeDb(PFX);
  hideSplash();
  fromRedirect();
  if(!legacy)zaloHash();
  FB.onAuthStateChanged(FB.auth,async u=>{authUser=u;S.codes=null;await refreshRole();loadMyClub();if(S.priv&&canWrite){location.reload();return}render();acceptInvite()});
  if(!legacy)FB.onSnapshot(FB.doc(FB.fs,"clubs/"+CID),{},s=>{if(s.exists()){CLUB=s.data();BANK=clubBank();render()}},()=>{});
  const fail=()=>{clubP.then(()=>{if(S.noClub)return;if(!legacy&&CLUB&&CLUB.public===false)S.priv=true;S.offline=true;hideSplash();render()})};
  const live=meta=>{S.live=!meta.fromCache;render()};
  let unsubM=null,unsubB=null,unsubR=null,subSid=null;
  const subSession=sid=>{if(sid===subSid)return;if(subSid!=null)S.pm[subSid]=S.matches;subSid=sid;if(unsubM)unsubM();if(unsubB)unsubB();S.mReady=false;S.matches=[];S.batches=[];
    unsubM=db.collection("matches").where("session",sid).onSnapshot(q=>{S.matches=q.docs.map(d=>({id:d.id,...d.data()}));S.mReady=true;live(q.metadata);autoGFill()},fail);
    unsubB=db.collection("batches").where("session",sid).onSnapshot(q=>{S.batches=q.docs.map(d=>({id:d.id,...d.data()}));live(q.metadata)},fail)
    subRegs()};
  // Đăng ký: của buổi hiện tại (cách cũ, sid là số) và của các buổi trong lịch còn sắp tới (sid là mã buổi)
  let regKeyNow="";
  const subRegsIds=ids=>{const k=JSON.stringify(ids);if(k===regKeyNow||!ids.length)return;regKeyNow=k;if(unsubR)unsubR();lsSet("pb-regk-"+CID,k);
    unsubR=FB.onSnapshot(FB.query(FB.collection(FB.fs,PFX+"regs"),FB.where("sid","in",ids)),{},q=>{S.regs=q.docs.map(d=>({id:d.id,...d.data()}));render()},()=>{})};
  const subRegs=()=>{if(legacy||!S.schedReady||!S.cfg)return;subRegsIds([subSid,...schedUp().map(x=>x.id),cfg().schedId].filter((x,i,a)=>x!=null&&a.indexOf(x)===i).map(String).sort().slice(0,30).map(x=>/^\d+$/.test(x)?+x:x))};
  // Mở lại CLB: đăng ký sẵn theo lần trước (giải đấu, danh sách đăng ký) để không phải chờ nối đuôi
  {const ses=+lsGet("pb-ses-"+CID);if(ses>0)subSession(ses);
    if(!legacy)try{const k=JSON.parse(lsGet("pb-regk-"+CID)||"null");if(Array.isArray(k)&&k.length)subRegsIds(k)}catch(e){}}
  if(!legacy){
    FB.onSnapshot(FB.collection(FB.fs,PFX+"sched"),{},q=>{S.sched=q.docs.map(d=>({id:d.id,...d.data()}));S.schedReady=true;subRegs();render()},()=>{S.sched=[];S.schedReady=true;render()});
    FB.onSnapshot(FB.collection(FB.fs,PFX+"series"),{},q=>{S.series=q.docs.map(d=>({id:d.id,...d.data()}));S.seriesReady=true;render()},()=>{S.series=[];S.seriesReady=true});
  }
  db.doc("app/config").onSnapshot(s=>{S.cfg=s.exists?s.data():null;lsSet("pb-ses-"+CID,String(cfg().session||1));subSession(cfg().session||1);subRegs();live(s.metadata)},fail);
  db.collection("app").onSnapshot(q=>{const A=q.docs.map(d=>({id:d.id,...d.data()}));
    S.hist=A.filter(d=>d.id.startsWith("hist-"));S.pays=Object.fromEntries(A.filter(d=>d.id.startsWith("pay-")).map(d=>[d.id,d]));S.led=A.filter(d=>d.id.startsWith("led-"));S.trash=A.find(d=>d.id==="trash")||null;
    S.hReady=true;render()},fail);
  db.collection("players").onSnapshot(q=>{S.players=q.docs.map(d=>({id:d.id,...d.data()}));S.pReady=true;live(q.metadata)},fail);
})();

