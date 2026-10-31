/* ---------- Giải · Mini App (Quản lý) theo canvas trang gc ----------
   Dòng cài đặt + bảng trượt: dùng chung cho "Tuỳ chọn thêm" lúc tạo giải (T4, T5) và "Sửa giải" (S1–S4).
   Mỗi dòng: biểu tượng · tên · giá trị hiện tại · ›. Chạm mở bảng nhỏ có nút ô to và "✓ Lưu".
   Giá trị đọc/ghi qua bản nháp form giải (xv, drafts["xf-…"]); sửa giải lưu ngay khi bấm ✓ Lưu. */
let gsOpt=null,gsPg=null,gsDO=false,gsTO=false;
const gsOnV=v=>String(v)==="1"||v===true;
// Ô chọn: [[giá trị, nhãn]], act mặc định xfset
const gsChips=(k,L,cur,cols,act="xfset")=>`<div class="gmchips c${cols||L.length}">${L.map(([v,l])=>`<button class="gmchip${String(cur)===String(v)?" on":""}" data-act="${act}" data-k="${k}" data-v="${esc(v)}" aria-pressed="${String(cur)===String(v)}">${l}</button>`).join("")}</div>`;
const gsStep=(D,k,t,s,min,max,d=1)=>`<div class="gmstp"><span><b>${t}</b>${s?`<small>${s}</small>`:""}</span><span class="stepper big"><button data-act="xfstep" data-k="${k}" data-d="-${d}" data-min="${min}" data-max="${max}" aria-label="Bớt">−</button><b class="num">${esc(xv(D,k))}</b><button data-act="xfstep" data-k="${k}" data-d="${d}" data-min="${min}" data-max="${max}" aria-label="Thêm">＋</button></span></div>`;
const gsIn=(D,k,l,a="")=>`<label class="fld gmsm"><span class="lbl">${l}</span><input id="xf-${k}" data-draft="xf-${k}" value="${esc(xv(D,k))}" ${a}></label>`;
const gsLb=t=>`<span class="gmlb">${t}</span>`;
const gsSw=(D,k,t)=>{const on=gsOnV(xv(D,k));return `<div class="gssw"><span>${t}</span><button class="xsw${on?" on":""}" data-act="xfset" data-k="${k}" data-v="${on?"0":"1"}" role="switch" aria-checked="${on}" aria-label="${esc(t)}"><i></i></button></div>`};
const gsFee=D=>{const v=k=>xv(D,k),cp=gsOnV(v("cp")),thu=v("thu");return cp?(thu==="phi"?+v("phi")||0:+v("fee")||0):0};
const GS_THU={phi:"Cố định",deu:"Chia đều sân",keo:"Ai thua góp"};
// Tất cả dòng cài đặt
function gsDefs(D,X){
  const v=k=>xv(D,k),on=k=>gsOnV(v(k)),fmt=X?X.fmt:(xNew==="giai"||xNew==="bang"?"giai":"xoay"),G=fmt==="giai",days=String(v("days")).split(",").filter(Boolean).map(Number);
  const fee=gsFee(D),fc=!on("cp")?"0":[0,50,60,100].includes(fee)?String(fee):"khac",thu=v("thu");
  const paidN=X?withX(X,()=>regList(D).all.filter(r=>r.pay==="ok").length):0;
  const d=v("date"),t=d?new Date(d+"T12:00").getTime():0;
  const pst=xfPoster?(xfPoster.del?null:xfPoster.out||xfPoster.src):(X&&X.poster);
  return {
    name:{i:"✏",t:"Tên giải",val:v("name")||"—",body:()=>gsIn(D,"name","Tên giải",'maxlength="60"')},
    when:{i:"🗓",t:"Ngày, giờ",val:[t?`${dowVN(t)} ${dmy(t).slice(0,5)}`:"",v("time")&&`${v("time")}${v("end")?"–"+v("end"):""}`].filter(Boolean).join(" · ")||"—",
      body:()=>`<div class="form">${gsIn(D,"date","Ngày",'type="date"')}${gsIn(D,"time","Bắt đầu",'type="time"')}${gsIn(D,"end","Kết thúc",'type="time"')}</div>`},
    place:{i:"📍",t:"Sân",val:v("place")||"Chưa có",body:()=>gsIn(D,"place","Tên sân",'maxlength="60" placeholder="📍 Sân Kỳ Hòa, Q10"')+gsIn(D,"map","Link Google Maps · không bắt buộc",'type="url" maxlength="300"')},
    max:{i:"🎟",t:"Số chỗ",val:+v("max")?`${v("max")} chỗ`:"Không giới hạn",body:()=>gsStep(D,"max",G?"Tối đa bao nhiêu người?":"Tối đa bao nhiêu người?","0 là không giới hạn",0,200,2)},
    courts:{i:"🏟",t:"Số sân",val:`${v("courts")} sân`,body:()=>gsStep(D,"courts","Mấy sân?","Mỗi sân 4 người một lúc",1,30)},
    lv:{i:"🎯",t:"Trình độ",val:v("lvMin")||v("lvMax")?`${v("lvMin")||"…"} – ${v("lvMax")||"…"}`:"Mọi trình",
      body:()=>`<div class="form">${gsIn(D,"lvMin","Trình từ",'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="2.5"')}${gsIn(D,"lvMax","đến",'type="number" step="0.5" min="1" max="8" inputmode="decimal" placeholder="4.0"')}</div><small class="rule">Để trống là ai cũng đăng ký được.</small>`},
    guests:{i:"🧑‍🤝‍🧑",t:"VĐV ngoài CLB",val:on("guests")?`Nhận${v("feeG")!==""?` · ${fmtK(+v("feeG")||0)}`:fee?` · ${fmtK(fee)}`:""}`:"Chỉ thành viên",
      body:()=>gsChips("guests",[["0","Chỉ thành viên"],["1","Nhận VĐV ngoài CLB"]],on("guests")?"1":"0",2)+(on("guests")?gsIn(D,"feeG","Lệ phí VĐV ngoài CLB (k) · để trống là như thành viên",'type="number" min="0" inputmode="numeric"'):"")},
    pay:{i:"💳",t:"Chuyển khoản khi đăng ký",val:{off:"Không",opt:"Tuỳ chọn",req:"Bắt buộc"}[v("pay")]||"Không",
      body:()=>gsChips("pay",[["off","Không"],["opt","Tuỳ chọn"],["req","Bắt buộc"]],v("pay")||"off",3)+(v("pay")!=="off"&&!(BANK&&BANK.acc)?`<small class="rule" style="color:var(--lose)">Cần khai ngân hàng nhận tiền ở Thêm › Nhận tiền.</small>`:`<small class="rule">Bắt buộc: chưa chuyển khoản thì không giữ chỗ.</small>`)},
    dl:{i:"⏰",t:"Đóng đăng ký",val:+v("dlH")?`${v("dlH")} giờ trước`:"Lúc bắt đầu",
      body:()=>gsStep(D,"dlH","Đóng đăng ký trước giờ đánh","giờ",0,72)+gsStep(D,"lockH","Không cho huỷ trước giờ đánh","giờ",0,72)},
    luat:{i:"🏓",t:"Luật điểm",val:[`Chạm ${v("target")}`,on("win2")?"cách 2":"",+v("ptMax")?`trần ${v("ptMax")}`:""].filter(Boolean).join(" · "),
      body:()=>gsLb("Đánh tới mấy điểm")+gsChips("target",[["11","11"],["15","15"],["21","21"]],v("target"),3)+gsSw(D,"win2","Phải thắng cách 2 điểm")
        +(on("win2")?gsLb("Điểm trần (thắng cách 2 mà kéo dài)")+gsChips("ptMax",[["0","Không"],["15","15"],["21","21"]],String(+v("ptMax")||0),3):"")},
    gt:{i:"🏆",t:"Giải thưởng",val:!on("gton")?"Tắt":v("gt")==="hang"?`Nhất ${fmtK(+v("h1")||0)} · Nhì ${fmtK(+v("h2")||0)}`:(GT[v("gt")]||"Bật"),
      body:()=>{const gt=v("gt"),top3=G||gt==="hang"||v("trao")==="top3";
        return gsChips("gton",[["0","Tắt"],["1","Có giải thưởng"]],on("gton")?"1":"0",2)+(!on("gton")?"":gsLb("Lập quỹ giải")+gsChips("gt",(G?["hang","trich","gop"]:["hang","trich","codinh","gop"]).map(x=>[x,GT[x]]),gt,2)
          +(!G&&gt!=="hang"?gsLb("Trao cho")+gsChips("trao",[["namnu","Số 1 nam & nữ"],["top3","Hạng 1, 2, 3"]],v("trao"),2):"")
          +(gt==="hang"?`<div class="form f3">${gsIn(D,"h1","Nhất (k)",'type="number" min="0" inputmode="numeric"')}${gsIn(D,"h2","Nhì (k)",'type="number" min="0" inputmode="numeric"')}${gsIn(D,"h3","Ba (k)",'type="number" min="0" inputmode="numeric"')}</div>`
            :gsIn(D,"gtv",gt==="trich"?"Trích bao nhiêu % phần dư":gt==="codinh"?"Quỹ CLB bỏ ra (k)":"Mỗi người góp thêm (k)",'type="number" min="0" inputmode="numeric"')+(top3?`<div class="form f3">${gsIn(D,"c1","Nhất %",'type="number" min="0" inputmode="numeric"')}${gsIn(D,"c2","Nhì %",'type="number" min="0" inputmode="numeric"')}${gsIn(D,"c3","Ba %",'type="number" min="0" inputmode="numeric"')}</div>`:"")))}},
    rep:{i:"↻",t:"Lặp hằng tuần",val:v("rep")==="1"?`Mỗi ${days.slice().sort((a,b)=>((a+6)%7)-((b+6)%7)).map(d=>DOW[d]).join(" & ")||"…"}`:"Không",
      body:()=>gsChips("rep",[["0","Không lặp"],["1","Lặp hằng tuần"]],v("rep")==="1"?"1":"0",2)+(v("rep")!=="1"?"":`<div class="xdays">${[1,2,3,4,5,6,0].map(d=>`<button data-act="xfday" data-v="${d}" aria-pressed="${days.includes(d)}">${DOW[d]}</button>`).join("")}</div>`
        +gsLb("Mở đăng ký cho các giải lặp")+gsChips("auto",[["1","Tự mở"],["0","Tôi tự bấm mở"]],v("auto")==="0"?"0":"1",2)+(v("auto")!=="0"?gsStep(D,"openD","Tự mở trước giờ đánh","ngày",1,7):""))},
    poster:{i:"🖼",t:"Ảnh bìa",val:pst?"Đã có":"Chưa có",body:()=>xPosterField()},
    note:{i:"📝",t:"Ghi chú cho người chơi",val:String(v("note")||"").trim().slice(0,24)||"—",body:()=>`<label class="fld"><span class="sr">Ghi chú</span><textarea id="xf-note" data-draft="xf-note" maxlength="300" rows="3" placeholder="Mang giày đế bằng, CLB có bóng">${esc(v("note"))}</textarea></label>`},
    fee:{i:"💵",t:"Lệ phí thành viên",val:fee?fmtK(fee):"Miễn phí",
      body:()=>gsChips("",[["0","Miễn phí"],["50","50k"],["60","60k"],["100","100k"]],fc,4,"xqfee")+`<label class="fld gmsm"><span class="lbl">Số khác (k)</span><input id="xf-${thu==="phi"?"phi":"fee"}" data-draft="xf-${thu==="phi"?"phi":"fee"}" type="number" min="0" inputmode="numeric" value="${esc(fee||"")}"></label>`
        +(paidN?`<small class="rule">${paidN} người đã trả ${fmtK(X?xFee(X):fee)}. Đổi giá chỉ áp cho người đăng ký sau.</small>`:"")},
    feeG:{i:"🧑‍🤝‍🧑",t:"Lệ phí VĐV ngoài CLB",val:v("feeG")!==""?fmtK(+v("feeG")||0):"Như thành viên",body:()=>gsIn(D,"feeG","Lệ phí VĐV ngoài CLB (k) · để trống là như thành viên",'type="number" min="0" inputmode="numeric"')},
    thu:{i:"🧮",t:"Cách thu",val:GS_THU[thu]||"Cố định",body:()=>gsChips("thu",(G?[["phi","Cố định"]]:[["phi","Cố định"],["deu","Chia đều sân"],["keo","Ai thua góp"]]),thu,G?1:3)},
    incl:{i:"🧾",t:"Lệ phí gồm",val:v("incl")||"—",body:()=>gsIn(D,"incl","Lệ phí gồm những gì",'maxlength="120" placeholder="Sân, bóng, nước"')},
    gmode:{i:"⚥",t:"Ưu tiên ghép",val:v("gmode")==="same"?"Cùng giới":"Khác giới",body:()=>gsChips("gmode",[["mix","Khác giới"],["same","Cùng giới"]],v("gmode")==="same"?"same":"mix",2)},
    dt:{i:"👫",t:"Nội dung",val:DT_LB[v("dt")||"free"],body:()=>gsChips("dt",[["free","Hỗn hợp"],["MM","Đôi nam"],["FF","Đôi nữ"],["mix","Nam nữ"]],v("dt")||"free",4)},
    ko:{i:"▦",t:"Thể thức",val:`${v("koN")||4} bảng · ${koRName(+v("koQ")||8).toLowerCase()}`,body:()=>kbKoBody(D),save:"✓ Lưu thể thức"},
    pairReg:{i:"🤝",t:"Cách đăng ký",val:v("pairReg")==="pair"?"Theo cặp":"Từng người",body:()=>gsChips("pairReg",[["pair","Theo cặp"],["solo","Từng người, BTC ghép"]],v("pairReg")==="pair"?"pair":"solo",2)}
  };
}
const GS_NEW=["lv","guests","pay","dl","luat","gt","rep","poster","note"];
const gsRow=(k,o,act="gsopt")=>`<button class="gmli gsrow" data-act="${act}" data-v="${k}"><i>${o.i}</i><span class="t"><b>${o.t}</b></span><em>${esc(o.val)}</em><span aria-hidden="true">›</span></button>`;
function gsSheet(D,X){
  if(!gsOpt)return "";const o=gsDefs(D,X)[gsOpt];if(!o){gsOpt=null;return ""}
  return `<div class="mxdim" data-act="gsx"></div><div class="mxsheet gmsh gssh" role="dialog" aria-label="${esc(o.t)}"><span class="grab"></span><b class="mxh">${o.t}</b>${o.body()}${errs.xf?`<p class="err">${esc(errs.xf)}</p>`:""}<button class="ball go wide" data-act="gsok">${o.save||"✓ Lưu"}</button></div>`;
}
// T4 · Tuỳ chọn thêm (lúc tạo giải)
function gsNewPage(D){
  const T=gsDefs(D,null),nm=String(xv(D,"name")||"").trim()||gmAutoName(D);
  mxDr({t:"Tuỳ chọn thêm",back:"gspgx",sub:esc(nm)});
  return `<div class="gmlist">${(xNew==="bang"?GS_KB:GS_NEW).map(k=>gsRow(k,T[k])).join("")}</div><small class="rule">Để nguyên cũng được: app đã điền sẵn theo giải trước.</small>
    <div class="hqcta"><button class="ball" data-act="gspgx">Xong</button></div>`+gsSheet(D,null);
}
// S1–S4 · Sửa giải (Mini App, giải trong lịch)
const GS_GRP={info:["name","when","place","max","dl","lv","poster","note"],nguoi:["guests","dt","pairReg"],tien:["fee","feeG","thu","pay","gt","incl"],luat:["courts","luat","gmode"]};
function gsEditVals(D,X){
  const T=gsDefs(D,X),v=k=>xv(D,k),G=X.fmt==="giai",fee=gsFee(D);
  return {info:`${X.at?`${DOW[new Date(X.at).getDay()]} ${hm(X.at)}`:""}${+v("max")?` · ${v("max")} chỗ`:""}`,nguoi:gsOnV(v("guests"))?"Nhận VĐV ngoài":"Chỉ thành viên",
    tien:`${fee?fmtK(fee):"miễn phí"} · ${gsOnV(v("gton"))?"có giải":"không giải"}`,luat:`${v("courts")} sân · chạm ${v("target")}`,tt:"Loa, QR trọng tài",khac:"Mẫu, nhân bản, huỷ"};
}
function gsEdit(D,X,cur){
  const nm=xName(X),G=X.fmt==="giai";
  if(!gmSec){
    const V=gsEditVals(D,X);mxDr({t:"Sửa giải",back:"gmeditx",sub:esc(nm)});
    return `<div class="gmlist">${GM_ED.map(([k,i,t])=>`<button class="gmli gsrow" data-act="gmsec" data-v="${k}"><i>${i}</i><span class="t"><b>${t}</b></span><em>${esc(V[k]||"")}</em><span aria-hidden="true">›</span></button>`).join("")}</div>
      <small class="rule">Sửa lúc nào cũng được, kể cả khi đang đánh. Người đã đăng ký thấy ngay thay đổi.</small>`;
  }
  const g=GM_ED.find(x=>x[0]===gmSec);mxDr({t:g?g[2]:"Sửa giải",back:"gmsecx",sub:esc(nm)});
  if(gmSec==="khac"){const s=xState(X),R=withX(X,()=>regList(D)),it=(i,t,sb,a,red)=>`<button class="gmli" data-act="${a}" data-id="${esc(X.id)}"><i>${i}</i><span class="t"><b${red?` class="red"`:""}>${t}</b><small>${sb}</small></span><span aria-hidden="true">›</span></button>`;
    return `<div class="gmlist">${it("⭐",X.tpl?"Bỏ khỏi mẫu":"Lưu làm mẫu",X.tpl?"Đang là mẫu":"Tạo giải sau chỉ cần chọn mẫu","xbtpl")}${it("⧉","Nhân bản giải","Cùng cài đặt, chọn ngày mới","xbdup")}${it("📣","Gửi thông báo vào nhóm","Đổi giờ, đổi sân…","xbshare")}</div>
      <span class="gmlb">Vùng cẩn thận</span><div class="gmlist">${s==="open"?it("⏸","Tạm dừng đăng ký","Mở lại được","xpause"):s==="draft"||s==="plan"?it("▶","Mở đăng ký","Người chơi thấy và đăng ký được","xopen"):""}${s!=="cancel"&&s!=="done"&&s!=="live"?it("✕","Huỷ giải","Nhắn người đã đăng ký, hoàn tiền","xcancel",1):""}${!R.all.length&&s!=="live"?it("🗑","Xoá giải","Chỉ khi chưa ai đăng ký","xdel",1):""}</div>`+withX(X,()=>xbSheets(D,X,R));
  }
  // Giải đang ở sân hôm nay: người chơi, tiền, sân, trọng tài sửa trên giải đang chạy
  if(cur&&gmSec!=="info"||gmSec==="tt"){const f={nguoi:hqNguoi,tien:hqTien,luat:hqLuat,tt:hqTT}[gmSec];return f?f(D):""}
  const T=gsDefs(D,X),L=(GS_GRP[gmSec]||[]).filter(k=>!(G&&k==="gmode")&&!(!G&&(k==="dt"||k==="pairReg"))&&!(k==="rep"));
  return `<div class="gmlist">${L.map(k=>gsRow(k,T[k])).join("")}</div>`+gsSheet(D,X);
}
async function gsAct(act,b){
  const D=derive(),v=b.dataset.v;
  if(act==="gsk"){if(v==="d")gsDO=!gsDO;else gsTO=!gsTO;render();return true}
  if(act==="gspg"){gsPg="opt";gsOpt=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="gspgx"){gsPg=null;gsOpt=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="gsopt"){gsOpt=v;delete errs.xf;render();return true}
  if(act==="gsx"){if(xEdit&&!xNew)xClearDraft();gsOpt=null;delete errs.xf;render();return true}
  if(act==="gsok"){
    const rd=k=>{const el=document.getElementById&&document.getElementById("xf-"+k);if(el&&el.value!=null)drafts["xf-"+k]=el.value};
    for(const k of ["name","date","time","end","place","map","lvMin","lvMax","feeG","fee","phi","incl","note","h1","h2","h3","gtv","c1","c2","c3"])rd(k);
    if(gsOpt==="luat")drafts["xf-adv"]="1";
    if(gsOpt==="ko")drafts["xf-koTouched"]="1";
    if(gsOpt==="note")drafts["xf-noteOn"]=String(drafts["xf-note"]||"").trim()?"1":"0";
    if(gsOpt==="lv"||gsOpt==="guests"||gsOpt==="dl")drafts["xf-reg"]="1";
    if(gsOpt==="fee"){const f=+(drafts["xf-phi"]||drafts["xf-fee"]||0);if(f>0){drafts["xf-cp"]="1";drafts["xf-phi"]=String(f);drafts["xf-fee"]=String(f)}}
    if(xEdit&&!xNew){const id=xEdit;await xSave(D,"save");if(errs.xf){xEdit=id;render();return true}xEdit=id;xClearDraft()}
    gsOpt=null;render();return true}
  return false;
}

