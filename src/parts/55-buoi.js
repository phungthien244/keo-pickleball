/* ---------- Quản lý buổi: Chuẩn bị → Đang đánh → Chốt buổi ----------
   Không khoá cứng: điểm danh, sân, điểm, chi phí, giải sửa được trước, trong và sau giải đấu.
   Dữ liệu thêm (cùng collection app/ nên không cần đổi luật Firestore):
     app/pay-<giải đấu>  { paid:{id:true}, adj:{id:k} }   ai đã chuyển, số riêng từng người
     app/led-<mã>    { k, note, at, by }               dòng thu (+) / chi (−) ghi tay vào sổ quỹ
     app/hist-<giải đấu> thêm paid, adj, track, closedAt, closedBy, editedAt, editedBy        */
let sheetOpen=false,qView="buoi",ledForm=null,chotMien=false;
const payDoc=sid=>(S.pays&&S.pays["pay-"+sid])||{};
const phaseOf=D=>(D.SM.length||D.c.phase==="live"||(isG(D.c)&&D.c.giai&&D.c.giai.locked))?"live":"prep";
const fmtTxt=c=>isG(c)?(isKO(c.giai)?"Vòng bảng → Knockout":"Cặp cố định xoay vòng"):"Xoay cặp";
const who=()=>authUser&&!authUser.isAnonymous?(authUser.displayName||"Ban tổ chức"):"Trọng tài";
const hm=t=>t?new Date(t).toLocaleTimeString("vi-VN",{hour:"2-digit",minute:"2-digit"}):"";
const dhm=t=>t?`${hm(t)} ${dmy(t)}`:"";
const COSTS=[["court","Chi phí sân"],["water","Chi phí nước"],["ball","Chi phí bóng"],["other","Khác"]];
// Thanh 3 bước: luôn dính dưới các tab, bấm để chuyển qua lại. n = bước đang xem, ph = bước thật của buổi.
let stepView=null;
function steps3(n,D){
  // Hôm nay chỉ còn 2 tab: Quản lý (chuẩn bị, cài đặt, chốt) · Đang đánh (sân, tiếp theo, kết quả, xếp hạng)
  const live=D?phaseOf(D)==="live":n===2,L=[["prep","Quản lý"],["live","Đang đánh"]],cur=n===2?"live":"prep";
  return `<nav class="bsteps b2" aria-label="Hôm nay">${L.map(([v,l])=>{const on=v===cur,off=v==="live"&&!live;
    return `<button class="${on?"on":""}${off?" dim":""}" data-act="step" data-v="${v}"${on?' aria-current="page"':""}>${v==="live"&&live?'<i class="ldot" aria-hidden="true"></i>':""}${l}</button>`}).join("")}</nav>`;
}
const card=(t,body,right="")=>`<section class="card2"><h2 class="ch2"><span>${t}</span>${right}</h2><div class="cb">${body}</div></section>`;
const cfIn=(k,label,v)=>`<label class="fld"><span class="lbl">${label}</span><input id="cf-${k}" data-draft="cf-${k}" data-save="cfg" data-key="${k}" type="number" inputmode="decimal" min="0" value="${esc(val("cf-"+k,v))}"></label>`;
const sgB=(k,v,cur,l,dis)=>`<button data-act="cset" data-k="${k}" data-v="${v}" aria-pressed="${cur===v}" ${dis?"disabled":""}>${l}</button>`;

