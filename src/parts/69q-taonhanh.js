/* ---------- Tạo giải nhanh (canvas trang ai) ----------
   Bấm ＋ Tạo giải mới (Mini App, quản lý) → 3 cách: Tạo nhanh · Như giải lần trước · Tạo đầy đủ (form cũ).
   Tạo nhanh: tả bằng một câu (app đọc số bằng luật) hoặc chọn từng bước → hỏi thêm bằng chip những gì còn thiếu →
   thẻ xác nhận 4 nhóm (người chơi · giờ và sân · tiền · giải thưởng), nhóm nào thiếu thì chưa tạo được → Tạo giải = điền form cũ rồi lưu.
   AI (máy chủ /api/tao-giai, Gemini → Groq) đọc câu và sửa bằng lời; lỗi hoặc chậm thì dùng phần đọc bằng luật bên dưới. */
let tnPg=null,tn=null,tnEd=null,tnAskI=0,tnStep=0,tnG=null,tnGEdit=false,tnBusy=false;
const TN_FMT={bang:"Chia bảng + knockout",giai:"Vòng tròn theo cặp",xoay:"Giao lưu xoay cặp"};
const TN_DT={free:"Đôi hỗn hợp",MM:"Đôi nam",FF:"Đôi nữ",mix:"Đôi nam nữ"};
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
  // Giờ kết thúc (7h đến 11h30)
  {const m=s.match(/(?:\bden\b|-|–)\s*(\d{1,2})\s*(?:h|gio|:)\s*(\d{2})?/);if(m&&+m[1]<24){let h=+m[1];if(h<12&&/chieu|toi/.test(s))h+=12;o.end=`${String(h).padStart(2,"0")}:${String(+(m[2]||0)).padStart(2,"0")}`;s=s.replace(m[0]," ")}}
  // Giải thưởng: nhất 1 triệu, nhì 500, ba 200k · trích 20% · mỗi người góp 50k · không có giải
  {const amt=(v,u)=>{const x=+String(v).replace(",",".");if(/lit|xi/.test(u||""))return Math.round(x*100);return /trieu|tr|cu|m\b/.test(u||"")||(!u&&x<=20)?Math.round(x*1000):Math.round(x)};
    const P=[["h1",/(?<!chu )\b(?:giai nhat|nhat|vo dich)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|lit|xi|m|k|nghin|ngan)?/],["h2",/(?:giai nhi|nhi|a quan)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|lit|xi|m|k|nghin|ngan)?/],["h3",/(?:giai ba|hang ba|\bba)\s*:?\s*(\d+(?:[.,]\d+)?)\s*(trieu|tr|cu|lit|xi|m|k|nghin|ngan)?/]];
    for(const [k,re] of P){const m=s.match(re);if(m){o[k]=amt(m[1],m[2]);o.gton=true;o.gt="hang";s=s.replace(m[0]," ")}}
    const tr=s.match(/trich\s*(\d+)\s*%?/);if(tr){o.gton=true;o.gt="trich";o.gtv=+tr[1];s=s.replace(tr[0]," ")}
    const gp=s.match(/(?:moi nguoi )?gop (?:them )?(\d+)\s*(k|nghin|ngan)?\s*(?:lam|vao)? ?(?:giai|thuong|quy thuong)/);if(gp){o.gton=true;o.gt="gop";o.gtv=+gp[1];s=s.replace(gp[0]," ")}
    if(/khong (co )?giai|khong (co )?thuong|khong trao giai/.test(s)){o.gton=false}}
  // Cách thu, chuyển khoản
  if(/chia deu/.test(s))o.thu="deu";else if(/(ai )?thua (gop|tra|chiu)/.test(s))o.thu="keo";
  if(/chuyen khoan truoc|ck truoc|bat buoc (chuyen khoan|ck)|tra truoc|dong truoc/.test(s))o.pay="req";else if(/tra (tien )?tai san|thu (tien )?tai san|dong (tien )?tai san|tien mat/.test(s))o.pay="off";else if(/chuyen khoan|\bck\b/.test(s))o.pay="opt";
  if(/theo cap|dang ky cap|di cap/.test(s))o.pairReg="pair";else if(/ghep cap|btc ghep|tu ghep|boc tham ghep/.test(s))o.pairReg="solo";
  if(/nhat nhi (moi bang |cac bang |bang )?(vao|di tiep|len)/.test(s))o.lay=2;else if(/(chi )?nhat (moi )?bang (vao|di tiep|len)/.test(s))o.lay=1;
  if(/khong (danh )?tranh (hang )?(ba|3)|khong tranh hang ba|khong tranh hang 3|dong hang ba/.test(s))o.third=false;else if(/tranh hang ba|tranh hang 3/.test(s))o.third=true;
  if(/chia (\d+ )?bang|vong bang|\d+\s*bang\b|knock|loai truc tiep|danh loai|tu ket|ban ket|chung ket/.test(s))o.fmt="bang";else if(/vong tron/.test(s))o.fmt="giai";else if(/xoay|giao luu|\bsocial\b/.test(s))o.fmt="xoay";else if(/mini ?game/.test(s)){o.fmt="giai"}
  // Nhiều nội dung: mỗi đoạn có "đôi …"
  const seg=s.split(/[;,]|\s+va\s+/).map(x=>x.trim()).filter(x=>/\bdoi (open|nam nu|nam|nu)\b|\bnam nu\b/.test(x));
  const ndOfSeg=x=>{const dt=/nam nu|mix/.test(x)?"mix":/doi nam\b/.test(x)?"MM":/doi nu\b/.test(x)?"FF":"free",cap=(x.match(/\b(\d)[.,](\d)\b/)||[]),pr=x.match(/(\d+)\s*cap\b/),fe=x.match(/(\d+)\s*(?:k|nghin|ngan)\b/);
    const c=cap[0]?+(cap[1]+"."+cap[2]):0;return {dt,cap:c,max:pr?+pr[1]:0,fee:fe?+fe[1]:null,name:`${/open/.test(x)?"Đôi open":TN_DT[dt]}${c?" "+String(c):""}`}};
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
      for(const [re,w] of W)if(re.test(s)){let add=(w-now.getDay()+7)%7;if(!add)o.wd=1;if(/tuan sau|tuan toi/.test(s))add+=add?7:7;o.date=d0+add*864e5;break}}}
  // Giờ bắt đầu
  {const m=s.match(/\b(\d{1,2})\s*(?:h|gio|:)\s*(\d{2})?(?!\d)/);if(m&&+m[1]<24){let h=+m[1];const around=s.slice(Math.max(0,m.index-12),m.index+m[0].length+12);if(h<12&&/chieu|toi/.test(around))h+=12;o.time=`${String(h).padStart(2,"0")}:${String(+(m[2]||0)).padStart(2,"0")}`}}
  {const m=s.match(/(\d+)\s*san\b/);if(m)o.courts=+m[1]}
  {const m=s.match(/cham\s*(\d+)/);if(m)o.target=+m[1]}
  {const m=s.match(/moi bang\s*(?:co\s*)?(\d+)\s*(?:cap|doi)\b/);if(m){o.perG=+m[1];s=s.replace(m[0]," ")}}
  if(!o.nds){const m=s.match(/(\d+)\s*cap\b/);if(m)o.pairs=+m[1]}
  {const m=s.match(/(\d+)\s*(?:nguoi|vdv|van dong vien)\b/);if(m)o.people=+m[1]}
  {const m=s.match(/(\d+)\s*bang\b/);if(m)o.koN=+m[1]}
  {const m=s.match(/lay\s*(\d+)/);if(m)o.lay=+m[1]}
  if(!o.nds){const m=s.match(/(\d+)\s*(lit|xi)\b/);if(m)o.fee=+m[1]*100}
  if(!o.nds&&o.fee==null){const m=s.match(/(\d+)\s*canh\b/);if(m)o.fee=+m[1]}
  if(!o.nds&&o.fee==null){const m=s.match(/(\d+)\s*(?:k|nghin|ngan)\b/)||s.match(/\b(\d{2,3})[.,]?000\s*(?:d|dong|vnd)?\b/);if(m)o.fee=+m[1]}
  if(/mien phi|khong thu/.test(s))o.fee=0;
  if(o.fee!=null&&!o.thu&&o.fee>0)o.thu="phi";
  {const m=s.match(/(?:ngoai clb|vang lai|khach)\D{0,12}(\d+)\s*(?:k|nghin|ngan)/);if(m){o.feeG=+m[1];o.guests=true}}
  if(/thanh vien/.test(s))o.guests=false;else if(/moi nguoi|ngoai clb|tu do/.test(s))o.guests=true;
  {const m=String(txt||"").match(/"([^"]{3,40})"|“([^”]{3,40})”/);if(m)o.name=(m[1]||m[2]).trim()}
  return o;
}
// Đoán phần còn thiếu theo giải gần nhất cùng kiểu của CLB (đánh dấu ĐOÁN)
function tnFill(o){
  const L=tnLast(),last=L.find(x=>x.fmt==="giai"&&(o.fmt==="bang"?x.ko:o.fmt==="giai"?!x.ko:false))||L.find(x=>o.fmt==="xoay"?x.fmt==="xoay":true)||{},c=cfg(),g=o.guess instanceof Set?o.guess:new Set();
  const t={...o,guess:g,ok:o.ok instanceof Set?o.ok:new Set()};
  const take=(k,v)=>{if(t[k]==null&&v!=null&&v!==""){t[k]=v;g.add(k)}};
  take("courts",+last.courts||+c.courts||2);if(+last.courts)t.lastC=1;take("target",+last.target||+c.target||11);take("place",last.place||"");if(last.end)take("end",last.end);
  if(!t.nds){if(t.fmt&&t.fmt!=="xoay")t.thu="phi";else take("thu",last.thu||null);
    take("fee",last.thu==="phi"?+last.phi||0:last.fee!=null?+last.fee||0:null)}
  take("pay",last.pay||null);take("guests",last.guests!=null?!!last.guests:null);if(t.guests&&last.feeG!==""&&last.feeG!=null)take("feeG",+last.feeG);
  if(t.gton==null&&last.gton!=null){t.gton=!!last.gton;g.add("gton");if(t.gton){take("gt",last.gt||"hang");const h=last.hang||[];take("h1",+h[0]||null);take("h2",+h[1]||null);take("h3",+h[2]||null);take("gtv",last.gtv!=null?+last.gtv:null);take("trao",last.trao||null)}}
  if(t.gton&&!t.gt)t.gt="hang";
  if(t.fmt&&t.fmt!=="xoay"){take("pairReg",last.pairReg||"pair");if(t.third==null)t.third=true}
  if(t.fmt==="bang"&&!t.nds){if(t.pairs&&!t.koN){t.koN=Math.max(1,Math.min(8,Math.round(t.pairs/4)));g.add("koN")}if(t.koN&&!t.lay)t.lay=2}
  if(t.fmt==="xoay"&&!t.people&&last.max){t.people=+last.max;g.add("people")}
  if(t.nds)t.nds=t.nds.map(n=>({...n,max:n.max||16,fee:n.fee!=null?n.fee:t.fee||0,koN:n.koN||Math.max(1,Math.min(8,Math.round((n.max||16)/4)))}));
  if(!t.dt)t.dt="free";
  return t;
}
/* ----- 4 nhóm bắt buộc ----- */
const TN_G=[["nguoi","Thể thức và người chơi"],["gio","Thời gian và sân"],["tien","Tiền"],["thuong","Giải thưởng"]];
const TN_GK={nguoi:["fmt","people","pairs","koN","lay","dt","cap","pairReg","guests","third"],gio:["date","time","end","endBy","courts","place","target"],tien:["fee","thu","pay","feeG"],thuong:["gton","gt","h1","h2","h3","gtv","trao"]};
// Mục bắt buộc còn thiếu của một nhóm
function tnNeed(t,g){const L=[],no=k=>t[k]==null||t[k]==="";
  if(g==="nguoi"){if(!t.fmt)L.push("fmt");else if(t.nds){if(!t.nds.length)L.push("nds")}else if(t.fmt==="xoay"){if(!t.people)L.push("people")}else{if(!t.pairs)L.push("pairs");if(t.fmt==="bang"&&!t.koN)L.push("koN")}}
  if(g==="gio"){if(t.date==null)L.push("date");if(!t.time)L.push("time");if(!t.courts)L.push("courts")}
  // Xoay cặp chia đều tiền sân (hoặc kiểu cũ ai thua góp) không có lệ phí cố định: không bắt nhập lệ phí
  if(g==="tien"){if(!t.nds&&no("fee")&&!(t.fmt==="xoay"&&(t.thu==="deu"||t.thu==="keo")))L.push("fee");if(t.fmt==="xoay"&&no("thu"))L.push("thu");if(no("pay"))L.push("pay")}
  if(g==="thuong"){if(t.gton==null&&t.fmt!=="xoay")L.push("gton");else if(t.gton){if((t.gt||"hang")==="hang"){if(!t.h1)L.push("h1")}else if(no("gtv"))L.push("gtv")}}
  return L}