/* ----- Chặng Đăng ký (R1–R5, P1) ----- */
const g2Tag=(t,k)=>`<span class="g2tag ${k}">${t}</span>`;
const g2Stat=L=>`<div class="g2st">${L.map(([v,l,c])=>`<span><b class="num"${c?` style="color:${c}"`:""}>${v}</b><small>${l}</small></span>`).join("")}</div>`;
function g2PayTag(x,k,po){
  if(x.cancel)return g2Tag(x.pay==="refund"?"ĐÃ HOÀN":x.pay==="ok"||x.pay==="sent"?"CẦN HOÀN":"ĐÃ HUỶ",x.pay==="ok"||x.pay==="sent"?"r":"");
  if(!po||!k)return "";return x.pay==="ok"?g2Tag("ĐÃ TRẢ","g"):x.pay==="sent"?g2Tag("BÁO CHUYỂN","b"):g2Tag("CHƯA TRẢ","y");
}
function g2Row(D,X,x,wait){
  const p=x.pid&&D.pmap.get(x.pid),lv=xbLv(D,x),sub=[x.guest?"ngoài CLB":"thành viên",lv?r2(lv):""].filter(Boolean).join(" · ");
  return `<button class="g2p" data-act="xbsel" data-id="${esc(x.id)}">${av(p||{name:xbName(D,x)},"sm",1)}<span class="t"><b>${esc(xbName(D,x))}</b><small>${esc(sub)}</small></span>${wait?g2Tag("CHỜ CHỖ","y"):g2PayTag(x,feeOf(x),payOn())}</button>`;
}
function gmRegV(D,X){
  if(kOn(X))return kRegV(D,X);
  return withX(X,()=>{
    const R=regList(D),po=payOn(),s=xState(X),cap=pairRegOn(X),cancel=(S.regs||[]).filter(r=>r.sid===X.id&&r.cancel);
    const paid=R.all.filter(x=>x.pay==="ok").length,unpaid=R.all.filter(x=>po&&feeOf(x)>0&&x.pay!=="ok");
    let h="",main="";
    const solo=cap?R.conf.filter(x=>!capMate(x)):[];
    if(cap){const pairs=new Set(R.conf.filter(x=>capMate(x)).map(x=>x.team));h+=g2Stat([[pairs.size,"Cặp"],[solo.length,"Người lẻ",solo.length?"#b45309":""],[paid,"Đã trả","#15803d"]])}
    else h+=g2Stat([[`${R.conf.length}${R.max<999?`/${R.max}`:""}`,"Đăng ký"],[paid,"Đã trả","#15803d"],[R.wait.length,"Chờ chỗ","#b45309"]]);
    const n=gmNext(D,X);
    if(cap&&solo.length>1)h+=gmNextBox({t:`${solo.length} người chưa có cặp`,s:"Ghép tự động theo trình, hoặc chạm để ghép tay"},false);
    else if(s!=="cancel"&&s!=="done")h+=gmNextBox(n,false);
    if(cap){
      const seen=new Set();let L="";
      for(const x of R.conf){if(seen.has(x.id))continue;const m=capMate(x);seen.add(x.id);
        if(m){seen.add(m.id);const pa=x.pid&&D.pmap.get(x.pid),pb=m.pid&&D.pmap.get(m.pid);
          L+=`<button class="g2p" data-act="xbsel" data-id="${esc(x.id)}"><span class="g2av2">${av(pa||{name:xbName(D,x)},"sm",1)}${av(pb||{name:xbName(D,m)},"sm",1)}</span><span class="t"><b>${esc(xbName(D,x))} &amp; ${esc(xbName(D,m))}</b><small>${esc([DT_LB[X.dt||"free"].toLowerCase(),r2((xbLv(D,x)+xbLv(D,m))/2)].join(" · "))}</small></span>${po&&feeOf(x)?(x.pay==="ok"&&m.pay==="ok"?g2Tag("ĐÃ TRẢ","g"):g2Tag("CHƯA TRẢ","y")):""}</button>`}
        else{const p=x.pid&&D.pmap.get(x.pid);L+=`<button class="g2p" data-act="xbsel" data-id="${esc(x.id)}">${av(p||{name:xbName(D,x)},"sm",1)}<span class="t"><b>${esc(xbName(D,x))}</b><small>chưa có cặp</small></span>${g2Tag("LẺ","y")}</button>`}}
      h+=`<div class="g2list">${L||`<p class="rule">Chưa có ai đăng ký.</p>`}</div>`;
      if(solo.length>1&&s!=="cancel"&&s!=="done")main=`<button class="ball go" data-act="gmautopair" data-id="${esc(X.id)}">🔀 Ghép tự động ${solo.length} người lẻ</button>`;
    }else{
      const fl=[["all",`Tất cả ${R.all.length}`],["chua",`Chưa trả ${unpaid.length}`,po],["cho",`Chờ chỗ ${R.wait.length}`],["huy",`Đã huỷ ${cancel.length}`]].filter(f=>f[2]!==false);
      if(!fl.some(f=>f[0]===xbFl))xbFl="all";
      h+=`<div class="g2fl" role="group" aria-label="Lọc danh sách">${fl.map(([k,l])=>`<button data-act="xbfl" data-v="${k}" aria-pressed="${xbFl===k}">${l}</button>`).join("")}</div>`;
      const L=xbFl==="huy"?cancel:xbFl==="chua"?unpaid:xbFl==="cho"?R.wait:R.all,wset=new Set(R.wait.map(x=>x.id));
      h+=`<div class="g2list">${L.length?L.map(x=>g2Row(D,X,x,xbFl!=="cho"&&wset.has(x.id))).join(""):`<p class="rule">Không có ai trong mục này.</p>`}</div>`;
    }
    const today=X.at&&sameDay(X.at,Date.now());
    if(!main){if(s==="draft"||s==="plan")main=`<button class="ball go" data-act="xopen" data-id="${esc(X.id)}">Mở đăng ký</button>`;
      else if(s==="open"&&!today)main=`<button class="ball go" data-act="regshare" data-id="${esc(X.id)}">📣 Gửi nhắc vào nhóm</button>`;
      else if(s!=="done"&&s!=="cancel")main=`<button class="ball" data-act="gmst" data-v="1">Sang Ngày đánh ›</button>`}
    if(s!=="done"&&s!=="cancel")h+=`<div class="hqcta two"><button class="btn-line gmdot" data-act="xbmenu" aria-label="Thêm việc">⋯</button>${main}</div>`;
    return h+g2Sheets(D,X,R);
  });
}
function g2Sheets(D,X,R){
  if(xbShare)return xbShareView(D,X,R);
  if(xbSel){const x=(S.regs||[]).find(r=>r.id===xbSel);if(!x){xbSel=null;return ""}return g2Person(D,X,R,x)}
  if(xbMenu){const s=xState(X),sent=R.all.filter(x=>x.pay==="sent").length,others=schedUp().filter(x=>x.id!==X.id).length;
    const it=(i,t,sb,a,red,id=X.id)=>`<button class="gmli" data-act="${a}" data-id="${esc(id)}"><i>${i}</i><span class="t"><b${red?` class="red"`:""}>${t}</b><small>${sb}</small></span><span aria-hidden="true">›</span></button>`;
    return `<div class="mxdim" data-act="xbmenux"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Thêm việc"><span class="grab"></span><b class="mxh">${esc(xName(X))}</b>
      ${it("✎","Sửa giải","Giờ, sân, luật, tiền, giải thưởng","gmxe")}${it("⇄","Đổi sang giải khác",others?`${others} giải đang có`:"Chưa có giải khác","gmxs")}
      ${it("＋","Thêm người vào giải","Chọn từ danh sách thành viên","gmxa")}${it("✓","Duyệt tiền nhiều người",sent?`${sent} người báo đã chuyển`:"Chưa ai báo chuyển","gmxb")}
      ${it("📋","Gửi danh sách vào nhóm","Ai đã đăng ký, ai còn chờ","xbshare")}
      ${s==="open"?it("⏸","Tạm dừng đăng ký","Người chơi không đăng ký thêm được","xpause"):s==="draft"||s==="plan"?it("▶","Mở đăng ký","Người chơi thấy và đăng ký được","xopen"):""}
      ${s!=="cancel"&&s!=="done"&&s!=="live"?it("✕",armed("xcancel:"+X.id)?"Bấm lần nữa để huỷ giải":"Huỷ giải","Nhắn người đã đăng ký, hoàn tiền","xcancel",1):""}</div>`}
  return "";
}
function g2Person(D,X,R,x){
  const p=x.pid&&D.pmap.get(x.pid),k=feeOf(x),pay=x.pay||"none",nm=xbName(D,x),pos=R.all.indexOf(x),wait=pos>=R.max,zid=zidOf(D,x),lv=xbLv(D,x),ph=phOfUid(x.uid),po=payOn();
  const sub=[x.guest?"Ngoài CLB":"Thành viên",lv?`trình ${r2(lv)}`:"",ph?`📞 ${phFmt(ph)}`:"",x.at?`đăng ký ${hm(x.at)} ${dowVN(x.at).toLowerCase()}`:""].filter(Boolean).join(" · ");
  let h=`<div class="mxdim" data-act="xbselx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="${esc(nm)}"><span class="grab"></span><div class="g2who">${av(p||{name:nm},"md",1)}<span class="t"><b>${esc(nm)}</b><small>${esc(sub)}</small></span></div>`;
  if(po&&k&&!x.cancel){if(pay==="sent")h+=gmNextBox({t:`Báo đã chuyển ${fmtK(k)}`,s:"Kiểm tra tài khoản rồi bấm Đã nhận"},false);else if(pay!=="ok")h+=gmNextBox({t:`Chưa trả ${fmtK(k)}`,s:"Thu tiền mặt hoặc nhắc chuyển khoản"},false)}
  const big=[];
  if(po&&k&&!x.cancel)big.push(pay==="ok"?`<button class="tvbig" data-act="regpayundo" data-id="${esc(x.id)}"><i>↶</i><span>${armed("regpayundo:"+x.id)?"Bấm lần nữa":`Đã nhận ${fmtK(k)}`}</span></button>`:`<button class="tvbig go" data-act="regpayok" data-id="${esc(x.id)}"><i>✓</i><span>${armed("regpayok:"+x.id)?"Bấm lần nữa":`Đã nhận ${fmtK(k)}`}</span></button>`);
  if(x.cancel&&(pay==="ok"||pay==="sent"))big.push(`<button class="tvbig go" data-act="regrefund" data-id="${esc(x.id)}"><i>✓</i><span>Đã hoàn ${fmtK(k)}</span></button>`);
  big.push(zid?`<button class="tvbig" data-act="zchat" data-v="${esc(zid)}" data-n="${esc(nm)}"><i>💬</i><span>Nhắn Zalo</span></button>`:`<button class="tvbig" disabled><i>💬</i><span>Nhắn Zalo</span></button>`);
  big.push(ph?`<a class="tvbig" href="tel:${esc(ph)}"><i>📞</i><span>Gọi</span></a>`:`<button class="tvbig" disabled><i>📞</i><span>Gọi</span></button>`);
  h+=`<div class="tvbigs n${big.length}">${big.join("")}</div>`;
  if(pairRegOn(X)&&!x.cancel&&!capMate(x)){const S2=R.conf.filter(y=>y.id!==x.id&&!capMate(y));
    if(S2.length)h+=`<span class="gmlb">Ghép tay với</span><div class="g2fl">${S2.map(y=>`<button data-act="gmpairw" data-id="${esc(x.id)}" data-v="${esc(y.id)}">${esc(xbName(D,y))}</button>`).join("")}</div>`}
  h+=`<div class="gmlist">`;
  if(!x.cancel&&!wait&&pos>=0)h+=`<button class="gmli" data-act="xbtowait" data-id="${esc(x.id)}"><i>↓</i><span class="t"><b>${armed("xbtowait:"+x.id)?"Bấm lần nữa để chuyển":"Chuyển xuống danh sách chờ"}</b><small>Nhường chỗ cho người khác</small></span><span aria-hidden="true">›</span></button>`;
  if(!x.cancel)h+=`<button class="gmli" data-act="regdel" data-id="${esc(x.id)}"><i>✕</i><span class="t"><b class="red">${armed("regdel:"+x.id)?"Bấm lần nữa để huỷ chỗ":"Huỷ chỗ"}</b><small>Hoàn tiền nếu đã nhận</small></span><span aria-hidden="true">›</span></button>`;
  return h+`</div></div>`;
}
// R4 · Duyệt tiền nhiều người (trang riêng)
function gmBulkPg(D,X){
  return withX(X,()=>{const R=regList(D),L=R.all.filter(x=>x.pay==="sent"),sel=L.filter(x=>xbBulk.has(x.id)),tot=sel.reduce((a,x)=>a+feeOf(x),0);
    mxDr({t:"Duyệt tiền",back:"xbbulkx",sub:esc(xName(X))});
    return `<small class="rule">Mở app ngân hàng đối chiếu. Bỏ tích người chưa thấy tiền.</small><div class="g2list">${L.map(x=>{const on=xbBulk.has(x.id);return `<button class="g2ck${on?" on":""}" data-act="xbbulkt" data-id="${esc(x.id)}" aria-pressed="${on}"><i aria-hidden="true">${on?"✓":""}</i><span class="t"><b>${esc(xbName(D,x))}</b><small>báo chuyển ${x.sentAt?hm(x.sentAt):x.paidAt?hm(x.paidAt):""}</small></span><b class="num">${fmtK(feeOf(x))}</b></button>`}).join("")||`<p class="rule">Chưa ai báo đã chuyển.</p>`}</div>
      <div class="hqcta"><button class="ball go" data-act="xbbulkok" ${sel.length?"":"disabled"}>✓ Duyệt ${sel.length} người · ${fmtK(tot)}</button></div>`});
}
// R5 · Thêm người vào giải (trang riêng)
let g2Added=0;
function gmAddPg(D,X){
  return withX(X,()=>{const R=regList(D),inG=new Set(R.all.map(x=>x.pid).filter(Boolean)),q=noAcc(String(val("g2-q",""))).toLowerCase().trim();
    mxDr({t:"Thêm người vào giải",back:"regadd",sub:esc(xName(X))});
    const L=D.players.filter(p=>!p.guest&&p.active!==undefined).filter(p=>!q||noAcc(p.name||"").toLowerCase().includes(q)).sort((a,b)=>(inG.has(a.id)?1:0)-(inG.has(b.id)?1:0)||String(a.name).localeCompare(String(b.name),"vi")).slice(0,60);
    return `<label class="srch"><span class="sr">Tìm tên</span><input id="g2-q" data-draft="g2-q" data-live="1" type="search" placeholder="🔍 Tìm tên…" value="${esc(val("g2-q",""))}"></label>
      <div class="g2list">${L.map(p=>{const on=inG.has(p.id),lv=D.st.get(p.id)?.rating??+p.rating0??0;return `<div class="g2p">${av(p,"sm",1)}<span class="t"><b>${esc(p.name)}</b><small>${r2(lv)} · ${on?"đã thêm":"chưa đăng ký"}</small></span>${on?g2Tag("✓ ĐÃ THÊM","g"):`<button class="btn-line sm" data-act="regaddp" data-id="${esc(p.id)}">＋ Thêm</button>`}</div>`}).join("")}</div>
      <a class="g2new" href="${pathOf("app",{tab:"nguoi"})}" data-go="app" data-t="nguoi">＋ Người mới chưa có trong CLB</a>
      <div class="hqcta"><button class="ball" data-act="regadd">Xong${g2Added?` · đã thêm ${g2Added} người`:""}</button></div>`});
}
async function g2Act(act,b){
  const D=derive(),id=b.dataset.id,X=routeX?schedById(routeX):null;
  if(act==="gmxe"){xbMenu=false;gmEdit=true;gmSec=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="gmxs"){xbMenu=false;gmSw=true;render();return true}
  if(act==="gmxa"){xbMenu=false;regAddOpen=true;g2Added=0;delete drafts["g2-q"];render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="gmxb"){xbMenu=false;const R=withX(X,()=>regList(D));xbBulk=new Set(R.all.filter(x=>x.pay==="sent").map(x=>x.id));render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="gmpairw"){const a=(S.regs||[]).find(r=>r.id===id),c=(S.regs||[]).find(r=>r.id===b.dataset.v);if(!a||!c)return true;
    await write(async()=>{await db.collection("regs").doc(a.id).update({team:a.id,seek:false});await db.collection("regs").doc(c.id).update({team:a.id,seek:false})},`Đã ghép ${xbName(D,a)} & ${xbName(D,c)}`);xbSel=null;return true}
  if(act==="gmautopair"){const Y=schedById(id);if(!Y)return true;const R=withX(Y,()=>regList(D)),L=R.conf.filter(x=>!capMate(x)).sort((a,c)=>xbLv(D,c)-xbLv(D,a));
    if(L.length<2)return true;if(!armOr("gmautopair:"+id))return true;
    const P=[];while(L.length>1){const a=L.shift(),c=L.pop();P.push([a,c])}
    await write(async()=>{for(const [a,c] of P){await db.collection("regs").doc(a.id).update({team:a.id,seek:false});await db.collection("regs").doc(c.id).update({team:a.id,seek:false})}},`Đã ghép ${P.length} cặp theo trình`);return true}
  return false;
}

