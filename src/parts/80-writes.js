/* ---------- writes ---------- */
async function write(fn,okMsg){
  if(!db||!(canWrite||REF))return;
  try{await fn(); if(okMsg)toast(okMsg)}
  catch(e){
    if(e&&e.code==="permission-denied"){canWrite=false;toast("Phiên sửa đã hết quyền, nhập lại PIN.")}
    else if(e&&e.code==="quota_exceeded")toast("Dữ liệu đã đầy, hãy bắt đầu giải đấu mới.");
    else toast("Chưa lưu được, thử lại.");
  }
  render();
}
const cfgDoc=()=>db.doc("app/config");
async function saveCfg(patch){
  const next={...cfg(),...patch,costs:{...cfg().costs,...(patch.costs||{})}};
  await cfgDoc().set(next); S.cfg=next; S.everWrote=true;
}
const key=(x,y)=>x<y?x+"|"+y:y+"|"+x;
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}

// Trận định sẵn chưa đánh (theo thứ tự đã xếp)
const presetQueue=D=>D.c.preOn===true?(D.c.presets||[]).filter(p=>!D.SM.some(m=>m.preset===p.id)):[];
async function generate(only){
  if(pausedNow()){toast("Đang nghỉ giữa giờ. Bấm “Đánh tiếp” để đưa trận vào sân.");return}
  const D=derive(),c=D.c;
  const used=new Set(D.playing.map(m=>m.court));
  const freeCourts=[];for(let i=1;i<=c.courts;i++)if(!used.has(i)&&(!only||i===only))freeCourts.push(i);
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const avail0=D.players.filter(p=>p.active!==false&&!busy.has(p.id)).map(p=>p.id);
  if(!freeCourts.length){errs.gen="Tất cả sân đang có trận. Lưu tỉ số hoặc thêm sân trước.";return render()}
  // Trận định sẵn: lấy theo thứ tự, trận nào đủ 4 người đang rảnh thì vào sân trước, còn lại xếp tự động như cũ
  const preQ=presetQueue(D),pick=[],taken=new Set();
  for(const pr of preQ){if(pick.length>=freeCourts.length)break;const ids=[...pr.a,...pr.b];
    if(ids.every(id=>avail0.includes(id)&&!taken.has(id))){pick.push(pr);ids.forEach(id=>taken.add(id))}}
  const avail=avail0.filter(id=>!taken.has(id));
  const n=Math.min(freeCourts.length-pick.length,Math.floor(avail.length/4));
  if(n+pick.length<1){errs.gen=`Cần ít nhất 4 người đang rảnh, hiện có ${avail0.length}.`;return render()}
  delete errs.gen;
  const lock=await db.doc("app/lock").acquire({holder,ttlMs:5000});
  if(!lock.acquired){toast("Có người khác đang xếp trận, thử lại sau vài giây.");return}
  const rnd=new Map(avail.map(id=>[id,Math.random()]));
  const lastB=D.SB.reduce((m,b)=>b.n>(m?.n||0)?b:m,null),prevSat=new Set(lastB?.sitting||[]);
  const rate=id=>{const s=D.st.get(id),e=s.g+s.sits;return e?s.g/e:-1};
  avail.sort((x,y)=>rate(x)-rate(y)||(prevSat.has(y)-prevSat.has(x))||D.st.get(x).last-D.st.get(y).last||rnd.get(x)-rnd.get(y));
  const chosen=avail.slice(0,n*4),sitting=avail.slice(n*4);
  const tier=id=>rate(id).toFixed(3)+"|"+(prevSat.has(id)?1:0);
  const mCount=()=>chosen.filter(id=>gOf(D,id)==="M").length;
  if(sitting.length&&mCount()%2===1){const bt=tier(chosen[chosen.length-1]);
    outer:for(let i=chosen.length-1;i>=0;i--){if(tier(chosen[i])!==bt)continue;
      for(let j=0;j<sitting.length;j++){if(tier(sitting[j])!==bt)break;
        if(gOf(D,sitting[j])!==gOf(D,chosen[i])){const t=chosen[i];chosen[i]=sitting[j];sitting[j]=t;break outer}}}}
  const pc=new Map(),oc=new Map(),inc=(m,k)=>m.set(k,(m.get(k)||0)+1);
  for(const m of D.SM){inc(pc,key(m.a[0],m.a[1]));inc(pc,key(m.b[0],m.b[1]));for(const x of m.a)for(const y of m.b)inc(oc,key(x,y))}
  const R=id=>D.st.get(id).rating;
  const GP=c.gmode==="same"?{"FM|FM":60,"FF|FF":0,"MM|MM":0,"FM|MM":150,"FM|FF":150}:{"FM|FM":0,"FF|FF":60,"MM|MM":60,"FM|MM":150,"FM|FF":150};
  const genderCost=(A,B)=>{const k=[tType(D,A),tType(D,B)].sort().join("|");return k in GP?GP[k]:Infinity};
  const cost=(A,B)=>{const g=genderCost(A,B);if(g===Infinity)return Infinity;const p1=pc.get(key(A[0],A[1]))||0,p2=pc.get(key(B[0],B[1]))||0;let o=0;for(const x of A)for(const y of B)o+=oc.get(key(x,y))||0;
    return g+10*(p1*p1+p2*p2)+3*o+12*Math.abs((R(A[0])+R(A[1]))/2-(R(B[0])+R(B[1]))/2)};
  let best=n>0?null:[],bc=Infinity;
  for(let it=0;it<(n>0?3000:0);it++){
    const p=shuffle(chosen.slice());let tot=0;const ms=[];
    for(let i=0;i<n;i++){const q=p.slice(i*4,i*4+4);
      const opts=[[[q[0],q[1]],[q[2],q[3]]],[[q[0],q[2]],[q[1],q[3]]],[[q[0],q[3]],[q[1],q[2]]]];
      let bo=null,bv=Infinity;for(const [A,B] of opts){const v=cost(A,B);if(v<bv){bv=v;bo=[A,B]}}
      tot+=bv;ms.push(bo)}
    if(tot<bc){bc=tot;best=ms}
  }
  let seq=D.SM.reduce((m,x)=>Math.max(m,x.seq||0),0);
  const batch=D.SB.reduce((m,x)=>Math.max(m,x.n||0),0)+1, now=Date.now(), session=D.sid;
  await write(async()=>{
    let ci=0;
    for(const pr of pick){seq++;const ct=freeCourts[ci++];await db.collection("matches").doc().set({session,seq,batch,court:ct,cn:cName(ct),preset:pr.id,a:pr.a,b:pr.b,kind:kindOf(D,{a:pr.a,b:pr.b}),sa:null,sb:null,status:"playing",createdAt:now})}
    for(let i=0;i<best.length;i++){seq++;const ct=freeCourts[ci++];await db.collection("matches").doc().set({session,seq,batch,court:ct,cn:cName(ct),a:best[i][0],b:best[i][1],kind:kindOf(D,{a:best[i][0],b:best[i][1]}),sa:null,sb:null,status:"playing",createdAt:now})}
    await db.collection("batches").doc("s"+session+"b"+batch).set({session,n:batch,sitting,createdAt:now});
    S.everWrote=true;
  },`Đã xếp ${best.length+pick.length} trận${pick.length?` (${pick.length} trận định sẵn)`:""}`);
}

function nextCode(){return S.players.reduce((m,p)=>{const n=parseInt(String(p.code||"").replace(/\D/g,""),10);return Number.isFinite(n)?Math.max(m,n):m},0)+1}
async function assignCodes(){let n=nextCode();const miss=[...S.players].filter(p=>!p.code).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  for(const p of miss){const c="PB-"+String(n++).padStart(3,"0");await db.collection("players").doc(p.id).update({code:c});p.code=c}}