function tnGSt(t,g){if(tnNeed(t,g).length)return "no";if(!t.ok.has(g)&&TN_GK[g].some(k=>t.guess.has(k)))return "chk";return "ok"}
const tnNextG=t=>(TN_G.find(([g])=>tnGSt(t,g)==="no")||[])[0]||null;
const TN_ST={ok:["Đủ","ok"],chk:["Kiểm tra","g"],no:["Thiếu","no"]};
// Ước lượng số trận và giờ xong
function tnCount(fmt,n,N,q,third){if(fmt==="giai")return n*(n-1)/2;if(fmt!=="bang")return 0;N=Math.max(1,Math.min(N||1,Math.floor(n/2)||1));let m=0;for(let i=0;i<N;i++){const k=Math.floor(n/N)+(i<n%N?1:0);m+=k*(k-1)/2}const Q=Math.min(q||N*2,tnQ2(n));return m+Q-1+(Q>=4&&third!==false?1:0)}
function tnEst(t){if(!t||t.fmt==="xoay"||t.date==null||!t.time)return null;
  const sl=r=>18*(r.to<=7?0.65:r.to>=21?1.8:r.to>=15?1.35:1)*(r.w2?1.1:1)*(r.sets>=5?3.6:r.sets>=3?2.3:1),fmt=t.nds?"bang":t.fmt;
  const P=t.nds?t.nds.map(n=>({n:+n.max||16,N:+n.koN||1,q:(+n.koN||1)*2})):[{n:+t.pairs||0,N:t.koN,q:(t.koN||1)*(t.lay||2)}];let m=0,w=0;
  for(const p of P){const all=tnCount(fmt,p.n,p.N,p.q,t.third);if(!all)continue;m+=all;
    if(fmt!=="bang"){w+=all*sl(tnRu(t,"G"));continue}
    const Q=Math.min(p.q,tnQ2(p.n)),ko=Q-1+(Q>=4&&t.third!==false?1:0);w+=(all-ko)*sl(tnRu(t,"G"))+Math.max(0,ko-1)*sl(tnRu(t,"K"))+sl(tnRu(t,"F"))}
  if(!m)return null;
  const mins=Math.ceil(w/Math.max(1,t.courts||1)),at=tnAt(t),end=at+mins*6e4;
  const lim=t.endBy||"",by=lim?(()=>{const [h,mi]=lim.split(":").map(Number),d=new Date(at);d.setHours(h,mi,0,0);return d.getTime()})():0;
  return {m,mins:Math.round(mins),end,by,late:by&&end>by};
}
const tnRu=(t,X)=>typeof tcRu==="function"?tcRu(t,X):{to:+t.target||11,w2:false,cap:0,sets:1};
const tnAt=t=>{const [h,m]=String(t.time||"19:00").split(":").map(Number);const d=new Date(t.date??Date.now());d.setHours(h||0,m||0,0,0);return d.getTime()};
const tnDow=t=>["CN","T2","T3","T4","T5","T6","T7"][new Date(t).getDay()];
const tnDm=t=>{const d=new Date(t);return `${d.getDate()}/${d.getMonth()+1}`};
function tnAutoName(t){const at=tnAt(t),h=new Date(at).getHours(),day=`${tnDow(at)} ${tnDm(at)}`;
  // Tên theo loại + buổi, không lặp ngày (ngày đã hiện riêng): "Social tối thứ 7", "Mini game sáng chủ nhật", "Giải đôi nam nữ"
  const bu=h<11?"sáng":h<17?"chiều":"tối",dw=String(dowVN(at)).toLowerCase();
  if(t.fmt==="xoay")return `Social ${bu} ${dw}`;
  if(t.loai==="m"||(t.fmt==="giai"&&t.pick==="Mini game"))return `Mini game ${bu} ${dw}`;
  if(t.nds)return `Giải ${t.nds.length} nội dung`;
  return `Giải ${t.dt&&t.dt!=="free"?TN_DT[t.dt].toLowerCase():"đôi"}${t.cap?" "+t.cap:""}`.slice(0,30)}
