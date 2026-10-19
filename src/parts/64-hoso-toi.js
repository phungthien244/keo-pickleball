/* ---------- Người chơi tự sửa hồ sơ (Mini App): ảnh, biệt danh, giới thiệu, tay thuận, vợt ---------- */
const myPid=()=>S.link&&S.link.status==="ok"?S.link.pid:null;
const HAND={R:"Tay phải",L:"Tay trái"};
let meEdit=false;
// Thông tin thêm trên trang hồ sơ (ai cũng xem được)
function proExtra(p){
  const it=[p.nick&&`“${esc(p.nick)}”`,p.hand&&HAND[p.hand],p.paddle&&`Vợt ${esc(p.paddle)}`,p.since&&`Chơi từ ${esc(p.since)}`].filter(Boolean);
  return (it.length?`<div class="pxtra">${it.map(x=>`<span>${x}</span>`).join("")}</div>`:"")+(p.bio?`<p class="pbio">${esc(p.bio)}</p>`:"");
}
// Nút và form sửa hồ sơ của chính mình
function proEdit(D,id){
  if(id!==myPid()||canWrite)return "";
  const p=D.pmap.get(id);if(!p)return "";
  if(!meEdit)return `<button class="line wide" data-act="meedit">✎ Chỉnh sửa hồ sơ của bạn</button>`;
  const v=(k,d)=>esc(val("me-"+k,p[k]??d??""));
  return card("Chỉnh sửa hồ sơ",`<div class="logoed"><span class="clogo big">${av(p,"lg",1)}</span><span class="t"><label class="lnkbtn">${p.photo?"Đổi ảnh đại diện":"Thêm ảnh đại diện"}<input type="file" accept="image/*" data-myphoto="1" class="sr"></label>${p.photo?`<button class="ghost danger" data-act="mephotodel">Xoá ảnh</button>`:""}<small class="rule">Ảnh vuông, app tự thu nhỏ.</small></span></div>
    <label class="fld"><span class="lbl">Biệt danh (không bắt buộc)</span><input id="me-nick" data-draft="me-nick" maxlength="30" value="${v("nick")}" placeholder="Sát thủ lưới"></label>
    <label class="fld"><span class="lbl">Giới thiệu bản thân</span><textarea id="me-bio" data-draft="me-bio" maxlength="300" rows="3" placeholder="Chơi vui là chính, thích đánh đôi nam nữ">${v("bio")}</textarea></label>
    <div class="fld"><span class="lbl">Tay thuận</span><span class="seg"><button data-act="mehand" data-v="R" aria-pressed="${val("me-hand",p.hand||"")==="R"}">Phải</button><button data-act="mehand" data-v="L" aria-pressed="${val("me-hand",p.hand||"")==="L"}">Trái</button></span></div>
    <div class="form"><label class="fld"><span class="lbl">Vợt đang dùng</span><input id="me-paddle" data-draft="me-paddle" maxlength="60" value="${v("paddle")}" placeholder="Joola Perseus"></label>
    <label class="fld"><span class="lbl">Chơi từ năm</span><input id="me-since" data-draft="me-since" inputmode="numeric" maxlength="4" value="${v("since")}" placeholder="2024"></label></div>
    <small class="rule">Tên trong CLB và trình độ do chủ CLB quản lý.</small>
    <div class="two"><button class="line" data-act="meedit">Huỷ</button><button class="primary" data-act="mesave">Lưu hồ sơ</button></div>`);
}
// Nút góc phải trên Mini App: ảnh của mình → trang hồ sơ
function miniHact(D){
  const pid=myPid(),p=pid&&D.pmap.get(pid);
  if(p)return `<a class="mehact" href="${pathOf("vdv",{pid})}" data-go="vdv" data-pid="${esc(pid)}" aria-label="Hồ sơ của bạn">${av(p,"sm",1)}<span>Hồ sơ</span></a>`;
  return `<a class="mehact" href="${pathOf("app",{tab:"dk"})}" data-go="app" data-t="dk"><span>Hồ sơ</span></a>`;
}
async function meAct(act,b){
  if(act==="meedit"){meEdit=!meEdit;["nick","bio","hand","paddle","since"].forEach(k=>delete drafts["me-"+k]);render();return true}
  if(act==="mehand"){drafts["me-hand"]=b.dataset.v;render();return true}
  if(act==="mephotodel"){const pid=myPid();if(!pid||!armOr("mephotodel:x"))return true;try{await FB.updateDoc(FB.doc(FB.fs,PFX+"players/"+pid),{photo:""});toast("Đã xoá ảnh")}catch(e){toast("Chưa xoá được, thử lại.")}return true}
  if(act==="mesave"){const pid=myPid(),p=pid&&derive().pmap.get(pid);if(!p)return true;
    const rd=k=>{const el=document.getElementById&&document.getElementById("me-"+k);return String((el&&el.value!=null&&el.value!==""?el.value:drafts["me-"+k])??p[k]??"").trim()};
    const since=rd("since").replace(/\D/g,"").slice(0,4);
    if(since&&(+since<1960||+since>new Date().getFullYear())){toast("Năm bắt đầu chơi chưa đúng.");return true}
    const d={nick:rd("nick").slice(0,30),bio:rd("bio").slice(0,300),paddle:rd("paddle").slice(0,60),since,hand:["R","L"].includes(val("me-hand",p.hand||""))?val("me-hand",p.hand):""};
    try{await FB.updateDoc(FB.doc(FB.fs,PFX+"players/"+pid),d);meEdit=false;["nick","bio","hand","paddle","since"].forEach(k=>delete drafts["me-"+k]);toast("Đã lưu hồ sơ");render()}catch(e){toast("Chưa lưu được, thử lại.")}
    return true}
  return false;
}