/* ----- Chặng Ngày đánh: check-in chỉ bằng quét mã trên máy BTC (K11) ----- */
function gmDayV(D,X){
  const live=gmLive(D)||D.SM.length,G=isG(D.c),s=ckStats(D,X),left=X.at?X.at-Date.now():0,cap=pairRegOn(X)||kOn(X),KB=kOn(X);
  const st=live?"Giải đang đánh":left>0?`Đang mở · bắt đầu sau ${left>=36e5?`${Math.floor(left/36e5)} giờ `:""}${Math.round(left%36e5/6e4)}′`:"Đang mở · đã tới giờ";
  const L=s.L,arr=new Set(L.filter(r=>r.arrived).map(r=>r.id));
  let cells=[],full=0,tot=0;
  if(cap){const seen=new Set();for(const r of L){if(seen.has(r.id))continue;const m=capMate(r);seen.add(r.id);if(m)seen.add(m.id);
      const k=(arr.has(r.id)?1:0)+(m&&arr.has(m.id)?1:0),need=m?2:1;tot++;if(k>=need)full++;
      cells.push([`${esc(xbName(D,r))}${m?` &amp; ${esc(xbName(D,m))}`:""}`,k>=need?2:k?1:0,m?r.team:null])}}
  else{for(const r of L){tot++;const a=arr.has(r.id);if(a)full++;cells.push([esc(xbName(D,r)),a?2:0])}}
  // Chưa có đăng ký (người có mặt được thêm thẳng vào giải): hiện người đang có mặt
  if(!L.length)for(const p of D.players.filter(p=>p.active!==false))cells.push([esc(p.name),2]);
  const cnt=cap?`${full}<small>/${tot} cặp</small>`:`${s.arr}<small>/${s.L.length}</small>`;
  let h=`<section class="g3ck"><span class="cap">Check-in${X.at?` · ${hm(X.at)}`:""}</span><b>${st}</b>
    <div class="ckcnt"><span><b>${cnt}</b><small>ĐÃ TỚI</small></span><span><b class="y">${s.pend}</b><small>CHỜ DUYỆT</small></span><span><b>${fmtK(s.due)}</b><small>CẦN THU</small></span></div>
    <button class="g3go" data-act="ckopen" data-id="${esc(X.id)}">⌗ MỞ MÃ CHECK-IN</button></section>`;
  h+=`<small class="rule">${cap?"Xanh: cặp đủ 2 người · Vàng: mới tới 1 người.":"Xanh: đã tới sân. Người chơi quét mã trên máy BTC để check-in."}</small>`;
  h+=cells.length?`<div class="g3grid${cap?" c2":""}">${cells.map(([n,k,code])=>KB&&code&&!live?`<button class="k${k}" data-act="k12" data-v="${esc(code)}">${k===2?"✓ ":k===1?"½ ":""}${n}</button>`:`<span class="k${k}">${k===2?"✓ ":k===1?"½ ":""}${n}</span>`).join("")}</div>`:`<p class="rule">Chưa có ai đăng ký.</p>`;
  const n=D.players.filter(p=>p.active!==false).length;
  if(live)return h+`<div class="hqcta two">${gmDot()}<button class="ball" data-act="gmst" data-v="2">Về Đang đánh ›</button></div>`;
  if(KB)return h+`<div class="hqcta two"><button class="btn-line gmdot" data-act="ksh" data-v="k11m" aria-label="Thêm việc">⋯</button><button class="ball go" data-act="ksh" data-v="k13">▶ Bắt đầu vòng bảng</button></div>`+kDaySheets(D,X);
  if(G)return h+`<div class="gmgbar">${gmDot()}${gStartBar(D,D.c.giai||{pairs:[]})}</div>`;
  return h+`<div class="hqcta two">${gmDot()}<button class="ball go" data-act="start">▶ Bắt đầu đánh · ${n} người</button></div>${n<4?`<small class="rule gmwarn">Cần ít nhất 4 người có mặt.</small>`:""}`;
}