/* ----- các khối cài đặt dùng chung cho Chuẩn bị và bảng Sửa giữa buổi ----- */
let attAdd=false;
function attChips(D){
  const busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b]));
  const n=D.players.filter(p=>p.active!==false).length;
  if(!D.players.length)return `<p class="rule">Chưa có thành viên. Nhập tên bên dưới, mỗi dòng một người.</p><div class="attnew">${addPanel(D,[])}</div>`;
  const L=D.players.filter(p=>!p.hold||p.active!==false).sort((a,b)=>(busy.has(b.id)-busy.has(a.id))||((a.active===false)-(b.active===false))||String(a.name).localeCompare(String(b.name),"vi"));
  const away=D.players.filter(p=>p.active===false);
  const X=xCur(),RG=X?(S.regs||[]).filter(r=>r.sid===X.id&&!r.cancel):[],byP=new Map(RG.filter(r=>r.pid).map(r=>[r.pid,r]));
  // Giải theo lịch: chỉ hiện người đã đăng ký và người đang có mặt; thành viên khác thêm qua "+ Người đến muộn"
  const L0=L;if(X)L.splice(0,L.length,...L0.filter(p=>byP.has(p.id)||p.active!==false||busy.has(p.id)));
  // Check-in: quét mã (QR), BTC bấm tay (TAY), vừa quét chờ duyệt, đã đăng ký chưa tới
  const tag=id=>{const r=byP.get(id);if(!r)return "";return r.arrived?(r.arrBy==="btc"?`<small class="atag b">✋ TAY</small>`:`<small class="atag q">⌗ QR</small>`):r.ci?`<small class="atag w">● chờ duyệt</small>`:`<small class="atag">đăng ký</small>`};
  return `<div class="lab" style="margin:0"><span class="meta num">${X?`${n} có mặt · ${RG.length} đăng ký`:`${n}/${D.players.length} người có mặt`}</span>${X?`<button class="lnk" data-act="hnlate" data-id="${esc(X.id)}">＋ Người đến muộn</button>`:`<button class="lnk" data-act="attall">${n===D.players.length?"Bỏ chọn hết":"Chọn tất cả"}</button>`}</div>
  <div class="attc">${L.map(p=>{const on=p.active!==false;return `<button class="ac${on?" on":""}${busy.has(p.id)?" busy":""}" data-act="att" data-id="${p.id}" aria-pressed="${on}">${on?"✓ ":""}${esc(p.name)}${busy.has(p.id)?" · trên sân":""}${tag(p.id)}</button>`}).join("")}<button class="ac add" data-act="attadd" aria-expanded="${attAdd}">${attAdd?"✕ Đóng":"+ Người mới"}</button></div>
  ${attAdd?`<div class="attnew">${addPanel(D,away)}</div>`:""}`;
}
function buoiBlock(D){
  const c=D.c,G=isG(c),lockF=D.SM.length>0;
  return `<label class="fld"><span class="lbl">Tên giải đấu / tên giải · không bắt buộc</span><input id="cf-sname" data-draft="cf-sname" data-save="cfg" data-key="sname" maxlength="60" placeholder="Ví dụ: Giải đấu tối thứ 5" value="${esc(val("cf-sname",c.sname||""))}"></label>
  <div class="fld"><span class="lbl">Thể thức</span><span class="seg segf">${(()=>{const cur=G?(isKO(c.giai)?"bang":"giai"):"xoay";return sgB("fmt","xoay",cur,"Xoay cặp",lockF)+sgB("fmt","giai",cur,"Cặp cố định vòng tròn",lockF)+sgB("fmt","bang",cur,"Vòng bảng → Knockout",lockF)})()}</span>${lockF?`<small class="rule">Đã có trận nên giữ nguyên thể thức.</small>`:""}</div>`;
}
// Tên sân (để loa đọc đúng) và màu thẻ sân. Ví dụ thuê sân 2, 3, 4 thì đặt tên 2, 3, 4.
let cnOpen=false;
function courtNames(c){
  const n=Math.max(1,+c.courts||1),custom=Array.from({length:n},(_,i)=>cName(i+1)!==String(i+1)).some(Boolean);
  const chips=Array.from({length:n},(_,i)=>`<span class="cnchip" style="--cc:${cColor(i+1)}">Sân ${esc(cName(i+1))}</span>`).join("");
  let h=`<div class="cnbar"><span class="cnchips">${chips}</span><button class="lnk" data-act="cnopen" aria-expanded="${cnOpen}">${cnOpen?"Xong":"Đổi tên, màu sân"}</button></div>`;
  if(!cnOpen)return h;
  return h+`<div class="cnlist">${Array.from({length:n},(_,k)=>{const i=k+1,cur=cColor(i);return `<div class="cnrow"><span class="cnno" style="--cc:${cur}">${i}</span>
    <label class="cnin"><span class="sr">Tên sân thứ ${i}</span><span class="pre">Sân</span><input id="cn-${i}" data-draft="cn-${i}" data-save="cname" data-i="${i}" maxlength="12" placeholder="${i}" value="${esc(val("cn-"+i,((c.cnames||[])[k])||""))}"></label>
    <span class="cnsw">${CCOL.map(([hx,lb])=>`<button class="sw${hx===cur?" on":""}" style="--sw:${hx}" data-act="ccol" data-i="${i}" data-v="${hx}" aria-label="Màu ${lb}" aria-pressed="${hx===cur}"></button>`).join("")}</span></div>`}).join("")}
    <small class="rule">Gõ đúng số hoặc tên sân thật, ví dụ đánh sân 2, 3, 4 thì đặt tên 2, 3, 4. Loa sẽ đọc “mời vào sân số 2”. Màu dùng cho thẻ trận và lịch của sân đó.</small></div>`;
}
function fmtBlock(D){
  const c=D.c,G=isG(c),w2=winBy2(c),mx=ptMax(c);
  return `<div class="srow"><span>Số sân</span><span class="stepper"><button data-act="courts" data-d="-1" aria-label="Bớt sân">−</button><span class="num">${c.courts}</span><button data-act="courts" data-d="1" aria-label="Thêm sân">+</button></span></div>
  ${courtNames(c)}
  ${G&&isKO(c.giai)?`<div class="kobd kopts"><b class="lbl">Luật điểm từng vòng · Vòng bảng → Knockout</b>${koRules(koK(c.giai))}</div>`:""}
  <div class="srow"><span>${G&&isKO(c.giai)?"Chạm điểm (mặc định)":"Chạm điểm"}</span><span class="stepper"><button data-act="target" data-d="-1" aria-label="Giảm điểm">−</button><span class="num">${c.target}</span><button data-act="target" data-d="1" aria-label="Tăng điểm">+</button></span></div>
  <span class="seg segf"><button data-act="win2" data-v="1" aria-pressed="${w2}">Thắng cách 2</button><button data-act="win2" data-v="0" aria-pressed="${!w2}">Chạm là thắng</button></span>
  ${w2?`<span class="seg segf"><button data-act="ptmax" data-v="0" aria-pressed="${!mx}">Không giới hạn</button><button data-act="ptmax" data-v="1" aria-pressed="${!!mx}">Có điểm trần</button></span>
  ${mx?`<div class="srow"><span>Điểm trần</span><span class="stepper"><button data-act="ptmaxd" data-d="-1" aria-label="Giảm điểm trần">−</button><span class="num">${mx}</span><button data-act="ptmaxd" data-d="1" aria-label="Tăng điểm trần">+</button></span></div>`:""}`:""}
  <small class="rule">${esc(ruleTxt(c))}.${w2&&mx?` Hoà ${mx-1}–${mx-1} thì ai được ${mx} trước là thắng.`:""}</small>
  ${G?"":`<div class="fld"><span class="lbl">Ưu tiên ghép</span><span class="seg segf"><button data-act="gmode" data-v="mix" aria-pressed="${c.gmode!=="same"}">Khác giới</button><button data-act="gmode" data-v="same" aria-pressed="${c.gmode==="same"}">Cùng giới</button></span></div>`}`;
}
// Trận định sẵn (xoay cặp): ban tổ chức chọn sẵn vài trận đầu, sau đó app tự xếp như cũ
let preSel=[];
function presetBlock(D){
  const c=D.c;
  if(c.preOn!==true)return `<small class="rule">App tự ghép tất cả các trận. Tích để chọn sẵn vài trận đầu (ví dụ 5 trận), sau đó app tự xếp tiếp như cũ.</small>`;
  const P=c.presets||[],used=new Set(D.SM.map(m=>m.preset).filter(Boolean)),nm=id=>esc(D.pmap.get(id)?.name||"?");
  const team=ids=>`<span class="pt">${ids.map(id=>av(D.pmap.get(id),"xs",1)).join("")}<span>${ids.map(nm).join(" &amp; ")}</span></span>`;
  let h=P.length?`<div class="prel">${P.map((p,i)=>{const u=used.has(p.id);return `<div class="prer${u?" done":""}"><b class="no num">${i+1}</b><span class="pm">${team(p.a)}<em>vs</em>${team(p.b)}</span>${u?`<small>Đã vào sân</small>`:`<span class="pb"><button class="ghost" data-act="premv" data-id="${p.id}" data-d="-1" aria-label="Lên" ${i===0?"disabled":""}>↑</button><button class="ghost" data-act="premv" data-id="${p.id}" data-d="1" aria-label="Xuống" ${i===P.length-1?"disabled":""}>↓</button><button class="ghost danger" data-act="predel" data-id="${p.id}" aria-label="Bỏ">✕</button></span>`}</div>`}).join("")}</div>`:`<small class="rule">Chưa có trận định sẵn nào.</small>`;
  const act=D.players.filter(p=>p.active!==false);
  const slot=i=>preSel[i]?`<span class="gs on">${av(D.pmap.get(preSel[i]),"sm",1)}${nm(preSel[i])}</span>`:`<span class="gs">${i<2?"Đội 1":"Đội 2"}</span>`;
  h+=`<div class="gadd"><span class="lbl">Thêm trận ${P.length+1} · chạm chọn 4 người: 2 người đầu là đội 1, 2 người sau là đội 2</span>
    <div class="gsel">${slot(0)}${slot(1)}<b>vs</b>${slot(2)}${slot(3)}<button class="primary" data-act="preadd" ${preSel.length<4?"disabled":""}>Thêm trận</button></div>
    ${errs.pre?`<p class="err">${esc(errs.pre)}</p>`:""}${pplPick(D,act,{act:"prepick",key:"pre",sel:preSel})}</div>
    <small class="rule">Khi bấm Xếp trận, các trận này vào sân trước theo đúng thứ tự (trận nào có người đang bận thì chờ lượt sau). Hết danh sách thì app tự xếp như cũ.</small>`;
  return h;
}
// Trọng tài cho buổi: bật thì giao sân ngay tại đây, mời thêm trọng tài không cần vào Cài đặt CLB
function refBlock(D){
  if(D.c.refOn!==true)return `<small class="rule">Giải đấu này ban tổ chức tự nhập tỉ số. Tích “Trọng tài” để giao sân cho trọng tài nhập điểm.</small>`;
  if(legacy||!isAdm())return `<small class="rule">Chỉ chủ CLB và quản lý đăng nhập Google mới giao sân cho trọng tài được.</small>`;
  const link=absUrl("/"+CID+"/dang-nhap").replace(/^https?:\/\//,"");
  return refRows()+`<div class="two" style="margin-top:8px"><button class="line" data-act="inv" data-v="scorer">+ Mời trọng tài qua Zalo</button><button class="line" data-act="cp" data-v="${esc(absUrl("/"+CID+"/dang-nhap"))}">Copy link vào bằng PIN</button></div>
    ${invBox("scorer")}
    <small class="rule">Trọng tài vào ${esc(link)}, nhập tên và PIN${CLUB&&CLUB.pinAt?"":" (chưa đặt PIN: đặt trong Cài đặt CLB)"}, hoặc bấm link mời trong Zalo. Vào xong tên hiện ở danh sách trên, chạm S1, S2… để giao sân.</small>`;
}
const tick=(act,on,label)=>`<button class="tick${on?" on":""}" data-act="${act}" aria-pressed="${on}"><span class="box" aria-hidden="true">${on?"✓":""}</span>${label}</button>`;
function moneyBlock(D){
  const c=D.c,thu=c.thu||"keo",M=money(D),n=D.players.filter(p=>p.active!==false).length;
  if(c.cphi===false)return `<small class="rule">Giải đấu này không thu phí. Tích “Chi phí” để chọn cách thu và nhập chi phí sân, nước, bóng.</small>`;
  let h=`<div class="fld"><span class="lbl">Cách thu</span><span class="seg segw">${Object.entries(THU).filter(([v])=>v!=="khong").map(([v,l])=>sgB("thu",v,thu,l)).join("")}</span>
   <small class="rule">${thu==="keo"?"Đội thua mỗi người góp theo luật thua góp. Quỹ thua góp thiếu so với chi phí thì chia theo số trận mỗi người đã đánh.":thu==="deu"?"Chi phí giải đấu chia đều cho những người có đánh.":thu==="phi"?"Mỗi người có đánh đóng một mức cố định. Dư vào quỹ CLB, thiếu thì quỹ CLB bù.":"Không ai phải đóng, quỹ CLB trả toàn bộ chi phí giải đấu."}</small></div>`;
  if(thu==="phi")h+=`<div class="form">${cfIn("phi","Mỗi người đóng (k)",c.phi||50)}</div>`;
  if(thu==="keo")h+=`<div class="form">${cfIn("fee","Thua thường (k/người)",c.fee)}${cfIn("cap","Trần mỗi người (k)",c.cap)}
     <label class="fld"><span class="lbl">Chấp cân trình</span><select id="cf-keo" data-save="cfg" data-key="keo"><option value="1" ${c.keo?"selected":""}>Bật</option><option value="0" ${!c.keo?"selected":""}>Tắt</option></select></label>
     <label class="fld"><span class="lbl">Lệch từ</span><select id="cf-thr" data-save="cfg" data-key="thr">${[0.65,0.7,0.75,0.8].map(x=>`<option value="${x}" ${c.thr===x?"selected":""}>${Math.round(x*100)}% thắng</option>`).join("")}</select></label>
     ${cfIn("hi","Đội mạnh thua (k)",c.hi)}${cfIn("lo","Đội yếu thua (k)",c.lo)}</div>`;
  h+=`<span class="lbl">Chi phí giải đấu (k)</span><div class="form">${COSTS.map(([k,l])=>cfIn(k,l,c.costs[k])).join("")}</div>`;
  const est=thu==="phi"?(+c.phi||0)*n:thu==="deu"?M.cost:null;
  h+=`<div class="tot"><span>${D.done.length?`Phải thu tới giờ ${fmtK(M.collected)}`:est!=null?`Dự kiến thu ${fmtK(est)}`:"Thu theo trận thua"}</span><span>Chi ${fmtK(M.cost)}</span></div>`;
  return h;
}
function prizeBlock(D){
  const c=D.c,gt=c.gt||"khong",G=isG(c);
  if(gt==="khong")return `<small class="rule">Giải đấu này không trao giải. Tích “Giải thưởng” để chọn cách lập quỹ giải.</small>`;
  const opts=G?["hang","trich","gop"]:["hang","trich","codinh","gop"],top3=G||gt==="hang"||c.trao==="top3";
  let h=`<span class="seg segw">${opts.map(v=>sgB("gt",v,gt,GT[v])).join("")}</span>`;
  if(!G&&gt!=="hang")h+=`<div class="fld"><span class="lbl">Trao cho</span><span class="seg segw">${sgB("trao","namnu",top3?"top3":"namnu","Số 1 nam & Số 1 nữ")}${sgB("trao","top3",top3?"top3":"namnu","Hạng 1, 2, 3")}</span></div>`;
  if(gt==="hang"){const k=hangOf(c);
    h+=`<div class="form f3">${cfIn("hang1","Giải nhất (k)",k[0])}${cfIn("hang2","Giải nhì (k)",k[1])}${cfIn("hang3","Giải ba (k)",k[2])}</div>
    <small class="rule">Quỹ CLB trả tổng ${fmtK(k[0]+k[1]+k[2])}. Để 0 nếu không trao hạng đó.</small>`;
  }else{
    h+=`<div class="form">${cfIn("gtv",gt==="trich"?"Trích bao nhiêu % phần dư":gt==="codinh"?"Quỹ CLB bỏ ra (k)":"Mỗi người góp thêm (k)",c.gtv||(gt==="trich"?30:gt==="codinh"?200:20))}</div>`;
    if(top3){const p=chiaOf(c),t=p[0]+p[1]+p[2];
      h+=`<span class="lbl">Chia quỹ giải (%)</span><div class="form f3">${cfIn("chia1","Nhất %",p[0])}${cfIn("chia2","Nhì %",p[1])}${cfIn("chia3","Ba %",p[2])}</div>
      <small class="rule"${t!==100?' style="color:var(--lose)"':""}>Tổng ${t}%${t!==100?" · nên đúng 100%":""}.</small>`}
  }
  return h+`<small class="rule">${G?"Trao cho 3 cặp đứng đầu bảng xếp hạng cuối giải.":top3?"Trao cho 3 người đứng đầu bảng xếp hạng giải đấu, chỉ xét người đánh ít nhất 70% số trận trung bình.":"Chia đều cho Số 1 nam và Số 1 nữ của giải đấu, chỉ xét người đánh ít nhất 70% số trận trung bình."}</small>`;
}
const flexNote=`<div class="flexnote"><b>Không khoá cứng.</b> Mọi mục trên vẫn sửa được khi đang đánh (nút Sửa ở tab Sân) và sau khi chốt (mở lại giải đấu trong Lịch sử).</div>`;

/* ----- ① Chuẩn bị ----- */
// Bước Sẵn sàng: tóm tắt buổi → ai có mặt → tùy chọn (thu gọn, mở ra là đủ mọi cài đặt cũ) → Bắt đầu
let prepOpen=new Set();
// Một dòng "Cài đặt thêm": bấm tên để mở/thu gọn, công tắc bên phải để bật/tắt tính năng
const prepRow=(...a)=>prepRow0(...a);
function prepRow0(k,title,sum,body,tog){const on=prepOpen.has(k);
  const sw=tog?`<button class="xsw${tog.on?" on":""}" data-act="${tog.act}" role="switch" aria-checked="${!!tog.on}" aria-label="${esc(title)}"><i></i></button>`:"";
  return `<div class="pxrow${on?" on":""}"><div class="prowhd"><button class="prowh" data-act="prow" data-v="${k}" aria-expanded="${on}"><span class="tt"><span>${title}</span><small>${esc(sum)}</small></span><i aria-hidden="true">${on?"−":"›"}</i></button>${sw}</div>${on?`<div class="prowb">${body}</div>`:""}</div>`}
function prepRows(D,keys){
  const c=D.c,G=isG(c),thu=c.thu||"keo",gt=c.gt||"khong",cp=c.cphi!==false,gon=gt!=="khong",mu=typeof loaMuted==="function"&&loaMuted();
  let h=keys?`<div class="pxrows">`:`<span class="xsec">Tuỳ chọn · bật thì mới bung cài đặt</span><div class="pxrows">`;
  const prepRow=(k,...a)=>!keys||keys.includes(k)?prepRow0(k,...a):"";
  if(0)h+=prepRow("san","Sân và luật điểm",`${c.courts} sân · chạm ${c.target}${G&&isKO(c.giai)?(()=>{const K=koK(c.giai);return ` · KO ${ruleTx(koRule(K,"k"))} · CK ${ruleTx(koRule(K,"f"))}`})():""}${winBy2(c)?" cách 2":""}${ptMax(c)?`, trần ${ptMax(c)}`:""}`,fmtBlock(D));
  h+=prepRow("tien",G?"Chi phí, lệ phí":"Chi phí",cp?THU[thu]+(thu==="phi"?` ${fmtK(+c.phi||0)}`:""):"Tắt · không thu phí",cp?moneyBlock(D):`<small class="rule">Giải đấu này không thu phí. Bật công tắc để tính chi phí.</small>`,{act:"cphi",on:cp});
  h+=prepRow("giai","Giải thưởng",gon?GT[gt]||"":"Tắt · không trao giải",prizeBlock(D),{act:"gton",on:gon});
  h+=prepRow("tt","Trọng tài nhập điểm",c.refOn===true?"Bật":"Tắt · ban tổ chức tự nhập",refBlock(D),{act:"refon",on:c.refOn===true});
  if(!G)h+=prepRow("pre","Xếp sẵn các trận đầu",c.preOn===true?`${(c.presets||[]).length} trận xếp sẵn`:"Tắt · app tự xếp",c.preOn===true?presetBlock(D):`<small class="rule">Bật để chọn trước vài trận đầu, sau đó app tự xếp như cũ.</small>`,{act:"preon",on:c.preOn===true});
  else{const g=c.giai||{};h+=prepRow("pre","Định sẵn các trận đầu",g.preOn===true?`${(g.presets||[]).length} trận định sẵn`:"Tắt · app tự chọn cặp đấu",gPresetBlock(D,g))}
  h+=prepRow("mc","Loa gọi vào sân & MC",mu?"Tắt trên máy này":"Bật · đọc thể thức khi bắt đầu",mcBlock(D),{act:"mute",on:!mu});
  return h+`</div>`;
}
function vPrep(D){return hqView(D)}

/* ----- ② Đang đánh: dải tóm tắt + bảng Sửa ----- */
function cfgChip(D){
  const c=D.c,thu=c.thu||"keo",n=D.players.filter(p=>p.active!==false).length;
  return `<div class="cfgchip"><span class="t"><b>${esc(sessTitle(c,D.sid))} · đang đánh</b><span>${fmtTxt(c)} · ${c.courts} sân · chạm ${c.target}${winBy2(c)?` cách 2${ptMax(c)?`, trần ${ptMax(c)}`:""}`:""} · ${c.cphi===false?"không thu phí":esc(THU[thu])+(thu==="phi"?` ${fmtK(+c.phi||0)}`:"")} · ${n} người</span></span>${spkBtn("rules",`<button class="mcb" data-act="speakrules" aria-label="Đọc thể thức thi đấu">📣 Thể thức</button>`)}<button data-act="sheet">Sửa</button></div><div class="lsrow">${liveShareBtn()}${muteFab()}</div>`;
}
function sheetInner(D){
  return `<div class="sh"><h2>Sửa ${esc(sessTitle(D.c,D.sid))}</h2><button class="x" data-act="sheetx" aria-label="Đóng">✕ Đóng</button></div>
    <span class="lbl">Người chơi</span>${attChips(D)}
    <span class="lbl">Giải đấu này</span>${buoiBlock(D)}
    <span class="lbl">Sân và luật điểm</span>${fmtBlock(D)}
    ${tick("cphi",D.c.cphi!==false,"Chi phí")}${moneyBlock(D)}
    ${tick("gton",(D.c.gt||"khong")!=="khong","Giải thưởng")}${prizeBlock(D)}
    ${tick("refon",D.c.refOn===true,"Trọng tài")}${refBlock(D)}
    ${isG(D.c)?"":tick("preon",D.c.preOn===true,"Xếp sẵn các trận đầu")+presetBlock(D)}
    <span class="lbl">Lời MC đọc thể thức</span>${mcBlock(D)}
    <div class="infonote">Áp dụng từ trận kế tiếp. Trận đang đánh và kết quả đã lưu giữ nguyên. Người cho nghỉ vẫn giữ thành tích đã đánh.</div>
    <button class="primary" data-act="sheetx">Xong</button>`;
}
// Bảng Sửa nằm ngoài #view: cập nhật nội dung tại chỗ, giữ vị trí cuộn, không chạy lại hiệu ứng mở
function syncSheet(D){
  if(typeof document.createElement!=="function")return;
  let el=document.getElementById("editsheet");
  const want=sheetOpen&&canWrite&&MODE==="club"&&route==="app"&&tab==="san"&&phaseOf(D)==="live";
  if(!want){if(el){el.remove();document.documentElement.classList.remove("lock")}if(!want&&sheetOpen&&route!=="app")sheetOpen=false;return}
  if(!el){el=document.createElement("div");el.id="editsheet";el.innerHTML=`<div class="sheetbg" data-act="sheetx"><div class="sheet" role="dialog" aria-modal="true" aria-label="Sửa giải đấu" data-stop="1"></div></div>`;document.body.appendChild(el);document.documentElement.classList.add("lock")}
  const sh=el.querySelector(".sheet"),top=sh.scrollTop;sh.innerHTML=sheetInner(D);sh.scrollTop=top;
}
function recv(D,M){
  const paid=payDoc(D.sid).paid||{},L=M.att.filter(p=>M.payOf(p.id)>0);
  const tot=L.reduce((s,p)=>s+M.payOf(p.id),0),pd=L.filter(p=>paid[p.id]),got=pd.reduce((s,p)=>s+M.payOf(p.id),0);
  return {n:L.length,np:pd.length,tot,got,left:tot-got,unpaid:L.filter(p=>!paid[p.id]),paid};
}
function moneyMini(D){
  const R=recv(D,money(D)),q=pathOf("app",{tab:"tien"});
  return `<div class="lab"><span class="lbl">Chi phí trong giải đấu</span></div><div class="tiles"><a class="tile" href="${q}" data-go="app" data-t="tien"><span class="k">Đã nhận</span><b class="num">${R.np}/${R.n}</b><small class="num">${fmtK(R.got)}</small></a><a class="tile${R.left>0?" warn":""}" href="${q}" data-go="app" data-t="tien"><span class="k">Còn thiếu</span><b class="num">${fmtK(R.left)}</b><small>Bấm để tick ai đã chuyển</small></a></div>`;
}

/* ----- Tab Quỹ: Buổi này | Sổ quỹ CLB ----- */
function vTien(D){
  return `<div class="seg qseg" role="group" aria-label="Xem quỹ"><button data-act="qv" data-v="buoi" aria-pressed="${qView!=="so"}">Giải đấu #${D.sid} · hôm nay</button><button data-act="qv" data-v="so" aria-pressed="${qView==="so"}">Sổ quỹ CLB</button></div>`+(qView==="so"?vSoQuy(D):vQuyBuoi(D));
}
function vQuyBuoi(D){
  const c=D.c,M=money(D),R=recv(D,M),pz=prizes(D,M);
  let h=meBox(D);
  if(c.cphi===false&&!M.pot)return h+`<div class="empty"><strong>Giải đấu này không thu phí</strong>${canWrite?"Bật “Chi phí” ở bước Chuẩn bị hoặc nút Sửa trên tab Sân nếu cần thu.":"Không ai phải đóng phí giải đấu này."}</div>`;
  h+=`<div class="kpis k3q"><div class="kpi"><div class="lbl">Phải thu</div><div class="v num">${fmtK(R.tot)}</div></div><div class="kpi"><div class="lbl">Đã nhận</div><div class="v num">${fmtK(R.got)}</div></div><div class="kpi${R.left>0?" warn":""}"><div class="lbl">Còn thiếu</div><div class="v num">${fmtK(R.left)}</div></div></div>
    <div class="pbar" aria-hidden="true"><i style="width:${R.tot?Math.round(R.got/R.tot*100):0}%"></i></div>
    <p class="rule">${esc(THU[M.thu])}${M.thu==="phi"?` ${fmtK(+c.phi||0)}/người`:""} · tính theo các trận đã đánh tới giờ.</p>`;
  if(!M.att.length)h+=`<div class="empty"><strong>Chưa có ai phải đóng</strong>Chi phí tự tính khi lưu tỉ số các trận.</div>`;
  else{
    const rows=[...M.att].sort((a,b)=>M.payOf(b.id)-M.payOf(a.id)||String(a.name).localeCompare(String(b.name),"vi"));
    h+=card(`Ai đã đóng · ${R.np}/${R.n}`,rows.map(p=>payLine(D,M,p,R.paid)).join("")+(canWrite?`<small class="rule">Bấm “Đã nhận?” khi chi phí về tài khoản. Bấm ✎ để đặt số riêng cho vận động viên ngoài CLB, người đến muộn hoặc miễn.</small>`:""),`<span class="meta">Công khai</span>`);
  }
  const CC=COSTS.filter(([k])=>+c.costs[k]>0);
  h+=card("Chi giải đấu này",canWrite?`<div class="form">${COSTS.map(([k,l])=>cfIn(k,l,c.costs[k])).join("")}</div>`:CC.length?CC.map(([k,l])=>`<div class="srow"><span>${l}</span><b class="num">${fmtK(+c.costs[k])}</b></div>`).join(""):`<p class="rule">Chưa nhập chi phí.</p>`);
  if(M.pot)h+=`<div class="shd"><h2>Giải thưởng${D.done.length?" · tạm tính":""}</h2></div>${pz.length?prizeCards(D,pz):`<p class="rule">Chưa đủ trận để xét giải.</p>`}`;
  h+=`<div class="sumbar"><span>Dự kiến vào quỹ CLB</span><b class="num">${M.club>=0?"+":"−"}${fmtK(Math.abs(M.club))}</b></div>`;
  h+=`<div class="bar"><button class="primary" data-act="copy">Copy tổng kết gửi Zalo</button></div><textarea id="copybox" rows="8" readonly hidden></textarea>`;
  if(canWrite&&!isG(c))h+=`<a class="btn-line" href="${pathOf("chot")}" data-go="chot">Kết thúc &amp; chốt giải đấu →</a>`;
  return h+`<p class="rule" style="text-align:center">Số liệu cập nhật trực tiếp · sửa được trước, trong và sau giải đấu.</p>`;
}
function payLine(D,M,p,paid){
  const id=p.id,k=M.payOf(id),s=D.st.get(id),ed=canWrite&&editing.has("aj-"+id);
  let st;
  if(k<=0)st=`<span class="meta">Miễn</span>`;
  else if(paid[id])st=canWrite?`<button class="paidpill" data-act="lpaid" data-p="${id}" aria-label="Bỏ dấu đã nhận của ${esc(p.name)}">✓ Đã nhận</button>`:`<span class="paidpill">✓ Đã nhận</span>`;
  else st=canWrite?`<button class="sm" data-act="lpaid" data-p="${id}">Đã nhận?</button>`:BANK?`<button class="paybtn" data-act="pay" data-sid="${D.sid}" data-n="${esc(p.name)}" data-k="${k}">Chuyển khoản</button>`:`<span class="meta">Chưa</span>`;
  let h=`<div class="prw${id===ME?" me":""}">${av(p,"sm")}<span class="t"><b>${esc(p.name)}</b><small class="num">${s.g} trận · thua ${s.l}${M.hasAdj(id)?` · số riêng (tự tính ${fmtK(M.autoOf(id))})`:""}</small></span><b class="num amt">${fmtK(k)}</b>${canWrite?`<button class="ghost ed" data-act="adj" data-id="${id}" aria-label="Sửa chi phí của ${esc(p.name)}">✎</button>`:""}${st}</div>`;
  if(ed)h+=`<div class="adjf"><label><span class="sr">Chi phí riêng của ${esc(p.name)} (k)</span><input id="aj-${id}" data-draft="aj-${id}" type="number" inputmode="decimal" min="0" value="${esc(val("aj-"+id,k))}"></label><button class="primary" data-act="adjsave" data-id="${id}">Lưu</button>${M.hasAdj(id)?`<button data-act="adjclr" data-id="${id}">Về tự tính</button>`:""}<button class="ghost" data-act="adjx" data-id="${id}">Thôi</button></div>`;
  return h;
}
function debts(){
  const L=[];
  for(const h of S.hist)if(h.track){const pd=h.paid||{};for(const r of h.rows||[])if((+r.pay||0)>0&&!pd[r.id])L.push({sid:h.sid,id:r.id,name:r.name,k:+r.pay})}
  return L.sort((a,b)=>b.sid-a.sid||String(a.name).localeCompare(String(b.name),"vi"));
}
const ledSum=()=>(S.led||[]).reduce((a,x)=>a+(+x.k||0),0);
function fundNow(){return clubFund()+ledSum()+mfFund()-debts().reduce((a,x)=>a+x.k,0)}
function vSoQuy(D){
  const FVm=fundView();if(FVm==="off")return `<div class="empty"><strong>Quỹ CLB chỉ ban tổ chức xem</strong>Chủ CLB đã tắt mục xem quỹ cho thành viên.</div>`;
  const DB=debts(),dt=DB.reduce((a,x)=>a+x.k,0),bal=fundNow();
  let h=`<div class="balbox"><span class="lbl">Quỹ CLB hiện có</span><b class="num">${bal<0?"−":""}${fmtK(Math.abs(bal))}</b><small>${S.hist.length} giải đấu đã chốt${(S.led||[]).length?` · ${(S.led||[]).length} khoản ghi tay`:""}${dt?` · chưa tính ${fmtK(dt)} còn nợ`:""}</small></div>`;
  if(canWrite){
    if(ledForm)h+=card(ledForm==="thu"?"Ghi thu":"Ghi chi",`<label class="fld"><span class="lbl">Chi phí (k)</span><input id="lg-k" data-draft="lg-k" type="number" inputmode="decimal" min="0" value="${esc(val("lg-k",""))}"></label>
      <label class="fld"><span class="lbl">Nội dung</span><input id="lg-n" data-draft="lg-n" maxlength="80" placeholder="${ledForm==="thu"?"Ví dụ: Tài trợ áo":"Ví dụ: Mua 2 hộp bóng"}" value="${esc(val("lg-n",""))}"></label>
      ${errs.led?`<p class="err">${esc(errs.led)}</p>`:""}<div class="two"><button class="line" data-act="ledx">Thôi</button><button class="wide" data-act="ledsave">Lưu vào sổ</button></div><small class="rule">Dòng ghi tay xoá được nếu ghi nhầm.</small>`);
    else h+=`<div class="two2"><button class="ball" data-act="ledf" data-v="thu">+ Ghi thu</button><button class="line2" data-act="ledf" data-v="chi">− Ghi chi</button></div>`;
  }
  if(FVm==="bal")return h+`<p class="rule" style="text-align:center">Chủ CLB chỉ công khai số dư quỹ.</p>`;
  if(DB.length&&FVm==="full")h+=card(`Còn nợ · ${fmtK(dt)}`,DB.map(x=>`<div class="lrow"><span class="t"><b>${esc(x.name)}</b><small>Giải đấu #${x.sid}</small></span><b class="num neg">${fmtK(x.k)}</b>${canWrite?`<button class="sm" data-act="paid" data-id="${x.sid}" data-p="${x.id}">Đã nhận</button>`:""}</div>`).join(""));
  const E=[...S.hist.filter(x=>x.money&&(x.money.on!==false||hClub(x))).map(x=>({at:x.endedAt||x.startedAt||0,t:(x.type==="giai"?"Giải · giải đấu #":"Giải đấu #")+x.sid,auto:true,k:hClub(x),
      sub:`Thu ${fmtK(x.money.collected!=null?x.money.collected:x.money.fund)} · chi ${fmtK(x.money.cost)}${x.money.pot?` · giải ${fmtK(x.money.pot)}`:""}${x.editedAt?` · đã sửa ${dmy(x.editedAt)}`:""}`})),
    ...(S.led||[]).map(x=>({at:x.at||0,t:esc(x.note||""),auto:false,k:+x.k||0,sub:x.by?`Ghi bởi ${esc(x.by)}`:"",id:x.id})),
    ...(mfCfg().fund===false?[]:(S.mfee||[]).map(d=>{const P=Object.values(d.paid||{});return {at:P.reduce((m,x)=>Math.max(m,+x.at||0),0),t:`Phí thành viên ${mfLb(d.id.slice(5))}`,auto:true,k:P.reduce((a,x)=>a+(+x.k||0),0),sub:`${P.length} người đã đóng`}}).filter(x=>x.k))].sort((a,b)=>b.at-a.at);
  {const m0=new Date();m0.setDate(1);m0.setHours(0,0,0,0);const T=E.filter(x=>x.at>=m0.getTime()),tin=T.filter(x=>x.k>0).reduce((a,x)=>a+x.k,0),tout=T.filter(x=>x.k<0).reduce((a,x)=>a-x.k,0);
    if(T.length)h+=`<div class="kpis k2q"><div class="kpi"><div class="lbl">Thu tháng ${m0.getMonth()+1}</div><div class="v num pos">+${fmtK(tin)}</div></div><div class="kpi"><div class="lbl">Chi tháng ${m0.getMonth()+1}</div><div class="v num neg">−${fmtK(tout)}</div></div></div>`}
  h+=card("Sổ thu chi",E.length?E.map(x=>{const d=x.at?new Date(x.at):null;return `<div class="lrow"><span class="d num">${d?`${d.getDate()}<br>T${d.getMonth()+1}`:"–"}</span><span class="t"><b>${x.t}</b><span class="tag ${x.auto?"a":"m"}">${x.auto?"Tự động":"Ghi tay"}</span><small>${x.sub}</small></span><b class="num ${x.k>=0?"pos":"neg"}">${x.k>=0?"+":"−"}${fmtK(Math.abs(x.k))}</b>${canWrite&&!x.auto?delBtn("leddel",x.id,"Xoá"):""}</div>`}).join(""):`<p class="rule">Chưa có khoản nào. Mỗi giải đấu chốt xong tự ghi một dòng.</p>`);
  return h;
}

/* ----- ③ Chốt buổi ----- */
function vChot(D){
  const back=`<a class="bk" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">‹ Về Sân</a>`;
  if(!canWrite)return `<div class="dhead">${back}<h1>Chốt giải đấu</h1></div>`+clubLoginBody();
  const c=D.c;
  if(isG(c))return `<div class="dhead">${back}<h1>Chốt giải đấu #${D.sid}</h1></div>${steps3(3,D)}<div class="empty"><strong>Giải cặp chốt ở tab Sân</strong>Bấm “Kết thúc giải và lưu” ở cuối lịch thi đấu.</div>`;
  const M0=money(D),R0=recv(D,M0),extra=chotMien?Object.fromEntries(R0.unpaid.map(p=>[p.id,0])):null,M=money(D,extra),R=recv(D,M),pz=prizes(D,M);
  const ts=D.done.map(m=>m.doneAt||m.createdAt||0).filter(Boolean);
  let h=`<div class="dhead">${back}<h1>Chốt giải đấu #${D.sid}</h1><span class="dsub num">${c.sname?esc(c.sname)+" · ":""}${D.done.length} trận · ${M.att.length} người · ${c.courts} sân${ts.length?` · ${hm(Math.min(...ts))}–${hm(Math.max(...ts))}`:""}</span></div>`+steps3(3,D);
  if(D.playing.length)h+=`<div class="warnbox"><b>Còn ${D.playing.length} trận đang đánh.</b>Lưu tỉ số hoặc hủy trận ở tab Sân rồi quay lại chốt.</div>`;
  else if(!D.done.length)h+=`<div class="warnbox"><b>Giải đấu chưa có trận nào xong.</b>Chốt bây giờ sẽ lưu một giải đấu trống.</div>`;
  h+=card(`<i class="no">1</i>Chi thật`,`<div class="form">${COSTS.map(([k,l])=>cfIn(k,l,c.costs[k])).join("")}</div><small class="rule">Sửa nếu khác dự kiến: thêm sân, ít nước…</small>`);
  let b2=`<div class="srow"><span>Đã nhận</span><b class="num">${R0.np}/${R0.n} · ${fmtK(R0.got)}</b></div>`;
  if(R0.unpaid.length){
    b2+=`<div class="srow top"><span>Chưa đóng</span><span class="num" style="text-align:right">${R0.unpaid.map(p=>`${esc(p.name)} ${fmtK(M0.payOf(p.id))}`).join(" · ")}</span></div>
      <div class="opt"><button data-act="chotm" data-v="0" aria-pressed="${!chotMien}"><b>Ghi vào “Còn nợ”</b><span>Hiện ở Sổ quỹ CLB, tick khi họ đóng sau.</span></button><button data-act="chotm" data-v="1" aria-pressed="${chotMien}"><b>Miễn</b><span>Không thu của những người này giải đấu này.</span></button></div>`;
  }else if(R0.n)b2+=`<p class="rule">Mọi người đã đóng đủ.</p>`;
  if(pz.length)b2+=pz.map(x=>`<div class="srow"><span>${esc(x.label)} · ${x.ids.map(id=>esc(D.pmap.get(id)?.name||"?")).join(" &amp; ")}</span><b class="num">${fmtK(x.k)}</b></div>`).join("");
  h+=card(`<i class="no">2</i>Chi phí &amp; giải thưởng`,b2+`<small class="rule">Sửa số riêng hoặc tick ai đã chuyển ở tab Quỹ.</small>`);
  const now=M.club-R.left;
  h+=`<div class="sumbox"><div><span>Phải thu</span><span class="num">${fmtK(R.tot)}</span></div><div><span>Chi</span><span class="num">−${fmtK(M.cost)}</span></div>${M.pot&&M.gt!=="gop"?`<div><span>Giải</span><span class="num">−${fmtK(M.pot)}</span></div>`:""}${R.left?`<div><span>Còn nợ (thu sau)</span><span class="num">−${fmtK(R.left)}</span></div>`:""}
    <div class="big"><span>Vào quỹ ngay</span><span class="num">${now<0?"−":"+"}${fmtK(Math.abs(now))}</span></div>${R.left?`<div><span>Khi thu đủ nợ</span><span class="num">${M.club<0?"−":"+"}${fmtK(Math.abs(M.club))}</span></div>`:""}</div>`;
  h+=`<button class="ball wide" data-act="chot" ${D.playing.length?"disabled":""}>${armed("chot:x")?"Bấm lần nữa để chốt":"Chốt &amp; ghi sổ quỹ"}</button>`;
  return h+`<div class="flexnote"><b>Chốt không phải khoá.</b> Sai thì mở lại giải đấu trong Lịch sử, sửa chi phí hoặc ai đã đóng; sổ quỹ tự tính lại và ghi “đã sửa”.</div>`;
}
async function chotBuoi(){
  const D=derive();
  if(D.playing.length){toast("Còn trận chưa lưu tỉ số. Lưu hoặc hủy trước khi chốt.");return}
  const pd=payDoc(D.sid),M0=money(D),R0=recv(D,M0),extra=chotMien?Object.fromEntries(R0.unpaid.map(p=>[p.id,0])):{},M=money(D,extra);
  await write(async()=>{
    const firstAt=D.done.reduce((m,x)=>Math.min(m,x.doneAt||x.createdAt||Infinity),Infinity);
    await db.doc("app/hist-"+D.sid).set({sid:D.sid,title:D.c.title,startedAt:isFinite(firstAt)?firstAt:Date.now(),endedAt:Date.now(),matchCount:D.done.length,
      rows:standings(D).filter(r=>r.s.g).map(r=>({id:r.p.id,name:r.p.name,gender:r.p.gender||"M",w:r.s.w,l:r.s.l,pf:r.s.pf,pa:r.s.pa,rating:Math.round(r.s.rating*100)/100,d:Math.round(r.s.d*1000)/1000,...payRow(D,M,r.p.id)})),
      money:moneySnap(D,M),fee:{fee:D.c.fee,keo:D.c.keo,hi:D.c.hi,lo:D.c.lo,cap:D.c.cap},
      paid:{...(pd.paid||{})},adj:{...(pd.adj||{}),...extra},track:true,closedAt:Date.now(),closedBy:who(),sname:D.c.sname||"",rule:ruleTxt(D.c)});
    for(const p of D.players){const s=D.st.get(p.id);if(s.g)await db.collection("players").doc(p.id).update({rating0:Math.round(s.rating*100)/100})}
    await xFinish(D);
    await saveCfg({session:D.sid+1,costs:{court:0,water:0,ball:0,other:0},phase:"prep",sname:"",presets:[],schedId:null});
  },"Đã chốt giải đấu, đây là trang tổng kết để chia sẻ");
  chotMien=false;go("buoi",{sid:D.sid});
}

/* ----- Sau buổi: mở lại để sửa ----- */
function histEdit(D,x){
  if(!canWrite||!x.snap||!x.snap.money||x.snap.money.on===false)return "";
  const s=x.snap,m=s.money,k="hx-"+x.sid,cs=m.costs||{};
  const meta=`${s.closedAt?`Chốt lúc ${dhm(s.closedAt)}${s.closedBy?` bởi ${esc(s.closedBy)}`:""}`:`Lưu ngày ${dmy(s.endedAt)}`}${s.editedAt?` · sửa lần cuối ${dhm(s.editedAt)}`:""}`;
  if(!editing.has(k))return card(`Giải đấu #${x.sid} · đã chốt`,`<small class="rule">${meta}</small><div class="two"><button class="line" data-act="hopen" data-id="${x.sid}">Mở lại để sửa</button><button class="line" data-act="share" data-id="${x.sid}">Chia sẻ tổng kết</button></div>`);
  return card(`Sửa giải đấu #${x.sid}`,`<small class="rule">${meta}</small><span class="lbl">Chi phí thật (k)</span><div class="form">${COSTS.map(([c,l])=>`<label class="fld"><span class="lbl">${l}</span><input id="hc-${c}-${x.sid}" data-draft="hc-${c}-${x.sid}" type="number" inputmode="decimal" min="0" value="${esc(val(`hc-${c}-${x.sid}`,+cs[c]||0))}"></label>`).join("")}</div>
    <small class="rule">Tick ai đã đóng ở bảng chi phí bên dưới. Sổ quỹ CLB tự tính lại.</small><div class="two"><button class="line" data-act="hclose" data-id="${x.sid}">Đóng</button><button class="wide" data-act="hsave" data-id="${x.sid}">Lưu thay đổi</button></div>`);
}

/* ----- sự kiện của luồng buổi (đã qua kiểm tra canWrite) ----- */
async function savePay(sid,patch){const cur=payDoc(sid),next={paid:{...(cur.paid||{})},adj:{...(cur.adj||{})}};patch(next);
  await db.doc("app/pay-"+sid).set(next);S.pays={...(S.pays||{}),["pay-"+sid]:{id:"pay-"+sid,...next}}}
async function sessionAct(act,id,b,e){
  if(act.startsWith("rr"))return rrAct(act);
  if(act==="sheet"){sheetOpen=true;render();return true}
  if(act==="sheetx"){if(b.classList&&b.classList.contains("sheetbg")&&e.target!==b)return true;sheetOpen=false;render();return true}
  if(act==="lseg"){liveSeg=b.dataset.v;render();try{scrollTo({top:0})}catch(e){}return true}
  if(act==="prow"){const k=b.dataset.v;if(prepOpen.has(k))prepOpen.delete(k);else prepOpen.add(k);render();return true}
  if(act==="start"){if(!armOr("start:x"))return true;const D=derive(),ro=regOpen();let n=0;
    await write(async()=>{n=await regStart(D);await saveCfg(ro?{phase:"live",reg:{...regCfg(),on:false}}:{phase:"live"})},`Đã khai mạc giải đấu #${D.sid}`);if(n)toast(`Đã khai mạc · điểm danh thêm ${n} người đã đăng ký`);
    hqTab=null;stepView=null;
    // Khai mạc: loa đọc thể thức, rồi đưa trận đầu vào sân (xoay cặp)
    if(!isG(D.c)&&typeof window!=="undefined"&&!window.__PBTEST){try{if(typeof loaMuted==="function"&&!loaMuted())speak(mcText(derive()),"","rules")}catch(e){}
      const D2=derive();if(D2.players.filter(p=>p.active!==false).length>=4&&!D2.playing.length)await generate()}
    return true}
  if(act==="win2"){const on=b.dataset.v==="1";write(()=>saveCfg({win2:on}),on?"Thắng phải cách 2":"Chạm là thắng");return true}
  if(act==="ptmax"){const c=cfg(),on=b.dataset.v==="1";write(()=>saveCfg({ptMax:on?Math.max(c.target+2,+c.ptMax||c.target+4):0}));return true}
  if(act==="ptmaxd"){const c=cfg(),n=Math.min(40,Math.max(c.target+1,(+c.ptMax||c.target+4)+Number(b.dataset.d)));write(()=>saveCfg({ptMax:n}));return true}
  if(act==="preon"){const on=cfg().preOn!==true;write(()=>saveCfg({preOn:on}),on?"Bật xếp sẵn trận đầu":"Tắt xếp sẵn, xếp tự động hoàn toàn");return true}
  if(act==="prepick"){const k=preSel.indexOf(id);if(k>=0)preSel.splice(k,1);else if(preSel.length<4)preSel.push(id);delete errs.pre;render();return true}
  if(act==="preadd"){if(preSel.length<4){errs.pre="Chọn đủ 4 người: 2 người đội 1, 2 người đội 2.";render();return true}
    const L=[...(cfg().presets||[]),{id:"pr"+Date.now().toString(36),a:preSel.slice(0,2),b:preSel.slice(2,4)}];preSel=[];delete errs.pre;
    write(()=>saveCfg({presets:L}),`Đã thêm trận định sẵn #${L.length}`);return true}
  if(act==="premv"){const L=[...(cfg().presets||[])],i=L.findIndex(p=>p.id===id),j=i+Number(b.dataset.d);if(i<0||j<0||j>=L.length)return true;[L[i],L[j]]=[L[j],L[i]];write(()=>saveCfg({presets:L}));return true}
  if(act==="predel"){if(!armOr("predel:"+id))return true;const L=(cfg().presets||[]).filter(p=>p.id!==id);write(()=>saveCfg({presets:L}),"Đã bỏ trận định sẵn");return true}
  if(act==="refon"){const on=cfg().refOn!==true;write(()=>saveCfg({refOn:on}),on?"Giải đấu này có trọng tài":"Giải đấu này không dùng trọng tài");return true}
  if(act==="cphi"){const on=cfg().cphi===false;write(()=>saveCfg(on?{cphi:true,thu:cfg().thu==="khong"?"keo":cfg().thu}:{cphi:false}),on?"Giải đấu này có thu phí":"Giải đấu này không thu phí");return true}
  if(act==="gton"){const c=cfg(),on=(c.gt||"khong")==="khong";const g=on?(c.gtPrev&&c.gtPrev!=="khong"?c.gtPrev:isG(c)?"hang":"trich"):"khong";
    write(()=>saveCfg(on?{gt:g,gtv:c.gtv||(g==="trich"?30:g==="codinh"?200:20),...(g==="hang"&&c.hang1==null?{hang1:200,hang2:100,hang3:50}:{})}:{gt:"khong",gtPrev:c.gt}),on?"Có giải thưởng":"Không trao giải");return true}
  if(act==="target"){const c=cfg(),n=Math.min(21,Math.max(5,c.target+Number(b.dataset.d))),p={target:n};if(+c.ptMax&&c.ptMax<=n)p.ptMax=n+2;write(()=>saveCfg(p));return true}
  if(act==="att"){const p=S.players.find(x=>x.id===id);if(!p)return true;const on=p.active!==false;
    if(on&&derive().playing.some(m=>[...m.a,...m.b].includes(id))){toast("Người này đang trên sân, lưu tỉ số trước.");return true}
    // Người đã đăng ký giải đấu hôm nay mà chưa check-in: BTC check-in tay giúp (đánh dấu khác với quét mã)
    const X=xCur(),r=!on&&X&&(S.regs||[]).find(z=>z.sid===X.id&&z.pid===id&&!z.cancel&&!z.arrived),ra=on&&X&&(S.regs||[]).find(z=>z.sid===X.id&&z.pid===id&&!z.cancel&&z.arrived);
    write(async()=>{await db.collection("players").doc(id).update({active:!on});if(r)await db.collection("regs").doc(r.id).update({arrived:true,arrBy:"btc",arrivedAt:Date.now()});if(ra)await db.collection("regs").doc(ra.id).update({arrived:false,ci:0,ciCode:""})},on?`${p.name} nghỉ`:r?`Đã check-in tay ${p.name}`:`${p.name} có mặt`);return true}
  if(act==="attall"){const D=derive(),busy=new Set(D.playing.flatMap(m=>[...m.a,...m.b])),all=D.players.every(p=>p.hold||p.active!==false);
    await write(async()=>{for(const p of D.players){const want=all?busy.has(p.id):!p.hold||p.active!==false;if((p.active!==false)!==want)await db.collection("players").doc(p.id).update({active:want})}},all?"Đã bỏ chọn":"Đã chọn tất cả");return true}
  if(act==="lpaid"){const sid=derive().sid,p=b.dataset.p,on=!(payDoc(sid).paid||{})[p];
    write(()=>savePay(sid,x=>{if(on)x.paid[p]=true;else delete x.paid[p]}),on?"Đã đánh dấu đã nhận":"Đã bỏ dấu");return true}
  if(act==="adj"){const k="aj-"+id;editing.has(k)?editing.delete(k):editing.add(k);render();return true}
  if(act==="adjx"){editing.delete("aj-"+id);delete drafts["aj-"+id];render();return true}
  if(act==="adjsave"){const v=Number(drafts["aj-"+id]);if(drafts["aj-"+id]===undefined){editing.delete("aj-"+id);render();return true}
    if(!Number.isFinite(v)||v<0){toast("Nhập chi phí từ 0 trở lên.");return true}
    write(()=>savePay(derive().sid,x=>{x.adj[id]=v}).then(()=>{editing.delete("aj-"+id);delete drafts["aj-"+id]}),v?"Đã đặt số riêng":"Đã miễn cho người này");return true}
  if(act==="adjclr"){write(()=>savePay(derive().sid,x=>{delete x.adj[id]}).then(()=>{editing.delete("aj-"+id);delete drafts["aj-"+id]}),"Đã về số tự tính");return true}
  if(act==="ledf"){ledForm=b.dataset.v==="chi"?"chi":"thu";delete errs.led;render();return true}
  if(act==="ledx"){ledForm=null;delete errs.led;delete drafts["lg-k"];delete drafts["lg-n"];render();return true}
  if(act==="ledsave"){const k=Number(drafts["lg-k"]),note=String(drafts["lg-n"]||"").trim();
    if(!(k>0)){errs.led="Nhập chi phí lớn hơn 0.";render();return true}
    if(!note){errs.led="Nhập nội dung để sau này còn nhớ.";render();return true}
    delete errs.led;const lid="led-"+Date.now().toString(36)+Math.random().toString(36).slice(2,5),sign=ledForm==="chi"?-1:1;
    await write(()=>db.doc("app/"+lid).set({k:sign*k,note,at:Date.now(),by:who()}).then(()=>{ledForm=null;delete drafts["lg-k"];delete drafts["lg-n"]}),sign>0?"Đã ghi thu":"Đã ghi chi");return true}
  if(act==="leddel"){if(!armOr("leddel:"+id))return true;write(()=>db.doc("app/"+id).delete(),"Đã xoá dòng");return true}
  if(act==="chotm"){chotMien=b.dataset.v==="1";render();return true}
  if(act==="hopen"){editing.add("hx-"+id);render();return true}
  if(act==="hclose"){editing.delete("hx-"+id);COSTS.forEach(([c])=>delete drafts[`hc-${c}-${id}`]);render();return true}
  if(act==="hsave"){const sid=Number(id),h=S.hist.find(z=>z.sid===sid);if(!h||!h.money)return true;
    const m=h.money,cs={};for(const [c] of COSTS)cs[c]=Math.max(0,Number(val(`hc-${c}-${sid}`,+(m.costs||{})[c]||0))||0);
    const cost=Object.values(cs).reduce((a,x)=>a+x,0),dl=cost-(+m.cost||0),club=hClub(h);
    await write(()=>db.doc("app/hist-"+sid).update({money:{...m,costs:cs,cost,club:club-dl,gap:(+m.gap||0)-dl},editedAt:Date.now(),editedBy:who()}).then(()=>{editing.delete("hx-"+sid);COSTS.forEach(([c])=>delete drafts[`hc-${c}-${sid}`])}),"Đã sửa giải đấu, sổ quỹ đã tính lại");return true}
  return false;
}

/* ----- Tính lại rating từ các buổi còn lưu (sửa rating lệch sau khi xoá buổi) ----- */
let rrPlan=null;
async function rrCompute(){
  const D=derive(),cur=D.sid,H=[...S.hist].filter(h=>h.sid<cur).sort((a,b)=>a.sid-b.sid);
  const base=new Map();
  for(const h of H)for(const r of h.rows||[]){const rt=Number(r.rating),d=Number(r.d);if(!base.has(r.id)&&Number.isFinite(rt)&&Number.isFinite(d))base.set(r.id,rt-d)}
  const all=(await db.collection("matches").get()).docs.map(d=>({id:d.id,...d.data()}));
  const ms=all.filter(m=>m.status==="done"&&(m.session||1)<cur&&H.some(h=>h.sid===(m.session||1)))
    .sort((a,b)=>(a.session||1)-(b.session||1)||(a.doneAt||0)-(b.doneAt||0)||(a.seq||0)-(b.seq||0));
  const R=new Map(base),get=id=>R.has(id)?R.get(id):(Number(D.pmap.get(id)?.rating0)||3),avg=ids=>ids.reduce((s,id)=>s+get(id),0)/ids.length;
  for(const m of ms){const pA=expect(avg(m.a),avg(m.b)),dA=K*(m.sa/(m.sa+m.sb)-expShare(pA));
    for(const id of m.a)R.set(id,Math.min(8,Math.max(1,get(id)+dA)));for(const id of m.b)R.set(id,Math.min(8,Math.max(1,get(id)-dA)))}
  return D.players.filter(p=>R.has(p.id)).map(p=>({id:p.id,name:p.name,from:Number(p.rating0)||3,to:Math.round(R.get(p.id)*100)/100})).filter(x=>Math.abs(x.to-x.from)>=0.01).sort((a,b)=>Math.abs(b.to-b.from)-Math.abs(a.to-a.from));
}
function rrPanel(){
  if(!canWrite)return "";
  let b=`<small class="rule">Tính lại trình của mọi người từ đầu, chỉ dựa trên các giải đấu còn trong Lịch sử. Dùng khi đã xoá một giải đấu mà rating chưa trừ lại. Rating sửa tay giữa các giải đấu sẽ bị tính lại theo kết quả trận.</small>`;
  if(rrPlan==null)b+=`<button class="line" data-act="rrcalc">Kiểm tra rating</button>`;
  else if(!rrPlan.length)b+=`<p class="rule"><b>Rating đang khớp với các giải đấu đã lưu.</b> Không cần sửa.</p><button class="line" data-act="rrx">Đóng</button>`;
  else b+=`<p class="rule"><b>${rrPlan.length} người lệch rating:</b></p>${rrPlan.map(x=>`<div class="srow"><span>${esc(x.name)}</span><span class="num">${r2(x.from)} → <b>${r2(x.to)}</b></span></div>`).join("")}<div class="two"><button class="line" data-act="rrx">Thôi</button><button class="wide" data-act="rrapply">${armed("rrapply:x")?"Bấm lần nữa để áp dụng":"Áp dụng"}</button></div>`;
  return card("Tính lại rating",b);
}
async function rrAct(act){
  if(act==="rrx"){rrPlan=null;render();return true}
  if(act==="rrcalc"){try{rrPlan=await rrCompute()}catch(e){toast("Chưa tải được các trận, thử lại.")}render();return true}
  if(act==="rrapply"){if(!rrPlan||!armOr("rrapply:x"))return true;const P=rrPlan;
    await write(async()=>{for(const x of P)await db.collection("players").doc(x.id).update({rating0:x.to})},`Đã sửa rating ${P.length} người`);rrPlan=null;render();return true}
  return false;
}

/* ----- Lời MC đọc thể thức: tự tạo theo cài đặt, sửa được ----- */
function mcDefault(D){
  const c=D.c,t=+c.target||11,w2=winBy2(c),mx=ptMax(c),G=isG(c),half=Math.ceil(t/2);
  const club=String(CLUB?.name||c.title||"câu lạc bộ").trim();
  const L=[`Xin chào các vận động viên và khán giả, chào mừng đến với ${c.sname||`giải đấu số ${D.sid}`} của ${club}.`,
    "Ban tổ chức xin phổ biến thể thức thi đấu như sau.",
    G?`Hôm nay chúng ta thi đấu cặp cố định xoay vòng, mỗi cặp sẽ gặp tất cả các cặp còn lại một lần, trên ${c.courts} sân.`
     :`Hôm nay chúng ta thi đấu đánh đôi xoay cặp trên ${c.courts} sân. Sau mỗi trận, hệ thống sẽ ghép cặp mới theo trình độ, ai chờ lâu sẽ được vào sân trước.`,
    `Mỗi trận đánh chạm ${t} điểm${w2?`, đội thắng phải cách biệt 2 điểm${mx?`, tối đa ${mx} điểm`:""}`:", không cần cách biệt 2 điểm"}.`,
    `Khi một đội đạt ${half} điểm, hai đội đổi sân.`,
    "Trường hợp bóng chạm vạch hoặc có tình huống nhạy cảm mà hai đội không thống nhất được, pha bóng đó sẽ được đánh lại.",
    G?"Xếp hạng tính theo số trận thắng, sau đó đến kết quả đối đầu trực tiếp, hiệu số điểm và tổng điểm ghi được."
     :"Xếp hạng tính theo số trận thắng, sau đó đến hiệu số điểm. Kết thúc giải đấu, rating của từng vận động viên sẽ được cập nhật.",
    "Chúc các vận động viên thi đấu hết mình, fair-play và thật vui vẻ!"];
  return L.join(" ");
}
const mcText=D=>String(D.c.mc||"").trim()||mcDefault(D);
function mcBlock(D){
  const custom=!!String(D.c.mc||"").trim();
  return `<label class="fld"><span class="lbl">${custom?"Lời đã sửa":"Tự tạo theo cài đặt"} · MC giọng nữ Google sẽ đọc đoạn này</span><textarea id="cf-mc" data-draft="cf-mc" data-save="cfg" data-key="mc" rows="7" maxlength="1100">${esc(val("cf-mc",mcText(D)))}</textarea></label>
  <div class="two">${spkBtn("rules",`<button class="line" data-act="speakrules">📣 Nghe thử</button>`)}${custom?`<button class="line" data-act="mcreset">Về mẫu tự tạo</button>`:`<span></span>`}</div>
  <small class="rule">Để nguyên thì lời đọc tự đổi theo số sân, luật điểm, thể thức. Sửa tay thì giữ đúng lời bạn viết.</small>`;
}
