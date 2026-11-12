/* ---------- Buổi đã bắt đầu mà người tổ chức quên kết thúc ----------
   ① Hết giờ dự kiến + 1 tiếng (và 30′ không có trận mới): nhắc người tổ chức ở tab Lịch, Tin, trang Hôm nay → "Chốt ngay".
   ② Hết giờ + 3 tiếng (và 1 tiếng yên): với người chơi coi như đã kết thúc (không ghi gì, chỉ đổi cách hiện).
   ③ Qua nửa đêm, hết giờ + 3 tiếng và 3 tiếng yên: máy người tổ chức tự đóng buổi khi mở app.
      Giữ kết quả các trận đã nhập, trận chưa có tỉ số bỏ đi; tiền KHÔNG tự chốt: ai chưa trả vào "Còn nợ",
      buổi gắn nhãn "chưa chốt tiền" cho tới khi người tổ chức mở lại và lưu. */
const OV_H=36e5;
// Giờ kết thúc dự kiến của lịch đánh: ngày của X.at + X.end (qua nửa đêm thì sang ngày sau); không ghi thì +3 tiếng
function ovEnd(X){
  if(!X||!X.at)return 0;const m=/^(\d{1,2})[:h](\d{2})$/.exec(String(X.end||"").trim());
  if(!m)return X.at+3*OV_H;const d=new Date(X.at);d.setHours(+m[1],+m[2],0,0);let e=d.getTime();if(e<=X.at)e+=864e5;return e}
const ovLast=()=>(S.matches||[]).reduce((a,m)=>Math.max(a,+m.doneAt||0,+m.createdAt||0),0);
// Mức quá giờ của buổi đang chạy ở trang đang mở: 0 · 1 nhắc · 2 ẩn với người chơi · 3 tự đóng
function ovStage(){
  if(MODE!=="club"||legacy)return 0;const c=cfg();
  if(!(c.phase==="live"||(S.matches||[]).length))return 0;
  const X=xCur(),last=ovLast(),end=X?ovEnd(X):(last?last+OV_H:0);if(!end)return 0;
  const now=Date.now(),q=last?now-last:Infinity;
  if(now>=end+3*OV_H&&now>=dayStart(end)+864e5&&q>=3*OV_H)return 3;
  if(now>=end+3*OV_H&&q>=OV_H)return 2;
  if(now>=end+OV_H&&q>=30*6e4)return 1;
  return 0;
}
// Người chơi (không phải người tổ chức): buổi quá giờ lâu coi như đã kết thúc
const ovHide=()=>!isAdm()&&ovStage()>=2;
const pLive=D=>phaseOf(D)==="live"&&!ovHide();
const ovName=()=>{const X=xCur();return X?xName(X):(cfg().sname||"Buổi đang đánh")};
// Dải nhắc cho người tổ chức
const ovPend=()=>(S.hist||[]).filter(h=>h.auto&&!h.editedAt&&(h.closedAt||0)>Date.now()-14*864e5);
function ovBanner(){
  if(!isAdm())return "";
  if(ovStage()<1){const H=ovPend()[0];return H?`<button class="ovban" data-act="ovhist" data-id="${H.sid}"><span class="ic" aria-hidden="true">💰</span><span class="t"><b>${esc(H.sname||`Giải đấu #${H.sid}`)} đã tự đóng · chưa chốt tiền</b><small>Kết quả đã lưu. Xem ai còn nợ, sửa chi phí thật rồi bấm Lưu.</small></span><span class="go">Xem ›</span></button>`:""}const X=xCur(),e=X?ovEnd(X):0;
  return `<button class="ovban" data-act="ovgo"><span class="ic" aria-hidden="true">⏰</span><span class="t"><b>${esc(ovName())} đã quá giờ kết thúc${e?` (${hm(e)})`:""}</b><small>Chốt để lưu kết quả và tiền. Không chốt thì sau nửa đêm app tự đóng buổi, tiền vẫn chờ bạn chốt.</small></span><span class="go">Chốt ngay ›</span></button>`}
// Tin cho người tổ chức: buổi quá giờ + buổi đã tự đóng nhưng chưa chốt tiền
function ovTin(){
  const I=[];if(!isAdm()||MODE!=="club")return I;
  if(ovStage()>=1){const X=xCur();I.push({at:(X?ovEnd(X):Date.now())+OV_H,ic:"⏰",t:`${ovName()} đã quá giờ kết thúc`,s:"Chốt ngay để lưu kết quả và tiền ›",go:`data-act="ovgo"`})}
  for(const h of ovPend())
    I.push({at:h.closedAt,ic:"💰",t:`${h.sname||`Giải đấu #${h.sid}`} đã tự đóng · chưa chốt tiền`,s:"Xem ai còn nợ, sửa chi phí thật ›",go:`data-act="ovhist" data-id="${h.sid}"`});
  return I}
// Tự đóng (mức 3): chạy một lần mỗi buổi, chỉ trên máy người tổ chức, khi dữ liệu đã tải đủ
let ovBusy=false,ovDone="";
async function ovAuto(){
  if(ovBusy||!canWrite||!isAdm()||!S.mReady||!S.schedReady||!S.hReady||!S.pReady||!S.cfg)return;
  if(ovStage()<3)return;const D=derive(),k=CID+":"+D.sid;if(ovDone===k)return;
  ovBusy=true;ovDone=k;
  try{
    const P=D.playing.filter(Boolean);
    if(P.length){await trashMatches(P,"cancel");const ids=new Set(P.map(m=>m.id));S.matches=(S.matches||[]).filter(m=>!ids.has(m.id))}
    if(isG(D.c)&&gDerive(derive()))await endGiai({auto:true});else await chotBuoi({auto:true});
  }catch(e){}finally{ovBusy=false}
}
function ovAct(act,b){
  if(act==="ovgo"){if(MINI&&typeof mxSetMode==="function")mxSetMode("ql");if(typeof MXT!=="undefined")MXT=null;chotStep=1;go("chot");return true}
  if(act==="ovhist"){if(MINI&&typeof mxSetMode==="function")mxSetMode("ql");if(typeof MXT!=="undefined")MXT=null;go("buoi",{sid:+b.dataset.id});return true}
  return false;
}
