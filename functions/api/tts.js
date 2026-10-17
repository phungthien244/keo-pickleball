// Giọng đọc loa mời vào sân: Google Cloud Text-to-Speech (Chirp 3 HD, giọng nữ tiếng Việt).
// Khoá API để trong biến bí mật GOOGLE_TTS_KEY của Cloudflare Pages, không bao giờ gửi ra trình duyệt.
// Âm thanh được lưu đệm 30 ngày nên câu đã đọc không tốn thêm ký tự.
const VOICES = ["vi-VN-Chirp3-HD-Aoede", "vi-VN-Neural2-A", "vi-VN-Wavenet-A"];
const OK_TEXT = /^Xin mời cặp .{1,160}, vào sân số \d{1,2}, chuẩn bị thi đấu\.$/;
const OK_HOST = /(^|\.)pikeco\.app$|\.pikeco\.pages\.dev$|^pikeco\.pages\.dev$|^localhost$/;

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const text = (url.searchParams.get("t") || "").slice(0, 220);
  if (!OK_TEXT.test(text)) return new Response("bad text", { status: 400 });
  const ref = ctx.request.headers.get("referer");
  if (ref) { try { if (!OK_HOST.test(new URL(ref).hostname)) return new Response("forbidden", { status: 403 }); } catch (e) { return new Response("forbidden", { status: 403 }); } }
  const key = ctx.env.GOOGLE_TTS_KEY;
  if (!key) return new Response("no key", { status: 503 });
  const cache = caches.default, ck = new Request(url.origin + "/api/tts?v=1&t=" + encodeURIComponent(text));
  const hit = await cache.match(ck);
  if (hit) return hit;
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