/* ----- Chặng Đang đánh (D1–D3): thẻ sân to, lượt sau, kết quả, xếp hạng ----- */
let g4V=null,g4Sel=null,g4Back=null;
const g4Nm=(D,ids)=>(ids||[]).map(id=>esc(nm(D,id))).join(" &amp; ");
function gmPlayV(D,X){
  const G=isG(D.c),GD=G?gDerive(D):null,n=Math.max(1,+D.c.courts||1),now=Date.now();
  if(g4V==="kq")return g4Kq(D);
  if(g4V==="bxh"){mxDr({t:"Xếp hạng hôm nay",back:"g4x",sub:esc(X?xName(X):(D.c.sname||"Giải đánh nhanh"))});return G?vGiaiBxh(D,GD):vBxh(D)}
  if(G&&GD&&GD.isKO&&!g4V)return kPlayV(D,X,GD);
  if(g4V&&g4V.startsWith("m:")){const m=(S.matches||[]).find(x=>x.id===g4V.slice(2));if(m&&(m.status!=="done"||editing.has(m.id)))return g4Score(D,m.id);g4V=g4Back;g4Back=null;if(g4V)return gmPlayV(D,X)}
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),waiting=D.players.filter(p=>p.active!==false&&!busy.has(p.id));
  const fill=G?(!GD.complete&&gPick(D,GD,new Set(D.playing.flatMap(m=>[m.pa,m.pb])),new Set())?"gfill":null):(Math.floor(waiting.length/4)>0?"gen":null);
  const scop={lb:m=>m.ko&&GD?esc(koMName(GD,m.ko)):"",nm:m=>[g4Nm(D,m.a),g4Nm(D,m.b)],fill:!!fill,cp:G?(GD.G.cpause||{}):{}};
  let h=scBoard(D,scop);const nf=scFree(D,scop);
  if(G&&!nf)h+=scBlocked(D,GD,scFree(D,{...scop,fill:true}));
  // Lượt sau
  let nx="";
  if(G){const g=gPick(D,GD,new Set(D.playing.flatMap(m=>[m.pa,m.pb])),new Set());if(g){const A=GD.T.get(g.x),B=GD.T.get(g.y);nx=`${A?pairNm(D,A.p):"?"} · ${B?pairNm(D,B.p):"?"}`}}
  else{const Q=waitQueue(D).slice(0,4);if(Q.length>=4)nx=`${esc(Q[0].name)} &amp; ${esc(Q[1].name)} · ${esc(Q[2].name)} &amp; ${esc(Q[3].name)}`;else if(Q.length)nx=Q.map(p=>esc(p.name)).join(", ")}
  if(nx)h+=`<div class="g4nx"><span class="cap">Lượt sau</span><span>${nx}</span></div>`;
  h+=`<div class="gmlist"><button class="gmli gsrow" data-act="g4v" data-v="kq"><i>✓</i><span class="t"><b>Kết quả</b></span><em>${D.done.length} trận</em><span aria-hidden="true">›</span></button><button class="gmli gsrow" data-act="g4v" data-v="bxh"><i>🏆</i><span class="t"><b>Xếp hạng hôm nay</b></span><em></em><span aria-hidden="true">›</span></button></div>`;
  if(errs.gen)h+=`<p class="err">${esc(errs.gen)}</p>`;
  return h+`<div class="hqcta two">${gmDot()}${nf?`<button class="ball go" data-act="scfillall">▶ Tạo trận cho ${nf} sân</button>`:`<button class="ball nv" data-act="gmst" data-v="3">🏁 Hết giờ · sang chốt</button>`}</div>`+scSheet(D);
}
// D2 · Nhập điểm một sân: hai ô số to
function g4Score(D,id,edit){
  const m=(S.matches||[]).find(x=>x.id===id);if(!m){g4V=null;return ""}
  if(!editing.has(id)&&((mRule(m)||{}).sets||1)>1)return kSetsV(D,m);
  const ed=edit||editing.has(id),pa=ed?"ea-":"sa-",ka=pa+id,kb=(ed?"eb-":"sb-")+id,va=val(ka,ed?String(m.sa):""),vb=val(kb,ed?String(m.sb):"");
  mxDr({t:ed?"Sửa tỉ số":`Sân ${cName(m.court)} · nhập điểm`,back:"g4x",sub:esc(xCur()?xName(xCur()):(D.c.sname||""))});
  const tile=(ids,k,v,c)=>`<div class="g4t" style="background:${c}"><b class="n">${g4Nm(D,ids)}</b><span class="r"><button data-act="g4d" data-k="${k}" data-d="-1" aria-label="Bớt">−</button><b class="num">${v===""?0:esc(v)}</b><button data-act="g4d" data-k="${k}" data-d="1" aria-label="Thêm">＋</button></span></div>`;
  const a=+va||0,b=+vb||0,win=a===b?"":a>b?g4Nm(D,m.a):g4Nm(D,m.b);
  return tile(m.a,ka,va,"#1f6fd1")+tile(m.b,kb,vb,"#b0337a")+(ed?"":`<small class="rule">Muốn nhập từng pha, giao bóng, timeout: dùng màn trọng tài.</small><button class="lnk g4tt" data-act="tt" data-id="${esc(id)}">Mở màn trọng tài ›</button>`)
    +(errs[id]?`<p class="err">${esc(errs[id])}</p>`:"")
    +`<div class="hqcta"><button class="ball go" data-act="${ed?"edit-save":"save"}" data-id="${esc(id)}" ${a===b?"disabled":""}>✓ Lưu${win?` · ${win} thắng`:""}</button></div>`;
}
// D3 · Kết quả: mới nhất trên, chạm để sửa
function g4Kq(D){
  mxDr({t:`Kết quả · ${D.done.length} trận`,back:"g4x",sub:esc(xCur()?xName(xCur()):(D.c.sname||""))});
  const L=[...D.done].reverse();
  let h=`<div class="g2list">${L.map(m=>{const i=D.info.get(m.id)||{};return `<button class="g4r" data-act="g4sel" data-id="${esc(m.id)}"><span class="tm num">${m.doneAt?hm(m.doneAt):""}</span><span class="a${i.aWin?" w":""}">${g4Nm(D,m.a)}</span><b class="num">${m.sa}–${m.sb}</b><span class="b${i.aWin?"":" w"}">${g4Nm(D,m.b)}</span><span aria-hidden="true">›</span></button>`}).join("")||`<p class="rule">Chưa có trận nào xong.</p>`}</div>
    <small class="rule">Lưu nhầm tỉ số: chạm trận → Sửa hoặc Hoàn tác. Rating tự tính lại.</small>`;
  if(g4Sel){const m=(S.matches||[]).find(x=>x.id===g4Sel);if(m)h+=`<div class="mxdim" data-act="g4selx"></div><div class="mxsheet dhsh gmsh" role="dialog"><span class="grab"></span><b class="mxh">${g4Nm(D,m.a)} ${m.sa}–${m.sb} ${g4Nm(D,m.b)}</b>
      <button class="gmli" data-act="g4ed" data-id="${esc(m.id)}"><i>✎</i><span class="t"><b>Sửa tỉ số</b><small>Rating, tiền tự tính lại</small></span><span aria-hidden="true">›</span></button>
      <button class="gmli" data-act="mdel" data-id="${esc(m.id)}"><i>↶</i><span class="t"><b class="red">${armed("mdel:"+m.id)?"Bấm lần nữa để hoàn tác":"Hoàn tác trận này"}</b><small>Bỏ kết quả, khôi phục được trong thùng rác</small></span><span aria-hidden="true">›</span></button></div>`}
  return h;
}
async function g4Act(act,b){
  const id=b.dataset.id;
  if(act==="g4v"){g4V=b.dataset.v;g4Sel=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="g4m"){g4V="m:"+id;for(const k of ["sa-","sb-"])if(drafts[k+id]==null)drafts[k+id]="0";render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="g4x"){if(g4V&&g4V.startsWith("m:")){editing.delete(g4V.slice(2));g4V=g4Back;g4Back=null}else g4V=null;g4Sel=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="g4sel"){g4Sel=id;render();return true}
  if(act==="g4selx"){g4Sel=null;render();return true}
  if(act==="g4ed"){g4Sel=null;g4Back="kq";g4V="m:"+id;{const m=(S.matches||[]).find(x=>x.id===id);if(m){drafts["ea-"+id]=String(m.sa);drafts["eb-"+id]=String(m.sb)}}editing.add(id);render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="g4d"){const k=b.dataset.k,m=(S.matches||[]).find(x=>x.id===k.slice(3)),dflt=m&&m.status==="done"?(k.startsWith("ea")?m.sa:m.sb):0;drafts[k]=String(Math.max(0,Math.min(99,(+val(k,String(dflt))||0)+Number(b.dataset.d))));render();return true}
  return false;
}

