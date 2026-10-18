/* ---------- writes ---------- */
async function write(fn,okMsg){
  if(!db||!(canWrite||REF))return;
  try{await fn(); if(okMsg)toast(okMsg)}
  catch(e){
    if(e&&e.code==="permission-denied"){canWrite=false;toast("Phiên sửa đã hết quyền, nhập lại PIN.")}
    else if(e&&e.code==="quota_exceeded")toast("Dữ liệu đã đầy, hãy bắt đầu buổi mới.");
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

async function generate(){
  const D=derive(),c=D.c;
  const used=new Set(D.playing.map(m=>m.court));
  const freeCourts=[];for(let i=1;i<=c.courts;i++)if(!used.has(i))freeCourts.push(i);
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const avail=D.players.filter(p=>p.active!==false&&!busy.has(p.id)).map(p=>p.id);
  const n=Math.min(freeCourts.length,Math.floor(avail.length/4));
  if(!freeCourts.length){errs.gen="Tất cả sân đang có trận. Lưu tỉ số hoặc thêm sân trước.";return render()}
  if(n<1){errs.gen=`Cần ít nhất 4 người đang rảnh, hiện có ${avail.length}.`;return render()}
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
  let best=null,bc=Infinity;
  for(let it=0;it<3000;it++){
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
    for(let i=0;i<best.length;i++){seq++;await db.collection("matches").doc().set({session,seq,batch,court:freeCourts[i],cn:cName(freeCourts[i]),a:best[i][0],b:best[i][1],kind:kindOf(D,{a:best[i][0],b:best[i][1]}),sa:null,sb:null,status:"playing",createdAt:now})}
    await db.collection("batches").doc("s"+session+"b"+batch).set({session,n:batch,sitting,createdAt:now});
    S.everWrote=true;
  },`Đã xếp ${best.length} trận`);
}

function nextCode(){return S.players.reduce((m,p)=>{const n=parseInt(String(p.code||"").replace(/\D/g,""),10);return Number.isFinite(n)?Math.max(m,n):m},0)+1}
async function assignCodes(){let n=nextCode();const miss=[...S.players].filter(p=>!p.code).sort((a,b)=>(a.createdAt||0)-(b.createdAt||0));
  for(const p of miss){const c="PB-"+String(n++).padStart(3,"0");await db.collection("players").doc(p.id).update({code:c});p.code=c}}
