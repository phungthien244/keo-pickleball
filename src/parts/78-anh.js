/* ---------- Ảnh thẻ chia sẻ 1200×630: vẽ trên máy lúc bấm Chia sẻ, lưu clubs/{c}/the/{key}, máy chủ /api/the trả ảnh cho Zalo và xem trước link web ----------
   key theo đường dẫn trong CLB: "" → clb, "vdv/abc" → vdv_abc, "buoi/12" → buoi_12, "dang-ky/x1" → dang-ky_x1, "san" → san
   Poster giải (ban tổ chức tải lên): the/poster_<mã giải>, đã cắt/vừa khung 1200×630 */
const TH_W=1200,TH_H=630,TH_BRAND="Chủ CLB nhàn, người chơi vui";
const TC={navy:"#0c2b44",navy2:"#08213a",navy3:"#163a57",sky:"#a9cbe6",blue:"#1f8fe5",yellow:"#f2e205",red:"#e5484d"};
const FD=(w,s)=>`${w} ${s}px Montserrat, "Be Vietnam Pro", sans-serif`,FB_=(w,s)=>`${w} ${s}px "Be Vietnam Pro", Montserrat, sans-serif`;
const thKey=path=>{const s=String(path||"").split("?")[0].split("/").filter(Boolean).slice(1);return s.length?s.join("_").replace(/[^A-Za-z0-9_-]/g,""):"clb"};
const thUrl=(key,v)=>`https://pikeco.app/api/the/${encodeURIComponent(CID)}/${key}.jpg${v?"?v="+v:""}`;
let thFontsOk=null;
function thFonts(){
  if(thFontsOk)return thFontsOk;
  const T="Ẩ Đ ữ ộ Ặ 0123 · đ";
  thFontsOk=(document.fonts&&document.fonts.load?Promise.all(["900 40px Montserrat","800 40px Montserrat","700 40px Montserrat","600 30px \"Be Vietnam Pro\"","500 30px \"Be Vietnam Pro\"","400 30px \"Be Vietnam Pro\""].map(f=>document.fonts.load(f,T).catch(()=>null))):Promise.resolve()).catch(()=>null);
  return thFontsOk;
}
// Ảnh data: → Image. SVG vẽ ra canvas trước (vẽ SVG theo vùng cắt bị lệch trên Chrome)
const thImg=src=>new Promise(ok=>{if(!src||!/^data:image\//.test(src)){ok(null);return}const i=new Image();
  i.onload=()=>{if(!/^data:image\/svg/.test(src)){ok(i);return}const c=document.createElement("canvas"),n=Math.max(64,Math.min(640,i.naturalWidth||320));c.width=c.height=n;c.getContext("2d").drawImage(i,0,0,n,n);ok(c)};
  i.onerror=()=>ok(null);i.src=src});
// Chữ vừa bề ngang: giảm cỡ dần, cuối cùng cắt "…"
function thFit(g,t,maxW,font,sizes){
  t=String(t||"");for(const s of sizes){g.font=font(s);if(g.measureText(t).width<=maxW)return s}
  const s=sizes[sizes.length-1];g.font=font(s);while(t.length>1&&g.measureText(t+"…").width>maxW)t=t.slice(0,-1);return {s,t:t+"…"};
}
function thText(g,t,x,y,maxW,font,sizes,color,align="left"){
  const r=thFit(g,t,maxW,font,sizes);g.fillStyle=color;g.textAlign=align;g.textBaseline="alphabetic";
  if(typeof r==="object"){g.font=font(r.s);g.fillText(r.t,x,y)}else{g.font=font(r);g.fillText(String(t||""),x,y)}g.textAlign="left";
}
function thWrap(g,t,maxW,maxL){const w=String(t||"").split(/\s+/),L=[];let cur="";
  for(const x of w){const n=cur?cur+" "+x:x;if(g.measureText(n).width>maxW&&cur){L.push(cur);cur=x}else cur=n}if(cur)L.push(cur);
  if(L.length>maxL){L.length=maxL;let s=L[maxL-1];while(s.length>1&&g.measureText(s+"…").width>maxW)s=s.slice(0,-1);L[maxL-1]=s+"…"}return L}
function thRect(g,x,y,w,h,c){g.fillStyle=c;g.fillRect(x,y,w,h)}
function thCover(g,img,x,y,w,h){const iw=img.naturalWidth||img.width||w,ih=img.naturalHeight||img.height||h,r=Math.max(w/iw,h/ih),sw=w/r,sh=h/r;g.drawImage(img,(iw-sw)/2,(ih-sh)/2,sw,sh,x,y,w,h)}
// Ảnh đại diện tròn: ảnh thật (data:) hoặc chữ cái đầu trên nền màu như trong app
async function thAv(g,p,cx,cy,r,ring){
  const n=String(p&&p.name||"?").trim(),w=n.split(/\s+/),ini=(w[w.length-1]||"?").charAt(0).toUpperCase();
  if(ring){g.beginPath();g.arc(cx,cy,r+ring,0,Math.PI*2);g.fillStyle=TC.yellow;g.fill()}
  const img=await thImg(p&&p.photo);
  g.save();g.beginPath();g.arc(cx,cy,r,0,Math.PI*2);g.closePath();g.clip();
  if(img)thCover(g,img,cx-r,cy-r,r*2,r*2);
  else{let h=0;for(const ch of n)h=(h*31+ch.charCodeAt(0))>>>0;g.fillStyle=AVC[h%AVC.length];g.fillRect(cx-r,cy-r,r*2,r*2);
    g.fillStyle="#fff";g.font=FD(800,Math.round(r*.95));g.textAlign="center";g.textBaseline="middle";g.fillText(ini,cx,cy+r*.04);g.textAlign="left";g.textBaseline="alphabetic"}
  g.restore();
}
async function thLogo(g,x,y,s){
  const c=CLUB||{id:CID},img=await thImg(c.logo);
  g.save();g.beginPath();g.arc(x+s/2,y+s/2,s/2,0,Math.PI*2);g.clip();
  if(img)thCover(g,img,x,y,s,s);else{g.fillStyle=typeof clubCol==="function"?clubCol(c):TC.blue;g.fillRect(x,y,s,s);
    const nm=String(c.name||CID).trim(),ini=nm.split(/\s+/).map(w=>w[0]).join("").slice(0,2).toUpperCase();
    g.fillStyle="#fff";g.font=FD(900,Math.round(s*.38));g.textAlign="center";g.textBaseline="middle";g.fillText(ini,x+s/2,y+s/2+1);g.textAlign="left";g.textBaseline="alphabetic"}
  g.restore();
}
// Khung chung: nền, sân, bóng, thanh trên (nhãn + logo + tên CLB), dải thương hiệu dưới
async function thFrame(g,{tag,tagBg=TC.blue,tagFg="#fff",bg=TC.navy,ball=true}){
  thRect(g,0,0,TH_W,TH_H,bg);
  g.save();g.strokeStyle="rgba(169,203,230,.20)";g.lineWidth=3;g.beginPath();
  g.moveTo(840,64);g.lineTo(760,534);g.moveTo(1150,64);g.lineTo(1070,534);g.moveTo(800,300);g.lineTo(1200,300);g.stroke();g.restore();
  if(ball){g.beginPath();g.arc(1040,205,58,0,Math.PI*2);g.fillStyle=TC.yellow;g.fill();g.fillStyle="rgba(12,43,68,.28)";
    for(const [dx,dy] of [[-22,-18],[14,-26],[26,8],[-6,10],[-24,24],[8,34]]){g.beginPath();g.arc(1040+dx,205+dy,6,0,Math.PI*2);g.fill()}}
  thRect(g,0,0,TH_W,64,TC.navy2);
  g.font=FD(800,18);const tw=g.measureText(tag).width+28;thRect(g,48,16,tw,32,tagBg);g.fillStyle=tagFg;g.fillText(tag,62,39);
  await thLogo(g,48+tw+16,14,36);
  thText(g,String((CLUB&&CLUB.name)||"").toUpperCase(),48+tw+62,40,TH_W-(48+tw+62)-48,s=>FD(700,s),[19,17,15],TC.sky);
  thBrand(g);
}
function thBrand(g){
  thRect(g,0,534,TH_W,96,TC.yellow);
  thRect(g,48,553,128,58,TC.navy);g.font=FD(900,24);g.fillStyle="#fff";g.fillText("PIKECO",62,580);g.fillStyle=TC.blue;g.fillText(".APP",62,603);
  g.fillStyle=TC.navy;g.font=FD(800,30);g.fillText("pikeco.app",196,593);
  thText(g,TH_BRAND,1152,592,640,s=>FB_(600,s),[28,26,24],TC.navy,"right");
}
const thLbl=(g,t,x,y,c=TC.sky)=>{g.font=FD(700,19);g.fillStyle=c;g.fillText(t,x,y)};

/* ----- Các mẫu ----- */
async function thVdv(g,D,pid){
  const p=D.pmap.get(pid);if(!p)return false;
  const s=D.st.get(pid),X=profileData(D,pid),all=[...D.players].filter(x=>!x.guest).sort((a,b)=>D.st.get(b.id).rating-D.st.get(a.id).rating),rk=all.findIndex(x=>x.id===pid)+1;
  const sameG=all.filter(x=>(x.gender==="F")===(p.gender==="F")),rg=sameG.findIndex(x=>x.id===pid)+1,pc=X.games?Math.round(X.winsAll/X.games*100):0;
  await thFrame(g,{tag:"HỒ SƠ VĐV"});
  await thAv(g,p,158,232,98,9);
  thText(g,p.name.toUpperCase(),290,212,520,s=>FD(900,s),[72,64,56,48,42],"#fff");
  g.font=FB_(500,26);g.fillStyle=TC.sky;g.fillText([p.gender==="F"?"Nữ":"Nam",p.code,X.ses[0]?`đánh từ ${dmy(X.ses[0].at).replace(/^\d+\//,"")}`:""].filter(Boolean).join(" · "),292,256);
  if(rk>0){const t=`#${rk} CLB${rg>0?` · SỐ ${rg} ${p.gender==="F"?"NỮ":"NAM"}`:""}`;g.font=FD(800,22);const w=g.measureText(t).width+26;thRect(g,290,276,w,40,TC.yellow);g.fillStyle=TC.navy;g.fillText(t,303,304)}
  thLbl(g,"RATING",48,392);g.fillStyle=TC.yellow;g.font=FD(900,88);g.fillText(r2(s.rating),44,480);
  const st=[["GIẢI ĐẤU",String(X.ses.length)],["TRẬN",String(X.games)],["THẮNG",pc+"%"]];
  st.forEach(([l,v],i)=>{const x=330+i*170;thLbl(g,l,x,392);g.fillStyle="#fff";g.font=FD(900,60);g.fillText(v,x,470)});
  return {title:`${p.name} · ${clubNm(D)}`};
}
async function thGiai(g,D,X){
  const R=withX(X,()=>regList(D)),fee=xFee(X),m=+X.max||0,left=m?Math.max(0,m-R.conf.length):null,d=X.at?new Date(X.at):null;
  await thFrame(g,{tag:xState(X)==="open"?"MỞ ĐĂNG KÝ":"GIẢI ĐẤU",tagBg:TC.yellow,tagFg:TC.navy,bg:TC.blue,ball:false});
  if(d){thRect(g,48,100,170,190,TC.navy);g.textAlign="center";g.fillStyle=TC.sky;g.font=FD(800,26);g.fillText(["CN","T2","T3","T4","T5","T6","T7"][d.getDay()],133,140);
    g.fillStyle="#fff";g.font=FD(900,92);g.fillText(String(d.getDate()),133,236);g.fillStyle=TC.sky;g.font=FD(800,22);g.fillText(`THG ${d.getMonth()+1}`,133,272);g.textAlign="left"}
  const x0=d?250:48,mw=TH_W-x0-48;
  g.fillStyle="#fff";g.font=FD(800,22);g.fillText(gdTy(X).lb.replace(/^[^A-ZÀ-Ỹ]+/,""),x0,132);
  g.font=FD(900,58);const L=thWrap(g,xName(X),mw,2);L.forEach((t,i)=>g.fillText(t,x0,196+i*64));
  g.font=FB_(600,28);g.fillStyle="#fff";g.fillText(thWrap(g,[xTime(X),X.place,(+X.courts||0)&&`${X.courts} sân`].filter(Boolean).join(" · "),mw,1)[0]||"",x0,196+L.length*64+6);
  thLbl(g,m?"CÒN CHỖ":"ĐÃ ĐĂNG KÝ",48,418,"#dbeeff");g.fillStyle=TC.yellow;g.font=FD(900,84);g.fillText(m?(left?`${left}/${m}`:"HẾT CHỖ"):String(R.conf.length),44,506);
  g.textAlign="right";thLbl(g,"LỆ PHÍ",1152,418,"#dbeeff");g.textAlign="right";g.fillStyle="#fff";g.font=FD(900,64);g.fillText(X.cp===false?"Miễn phí":fee?kVND(fee):(THU[X.thu||"keo"]||""),1152,500);g.textAlign="left";
  return {title:`${xName(X)} · ${clubNm(D)}`};
}
async function thPoster(g,X,img){
  thCover(g,img,0,0,TH_W,TH_H);
  g.font=FD(800,24);const t="pikeco.app",w=g.measureText(t).width+36;thRect(g,TH_W-w-24,TH_H-62,w,42,TC.navy);g.fillStyle=TC.yellow;g.fillText(t,TH_W-w-6,TH_H-33);
  return {title:`${xName(X)} · ${(CLUB&&CLUB.name)||""}`};
}
async function thBuoi(g,D,sid){
  const x=sessList(D).find(z=>String(z.sid)===String(sid));if(!x)return false;
  const s=x.snap||{},G=s.type==="giai"?(s.giai||{}):null;
  const top=G?((G.table||[]).filter(t=>!t.out).slice(0,3).map(t=>({p:D.pmap.get(t.a)||{name:t.na},n:`${t.na} & ${t.nb}`}))):(x.rows||[]).slice(0,3).map(r=>({p:D.pmap.get(r.id)||{name:r.name},n:r.name||D.pmap.get(r.id)?.name||"?"}));
  await thFrame(g,{tag:"TỔNG KẾT",ball:false});
  thText(g,`${shareName(s.sname,`Giải đấu #${x.sid}`)} · ${dmy(x.at)}`,48,128,1104,v=>FD(900,v),[50,44,38],"#fff");
  const pos=[[0,330,74,150],[1,140,62,106],[2,520,58,80]];
  for(const [i,cx,r,h] of pos){const t=top[i];if(!t)continue;const base=500;
    await thAv(g,t.p,cx,base-h-r-60,r,i===0?7:0);
    thText(g,t.n,cx,base-h-22,190,v=>FB_(600,v),[24,21,18],"#fff","center");
    thRect(g,cx-90,base-h,180,h,i===0?TC.yellow:TC.navy3);g.fillStyle=i===0?TC.navy:"#fff";g.font=FD(900,i===0?56:44);g.textAlign="center";g.fillText(String(i+1),cx,base-h+(i===0?66:54));g.textAlign="left"}
  const nP=new Set((x.rows||[]).map(r=>r.id)).size,nM=(x.ms||[]).length||(+s.matchCount||0);
  const st=[[nM?`${nM}`:"",nM?"trận":""],[G?`${(G.table||[]).length}`:"",G?"cặp":""],[nP?`${nP}`:"",nP?"người chơi":""],[G?"":(top[0]?top[0].n:""),G?"":"MVP"]].filter(z=>z[0]).slice(0,3);
  st.forEach(([v,l],i)=>{const y=226+i*96;g.fillStyle="#fff";thText(g,v,700,y,420,q=>FD(900,q),[54,44,36],"#fff");thLbl(g,l.toUpperCase(),700,y+30)});
  return {title:`Tổng kết ${shareName(s.sname,`giải đấu #${x.sid}`)} · ${clubNm(D)}`};
}
async function thSan(g,D){
  const c=D.c,act=D.players.filter(p=>p.active!==false).length,nm=id=>D.pmap.get(id)?.name||"?";
  await thFrame(g,{tag:"● TRỰC TIẾP",tagBg:TC.red});
  g.fillStyle="#fff";g.font=FD(900,84);g.fillText("ĐANG ĐÁNH",48,178);
  thText(g,`${shareName(c.sname,"Giải đấu hôm nay")} · ${today()}`,48,226,700,v=>FB_(600,v),[30,26,22],TC.sky);
  const P=D.playing.slice(0,3);
  P.forEach((m,i)=>{const y=290+i*58;thRect(g,48,y-34,92,44,TC.yellow);g.fillStyle=TC.navy;g.font=FD(900,22);g.fillText(`SÂN ${cName(m.court)}`.slice(0,9),58,y-4);
    thText(g,`${m.a.map(nm).join(" & ")}  vs  ${m.b.map(nm).join(" & ")}`,156,y-2,600,v=>FB_(600,v),[26,23,20],"#fff")});
  const st=[[`${Math.max(1,+c.courts||D.playing.length)}`,"SÂN"],[`${act}`,"NGƯỜI"],[`${D.done.length}`,"TRẬN XONG"]];
  st.forEach(([v,l],i)=>{const x=48+i*200;g.fillStyle=TC.yellow;g.font=FD(900,60);g.fillText(v,x,P.length?500:420);thLbl(g,l,x,P.length?522:446)});
  return {title:`${clubNm(D)} đang đánh trực tiếp`};
}
async function thClb(g,D){
  const c=CLUB||{},M=D.players.filter(p=>!p.guest),R=M.map(p=>D.st.get(p.id).rating).filter(Number.isFinite),avg=R.length?R.reduce((a,b)=>a+b,0)/R.length:0;
  await thFrame(g,{tag:"CLB PICKLEBALL",ball:!c.cover});
  const cov=await thImg(c.cover);
  if(cov){g.save();g.beginPath();g.rect(0,64,TH_W,470);g.clip();thCover(g,cov,0,64,TH_W,470);g.fillStyle="rgba(8,33,58,.72)";g.fillRect(0,64,TH_W,470);g.restore()}
  await thLogo(g,48,104,150);
  thText(g,c.name||clubNm(D),230,170,920,v=>FD(900,v),[66,56,48,40],"#fff");
  g.font=FB_(500,28);g.fillStyle=TC.sky;g.fillText([c.city,c.sched||(Array.isArray(c.days)&&c.days.length?"Lịch đánh "+GT_DAYS.filter(([d])=>c.days.includes(d)).map(([,l])=>l).join(", "):"")].filter(Boolean).join(" · ").slice(0,70),232,214);
  const st=[[`${M.length}`,"THÀNH VIÊN"],[`${(S.hist||[]).length}`,"GIẢI ĐẤU"],[avg?r2(avg):"–","RATING TB"]];
  st.forEach(([v,l],i)=>{const x=48+i*250;g.fillStyle=TC.yellow;g.font=FD(900,72);g.fillText(v,x,420);thLbl(g,l,x,452)});
  return {title:`${c.name||clubNm(D)} trên Pikeco`};
}
// Vẽ ảnh cho một đường dẫn trong CLB. Trả {key,title,data} hoặc null (trang không có mẫu)
async function thDraw(path){
  if(MODE!=="club"||legacy||typeof document==="undefined"||!document.createElement)return null;
  const s=String(path||"").split("?")[0].split("/").filter(Boolean).slice(1),D=derive(),key=thKey(path);
  const cv=document.createElement("canvas");if(!cv.getContext)return null;cv.width=TH_W;cv.height=TH_H;const g=cv.getContext("2d");if(!g)return null;
  await thFonts();
  let r=false;
  try{
    if(s[0]==="vdv"&&s[1])r=await thVdv(g,D,s[1]);
    else if(s[0]==="buoi"&&s[1])r=await thBuoi(g,D,s[1]);
    else if(s[0]==="dang-ky"&&s[1]){const X=schedById(s[1]);if(X){const pi=X.poster?await thImg(await posterGet(X.id)):null;r=pi?await thPoster(g,X,pi):await thGiai(g,D,X)}}
    else if(s[0]==="san")r=await thSan(g,D);
    else if(!s.length||s[0]==="gioi-thieu")r=await thClb(g,D);
  }catch(e){r=false}
  if(!r)return null;
  let q=.86,data=cv.toDataURL("image/jpeg",q);while(data.length>380000&&q>.4){q-=.12;data=cv.toDataURL("image/jpeg",q)}
  return {key:s.length&&s[0]!=="gioi-thieu"?key:"clb",title:r.title,data};
}
// Lưu ảnh để Zalo / trình xem link tải được. Không lưu được (chưa đăng nhập, CLB cũ) thì trả null → dùng ảnh chung
async function thSave(t){
  if(!t||!window.FB||window.FB_TARGET==="mock")return null;
  try{await FB.setDoc(FB.doc(FB.fs,PFX+"the/"+t.key),{img:t.data,at:Date.now()});return thUrl(t.key,Date.now().toString(36))}catch(e){return null}
}

/* ----- Poster giải ----- */
const posterCache={};
async function posterGet(sid){
  if(posterCache[sid]!==undefined)return posterCache[sid];
  try{const s=await FB.getDoc(FB.doc(FB.fs,PFX+"the/poster_"+sid));posterCache[sid]=s.exists()?s.data().img||null:null}catch(e){posterCache[sid]=null}
  return posterCache[sid];
}
// Ảnh tải lên → 1200×630: "fit" giữ trọn ảnh trên nền mờ, "fill" cắt ngang theo vị trí (0 trên … 1 dưới)
async function posterMake(src,mode,pos){
  const img=await thImg(src);if(!img)return null;
  const cv=document.createElement("canvas");cv.width=TH_W;cv.height=TH_H;const g=cv.getContext("2d");
  if(mode==="fit"){
    g.save();g.filter="blur(28px) brightness(.7)";thCover(g,img,-40,-40,TH_W+80,TH_H+80);g.restore();
    const r=Math.min(TH_W/img.width,TH_H/img.height),w=img.width*r,h=img.height*r;g.drawImage(img,(TH_W-w)/2,(TH_H-h)/2,w,h);
  }else{const r=Math.max(TH_W/img.width,TH_H/img.height),sw=TH_W/r,sh=TH_H/r,sy=(img.height-sh)*Math.max(0,Math.min(1,pos));g.drawImage(img,(img.width-sw)/2,sy,sw,sh,0,0,TH_W,TH_H)}
  let q=.85,data=cv.toDataURL("image/jpeg",q);while(data.length>380000&&q>.4){q-=.1;data=cv.toDataURL("image/jpeg",q)}
  return data;
}
// Đọc ảnh gốc từ máy (thu nhỏ còn cạnh dài 1600 để xử lý nhanh)
async function posterRead(file){
  const url=URL.createObjectURL(file);
  try{const img=await new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=url});
    const k=Math.min(1,1600/Math.max(img.naturalWidth,img.naturalHeight)),cv=document.createElement("canvas");cv.width=Math.round(img.naturalWidth*k);cv.height=Math.round(img.naturalHeight*k);
    cv.getContext("2d").drawImage(img,0,0,cv.width,cv.height);return cv.toDataURL("image/jpeg",.9)}
  finally{URL.revokeObjectURL(url)}
}
