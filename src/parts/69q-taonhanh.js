/* ---------- Tạo giải nhanh (canvas trang ai) · giai đoạn 1: không dùng AI ----------
   Bấm ＋ Tạo giải mới (Mini App, quản lý) → 3 cách: Tạo nhanh · Như giải lần trước · Tạo đầy đủ (form cũ).
   Tạo nhanh: tả bằng một câu (app đọc số bằng luật) hoặc chọn từng bước → hỏi thêm bằng chip những gì còn thiếu →
   thẻ xác nhận (chạm dòng nào sửa dòng đó, tính giờ xong) → Tạo giải = điền form cũ rồi lưu như bình thường. */
let tnPg=null,tn=null,tnEd=null,tnAskI=0,tnStep=0;
const TN_FMT={bang:"Chia bảng + knockout",giai:"Vòng tròn theo cặp",xoay:"Giao lưu xoay cặp"};
const TN_DT={free:"Open",MM:"Đôi nam",FF:"Đôi nữ",mix:"Đôi nam nữ"};
const TN_MAU=[["Chia bảng rồi đánh loại","Chủ nhật 7h, 16 cặp, chia 4 bảng lấy 2 cặp mỗi bảng đánh loại trực tiếp, 200k/người"],
  ["Đánh vòng tròn theo cặp","8 cặp đánh vòng tròn, tối thứ 7 lúc 19h, 100k/người"],["Giao lưu xoay cặp","24 người xoay cặp 2 tiếng, 50k"],
  ["Nhiều nội dung","Chủ nhật 7h, 6 sân, đôi open 16 cặp 300k, đôi nữ 4.2 8 cặp 200k, đôi nam 5.5 16 cặp 200k"]];
