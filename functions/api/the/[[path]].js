// Ảnh thẻ chia sẻ: /api/the/<clb>/<key>.jpg → ảnh JPEG lưu ở clubs/<clb>/the/<key> (vẽ trên máy người chia sẻ).
// Chỉ đọc dữ liệu công khai (CLB riêng tư không đọc được → ảnh chung). Máy chủ không vẽ gì nên rất nhẹ.
const KEY = /^[a-z-]+(_[A-Za-z0-9_-]{1,80})?$/;
const fallback = (url, s = 300) => new Response(null, { status: 302, headers: { location: url.origin + "/og.png?v=2", "cache-control": `public, max-age=${s}` } });

export async function onRequestGet(ctx) {
  const url = new URL(ctx.request.url);
  const m = url.pathname.match(/^\/api\/the\/([a-z0-9-]{2,20})\/([A-Za-z0-9_-]{2,100})\.jpg$/);
  if (!m || !KEY.test(m[2])) return fallback(url, 3600);
  const cache = caches.default, ck = new Request(url.toString());
  const hit = await cache.match(ck); if (hit) return hit;
  const project = /(^|\.)pikeco\.app$/.test(url.hostname) ? "keo-pickleball" : "pikeco-dev-53834";
  let img = "";
  try {
    const r = await fetch(`https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/clubs/${m[1]}/the/${m[2]}?mask.fieldPaths=img`);
    if (r.ok) img = ((await r.json()).fields || {}).img?.stringValue || "";
  } catch (e) { }
  const mm = img.match(/^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/);
  if (!mm) return fallback(url);
  const bin = atob(mm[2]), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  // Có ?v= (mỗi lần chia sẻ một mã mới): giữ lâu. Không có (xem trước link web): giữ 10 phút cho kịp số liệu mới
  const res = new Response(buf, { headers: { "content-type": "image/" + mm[1], "cache-control": `public, max-age=${url.searchParams.has("v") ? 2592000 : 600}`, "access-control-allow-origin": "*" } });
  ctx.waitUntil(cache.put(ck, res.clone()));
  return res;
}
