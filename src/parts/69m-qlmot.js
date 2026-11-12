/* ---------- Quản lý một lịch đánh · Mini App (canvas "Quản lý một lịch đánh", Mq1–Mq8) ----------
   Thanh tiến trình 4 chặng (bấm xem lại) · khối tóm tắt · Cần làm (mỗi việc một nút) · danh sách người có lọc ·
   đáy: ⋯ (việc ít dùng) + Thêm người (3 cách: mời qua Zalo, QR tại chỗ, thêm tay).
   Bấm một người: bảng trượt (đã nhận tiền, nhắn, gọi, sửa giới tính/trình, chuyển chờ, huỷ chỗ có hộp thoại). */
let qmAdd=false,qmQr=null,qmListMode="tien";
const qmK=k=>{k=+k||0;if(k>=1000){const t=Math.round(k/100)/10;return `${String(t).replace(".",",")} triệu`}return fmtK(k)};
const qmKs=k=>{k=+k||0;if(k>=1000){const t=Math.round(k/100)/10;return `${String(t).replace(".",",")}tr`}return fmtK(k)};
const qmGiven=n=>String(n||"").trim().split(/\s+/).pop()||"";
// Thanh tiến trình: vạch xanh tới chặng hiện tại, chữ xanh ở chặng đang xem
function qmStep(st,nat,done){
  return `<nav class="zstep" aria-label="Các chặng">${GM_ST.map((t,i)=>`<button data-act="gmst" data-v="${i}" aria-pressed="${i===st}" class="${done||i<=nat?"ok":""}"><i></i><span>${t}</span></button>`).join("")}</nav>`;
}
function qmTag(x,k,po,wait){
  if(x.cancel)return zTag(x.pay==="refund"?"Đã hoàn":x.pay==="ok"||x.pay==="sent"?"Cần hoàn":"Đã huỷ",x.pay==="ok"||x.pay==="sent"?"r":"n");
  if(wait)return zTag("Chờ chỗ","g");
  if(!po||!k)return "";
  return x.pay==="ok"?zTag("Đã trả","s"):x.pay==="sent"?zTag("Chờ xác nhận","g"):zTag("Chưa trả","n");
}
function qmSub(D,x){const lv=xbLv(D,x),g=xbG(D,x);
  return [lv?lvName(lv)+(g==="F"?" · nữ":""):"",regKhach(x)?"khách":"",x.at?`đăng ký ${hm(x.at)}`:""].filter(Boolean).join(" · ")}
function qmRow(D,x,tag){const p=x.pid&&D.pmap.get(x.pid),nm=xbName(D,x);
  return zRow({lead:av(p||{name:nm},"qm",1),t:esc(nm),s:esc(qmSub(D,x)),right:tag,cls:"qmp",attrs:`data-act="xbsel" data-id="${esc(x.id)}"`})}