const tnName=t=>t.name||tnAutoName(t);
const ymdIso=t=>{const d=new Date(t);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const tnK=v=>v>=1000&&v%100===0?`${String(v/1000).replace(".",",")} triệu`:fmtK(v);

/* ----- AI: đọc câu, sửa bằng lời (máy chủ /api/tao-giai). Lỗi hoặc quá 9 giây thì trả null ----- */
const TN_KEYS=["san","rG","rK","rF","fmt","name","date","time","end","endBy","courts","place","target","pairs","people","koN","lay","third","dt","cap","pairReg","guests","feeG","fee","thu","pay","gton","gt","h1","h2","h3","gtv","trao","nds"];
function tnClean(a){
  if(!a||typeof a!=="object")return {};const o={},n=(v,mn,mx)=>{const x=+v;return Number.isFinite(x)&&x>=mn&&x<=mx?x:undefined},en=(v,L)=>L.includes(v)?v:undefined;
  const hm2=v=>/^\d{1,2}:\d{2}$/.test(String(v||""))?String(v).padStart(5,"0"):undefined;
  const set=(k,v)=>{if(v!==undefined&&v!==null&&v!=="")o[k]=v};
  set("fmt",en(a.fmt,["bang","giai","xoay"]));if(typeof a.name==="string")set("name",a.name.trim().slice(0,30));
  if(typeof a.date==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(a.date)){const t=new Date(a.date+"T00:00").getTime();if(Number.isFinite(t))o.date=t}
  set("time",hm2(a.time));set("end",hm2(a.end));set("endBy",hm2(a.endBy));
  set("courts",n(a.courts,1,30));if(typeof a.place==="string")set("place",a.place.trim().slice(0,60));set("target",n(a.target,5,31));
  set("pairs",n(a.pairs,2,64));set("people",n(a.people,4,120));set("koN",n(a.koN,1,16));set("lay",n(a.lay,1,4));if(typeof a.third==="boolean")o.third=a.third;
  set("dt",en(a.dt,["free","MM","FF","mix"]));set("cap",n(a.cap,1,16));set("pairReg",en(a.pairReg,["pair","solo"]));if(typeof a.guests==="boolean")o.guests=a.guests;
  set("feeG",n(a.feeG,0,10000));set("fee",n(a.fee,0,10000));if(a.san===0||n(a.san,1,100000))o.san=a.san===0?0:n(a.san,1,100000);set("thu",en(a.thu,["phi","deu"]));set("pay",en(a.pay,["off","opt","req"]));
  if(typeof a.gton==="boolean")o.gton=a.gton;set("gt",en(a.gt,["hang","trich","codinh","gop"]));for(const k of ["h1","h2","h3"])set(k,n(a[k],0,100000));set("gtv",n(a.gtv,0,100000));set("trao",en(a.trao,["namnu","top3"]));
  for(const X of ["rG","rK","rF"]){const r=a[X];if(r&&typeof r==="object"){const to=n(r.to,5,31);if(to){const w2=r.w2===true;let cap=w2?n(r.cap,0,51)||0:0;if(cap&&cap<=to)cap=to+2;const sets=[1,3,5].includes(+r.sets)?+r.sets:1;o[X]={to,w2,cap,sets:X!=="rF"&&sets===5?3:sets}}}}
  if(Array.isArray(a.nds)&&a.nds.length>=2)o.nds=a.nds.slice(0,8).map(x=>({dt:en(x&&x.dt,["free","MM","FF","mix"])||"free",cap:n(x&&x.cap,1,16)||0,max:n(x&&x.max,2,64)||16,fee:n(x&&x.fee,0,10000),koN:n(x&&x.koN,1,16),name:String((x&&x.name)||"").trim().slice(0,30)})).map(x=>({...x,name:x.name||`${TN_DT[x.dt]}${x.cap?" "+x.cap:""}`}));
  return o;
}
function tnCtx(){const L=tnLast(),last=L[0]||{},n=new Date();
  return {today:ymdIso(n),dow:["Chủ nhật","Thứ 2","Thứ 3","Thứ 4","Thứ 5","Thứ 6","Thứ 7"][n.getDay()],now:`${String(n.getHours()).padStart(2,"0")}:${String(n.getMinutes()).padStart(2,"0")}`,
    club:CLUB?.name||"",last:last.fmt?{fmt:last.fmt==="giai"?(last.ko?"bang":"giai"):"xoay",courts:+last.courts||0,place:last.place||"",fee:last.thu==="phi"?+last.phi||0:+last.fee||0,time:last.at?hm(last.at):""}:null}}
const tnCur=t=>{const o={};for(const k of TN_KEYS)if(t[k]!=null&&t[k]!=="")o[k]=k==="date"?ymdIso(t[k]):t[k];return o};
// tnAIM: lần gọi gần nhất {loai: tao|hoi|chuaco|ngoai|vonghia, tt: thể thức chưa có, hoi: thuật ngữ, lim: hết lượt}
let tnAIM={};
async function tnAI(txt,cur){tnAIM={};
  if(typeof fetch!=="function"||typeof window==="undefined"||window.__PBTEST&&!window.__PBAI)return null;
  const ab=typeof AbortController!=="undefined"?new AbortController():null,tm=setTimeout(()=>ab&&ab.abort(),9000);
  try{const r=await fetch(API+"/api/tao-giai",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({cid:CID,txt:String(txt).slice(0,400),cur:cur||null,ctx:tnCtx()}),...(ab?{signal:ab.signal}:{})});
    clearTimeout(tm);if(r.status===429){tnAIM={lim:1};return null}if(!r.ok)return null;const j=await r.json();if(!j||!j.ok)return null;
    const m=j.t||{};tnAIM={loai:String(m.loai||""),tt:String(m.tt||""),hoi:String(m.hoi||"")};return tnClean(m)}
  catch(e){clearTimeout(tm);return null}
}

/* ----- Các màn ----- */
const tnBig=(ic,t,s,act,v,on)=>`<button class="tnbig${on?" on":""}" data-act="${act}"${v!=null?` data-v="${esc(v)}"`:""}><i>${ic}</i><span class="t"><b>${t}</b><small>${s}</small></span><span aria-hidden="true">›</span></button>`;
const tnChip=(act,v,l,on,k)=>`<button class="tnchip" data-act="${act}" data-v="${esc(v)}"${k?` data-k="${k}"`:""} aria-pressed="${!!on}">${l}</button>`;
const tnCh=(k,L,cur)=>`<div class="tnchips">${L.map(([v,l])=>tnChip("tnset",`${k}:${v}`,l,String(cur)===String(v))).join("")}</div>`;
const tnIn=(k,l,v,a="")=>`<label class="fld"><span class="lbl">${l}</span><input id="tn-${k}" data-draft="tn-${k}" value="${esc(val("tn-"+k,v==null?"":String(v)))}" ${a}></label>`;
const tnLb=(t,miss)=>`<span class="tnlb${miss?" miss":""}">${t}${miss?" · cần chọn":""}</span>`;
function tnDateOpts(){const d0=tnDay0(Date.now()),sat=d0+((6-new Date().getDay()+7)%7||7)*864e5,sun=d0+((7-new Date().getDay())%7||7)*864e5;
  return [[d0,"Hôm nay"],[d0+864e5,"Mai"],[sat,`T7 ${tnDm(sat)}`],[sun,`CN ${tnDm(sun)}`]]}
