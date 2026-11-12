/* ---------- Tạo lịch đánh gọn 2 bước (canvas "Tạo lịch đánh gọn 2 bước", Tq1–Tq4) ----------
   Bước 1: chỉ chọn loại (hoặc "Như lần trước").
   Bước 2: một trang đủ thông số, điền sẵn; bấm dòng mở bảng trượt; ô AI một dòng sửa nhiều mục một lần,
           dòng vừa đổi được tô và có Hoàn tác. Dùng lại lõi của tạo nhanh: tn, tcRows, tcEdBody, tcEdit, tcReq, tnCreate. */
let tqHl=new Set(),tqUndo=null,tqMsg="";
const TQ_IC={date:"cal",time:"clock",courts:"home",place:"pin",fmt:"swap",n:"users",dt:"users",pairReg:"users",nds:"list",san:"money",san2:"money",thu:"money",fee:"money",pay:"money",sG:"list",pK:"list",pF:"list",ref:"user",gton:"trophy",poster:"img"};
const TQ_GR=[["Khi nào, ở đâu",["date","time","courts","place"]],["Người và tiền",["fmt","n","nds","dt","pairReg","san","san2","thu","fee","pay"]],["Thêm · để nguyên cũng được",["sG","pK","pF","ref","gton","poster"]]];
// Bắt đầu bản nháp cho một loại: điền theo lần trước cùng loại (ngày sang lần tới), mục không bắt buộc lấy cách phổ biến
function tqStart(fmt){
  const o={fmt},L=tnLast(),last=L.find(x=>(x.fmt==="giai"?(x.ko?"bang":"giai"):"xoay")===fmt);
  if(last&&last.at){let at=last.at;while(at<Date.now())at+=7*864e5;const d=new Date(at);o.date=tnDay0(at);o.time=`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;if(last.end)o.end=last.end}
  const t=tnFill(o);
  // Chưa có lần trước: trả tại sân; Social và Mini game mặc định không có giải thưởng (Giải thì phải chọn)
  if(t.pay==null)t.pay="off";if(fmt!=="bang"&&t.gton==null)t.gton=false;
  const s=tcStart(t,"",["fmt"]);tcSettle(s);
  // Số sân đã lấy theo lần trước: không bắt xác nhận lại (trò chuyện cũ hỏi lại, trang một bước thì hiện sẵn)
  if(s.courts)for(const Q of TC_Q)if(Q.k==="courts")s.ans.add(Q.k);
  return s;
}
// Sao chép bản nháp để Hoàn tác
function tqClone(t){const c={};for(const [k,v] of Object.entries(t))c[k]=v instanceof Set?new Set(v):Array.isArray(v)?v.map(x=>x&&typeof x==="object"?{...x}:x):v&&typeof v==="object"?{...v}:v;return c}
const tqVals=t=>Object.fromEntries([...tcRows(t).map(([l,v,k])=>[k,String(v)]),["place",String(t.place||"")],["name",tnName(t)]]);
// Dòng cài đặt: biểu tượng · nhãn · giá trị (xám) · ›; mục bắt buộc còn trống hiện "Cần chọn" đỏ
function tqRow(k,l,v,miss){const hl=tqHl.has(k);
  return `<button class="zset${hl?" hl":""}" data-act="tqed" data-v="${k}">${zIco(TQ_IC[k]||"list",22)}<span class="l">${l}</span><span class="v${miss?" miss":""}">${miss?"Cần chọn":v}</span>${zIco("chev",18)}</button>`}
function tqMiss(t){return [...new Set(tcReq(t).map(Q=>TC_ROWK[Q.k]||Q.k))]}
function tqPage(D){
  const t=tn,miss=tqMiss(t),R=tcRows(t),E=tnEst(t),ty=TN_FC.find(x=>x[0]===t.fmt)||TN_FC[0];
  mxDr({t:"Tạo lịch đánh",back:"tnback",sub:t.from?"Như lần trước":ty[2]});
  const ICF={xoay:"swap",giai:"users",bang:"trophy"};
  let h=`<section class="zsec">${zRow({lead:`<span class="zic ${ty[5]}">${zIco(ICF[t.fmt]||"swap")}</span>`,t:esc(tnName(t)),s:`${ty[2]} · bấm để đổi tên`,right:`<span class="zmuted">${zIco("edit",20)}</span>`,cls:"b"+(tqHl.has("name")?" hl":""),attrs:`data-act="tned" data-v="name"`})}</section>`;
  // Ô AI một dòng: gõ để sửa nhiều mục một lần
  h+=`<div class="zai"><span class="zai-i">${zIco("spark",22)}</span><input id="tq-say" data-draft="tq-say" maxlength="200" placeholder="Gõ để sửa nhanh, VD: 3 sân, 80k" value="${esc(val("tq-say",""))}"${tnBusy?" disabled":""}><button class="zai-s" data-act="tqsay" aria-label="Sửa theo câu đã gõ"${tnBusy?" disabled":""}>${tnBusy?`<i class="zspin"></i>`:zIco("send",18)}</button></div>`;
  if(tqMsg)h+=`<p class="zai-msg">${esc(tqMsg)}${tqUndo?` · <button class="zlk" data-act="tqundo">Hoàn tác</button>`:""}</p>`;
  const V=Object.fromEntries(R.map(([l,v,k])=>[k,[l,v]]));
  V.place=["Địa điểm",t.place?esc(t.place):"Chưa có"];
  if(V.courts)V.courts=["Số sân",`${t.courts||"—"} sân`];
  for(const [g,K] of TQ_GR){const rows=K.filter(k=>V[k]&&!(k==="nds"&&!t.nds)).map(k=>tqRow(k,V[k][0],V[k][1],miss.includes(k))).join("");
    if(rows)h+=`<section class="zsec"><div class="zsh sm"><h3>${g}</h3></div>${rows}${g.startsWith("Khi")&&E&&E.late?`<p class="gdnote zfld" style="color:#c4170f">Dự kiến xong ${tcHm(E.end)}, muộn hơn giờ phải xong. Bớt cặp, thêm sân hoặc chạm ít điểm hơn.</p>`:""}</section>`}
  const lb=t.fmt==="xoay"?"Tạo lịch đánh":"Tạo giải";
  h+=`<div class="hqcta tqcta">${miss.length?`<small>Còn ${miss.length} mục cần chọn: ${miss.map(k=>(V[k]||[k])[0]).join(", ")}</small>`:""}<button class="ball go" data-act="tqgo"${xSaving?" disabled":""}>${xSaving?"Đang tạo…":lb}</button></div>`;
  return h+tqSheet(t)+tnEdSheet();
}
// Bảng trượt sửa một dòng
function tqSheet(t){const k=t.edit;if(!k)return "";
  const L=(tcRows(t).find(r=>r[2]===k)||[])[0]||(k==="place"?"Địa điểm":"");
  let b;
  if(k==="place")b=`<label class="fld"><span class="lbl">Tên sân, khu vực</span><input id="tn-place" data-draft="tn-place" maxlength="60" placeholder="VD: Sân Kỳ Hòa, Q10" value="${esc(val("tn-place",t.place||""))}"></label>`;
  else b=String(tcEdBody(t,k)).replace(/<div class="tcq"><button class="ball go tcok" data-act="tced" data-v="">✓ Xong<\/button><\/div>/g,"").replace(/<button class="ball go tcok" data-act="tced" data-v="">✓ Xong<\/button>/g,"").replace(/ở ô dưới/g,"ở ô sửa nhanh trên đầu trang");
  return `<div class="mxdim" data-act="tqedx"></div><div class="mxsheet gmsh tqsh" role="dialog" aria-label="${esc(L)}"><span class="grab"></span><b class="mxh">${esc(L)}</b>${b}<button class="ball go wide" data-act="${k==="place"?"tqplace":"tqedx"}">Xong</button></div>`;
}
async function tqAct(act,b){
  if(!act.startsWith("tq"))return false;
  const v=b.dataset.v,D=derive();
  if(act==="tqfmt"){xfPoster=null;tqHl=new Set();tqUndo=null;tqMsg="";tn=tqStart(v);const L=TN_FC.find(x=>x[0]===v);if(L)tn.loai=L[5];tnPg="one";render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="tqprev"){const X=schedById(b.dataset.id);if(!X)return true;tnFromPrev(X);xfPoster=null;tn=tcStart(tnFill(tn),"",Object.keys(tn));for(const Q of TC_Q)tn.ans.add(Q.k);tcSettle(tn);tqHl=new Set();tqUndo=null;tqMsg="";tnPg="one";render();try{scrollTo({top:0})}catch(e){}return true}
  if(!tn)return true;
  if(act==="tqed"){tn.edit=v;render();return true}
  if(act==="tqedx"){tn.edit=null;render();return true}
  if(act==="tqplace"){const p=String(val("tn-place",tn.place||"")).trim().slice(0,60);tn.place=p;tn.guess.delete("place");delete drafts["tn-place"];tn.edit=null;tqHl=new Set(["place"]);tqMsg="";tqUndo=null;render();return true}
  if(act==="tqundo"){if(tqUndo){tn=tqUndo;tqUndo=null;tqHl=new Set();tqMsg="Đã hoàn tác";render()}return true}
  if(act==="tqsay"){const s=String(val("tq-say","")).trim();if(!s||tnBusy)return true;
    const snap=tqClone(tn),before=tqVals(tn);tnBusy=true;render();
    const a=await tnAI(s,tnCur(tn));tnBusy=false;
    let o=a&&Object.keys(a).length?a:null;
    if(!o){const p=tnParse(s),k=Object.keys(p).filter(x=>!["date","time"].includes(x)||/ngay|gio|\d+h|thu|chu nhat|mai|\d+\/\d+/.test(tnNorm(s)));if(k.length){o={};for(const x of k)o[x]=p[x]}}
    if(!o){toast("Chưa hiểu câu này. Thử nói rõ hơn, ví dụ “thứ 7 19h”, “3 sân”, “80k”, hoặc bấm từng dòng.");render();return true}
    tnMerge(o);tcTyped(tn,Object.keys(o));tcSettle(tn);tn.edit=null;
    const after=tqVals(tn),ch=Object.keys(after).filter(k=>after[k]!==before[k]);
    tqHl=new Set(ch);tqUndo=ch.length?snap:null;
    const nm=Object.fromEntries([...tcRows(tn).map(([l,,k])=>[k,l.toLowerCase()]),["place","địa điểm"],["name","tên"]]);
    tqMsg=ch.length?`Đã sửa ${ch.length} mục: ${ch.map(k=>nm[k]||k).join(", ")}`:"Không có mục nào thay đổi";
    delete drafts["tq-say"];render();return true}
  if(act==="tqgo"){const m=tqMiss(tn);if(m.length){tn.edit=m[0];toast(`Còn ${m.length} mục cần chọn`);render();return true}
    if(xSaving){toast("Đang tạo, chờ chút nhé…");return true}
    tqHl=new Set();tqUndo=null;tqMsg="";await tnCreate(D);return true}
  return false;
}