// Chữ thường, bỏ dấu, giữ số và . , : /
const tnNorm=t=>String(t||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"d").toLowerCase().replace(/[^a-z0-9.,:/ ]/g," ").replace(/\s+/g," ").trim();
const tnDay0=t=>{const d=new Date(t);d.setHours(0,0,0,0);return d.getTime()};
const tnLast=()=>schedAll().filter(x=>x.st!=="cancel"&&x.fmt).sort((a,b)=>(b.createdAt||b.at||0)-(a.createdAt||a.at||0));
const tnQ2=n=>{let q=2;while(q*2<=n&&q<32)q*=2;return q};
// Đọc câu tả giải: trả về các mục đã hiểu
function tnParse(txt){
  let s=" "+tnNorm(txt)+" ";const o={};
  // Giờ phải xong (trước 10h) đọc trước để không nhầm với giờ bắt đầu
  {const m=s.match(/(?:truoc|xong luc|ket thuc)\s*(\d{1,2})\s*(?:h|gio|:)\s*(\d{2})?/);if(m){let h=+m[1];if(h<12&&/chieu|toi/.test(s.slice(m.index,m.index+25)))h+=12;o.endBy=`${String(h).padStart(2,"0")}:${m[2]||"00"}`;s=s.replace(m[0]," ")}}
  if(/chia (\d+ )?bang|vong bang|\d+\s*bang\b|knock|loai truc tiep|danh loai|tu ket|ban ket|chung ket/.test(s))o.fmt="bang";else if(/vong tron/.test(s))o.fmt="giai";else if(/xoay|giao luu/.test(s))o.fmt="xoay";
  // Nhiều nội dung: mỗi đoạn có "đôi …"
  const seg=s.split(/[;,]|\s+va\s+/).map(x=>x.trim()).filter(x=>/\bdoi (open|nam nu|nam|nu)\b|\bnam nu\b/.test(x));
  const ndOfSeg=x=>{const dt=/nam nu|mix/.test(x)?"mix":/doi nam\b/.test(x)?"MM":/doi nu\b/.test(x)?"FF":"free",cap=(x.match(/\b(\d)[.,](\d)\b/)||[]),pr=x.match(/(\d+)\s*cap\b/),fe=x.match(/(\d+)\s*(?:k|nghin|ngan)\b/);
    const c=cap[0]?+(cap[1]+"."+cap[2]):0;return {dt,cap:c,max:pr?+pr[1]:0,fee:fe?+fe[1]:null,name:`${TN_DT[dt]}${c?" "+String(c):""}`}};
  if(seg.length>=2){o.nds=seg.map(ndOfSeg);o.fmt="bang"}
  else if(seg.length===1){const n=ndOfSeg(seg[0]);o.dt=n.dt;if(n.cap)o.cap=n.cap}
  // Ngày
  const now=new Date(),d0=tnDay0(now);
  {const m=s.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/);
    if(m){const y=m[3]?(+m[3]<100?2000+ +m[3]:+m[3]):now.getFullYear();let t=new Date(y,+m[2]-1,+m[1]).getTime();if(!m[3]&&t<d0)t=new Date(y+1,+m[2]-1,+m[1]).getTime();o.date=t}
    else if(/hom nay|toi nay|sang nay|chieu nay/.test(s))o.date=d0;
    else if(/ngay kia/.test(s))o.date=d0+2*864e5;
    else if(/\bmai\b/.test(s))o.date=d0+864e5;
    else{const W=[[/chu nhat|\bcn\b/,0],[/thu (2|hai)\b|\bt2\b/,1],[/thu (3|ba)\b|\bt3\b/,2],[/thu (4|tu)\b|\bt4\b/,3],[/thu (5|nam)\b|\bt5\b/,4],[/thu (6|sau)\b|\bt6\b/,5],[/thu (7|bay)\b|\bt7\b/,6]];
      for(const [re,w] of W)if(re.test(s)){let add=(w-now.getDay()+7)%7;if(/tuan sau|tuan toi/.test(s))add+=add?7:7;o.date=d0+add*864e5;break}}}
  // Giờ bắt đầu
  {const m=s.match(/\b(\d{1,2})\s*(?:h|gio|:)\s*(\d{2})?(?!\d)/);if(m&&+m[1]<24){let h=+m[1];const around=s.slice(Math.max(0,m.index-12),m.index+m[0].length+12);if(h<12&&/chieu|toi/.test(around))h+=12;o.time=`${String(h).padStart(2,"0")}:${String(+(m[2]||0)).padStart(2,"0")}`}}
  {const m=s.match(/(\d+)\s*san\b/);if(m)o.courts=+m[1]}
  {const m=s.match(/cham\s*(\d+)/);if(m)o.target=+m[1]}
  if(!o.nds){const m=s.match(/(\d+)\s*cap\b/);if(m)o.pairs=+m[1]}
  {const m=s.match(/(\d+)\s*(?:nguoi|vdv|van dong vien)\b/);if(m)o.people=+m[1]}
  {const m=s.match(/(\d+)\s*bang\b/);if(m)o.koN=+m[1]}
  {const m=s.match(/lay\s*(\d+)/);if(m)o.lay=+m[1]}
  if(!o.nds){const m=s.match(/(\d+)\s*(?:k|nghin|ngan)\b/)||s.match(/\b(\d{2,3})[.,]?000\s*(?:d|dong|vnd)?\b/);if(m)o.fee=+m[1]}
  if(/mien phi|khong thu/.test(s))o.fee=0;
  if(/thanh vien/.test(s))o.guests=false;else if(/moi nguoi|ngoai clb|tu do/.test(s))o.guests=true;
  {const m=String(txt||"").match(/"([^"]{3,40})"|“([^”]{3,40})”/);if(m)o.name=(m[1]||m[2]).trim()}
  return o;
}
// Đoán phần còn thiếu theo giải gần nhất của CLB (đánh dấu ĐOÁN)
function tnFill(o){
  const L=tnLast(),last=L.find(x=>x.fmt==="giai"&&(o.fmt==="bang"?x.ko:o.fmt==="giai"?!x.ko:false))||L.find(x=>o.fmt==="xoay"?x.fmt==="xoay":true)||{},c=cfg(),g=new Set();
  const t={...o,guess:g};
  const take=(k,v)=>{if(t[k]==null&&v!=null&&v!==""){t[k]=v;g.add(k)}};
  take("courts",+last.courts||+c.courts||2);take("target",+last.target||+c.target||11);take("place",last.place||"");
  take("fee",last.thu==="phi"?+last.phi||0:+last.fee||0);take("guests",!!last.guests);
  if(t.fmt==="bang"&&!t.nds){if(t.pairs&&!t.koN){t.koN=Math.max(1,Math.min(8,Math.round(t.pairs/4)));g.add("koN")}if(t.koN&&!t.lay)t.lay=2}
  if(t.fmt==="xoay"&&!t.people&&last.max){t.people=+last.max;g.add("people")}
  if(t.nds)t.nds=t.nds.map(n=>({...n,max:n.max||16,fee:n.fee!=null?n.fee:t.fee||0,koN:Math.max(1,Math.min(8,Math.round((n.max||16)/4)))}));
  if(!t.dt)t.dt="free";
  return t;
}
// Còn thiếu gì phải hỏi (tối đa 3 câu)
function tnMiss(t){const L=[];if(!t.fmt)L.push("fmt");if(t.date==null)L.push("date");if(!t.time)L.push("time");
  if(t.fmt==="bang"&&!t.nds&&!t.pairs)L.push("pairs");if(t.fmt==="giai"&&!t.pairs)L.push("pairs");if(t.fmt==="xoay"&&!t.people)L.push("people");return L.slice(0,3)}