/* ----- Chặng Chốt (C1–C4): 4 bước, mỗi bước một nút tiếp ----- */
let g5Cost=null,g5Send=true;
function gmChotV(D,X){
  const c=D.c,G=isG(c),M0=money(D),R0=recv(D,M0),extra=chotMien?Object.fromEntries(R0.unpaid.map(p=>[p.id,0])):null,M=money(D,extra),R=recv(D,M),pz=prizes(D,M);
  const st=Math.max(1,Math.min(4,chotStep));
  let h=`<div class="g5bar"><span class="cap">Bước ${st}/4 · ${CHOT_ST[st-1]}</span><span class="b">${[1,2,3,4].map(i=>`<i class="${i<st?"ok":i===st?"on":""}"></i>`).join("")}</span></div>`;
  if(D.playing.length)h+=`<div class="warnbox"><b>Còn ${D.playing.length} trận đang đánh.</b>Lưu tỉ số hoặc huỷ trận ở Đang đánh rồi quay lại chốt.</div>`;
  const nmOf=ids=>ids.map(id=>esc(D.pmap.get(id)?.name||"?")).join(" &amp; ");
  if(st===1){const aw=cfg().award||{},order=pz.map((p,i)=>i).reverse(),KO=G&&isKO(c.giai),lbl=(p,i)=>KO&&i===0?"Vô địch":p.label;
    if(KO&&pz.length)h+=`<div class="g5pod">${[1,0,2].filter(i=>pz[i]).map(i=>`<div class="p p${i}"><small>${nmOf(pz[i].ids)}</small><b>${i+1}</b></div>`).join("")}</div>`;
    h+=pz.length?`<div class="g2list">${order.map(i=>{const p=pz[i],done=!!aw[i];return `<div class="g5r"><i class="${done?"ok":"w"}">${done?"✓":"!"}</i><span class="t">${esc(lbl(p,i))} · ${nmOf(p.ids)} · ${fmtK(p.k)}</span>${done?"":spkBtn("aw:"+i,`<button class="btn-line sm" data-act="dhaw" data-v="${i}">📣 Gọi</button>`)}</div>`}).join("")}</div>`
      :`<div class="gmempty"><b>Giải này không có giải thưởng</b><span>Bấm Tiếp để thu nốt tiền.</span></div>`}
  if(st===2){
    if(R0.unpaid.length){h+=`<span class="gmlb">${R0.unpaid.length} người chưa trả</span><div class="g2list">${R0.unpaid.map(p=>`<div class="g2p">${av(p,"sm",1)}<span class="t"><b>${esc(p.name)}</b></span><b class="num">${fmtK(M0.payOf(p.id))}</b><button class="btn-line sm" data-act="lpaid" data-p="${esc(p.id)}">Đã nhận</button></div>`).join("")}</div>
      <span class="gmlb">Không thu được thì</span><div class="gmchips c2"><button class="gmchip${!chotMien?" on":""}" data-act="chotm" data-v="0">Ghi vào còn nợ</button><button class="gmchip${chotMien?" on":""}" data-act="chotm" data-v="1">Miễn</button></div>`}
    else h+=`<div class="gmempty"><b>${R0.n?"Mọi người đã trả đủ":"Giải này không thu tiền theo người"}</b></div>`}
  if(st===3){const IC={court:"🏟",ball:"🎾",water:"💧",other:"＋"},LB={court:"Tiền sân",ball:"Bóng",water:"Nước",other:"Khác"};
    h+=`<div class="gmlist">${["court","ball","water","other"].map(k=>`<button class="gmli gsrow" data-act="g5c" data-v="${k}"><i>${IC[k]}</i><span class="t"><b>${LB[k]}</b></span><em>${fmtK(+c.costs[k]||0)}</em><span aria-hidden="true">›</span></button>`).join("")}</div><small class="rule">Sửa nếu khác dự kiến: thêm giờ sân, ít nước…</small>`;
    if(g5Cost)h+=`<div class="mxdim" data-act="g5cx"></div><div class="mxsheet gmsh gssh" role="dialog"><span class="grab"></span><b class="mxh">${LB[g5Cost]}</b>${cfIn(g5Cost,"Số tiền (k)",c.costs[g5Cost])}<button class="ball go wide" data-act="g5cx">✓ Lưu</button></div>`}
  if(st===4){const now=M.club-R.left,ts=D.done.map(m=>m.doneAt||m.createdAt||0).filter(Boolean),dur=ts.length>1?Math.round((Math.max(...ts)-Math.min(...ts))/36e5*10)/10:0;
    const per=M.att.length?Math.round(R.tot/M.att.length):0;
    h+=`<section class="g5hero"><span class="cap">${now<0?"Quỹ bù":"Dư vào quỹ CLB"}</span><b class="num">${now<0?"−":"+"} ${fmtK(Math.abs(now))}</b><small>${M.att.length} người · ${D.done.length} trận${dur?` · ${String(dur).replace(".",",")} giờ`:""}</small></section>
      <div class="g2list"><div class="g5s"><span><b>Thu</b><small>${M.att.length} × ${fmtK(per)}</small></span><b class="num">${fmtK(R.tot)}</b></div><div class="g5s"><span><b>Chi</b></span><b class="num">−${fmtK(M.cost)}</b></div>${R.left?`<div class="g5s"><span><b>Còn nợ</b><small>${R.unpaid.map(p=>esc(p.name)).join(", ")} · ghi sổ</small></span><b class="num">${fmtK(R.left)}</b></div>`:""}</div>
      <button class="g5ck${g5Send?" on":""}" data-act="g5send" aria-pressed="${g5Send}"><i>${g5Send?"✓":""}</i><span>Gửi kết quả vào nhóm Zalo</span></button>`}
  const prev=st>1?`<button class="btn-line gmdot" data-act="chotgo" data-v="${st-1}" aria-label="Quay lại">‹</button>`:"";
  const next=st<4?`<button class="ball go" data-act="chotgo" data-v="${st+1}">Tiếp: ${CHOT_ST[st]} ›</button>`
    :G?`<button class="ball go" data-act="gend" ${D.playing.length?"disabled":""}>${armed("gend:x")?"Bấm lần nữa để lưu giải":"✓ Xong giải · ghi sổ quỹ"}</button>`
    :`<button class="ball go" data-act="g5done" ${D.playing.length?"disabled":""}>${armed("chot:x")?"Bấm lần nữa để chốt":"✓ Xong giải · ghi sổ quỹ"}</button>`;
  return h+`<div class="hqcta two">${prev}${next}</div>`;
}
async function g5Act(act,b){
  if(act==="g5c"){g5Cost=b.dataset.v;render();return true}
  if(act==="g5cx"){const el=document.getElementById&&document.getElementById("cf-"+g5Cost);if(el&&typeof el.dispatchEvent==="function"&&typeof Event!=="undefined")el.dispatchEvent(new Event("change",{bubbles:true}));g5Cost=null;setTimeout(render,50);return true}
  if(act==="g5send"){g5Send=!g5Send;render();return true}
  if(act==="g5done"){if(!armOr("chot:x"))return true;const sid=derive().sid;await chotBuoi();
    if(g5Send)setTimeout(()=>onAct({target:{closest:s=>s==="[data-act]"?{dataset:{act:"share",id:String(sid)},closest:()=>null}:null}}),400);return true}
  return false;
}

