// Tách tài khoản Zalo bị gộp nhầm (máy đổi sang người Zalo khác nhưng bản cũ đã gộp quyền, liên kết, đăng ký của người trước).
// Người đang đăng nhập (tài khoản đã nhận dữ liệu) tự trả lại toàn bộ cho tài khoản gốc ghi trong nhật ký gộp.
// Chỉ "cho đi" dữ liệu của chính mình, nên không lấy được gì của người khác.
import { verifyIdToken, moveAccount, movedFromOf } from "../../lib/zmove.js";
const CORS = { "access-control-allow-origin": "*", "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type" };
const out = (o, status = 200) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json", ...CORS } });
export const onRequestOptions = () => new Response(null, { status: 204, headers: CORS });
export async function onRequestPost({ request, env }) {
  let b = {}; try { b = JSON.parse(await request.text()); } catch (e) { }
  if (!env.FIREBASE_SA) return out({ error: "Máy chủ chưa cài khoá." }, 503);
  let sa; try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { return out({ error: "Khoá Firebase lỗi." }, 500); }
  const me = await verifyIdToken(String(b.tok || ""), sa.project_id).catch(() => null);
  if (!me || !/^zalo_[0-9A-Za-z]+$/.test(me)) return out({ error: "Cần đăng nhập bằng Zalo." }, 401);
  const from = await movedFromOf(sa, me).catch(() => "");
  if (!from || from === me || !/^zalo_[0-9A-Za-z]+$/.test(from)) return out({ error: "Tài khoản này không có dữ liệu gộp từ tài khoản khác." }, 404);
  if (b.check) return out({ from });
  const n = await moveAccount(sa, me, from, { undo: true });
  return out({ ok: true, from, n });
}
