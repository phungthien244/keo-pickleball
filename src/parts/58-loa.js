/* ---------- Loa mời vào sân: giọng đọc tiếng Việt có sẵn trên máy (ưu tiên giọng nữ) ---------- */
const hasTTS=()=>typeof window!=="undefined"&&"speechSynthesis" in window&&typeof SpeechSynthesisUtterance!=="undefined";
function viVoice(){
  if(!hasTTS())return null;
  const V=speechSynthesis.getVoices().filter(v=>/^vi/i.test(v.lang));
  const fem=/linh|hoaimy|hoài my|an\b|mai|female|nữ|nu\b|google tiếng việt|google vietnamese|vi-vn-standard-a|vi-vn-wavenet-a|vi-vn-neural2-a/i;
  return V.find(v=>fem.test(v.name)&&/natural|neural|online|enhanced|premium/i.test(v.name))||V.find(v=>fem.test(v.name))||V.find(v=>!/nam\b|male|minh/i.test(v.name))||V[0]||null;
}
if(hasTTS())try{speechSynthesis.getVoices();speechSynthesis.onvoiceschanged=()=>speechSynthesis.getVoices()}catch(e){}
const xung=p=>p&&p.gender==="F"?"chị":"anh";
function callText(D,m){
  const team=ids=>ids.map(id=>{const p=D.pmap.get(id);return `${xung(p)} ${p?.name||""}`.trim()}).join(", ");
  return `Xin mời cặp ${team(m.a)}, và cặp ${team(m.b)}, vào sân số ${m.court}, chuẩn bị thi đấu.`;
}
function speak(text){
  if(!hasTTS()){toast("Trình duyệt này chưa hỗ trợ đọc loa.");return}
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text),v=viVoice();
    u.lang="vi-VN";if(v)u.voice=v;u.rate=0.92;u.pitch=1.08;u.volume=1;
    speechSynthesis.speak(u);
    if(!v)toast("Máy chưa có giọng tiếng Việt, có thể đọc chưa chuẩn.");
  }catch(e){toast("Không đọc được trên máy này.")}
}
