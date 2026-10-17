/* ----- Hủy trận có xác nhận + thùng rác để hoàn tác ----- */
const pendCancel=new Set();
const TRASH_MAX=40;
const trashItems=()=>((S.trash&&S.trash.items)||[]);
// Ghi trận vào thùng rác rồi xóa khỏi danh sách trận
async function trashMatches(list,why){
  list=list.filter(Boolean);if(!list.length)return;
  const now=Date.now(),add=list.map(m=>{const {id,...d}=m;return {id,d,why,at:now,by:who()}});
  const items=[...add,...trashItems().filter(x=>!add.some(a=>a.id===x.id))].slice(0,TRASH_MAX);
  await db.doc("app/trash").set({items});S.trash={items};
  for(const m of list)await db.collection("matches").doc(m.id).delete();
}
function findMatch(id){return S.matches.find(x=>x.id===id)||Object.values(S.pm||{}).flat().find(x=>x&&x.id===id)}
function cancelConfirm(D,m){
  if(!pendCancel.has(m.id))return "";
  return `<div class="cfm cx"><span class="r">Hủy trận <b>Sân ${m.court}</b>? Bốn người sẽ quay lại hàng chờ.</span>
    <div class="two"><button class="danger" data-act="cancelok" data-id="${m.id}">Xác nhận hủy</button><button class="line" data-act="cancelx" data-id="${m.id}">Không hủy</button></div></div>`;
}
function undoBar(){
  if(!canWrite)return "";const n=trashItems().length;if(!n)return "";
  return `<div class="undo"><span>${n} trận đã hủy hoặc xóa</span><button class="line" data-act="undoall">↶ Hoàn tác</button></div>`;
}
// Khôi phục mọi trận trong thùng rác. Trận đang đánh mà người chơi đã lên sân khác thì giữ lại.
async function undoAll(){
  const D=derive(),busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),used=new Set(D.playing.map(m=>m.court));
  const keep=[],back=[];let regiai=false;
  for(const it of trashItems()){
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
