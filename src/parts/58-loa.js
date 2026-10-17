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
function speakDevice(text,tok){
  if(!hasTTS()){toast("Trình duyệt này chưa hỗ trợ đọc loa.");loaDone(tok);return}
  try{
    speechSynthesis.cancel();
    const u=new SpeechSynthesisUtterance(text),v=viVoice();
    u.lang="vi-VN";if(v)u.voice=v;u.rate=0.92;u.pitch=1.08;u.volume=1;u.onend=u.onerror=()=>loaDone(tok);
    speechSynthesis.speak(u);
    if(!v)toast("Máy chưa có giọng tiếng Việt, có thể đọc chưa chuẩn.");
  }catch(e){toast("Không đọc được trên máy này.");loaDone(tok)}
}
// Giọng AI (Google Chirp 3 HD qua /api/tts). Không được thì dùng giọng có sẵn trên máy.
const ttsCache=new Map();let actx=null,asrc=null,ttsOff=false;
// Trạng thái loa: đang đọc nút nào (để đổi thành nút đỏ Dừng), và tắt loa trên máy này.
const LOA={key:null,tok:0};
let MUTE=null;
const loaMuted=()=>{if(MUTE===null){try{MUTE=localStorage.getItem("pb-mute")==="1"}catch(e){MUTE=false}}return MUTE};
function loaSetMute(on){MUTE=!!on;try{localStorage.setItem("pb-mute",on?"1":"0")}catch(e){}}
function loaDone(tok){if(tok!==undefined&&tok!==LOA.tok)return;if(LOA.key!==null){LOA.key=null;render()}}
function stopSpeak(){LOA.tok++;try{if(asrc){asrc.onended=null;asrc.stop()}}catch(e){}asrc=null;try{if(hasTTS())speechSynthesis.cancel()}catch(e){}if(LOA.key!==null){LOA.key=null;render()}}
// Nút loa: khi đang đọc thì hiện nút đỏ "Dừng"
function spkBtn(key,html){return LOA.key===key?`<button class="spkstop" data-act="spkstop" aria-label="Dừng đọc">■ Dừng</button>`:html}
function muteFab(){
  if(!canWrite)return "";
  if(LOA.key!==null)return `<button class="mutefab stop" data-act="spkstop" aria-label="Dừng đọc">■ Dừng đọc</button>`;
  const m=loaMuted();return `<button class="mutefab${m?" off":""}" data-act="mute" aria-pressed="${m}" aria-label="${m?"Bật loa":"Tắt loa"}">${m?"🔇 Loa tắt":"🔊 Loa bật"}</button>`;
}
function speak(text,voice,key,force){
  if(loaMuted()&&!force){toast("Loa đang tắt. Bấm nút 🔇 ở góc dưới để bật.");return}
  stopSpeak();const tok=LOA.tok;LOA.key=key||"x";render();
  voice=voice||cfg().voice||"";const ck=voice+"|"+text;
  const AC=typeof window!=="undefined"&&(window.AudioContext||window.webkitAudioContext);
  if(ttsOff||!AC||typeof fetch!=="function"){speakDevice(text,tok);return}
  // mở khoá âm thanh ngay trong lúc bấm (iPhone chỉ cho phát khi người dùng vừa bấm)
  try{if(!actx)actx=new AC();if(actx.state==="suspended")actx.resume()}catch(e){speakDevice(text,tok);return}
  const play=buf=>{if(tok!==LOA.tok)return;try{const s=actx.createBufferSource();s.buffer=buf;s.connect(actx.destination);s.onended=()=>loaDone(tok);s.start(0);asrc=s}catch(e){speakDevice(text,tok)}};
  if(ttsCache.has(ck)){play(ttsCache.get(ck));return}
  const ab=typeof AbortController!=="undefined"?new AbortController():null,tm=setTimeout(()=>ab&&ab.abort(),text.length>220?20000:6000);
  fetch("/api/tts?"+(voice?"v="+encodeURIComponent(voice)+"&":"")+"t="+encodeURIComponent(text),ab?{signal:ab.signal}:{}).then(r=>{clearTimeout(tm);
    if(r.status===503){ttsOff=true;throw 0}
    if(!r.ok||!/audio/.test(r.headers.get("content-type")||""))throw 0;return r.arrayBuffer()})
    .then(b=>new Promise((ok,no)=>{const p=actx.decodeAudioData(b,ok,no);if(p&&p.then)p.then(ok,no)}))
    .then(buf=>{ttsCache.set(ck,buf);play(buf)})
    .catch(()=>{clearTimeout(tm);if(tok===LOA.tok)speakDevice(text,tok)});
}

