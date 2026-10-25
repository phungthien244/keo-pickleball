// Gộp tài khoản Zalo: máy đang giữ phiên đăng nhập cũ (mã tài khoản khác với mã tính từ ID Zalo hiện tại)
// → chuyển quyền CLB, liên kết VĐV, đăng ký, CLB đã tạo từ tài khoản cũ sang tài khoản đúng.
// Chỉ chạy khi máy chứng minh được đang đăng nhập tài khoản cũ (ID token Firebase hợp lệ).
import { gToken } from "./fbtoken.js";

const JWKS = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
const b64uDec = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4)), c => c.charCodeAt(0));

// ID token Firebase của phiên cũ → uid (kiểm chữ ký RS256 bằng khoá công khai của Google, hạn, dự án)
export async function verifyIdToken(tok, projectId) { const b = await verifyIdTokenBody(tok, projectId); return b ? String(b.sub) : null; }
// Như trên nhưng trả cả nội dung token (có các claim riêng như zh)
export async function verifyIdTokenBody(tok, projectId) {
  const [h, p, s] = String(tok || "").split(".");
  if (!h || !p || !s) return null;
  let head, body;
  try { head = JSON.parse(new TextDecoder().decode(b64uDec(h))); body = JSON.parse(new TextDecoder().decode(b64uDec(p))); } catch (e) { return null; }
  if (head.alg !== "RS256" || !head.kid) return null;
  const now = Math.floor(Date.now() / 1000);
  if (body.aud !== projectId || body.iss !== "https://securetoken.google.com/" + projectId || !(body.exp > now) || !(body.iat <= now + 300) || !body.sub) return null;
  const keys = (await (await fetch(JWKS)).json()).keys || [];
  const jwk = keys.find(k => k.kid === head.kid);
  if (!jwk) return null;
  const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64uDec(s), new TextEncoder().encode(h + "." + p));
  return ok ? body : null;
}

// Firestore REST bằng khoá dịch vụ
function fsApi(sa, at) {
  const base = `https://firestore.googleapis.com/v1/projects/${sa.project_id}/databases/(default)/documents`;
  const H = { authorization: "Bearer " + at, "content-type": "application/json" };
  return {
    base,
    get: async path => { const r = await fetch(`${base}/${path}`, { headers: H }); return r.ok ? r.json() : null; },
    create: async (path, fields) => (await fetch(`${base}/${path}?currentDocument.exists=false`, { method: "PATCH", headers: H, body: JSON.stringify({ fields }) })).ok,
    patch: async (path, fields, mask) => (await fetch(`${base}/${path}?${mask.map(m => "updateMask.fieldPaths=" + m).join("&")}`, { method: "PATCH", headers: H, body: JSON.stringify({ fields }) })).ok,
    del: async path => (await fetch(`${base}/${path}`, { method: "DELETE", headers: H })).ok,
    list: async (path, mask) => { const r = await fetch(`${base}/${path}?pageSize=300${mask ? "&mask.fieldPaths=" + mask : ""}`, { headers: H }); return r.ok ? ((await r.json()).documents || []) : []; },
    query: async (parent, coll, field, value) => {
      const r = await fetch(`${base}/${parent}:runQuery`, { method: "POST", headers: H, body: JSON.stringify({ structuredQuery: { from: [{ collectionId: coll }], where: { fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: { stringValue: value } } }, limit: 200 } }) });
      return r.ok ? (await r.json()).filter(x => x.document).map(x => x.document) : [];
    }
  };
}
const tail = name => name.split("/documents/")[1];

// Chuyển dữ liệu của tài khoản cũ sang tài khoản mới. Đã có ở tài khoản mới thì giữ bản mới (chỉ bỏ bản cũ khi trùng vai trò).
export async function moveAccount(sa, from, to, opt = {}) {
  if (!from || !to || from === to) return null;
  const F = fsApi(sa, await gToken(sa));
  // Nhật ký gộp (chỉ máy chủ đọc/ghi): để tách lại nếu gộp nhầm
  if (!opt.undo) await F.patch("zmoves/" + to, { from: { stringValue: from }, at: { integerValue: String(Date.now()) } }, []);
  const n = { members: 0, links: 0, regs: 0, clubs: 0 };
  // Đã có ở tài khoản mới: chỉ ghi đè khi bản cũ "tốt hơn" (better(cũ, mới)), rồi bỏ bản cũ
  const move = async (a, b, edit, better) => {
    const d = await F.get(a);if (!d) return false;
    const f = edit ? edit(d.fields || {}) : (d.fields || {});
    if (await F.create(b, f)) { await F.del(a); return true; }
    const cur = better && await F.get(b);
    if (cur && better(d.fields || {}, cur.fields || {}) && await F.patch(b, f, [])) { await F.del(a); return true; }
    return false;
  };
  const RANK = { owner: 4, admin: 3, scorer: 2 }, sv = (f, k) => (f[k] && f[k].stringValue) || "";
  const roleBetter = (o, nw) => (RANK[sv(o, "role")] || 0) > (RANK[sv(nw, "role")] || 0);
  const linkBetter = (o, nw) => sv(o, "status") === "ok" && sv(nw, "status") !== "ok";
  // Mỗi tài khoản một CLB đã tạo
  const u = await F.get("users/" + from);
  if (u && await move("users/" + from, "users/" + to)) n.users = 1;
  const clubs = await F.list("clubs", "owner");
  for (const c of clubs) {
    const cid = tail(c.name).split("/")[1], P = "clubs/" + cid;
    if ((c.fields?.owner?.stringValue) === from && await F.patch(P, { owner: { stringValue: to } }, ["owner"])) n.clubs++;
    if (await move(`${P}/members/${from}`, `${P}/members/${to}`, f => { const g = { ...f }; if (opt.undo) delete g.movedFrom; else g.movedFrom = { stringValue: from }; return g; }, roleBetter)) n.members++;
    if (await move(`${P}/links/${from}`, `${P}/links/${to}`, null, linkBetter)) n.links++;
    for (const r of await F.query(P, "regs", "uid", from)) {
      const id = tail(r.name).split("/").pop(), nid = id.endsWith("_" + from) ? id.slice(0, -from.length) + to : id + "_m";
      if (await F.create(`${P}/regs/${nid}`, { ...r.fields, uid: { stringValue: to } })) {
        await F.del(`${P}/regs/${id}`); n.regs++;
        const pic = await F.get(`${P}/regpics/${id}`);
        if (pic && await F.create(`${P}/regpics/${nid}`, { ...pic.fields, uid: { stringValue: to } })) await F.del(`${P}/regpics/${id}`);
      }
    }
  }
  if (opt.undo) await F.del("zmoves/" + from);
  return n;
}
// Tách lại: tài khoản "to" đã nhận dữ liệu từ "from" (theo nhật ký gộp hoặc dấu movedFrom ở quyền CLB)?
export async function movedFromOf(sa, to) {
  const F = fsApi(sa, await gToken(sa));
  const z = await F.get("zmoves/" + to);
  if (z && z.fields && z.fields.from) return z.fields.from.stringValue;
  for (const c of await F.list("clubs", "owner")) {
    const cid = tail(c.name).split("/")[1], m = await F.get(`clubs/${cid}/members/${to}`);
    if (m && m.fields && m.fields.movedFrom) return m.fields.movedFrom.stringValue;
  }
  return "";
}
