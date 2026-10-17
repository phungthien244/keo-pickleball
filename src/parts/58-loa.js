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
function speakDevice(text){
  if(!hasTTS()){toast("Trình duyệt này chưa hỗ trợ đọc loa.");return}
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text),v=viVoice();
    u.lang="vi-VN";if(v)u.voice=v;u.rate=0.92;u.pitch=1.08;u.volume=1;
    speechSynthesis.speak(u);
    if(!v)toast("Máy chưa có giọng tiếng Việt, có thể đọc chưa chuẩn.");
  }catch(e){toast("Không đọc được trên máy này.")}
}
// Giọng AI (Google Chirp 3 HD qua /api/tts). Không được thì dùng giọng có sẵn trên máy.
const ttsCache=new Map();let actx=null,asrc=null,ttsOff=false;
function speak(text){
  const AC=typeof window!=="undefined"&&(window.AudioContext||window.webkitAudioContext);
  if(ttsOff||!AC||typeof fetch!=="function"){speakDevice(text);return}
  // mở khoá âm thanh ngay trong lúc bấm (iPhone chỉ cho phát khi người dùng vừa bấm)
  try{if(!actx)actx=new AC();if(actx.state==="suspended")actx.resume()}catch(e){speakDevice(text);return}
  try{if(asrc)asrc.stop()}catch(e){}
  try{if(hasTTS())speechSynthesis.cancel()}catch(e){}
  const play=buf=>{try{const s=actx.createBufferSource();s.buffer=buf;s.connect(actx.destination);s.start(0);asrc=s}catch(e){speakDevice(text)}};
  if(ttsCache.has(text)){play(ttsCache.get(text));return}
  const ab=typeof AbortController!=="undefined"?new AbortController():null,tm=setTimeout(()=>ab&&ab.abort(),6000);
  fetch("/api/tts?t="+encodeURIComponent(text),ab?{signal:ab.signal}:{}).then(r=>{clearTimeout(tm);
    if(r.status===503){ttsOff=true;throw 0}
    if(!r.ok||!/audio/.test(r.headers.get("content-type")||""))throw 0;return r.arrayBuffer()})
    .then(b=>new Promise((ok,no)=>{const p=actx.decodeAudioData(b,ok,no);if(p&&p.then)p.then(ok,no)}))
    .then(buf=>{ttsCache.set(text,buf);play(buf)})
    .catch(()=>{clearTimeout(tm);speakDevice(text)});
}
