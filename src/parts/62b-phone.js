/* ---------- Số điện thoại người chơi: lấy từ Zalo (getPhoneNumber → máy chủ đổi token) hoặc tự nhập ----------
   Lưu riêng contacts/{uid} = {phone, at, src}: chỉ chính người đó và chủ CLB, quản lý đọc được. */
let phBusy=false,phSrc="";
const phNorm=s=>{let d=String(s||"").replace(/\D/g,"");if(d.startsWith("84")&&d.length===11)d="0"+d.slice(2);return /^0\d{9}$/.test(d)?d:""};
const phFmt=s=>{const d=phNorm(s);return d?`${d.slice(0,4)} ${d.slice(4,7)} ${d.slice(7)}`:String(s||"")};
const myPhone=()=>S.myPhone||"";
function loadMyPhone(){
  if(!authUser||!isPlayer(authUser)||MODE!=="club"||legacy||S.myPhone!==undefined||!window.FB||!FB.getDoc)return;
  S.myPhone=null;FB.getDoc(FB.doc(FB.fs,PFX+"contacts/"+authUser.uid)).then(s=>{S.myPhone=s.exists()?String(s.data().phone||""):"";render()}).catch(()=>{S.myPhone=""});
}
const phOfUid=uid=>uid&&S.contacts?S.contacts[uid]||"":"";
const phTag=uid=>{const p=phOfUid(uid);return p?`<a class="phtag" href="tel:${p}" data-act="phcall" data-v="${p}">📞 ${phFmt(p)}</a>`:""};
function phBox(){
  loadMyPhone();
  const Z=window.ZMP,cur=val("ph",myPhone());
  return `<div class="phbox"><span class="lbl">Số điện thoại <small>· chỉ ban tổ chức thấy</small></span>
    ${Z&&Z.getPhoneNumber?`<button class="zalobtn" data-act="phzalo" ${phBusy?"disabled":""}><b>Z</b>${phBusy?"Đang lấy số…":"Dùng số điện thoại Zalo"}</button>`:""}
    <label class="fld"><span class="sr">Số điện thoại</span><input id="ph" data-draft="ph" type="tel" inputmode="tel" maxlength="14" autocomplete="tel" placeholder="${Z?"Hoặc tự nhập: 09xx xxx xxx":"09xx xxx xxx"}" value="${esc(cur)}"></label>
    ${errs.ph?`<p class="err">${esc(errs.ph)}</p>`:""}<small class="rule">Ban tổ chức gọi khi đổi giờ, đổi sân hoặc cần xác nhận phí. Không hiện cho người khác.</small></div>`;
}
// Lấy số trong ô (hoặc số đã lưu), kiểm tra, lưu nếu mới (không chờ, để không lệch ngữ cảnh giải đang mở). Trả "" nếu thiếu/sai
function phTake(){
  const el=document.getElementById&&document.getElementById("ph"),v=phNorm((el&&el.value)||drafts.ph||myPhone());
  if(!v){errs.ph="Nhập số điện thoại 10 số, ví dụ 0901234567.";render();return ""}
  delete errs.ph;delete drafts.ph;
  if(v!==myPhone()){S.myPhone=v;FB.setDoc(FB.doc(FB.fs,PFX+"contacts/"+authUser.uid),{phone:v,at:Date.now(),src:phSrc==="zalo"?"zalo":"tay"}).catch(()=>{S.myPhone="";toast("Chưa lưu được số điện thoại, thử lại.")})}
  return v;
}
async function phAct(act,b){
  if(act==="phcall"){const Z=window.ZMP;if(Z&&Z.openPhone){try{await Z.openPhone({phoneNumber:b.dataset.v});return true}catch(e){}}location.href="tel:"+b.dataset.v;return true}
  if(act!=="phzalo")return false;
  const Z=window.ZMP;if(!Z||!Z.getPhoneNumber)return true;
  phBusy=true;render();
  try{
    const r=await Z.getPhoneNumber(),code=r&&r.token;let num=phNorm(r&&r.number);
    if(!num&&code){
      if(window.FB_TARGET==="mock")num="0901234567";
      else{let at="";try{at=await Z.getAccessToken()}catch(e){}
        const j=await fetch(API+"/api/zalo-phone",{method:"POST",headers:{"content-type":"text/plain"},body:JSON.stringify({code,at})}).then(x=>x.json()).catch(()=>({}));
        num=phNorm(j.number);if(!num&&j.error)console.warn("zalo-phone",j.error)}}
    if(num){drafts.ph=num;phSrc="zalo";delete errs.ph;toast("Đã điền số điện thoại Zalo")}
    else toast("Zalo chưa trả số điện thoại. Bạn nhập tay giúp nhé.");
  }catch(e){toast("Chưa lấy được số từ Zalo. Bạn nhập tay giúp nhé.")}
  phBusy=false;render();return true;
}