function qmSum(D,X,R,po){
  const cap=pairRegOn(X),mx=R.max<999?R.max:0,n=R.conf.length,left=mx?Math.max(0,mx-n):null;
  const live=R.all.filter(x=>!x.cancel),paid=live.filter(x=>x.pay==="ok").length,sent=live.filter(x=>x.pay==="sent").length,un=live.filter(x=>po&&feeOf(x)>0&&(x.pay||"none")==="none").length;
  let sub="người đã đăng ký";
  if(cap){const pr=new Set(R.conf.filter(x=>capMate(x)).map(x=>x.team)).size,solo=R.conf.filter(x=>!capMate(x)).length;sub=`người · ${pr} cặp${solo?` · ${solo} lẻ`:""}`}
  let h=`<div class="qmbig"><b class="num">${n}${mx?`<small>/${mx}</small>`:""}</b><span>${sub}${left!=null?(left?` · còn ${left} chỗ`:" · đủ chỗ"):""}${R.wait.length?` · ${R.wait.length} chờ`:""}</span></div>`;
  if(mx)h+=zBar(n*100/mx);
  if(po)h+=`<div class="qmst"><span><b class="g">${paid}</b> đã trả</span>${sent?`<span><b class="o">${sent}</b> chờ xác nhận</span>`:""}<span><b>${un}</b> chưa trả</span></div>`;
  const hv=hvOf(X);
  if(hv.san)h+=`<div class="qmmo">Đã thu ${fmtK(hv.thu)} / tiền sân ${fmtK(hv.san)}${hv.deu?` · chia đều ~${fmtK(hv.each)}/người`:hv.short?` · <em>đủ ${hv.mx} người vẫn thiếu ${fmtK(hv.short)}</em>`:hv.need?` · cần thêm ${hv.need} người là hoà vốn`:" · đủ hoà vốn"}</div>`;
  return `<section class="zsec qmsum">${h}</section>`;
}
// Việc cần làm: [biểu tượng, việc, dòng phụ, nút (chữ, thuộc tính, chính?)]
function qmTodo(D,X,R,po){
  const T=[],s=xState(X),now=Date.now(),due=x=>po&&feeOf(x)>0&&(x.pay||"none")==="none";
  if(s==="draft"||s==="plan")T.push(["info","Lịch còn là nháp",s==="plan"&&X.openAt?`Tự mở đăng ký ${dowVN(X.openAt)} ${hm(X.openAt)}`:"Người chơi chưa thấy lịch này",["Mở đăng ký",`data-act="xopen" data-id="${esc(X.id)}"`,1]]);
  const sent=R.all.filter(x=>x.pay==="sent");
  if(sent.length===1){const x=sent[0];T.push(["money",`${esc(xbName(D,x))} báo đã chuyển ${fmtK(feeOf(x))}`,"Kiểm tra tài khoản rồi xác nhận",["Đã nhận",`data-act="regpayok" data-id="${esc(x.id)}"`,1]])}
  else if(sent.length)T.push(["money",`${sent.length} người báo đã chuyển`,"Đối chiếu app ngân hàng rồi duyệt một lần",["Duyệt",`data-act="xbbulk"`,1]]);
  const un=R.conf.filter(due);
  if(un.length)T.push(["bell",`${un.length} người chưa trả`,esc(un.slice(0,4).map(x=>xbName(D,x)).join(", ")+(un.length>4?"…":"")),["Nhắc",`data-act="xbremind"`]]);
  if(pairRegOn(X)){const solo=R.conf.filter(x=>!capMate(x));if(solo.length>1)T.push(["users",`${solo.length} người chưa có cặp`,"Ghép theo trình, hoặc bấm từng người để ghép tay",["Ghép",`data-act="gmautopair" data-id="${esc(X.id)}"`]])}
  const rf=R.refund.filter(x=>x.pay!=="refund");
  if(rf.length)T.push(["swap",`${rf.length} người đã huỷ, cần hoàn tiền`,esc(rf.slice(0,3).map(x=>xbName(D,x)).join(", ")),["Xem",`data-act="xbfl" data-v="huy"`]]);
  const mx=R.max<999?R.max:0,left=mx?mx-R.conf.length:0;
  if(s==="open"&&xOpen(X)&&(!mx||left>0))T.push(["users",mx?`Còn ${left} chỗ`:`${R.conf.length} người đã đăng ký`,X.deadline?`Hạn đăng ký ${hm(X.deadline)} ${dowVN(X.deadline).toLowerCase()}`:"Gửi lời mời để có thêm người",["Gửi nhóm",`data-act="regshare" data-id="${esc(X.id)}"`]]);
  else if(s==="open"&&mx&&left<=0)T.push(["check","Đã đủ chỗ",R.wait.length?`${R.wait.length} người đang chờ chỗ`:"Người đăng ký thêm sẽ vào danh sách chờ",["Gửi danh sách",`data-act="xbshare"`]]);
  return T;
}
function qmView(D,X){
  return withX(X,()=>{
    const R=regList(D),po=payOn(),s=xState(X),cap=pairRegOn(X),cancel=(S.regs||[]).filter(r=>r.sid===X.id&&r.cancel);
    let h=qmSum(D,X,R,po);
    if(s!=="cancel"&&s!=="done"){const T=qmTodo(D,X,R,po);
      h+=zSec("Cần làm",T.length?T.map(([i,t,sb,b])=>zRow({lead:`<span class="qmi">${zIco(i,24)}</span>`,t,s:sb,cls:"qmtd",right:`<button class="zpill${b[2]?" p":""}" ${b[1]}>${b[0]}</button>`})).join("")
        :zRow({lead:`<span class="qmi ok">${zIco("check",24)}</span>`,t:"Không có việc gì cần làm",s:"Mọi người đã trả tiền, còn chỗ thì gửi lời mời",cls:"qmtd"}))}
    const unpaid=R.all.filter(x=>po&&feeOf(x)>0&&x.pay!=="ok");
    const fl=[["all",`Tất cả ${R.all.length}`],["chua",`Chưa trả ${unpaid.length}`,po],["cho",`Chờ chỗ ${R.wait.length}`,!cap],["huy",`Đã huỷ ${cancel.length}`]].filter(f=>f[2]!==false);
    if(!fl.some(f=>f[0]===xbFl))xbFl="all";
    const chips=`<div class="zchips qmfl" role="group" aria-label="Lọc danh sách">${fl.map(([k,l])=>`<button data-act="xbfl" data-v="${k}" aria-pressed="${xbFl===k}">${l}</button>`).join("")}</div>`;
    let L="";
    if(cap&&xbFl==="all"){const seen=new Set();
      for(const x of R.conf){if(seen.has(x.id))continue;const m=capMate(x);seen.add(x.id);
        if(m){seen.add(m.id);const pa=x.pid&&D.pmap.get(x.pid),pb=m.pid&&D.pmap.get(m.pid),tg=po&&feeOf(x)?(x.pay==="ok"&&m.pay==="ok"?zTag("Đã trả","s"):x.pay==="sent"||m.pay==="sent"?zTag("Chờ xác nhận","g"):zTag("Chưa trả","n")):"";
          L+=zRow({lead:`<span class="qmav2">${av(pa||{name:xbName(D,x)},"qm",1)}${av(pb||{name:xbName(D,m)},"qm",1)}</span>`,t:`${esc(xbName(D,x))} &amp; ${esc(xbName(D,m))}`,s:esc([DT_LB[X.dt||"free"],lvName((xbLv(D,x)+xbLv(D,m))/2)].filter(Boolean).join(" · ")),right:tg,cls:"qmp",attrs:`data-act="xbsel" data-id="${esc(x.id)}"`})}
        else L+=qmRow(D,x,zTag("Chưa có cặp","g"))}
      L+=R.wait.map(x=>qmRow(D,x,zTag("Chờ chỗ","g"))).join("")}
    else{const Ls=xbFl==="huy"?cancel:xbFl==="chua"?unpaid:xbFl==="cho"?R.wait:R.all,wset=new Set(R.wait.map(x=>x.id));
      L=Ls.map(x=>qmRow(D,x,qmTag(x,feeOf(x),po,xbFl!=="cho"&&wset.has(x.id)))).join("")}
    h+=zSec(cap?"Cặp đăng ký":"Người đăng ký",chips+(L||`<p class="qmnone">${R.all.length||xbFl!=="all"?"Không có ai trong mục này.":"Chưa có ai đăng ký. Bấm Thêm người để mời."}</p>`),"","qmlist");
    if(s!=="done"&&s!=="cancel"){
      const main=s==="draft"||s==="plan"?`<button class="ball go" data-act="xopen" data-id="${esc(X.id)}">Mở đăng ký</button>`:`<button class="btn-line qmaddb" data-act="qmadd">${zIco("plusu",22)}<span>Thêm người</span></button>`;
      h+=`<div class="hqcta qmcta"><button class="qmdot" data-act="xbmenu" aria-label="Thêm việc">${zIco("more",24)}</button>${main}</div>`}
    return h+qmSheets(D,X,R);
  });
}
/* ----- Bảng trượt ----- */
const qmShH=(dim,lb,inner,title)=>`<div class="mxdim" data-act="${dim}"></div><div class="mxsheet qmsh" role="dialog" aria-label="${esc(lb)}"><span class="grab"></span>${title?`<b class="mxh">${esc(title)}</b>`:""}${inner}</div>`;
const qmLine=(i,t,s,attrs,red)=>zRow({lead:`<span class="qmi${red?" r":""}">${zIco(i,22)}</span>`,t:red?`<span class="red">${t}</span>`:t,s,chev:true,cls:"qml",attrs});
function qmSheets(D,X,R){
  if(xbShare)return qmListSh(D,X,R);
  if(xbSel){const x=(S.regs||[]).find(r=>r.id===xbSel);if(!x){xbSel=null;return ""}return qmPerson(D,X,R,x)}
  if(qmAdd)return qmShH("qmaddx","Thêm người",qmLine("share","Gửi lời mời qua Zalo","Chọn bạn hoặc nhóm trong Zalo, họ bấm vào thẻ là đăng ký",`data-act="regshare" data-id="${esc(X.id)}"`)
    +qmLine("qr","Mã QR đăng ký tại chỗ","Người ở sân quét bằng Zalo, tự đăng ký trong vài giây",`data-act="qmqr" data-id="${esc(X.id)}"`)
    +qmLine("plusu","Thêm tay (không dùng Zalo)","Tên, giới tính, trình · gắn nhãn khách",`data-act="gmxa"`)
    +`<p class="qmnote">Nên dùng 2 cách đầu: mỗi người gắn với đúng một Zalo, tự nhận tin nhắc và tự chuyển khoản.</p>`,"Thêm người");
  if(xbMenu){const s=xState(X),sent=R.all.filter(x=>x.pay==="sent").length,others=schedUp().filter(x=>x.id!==X.id).length;
    let h=qmLine("edit","Sửa lịch đánh","Giờ, sân, lệ phí, giải thưởng",`data-act="gmxe" data-id="${esc(X.id)}"`);
    if(sent)h+=qmLine("check","Xác nhận tiền nhiều người",`${sent} người báo đã chuyển`,`data-act="gmxb" data-id="${esc(X.id)}"`);
    h+=qmLine("list","Gửi danh sách vào nhóm","Ai đã đăng ký, ai còn chờ, ai chưa trả",`data-act="xbshare" data-id="${esc(X.id)}"`);
    if(others)h+=qmLine("swap","Đổi sang lịch đánh khác",`${others} lịch đang có`,`data-act="gmxs" data-id="${esc(X.id)}"`);
    if(s==="open")h+=qmLine("pause","Tạm dừng đăng ký","Người chơi không đăng ký thêm được",`data-act="xpause" data-id="${esc(X.id)}"`);
    else if(s==="draft"||s==="plan")h+=qmLine("play","Mở đăng ký","Người chơi thấy và đăng ký được",`data-act="xopen" data-id="${esc(X.id)}"`);
    if(s!=="cancel"&&s!=="done"&&s!=="live")h+=qmLine("x","Huỷ lịch đánh","Báo người đã đăng ký, hoàn tiền người đã trả",`data-act="xcancel" data-id="${esc(X.id)}"`,1);
    return qmShH("xbmenux","Thêm việc",h,xName(X))}
  return "";
}
function qmPerson(D,X,R,x){
  const p=x.pid&&D.pmap.get(x.pid),k=feeOf(x),pay=x.pay||"none",nm=xbName(D,x),pos=R.all.indexOf(x),wait=pos>=R.max,zid=zidOf(D,x),lv=xbLv(D,x),g=xbG(D,x),ph=phOfUid(x.uid),po=payOn();
  const sub=[regKhach(x)?"khách":"Zalo",lv?lvName(lv):"",x.at?`đăng ký ${hm(x.at)} ${dowVN(x.at).toLowerCase()}`:""].filter(Boolean).join(" · ");
  let h=`<div class="qmwho">${av(p||{name:nm},"qmb",1)}<span class="zt"><b>${esc(nm)}</b><small>${esc(sub)}</small></span>${qmTag(x,k,po,wait)}</div>`;
  const big=[],act=(i,t,a,kind)=>`<button class="qmact ${kind||"n"}" ${a}>${zIco(i,22)}<span>${t}</span></button>`;
  if(po&&k&&!x.cancel)big.push(pay==="ok"?act("hist","Bỏ đã nhận",`data-act="regpayundo" data-id="${esc(x.id)}"`):act("check",`Đã nhận ${fmtK(k)}`,`data-act="regpayok" data-id="${esc(x.id)}"`,"p"));
  if(x.cancel&&(pay==="ok"||pay==="sent"))big.push(act("check",`Đã hoàn ${fmtK(k)}`,`data-act="regrefund" data-id="${esc(x.id)}"`,"p"));
  big.push(zid?act("chat","Nhắn Zalo",`data-act="zchat" data-v="${esc(zid)}" data-n="${esc(nm)}"`):act("chat","Nhắn Zalo","disabled"));
  big.push(ph?`<a class="qmact n" href="tel:${esc(ph)}">${zIco("phone",22)}<span>Gọi</span></a>`:act("phone","Gọi","disabled"));
  h+=`<div class="qmacts">${big.join("")}</div>`;
  if(x.hoan)h+=`<p class="qmwarn">Cần chuyển lại ${fmtK(x.hoan)} cho ${esc(nm)} (phần bạn cặp).</p>`;
  if(x.payFor==="pair"&&!x.cancel&&!capMate(x))h+=`<p class="qmwarn">${esc(nm)} đã trả cả cặp ${fmtK(k)}, chưa có bạn cặp. <button class="zlk" data-act="caprf" data-id="${esc(x.id)}">Huỷ cặp · hoàn ${fmtK(k/2)}</button></p>`;
  if(!x.cancel){
    const seg=(L,cur,a)=>`<div class="zseg qmseg">${L.map(([v,t])=>`<button data-act="${a}" data-id="${esc(x.id)}" data-v="${v}" aria-pressed="${cur===v}">${t}</button>`).join("")}</div>`;
    h+=`<span class="qmlb">Giới tính · trình (chỉnh nếu chọn chưa đúng)</span>${seg([["M","Nam"],["F","Nữ"]],g==="F"?"F":g==="M"?"M":"","qmgen")}${seg(LV4.map(([v,t])=>[v,t]),lv?lvSnap(lv):"","xblv")}`;
    if(pairRegOn(X)&&!capMate(x)){const S2=R.conf.filter(y=>y.id!==x.id&&!capMate(y));
      if(S2.length)h+=`<span class="qmlb">Ghép cặp với</span><div class="zchips">${S2.map(y=>`<button data-act="gmpairw" data-id="${esc(x.id)}" data-v="${esc(y.id)}">${esc(xbName(D,y))}</button>`).join("")}</div>`}}
  let L="";
  if(!x.cancel&&!wait&&pos>=0)L+=qmLine("down","Chuyển xuống danh sách chờ","Nhường chỗ cho người khác",`data-act="xbtowait" data-id="${esc(x.id)}"`);
  if(!x.cancel)L+=qmLine("x","Huỷ chỗ",pay==="ok"||pay==="sent"?"Hỏi lại trước khi huỷ · ghi cần hoàn tiền":"Hỏi lại trước khi huỷ",`data-act="qmhuy" data-id="${esc(x.id)}"`,1);
  if(L)h+=`<div class="qmls">${L}</div>`;
  return qmShH("xbselx",nm,h);
}
// Gửi danh sách vào nhóm (chữ): chọn kiểu, xem trước, gửi
function qmListSh(D,X,R){
  const po=payOn(),M=[["tien","Kèm tiền",po],["ten","Chỉ tên"],["cap","Theo cặp",pairRegOn(X)],["nhac","Nhắc giờ đánh"],["cb","Chốt danh sách"]].filter(m=>m[2]!==false);
  if(!M.some(m=>m[0]===xbSendMode))xbSendMode=M[0][0];
  return qmShH("xbsharex","Gửi danh sách vào nhóm",`<div class="zchips">${M.map(([k,l])=>`<button data-act="xbmode" data-v="${k}" aria-pressed="${xbSendMode===k}">${l}</button>`).join("")}</div>
    <pre class="qmpre">${esc(xbGroupText(D,X,R,xbSendMode))}</pre><button class="ball go wide" data-act="xbsend" data-id="${esc(X.id)}">Gửi vào nhóm Zalo</button>`,"Gửi danh sách vào nhóm");
}
/* ----- Mã QR đăng ký tại chỗ (Mq7) ----- */
function qmQrPg(D,X){
  const link=miniLink(CID,X.id),R=withX(X,()=>regList(D)),mx=R.max<999?R.max:0,left=mx?Math.max(0,mx-R.conf.length):null;
  mxDr({t:"Đăng ký tại chỗ",back:"qmqrx",sub:esc(xName(X))});
  return `<section class="zsec qmqr"><b>${esc(xName(X))}</b><small>${esc([X.at&&`${dowVN(X.at)} ${dmy(X.at).slice(0,5)}`,X.at&&hm(X.at),left!=null?(left?`còn ${left} chỗ`:"đủ chỗ · vào danh sách chờ"):""].filter(Boolean).join(" · "))}</small>
    <div class="qmqrbox">${qrSvgText(link,240)}</div><b class="t">Mở Zalo, quét mã này để đăng ký</b><small>Người quét đăng ký bằng Zalo của họ. Bạn thấy họ hiện trong danh sách ngay, không cần duyệt.</small></section>
    <div class="hqcta two"><button class="btn-line" data-act="qmqrsave" data-id="${esc(X.id)}">Lưu ảnh</button><button class="ball go" data-act="regshare" data-id="${esc(X.id)}">Gửi vào nhóm</button></div>`;
}
function qmQrImg(X){
  const link=miniLink(CID,X.id),q=qrcode(0,"M");q.addData(link);q.make();
  const n=q.getModuleCount(),W=720,H=900,cv=document.createElement("canvas");cv.width=W;cv.height=H;const g=cv.getContext("2d");
  g.fillStyle="#fff";g.fillRect(0,0,W,H);g.textAlign="center";g.fillStyle="#141415";
  const F=(w,s)=>`${w} ${s}px -apple-system, "Segoe UI", Roboto, Arial, sans-serif`;
  g.font=F(700,40);g.fillText(xName(X).slice(0,28),W/2,90);
  g.font=F(400,28);g.fillStyle="#767a7f";g.fillText([X.at&&`${dowVN(X.at)} ${dmy(X.at).slice(0,5)}`,X.at&&hm(X.at),X.place].filter(Boolean).join(" · ").slice(0,44),W/2,136);
  const sz=520,cell=Math.floor(sz/(n+4)),qs=cell*(n+4),x0=(W-qs)/2,y0=180;g.fillStyle="#000";
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(q.isDark(r,c))g.fillRect(x0+(c+2)*cell,y0+(r+2)*cell,cell,cell);
  g.fillStyle="#006af5";g.font=F(500,34);g.fillText("Mở Zalo, quét mã để đăng ký",W/2,y0+qs+70);
  g.fillStyle="#767a7f";g.font=F(400,24);g.fillText("Pikeco · đăng ký bằng Zalo trong vài giây",W/2,y0+qs+112);
  return cv.toDataURL("image/png");
}
async function qmAct(act,b){
  const id=b.dataset.id,D=derive(),X=(id&&schedById(id))||(routeX&&schedById(routeX));
  const top=()=>{try{scrollTo({top:0})}catch(e){}};
  if(act==="qmadd"){qmAdd=true;xbMenu=false;render();return true}
  if(act==="qmaddx"){qmAdd=false;render();return true}
  if(act==="qmqr"){qmAdd=false;qmQr=X?X.id:null;render();top();return true}
  if(act==="qmqrx"){qmQr=null;render();top();return true}
  if(act==="qmqrsave"){if(!X)return true;let data="";try{data=qmQrImg(X)}catch(e){}
    const Z=window.ZMP;if(!data){toast("Chưa tạo được ảnh, chụp màn hình mã QR nhé.");return true}
    if(MINI&&Z&&Z.saveImageToGallery){try{await Z.saveImageToGallery({imageBase64Data:data});toast("Đã lưu mã QR vào thư viện ảnh")}catch(e){toast("Chưa lưu được ảnh: chụp màn hình mã QR để dùng nhé.")}return true}
    try{const a=document.createElement("a");a.href=data;a.download=`QR-dang-ky-${slugOf(xName(X))||"lich"}.png`;document.body.appendChild(a);a.click();a.remove();toast("Đã lưu mã QR")}catch(e){}return true}
  if(act==="qmgen"){const x=(S.regs||[]).find(z=>z.id===id),v=b.dataset.v==="F"?"F":"M";if(!x)return true;
    await write(async()=>{await db.collection("regs").doc(id).update({gender:v});if(x.pid)await db.collection("players").doc(x.pid).update({gender:v})},v==="F"?"Đã sửa: Nữ":"Đã sửa: Nam");return true}
  if(act==="qmhuy"){const x=(S.regs||[]).find(z=>z.id===id);if(!x)return true;if(!armOr("qmhuy:"+id))return true;
    const paid=x.pay==="ok"||x.pay==="sent",nm=xbName(D,x),Y=schedById(String(x.sid||"").split("~")[0]);
    await write(async()=>{if(paid)await db.collection("regs").doc(id).update({cancel:true,cancelAt:Date.now(),rejBy:who()});else await db.collection("regs").doc(id).delete();if(Y)await xbLogAdd(Y,`huỷ chỗ ${nm}`)},paid?`Đã huỷ chỗ ${nm} · nhớ hoàn tiền`:`Đã huỷ chỗ ${nm}`);
    xbSel=null;render();return true}
  return false;
}
// Hộp thoại hỏi lại: nói rõ hậu quả
function qmCfm(k,id){
  if(k==="qmhuy"){const x=(S.regs||[]).find(z=>z.id===id);if(!x)return null;const D=derive(),nm=xbName(D,x),Y=schedById(String(x.sid||"").split("~")[0]),k2=Y?withX(Y,()=>feeOf(x)):0,R=Y?withX(Y,()=>regList(D)):null;
    const m=[x.pay==="ok"?`${nm} đã trả ${fmtK(k2)}. Sau khi huỷ, ${nm} nằm trong danh sách cần hoàn tiền.`:x.pay==="sent"?`${nm} đã báo chuyển ${fmtK(k2)}. Sau khi huỷ, ${nm} nằm trong danh sách cần hoàn tiền.`:`${nm} bị xoá khỏi danh sách. Nhớ nhắn báo cho ${nm}.`];
    if(R&&R.wait.length&&R.conf.includes(x))m.push(`${xbName(D,R.wait[0])} (đầu danh sách chờ) được vào thay.`);
    return [`Huỷ chỗ của ${nm}?`,m.join(" "),"Huỷ chỗ","d"]}
  if(k==="xcancel"){const X=schedById(id);if(!X)return null;const D=derive(),R=withX(X,()=>regList(D)),pd=R.all.filter(x=>x.pay==="ok"||x.pay==="sent").length;
    return [`Huỷ ${xName(X)}?`,R.all.length?`${R.all.length} người đã đăng ký sẽ thấy lịch đã huỷ. Nhớ nhắn báo họ${pd?`, và hoàn tiền cho ${pd} người đã trả`:""}.`:"Chưa ai đăng ký. Lịch sẽ chuyển sang đã huỷ.","Huỷ lịch đánh","d"]}
  return null;
}
/* ----- Thẻ mời đăng ký gửi qua Zalo (canvas Sh1–Sh4) -----
   Ảnh: đủ ngày giờ, sân, lệ phí, số chỗ, giải thưởng, người đã đăng ký, dải "bấm vào thẻ". Tiêu đề: tên + điểm hấp dẫn nhất.
   Mô tả ≤ 3 dòng: lời nhắn (hoặc điểm hay của loại) · ngày giờ sân · hạn đăng ký / hết chỗ vẫn chờ được. */