// Ước lượng số trận và giờ xong
function tnCount(fmt,n,N,q){if(fmt==="giai")return n*(n-1)/2;if(fmt!=="bang")return 0;N=Math.max(1,Math.min(N||1,Math.floor(n/2)||1));let m=0;for(let i=0;i<N;i++){const k=Math.floor(n/N)+(i<n%N?1:0);m+=k*(k-1)/2}const Q=Math.min(q||N*2,tnQ2(n));return m+Q-1+(Q>=4?1:0)}
function tnEst(t){if(!t||t.fmt==="xoay"||t.date==null||!t.time)return null;
  const L=t.nds?t.nds.map(n=>tnCount("bang",n.max,n.koN,(n.koN||1)*2)):[tnCount(t.fmt,t.pairs||0,t.koN,(t.koN||1)*(t.lay||2))],m=L.reduce((a,b)=>a+b,0);if(!m)return null;
  const slot=GSLOT*((t.target||11)<=7?0.7:(t.target||11)>=15?1.35:1),mins=Math.ceil(m/Math.max(1,t.courts||1))*slot,at=tnAt(t),end=at+mins*6e4;
  const by=t.endBy?(()=>{const [h,mi]=t.endBy.split(":").map(Number),d=new Date(at);d.setHours(h,mi,0,0);return d.getTime()})():0;
  return {m,mins:Math.round(mins),end,by,late:by&&end>by};
}
const tnAt=t=>{const [h,m]=String(t.time||"19:00").split(":").map(Number);const d=new Date(t.date??Date.now());d.setHours(h||0,m||0,0,0);return d.getTime()};
const tnDow=t=>["CN","T2","T3","T4","T5","T6","T7"][new Date(t).getDay()];
const tnDm=t=>{const d=new Date(t);return `${d.getDate()}/${d.getMonth()+1}`};
function tnAutoName(t){const at=tnAt(t),h=new Date(at).getHours(),day=`${tnDow(at)} ${tnDm(at)}`;
  if(t.fmt==="xoay")return `Giao lưu ${h<11?"sáng":h<17?"chiều":"tối"} ${day}`;
  if(t.nds)return `Giải ${t.nds.length} nội dung ${day}`;
  return `Giải ${t.dt&&t.dt!=="free"?TN_DT[t.dt].toLowerCase().replace("đôi ","đôi "):"đôi"}${t.cap?" "+t.cap:""} ${day}`.slice(0,30)}
const tnName=t=>t.name||tnAutoName(t);

/* ----- Các màn ----- */
const tnBig=(ic,t,s,act,v,on)=>`<button class="tnbig${on?" on":""}" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:""}><i>${ic}</i><span class="t"><b>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`;
const tnChip=(act,v,l,on,k)=>`<button class="tnchip" data-act="${act}" data-v="${esc(v)}"${k?` data-k="${k}"`:""} aria-pressed="${!!on}">${l}</button>`;
function tnDateOpts(){const d0=tnDay0(Date.now()),sat=d0+((6-new Date().getDay()+7)%7||7)*864e5,sun=d0+((7-new Date().getDay())%7||7)*864e5;
  return [[d0,"Hôm nay"],[d0+864e5,"Mai"],[sat,`T7 ${tnDm(sat)}`],[sun,`CN ${tnDm(sun)}`]]}
