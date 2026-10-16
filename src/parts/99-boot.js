/* ---------- boot ---------- */
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
  render();
  if(MODE==="platform"){
    if(!window.FB)return;
    if(FB.getRedirectResult)FB.getRedirectResult(FB.auth).catch(()=>{});
    FB.onAuthStateChanged(FB.auth,u=>{authUser=u;S.codes=null;S.loginJump=false;S.myClub=undefined;loadMyClub();render()});
    return}
  if(!window.FB){S.offline=true;render();return}
  try{const s=await FB.getDoc(FB.doc(FB.fs,"clubs/"+CID));
    if(s.exists()){CLUB=s.data();PFX="clubs/"+CID+"/";legacy=false;BANK=clubBank()}
    else if(CID!=="aep"){S.noClub=true;hideSplash();render();return}
  }catch(e){if(CID!=="aep"){S.offline=true;render();return}}
  db=makeDb(PFX);
  if(FB.getRedirectResult)FB.getRedirectResult(FB.auth).catch(()=>{});
  FB.onAuthStateChanged(FB.auth,async u=>{authUser=u;S.codes=null;await refreshRole();loadMyClub();if(S.priv&&canWrite){location.reload();return}render();acceptInvite()});
  if(!legacy)FB.onSnapshot(FB.doc(FB.fs,"clubs/"+CID),{},s=>{if(s.exists()){CLUB=s.data();BANK=clubBank();render()}},()=>{});
  const fail=()=>{if(!legacy&&CLUB&&CLUB.public===false)S.priv=true;S.offline=true;hideSplash();render()};
  const live=meta=>{S.live=!meta.fromCache;render()};
  let unsubM=null,unsubB=null,subSid=null;
  const subSession=sid=>{if(sid===subSid)return;if(subSid!=null)S.pm[subSid]=S.matches;subSid=sid;if(unsubM)unsubM();if(unsubB)unsubB();S.mReady=false;S.matches=[];S.batches=[];
    unsubM=db.collection("matches").where("session",sid).onSnapshot(q=>{S.matches=q.docs.map(d=>({id:d.id,...d.data()}));S.mReady=true;live(q.metadata)},fail);
    unsubB=db.collection("batches").where("session",sid).onSnapshot(q=>{S.batches=q.docs.map(d=>({id:d.id,...d.data()}));live(q.metadata)},fail)};
  db.doc("app/config").onSnapshot(s=>{S.cfg=s.exists?s.data():null;subSession(cfg().session||1);live(s.metadata)},fail);
  db.collection("app").onSnapshot(q=>{S.hist=q.docs.filter(d=>d.id.startsWith("hist-")).map(d=>({id:d.id,...d.data()}));S.hReady=true;render()},fail);
  db.collection("players").onSnapshot(q=>{S.players=q.docs.map(d=>({id:d.id,...d.data()}));live(q.metadata)},fail);
})();

