/* ---------- Giải đấu phía người chơi: thẻ, chi tiết, đăng ký 3 bước, thanh toán, vé ---------- */
const GDT={xoay:{c:"x",lb:"⟳ XOAY CẶP · GIAO LƯU",sh:"XOAY CẶP",d:"Đổi đồng đội mỗi trận"},giai:{c:"g",lb:"🏆 GIẢI CẶP CỐ ĐỊNH",sh:"GIẢI CẶP",d:"Cặp cố định, đánh vòng tròn"},bang:{c:"vb",lb:"▦ VÒNG BẢNG → KNOCKOUT",sh:"VÒNG BẢNG",d:"Chia bảng, nhất nhì vào loại trực tiếp"}};
const gdTy=x=>GDT[x&&x.fmt==="giai"?(x.ko?"bang":"giai"):"xoay"];
const gdBand=(x,short)=>`<span class="gdty ${gdTy(x).c}">${short?gdTy(x).sh:gdTy(x).lb}</span>`;
// Tổng giải thưởng (thưởng từng hạng) hoặc cách lập quỹ giải
function gdPrize(x){
  if(!x||!x.gton)return "";
  if(x.gt==="hang"){const h=(x.hang||[]).map(v=>+v||0),t=h.reduce((a,b)=>a+b,0);return t?`Giải thưởng ${kVND(t)} · Nhất ${fmtK(h[0])}`:""}
  return GT[x.gt]||"Có giải thưởng";
}
const gdPayLb=r=>r.pay==="ok"?"đã trả":r.pay==="sent"?"chờ BTC xác nhận phí":"trả tại sân";
const gdMine=x=>authUser&&withX(x,()=>(S.regs||[]).find(r=>r.sid===x.id&&r.uid===authUser.uid&&!r.cancel&&!isHeldOut(r)));
// Đăng ký của mình đã quá giờ giữ chỗ (chưa chuyển khoản)
const gdExpired=x=>authUser&&withX(x,()=>(S.regs||[]).find(r=>r.sid===x.id&&r.uid===authUser.uid&&!r.cancel&&isHeldOut(r)));
const gdFaces=(D,L,n=5)=>L.slice(0,n).map(r=>av(D.pmap.get(r.pid)||{name:r.name},"xs",1)).join("");