function tnAskBody(k,t){
  if(k==="fmt")return `<b class="tnq">Giải đánh kiểu gì?</b>`+tnBig("🏆","Chia bảng rồi đánh loại","Vòng bảng chọn cặp mạnh, rồi tứ kết, bán kết, chung kết","tnset","fmt:bang",t.fmt==="bang")+tnBig("🔁","Vòng tròn theo cặp","Mỗi cặp gặp tất cả cặp khác, tính điểm xếp hạng","tnset","fmt:giai",t.fmt==="giai")+tnBig("🔀","Giao lưu xoay cặp","Đăng ký từng người, mỗi trận app ghép cặp mới","tnset","fmt:xoay",t.fmt==="xoay");
  if(k==="date")return `<b class="tnq">Đánh ngày nào?</b><div class="tnchips">${tnDateOpts().map(([v,l])=>tnChip("tnset","date:"+v,l,t.date===v)).join("")}</div><label class="fld"><span class="lbl">Ngày khác</span><input type="date" id="tn-date" data-draft="tn-date" value="${t.date!=null?ymdIso(t.date):""}"></label>`;
  if(k==="time")return `<b class="tnq">Mấy giờ bắt đầu?</b><div class="tnchips">${["06:30","07:00","08:00","17:00","18:30","19:00"].map(v=>tnChip("tnset","time:"+v,v,t.time===v)).join("")}</div><label class="fld"><span class="lbl">Giờ khác</span><input type="time" id="tn-time" data-draft="tn-time" value="${esc(t.time||"")}"></label>`;
  if(k==="pairs")return `<b class="tnq">Bao nhiêu cặp?</b><div class="tnchips">${(t.fmt==="giai"?[4,6,8,10,12]:[8,12,16,24,32]).map(v=>tnChip("tnset","pairs:"+v,`${v} cặp`,t.pairs===v)).join("")}</div>`;
  if(k==="people")return `<b class="tnq">Tối đa bao nhiêu người?</b><div class="tnchips">${[12,16,20,24,32].map(v=>tnChip("tnset","people:"+v,`${v} người`,t.people===v)).join("")}</div>`;
  if(k==="courts")return `<b class="tnq">Mấy sân?</b><div class="tnchips">${[1,2,3,4,6,8].map(v=>tnChip("tnset","courts:"+v,`${v} sân`,t.courts===v)).join("")}</div>`;
  if(k==="fee")return `<b class="tnq">Lệ phí mỗi người?</b><div class="tnchips">${[0,50,100,150,200,300].map(v=>tnChip("tnset","fee:"+v,v?`${v}k`:"Miễn phí",t.fee===v)).join("")}</div><label class="fld"><span class="lbl">Số khác (k)</span><input type="number" min="0" inputmode="numeric" id="tn-fee" data-draft="tn-fee" value="${t.fee!=null?t.fee:""}"></label>`;
  return "";
}
const ymdIso=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
// Thẻ xác nhận
function tnRow(k,l,v,o={}){return `<button class="tnrow${o.red?" red":""}${o.chg?" chg":""}" data-act="tned" data-v="${k}"><span class="l">${l}</span><b>${v}</b>${o.g?`<em>ĐOÁN</em>`:""}<span aria-hidden="true">›</span></button>`}
function tnCard(D){
  const t=tn,E=tnEst(t),g=k=>t.guess&&t.guess.has(k),chg=k=>t.chg&&t.chg.has(k),at=tnAt(t);
  let h=`<section class="tncard"><button class="tnname" data-act="tned" data-v="name"><b>${esc(tnName(t))}</b><small>${t.name?"":"Tên tự đặt · "}chạm để đổi</small></button>`;
  h+=tnRow("fmt","Thể thức",esc(TN_FMT[t.fmt]||"Chưa chọn"),{red:!t.fmt});
  if(t.nds)h+=t.nds.map((n,i)=>`<div class="tnnd"><b>${esc(n.name)}</b><small>${n.cap?`tổng trình ≤ ${n.cap} · `:""}${n.max} cặp · ${n.koN} bảng · ${n.fee?fmtK(n.fee)+"/người":"miễn phí"}</small><button class="lnk" data-act="tnndx" data-v="${i}" aria-label="Bỏ nội dung">✕</button></div>`).join("")+`<small class="rule">Sửa chi tiết từng nội dung ở ⋯ › Nội dung thi đấu sau khi tạo.</small>`;
  else if(t.fmt==="xoay")h+=tnRow("people","Số người",t.people?`${t.people} người`:"Chưa có",{g:g("people"),red:!t.people});
  else if(t.fmt)h+=tnRow("pairs","Số cặp",t.pairs?`${t.pairs} cặp · ${esc(TN_DT[t.dt||"free"].toLowerCase())}${t.cap?` · tổng trình ≤ ${t.cap}`:""}`:"Chưa có",{red:!t.pairs});
  if(t.fmt==="bang"&&!t.nds)h+=tnRow("koN","Bảng",`${t.koN||1} bảng · lấy ${t.lay||2} cặp mỗi bảng`,{g:g("koN")});
  h+=tnRow("date","Ngày giờ",t.date!=null&&t.time?`${tnDow(at)} ${tnDm(at)} · ${t.time}${t.endBy?` → trước ${t.endBy}`:""}`:"Chưa có",{red:t.date==null||!t.time||(E&&E.late),chg:chg("date")});
  h+=tnRow("courts","Sân",`${t.courts} sân${t.place?` · ${esc(t.place)}`:""}`,{g:g("courts")||g("place"),red:E&&E.late});
  h+=tnRow("target","Luật",`Chạm ${t.target||11}`,{g:g("target")});
  if(!t.nds)h+=tnRow("fee","Lệ phí",t.fee?`${fmtK(t.fee)}/người`:"Miễn phí",{g:g("fee")});
  h+=tnRow("guests","Đăng ký",t.guests?"Mọi người (nhận VĐV ngoài CLB)":"Thành viên CLB",{g:g("guests")});
  h+=`</section>`;
  if(E&&!E.late)h+=`<div class="tnok"><b>✓ Kịp giờ · dự kiến xong ${hm(E.end)}</b><small>${E.m} trận · ${t.courts} sân · khoảng ${dur(E.mins)}</small></div>`;
  if(E&&E.late){h+=`<div class="tnbad"><b>⚠ Không kịp · dự kiến xong ${hm(E.end)}</b><small>${E.m} trận trên ${t.courts} sân cần khoảng ${dur(E.mins)}, giải phải xong trước ${t.endBy}</small></div>`;
    const fx=[];const tryE=p=>{const x=tnEst({...t,...p});return x?x.end:0};
    if((t.target||11)>7)fx.push(["t7",`Chạm 7 thay vì ${t.target||11}`,tryE({target:7})]);
    fx.push(["c2",`Thêm 2 sân (${t.courts+2} sân)`,tryE({courts:t.courts+2})]);
    if(!t.nds&&t.pairs>4)fx.push(["half",`Giảm còn ${Math.max(4,Math.round(t.pairs/2))} cặp`,tryE({pairs:Math.max(4,Math.round(t.pairs/2)),koN:Math.max(1,Math.round((t.koN||2)/2))})]);
    fx.push(["noend","Bỏ giờ kết thúc",0]);
    h+=`<div class="tnfix"><span class="cap">Chạm một cách để sửa</span>${fx.map(([k,l,e])=>`<button data-act="tnfix" data-v="${k}"><b>${l}</b><span>${e?`xong ${hm(e)}${E.by&&e<=E.by?" ✓":""}`:""} ›</span></button>`).join("")}</div>`}
  if(t.fmt==="xoay")h+=`<small class="rule">Giao lưu xoay cặp đánh theo giờ, không cần tính số trận.</small>`;
  if(errs.xf)h+=`<p class="err">${esc(errs.xf)}</p>`;
  return h;
}
function tnEdSheet(){
  if(!tnEd)return "";const t=tn,k=tnEd;
  const stp=(key,l,mn,mx)=>`<div class="gmstp"><span><b>${l}</b></span><span class="stepper big"><button data-act="tnstp" data-k="${key}" data-d="-1" data-mn="${mn}" data-mx="${mx}" aria-label="Bớt">−</button><b class="num">${t[key]||0}</b><button data-act="tnstp" data-k="${key}" data-d="1" data-mn="${mn}" data-mx="${mx}" aria-label="Thêm">＋</button></span></div>`;
  let b="",ttl="";
  if(k==="name"){ttl="Tên giải";b=`<label class="fld"><span class="lbl">Tên giải · tối đa 30 ký tự</span><input id="tn-name" data-draft="tn-name" maxlength="30" value="${esc(val("tn-name",tnName(t)))}"></label>`}
  else if(k==="fmt"){ttl="Thể thức";b=tnAskBody("fmt",t)}
  else if(k==="date"){ttl="Ngày giờ";b=tnAskBody("date",t)+tnAskBody("time",t)+`<label class="fld"><span class="lbl">Phải xong trước (để trống nếu không cần)</span><input type="time" id="tn-end" data-draft="tn-end" value="${esc(t.endBy||"")}"></label>`}
  else if(k==="pairs"){ttl="Số cặp";b=stp("pairs","Tối đa bao nhiêu cặp?",2,64)+`<div class="tnchips">${[8,12,16,20,24,32].map(v=>tnChip("tnset","pairs:"+v,String(v),t.pairs===v)).join("")}</div><span class="gmlb">Nội dung</span><div class="tnchips">${Object.entries(TN_DT).map(([v,l])=>tnChip("tnset","dt:"+v,l,(t.dt||"free")===v)).join("")}</div>`}
  else if(k==="people"){ttl="Số người";b=stp("people","Tối đa bao nhiêu người?",4,80)}
  else if(k==="koN"){ttl="Chia bảng";b=stp("koN","Số bảng",1,16)+`<span class="gmlb">Mỗi bảng lấy mấy cặp vào vòng trong</span><div class="tnchips">${[1,2].map(v=>tnChip("tnset","lay:"+v,`${v} cặp`,(t.lay||2)===v)).join("")}</div>`}
  else if(k==="courts"){ttl="Sân";b=stp("courts","Mấy sân?",1,30)+`<label class="fld"><span class="lbl">Địa điểm</span><input id="tn-place" data-draft="tn-place" maxlength="60" value="${esc(val("tn-place",t.place||""))}"></label>`}
  else if(k==="target"){ttl="Luật điểm";b=`<div class="tnchips">${[7,11,15,21].map(v=>tnChip("tnset","target:"+v,`Chạm ${v}`,(t.target||11)===v)).join("")}</div>`}
  else if(k==="fee"){ttl="Lệ phí";b=tnAskBody("fee",t)}
  else if(k==="guests"){ttl="Ai được đăng ký";b=`<div class="tnchips">${tnChip("tnset","guests:0","Thành viên CLB",!t.guests)}${tnChip("tnset","guests:1","Mọi người",!!t.guests)}</div>`}
  const E=tnEst(t);
  return `<div class="mxdim" data-act="tnedx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="${esc(ttl)}"><span class="grab"></span><b class="mxh">${ttl}</b>${b}${E&&["pairs","koN","courts","target","date"].includes(k)?`<div class="tnhint">${E.m} trận · xong ~${hm(E.end)}${E.late?" · chưa kịp giờ":""}</div>`:""}<button class="ball go wide" data-act="tnedok">✓ Xong</button></div>`;
}
function tnPage(D){
  if(tnPg==="pick"){mxDr({t:"Tạo giải mới",back:"tnx",sub:"Chọn cách tạo",x:true});
    const seen=new Set(),L=tnLast().filter(x=>x.at&&!x.series&&!seen.has(xName(x))&&seen.add(xName(x))).concat(tnLast().filter(x=>x.at&&x.series)).filter((x,i,a)=>a.findIndex(y=>xName(y)===xName(x))===i).slice(0,2);
    return tnBig("⚡","Tạo nhanh","Tả giải bằng một câu, hoặc trả lời vài câu bấm chọn. Khoảng 1 phút.","tnpg","txt",true)
      +(L.length?`<section class="tnprev"><span class="cap">Như giải lần trước · 1 chạm</span>${L.map(x=>`<button data-act="tnprev" data-id="${esc(x.id)}"><span class="t"><b>${esc(xName(x))}</b><small>${esc([x.fmt==="giai"?(x.ko?"Chia bảng + KO":"Vòng tròn"):"Xoay cặp",ndL(x).length?`${ndL(x).length} nội dung`:x.max?`${x.fmt==="giai"?Math.round(x.max/2)+" cặp":x.max+" người"}`:"",`${x.courts||2} sân`,x.at?`${tnDow(x.at)} ${tnDm(x.at)}`:""].filter(Boolean).join(" · "))}</small></span><span class="go">Dùng lại ›</span></button>`).join("")}</section>`:"")
      +tnBig("✎","Tạo đầy đủ","Mở form như hiện nay, tự điền từng mục","tnfull",null);
  }
  if(tnPg==="txt"){mxDr({t:"Tạo nhanh",back:"tnback",sub:"Bước 1 · tả giải"});
    const txt=String(val("tn-txt","")),o=txt.trim()?tnFill(tnParse(txt)):null;
    let h=`<label class="fld tntxt"><span class="sr">Tả giải</span><textarea id="tn-txt" data-draft="tn-txt" data-live="1" rows="4" maxlength="400" placeholder="Ví dụ: Chủ nhật 7h, 16 cặp, chia 4 bảng rồi đánh loại trực tiếp, 200k/người">${esc(txt)}</textarea></label>`;
    if(o){const c=[];const ok=(l,k)=>c.push(`<span class="tnk${o.guess.has(k)?" g":""}">${o.guess.has(k)?"≈":"✓"} ${l}</span>`);
      if(o.fmt)ok(TN_FMT[o.fmt],"fmt");if(o.nds)o.nds.forEach(n=>ok(`${n.name} · ${n.max} cặp`,"nd"));if(o.pairs)ok(`${o.pairs} cặp`,"pairs");if(o.people)ok(`${o.people} người`,"people");
      if(o.dt&&o.dt!=="free"&&!o.nds)ok(TN_DT[o.dt],"dt");if(o.koN&&o.fmt==="bang")ok(`${o.koN} bảng · lấy ${o.lay||2}`,"koN");
      if(o.date!=null&&o.time)ok(`${tnDow(tnAt(o))} ${tnDm(tnAt(o))} · ${o.time}`,"date");else if(o.date!=null)ok(`${tnDow(o.date)} ${tnDm(o.date)}`,"date");else if(o.time)ok(o.time,"time");
      if(o.fee!=null&&!o.nds)ok(o.fee?`${o.fee}k/người`:"Miễn phí","fee");if(o.courts)ok(`${o.courts} sân`,"courts");if(o.place)ok(o.place,"place");if(o.endBy)ok(`xong trước ${o.endBy}`,"endBy");
      h+=`<section class="tnseen"><span class="cap">App đã hiểu</span><div>${c.join("")}</div>${[...o.guess].length?`<small>≈ vàng: lấy theo giải gần nhất của CLB, sửa được ở bước xác nhận</small>`:""}</section>`}
    else h+=`<section class="tnmau"><span class="cap">Chạm để dùng câu mẫu</span>${TN_MAU.map(([t,s],i)=>`<button data-act="tnmau" data-v="${i}"><b>${t}</b><small>${esc(s)}</small></button>`).join("")}</section>`;
    h+=`<small class="rule">🎤 Bấm micro trên bàn phím điện thoại để nói thay vì gõ. Không muốn gõ? <button class="lnk" data-act="tnpg" data-v="step">Chọn từng bước ›</button></small>`;
    return h+`<div class="hqcta"><button class="ball go" data-act="tngo">Soạn giải ›</button></div>`;
  }
  if(tnPg==="ask"){const M=tnMiss(tn);if(!M.length){tnPg="card";return tnPage(D)}
    mxDr({t:"Tạo nhanh",back:"tnback",sub:"Bước 2 · hỏi thêm"});
    return `<div class="tnprog">${M.map((_,i)=>`<i class="${i===0?"on":""}"></i>`).join("")}</div><b class="tnleft">Còn ${M.length} câu nữa là xong</b><section class="tnask">${tnAskBody(M[0],tn)}</section>
      <small class="rule">Bỏ qua thì app dùng mặc định hay dùng nhất.</small><div class="hqcta two"><button class="btn-line" data-act="tnskip" data-v="${M[0]}">Bỏ qua</button><button class="ball go" data-act="tnnext" data-v="${M[0]}">Tiếp ›</button></div>`;
  }
  if(tnPg==="step"){const ST=["fmt","date","time",tn&&tn.fmt==="xoay"?"people":"pairs","courts","fee"],k=ST[Math.min(tnStep,ST.length-1)];
    mxDr({t:"Tạo nhanh",back:"tnback",sub:`Câu ${tnStep+1}/${ST.length}`});
    return `<div class="tnprog">${ST.map((_,i)=>`<i class="${i<tnStep?"ok":i===tnStep?"on":""}"></i>`).join("")}</div><section class="tnask">${tnAskBody(k,tn)}</section><div class="hqcta two"><button class="btn-line" data-act="tnstepb">‹</button><button class="ball go" data-act="tnstepn" data-v="${k}">${tnStep>=ST.length-1?"Xem lại ›":"Tiếp ›"}</button></div>`;
  }
  if(tnPg==="card"){mxDr({t:"Xác nhận giải",back:"tnback",sub:tn.from?"Như giải lần trước":"Bước 3 · kiểm tra rồi bấm Tạo"});
    const E=tnEst(tn),bad=tnMiss(tn).length;
    return (tn.from?`<div class="tnfrom">Dựa trên <b>${esc(tn.fromName||"")}</b> · chỉ đổi ngày</div>`:"")+tnCard(D)
      +`<div class="hqcta two"><button class="btn-line" data-act="${tn.from?"tnpg":"tnpg"}" data-v="${tn.from?"pick":"txt"}">${tn.from?"‹ Chọn giải khác":"‹ Sửa câu"}</button>${E&&E.late?`<button class="btn-line" data-act="tnmk" data-v="late">Tạo giải dù không kịp</button>`:`<button class="ball go" data-act="tnmk"${bad?" disabled":""}>✓ Tạo giải</button>`}</div>`+tnEdSheet()
      ;
  }
  tnPg=null;return "";
}

