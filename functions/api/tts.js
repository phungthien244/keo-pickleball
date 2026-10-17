// Giọng đọc loa mời vào sân. Hai nguồn, dùng nguồn nào có khoá:
//  - GEMINI_API_KEY: Gemini TTS (Google AI Studio, gói miễn phí, không cần thẻ)
//  - GOOGLE_TTS_KEY: Google Cloud Text-to-Speech Chirp 3 HD (cần bật thanh toán)
// Khoá để trong biến bí mật của Cloudflare Pages, không bao giờ gửi ra trình duyệt.
// Âm thanh được lưu đệm 30 ngày nên câu đã đọc không tốn thêm ký tự.
const VOICES = ["vi-VN-Chirp3-HD-Aoede", "vi-VN-Neural2-A", "vi-VN-Wavenet-A"];
const OK_TEXT = /^Xin mời cặp .{1,160}, vào sân số \d{1,2}, chuẩn bị thi đấu\.$/;
const OK_HOST = /(^|\.)pikeco\.app$|\.pikeco\.pages\.dev$|^pikeco\.pages\.dev$|^localhost$/;

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const text = (url.searchParams.get("t") || "").trim();
  const ref = ctx.request.headers.get("referer");
  let refOk = false; try { refOk = !!ref && OK_HOST.test(new URL(ref).hostname); } catch (e) { }
  if (ref && !refOk) return new Response("forbidden", { status: 403 });
  // Câu mời vào sân: mẫu cố định. Lời MC đọc thể thức: tự do nhưng phải gửi từ trang pikeco, tối đa 1100 ký tự.
  if (!(OK_TEXT.test(text) && text.length <= 220) && !(refOk && text.length >= 20 && text.length <= 1100)) return new Response("bad text", { status: 400 });
  const key = ctx.env.GOOGLE_TTS_KEY, gkey = ctx.env.GEMINI_API_KEY;
  if (!key && !gkey) return new Response("no key", { status: 503 });
  const cache = caches.default, ck = new Request(url.origin + "/api/tts?v=1&t=" + encodeURIComponent(text));
  const hit = await cache.match(ck);
  if (hit) return hit;
  if (gkey) {
    const wav = await gemini(gkey, text);
    if (wav) {
      const res = new Response(wav, { headers: { "content-type": "audio/wav", "cache-control": "public, max-age=2592000", "x-voice": "gemini" } });
      ctx.waitUntil(cache.put(ck, res.clone()));
      return res;
    }
    if (!key) return new Response("tts failed", { status: 502 });
  }
  for (const name of VOICES) {
    const r = await fetch("https://texttospeech.googleapis.com/v1/text:synthesize?key=" + key, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ input: { text }, voice: { languageCode: "vi-VN", name }, audioConfig: { audioEncoding: "MP3", speakingRate: name.includes("Chirp") ? 1 : 0.95 } })
    });
    if (!r.ok) continue;
    const j = await r.json();
    if (!j.audioContent) continue;
    const bin = Uint8Array.from(atob(j.audioContent), c => c.charCodeAt(0));
    const res = new Response(bin, { headers: { "content-type": "audio/mpeg", "cache-control": "public, max-age=2592000", "x-voice": name } });
    ctx.waitUntil(cache.put(ck, res.clone()));
    return res;
  }
  return new Response("tts failed", { status: 502 });
}

// ---- Gemini TTS ----
const GM = ["gemini-3.8-flash-tts", "gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];
const GVOICES = ["Sulafat", "Kore"];
const STYLE = "giọng nữ MC giải đấu, ấm áp, truyền cảm, rõ ràng, tốc độ vừa phải";
const b64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
function wavOf(pcm, rate = 24000) {
  const h = new ArrayBuffer(44), v = new DataView(h), w = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); w(8, "WAVE"); w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, "data"); v.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length); out.set(new Uint8Array(h), 0); out.set(pcm, 44); return out;
}
async function gemini(key, text) {
  for (const model of GM) for (const voice of GVOICES) {
    try {
      // Kiểu mới: Interactions API, trả về WAV
      let r = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ model, input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: STYLE }] }] }],
          response_format: { type: "audio" }, generation_config: { speech_config: [{ voice }] } })
      });
      if (r.ok) {
        const j = await r.json();
        const au = (j.steps || []).filter(s => s.type === "model_output").flatMap(s => s.content || []).filter(c => c.type === "audio" && c.data).pop();
        if (au) { const bin = b64(au.data); return /RIFF/.test(String.fromCharCode(...bin.slice(0, 4))) ? bin : wavOf(bin); }
      }
      // Kiểu cũ: generateContent, trả về PCM 24 kHz
      r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: `Đọc bằng ${STYLE}: ${text}` }] }],
          generationConfig: { responseModalities: ["AUDIO"], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } })
      });
      if (r.ok) {
        const j = await r.json(), d = j.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData;
        if (d && d.data) { const m = /rate=(\d+)/.exec(d.mimeType || ""); return wavOf(b64(d.data), m ? +m[1] : 24000); }
      }
    } catch (e) { }
  }
  return null;
}
