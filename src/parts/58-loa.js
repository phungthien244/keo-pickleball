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
function speak(text,voice){
  voice=voice||cfg().voice||"";const ck=voice+"|"+text;
  const AC=typeof window!=="undefined"&&(window.AudioContext||window.webkitAudioContext);
  if(ttsOff||!AC||typeof fetch!=="function"){speakDevice(text);return}
  // mở khoá âm thanh ngay trong lúc bấm (iPhone chỉ cho phát khi người dùng vừa bấm)
  try{if(!actx)actx=new AC();if(actx.state==="suspended")actx.resume()}catch(e){speakDevice(text);return}
  try{if(asrc)asrc.stop()}catch(e){}
  try{if(hasTTS())speechSynthesis.cancel()}catch(e){}
  const play=buf=>{try{const s=actx.createBufferSource();s.buffer=buf;s.connect(actx.destination);s.start(0);asrc=s}catch(e){speakDevice(text)}};
  if(ttsCache.has(ck)){play(ttsCache.get(ck));return}
  const ab=typeof AbortController!=="undefined"?new AbortController():null,tm=setTimeout(()=>ab&&ab.abort(),text.length>220?20000:6000);
  fetch("/api/tts?"+(voice?"v="+encodeURIComponent(voice)+"&":"")+"t="+encodeURIComponent(text),ab?{signal:ab.signal}:{}).then(r=>{clearTimeout(tm);
    if(r.status===503){ttsOff=true;throw 0}
    if(!r.ok||!/audio/.test(r.headers.get("content-type")||""))throw 0;return r.arrayBuffer()})
    .then(b=>new Promise((ok,no)=>{const p=actx.decodeAudioData(b,ok,no);if(p&&p.then)p.then(ok,no)}))
    .then(buf=>{ttsCache.set(ck,buf);play(buf)})
    .catch(()=>{clearTimeout(tm);speakDevice(text)});
}

/* ----- Chọn giọng đọc (Cài đặt CLB) ----- */
const VOICE_LIST=[["vi-VN-Chirp3-HD-Aoede","Aoede · thoáng (mặc định)"],["vi-VN-Chirp3-HD-Leda","Leda · trẻ trung"],["vi-VN-Chirp3-HD-Zephyr","Zephyr · tươi sáng"],["vi-VN-Chirp3-HD-Kore","Kore · rõ ràng"],["vi-VN-Chirp3-HD-Despina","Despina · mượt"],["vi-VN-Chirp3-HD-Callirrhoe","Callirrhoe · nhẹ nhàng"],["vi-VN-Chirp3-HD-Autonoe","Autonoe · sáng"],["vi-VN-Chirp3-HD-Erinome","Erinome · trong"],["vi-VN-Chirp3-HD-Laomedeia","Laomedeia · vui"],["vi-VN-Chirp3-HD-Pulcherrima","Pulcherrima · dứt khoát"],["vi-VN-Chirp3-HD-Sulafat","Sulafat · ấm"],["vi-VN-Chirp3-HD-Vindemiatrix","Vindemiatrix · dịu"],["vi-VN-Chirp3-HD-Achernar","Achernar · mềm"],["vi-VN-Chirp3-HD-Gacrux","Gacrux · chín chắn"],["vi-VN-Wavenet-C","Wavenet C · giọng cũ"],["vi-VN-Wavenet-A","Wavenet A · giọng cũ"],["vi-VN-Neural2-A","Neural2 A · giọng cũ"]];
const VOICE_SAMPLE="Xin mời cặp anh Tuấn, chị Hà, và cặp anh Minh, chị Lan, vào sân số 1, chuẩn bị thi đấu.";
function voiceCard(){
  if(!canWrite)return "";
  const cur=cfg().voice||VOICE_LIST[0][0];
  return `<section class="card2"><h2>Giọng đọc loa</h2><div class="cb"><small class="rule">Giọng nữ AI của Google, đọc lời mời vào sân và thể thức. Bấm ▶ để nghe thử, bấm Chọn để dùng.</small>
    <div class="vlist">${VOICE_LIST.map(([v,l])=>`<div class="vrow${v===cur?" on":""}"><button class="vplay" data-act="vtry" data-v="${v}" aria-label="Nghe thử ${esc(l)}">▶</button><span>${esc(l)}</span>${v===cur?`<b>Đang dùng</b>`:`<button class="sm" data-act="vpick" data-v="${v}">Chọn</button>`}</div>`).join("")}</div></div></section>`;
}

/* ----- Xác nhận tỉ số + đọc kết quả ----- */
const pendSave=new Set();
function resultText(D,m,a,b){
  const team=ids=>ids.map(id=>{const p=D.pmap.get(id);return `${xung(p)} ${p?.name||""}`.trim()}).join(", ");
  const W=a>b?m.a:m.b,L=a>b?m.b:m.a;
  return `Sân số ${m.court} kết thúc. Cặp ${team(W)} chiến thắng, tỉ số là ${Math.max(a,b)}, ${Math.min(a,b)}.`;
}
function saveConfirm(D,m){
  if(!pendSave.has(m.id))return "";
  const a=Number(val("sa-"+m.id,"")),b=Number(val("sb-"+m.id,"")),W=a>b?m.a:m.b;
  return `<div class="cfm"><span class="r">Sân ${m.court}: <b>${W.map(id=>esc(D.pmap.get(id)?.name||"?")).join(" &amp; ")}</b> thắng <b class="num">${Math.max(a,b)}–${Math.min(a,b)}</b></span>
    <div class="two"><button class="primary" data-act="save" data-id="${m.id}">Xác nhận</button><button class="line" data-act="readres" data-id="${m.id}">📣 Đọc kết quả</button></div>
    <button class="ghost" data-act="savex" data-id="${m.id}">Sửa lại tỉ số</button></div>`;
}