// Nội dung của một nhóm (bấm chip, ô số)
function tnGBody(g,t){
  const N=new Set(tnNeed(t,g));let h="";
  if(g==="nguoi"){
    h+=tnLb("Thể thức",N.has("fmt"))+tnCh("fmt",[["bang","Chia bảng + KO"],["giai","Vòng tròn"],["xoay","Xoay cặp"]],t.fmt);
    if(t.nds)h+=tnLb("Nội dung")+t.nds.map((n,i)=>`<div class="tnnd"><b>${esc(n.name)}</b><small>${n.cap?`tổng trình ≤ ${n.cap} · `:""}${n.max} cặp · ${n.koN} bảng · ${n.fee?fmtK(n.fee)+"/người":"miễn phí"}</small><button class="lnk" data-act="tnndx" data-v="${i}" aria-label="Bỏ nội dung">✕</button></div>`).join("");
    else if(t.fmt==="xoay")h+=tnLb("Tối đa bao nhiêu người",N.has("people"))+tnCh("people",[12,16,20,24,32].map(v=>[v,`${v} người`]),t.people)+tnIn("people","Số khác",t.people,'type="number" min="4" max="120" inputmode="numeric"');
    else if(t.fmt){h+=tnLb("Bao nhiêu cặp",N.has("pairs"))+tnCh("pairs",(t.fmt==="giai"?[4,6,8,10,12]:[8,12,16,24,32]).map(v=>[v,`${v} cặp`]),t.pairs)+tnIn("pairs","Số khác",t.pairs,'type="number" min="2" max="64" inputmode="numeric"');
      if(t.fmt==="bang")h+=tnLb("Số bảng",N.has("koN"))+tnCh("koN",[1,2,3,4,6,8].map(v=>[v,`${v} bảng`]),t.koN)+tnLb("Mỗi bảng lấy mấy cặp vào vòng trong")+tnCh("lay",[[1,"1 cặp"],[2,"2 cặp"]],t.lay||2)+tnLb("Tranh hạng ba")+tnCh("third",[["1","Có"],["0","Không · đồng hạng ba"]],t.third===false?"0":"1");
      h+=tnLb("Nội dung")+tnCh("dt",Object.entries(TN_DT),t.dt||"free")+tnLb("Cách đăng ký")+tnCh("pairReg",[["pair","Theo cặp"],["solo","Từng người, BTC ghép"]],t.pairReg||"pair")}
  }
  if(g==="gio"){
    h+=tnLb("Ngày",N.has("date"))+tnCh("date",tnDateOpts(),t.date)+tnIn("date","Ngày khác",t.date!=null?ymdIso(t.date):"",'type="date"');
    h+=tnLb("Giờ bắt đầu",N.has("time"))+tnCh("time",["06:30","07:00","08:00","17:00","18:30","19:00"].map(v=>[v,v]),t.time)+`<div class="tn2">${tnIn("time","Giờ khác",t.time||"",'type="time"')}${tnIn("end","Giờ kết thúc",t.end||"",'type="time"')}</div>`;
    h+=tnLb("Số sân",N.has("courts"))+tnCh("courts",[1,2,3,4,6,8].map(v=>[v,`${v} sân`]),t.courts)+tnIn("place","Nơi đánh",t.place||"",'maxlength="60" placeholder="Sân Kỳ Hòa, Q10"');
    h+=tnLb("Luật điểm")+tnCh("target",[[7,"Chạm 7"],[11,"Chạm 11"],[15,"Chạm 15"],[21,"Chạm 21"]],t.target||11);
    if(t.fmt!=="xoay")h+=tnIn("endBy","Phải xong trước (để trống nếu không cần)",t.endBy||"",'type="time"');
  }
  if(g==="tien"){
    if(t.fmt==="xoay")h+=tnLb("Cách thu",N.has("thu"))+tnCh("thu",[["phi","Lệ phí cố định"],["deu","Chia đều tiền sân"]],t.thu);
    if(t.nds)h+=`<small class="rule">Lệ phí theo từng nội dung: ${t.nds.map(n=>`${esc(n.name)} ${n.fee?fmtK(n.fee):"miễn phí"}`).join(" · ")}</small>`;
    else if(t.thu!=="keo"&&t.thu!=="deu"||t.fmt!=="xoay")h+=tnLb("Lệ phí mỗi người",N.has("fee"))+tnCh("fee",[[0,"Miễn phí"],[50,"50k"],[100,"100k"],[150,"150k"],[200,"200k"],[300,"300k"]],t.fee)+tnIn("fee","Số khác (k)",t.fee,'type="number" min="0" inputmode="numeric"');
    h+=tnLb("Chuyển khoản khi đăng ký",N.has("pay"))+tnCh("pay",[["off","Không, trả tại sân"],["opt","Tuỳ chọn"],["req","Bắt buộc mới giữ chỗ"]],t.pay);
  }
  if(g==="thuong"){
    h+=tnLb("Có giải thưởng không",N.has("gton"))+tnCh("gton",[["1","Có"],["0","Không"]],t.gton==null?"":t.gton?"1":"0");
    if(t.gton){const gt=t.gt||"hang";h+=tnLb("Quỹ thưởng lấy từ đâu")+tnCh("gt",(t.fmt==="xoay"?[["hang","Mức cố định"],["trich","Trích % lệ phí"],["codinh","CLB bỏ ra"],["gop","Mỗi người góp"]]:[["hang","Mức cố định"],["trich","Trích % lệ phí"],["gop","Mỗi người góp"]]),gt);
      if(gt==="hang")h+=`${tnLb("Mức thưởng (k)",N.has("h1"))}<div class="tn3">${tnIn("h1","Nhất",t.h1,'type="number" min="0" inputmode="numeric"')}${tnIn("h2","Nhì",t.h2,'type="number" min="0" inputmode="numeric"')}${tnIn("h3","Ba",t.h3,'type="number" min="0" inputmode="numeric"')}</div>`;
      else h+=tnIn("gtv",gt==="trich"?"Trích bao nhiêu % lệ phí":gt==="gop"?"Mỗi người góp thêm (k)":"CLB bỏ ra (k)",t.gtv,'type="number" min="0" inputmode="numeric"');
      if(t.fmt==="xoay")h+=tnLb("Trao cho")+tnCh("trao",[["namnu","Số 1 nam và nữ"],["top3","Hạng 1, 2, 3"]],t.trao||"namnu")}
  }
  return h;
}
// Dòng tóm tắt của một nhóm trên thẻ xác nhận
function tnGRows(g,t){const R=(l,v,k)=>`<div class="tnr"><span>${l}</span><b>${v}</b>${k&&[].concat(k).some(x=>t.guess.has(x))&&!t.ok.has(g)?`<em>ĐOÁN</em>`:""}</div>`,E=tnEst(t),at=tnAt(t);
  if(g==="nguoi")return R("Thể thức",esc(TN_FMT[t.fmt]||"—"))+(t.nds?t.nds.map(n=>R("Nội dung",`${esc(n.name)} · ${n.max} cặp`)).join(""):t.fmt==="xoay"?R("Số người",t.people?`${t.people} người`:"—","people"):R("Số cặp",t.pairs?`${t.pairs} cặp · ${esc(TN_DT[t.dt||"free"].toLowerCase())}`:"—","pairs")+(t.fmt==="bang"?R("Bảng",`${t.koN||"—"} bảng · lấy ${t.lay||2}${t.third===false?"":" · tranh hạng 3"}`,"koN"):"")+R("Đăng ký",t.pairReg==="solo"?"Từng người, BTC ghép":"Theo cặp","pairReg"));
  if(g==="gio")return R("Ngày giờ",t.date!=null&&t.time?`${tnDow(at)} ${tnDm(at)} · ${t.time}${t.end?`–${t.end}`:""}`:"—",["date","time"])+R("Sân",`${t.courts||"—"} sân${t.place?` · ${esc(t.place)}`:""}`,["courts","place"])+R("Luật",`Chạm ${t.target||11}`,"target")+(E?R("Dự kiến",`${E.m} trận · xong ~${hm(E.end)}`):"");
  if(g==="tien")return (t.fmt==="xoay"?R("Cách thu",{phi:"Lệ phí cố định",deu:"Chia đều tiền sân",keo:"Ai thua góp"}[t.thu]||"—","thu"):"")+(t.nds?R("Lệ phí","Theo từng nội dung"):(t.thu==="keo"||t.thu==="deu")&&t.fmt==="xoay"?"":R("Lệ phí",t.fee==null?"—":t.fee?`${fmtK(t.fee)}/người`:"Miễn phí","fee"))+R("Chuyển khoản",{off:"Không, trả tại sân",opt:"Tuỳ chọn",req:"Bắt buộc mới giữ chỗ"}[t.pay]||"—","pay")+(t.guests&&t.feeG!=null&&t.feeG!==""?R("VĐV ngoài",`${fmtK(+t.feeG)}`,"feeG"):"");
  if(g==="thuong")return t.gton==null?R("Giải thưởng","—"):!t.gton?R("Giải thưởng","Không","gton"):(t.gt||"hang")==="hang"?R("Mức thưởng",[t.h1&&`Nhất ${tnK(+t.h1)}`,t.h2&&`Nhì ${tnK(+t.h2)}`,t.h3&&`Ba ${tnK(+t.h3)}`].filter(Boolean).join(" · ")||"—",["h1","h2","h3"]):R("Quỹ thưởng",t.gt==="trich"?`Trích ${t.gtv??"—"}% lệ phí`:t.gt==="gop"?`Mỗi người góp ${t.gtv!=null?fmtK(+t.gtv):"—"}`:`CLB bỏ ra ${t.gtv!=null?fmtK(+t.gtv):"—"}`,["gt","gtv"]);
  return "";
}
function tnCard(D){
  const t=tn,E=tnEst(t);
  let h=`<section class="tncard"><button class="tnname" data-act="tned" data-v="name"><b>${esc(tnName(t))}</b><small>${t.name?"":"Tên tự đặt · "}chạm để đổi</small></button></section>`;
  for(const [g,l] of TN_G){const st=TN_ST[tnGSt(t,g)];h+=`<section class="tngc ${st[1]}"><button class="tngh" data-act="tngrp" data-v="${g}"><b>${l}</b><span class="tnst ${st[1]}">${st[0]}</span><span class="ed">Sửa ›</span></button>${tnGRows(g,t)}</section>`}
  if(E&&E.late){h+=`<div class="tnbad"><b>⚠ Không kịp · dự kiến xong ${hm(E.end)}</b><small>${E.m} trận trên ${t.courts} sân cần khoảng ${dur(E.mins)}, giải phải xong trước ${t.endBy}</small></div>`;
    const fx=[],tryE=p=>{const x=tnEst({...t,...p});return x?x.end:0};
    if((t.target||11)>7)fx.push(["t7",`Chạm 7 thay vì ${t.target||11}`,tryE({target:7})]);
    fx.push(["c2",`Thêm 2 sân (${(t.courts||1)+2} sân)`,tryE({courts:(t.courts||1)+2})]);
    if(!t.nds&&t.pairs>4)fx.push(["half",`Giảm còn ${Math.max(4,Math.round(t.pairs/2))} cặp`,tryE({pairs:Math.max(4,Math.round(t.pairs/2)),koN:Math.max(1,Math.round((t.koN||2)/2))})]);
    fx.push(["noend","Bỏ giờ phải xong",0]);
    h+=`<div class="tnfix"><span class="cap">Chạm một cách để sửa</span>${fx.map(([k,l,e])=>`<button data-act="tnfix" data-v="${k}"><b>${l}</b><span>${e?`xong ${hm(e)}${E.by&&e<=E.by?" ✓":""}`:""} ›</span></button>`).join("")}</div>`}
  else if(E)h+=`<div class="tnok"><b>✓ Kịp giờ · dự kiến xong ${hm(E.end)}</b><small>${E.m} trận · ${t.courts} sân · khoảng ${dur(E.mins)}</small></div>`;
  h+=`<div class="tnsay"><input id="tn-say" data-draft="tn-say" maxlength="200" placeholder="Muốn đổi gì? Ví dụ: thêm 2 sân, giải ba 200k" value="${esc(val("tn-say",""))}"><button class="ball go" data-act="tnsay"${tnBusy?" disabled":""}>${tnBusy?"…":"Đổi"}</button></div>`;
  if(errs.xf)h+=`<p class="err">${esc(errs.xf)}</p>`;
  return h;
}
function tnEdSheet(){
  if(tnEd!=="name")return "";
  return `<div class="mxdim" data-act="tnedx"></div><div class="mxsheet dhsh gmsh" role="dialog" aria-label="Tên giải"><span class="grab"></span><b class="mxh">Tên giải</b>${tnIn("name","Tên giải · tối đa 30 ký tự",tnName(tn),'maxlength="30"')}<button class="ball go wide" data-act="tnedok">✓ Xong</button></div>`;
}
// Trang đầu Tạo giải mới (canvas trang tg): ô tả giải bằng AI + các thể thức đang có + như giải lần trước + form đầy đủ
// 3 loại lịch đánh (canvas L04): [thể thức, biểu tượng, tên, mô tả, hợp với, loại]
const TN_FC=[["xoay","🔀","Social","Đến chơi giao lưu, đăng ký từng người, app ghép cặp xoay vòng cân trình","Hợp buổi tối, nhóm bạn, chơi vui đều tay","s"],
  ["giai","🎯","Mini game","Giải nhỏ cho vui: vài cặp gặp nhau vòng tròn, 1–2 tiếng, quà nhỏ nếu có","Hợp cuối tuần · 4–10 cặp · không nặng thắng thua","m"],
  ["bang","🏆","Giải","Thi đấu chia bảng rồi đánh loại tới chung kết, có giải thưởng, có thứ hạng","Hợp 8–32 cặp · nhiều nội dung","g"]];
