// Đăng nhập web bằng Zalo Mini App (quét mã QR, kiểu Zalo Web):
// 1. Trình duyệt xin mã: máy chủ tạo qrlogin/<tok> {st:"wait", sh: SHA-256(bí mật), exp}, trả tok + bí mật cho đúng trình duyệt đó.
// 2. Người dùng quét mã bằng Zalo, Mini App (đã đăng nhập zalo_…) bấm Đồng ý: ghi st:"ok", uid = chính mình (Rules kiểm tra).
// 3. Trình duyệt gửi tok + bí mật: máy chủ đối chiếu, xoá mã (dùng một lần), cấp token đăng nhập Firebase cho uid đó.
import { customToken, gToken, sha256Hex, randHex } from "../../lib/fbtoken.js";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...CORS } });
const TTL = 3 * 60e3;

export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = JSON.parse(await request.text()); } catch (e) { }
  if (!env.FIREBASE_SA) return out({ error: "Máy chủ chưa cài khoá." }, 503);
  let sa; try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { return out({ error: "Khoá Firebase lỗi." }, 500); }
  const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents/qrlogin/`;
  let at; try { at = await gToken(sa); } catch (e) { return out({ error: "Chưa kết nối được máy chủ dữ liệu." }, 502); }
  const H = { authorization: "Bearer " + at, "content-type": "application/json" };
  if (b.op === "new") {
    const tok = randHex(24), s = randHex(32), now = Date.now(), exp = now + TTL;
    const fields = { st: { stringValue: "wait" }, sh: { stringValue: await sha256Hex(s) }, exp: { integerValue: String(exp) }, at: { integerValue: String(now) },
      ttl: { timestampValue: new Date(now + 864e5).toISOString() } };
    const r = await fetch(base + tok + "?currentDocument.exists=false", { method: "PATCH", headers: H, body: JSON.stringify({ fields }) });
    if (!r.ok) return out({ error: "Chưa tạo được mã." }, 502);
    return out({ tok, s, exp });
  }
  if (b.op === "claim") {
    const tok = String(b.tok || ""), s = String(b.s || "");
    if (!/^[0-9a-f]{48}$/.test(tok) || !/^[0-9a-f]{64}$/.test(s)) return out({ error: "Mã không hợp lệ." }, 400);
    const r = await fetch(base + tok, { headers: H });
    if (r.status === 404) return out({ error: "Mã không còn." }, 410);
    if (!r.ok) return out({ error: "Chưa đọc được mã." }, 502);
    const f = (await r.json()).fields || {}, v = k => f[k] ? (f[k].stringValue ?? f[k].integerValue) : undefined;
    if (v("sh") !== await sha256Hex(s)) return out({ error: "Mã không khớp." }, 403);
    if (Number(v("exp")) < Date.now()) { await fetch(base + tok, { method: "DELETE", headers: H }); return out({ error: "Mã đã hết hạn." }, 410); }
    if (v("st") === "no") { await fetch(base + tok, { method: "DELETE", headers: H }); return out({ error: "Đã từ chối trên Zalo.", no: true }, 403); }
    if (v("st") !== "ok") return out({ wait: true });
    const uid = String(v("uid") || "");
    if (!/^zalo_[0-9A-Za-z]+$/.test(uid)) return out({ error: "Tài khoản không hợp lệ." }, 403);
    await fetch(base + tok, { method: "DELETE", headers: H });
    return out({ token: await customToken(sa, uid, { zalo: true, qr: true }), uid });
  }
  return out({ error: "Thiếu thao tác." }, 400);
}