// Bản web: VĐV vãng lai đăng ký không cần đăng nhập (tài khoản ẩn danh trên máy), bắt buộc chuyển khoản trước mới giữ chỗ
const gdShell=(D,h,cta="")=>MINI?mxShell(D,h,cta):`<div class="gdweb">${h}</div>${cta?`<div class="gdwcta">${cta}</div>`:""}`;
const webReg=()=>!MINI&&!canWrite&&!REF;
const webG=x=>!MINI&&!!x&&!!x.guest;
// Web: khách cần chuyển khoản trước: có lệ phí và CLB đã khai ngân hàng
const webPayOk=()=>feeGuest()<=0||!!(BANK&&BANK.acc);
const webLinked=()=>!MINI&&isZaloU(authUser)&&S.link&&S.link.status==="ok";
/* ----- Thẻ giải đấu ----- */
function gdCard(D,x){
  return withX(x,()=>{
    const s=xState(x),R=regList(D),mine=gdMine(x),n=R.conf.length,m=+x.max||0,fee=xFee(x),left=m?Math.max(0,m-n):null,ty=gdTy(x);
    const live=s==="live",href=live?pathOf("app",{tab:"san"}):pathOf("app",{tab:"dk",x:x.id}),go=live?`data-go="app" data-t="san"`:`data-go="app" data-t="dk" data-x="${esc(x.id)}"`;
    const chips=[lvTxt(x)||"Mọi trình",`Chạm ${+x.target||11}`,pairRegOn(x)&&"🤝 Đăng ký theo cặp",x.guests&&"Nhận VĐV ngoài CLB"].filter(Boolean);
    const pz=gdPrize(x),price=fee?`<b class="gdpr">${fmtK(fee)}${x.fmt==="giai"?"":""}</b>`:"";
    let foot;
    if(live)foot=`<span class="gdst ok"><span class="dot"></span>Đang đánh</span><span class="gdcta">XEM TRỰC TIẾP</span>`;
    else if(mine){const pos=R.all.indexOf(mine);foot=`<span class="gdst ok">${pos<R.max?`✓ Đã giữ chỗ #${pos+1}`:`Đang chờ · thứ ${pos-R.max+1}`} · ${gdPayLb(mine)}</span><span class="gdcta ok">XEM VÉ</span>`}
    else if(s==="plan")foot=`<span class="gdst">${esc(xChipTxt(x))}</span>${price}`;
    else if(!xOpen(x))foot=`<span class="gdst">Đã đóng đăng ký</span>${price}`;
    else if(m&&left===0)foot=`<span class="gdbar"><i style="width:100%"></i></span><span class="gdst">${n}/${m}${R.wait.length?` · ${R.wait.length} người chờ`:""}</span><span class="gdcta line">VÀO DANH SÁCH CHỜ</span>`;
    else foot=`${n?`<span class="mxfaces">${gdFaces(D,R.conf)}</span>`:""}<span class="gdst${left!=null&&left<=2?" hot":""}">${m?(left<=2?`Chỉ còn ${left} chỗ`:`<b>${n}/${m}</b> · còn ${left} chỗ`):`${n} người đã đăng ký`}</span>${price}<span class="gdcta ${ty.c}">ĐĂNG KÝ</span>`;
    return `<a class="gdcard ${ty.c}${mine?" mine":""}" href="${href}" ${go}>
      <span class="gdtop">${mxDate(x.at)}<span class="gdbd">${gdBand(x)}<b class="gdnm">${esc(xName(x))}</b><small>${esc([xTime(x),x.place,(+x.courts||0)&&`${x.courts} sân`].filter(Boolean).join(" · "))}</small>
        <span class="gdchips">${chips.map(c=>`<span>${esc(c)}</span>`).join("")}</span>${pz?`<span class="gdprize">🏆 ${esc(pz)}</span>`:""}</span></span>
      <span class="gdft">${foot}</span></a>`;
  });
}
// Chữ của trạng thái "chưa mở" (giống xChip nhưng không có thẻ)
const xChipTxt=x=>String(xChip(x)).replace(/<[^>]+>/g,"").trim();

/* ----- Trang chi tiết giải đấu (trong ngữ cảnh RX) ----- */
function gdFacts(D,R){
  const r=regCfg(),m=+r.max||0,n=R.conf.length,fee=feeMem(),fg=feeGuest(),c={...D.c,...RX},thu=RX.thu||"keo";
  const feeTxt=RX.cp===false?"Miễn phí":fee?kVND(fee):THU[thu]||"Theo CLB";
  const fsub=RX.cp===false?"Không thu chi phí":r.guests&&fg!==fee&&fg?`VĐV ngoài CLB ${kVND(fg)}`:thu==="phi"?"Phí cố định":thu==="deu"?"Chia đều chi phí thật":"Đội thua góp";
  const cell=(l,v,s,cls="")=>`<div><small>${l}</small><b class="${cls}">${v}</b><span>${s}</span></div>`;
  return `<div class="gdfacts">${cell("THỂ THỨC",esc(xFmt(RX)),esc(gdTy(RX).d))}${cell("TRÌNH ĐỘ",esc(r.lvMin||r.lvMax?`${r.lvMin||"…"} – ${r.lvMax||"…"}`:"Mọi trình"),r.lvMin||r.lvMax?"Theo rating CLB":"Ai cũng đăng ký được")}
    ${cell("SỐ CHỖ",m?(n>=m?"Hết chỗ":`Còn ${m-n}/${m}`):`${n} đã đăng ký`,m?`${+c.courts||2} sân${R.wait.length?` · ${R.wait.length} người chờ`:""}`:`${+c.courts||2} sân · không giới hạn`,m&&n>=m?"lose":"win")}${cell("LỆ PHÍ",esc(feeTxt),esc(fsub))}</div>`;
}
function gdWho(D,R){
  if(!R.all.length)return `<div class="gdbox"><h3>Ai đi</h3><span class="gdnote">Chưa có ai đăng ký. Bạn là người đầu tiên!</span></div>`;
  const ppl=R.conf.map(r=>({r,p:D.pmap.get(r.pid)})),F=ppl.filter(x=>(x.p?x.p.gender:x.r.gender)==="F").length,M=ppl.length-F;
  const rt=ppl.map(x=>x.p?D.st.get(x.p.id)?.rating:+x.r.lv).filter(v=>Number.isFinite(v)&&v>0),avg=rt.length?rt.reduce((a,b)=>a+b,0)/rt.length:0;
  const f=x=>{const p=D.pmap.get(x.pid);return `<span class="rgp">${av(p||{name:x.name},"sm",1)}<small>${esc(p?.name||x.name||"?")}${x.guest?" · ngoài CLB":""}</small></span>`};
  return `<div class="gdbox"><div class="gdhd"><h3>Ai đi · ${R.conf.length} người</h3><span>${M} nam · ${F} nữ</span></div>
    ${R.max<999?`<span class="gdbar"><i style="width:${Math.min(100,Math.round(R.conf.length/R.max*100))}%"></i></span>`:""}
    <div class="rgl">${R.conf.map(f).join("")}</div>${avg?`<span class="gdnote">Trình trung bình ${r2(avg)}</span>`:""}
    ${R.wait.length?`<span class="lbl">Danh sách chờ</span><div class="rgl wt">${R.wait.map(f).join("")}</div>`:""}</div>`;
}
function gdRules(D){
  const c={...D.c,...RX},G=RX.fmt==="giai",w2=RX.win2!=null?!!RX.win2:winBy2(c),pt=+RX.ptMax||0;
  const row=(a,b)=>`<div class="gdrow"><span>${a}</span><b>${b}</b></div>`;
  let h=`<div class="gdbox"><h3>Luật thi đấu</h3>${row("Thể thức",G?"Vòng tròn, mỗi cặp gặp tất cả":"Xoay cặp, app tự xếp cân trình")}${row("Mỗi trận",`Chạm ${+RX.target||11}${w2?" · thắng cách 2":""}${pt?` · trần ${pt}`:""}`)}`;
  if(G)h+=row("Xếp hạng","Thắng → đối đầu → hiệu số");
  if(RX.refOn)h+=row("Trọng tài","Có, nhập điểm từng sân");
  return h+`</div>`;
}
function gdMoney(D){
  const fee=feeMem(),thu=RX.thu||"keo";let h="";
  if(RX.gton){const row=(a,b)=>`<div class="gdrow"><span>${a}</span><b>${b}</b></div>`;
    if(RX.gt==="hang"){const k=(RX.hang||[]).map(v=>+v||0),t=k.reduce((a,b)=>a+b,0);
      h+=`<div class="gdbox prize"><h3>🏆 Giải thưởng${t?` · ${kVND(t)}`:""}</h3>${row("🥇 Nhất",kVND(k[0]||0))}${k[1]?row("🥈 Nhì",kVND(k[1])):""}${k[2]?row("🥉 Ba",kVND(k[2])):""}<span class="gdnote">Trao ngay sau trận cuối.</span></div>`}
    else h+=`<div class="gdbox prize"><h3>🏆 Giải thưởng</h3><span class="gdnote">${esc(GT[RX.gt]||"")}${RX.gt==="trich"?` · ${+RX.gtv||0}% phần dư`:RX.gt==="gop"?` · mỗi người góp ${fmtK(+RX.gtv||0)}`:RX.gt==="codinh"?` · ${fmtK(+RX.gtv||0)}`:""}${RX.fmt==="giai"||RX.trao==="top3"?". Trao hạng 1, 2, 3.":". Trao số 1 nam và số 1 nữ."}</span></div>`}
  if(RX.cp!==false&&(fee||RX.incl||thu!=="phi")){
    h+=`<div class="gdbox"><h3>Lệ phí gồm những gì</h3>${fee?`<div class="gdrow"><span>Lệ phí mỗi người</span><b>${kVND(fee)}</b></div>`:""}
      ${RX.incl?String(RX.incl).split(/[,;\n]+/).map(s=>s.trim()).filter(Boolean).map(s=>`<div class="gdrow"><span>· ${esc(s)}</span><span>Đã gồm</span></div>`).join(""):""}
      ${thu==="keo"?`<span class="gdnote">Đội thua góp phần chi phí sân, bóng. Số tiền chốt sau giải đấu.</span>`:thu==="deu"?`<span class="gdnote">Chi phí thật chia đều sau giải đấu. Số trên là dự kiến.</span>`:""}</div>`}
  return h;
}
function gdPolicy(D){
  const r=regCfg(),lk=regLockAt(),row=(a,b,cls="")=>`<div class="gdrow"><span>${a}</span><b class="${cls}">${b}</b></div>`;
  let h=`<div class="gdbox"><h3>Hủy và hoàn phí</h3>`;
  if(lk)h+=row(`Trước ${hm(lk)} ${dowVN(lk)} ${dmy(lk)}`,"Hủy được · hoàn 100%","win")+row("Sau đó","Không hủy, không hoàn","lose");
  else h+=row("Trước giờ đánh","Hủy được · hoàn 100%","win");
  if(r.deadline)h+=`<span class="gdnote">Hạn đăng ký ${hm(r.deadline)} ${dowVN(r.deadline)}. Hết chỗ thì vào danh sách chờ, có chỗ app báo cho bạn.</span>`;
  return h+`</div>`;
}
function gdSched(D){
  const at=RX.at;if(!at)return "";const row=(a,b)=>`<div class="gdrow"><span>${a}</span><b>${b}</b></div>`;
  return `<div class="gdbox"><h3>Lịch trình</h3>${row(hm(at-15*6e4),"Điểm danh, khởi động")}${row(hm(at),"Bắt đầu")}${RX.end?row(RX.end,RX.gton?"Kết thúc · trao giải":"Kết thúc"):""}</div>`;
}
// Nhắn tin: người tạo giải (chat Zalo trong Mini App) và số Zalo liên hệ của CLB
const gdBy=()=>MINI&&RX&&RX.byZ&&RX.byZ!==myZid()?{z:RX.byZ,n:RX.byN||"Người tạo giải"}:null;
const gdPhone=()=>String((CLUB&&CLUB.zalo)||"").replace(/\D/g,"");
const gdChatMsg=()=>`Chào BTC, mình hỏi về ${xName(RX)} (${whenFull(RX)}):`;
function gdContact(){
  const by=gdBy(),zl=gdPhone();if(!by&&!zl)return "";
  let h=`<div class="gdbox gdct"><h3>Liên hệ ban tổ chức</h3>`;
  if(by)h+=`<div class="gdctr">${av({name:by.n},"md",1)}<span class="t"><b>${esc(by.n)}</b><span class="gdnote">Người tạo giải · hỏi về giải, ghép cặp, lệ phí</span></span><button class="gdcp" data-act="gdchat" data-v="by">💬 Nhắn tin</button></div>`;
  if(zl)h+=`<div class="gdctr">${clubAv(CLUB||{id:CID},"s40")}<span class="t"><b>Ban tổ chức ${esc(CLUB?.name||"")}</b><span class="gdnote">Zalo liên hệ của CLB</span></span><button class="gdcp" data-act="gdchat" data-v="clb">💬 Nhắn Zalo</button></div>`;
  return h+`</div>`;
}
function gdHero(D){
  const ty=gdTy(RX),X=RX;
  if(X.poster){const pi=posterCache[X.id];if(pi===undefined)posterGet(X.id).then(()=>render());else if(pi)return MINI?gdCover(D,ty,pi):`<img class="gdposter" src="${esc(pi)}" alt="Poster ${esc(xName(X))}">`+gdHeroBox(D,ty)}
  return gdHeroBox(D,ty);
}
// Mini App: poster tràn viền (cả dưới thanh trạng thái), tên giải và nút chia sẻ nằm trên ảnh
function gdCover(D,ty,pi){
  return `<div class="gdcover"><img src="${esc(pi)}" alt="Poster ${esc(xName(RX))}"><div class="gdcv"><span class="gdty ${ty.c}">${ty.lb}</span><b>${esc(xName(RX))}</b><span class="d">${esc(whenFull(RX))}</span>
    <span class="row"><span class="gdorg">${clubAv(CLUB||{id:CID},"s20")}${esc(CLUB?.name||"")} tổ chức</span><button class="gdshr" data-act="mxinvite"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5l7 7-7 7M21 12H10a7 7 0 0 0-7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>Chia sẻ</button></span></div></div>`;
}
function gdHeroBox(D,ty){
  return `<div class="gdhero ${ty.c}"><span class="gdty ${ty.c}">${ty.lb}</span><b>${esc(xName(RX))}</b><span>${esc(whenFull(RX))}</span>
    <span class="gdorg">${clubAv(CLUB||{id:CID},"s20")}${esc(CLUB?.name||"")} tổ chức</span></div>`;
}
function gdPlace(){
  if(!RX.place&&!RX.map)return "";
  return `<div class="gdbox row"><span class="gdpin" aria-hidden="true">📍</span><span class="t"><b>${esc(RX.place||"Xem bản đồ")}</b></span>${RX.map?`<button class="gdcp" data-act="openurl" data-v="${esc(RX.map)}">Chỉ đường</button>`:""}</div>`;
}
function gdDetail(D,o={}){
  const R=regList(D),r=regCfg(),full=R.conf.length>=R.max,fee=feeMem(),exp=gdExpired(RX);
  let h=gdHero(D);
  {const inv=!o.mine&&capInvite(D);if(inv)h+=capBanner(D,inv)}
  if(exp)h+=`<div class="gdwarn">Đã hết 15 phút giữ chỗ nên chỗ của bạn được nhả ra. Đăng ký lại nếu còn chỗ.</div>`;
  if(webReg()&&!webLinked()&&xOpen(RX)&&!regClosed())h+=`<div class="gdwebnote"><b>${r.guests&&webPayOk()?"Đăng ký ngay trên web, không cần tài khoản":"Đăng ký trong Zalo"}</b><span>${r.guests&&webPayOk()?`VĐV ngoài CLB đăng ký ở đây${feeGuest()?`, <b>chuyển khoản ${kVND(feeGuest())} trước</b> mới giữ được chỗ`:""}. Thành viên CLB đăng ký trong Zalo để có giá thành viên.`:"Giải này đăng ký qua Pikeco trong Zalo."}</span><span class="gdwl"><a href="${esc(miniLink(CID,RX.id))}">Mở trong Zalo ›</a>${qrlBtn("lnk")}</span>${qrlBox()}</div>`;
  h+=gdFacts(D,R)+gdPlace()+gdContact()+gdWho(D,R)+(RX.note?`<div class="gdbox"><h3>Giới thiệu</h3><span class="gdnote">${esc(RX.note)}</span></div>`:"")+gdMoney(D)+gdRules(D)+gdSched(D)+gdPolicy(D);
  let cta="";
  if(regClosed())cta=`<span class="gdsum"><b>Đã hết hạn</b><small>đăng ký</small></span><button class="primary" disabled>ĐÃ ĐÓNG ĐĂNG KÝ</button>`;
  else if(!xOpen(RX))cta=`<span class="gdsum"><b>${fee?fmtK(fee):""}</b><small>${esc(xChipTxt(RX))}</small></span><button class="primary" disabled>CHƯA MỞ ĐĂNG KÝ</button>`;
  else if(webReg()&&!webLinked()&&(!r.guests||!webPayOk()))cta=`<span class="gdsum"><b>${fee?fmtK(fee):""}</b><small>${r.guests?"đăng ký trong Zalo":"chỉ thành viên CLB"}</small></span><a class="primary zl" href="${esc(miniLink(CID,RX.id))}">ĐĂNG KÝ TRONG ZALO</a>`;
  else cta=`<span class="gdsum"><b>${webReg()&&!webLinked()?(feeGuest()?kVND(feeGuest()):"Miễn phí"):fee?kVND(fee):RX.cp===false?"Miễn phí":THU[RX.thu||"keo"]}</b><small class="${!full&&R.max-R.conf.length<=2?"hot":""}">${R.max<999?(full?"Hết chỗ":`Còn ${R.max-R.conf.length} chỗ`):`${R.conf.length} đã đăng ký`}</small></span><button class="primary ${gdTy(RX).c}" data-act="gdreg">${full?"VÀO DANH SÁCH CHỜ":"ĐĂNG KÝ NGAY"}</button>`;
  if(o.mine)return gdShell(D,h,`<button class="primary wide" data-act="gdinfo">‹ VỀ VÉ CỦA BẠN</button>`);
  return gdShell(D,h,`<div class="gdcta-bar">${cta}</div>`);
}

/* ----- Đăng ký · bước 1: tư cách, cách trả ----- */
let gdOpt={who:"",pay:""},gsPhoto="";
const gdSteps=n=>`<div class="gdsteps">${["THÔNG TIN","THANH TOÁN","VÉ"].map((l,i)=>`<span class="${i+1<n?"ok":i+1===n?"on":""}">${i+1<n?"✓ ":`${i+1} `}${l}</span>`).join("")}</div>`;
function gdReg1(D){
  const r=regCfg(),linked=S.link&&S.link.status==="ok",pend=S.link&&S.link.status==="pending",R=regList(D),full=R.conf.length>=R.max;
  const W=!MINI&&!linked,canPay=(payOn()||W)&&!!(BANK&&BANK.acc),req=regPayMode()==="req"||W;
  if(W)gdOpt.who="guest";
  if(!gdOpt.who)gdOpt.who=linked?"mem":r.guests?"guest":"mem";
  if(!gdOpt.pay)gdOpt.pay=canPay?"now":"site";
  if(req&&canPay)gdOpt.pay="now";
  const who=gdOpt.who,me=linked?D.pmap.get(S.link.pid):null,pay=canPay&&!full?gdOpt.pay:"site",k=who==="guest"?feeGuest():mfPerk(me&&me.id,feeMem());
  const opt=(k2,v,title,sub,price,dis)=>`<button class="gdopt${gdOpt[k2]===v||(k2==="pay"&&pay===v)?" on":""}" data-act="gdopt" data-k="${k2}" data-v="${v}"${dis?" disabled":""}><span class="rd"></span><span class="t"><b>${title}</b><small>${sub}</small></span>${price!=null?`<b class="pr">${price}</b>`:""}</button>`;
  let h=`<div class="gdtop2"><button class="gdback" data-act="gdback" aria-label="Quay lại">‹</button><b>Đăng ký · ${esc(xName(RX))}</b></div>`+gdSteps(1)+`<span class="xsec">Bạn đăng ký với tư cách</span>`;
  if(!W)h+=opt("who","mem",linked?`Thành viên · ${esc(me?.name||"")}`:`Thành viên ${esc(CLUB?.name||"CLB")}`,linked?"Đã liên kết Zalo · giá thành viên":pend?"Đang chờ chủ CLB duyệt tên của bạn":"Chọn tên của bạn trong CLB, chủ CLB xác nhận một lần",feeMem()?fmtK(mfPerk(me&&me.id,feeMem())):null);
  if(r.guests)h+=opt("who","guest","Vận động viên ngoài CLB",W?"Không cần tài khoản · cần ảnh của bạn":"Không cần chờ duyệt · cần ảnh của bạn",feeGuest()?fmtK(feeGuest()):null);
  if(W)h+=`<small class="rule">Thành viên ${esc(CLUB?.name||"CLB")}? <a href="${esc(miniLink(CID,RX.id))}">Đăng ký trong Zalo</a> để có giá thành viên.</small>`;
  if(who==="guest"){const lv=val("gs-lv","3.0"),g=val("gs-g","M");
    h+=`<div class="gdbox gdphoto"><span class="xsec" style="margin:0">Ảnh của bạn · bắt buộc</span>
      <span class="gdpic">${gsPhoto?`<img src="${esc(gsPhoto)}" alt="Ảnh của bạn">`:mxSvg("me")}</span>
      <div class="gd2"><label class="primary gdfile">📷 Chụp ảnh<input type="file" accept="image/*" capture="user" data-gsphoto="1"></label><label class="line gdfile">Chọn từ máy<input type="file" accept="image/*" data-gsphoto="1"></label></div>
      ${zaloProf().p?`<button class="gdcp" data-act="gdzav">Dùng ảnh đại diện Zalo</button>`:""}
      <span class="gdnote">Ảnh rõ mặt, nhìn thẳng. Ban tổ chức dùng để nhận ra bạn lúc check-in. Chỉ ban tổ chức CLB xem được.</span>${errs.gs?`<p class="err">${esc(errs.gs)}</p>`:""}</div>
      <div class="gdform"><label class="fld"><span class="lbl">Tên hiển thị</span><input id="gs-name" data-draft="gs-name" maxlength="30" value="${esc(val("gs-name",zaloProf().n||""))}"></label>
      <div class="gd2"><div class="fld"><span class="lbl">Giới tính</span><span class="seg"><button data-act="gsg" data-v="M" aria-pressed="${g==="M"}">Nam</button><button data-act="gsg" data-v="F" aria-pressed="${g==="F"}">Nữ</button></span></div>
      <label class="fld"><span class="lbl">Trình độ tự đánh giá</span><select id="gs-lv" data-draft="gs-lv">${["2.0","2.5","3.0","3.5","4.0","4.5","5.0"].map(v=>`<option ${v===lv?"selected":""}>${v}</option>`).join("")}</select></label></div>
      ${lvTxt(r)?`<span class="gdnote">${esc(lvTxt(r))} cho giải đấu này. Ghi sai trình, BTC có thể xếp lại cặp.</span>`:""}</div>`}
  if(who==="guest"||linked)h+=`<div class="gdbox">${phBox()}</div>`;
  if(!W)h+=capReg1(D);
  if(k>0&&canPay&&!full){h+=`<span class="xsec">Cách thanh toán</span>`+opt("pay","now",`Chuyển khoản ngay <em class="gdtag">${W?"BẮT BUỘC":"GIỮ CHỖ CHẮC"}</em>`,W?"Chỗ của bạn được giữ 15 phút để chuyển khoản. Quá giờ chưa chuyển, chỗ được nhả cho người khác.":"Quét QR bằng app ngân hàng bất kỳ. BTC xác nhận là có vé.",null);
    if(!req)h+=opt("pay","site","Trả tại sân","Giữ chỗ tạm. Gần giờ đánh nếu đầy, người đã trả trước được ưu tiên.",null)}
  else if(full)h+=`<div class="gdwarn">Giải đấu đã đủ chỗ. Bạn vào danh sách chờ, có người hủy là bạn được vào và app báo cho bạn.</div>`;
  h+=`<div class="gdbox"><h3>Tóm tắt</h3><div class="gdrow"><span>${esc(xName(RX))} · ${RX.at?dmy(RX.at):""}</span><span>${RX.at?hm(RX.at):""}</span></div>${k?`<div class="gdrow"><span>Lệ phí ${who==="guest"?"VĐV ngoài CLB":"thành viên"}</span><b>${kVND(k)}</b></div>`:""}<div class="gdrow tot"><b>Tổng</b><b>${k?kVND(k):RX.cp===false?"0đ":THU[RX.thu||"keo"]}</b></div></div>`;
  const lk=regLockAt();
  h+=`<button class="gdagree${val("gd-ok","")==="1"?" on":""}" data-act="gdagree"><span class="ck">✓</span>Tôi đã đọc chính sách hủy${lk?`: hủy và hoàn 100% trước ${hm(lk)} ${dmy(lk)}`:""}</button>${errs.gdok?`<p class="err">${esc(errs.gdok)}</p>`:""}`;
  let cta;
  if(who==="mem"&&!linked)cta=`<button class="primary wide" data-act="mxdk" data-v="pick">${pend?"Xem yêu cầu tham gia":"CHỌN TÊN CỦA BẠN TRONG CLB"}</button>`;
  else{const act=who==="guest"?"guestin":"regin",v=full||!k||!canPay?"none":pay==="now"?"hold":"none";
    cta=`<button class="primary wide" data-act="${act}" data-v="${v}">${full?"VÀO DANH SÁCH CHỜ":v==="hold"?`TIẾP TỤC · THANH TOÁN ${kVND(k)}`:"ĐĂNG KÝ"}</button>`}
  return gdShell(D,h,cta);
}

/* ----- Bước 2: thanh toán (giữ chỗ 15 phút) ----- */
function gdPay(D,mine){
  const k=feeOf(mine),nm=mine.guest?mine.name:D.pmap.get(mine.pid)?.name,note=payNoteX(RX,nm||"KHACH"),amt=Math.round(k*1000),end=(mine.at||0)+HOLD_MS,R=regList(D),pos=R.all.indexOf(mine);
  const cp=v=>`<button class="gdcp" data-act="cp" data-v="${esc(v)}">Chép</button>`;
  let h=`<div class="gdtop2"><b>Thanh toán · ${esc(xName(RX))}</b></div>`+gdSteps(2);
  h+=`<div class="gdhold"><b data-cd="${end}">${gdMMSS(end-Date.now())}</b><span>Đang giữ chỗ #${pos+1} cho bạn. Chuyển khoản trong 15 phút để chắc chỗ.</span></div>`;
  h+=`<div class="gdbox gdqr"><span class="gdnote">Số tiền</span><b class="gdamt">${kVND(k)}</b>${vqrSvg(amt,note,220)}
    <span class="gdnote">Quét bằng app ngân hàng bất kỳ · số tiền và nội dung đã điền sẵn</span><button class="line wide" data-act="saveqr" data-a="${amt}" data-n="${esc(note)}">Lưu mã QR vào máy</button></div>`;
  if(!MINI)h+=`<div class="gdbox">${bankApps(amt,note,D.sid)}</div>`;
  h+=`<div class="gdbox"><h3>Hoặc chuyển khoản thủ công</h3><div class="gdrow"><span>Ngân hàng</span><b>${esc(BANK.name||"")}</b></div><div class="gdrow"><span>Số tài khoản</span><span class="gdv"><b>${esc(BANK.acc)}</b>${cp(BANK.acc)}</span></div>
    <div class="gdrow"><span>Chủ tài khoản</span><b>${esc(BANK.holder||"")}</b></div><div class="gdrow"><span>Nội dung</span><span class="gdv"><b class="lose">${esc(note)}</b>${cp(note)}</span></div><span class="gdnote">Ghi đúng nội dung để BTC đối chiếu nhanh.</span></div>`;
  const cta=`<button class="primary wide win" data-act="regpaid">TÔI ĐÃ CHUYỂN KHOẢN</button>${regPayMode()!=="req"&&!webG(mine)?`<button class="ghost wide" data-act="gdsite">Chưa chuyển được? Đổi sang trả tại sân</button>`:""}`;
  gdTick();
  return gdShell(D,h,cta);
}
const gdMMSS=ms=>{ms=Math.max(0,ms);const s=Math.floor(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`};
let gdTimer=null;
function gdTick(){if(gdTimer||typeof setInterval!=="function"||!document.querySelectorAll)return;
  gdTimer=setInterval(()=>{const L=document.querySelectorAll("[data-cd]");if(!L.length){clearInterval(gdTimer);gdTimer=null;return}
    let done=false;L.forEach(el=>{const left=+el.dataset.cd-Date.now();el.textContent=gdMMSS(left);if(left<=0)done=true});if(done){clearInterval(gdTimer);gdTimer=null;render()}},1000)}

/* ----- Bước 3: vé ----- */
function gdTicket(D,mine){
  const R=regList(D),pos=R.all.indexOf(mine),wait=pos>=R.max,k=feeOf(mine),me=mine.guest?null:D.pmap.get(mine.pid),nm=mine.guest?mine.name:me?.name||mine.name||"";
  const lv=mine.guest?mine.lv:me?r2(D.st.get(me.id)?.rating||+me.rating0||0):"",lk=regLockAt(),locked=lk&&Date.now()>lk;
  const pay=mine.pay||"none",paySt=pay==="ok"?`<b class="win">✓ Đã trả</b>`:pay==="sent"?`<b class="warn">Chờ BTC xác nhận</b>`:k?`<b>Trả tại sân</b>`:`<b class="win">Miễn phí</b>`;
  const today=RX.at&&sameDay(RX.at,Date.now()),ty=gdTy(RX);
  let h=`<div class="gdtop2"><b>Vé của bạn</b></div>`+gdSteps(3);
  let ci;
  if(mine.arrived)ci=`<div class="gdci ok"><b>✓ Đã vào giải đấu</b><span>Bạn ở hàng chờ sân. App sẽ gọi tên khi tới lượt.</span><a class="primary wide" href="${pathOf("app",{tab:"san"})}" data-go="app" data-t="san">XEM SÂN TRỰC TIẾP</a></div>`;
  else if(mine.ci)ci=`<div class="gdci wait"><b>Đã check-in · chờ BTC nhìn mặt</b><span>Ban tổ chức đang thấy thẻ của bạn trên máy. Đứng trước bàn BTC vài giây để họ xác nhận.</span></div>`;
  else if(wait)ci=`<div class="gdci"><b>Bạn đang chờ chỗ · thứ ${pos-R.max+1}</b><span>Có người hủy là bạn được vào, app báo cho bạn.</span></div>`;
  else if(!MINI)ci=`<div class="gdci"><span class="k">CHECK-IN TẠI SÂN</span><span>Tới sân, đưa vé này (hoặc báo tên <b>${esc(nm)}</b>) cho ban tổ chức để check-in. Giữ trang này hoặc chụp màn hình vé.</span></div>`;
  else ci=`<div class="gdci"><span class="k">CHECK-IN TẠI SÂN</span><span>Tới sân, mở Zalo quét <b>mã trên máy ban tổ chức</b>. Camera Zalo không mở được thì bấm nút dưới đây.</span><button class="primary wide" data-act="mxscan">⌗ QUÉT MÃ CHECK-IN</button>${today?"":`<small>Mã check-in chỉ có vào ngày đánh.</small>`}</div>`;
  h+=`<div class="gdticket ${ty.c}"><div class="gdtk1">${av(me||{name:nm},"md",1)}<span class="t">${gdBand(RX,true)}<b>${esc(xName(RX))}</b><small>${esc(whenFull(RX))}${RX.place?` · ${esc(RX.place)}`:""}</small></span></div>
    <div class="gdtk2">${ci}</div>
    <div class="gdtk3"><span><small>VĐV</small><b>${esc(nm)}${lv?` · ${esc(String(lv))}`:""}</b></span><span><small>Số thứ tự</small><b>${wait?`Chờ ${pos-R.max+1}`:`#${pos+1}`}</b></span><span><small>Lệ phí</small><b>${k?kVND(k):"0đ"}</b></span><span><small>Trạng thái</small>${paySt}</span></div></div>`;
  h+=capTicket(D,mine);
  h+=`<div class="gdacts">${gdBy()||gdPhone()?`<button data-act="gdchat">💬<span>NHẮN BTC</span></button>`:""}${RX.map?`<button data-act="openurl" data-v="${esc(RX.map)}">📍<span>CHỈ ĐƯỜNG</span></button>`:""}<button data-act="mxinvite">👥<span>RỦ BẠN</span></button></div>`;
  if(RX.at)h+=`<div class="gdbox"><h3>Trước giờ đánh</h3><span class="gdnote">Đến ${hm(RX.at-15*6e4)} để check-in. App tự gọi bạn vào sân, xem ở tab Trực tiếp.</span></div>`;
  h+=gdContact();
  h+=`<button class="gdlink" data-act="gdinfo">Xem chi tiết giải đấu ›</button>`;
  if(!mine.arrived)h+=locked?`<small class="rule" style="text-align:center">Đã qua giờ khóa hủy.</small>`:`<button class="ghost danger wide" data-act="regout">Hủy đăng ký${lk?` (hoàn 100% trước ${hm(lk)} ${dmy(lk)})`:""}</button>`;
  return gdShell(D,h);
}

/* ----- Điều hướng trong trang giải đấu (Mini App) ----- */
let gdInfo=false;
function gdPage(D){
  const mine=gdMine(RX);
  if(mine){
    if(gdInfo)return gdDetail(D,{mine:true});
    if((mine.pay||"none")==="none"&&mine.hold&&(payOn()||webG(mine))&&feeOf(mine)>0&&BANK&&BANK.acc&&regList(D).all.indexOf(mine)<regList(D).max)return gdPay(D,mine);
    return gdTicket(D,mine);
  }
  if(mxDk==="reg1"&&xOpen(RX)&&!regClosed())return gdReg1(D);
  return gdDetail(D);
}

async function gdAct(act,b,id){
  const X0=RX;
  if(await capAct(act,b,id))return true;
  if(act==="gdreg"&&!MINI){const u=authUser;
    if(u&&!u.isAnonymous&&!isZaloU(u)){toast("Bạn đang đăng nhập Google. Thoát ra để đăng ký làm VĐV, hoặc đăng ký trong Zalo.");return true}
    if(!u){try{const r=await FB.signInAnonymously(FB.auth);authUser=r.user}catch(e){toast("Chưa vào được, kiểm tra mạng rồi thử lại.");return true}}
    mxDk="reg1";delete errs.gs;delete errs.gdok;render();try{window.scrollTo(0,0)}catch(e){}return true}
  if(act==="gdreg"){if(!isPlayer(authUser)){zaloStart();return true}mxDk="reg1";delete errs.gs;delete errs.gdok;render();try{window.scrollTo(0,0)}catch(e){}if(gdOpt.who==="guest")mxAskName();return true}
  if(act==="gdback"){mxDk=null;render();return true}
  if(act==="gdchat"){const {by,msg}=withX(X0,()=>({by:gdBy(),msg:X0?gdChatMsg():""})),zl=gdPhone(),w=b.dataset.v;
    if(by&&w!=="clb"){await zChat(by.z,msg);return true}
    if(zl){const u="https://zalo.me/"+zl;if(window.ZMP&&window.ZMP.openWebview){try{await window.ZMP.openWebview({url:u})}catch(e){location.href=u}}else window.open(u,"_blank");return true}
    toast("Ban tổ chức chưa để thông tin liên hệ.");return true}
  if(act==="gdopt"){const k=b.dataset.k,v=b.dataset.v;if(k==="who"||k==="pay"||k==="mate")gdOpt[k]=v;if(k==="who"&&v==="guest")mxAskName();render();return true}
  if(act==="gdagree"){drafts["gd-ok"]=val("gd-ok","")==="1"?"":"1";delete errs.gdok;render();return true}
  if(act==="gdzav"){const p=zaloProf().p;if(p){gsPhoto=p;delete errs.gs;render()}return true}
  if(act==="gdinfo"){gdInfo=!gdInfo;render();try{window.scrollTo(0,0)}catch(e){}return true}
  if(act==="gdsite"){const D=derive(),mine=X0&&gdMine(X0);if(!mine)return true;
    try{await FB.updateDoc(FB.doc(FB.fs,PFX+"regs/"+mine.id),{hold:false});toast("Đã đổi sang trả tại sân")}catch(e){toast("Chưa đổi được, thử lại.")}return true}
  return false;
}
// Ảnh VĐV ngoài CLB: lưu riêng, chỉ ban tổ chức xem
async function gdSavePic(regId){
  if(!gsPhoto)return;
  try{await FB.setDoc(FB.doc(FB.fs,PFX+"regpics/"+regId),{img:gsPhoto,uid:authUser.uid,at:Date.now()})}catch(e){}
}
