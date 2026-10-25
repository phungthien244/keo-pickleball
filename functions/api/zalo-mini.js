// Đăng nhập từ Zalo Mini App: app gửi ID người dùng Zalo (getUserID) + access token → trả token đăng nhập Firebase
// Zalo chặn máy chủ ngoài Việt Nam đọc thông tin người dùng, nên chỉ đối chiếu được khi Zalo cho phép.
// Mã tài khoản = zalo_ + HMAC(ID Zalo): không lộ ID Zalo thật trong dữ liệu công khai.
import { customToken, hmacHex } from "../../lib/fbtoken.js";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...CORS } });

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = JSON.parse(await request.text()); } catch (e) { }
  const id = String(b.id || "");
  if (!/^[0-9A-Za-z_-]{5,64}$/.test(id)) return out({ error: "Thiếu mã Zalo." }, 400);
  if (!env.ZALO_SECRET || !env.FIREBASE_SA) return out({ error: "Máy chủ chưa cài khoá." }, 503);
  let verified = false;
  if (b.at) {
    try {
      const r = await fetch("https://graph.zalo.me/v2.0/me?fields=id", { headers: { access_token: String(b.at) } });
      const me = await r.json();
      if (me && me.id) { if (String(me.id) !== id) return out({ error: "Mã Zalo không khớp." }, 403); verified = true; }
    } catch (e) { }
  }
  let sa; try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { return out({ error: "Khoá Firebase lỗi." }, 500); }
  const uid = "zalo_" + (await hmacHex(env.ZALO_SECRET, "mini:" + id)).slice(0, 40);
  // Đăng nhập đúng tài khoản của mã Zalo đang mở app, không gộp hay chuyển dữ liệu từ phiên khác
  const token = await customToken(sa, uid, { zalo: true, zv: verified });
  return out({ token, uid, verified });
}
