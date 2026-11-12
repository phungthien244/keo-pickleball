/* ---------- Tạo lịch đánh gọn 2 bước (canvas "Tạo lịch đánh gọn 2 bước", Tq1–Tq4) ----------
   Bước 1: chỉ chọn loại (hoặc "Như lần trước").
   Bước 2: một trang đủ thông số theo từng loại, dựng trên bộ cài đặt sẵn có gsDefs (cũng là màn Sửa giải):
           điền sẵn theo lần trước cùng loại, bấm dòng mở bảng trượt (có ô nhập số tuỳ chọn), ô sửa nhanh bằng AI
           sửa nhiều mục một lần (tô dòng vừa đổi, Hoàn tác). Lưu bằng xSave như form giải. */
let tqHl=new Set(),tqUndo=null,tqMsg="";
// Các dòng theo từng loại: [tiêu đề nhóm, [mục gsDefs]]
function tqGroups(fmt){
  const S=fmt==="xoay",B=fmt==="bang";
  return [["Khi nào, ở đâu",["when","place","courts"]],
    ["Người chơi",S?["max","lv","gmode","dl"]:["max","dt","pairReg","lv","dl"]],
    ["Thể thức, luật",B?["ko"]:["luat"]],
    ["Tiền, giải thưởng",S?["fee","thu","san","pay","gt","incl"]:["fee","san","pay","gt","incl"]],
    ["Thêm",["rep","poster","note"]]];
}
const TQ_LB={max:"Số người tối đa",ko:"Chia bảng",pay:"Chuyển khoản",note:"Ghi chú",fee:"Lệ phí",incl:"Lệ phí gồm",rep:"Lặp hằng tuần"};
const tqKeys=fmt=>tqGroups(fmt).flatMap(g=>g[1]);
function tqVals(D){const T=gsDefs(D,null);return Object.fromEntries([...tqKeys(xNew).map(k=>[k,T[k]?String(T[k].val):""]),["name",String(xv(D,"name")||"")]])}
// Bắt đầu: bản nháp form giải mới theo loại, mặc định lấy từ lần trước cùng loại (xSrc)
function tqStart(fmt,X){
  xNew=fmt;xEdit=null;xSEdit=null;xQ=false;xClearDraft();xfPoster=null;xSrcCache=null;gsOpt=null;gsPg=null;delete errs.xf;
  const set=(k,v)=>{drafts["xf-"+k]=String(v)};
  set("loai",(TN_FC.find(x=>x[0]===fmt)||[])[5]||"s");set("guests","1");set("reg","1");set("feeG","");
  if(X){// Như lần trước: cùng cài đặt, ngày sang lần tới
    let at=X.at||Date.now();while(at<Date.now())at+=7*864e5;
    for(const k of ["name","courts","place","map","max","target","thu","phi","fee","cp","pay","san","note","incl","gmode","dt","pairReg","lvMin","lvMax","gton","gt","gtv","trao","win2","ptMax","dlH","lockH","koN","koQ"])if(X[k]!=null&&X[k]!=="")set(k,typeof X[k]==="boolean"?(X[k]?"1":"0"):X[k]);
    const h=X.hang||[];if(h.length){set("h1",+h[0]||0);set("h2",+h[1]||0);set("h3",+h[2]||0)}
    set("date",isoDay(at));set("time",hm(at));if(X.end)set("end",X.end)}
  xSrcCache=xSrc(derive());
  // Không còn "Ai thua góp" (giống cá cược) và giải thưởng trích %: chỉ lệ phí cố định / chia đều, thưởng tự điền
  const D=derive();if(!["phi","deu"].includes(xv(D,"thu"))){set("thu","phi");const f=X?(+X.phi||+X.fee||0):(+xv(D,"fee")||+xv(D,"phi")||0);set("phi",f);set("fee",f)}
  set("gt","hang");if(!X&&!gsOnV(xv(D,"gton"))){set("h1","");set("h2","");set("h3","")}if(X&&!(X.hang||[]).length){set("h1",X.gton&&X.gt==="codinh"?+X.gtv||0:0);set("h2",0);set("h3",0)}
}
function tqPage(D){
  if(!xNew){tnPg=null;return ""}
  const fmt=xNew,ty=TN_FC.find(x=>x[0]===fmt)||TN_FC[0],T=gsDefs(D,null),ICF={xoay:"swap",giai:"users",bang:"trophy"};
  mxDr({t:"Tạo lịch đánh",back:"tnback",sub:ty[2]});
  const nm=String(xv(D,"name")||"").trim()||gmAutoName(D);
  let h=`<section class="zsec">${zRow({lead:`<span class="zic ${ty[5]}">${zIco(ICF[fmt]||"swap")}</span>`,t:esc(nm),s:`${ty[2]} · bấm để đổi tên`,right:`<span class="zmuted">${zIco("edit",20)}</span>`,cls:"b"+(tqHl.has("name")?" hl":""),attrs:`data-act="gsopt" data-v="name"`})}</section>`;
  h+=`<div class="zai"><span class="zai-i">${zIco("spark",22)}</span><input id="tq-say" data-draft="tq-say" maxlength="200" placeholder="Gõ để sửa nhanh, VD: 3 sân, 80k" value="${esc(val("tq-say",""))}"${tnBusy?" disabled":""}><button class="zai-s" data-act="tqsay" aria-label="Sửa theo câu đã gõ"${tnBusy?" disabled":""}>${tnBusy?`<i class="zspin"></i>`:zIco("send",18)}</button></div>`;
  if(tqMsg)h+=`<p class="zai-msg">${esc(tqMsg)}${tqUndo?` · <button class="zlk" data-act="tqundo">Hoàn tác</button>`:""}</p>`;
  const miss=[];if(!xv(D,"date")||!xv(D,"time"))miss.push("when");
  for(const [g,K] of tqGroups(fmt)){const rows=K.filter(k=>T[k]).map(k=>{const o=T[k],l=TQ_LB[k]||o.t,m=miss.includes(k);
      return `<button class="zset${tqHl.has(k)?" hl":""}" data-act="gsopt" data-v="${k}">${zIco(GS_ZI[k]||"list",22)}<span class="l">${esc(l)}</span><span class="v${m?" miss":""}">${m?"Cần chọn":esc(o.val)}</span>${zIco("chev",18)}</button>`}).join("");
    if(rows)h+=`<section class="zsec"><div class="zsh sm"><h3>${g}</h3></div>${rows}</section>`}
  const lb={xoay:"Tạo lịch đánh",giai:"Tạo mini game",bang:"Tạo giải"}[fmt]||"Tạo lịch đánh";
  h+=`<div class="hqcta tqcta">${errs.xf?`<small>${esc(errs.xf)}</small>`:miss.length?`<small>Còn ${miss.length} mục cần chọn: Ngày, giờ</small>`:""}<button class="ball go" data-act="tqsave"${xSaving?" disabled":""}>${xSaving?"Đang tạo…":lb}</button></div>`;
  return h+gsSheet(D,null);
}
// Câu gõ → các mục của form giải
function tqApply(o){const set=(k,v)=>{drafts["xf-"+k]=String(v)},fmt=xNew;
  if(o.date!=null)set("date",ymdIso(o.date));if(o.time)set("time",o.time);if(o.end)set("end",o.end);
  if(o.courts)set("courts",o.courts);if(o.place)set("place",o.place);if(o.name)set("name",o.name);
  if(o.people)set("max",o.people);if(o.pairs)set("max",o.pairs*2);
  if(o.thu&&fmt==="xoay")set("thu",o.thu);
  if(o.fee!=null){const f=+o.fee||0;set("cp",f?"1":"0");set("phi",f);set("fee",f);if(f&&!(fmt==="xoay"&&o.thu==="deu"))set("thu","phi")}
  if(o.san!=null)set("san",+o.san||0);if(o.pay)set("pay",o.pay);
  if(o.target)set("target",o.target);if(o.dt)set("dt",o.dt);
  if(o.gton!=null){set("gton",o.gton?"1":"0");if(o.gton&&(o.h1||o.h2||o.h3)){set("gt","hang");set("h1",+o.h1||0);set("h2",+o.h2||0);set("h3",+o.h3||0)}}
  if(o.koN&&fmt==="bang")set("koN",o.koN);
}
async function tqAct(act,b){
  if(!act.startsWith("tq"))return false;
  const D=derive();
  if(act==="tqfmt"){tqHl=new Set();tqUndo=null;tqMsg="";tqStart(b.dataset.v);tnPg="one";tn=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="tqprev"){const X=schedById(b.dataset.id);if(!X)return true;tqHl=new Set();tqUndo=null;tqMsg="";tqStart(X.fmt==="giai"?(X.ko?"bang":"giai"):"xoay",X);tnPg="one";tn=null;render();try{scrollTo({top:0})}catch(e){}return true}
  if(!xNew)return true;
  if(act==="tqundo"){if(tqUndo){for(const k of Object.keys(drafts))if(k.startsWith("xf-"))delete drafts[k];Object.assign(drafts,tqUndo);tqUndo=null;tqHl=new Set();tqMsg="Đã hoàn tác";render()}return true}
  if(act==="tqsay"){const s=String(val("tq-say","")).trim();if(!s||tnBusy)return true;
    const snap=Object.fromEntries(Object.entries(drafts).filter(([k])=>k.startsWith("xf-"))),before=tqVals(D);tnBusy=true;render();
    const cur={fmt:xNew,courts:+xv(D,"courts")||0,place:xv(D,"place")||"",fee:gsFee(D)};
    const a=await tnAI(s,cur);tnBusy=false;
    let o=a&&Object.keys(a).length?a:null;
    if(!o){const p=tnParse(s),k=Object.keys(p).filter(x=>!["date","time"].includes(x)||/ngay|gio|\d+h|thu|chu nhat|mai|\d+\/\d+/.test(tnNorm(s)));if(k.length){o={};for(const x of k)o[x]=p[x]}}
    if(!o){toast("Chưa hiểu câu này. Thử nói rõ hơn, ví dụ “thứ 7 19h”, “3 sân”, “80k”, hoặc bấm từng dòng.");render();return true}
    tqApply(o);
    const after=tqVals(D),ch=Object.keys(after).filter(k=>after[k]!==before[k]);
    tqHl=new Set(ch);tqUndo=ch.length?snap:null;
    const T=gsDefs(D,null),nm=k=>k==="name"?"tên":String(TQ_LB[k]||(T[k]&&T[k].t)||k).toLowerCase();
    tqMsg=ch.length?`Đã sửa ${ch.length} mục: ${ch.map(nm).join(", ")}`:"Không có mục nào thay đổi";
    delete drafts["tq-say"];render();return true}
  if(act==="tqsave"){if(xSaving){toast("Đang tạo, chờ chút nhé…");return true}
    if(!xv(D,"date")||!xv(D,"time")){gsOpt="when";toast("Chọn ngày, giờ trước nhé");render();return true}
    if(gsOnV(xv(D,"gton")))drafts["xf-gt"]="hang";
    const pay=xv(D,"pay");if(pay&&pay!=="off"&&!(BANK&&BANK.acc))mtBankWant=true;
    tqHl=new Set();tqUndo=null;tqMsg="";await xSave(D,"open");if(!xNew)tnPg=null;render();return true}
  return false;
}
