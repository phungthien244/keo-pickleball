/* ---------- Tab Trực tiếp cho người chơi: Sân · Tiếp theo · Kết quả · Xếp hạng ----------
   Sân: thẻ sân gọn có ảnh, điểm trực tiếp từ màn trọng tài, ☆ theo dõi sân (lưu trên máy), xem từng pha.
   Kết quả: tất cả / trận của tôi kèm thắng thua và rating thay đổi. */
let vlMatch=null,vlRes="all";
const vlFol=()=>{try{return new Set(JSON.parse(localStorage.getItem("pb-fol-"+CID)||"[]").map(Number))}catch(e){return new Set()}};
function vlFolSet(k){const s=vlFol();s.has(k)?s.delete(k):s.add(k);try{localStorage.setItem("pb-fol-"+CID,JSON.stringify([...s]))}catch(e){}}
function vlCourt(D,m,me,fol){
  const X=m.ref&&m.ref.started?ttRun(D,m):null,mine=[...m.a,...m.b].includes(me),age=typeof m.createdAt==="number"?Math.round((Date.now()-m.createdAt)/6e4):0;
  const row=t=>{const ids=t==="a"?m.a:m.b,sv=X&&!X.done&&X.st===t;
    return `<div class="vlt${X&&X.done&&X.win===t?" w":""}">${ttAvs(D,ids,"sm")}<b>${ids.map(id=>nm(D,id)).join(" &amp; ")}${sv?` <i class="sv" aria-label="đang giao">●</i>`:""}</b>${X&&X.R.sets>1?`<span class="g num">${X.gw[t]}</span>`:""}<span class="p num">${X?X.s[t]:""}</span></div>`};
  return `<article class="vlc${mine?" me":""}"><div class="vlh"><b>Sân ${esc(cName(m.court))}</b><span>${X?(X.done?"vừa xong":`ván ${X.g+1}`):`${age}′`}</span>${X&&!X.done?`<span class="lv">● TRỰC TIẾP</span>`:""}<button class="fol${fol?" on":""}" data-act="vlfol" data-v="${Number(m.court)}" aria-pressed="${fol}" aria-label="Theo dõi sân">${fol?"★":"☆"}</button></div>
    ${row("a")}${row("b")}${X?`<button class="vlmore" data-act="vlmatch" data-id="${esc(m.id)}">Xem từng pha · ${esc(X.call())} ›</button>`:`<small class="vlno">Điểm cập nhật khi lưu tỉ số${mine?" · trận của bạn":""}</small>`}</article>`;
}
function vlSan(D){
  const me=mxPid(),F=vlFol(),L=[...D.playing].sort((a,b)=>(F.has(Number(b.court))-F.has(Number(a.court)))||([...b.a,...b.b].includes(me)-[...a.a,...a.b].includes(me))||a.court-b.court);
  const used=new Set(D.playing.map(m=>Number(m.court))),last=[...D.done].sort((a,b)=>(b.doneAt||0)-(a.doneAt||0));
  let h=dhPauseBar()+L.map(m=>vlCourt(D,m,me,F.has(Number(m.court)))).join("");
  for(let k=1;k<=Math.max(1,+D.c.courts||1);k++)if(!used.has(k)){const x=last.find(m=>Number(m.court)===k);
    h+=`<div class="vle"><b>Sân ${esc(cName(k))}</b><span>${x?`Vừa xong · ${x.a.map(id=>nm(D,id)).join(" &amp; ")} ${x.sa}–${x.sb} ${x.b.map(id=>nm(D,id)).join(" &amp; ")}`:"Đang trống"}</span></div>`}
  return h;
}
function vlKetQua(D){
  const me=mxPid(),mineL=D.done.filter(m=>[...m.a,...m.b].includes(me)),L=[...(vlRes==="me"?mineL:D.done)].sort((a,b)=>(b.doneAt||0)-(a.doneAt||0));
  let h=`<div class="mxseg sm"><button data-act="vlres" data-v="all" aria-pressed="${vlRes!=="me"}">Tất cả ${D.done.length}</button>${me?`<button data-act="vlres" data-v="me" aria-pressed="${vlRes==="me"}">Trận của tôi ${mineL.length}</button>`:""}</div>`;
  if(!L.length)return h+`<div class="mxcard muted"><b>Chưa có kết quả</b><span>Trận nào lưu tỉ số sẽ hiện ở đây.</span></div>`;
  return h+L.map(m=>{const i=D.info.get(m.id)||{},inA=m.a.includes(me),mine=inA||m.b.includes(me),won=mine&&(inA===!!i.aWin),d=mine&&i.dA!=null?(inA?i.dA:-i.dA):null;
    const t=(ids,s,w)=>`<div class="vlt${w?" w":""}">${ttAvs(D,ids,"sm")}<b>${ids.map(id=>nm(D,id)).join(" &amp; ")}</b><span class="p num">${s}</span></div>`;
    return `<article class="vlc${mine?" me":""}"><div class="vlh"><b>Sân ${esc(cName(m.court))}</b><span>${m.doneAt?hm(m.doneAt):""}</span>${mine?`<span class="res ${won?"w":"l"}">${won?"THẮNG":"THUA"}${d!=null?` · rating ${d>=0?"+":"−"}${Math.abs(d).toFixed(2)}`:""}</span>`:""}</div>
      ${t(m.a,m.sa,i.aWin)}${t(m.b,m.sb,!i.aWin)}${m.ref&&m.ref.ev&&m.ref.ev.length?`<button class="vlmore" data-act="vlmatch" data-id="${esc(m.id)}">Xem từng pha ›</button>`:""}</article>`}).join("");
}
// Xem trận trực tiếp: điểm gọi, sơ đồ sân, diễn biến từng pha (mới nhất trên)
function vlMatchView(D){
  if(!vlMatch)return "";const m=(S.matches||[]).find(x=>x.id===vlMatch);if(!m||!m.ref){vlMatch=null;return ""}
  const X=ttRun(D,m),fol=vlFol().has(Number(m.court)),L=[...X.log].reverse();
  return `<div class="ttfs vlm" role="dialog" aria-label="Xem trận Sân ${esc(cName(m.court))}">${ttHead(D,m,`Sân ${esc(cName(m.court))} · ${X.done?"đã xong":"trực tiếp"}`,"vlmatchx")}
    <div class="vlsb"><span class="tm">${ttAvs(D,m.a,"sm")}<b>${esc(ttTN(D,m,"a"))}</b></span>${(()=>{const t=X.games.map(g=>`${g.a}–${g.b}`).join(" ")||(X.R.sets>1?`${X.gw.a}–${X.gw.b}`:"");return t?`<span class="gs num">${t}</span>`:"<span></span>"})()}<span class="tm r"><b>${esc(ttTN(D,m,"b"))}</b>${ttAvs(D,m.b,"sm")}</span></div>
    ${X.done?`<div class="vlcall"><span class="cap">Kết thúc</span><b class="num">${X.s.a}–${X.s.b}</b><span>${esc(ttTN(D,m,X.win))} thắng${X.ff?" · đối thủ bỏ cuộc":""}</span></div>`:`<div class="vlcall"><span class="cap">● Ván ${X.g+1} · trực tiếp</span><b class="num">${X.call()}</b><span>${esc(ttPN(D,X.sv))} giao từ ô ${X.srvRight?"phải":"trái"}</span></div>${ttCourt(D,m,X)}`}
    <section class="vllog"><div class="hh"><span class="cap">Diễn biến · mới nhất trên</span><span>${X.log.filter(l=>l.k==="p").length} pha</span></div>${L.map(l=>`<div class="hr k${l.k}"><span class="num">${l.at?hm(l.at):""}</span><b class="num">${l.k==="p"?l.before:"—"}</b><span>${esc(l.tx)}${l.k==="p"?` → <b class="num">${l.after}</b>`:""}</span></div>`).join("")||`<p class="rule">Chưa có pha nào.</p>`}</section>
    <div class="two vlbt"><button class="line" data-act="vlfol" data-v="${Number(m.court)}">${fol?"★ Đang theo dõi":"☆ Theo dõi sân"}</button><button class="primary" data-act="lshare">↗ Chia sẻ trận</button></div></div>`;
}
function vlLive(D){
  const seg=["san","cho","xong","bxh"].includes(mxSeg.live)?mxSeg.live:"san",sb=(v,l)=>`<button data-act="mxseg" data-k="live" data-v="${v}" aria-pressed="${seg===v}">${l}</button>`;
  let h=`<div class="mxseg">${sb("san",`Sân · ${D.playing.length}`)}${sb("cho","Tiếp theo")}${sb("xong","Kết quả")}${sb("bxh","Xếp hạng")}</div>`;
  h+=seg==="san"?vlSan(D):seg==="cho"?queueBox(D,false):seg==="xong"?vlKetQua(D):vBxh(D);
  return h+vlMatchView(D);
}
function vlAct(act,b){
  if(act==="vlfol"){vlFolSet(Number(b.dataset.v));render();return true}
  if(act==="vlmatch"){vlMatch=b.dataset.id;render();return true}
  if(act==="vlmatchx"){vlMatch=null;render();return true}
  if(act==="vlres"){vlRes=b.dataset.v==="me"?"me":"all";render();return true}
  return false;
}