// 7 mục app nhận ra khi đang gõ: [tên, có chưa, chữ]
function tnCheck(o){const g=k=>o.guess.has(k),at=tnAt(o);
  return [["Thể thức",!!o.fmt,o.fmt?TN_FMT[o.fmt]+(o.fmt==="bang"&&o.koN&&!g("koN")?` · ${o.koN} bảng`:""):"nói “chia 4 bảng”, “vòng tròn” hoặc “xoay cặp”"],
    [o.fmt==="xoay"?"Số người":"Số cặp",!!(o.nds||o.pairs||o.people),o.nds?o.nds.map(n=>`${n.name} ${n.max} cặp`).join(" · "):o.pairs?`${o.pairs} cặp`:o.people?`${o.people} người`:"ví dụ: 16 cặp"],
    ["Ngày giờ",o.date!=null&&!!o.time,o.date!=null&&o.time?`${tnDow(at)} ${tnDm(at)} · ${o.time}`:o.date!=null?`${tnDow(o.date)} ${tnDm(o.date)} · thiếu giờ`:o.time?`${o.time} · thiếu ngày`:"ví dụ: CN 7h"],
    ["Sân",!!o.courts,o.courts?`${o.courts} sân${g("courts")?" · theo giải trước":""}`:"ví dụ: 4 sân"],
    ["Lệ phí",o.nds||o.fee!=null&&o.fee!==""&&!g("fee"),o.nds?"theo từng nội dung":o.fee!=null&&o.fee!==""&&!g("fee")?(+o.fee?`${fmtK(+o.fee)}/người`:"Miễn phí"):"ví dụ: 200k/người"],
    ["Chuyển khoản",!!o.pay&&!g("pay"),o.pay&&!g("pay")?{off:"trả tại sân",opt:"tuỳ chọn",req:"chuyển khoản trước"}[o.pay]:"nói thêm, hoặc app hỏi sau"],
    ["Giải thưởng",o.gton!=null&&!g("gton"),o.gton===false&&!g("gton")?"Không":o.h1&&!g("h1")?[`Nhất ${tnK(+o.h1)}`,o.h2&&`Nhì ${tnK(+o.h2)}`].filter(Boolean).join(" · "):o.gton&&!g("gton")?"Có":"ví dụ: nhất 1 triệu nhì 500"]]}