/* ----- Tạo giải Chia bảng → Knockout (K2–K5) ----- */
// Gợi ý thể thức theo số cặp: ≤8 cặp 2 bảng, ≤16 cặp 4 bảng, ≤32 cặp 8 bảng; nhất nhì mỗi bảng vào vòng trong
function kbSuggest(n){const N=n<=8?2:n<=16?4:n<=32?8:16;let q=N*2;while(q>n&&q>4)q/=2;return {N,q:Math.min(64,q)}}
function kbSync(D){if(drafts["xf-koTouched"])return;const n=Math.max(2,Math.round((+xv(D,"max")||16)/2)),s=kbSuggest(n);drafts["xf-koN"]=String(s.N);drafts["xf-koQ"]=String(s.q)}
function kbMatches(n,N,q,third){const a=Math.floor(n/N),r=n%N,grp=r*(a+1)*a/2+(N-r)*a*(a-1)/2;return grp+(q-1)+(third&&q>=4?1:0)}
function kbEst(D){kbSync(D);const n=Math.max(2,Math.round((+xv(D,"max")||16)/2)),c=Math.max(1,+xv(D,"courts")||1),N=+xv(D,"koN")||4,q=+xv(D,"koQ")||8,t=Math.ceil(kbMatches(n,N,q,xv(D,"koThird")!=="0")/c)*GSLOT,h=Math.floor(t/60),m=Math.round(t%60/10)*10;
  return `<small class="rule">Ước tính: ${n} cặp, ${c} sân · khoảng ${h} giờ${m?` ${m}`:""}.</small>`}