function qmCardInfo(D,X){
  const R=regList(D),mx=+X.max||0,n=R.conf.length,left=mx?Math.max(0,mx-n):null,cap=pairRegOn(X),fee=xFee(X);
  const hang=X.gton&&X.gt==="hang"?(X.hang||[]).map(v=>+v||0):[],now=Date.now();
  const me=(()=>{try{const p=S.link&&S.link.status==="ok"&&D.pmap.get(S.link.pid);return qmGiven((p&&p.name)||zaloProf().n||"")}catch(e){return ""}})();
  const slot=k=>cap?`${Math.floor(k/2)} cặp`:`${k} chỗ`;
  const hl=hang[0]?`giải Nhất ${qmK(hang[0])}`:left===0?"hết chỗ, vẫn đăng ký chờ được":left!=null&&left<=3?`chỉ còn ${slot(left)}`:left!=null?`còn ${slot(left)}`:"";
  const ty=X.fmt==="giai"?(hang.some(Boolean)?[["Nhất",hang[0]],["Nhì",hang[1]],["Ba",hang[2]]].filter(z=>z[1]).map(([a,k])=>`${a} ${qmKs(k)}`).join(" · ")+(left?` · còn ${slot(left)}`:""):`${X.ko?"Chia bảng rồi đánh loại":"Cặp cố định, đánh vòng tròn"} · đăng ký theo cặp`)
    :"Ai cũng đánh, app tự xoay cặp cân trình";
  const d=X.at?(sameDay(X.at,now)?`${new Date(X.at).getHours()>=17?"Tối nay":"Hôm nay"} ${hm(X.at)}`:`${["CN","T2","T3","T4","T5","T6","T7"][new Date(X.at).getDay()]} ${dmy(X.at).slice(0,5)} · ${hm(X.at)}`):"";
  const when=[d,X.place].filter(Boolean).join(" · ");
  const extra=left===0?"Hết chỗ vẫn vào danh sách chờ được":X.deadline&&X.deadline>now?`Hạn đăng ký ${hm(X.deadline)} ${dowVN(X.deadline).toLowerCase()}`:[n?`${n} người đã đăng ký`:"",fee?`${fmtK(fee)}/người`:"Miễn phí"].filter(Boolean).join(" · ");
  return {name:xName(X),me,hl,ty,when,extra};
}
function qmCardTD(c,msg){msg=String(msg||"").trim();
  const t=(msg&&c.me?`${c.me} mời bạn: `:"")+c.name+(c.hl?` · ${c.hl}`:"");
  return {t,d:[msg?`“${msg}”`:c.ty,c.when,c.extra].filter(Boolean).join("\n")};
}
async function qmShare(D,X){
  const inv=withX(X,()=>qmCardInfo(D,X));
  await shareOut({title:"Gửi lời mời qua Zalo",inv,path:pathOf("app",{tab:"dk",x:X.id})});
}