const tnCkRow=([l,on,v],busy)=>`<div class="tgck${on?" on":""}"><i>${on?"✓":"•"}</i><b>${l}</b><span>${busy&&!on?"đang đọc…":esc(v)}</span></div>`;
function tnPage(D){
  if(tnPg==="txt")tnPg="pick";
  if(tnPg==="help"){mxDr({t:"Cách dùng",back:"tnpg",v:"pick",sub:"Tạo giải trong 1 phút"});
    return `<section class="tgbox"><span class="cap">3 bước</span><div class="tgstep"><i>1</i><span><b>Gõ một câu, hoặc chọn thể thức</b><small>Càng đủ ý càng ít phải hỏi lại. Không cần đúng thứ tự. Bấm micro trên bàn phím để nói thay vì gõ.</small></span></div><div class="tgstep"><i>2</i><span><b>Trả lời vài câu bằng nút bấm</b><small>Mục nào chưa nói, app hỏi từng câu. Chưa biết chọn gì thì bấm “Để app chọn”.</small></span></div><div class="tgstep"><i>3</i><span><b>Kiểm tra rồi bấm Tạo</b><small>Bấm dòng nào trên thẻ tóm tắt thì app hỏi lại dòng đó.</small></span></div></section>
      <section class="tgbox"><span class="cap">Nên nói những gì</span><div class="tnchips">${["Thể thức","Số cặp / người","Ngày giờ","Số sân","Lệ phí","Chuyển khoản","Giải thưởng"].map(x=>`<span class="tnk">${x}</span>`).join("")}</div></section>
      <section class="tgbox"><span class="cap">App hiểu cả cách nói quen thuộc</span><small>“150 cành”, “2 lít” · “nhất 1 củ” · “CN tuần sau” · “6 rưỡi tối” · “đôi nam 5.5” · “ck trước mới giữ chỗ”</small></section>
      <div class="hqcta"><button class="ball go" data-act="tnpg" data-v="pick">Đã hiểu, bắt đầu ›</button></div>`}
  if(tnPg==="pick"){const txt=String(val("tn-txt","")),o=txt.trim()?tnFill(tnParse(txt)):null;
    mxDr({t:"Tạo lịch đánh",back:"tnx",sub:tnBusy?"AI đang soạn…":o?"Đang tả lịch đánh":"Chọn cách tạo",x:true});
    let h=`<div class="tghead"><span>✦ TẠO NHANH BẰNG AI</span><button class="lnk" data-act="tnpg" data-v="help">❓ Cách dùng</button></div><b class="tgt">Tả lịch đánh bằng một câu, app soạn sẵn mọi mục</b>`
      +`<label class="fld tntxt"><span class="sr">Tả giải</span><textarea id="tn-txt" data-draft="tn-txt" data-live="1" rows="3" maxlength="400" placeholder="Ví dụ: Tối thứ 7 social 19h, 3 sân, 80k/người · hoặc: CN 7h giải 16 cặp chia 4 bảng, nhất 1 triệu"${tnBusy?" disabled":""}>${esc(txt)}</textarea></label>`;
    if(o){const C=tnCheck(o);
      if(tnBusy)h+=`<section class="tgread"><span aria-hidden="true">✦</span><b>AI đang soạn…</b><i></i></section><section class="tgbox">${C.filter(x=>x[1]).map(x=>tnCkRow(x)).join("")}${tnCkRow(["Sân, luật, chuyển khoản…",false,""],true)}</section>`;
      else h+=`<section class="tgbox"><span class="cap">App đã nhận ra · ${C.filter(x=>x[1]).length}/7</span>${C.map(x=>tnCkRow(x)).join("")}</section><small class="rule">Thiếu vẫn bấm Soạn được, app sẽ hỏi bằng nút bấm. Xoá hết chữ thì các thể thức hiện lại.</small>`;
      return h+`<div class="hqcta"><button class="ball go" data-act="tngo"${tnBusy?" disabled":""}>${tnBusy?"Đang soạn…":"✦ Soạn giải"}</button></div>`}
    const seen=new Set(),L=tnLast().filter(x=>x.at&&!x.series&&!seen.has(xName(x))&&seen.add(xName(x))).concat(tnLast().filter(x=>x.at&&x.series)).filter((x,i,a)=>a.findIndex(y=>xName(y)===xName(x))===i).slice(0,2);
    return h+`<div class="tgor"><i></i><span>HOẶC CHỌN LOẠI</span><i></i></div>`
      +TN_FC.map(([k,ic,t,s,f,l])=>`<button class="tgfc ${l}" data-act="tnfmt" data-v="${k}"><i aria-hidden="true">${ic}</i><span><b>${t}</b><small>${s}</small><em>${f}</em></span><span aria-hidden="true">›</span></button>`).join("")
      +(L.length?`<section class="tnprev"><span class="cap">Như giải lần trước · 1 chạm</span>${L.map(x=>`<button data-act="tnprev" data-id="${esc(x.id)}"><span class="t"><b>${esc(xName(x))}</b><small>${esc([x.fmt==="giai"?(x.ko?"Chia bảng + KO":"Vòng tròn"):"Xoay cặp",ndL(x).length?`${ndL(x).length} nội dung`:x.max?`${x.fmt==="giai"?Math.round(x.max/2)+" cặp":x.max+" người"}`:"",`${x.courts||2} sân`,x.at?`${tnDow(x.at)} ${tnDm(x.at)}`:""].filter(Boolean).join(" · "))}</small></span><span class="go">Dùng lại ›</span></button>`).join("")}</section>`:"")
      +`<button class="lnk tgfull" data-act="tnfull">Tạo bằng form đầy đủ ›</button>`;
  }
  if(tnPg==="grp"&&tn){const g=tnG||tnNextG(tn);if(!g){tnPg="card";return tnPage(D)}tnG=g;
    const i=TN_G.findIndex(x=>x[0]===g),need=tnNeed(tn,g).length;
    mxDr({t:TN_G[i][1],back:"tnback",sub:tnGEdit?"Sửa":`Bước ${i+1}/4 · kiểm tra`});
    return (tnGEdit?"":`<div class="tnprog">${TN_G.map(([x],j)=>`<i class="${tnGSt(tn,x)==="ok"&&j!==i?"ok":j===i?"on":""}"></i>`).join("")}</div>`)
      +`<section class="tnask">${need?`<small class="tnneed">Chọn các mục có chữ “cần chọn”.</small>`:""}${tnGBody(g,tn)}</section>`
      +`<div class="hqcta"><button class="ball go" data-act="tngok" data-v="${g}">${tnGEdit?"✓ Xong":"Đúng rồi ›"}</button></div>`;
  }
  if(tnPg==="card"&&tn&&tn.ans)return tcPage(D);
  if(tnPg==="card"&&tn){mxDr({t:"Xác nhận giải",back:"tnback",sub:tn.from?"Như giải lần trước":"Kiểm tra rồi bấm Tạo"});
    const E=tnEst(tn),bad=TN_G.some(([g])=>tnGSt(tn,g)==="no");
    return (tn.from?`<div class="tnfrom">Dựa trên <b>${esc(tn.fromName||"")}</b> · ngày sang tuần gần nhất</div>`:"")+tnCard(D)
      +`<div class="hqcta two"><button class="btn-line" data-act="tnpg" data-v="${tn.from?"pick":"txt"}">${tn.from?"‹ Giải khác":"‹ Sửa câu"}</button>${bad?`<button class="ball" data-act="tngrp" data-v="${tnNextG(tn)}">Bổ sung mục thiếu ›</button>`:E&&E.late?`<button class="btn-line" data-act="tnmk" data-v="late">Tạo giải dù không kịp</button>`:`<button class="ball go" data-act="tnmk">✓ Tạo giải</button>`}</div>`+tnEdSheet();
  }
  tnPg=null;return "";
}