const kbRounds=q=>{const L=[];for(let k=q;k>=2;k/=2)L.push(k===2?"chung kết":koRName(k).toLowerCase());return L};
function kbQ3(D,q){
  kbSync(D);const v=k=>xv(D,k),cp=gsOnV(v("cp")),amt=cp?(+v("phi")||+v("fee")||0):0,fc=!cp?"0":[100,200,300].includes(amt)?String(amt):"khac",T=gsDefs(D,null),n=Math.round((+v("max")||0)/2);
  const chip=(act,k,val2,l,on)=>`<button class="gmchip${on?" on":""}" data-act="${act}" data-k="${k}" data-v="${esc(val2)}" aria-pressed="${!!on}">${l}</button>`;
  let h=q(3,"Bao nhiêu cặp, đánh nội dung gì?");
  h+=`<div class="gmstp"><span><b>Tối đa bao nhiêu cặp?</b><small>${+v("max")||0} người</small></span><span class="stepper big"><button data-act="xfstep" data-k="max" data-d="-2" data-min="4" data-max="256" aria-label="Bớt">−</button><b class="num">${n}</b><button data-act="xfstep" data-k="max" data-d="2" data-min="4" data-max="256" aria-label="Thêm">＋</button></span></div>
    <span class="gmlb">Nội dung</span><div class="gmchips c4">${[["free","Hỗn hợp"],["MM","Đôi nam"],["FF","Đôi nữ"],["mix","Nam nữ"]].map(([k,l])=>chip("xfset","dt",k,l,(v("dt")||"free")===k)).join("")}</div>
    <span class="gmlb">Đăng ký</span><div class="gmchips c2">${[["pair","Theo cặp"],["solo","Từng người, BTC ghép"]].map(([k,l])=>chip("xfset","pairReg",k,l,(v("pairReg")==="pair"?"pair":"solo")===k)).join("")}</div>
    <span class="gmlb">Lệ phí mỗi người</span><div class="gmchips c4">${[["100","100k"],["200","200k"],["300","300k"],["khac","Khác"]].map(([k,l])=>chip("xqfee","",k,l,fc===k)).join("")}</div>
    ${fc==="khac"?`<label class="fld gmsm"><span class="lbl">Số tiền mỗi người (k)</span><input id="xf-phi" data-draft="xf-phi" type="number" min="0" inputmode="numeric" value="${esc(amt||"")}"></label>`:""}
    <div class="gmlist"><button class="gmli gsrow" data-act="gsopt" data-v="ko"><i>▦</i><span class="t"><b>Thể thức</b><small>App gợi ý theo ${n} cặp, chạm để đổi</small></span><em>${esc(T.ko.val)}</em><span aria-hidden="true">›</span></button>
      <button class="gmli gsrow" data-act="gspg"><i>⚙</i><span class="t"><b>Tuỳ chọn thêm</b><small>Giải thưởng, trình độ, luật điểm…</small></span><em>${GS_KB.length} mục</em><span aria-hidden="true">›</span></button></div>`;
  return h+`${errs.xf?`<p class="err">${esc(errs.xf)}</p>`:""}<div class="hqcta two"><button class="btn-line" data-act="xqgo" data-v="2">‹ Lại</button><button class="ball go" data-act="xsave" data-v="open">✓ Tạo giải</button></div>`+gsSheet(D,null);
}
const GS_KB=["gt","lv","guests","pay","dl","poster","note"];
// Bảng Thể thức (K4): sơ đồ, số bảng, vào vòng trong, hạng ba, luật điểm từng vòng
function kbKoBody(D){
  const v=k=>xv(D,k),n=Math.max(2,Math.round((+v("max")||16)/2)),N=+v("koN")||4,q=+v("koQ")||8,per=Math.max(1,Math.round(n/N));
  const R=kbRounds(q),col=["#1f6fd1","#7a4cc2","#c7770b","#16a34a","#127a8a","#b0337a"];
  const dg=`<div class="kbdg"><span style="background:${col[0]}">${N} bảng × ${per} cặp</span>${R.map((t,i)=>`<span style="background:${col[(i+1)%col.length]}">${t==="chung kết"?"Chung kết":`${t.charAt(0).toUpperCase()+t.slice(1)} ${q>>i}`}</span>`).join("")}</div>`;
  const rr=(X,t)=>{const to=v("ko"+X+"t")||"11",w=v("ko"+X+"w")==="1",s=v("ko"+X+"s")||"1";
    return `<div class="kbrr"><div class="h"><b>${t}</b><em>${s!=="1"?`${s} set, `:""}chạm ${to}${w?", cách 2":""}</em></div><div class="r">${["11","15","21"].map(x=>`<button class="gmchip${to===x?" on":""}" data-act="xfset" data-k="ko${X}t" data-v="${x}">${x}</button>`).join("")}<button class="gmchip${w?" on":""}" data-act="xfset" data-k="ko${X}w" data-v="${w?"0":"1"}">Cách 2</button>${["1","3"].map(x=>`<button class="gmchip${s===x?" on":""}" data-act="xfset" data-k="ko${X}s" data-v="${x}">${x} set</button>`).join("")}</div></div>`};
  return dg+`<div class="gmstp"><span><b>Số bảng</b><small>Mỗi bảng ${per} cặp, đánh vòng tròn</small></span><span class="stepper big"><button data-act="xfstep" data-k="koN" data-d="-1" data-min="1" data-max="16" aria-label="Bớt">−</button><b class="num">${N}</b><button data-act="xfstep" data-k="koN" data-d="1" data-min="1" data-max="16" aria-label="Thêm">＋</button></span></div>`
    +gsLb("Vào vòng trong")+gsChips("koQ",[["4","4"],["8","8"],["16","16"],["32","32"],["64","64"]],String(q),5)
    +`<small class="rule">${q} cặp: ${q/N===2?`nhất, nhì mỗi bảng vào ${koRName(q).toLowerCase()}`:q/N===1?`nhất mỗi bảng vào ${koRName(q).toLowerCase()}`:`top ${Math.round(q/N)} mỗi bảng vào ${koRName(q).toLowerCase()}`}. 32, 64 dùng cho giải lớn (từ 48 cặp).</small>`
    +gsSw(D,"koThird","Tranh hạng ba")+gsLb("Luật điểm")+rr("G","Vòng bảng")+rr("K","Tứ kết, bán kết")+rr("F","Chung kết");
}
