/* ----- Hủy trận có xác nhận + thùng rác để hoàn tác ----- */
const pendCancel=new Set();
const TRASH_MAX=40;
const trashAll=()=>((S.trash&&S.trash.items)||[]);
// Chỉ hiện và hoàn tác các trận của buổi đang diễn ra
const trashItems=()=>{const sid=cfg().session||1;return trashAll().filter(x=>((x.d&&x.d.session)||1)===sid)};
// Ghi trận vào thùng rác rồi xóa khỏi danh sách trận
async function trashMatches(list,why){
  list=list.filter(Boolean);if(!list.length)return;
  const now=Date.now(),add=list.map(m=>{const {id,...d}=m;return {id,d,why,at:now,by:who()}});
  const items=[...add,...trashAll().filter(x=>!add.some(a=>a.id===x.id))].slice(0,TRASH_MAX);
  await db.doc("app/trash").set({items});S.trash={items};
  for(const m of list)await db.collection("matches").doc(m.id).delete();
}
function findMatch(id){return S.matches.find(x=>x.id===id)||Object.values(S.pm||{}).flat().find(x=>x&&x.id===id)}
function cancelConfirm(D,m){
  if(!pendCancel.has(m.id))return "";
  return `<div class="cfm cx"><span class="r">Hủy trận <b>Sân ${m.court}</b>? Bốn người sẽ quay lại hàng chờ.</span>
    <div class="two"><button class="danger" data-act="cancelok" data-id="${m.id}">Xác nhận hủy</button><button class="line" data-act="cancelx" data-id="${m.id}">Không hủy</button></div></div>`;
}
let undoOpen=false;
const WHY={cancel:"Hủy trận",del:"Xóa trận",gcancel:"Hủy lịch giải"};
function undoBar(){
  if(!canWrite)return "";const T=trashItems(),n=T.length;if(!n)return "";
  let h=`<div class="undo"><span>${n} thao tác hủy/xóa có thể hoàn tác</span><button class="line" data-act="undoopen" aria-expanded="${undoOpen}">${undoOpen?"Đóng":"↶ Hoàn tác"}</button></div>`;
  if(!undoOpen)return h;
  const D=derive(),nm=id=>esc(D.pmap.get(id)?.name||"?");
  const L=[...T].sort((a,b)=>(b.at||0)-(a.at||0));
  return h+`<div class="ulist">${L.map(it=>{const d=it.d||{};return `<div class="urow"><span class="ut"><b>${WHY[it.why]||"Xóa"} · Sân ${d.court||"?"}</b><span>${(d.a||[]).map(nm).join(" &amp; ")} – ${(d.b||[]).map(nm).join(" &amp; ")}${d.status==="done"?` <span class="num">${d.sa}–${d.sb}</span>`:""}</span><small>${hm(it.at)}${it.by?" · "+esc(it.by):""}</small></span>${armed("undoone:"+it.id)?`<button class="sm primary" data-act="undoone" data-id="${it.id}">Bấm lần nữa</button>`:`<button class="sm" data-act="undoone" data-id="${it.id}">Hoàn tác</button>`}</div>`}).join("")}
    ${n>1?`<button class="${armed("undoall:x")?"primary":"line"} wide" data-act="undoall">${armed("undoall:x")?"Bấm lần nữa để hoàn tác tất cả":`↶ Hoàn tác tất cả (${n})`}</button>`:""}</div>`;
}
// Khôi phục mọi trận trong thùng rác. Trận đang đánh mà người chơi đã lên sân khác thì giữ lại.
async function undoAll(only){
  const D=derive(),busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),used=new Set(D.playing.map(m=>m.court));
  const keep=[],back=[];let regiai=false;
  const cur=new Set(trashItems().map(x=>x.id));
  for(const it of trashAll()){
    if(!cur.has(it.id)){keep.push(it);continue}
    if(only&&it.id!==only){keep.push(it);continue}
    const d={...it.d};
    if(d.status==="playing"){
      if((d.session||1)!==D.sid||[...d.a,...d.b].some(id=>busy.has(id))){keep.push(it);continue}
      if(used.has(d.court)){let c=1;while(used.has(c))c++;if(c>D.c.courts){keep.push(it);continue}d.court=c}
      used.add(d.court);[...d.a,...d.b].forEach(id=>busy.add(id));
    }
    if(it.why==="gcancel")regiai=true;
    back.push([it.id,d]);
  }
  for(const [id,d] of back)await db.collection("matches").doc(id).set(d);
  await db.doc("app/trash").set({items:keep});S.trash={items:keep};
  if(regiai&&!(cfg().giai||{}).locked)await saveG({locked:true});
  return {n:back.length,k:keep.length};
}

/* ----- Trọng tài theo sân ----- */
// Tên trọng tài được giao sân n (chỉ ban tổ chức có danh sách; trọng tài thấy tên mình)
function refsOf(n){
  n=Number(n);const L=[...(S.members||[]).filter(m=>m.role==="scorer"&&(m.courts||[]).map(Number).includes(n)).map(m=>m.name||m.email||"Trọng tài"),
    ...(S.editors||[]).filter(e=>(e.courts||[]).map(Number).includes(n)).map(e=>e.name||"Máy PIN")];
  if(!L.length&&REF&&MYCT.includes(n))L.push("Bạn");
  return L;
}
function refTag(n){
  const L=refsOf(n);if(!L.length)return canWrite&&(S.members||S.editors)?`<span class="reft none">Chưa có trọng tài</span>`:"";
  return `<span class="reft">🧑‍⚖️ ${esc(L.join(", "))}</span>`;
}
// Trọng tài chỉ thấy các sân được giao
const myCourt=m=>!REF||MYCT.includes(Number(m.court));