/* ----- Tạo giải: điền form cũ rồi lưu ----- */
async function tnCreate(D){
  const t=tn,fmt=t.fmt;
  // Giờ bắt đầu đã qua: không tạo, nhắc chọn lại
  if(t.date!=null&&t.time&&tnAt(t)<Date.now()){toast("Giờ bắt đầu đã qua, chọn ngày giờ khác nhé.");if(typeof tcRe==="function"&&t.said)try{tcRe(t,"time")}catch(e){}render();return}
  // Thiếu mục bắt buộc: báo rõ và đưa về câu còn thiếu, không im lặng
  {const g=!fmt?"nguoi":tnNextG(t);if(g){const k=tnNeed(t,g)[0];toast("Còn thiếu: "+((TC_Q.find(q=>q.k===k||(q.keys||[]).includes(k))||{}).q?.(t)||"thông tin bắt buộc"));render();return}}
  const keepP=xfPoster;xNew=fmt;xEdit=null;xSEdit=null;xQ=false;xClearDraft();xfPoster=keepP;
  const set=(k,v)=>{drafts["xf-"+k]=String(v)};
  const pairs=t.nds?t.nds.reduce((a,n)=>a+(+n.max||0),0):t.pairs||0;
  set("loai",t.loai||(fmt==="xoay"?"s":"g"));set("san",String(+t.san||0));if(t.bank==="now")mtBankWant=true;set("name",tnName(t));set("date",ymdIso(t.date));set("time",t.time);if(t.end)set("end",t.end);set("courts",t.courts||2);set("target",tnRu(t,"G").to);
  if(t.place)set("place",t.place);set("guests","1");set("reg","1");set("pay",t.pay||"off");
  set("feeG","");
  const fee=t.nds?Math.min(...t.nds.map(n=>+n.fee||0)):+t.fee||0,thu=fmt==="xoay"?(t.thu||"phi"):"phi";
  set("thu",thu);set("phi",fee);set("fee",fee);set("cp",thu==="phi"&&!fee&&!(t.nds&&t.nds.some(n=>+n.fee))?"0":"1");
  if(fmt==="xoay")set("max",t.people||0);
  else{set("max",pairs*2);set("pairReg",t.pairReg||"pair");drafts["xf-dt"]=t.nds?"free":(t.dt||"free")}
  if(fmt==="bang"){const N=Math.max(1,t.koN||(t.nds?2:4));set("koN",N);set("koQ",tnQ2(Math.min(pairs||N*2,N*(t.lay||2))));set("koThird",t.third===false?"0":"1");set("koTouched","1");
    for(const X of ["G","K","F"]){const r=tnRu(t,X);set("ko"+X+"t",r.to);set("ko"+X+"w",r.w2?"1":"0");set("ko"+X+"c",r.w2?(r.cap<0?r.to+4:r.cap||0):0);set("ko"+X+"s",r.sets||1)}}
  else{const r=tnRu(t,"G");set("adv","1");set("win2",r.w2?"1":"0");set("ptMax",r.w2?(r.cap<0?r.to+4:r.cap||0):0)}
  if(fmt!=="xoay")set("refOn",t.ref?"1":"0");
  set("gton",t.gton?"1":"0");
  if(t.gton){set("gt",t.gt||"hang");set("h1",+t.h1||0);set("h2",+t.h2||0);set("h3",+t.h3||0);set("gtv",+t.gtv||0);if(t.trao)set("trao",t.trao)}
  await xSave(D,"open");delete drafts["xf-dt"];
  if(errs.xf){xNew=null;render();return}
  if(t.nds&&gmMade){const L=t.nds.map((n,i)=>({k:"n"+(i+1),name:n.name,dt:n.dt||"free",cap:+n.cap||0,max:+n.max||16,koN:+n.koN||4,fee:+n.fee||0,courts:[]}));
    await write(()=>db.collection("sched").doc(gmMade).update({nds:L,ndMax:2}))}
  tnPg=null;tn=null;tnEd=null;tnG=null;for(const k of Object.keys(drafts))if(k.startsWith("tn-"))delete drafts[k];
  render();
}
// Như giải lần trước: cùng cài đặt, ngày sang tuần gần nhất
function tnFromPrev(X){
  let at=X.at||Date.now();while(at<Date.now())at+=7*864e5;
  const fmt=X.fmt==="giai"?(X.ko?"bang":"giai"):"xoay",d=new Date(at),h=X.hang||[];
  tn={fmt,name:"",date:tnDay0(at),time:`${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`,end:X.end||"",courts:+X.courts||2,target:+X.target||11,place:X.place||"",
    guests:!!X.guests,feeG:X.feeG,dt:X.dt||"free",thu:fmt==="xoay"?(X.thu||"keo"):"phi",fee:X.thu==="phi"?+X.phi||0:+X.fee||0,pay:X.pay||"off",
    gton:!!X.gton,gt:X.gt||"hang",h1:+h[0]||0,h2:+h[1]||0,h3:+h[2]||0,gtv:X.gtv!=null?+X.gtv:null,trao:X.trao||null,
    pairs:fmt!=="xoay"?Math.round((+X.max||0)/2):0,people:fmt==="xoay"?+X.max||0:0,koN:+X.koN||0,lay:X.koN&&X.koQ?Math.max(1,Math.round(+X.koQ/+X.koN)):2,third:X.koThird!=="0",pairReg:X.pairReg||"pair",
    nds:ndL(X).length?ndL(X).map(n=>({...n})):null,guess:new Set(),ok:new Set(TN_G.map(x=>x[0])),chg:new Set(["date"]),from:X.id,fromName:`${xName(X)} ${X.at?tnDm(X.at):""}`};
}
// Đọc các ô nhập của nhóm đang mở
function tnRd(){
  const v=k=>val("tn-"+k,null),num=(k,mn,mx)=>{const x=v(k);if(x==null||x==="")return;const n=+x;if(Number.isFinite(n))tn[k]=Math.max(mn,Math.min(mx,n));tn.guess.delete(k)};
  const d=v("date");if(d&&/^\d{4}-\d{2}-\d{2}$/.test(d)){const x=new Date(d+"T00:00").getTime();if(Number.isFinite(x)){tn.date=x;tn.guess.delete("date")}}
  for(const k of ["time","end","endBy"]){const x=v(k);if(x!=null){tn[k]=/^\d{1,2}:\d{2}$/.test(x)?x.padStart(5,"0"):(k==="time"?tn.time:"");tn.guess.delete(k)}}
  num("people",4,120);num("pairs",2,64);num("fee",0,10000);num("feeG",0,10000);num("h1",0,100000);num("h2",0,100000);num("h3",0,100000);num("gtv",0,100000);
  const pl=v("place");if(pl!=null){tn.place=String(pl).trim().slice(0,60);tn.guess.delete("place")}
  const nm=v("name");if(nm!=null){const n=String(nm).trim().slice(0,30);tn.name=n&&n!==tnAutoName(tn)?n:""}
  for(const k of Object.keys(drafts))if(k.startsWith("tn-")&&k!=="tn-txt"&&k!=="tn-say")delete drafts[k];
}
// Gộp kết quả AI vào bản nháp: mục AI nêu thì thay, bỏ nhãn ĐOÁN
function tnMerge(a){if(!a)return;if(tn&&tn.ans)delete a.endBy;for(const [k,v] of Object.entries(a)){tn[k]=v;tn.guess.delete(k)}if(a.fmt==="bang"&&tn.pairs&&!tn.koN){tn.koN=Math.max(1,Math.round(tn.pairs/4));tn.lay=2}}
async function tnAct(act,b){
  const v=b.dataset.v,D=derive();
  if(act==="xnew"){if(!MINI||!canWrite||legacy||!mxDrOn()||b.dataset.full)return false;tnPg="pick";tn=null;tnEd=null;tnG=null;gmMore=false;
    if(route!=="app"||tab!=="dk"||routeX)go("app",{tab:"dk"});else{render();try{scrollTo({top:0})}catch(e){}}return true}
  if(!act.startsWith("tn"))return false;
  const top=()=>{try{scrollTo({top:0})}catch(e){}};
  if(act==="tnx"){tnPg=null;tn=null;tnEd=null;tnG=null;render();return true}
  if(act==="tnfull"){tnPg=null;gsDO=false;gsTO=false;gsPg=null;gsOpt=null;xQ=true;xQs=1;gmSw=false;xNew="pick";xEdit=null;xSEdit=null;xClearDraft();delete errs.xf;render();top();return true}
  if(act==="tnpg"){tnPg=v==="txt"?"pick":v;if(v==="txt"||v==="pick"){tn=null;tnG=null}tnEd=null;delete errs.xf;render();top();return true}
  if(act==="tnfmt"){const L=TN_FC.find(x=>x[0]===v);if(!L)return true;xfPoster=null;tn=tcStart(tnFill({fmt:v}),"",["fmt"]);tn.pick=L[2];tn.loai=L[5];tnG=null;tnGEdit=false;tnPg="card";tcBeat();render();top();return true}
  if(act==="tnback"){tnEd=null;delete errs.xf;if(tnPg==="grp"&&tnGEdit){tnGEdit=false;tnG=null;tnPg="card"}else tnPg=tnPg==="card"||tnPg==="grp"?(tn&&tn.from?"pick":"txt"):"pick";render();top();return true}
  if(act==="tnmau"){drafts["tn-txt"]=TN_MAU[+v][1];render();return true}
  if(act==="tngo"){const txt=String(val("tn-txt","")).trim();if(!txt){toast("Tả giải bằng một câu, ví dụ: Chủ nhật 7h, 16 cặp chia bảng, 200k.");return true}
    tnBusy=true;render();const ai=await tnAI(txt,null);tnBusy=false;
    // Số đọc bằng luật (mẫu chặt) giữ nguyên; AI bổ sung phần còn lại và các lựa chọn
    // Mục đọc được bằng luật (mẫu chặt) giữ nguyên; AI điền phần còn lại
    const base=tnParse(txt);tn={...(ai||{}),...base,guess:new Set(),ok:new Set()};if(ai&&ai.nds&&!base.nds)tn.nds=ai.nds;
    if(base.wd&&tn.date===base.date&&tn.time&&tnAt(tn)<Date.now())tn.date+=7*864e5;delete tn.wd;
    const said=Object.keys(tn).filter(k=>tn[k]!=null&&tn[k]!=="");xfPoster=null;tn=tcStart(tnFill(tn),txt,said);if(tnAIM.lim){tn.noAI=1;tn.log.push({b:"Hôm nay CLB đã dùng hết lượt AI. App vẫn đọc được số, ngày giờ, tiền; phần còn lại bạn bấm nút nhé."})}tcFirst(tn,txt);tnG=null;tnGEdit=false;tnPg="card";tcBeat();render();top();return true}
  if(act==="tnprev"){const X=schedById(b.dataset.id);if(!X)return true;tnFromPrev(X);xfPoster=null;tn=tcStart(tnFill(tn),"",Object.keys(tn));for(const Q of TC_Q)tn.ans.add(Q.k);tnPg="card";tcBeat();render();top();return true}
  if(!tn)return true;
  if(act==="tnset"){const i0=String(v).indexOf(":"),k=String(v).slice(0,i0),x=String(v).slice(i0+1),num=["date","pairs","people","courts","fee","target","lay","koN"].includes(k);
    tn[k]=k==="guests"||k==="gton"||k==="third"?x==="1":num?+x:x;tn.guess.delete(k);delete drafts["tn-"+k];
    if(k==="fmt"){if(x!=="xoay")tn.thu="phi";if(x==="bang"&&!tn.koN&&tn.pairs){tn.koN=Math.max(1,Math.round(tn.pairs/4));tn.lay=2}if(x!=="xoay"&&tn.third==null)tn.third=true;if(x!=="xoay"&&!tn.pairReg)tn.pairReg="pair"}
    if(k==="pairs"&&tn.fmt==="bang"&&(!tn.koN||tn.guess.has("koN"))){tn.koN=Math.max(1,Math.min(8,Math.round(+x/4)));tn.guess.add("koN")}
    if(k==="gton"&&tn.gton&&!tn.gt)tn.gt="hang";if(k==="date"&&tn.chg)tn.chg.delete("date");
    render();return true}
  if(act==="tngrp"){tnG=v;tnGEdit=tnPg==="card";tnPg="grp";render();top();return true}
  if(act==="tngok"){tnRd();const need=tnNeed(tn,v);if(need.length){render();toast("Còn mục chưa chọn.");return true}
    tn.ok.add(v);if(tnGEdit){tnGEdit=false;tnG=null;tnPg="card"}else{tnG=tnNextG(tn);tnPg=tnG?"grp":"card"}render();top();return true}
  if(act==="tned"){tnEd=v;render();return true}
  if(act==="tnedx"){tnEd=null;delete drafts["tn-name"];render();return true}
  if(act==="tnedok"){tnRd();if(tcBadName(tn.name)){tn.name="";toast("Tên này không dùng được vì tên giải hiện công khai, bạn đặt tên khác nhé.");return true}tnEd=null;render();return true}
  if(act==="tnndx"){tn.nds.splice(+v,1);if(tn.nds.length<2){const n=tn.nds[0];tn.nds=null;if(n){tn.pairs=n.max;tn.dt=n.dt;tn.cap=n.cap;tn.fee=n.fee;tn.koN=n.koN;tn.lay=2}}render();return true}
  if(act==="tnfix"){if(v==="t7"){tn.target=7;tn.rG={...tnRu(tn,"G"),to:7,w2:false,cap:0}}else if(v==="c2")tn.courts=(tn.courts||1)+2;else if(v==="half"){tn.pairs=Math.max(4,Math.round(tn.pairs/2));tn.koN=Math.max(1,Math.round((tn.koN||2)/2))}else if(v==="noend")tn.endBy="";render();return true}
  if(act==="tnsay"&&tn.ans){const s=String(val("tn-say","")).trim();if(!s||tnBusy||tcWait>Date.now())return true;await tcSay(s);if(tn.wasDone&&!tn.ask){const e=tcSettle(tn);if(e)tn.edit=e}tcBeat();render();tcDown();return true}
  if(act==="tnsay"){const s=String(val("tn-say","")).trim();if(!s)return true;tnBusy=true;render();const a=await tnAI(s,tnCur(tn));tnBusy=false;
    const C=tn.ans?(k=>{tn.log.push({a:s});if(k)tcTyped(tn,k);else tn.log.push({b:"Mình chưa hiểu câu này. Bấm nút bên dưới, hoặc nói rõ hơn, ví dụ “6 sân”, “250k”, “nhất 1 triệu nhì 500”."})}):null;
    if(a&&Object.keys(a).length){tnMerge(a);delete drafts["tn-say"];if(C)C(Object.keys(a));else toast("Đã sửa theo lời bạn")}
    else{const p=tnParse(s),k=Object.keys(p).filter(x=>!["date","time"].includes(x)||/ngay|gio|\d+h|thu|chu nhat|mai/.test(tnNorm(s)));if(k.length){const o={};for(const x of k)o[x]=p[x];tnMerge(o);delete drafts["tn-say"];if(C)C(k);else toast("Đã sửa theo lời bạn")}else if(C){delete drafts["tn-say"];C(null)}else toast("Chưa hiểu, thử nói rõ hơn hoặc bấm Sửa ở từng nhóm.")}
    render();if(C)tcDown();return true}
  if(act==="tnmk"){if(v==="late"&&!armOr("tnlate"))return true;await tnCreate(D);return true}
  return false;
}
if(typeof window!=="undefined")window.__tnParse=tnParse;
