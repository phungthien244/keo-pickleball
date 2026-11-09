/* ---------- Trình 4 mức thay cho rating (canvas "Bước 0 · Làm gọn") ----------
   Người chơi tự chọn một lần; chỉ dùng để ghép cặp cân và xếp hạt giống, không hiện thành điểm số.
   Lưu ở reg.lv (chuỗi số cũ, để ghép cặp dùng làm rating0) + hồ sơ chung prof/{uid}.lv + máy. */
const LV4=[["2.5","Mới chơi","Mới cầm vợt, chưa rành luật"],["3.0","Trung bình","Đánh được, rally vài nhịp"],["3.5","Khá","Chơi đều, có chiến thuật"],["4.0","Giỏi","Thi đấu giải phong trào"]];
// Số cũ (2.0–5.0 hoặc rating) → tên mức gần nhất
const lvName=v=>{v=+v;if(!Number.isFinite(v)||v<=0)return "";return v<2.75?"Mới chơi":v<3.25?"Trung bình":v<3.75?"Khá":"Giỏi"};
const lvSnap=v=>{const n=lvName(v);return (LV4.find(x=>x[1]===n)||LV4[1])[0]};
let myLvV=null;
function myLv(){if(myLvV)return myLvV;try{const v=localStorage.getItem("pb-lv");if(LV4.some(x=>x[0]===v))myLvV=v}catch(e){}
  if(!myLvV&&!myLv.ld&&authUser&&!authUser.isAnonymous&&window.FB){myLv.ld=1;FB.getDoc(FB.doc(FB.fs,"prof/"+authUser.uid)).then(d=>{const v=d.exists()&&d.data().lv;if(LV4.some(x=>x[0]===v)){myLvV=v;try{localStorage.setItem("pb-lv",v)}catch(e){}if(drafts["gs-lv"]==null)render()}}).catch(()=>{})}
  return myLvV||""}
async function saveMyLv(v){if(!LV4.some(x=>x[0]===v))return;myLvV=v;try{localStorage.setItem("pb-lv",v)}catch(e){}
  if(authUser&&!authUser.isAnonymous&&window.FB)try{await FB.setDoc(FB.doc(FB.fs,"prof/"+authUser.uid),{lv:v,at:Date.now()})}catch(e){}}
// Ô chọn trình: đã chọn trước đây thì gọn một dòng "Trình: Khá · Sửa"
function lvPick(k="gs-lv"){
  const known=myLv(),cur=lvSnap(drafts[k]!=null?drafts[k]:(known||"3.0"));
  if(known&&drafts[k]==null&&!lvPick.open)return `<div class="lvone"><span>Trình của bạn: <b>${lvName(known)}</b></span><button class="ghost" data-act="lvopen">Sửa</button></div>`;
  return `<div class="fld lvpick"><span class="lbl">Trình của bạn${known?"":" · chọn một lần"}</span>${LV4.map(([v,t,s])=>`<button class="lvo${v===cur?" on":""}" data-act="lvpick" data-k="${k}" data-v="${v}" aria-pressed="${v===cur}"><span class="rd"></span><span class="t"><b>${t}</b><small>${s}</small></span></button>`).join("")}<span class="rule">Chỉ để ghép cặp cân sức. Không ai thấy điểm số của bạn; người tổ chức có thể chỉnh nếu chọn chưa đúng.</span></div>`;
}
// Giá trị trình gửi kèm đăng ký (và nhớ cho lần sau)
function lvOf(k="gs-lv"){const v=lvSnap(drafts[k]!=null?drafts[k]:(myLv()||"3.0"));saveMyLv(v);return v}
// Ô chọn nhanh cho người tổ chức (thêm khách, đến muộn): 4 nút
const lvSeg=(k,cur,act="hnset")=>`<div class="mxseg sm">${LV4.map(([v,t])=>`<button data-act="${act}" data-k="${k}" data-v="${v}" aria-pressed="${lvSnap(cur)===v}">${t}</button>`).join("")}</div>`;
function lvAct(act,b){
  if(act==="lvpick"){drafts[b.dataset.k||"gs-lv"]=b.dataset.v;render();return true}
  if(act==="lvopen"){lvPick.open=1;render();return true}
  return false;
}
// Thành tích thật thay cho rating: số buổi, trận, thắng, vô địch/á quân
function lvAch(D,id){
  const X=profileData(D,id),T=[];
  for(const x of [...X.ses].reverse())if(x.medal===1||x.medal===2)T.push({m:x.medal,t:x.sname||(x.giai?`Giải #${x.sid}`:`Buổi #${x.sid}`),at:x.at});
  return {ses:X.ses.length,games:X.games,wins:X.winsAll,gold:X.ses.filter(x=>x.medal===1).length,T};
}
