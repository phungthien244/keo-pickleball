// Đổi token số điện thoại (getPhoneNumber trong Zalo Mini App) thành số thật.
// Cần khoá bí mật của Zalo App (ZALO_APP_SECRET, lấy ở developers.zalo.me) đặt trong Cloudflare. Token chỉ dùng được 1 lần, hết hạn sau 2 phút.
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...CORS } });
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = JSON.parse(await request.text()); } catch (e) { }
  const code = String(b.code || ""), at = String(b.at || "");
  if (!code || !at || code.length > 2000 || at.length > 2000) return out({ error: "Thiếu token." }, 400);
  if (!env.ZALO_APP_SECRET) return out({ error: "Máy chủ chưa cài khoá Zalo App." }, 503);
  try {
    const r = await fetch("https://graph.zalo.me/v2.0/me/info", { headers: { access_token: at, code, secret_key: env.ZALO_APP_SECRET } });
    const j = await r.json().catch(() => ({}));
    const n = j && j.data && j.data.number;
    if (n) return out({ number: String(n) });
    return out({ error: (j && (j.message || j.error)) ? String(j.message || j.error) : "Zalo không trả số." }, 502);
  } catch (e) { return out({ error: "Không gọi được Zalo." }, 502); }
}