/* ----- Tạo giải: điền form cũ rồi lưu ----- */
async function tnCreate(D){
  const t=tn,fmt=t.fmt;if(!fmt)return;
  xNew=fmt;xEdit=null;xSEdit=null;xQ=false;xClearDraft();
  const set=(k,v)=>{drafts["xf-"+k]=String(v)};
  const pairs=t.nds?t.nds.reduce((a,n)=>a+(+n.max||0),0):t.pairs||0;
  set("name",tnName(t));set("date",ymdIso(t.date));set("time",t.time);set("courts",t.courts||2);set("target",t.target||11);
  if(t.place)set("place",t.place);set("guests",t.guests?"1":"0");set("reg","1");
  if(fmt==="xoay"){set("max",t.people||0);if(t.fee){set("cp","1");set("thu","phi");set("phi",t.fee);set("fee",t.fee)}}
  else{set("max",pairs*2);set("pairReg","pair");drafts["xf-dt"]=t.nds?"free":(t.dt||"free");set("thu","phi");set("cp","1");
    const fee=t.nds?Math.min(...t.nds.map(n=>+n.fee||0)):t.fee||0;set("phi",fee);set("fee",fee)}
  if(fmt==="bang"){const N=Math.max(1,t.koN||(t.nds?2:4));set("koN",N);set("koQ",tnQ2(Math.min(pairs||N*2,N*(t.lay||2))));set("koThird","1");set("koTouched","1");
    for(const X of ["G","K","F"]){set("ko"+X+"t",t.target||11);set("ko"+X+"w","0");set("ko"+X+"c","0");set("ko"+X+"s","1")}}
  await xSave(D,"open");delete drafts["xf-dt"];
  if(errs.xf){xNew=null;render();return}
  if(t.nds&&gmMade){const L=t.nds.map((n,i)=>({k:"n"+(i+1),name:n.name,dt:n.dt||"free",cap:+n.cap||0,max:+n.max||16,koN:+n.koN||4,fee:+n.fee||0,courts:[]}));
    await write(()=>db.collection("sched").doc(gmMade).update({nds:L,ndMax:2}))}
  tnPg=null;tn=null;tnEd=null;for(const k of ["tn-txt","tn-name","tn-date","tn-time","tn-end","tn-fee","tn-place"])delete drafts[k];
  render();
}
// Như giải lần trước: cùng cài đặt, ngày sang tuần gần nhất
function tnFromPrev(X){
  let at=X.at||Date.now();while(at<Date.now())at+=7*864e5;
  const fmt=X.fmt==="giai"?(X.ko?"bang":"giai"):"xoay",d=new Date(at);
  tn={fmt,name:"",date:tnDay0(at),time:`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,courts:+X.courts||2,target:+X.target||11,place:X.place||"",
    guests:!!X.guests,dt:X.dt||"free",fee:X.thu==="phi"?+X.phi||0:+X.fee||0,pairs:fmt!=="xoay"?Math.round((+X.max||0)/2):0,people:fmt==="xoay"?+X.max||0:0,koN:+X.koN||0,lay:X.koN&&X.koQ?Math.max(1,Math.round(+X.koQ/+X.koN)):2,
    nds:ndL(X).length?ndL(X).map(n=>({...n})):null,guess:new Set(),chg:new Set(["date"]),from:X.id,fromName:`${xName(X)} ${X.at?tnDm(X.at):""}`};
}
async function tnAct(act,b){
  const v=b.dataset.v,D=derive();
  if(act==="xnew"){if(!MINI||!canWrite||legacy||!mxDrOn()||b.dataset.full)return false;tnPg="pick";tn=null;tnEd=null;gmMore=false;
    if(route!=="app"||tab!=="dk"||routeX)go("app",{tab:"dk"});else{render();try{scrollTo({top:0})}catch(e){}}return true}
  if(!act.startsWith("tn"))return false;
  const top=()=>{try{scrollTo({top:0})}catch(e){}};
  if(act==="tnx"){tnPg=null;tn=null;tnEd=null;render();return true}
  if(act==="tnfull"){tnPg=null;gsDO=false;gsTO=false;gsPg=null;gsOpt=null;xQ=true;xQs=1;gmSw=false;xNew="pick";xEdit=null;xSEdit=null;xClearDraft();delete errs.xf;render();top();return true}
  if(act==="tnpg"){tnPg=v;if(v==="step"){tn=tn||{guess:new Set(),courts:+cfg().courts||2,target:11,dt:"free"};tnStep=0}if(v==="txt")tn=null;tnEd=null;delete errs.xf;render();top();return true}
  if(act==="tnback"){tnEd=null;delete errs.xf;tnPg=tnPg==="card"||tnPg==="ask"?(tn&&tn.from?"pick":"txt"):tnPg==="step"?"txt":"pick";render();top();return true}
  if(act==="tnmau"){drafts["tn-txt"]=TN_MAU[+v][1];render();return true}
  if(act==="tngo"){const txt=String(val("tn-txt","")).trim();if(!txt){toast("Tả giải bằng một câu, hoặc bấm Chọn từng bước.");return true}
    tn=tnFill(tnParse(txt));tnPg=tnMiss(tn).length?"ask":"card";render();top();return true}
  if(act==="tnprev"){const X=schedById(b.dataset.id);if(!X)return true;tnFromPrev(X);tnPg="card";render();top();return true}
  if(!tn)return true;
  const rd=()=>{const d=val("tn-date",""),t=val("tn-time",""),f=val("tn-fee",""),e=val("tn-end",null),pl=val("tn-place",null),nm=val("tn-name",null);
    if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){const x=new Date(d+"T00:00").getTime();if(Number.isFinite(x)&&x!==tn.date){tn.date=x}}
    if(t&&/^\d{1,2}:\d{2}$/.test(t))tn.time=t.padStart(5,"0");if(f!=="")tn.fee=Math.max(0,+f||0);
    if(e!=null)tn.endBy=/^\d{1,2}:\d{2}$/.test(e)?e.padStart(5,"0"):"";if(pl!=null)tn.place=String(pl).trim().slice(0,60);if(nm!=null){const n=String(nm).trim().slice(0,30);tn.name=n&&n!==tnAutoName(tn)?n:""}
    for(const k of ["tn-date","tn-time","tn-fee","tn-end","tn-place","tn-name"])delete drafts[k]};
  if(act==="tnset"){const i0=String(v).indexOf(":"),k=String(v).slice(0,i0),x=String(v).slice(i0+1),num=["date","pairs","people","courts","fee","target","lay"].includes(k);tn[k]=k==="guests"?x==="1":num?+x:x;
    if(tn.guess)tn.guess.delete(k);if(k==="fmt"&&x==="bang"&&!tn.koN){tn.koN=Math.max(1,Math.round((tn.pairs||16)/4));tn.lay=2}
    if(k==="pairs"&&tn.fmt==="bang"&&tn.guess&&!tn.chgKo){tn.koN=Math.max(1,Math.min(8,Math.round(+x/4)))}
    if(k==="date"&&tn.chg)tn.chg.delete("date");delete drafts["tn-date"];render();return true}
  if(act==="tnstp"){const k=b.dataset.k;tn[k]=Math.max(+b.dataset.mn,Math.min(+b.dataset.mx,(+tn[k]||0)+(+b.dataset.d||0)));if(k==="koN")tn.chgKo=true;if(tn.guess)tn.guess.delete(k);render();return true}
  if(act==="tnnext"||act==="tnskip"){rd();if(act==="tnskip"||tn[v]==null||tn[v]===""){const def={fmt:"bang",date:tnDay0(Date.now())+864e5,time:"19:00",pairs:tn.fmt==="giai"?8:16,people:16};if(tn[v]==null||tn[v]===""||tn[v]===0){tn[v]=def[v];tn.guess.add(v)}
      if(v==="fmt"&&tn.fmt==="bang"&&!tn.koN){tn.koN=4;tn.lay=2}}
    if(v==="pairs"&&tn.fmt==="bang"&&!tn.koN){tn.koN=Math.max(1,Math.round(tn.pairs/4));tn.lay=2}
    tn=tnFill(tn);tnPg=tnMiss(tn).length?"ask":"card";render();top();return true}
  if(act==="tnstepn"){rd();if(tn[v]==null||tn[v]===""){toast("Chọn một đáp án, hoặc bấm Tiếp để dùng mặc định.");const def={fmt:"bang",date:tnDay0(Date.now())+864e5,time:"19:00",pairs:16,people:16,courts:2,fee:0};tn[v]=def[v]}
    if(v==="pairs"&&tn.fmt==="bang"&&!tn.koN){tn.koN=Math.max(1,Math.round(tn.pairs/4));tn.lay=2}
    tnStep++;if(tnStep>=6){tn=tnFill(tn);tnPg="card"}render();top();return true}
  if(act==="tnstepb"){if(tnStep>0)tnStep--;else tnPg="txt";render();top();return true}
  if(act==="tned"){tnEd=v;render();return true}
  if(act==="tnedx"){tnEd=null;for(const k of ["tn-date","tn-time","tn-fee","tn-end","tn-place","tn-name"])delete drafts[k];render();return true}
  if(act==="tnedok"){rd();tnEd=null;render();return true}
  if(act==="tnndx"){tn.nds.splice(+v,1);if(tn.nds.length<2){const n=tn.nds[0];tn.nds=null;if(n){tn.pairs=n.max;tn.dt=n.dt;tn.cap=n.cap;tn.fee=n.fee;tn.koN=n.koN;tn.lay=2}}render();return true}
  if(act==="tnfix"){if(v==="t7")tn.target=7;else if(v==="c2")tn.courts=(tn.courts||1)+2;else if(v==="half"){tn.pairs=Math.max(4,Math.round(tn.pairs/2));tn.koN=Math.max(1,Math.round((tn.koN||2)/2))}else if(v==="noend")tn.endBy="";render();return true}
  if(act==="tnmk"){if(v==="late"&&!armOr("tnlate"))return true;await tnCreate(D);return true}
  return false;
}