/* ----- Chọn giọng đọc (Cài đặt CLB) ----- */
const VOICE_LIST=[["vi-VN-Chirp3-HD-Aoede","Aoede · thoáng (mặc định)"],["vi-VN-Chirp3-HD-Leda","Leda · trẻ trung"],["vi-VN-Chirp3-HD-Zephyr","Zephyr · tươi sáng"],["vi-VN-Chirp3-HD-Kore","Kore · rõ ràng"],["vi-VN-Chirp3-HD-Despina","Despina · mượt"],["vi-VN-Chirp3-HD-Callirrhoe","Callirrhoe · nhẹ nhàng"],["vi-VN-Chirp3-HD-Autonoe","Autonoe · sáng"],["vi-VN-Chirp3-HD-Erinome","Erinome · trong"],["vi-VN-Chirp3-HD-Laomedeia","Laomedeia · vui"],["vi-VN-Chirp3-HD-Pulcherrima","Pulcherrima · dứt khoát"],["vi-VN-Chirp3-HD-Sulafat","Sulafat · ấm"],["vi-VN-Chirp3-HD-Vindemiatrix","Vindemiatrix · dịu"],["vi-VN-Chirp3-HD-Achernar","Achernar · mềm"],["vi-VN-Chirp3-HD-Gacrux","Gacrux · chín chắn"],["vi-VN-Wavenet-C","Wavenet C · giọng cũ"],["vi-VN-Wavenet-A","Wavenet A · giọng cũ"],["vi-VN-Neural2-A","Neural2 A · giọng cũ"],["vi-VN-Chirp3-HD-Charon","Charon · rõ ràng, chuẩn","M"],["vi-VN-Chirp3-HD-Puck","Puck · hào hứng","M"],["vi-VN-Chirp3-HD-Fenrir","Fenrir · sôi nổi","M"],["vi-VN-Chirp3-HD-Orus","Orus · chắc giọng","M"],["vi-VN-Chirp3-HD-Achird","Achird · thân thiện","M"],["vi-VN-Chirp3-HD-Algenib","Algenib · trầm khàn","M"],["vi-VN-Chirp3-HD-Algieba","Algieba · mượt","M"],["vi-VN-Chirp3-HD-Alnilam","Alnilam · dứt khoát","M"],["vi-VN-Chirp3-HD-Enceladus","Enceladus · nhẹ, hơi thở","M"],["vi-VN-Chirp3-HD-Iapetus","Iapetus · trong","M"],["vi-VN-Chirp3-HD-Rasalgethi","Rasalgethi · truyền đạt","M"],["vi-VN-Chirp3-HD-Sadachbia","Sadachbia · sinh động","M"],["vi-VN-Chirp3-HD-Sadaltager","Sadaltager · điềm tĩnh","M"],["vi-VN-Chirp3-HD-Schedar","Schedar · đều giọng","M"],["vi-VN-Chirp3-HD-Umbriel","Umbriel · thoải mái","M"],["vi-VN-Chirp3-HD-Zubenelgenubi","Zubenelgenubi · tự nhiên","M"],["vi-VN-Neural2-D","Neural2 D · giọng cũ","M"],["vi-VN-Wavenet-B","Wavenet B · giọng cũ","M"],["vi-VN-Wavenet-D","Wavenet D · giọng cũ","M"]];
const VOICE_SAMPLE="Xin mời cặp anh Tuấn, chị Hà, và cặp anh Minh, chị Lan, vào sân số 1, chuẩn bị thi đấu.";
const VGOPEN=new Set();
function voiceCard(){
  if(!canWrite)return "";
  const cur=cfg().voice||VOICE_LIST[0][0],curL=(VOICE_LIST.find(x=>x[0]===cur)||VOICE_LIST[0]);
  const row=([v,l])=>`<div class="vrow${v===cur?" on":""}">${spkBtn("v:"+v,`<button class="vplay" data-act="vtry" data-v="${v}" aria-label="Nghe thử ${esc(l)}">▶</button>`)}<span>${esc(l)}</span>${v===cur?`<b>Đang dùng</b>`:`<button class="sm" data-act="vpick" data-v="${v}">Chọn</button>`}</div>`;
  const grp=(g,t)=>{const list=VOICE_LIST.filter(x=>(x[2]==="M"?"M":"F")===g),o=VGOPEN.has(g),has=list.some(x=>x[0]===cur);
    return `<button class="vhead${o?" open":""}" data-act="vgrp" data-g="${g}" aria-expanded="${o}"><span>${t} <small>(${list.length})</small></span>${has?`<em>đang dùng</em>`:""}<i aria-hidden="true">${o?"▴":"▾"}</i></button>${o?`<div class="vlist">${list.map(row).join("")}</div>`:""}`};
  return `<section class="card2"><h2>Giọng đọc loa</h2><div class="cb"><small class="rule">Đang dùng: <b>${esc(curL[1])}</b>. Bấm nhóm để xem danh sách, ▶ để nghe thử, Chọn để dùng.</small>
    ${grp("F","Giọng nữ")}${grp("M","Giọng nam")}</div></section>`;
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
    <button class="primary" data-act="save" data-read="1" data-id="${m.id}">✓ Xác nhận${loaMuted()?"":" &amp; đọc kết quả"}</button>
    <button class="ghost" data-act="savex" data-id="${m.id}">Sửa lại tỉ số</button></div>`;
}
