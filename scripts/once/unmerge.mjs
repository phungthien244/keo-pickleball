// Chạy MỘT LẦN trên GitHub Actions: trả lại dữ liệu bị gộp nhầm (Zalo cũ → Zalo mới trên máy ảo) về tài khoản Zalo cũ.
// MODE=list: liệt kê các quyền CLB có dấu movedFrom kèm ngày tạo tài khoản. MODE=apply TO=<tài khoản nhận nhầm> FROM=<tài khoản gốc>: chuyển trả.
import { gToken } from "../../lib/fbtoken.js";
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
async function moveAccount(sa, from, to) {
  if (!from || !to || from === to) return null;
  const F = fsApi(sa, await gToken(sa));
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
    if (await move(`${P}/members/${from}`, `${P}/members/${to}`, f => { const g = { ...f }; delete g.movedFrom; return g; }, roleBetter)) n.members++;
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
  return n;
}

const sa = JSON.parse(process.env.SA);
const MODE = process.env.MODE || "list";
const at = await gToken(sa, "https://www.googleapis.com/auth/cloud-platform");
const F = fsApi(sa, at);
async function acct(uid) {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${sa.project_id}/accounts:lookup`, { method: "POST", headers: { authorization: "Bearer " + at, "content-type": "application/json" }, body: JSON.stringify({ localId: [uid] }) });
  const u = ((await r.json()).users || [])[0];
  const d = t => t ? new Date(+t).toISOString().slice(0, 16).replace("T", " ") : "-";
  return u ? `tạo ${d(u.createdAt)} · đăng nhập ${d(u.lastLoginAt)}` : "không có tài khoản";
}
console.log("::notice::Bắt đầu " + MODE);
if (MODE === "list") {
  for (const c of await F.list("clubs", "owner")) {
    const cid = tail(c.name).split("/")[1];
    for (const m of await F.list(`clubs/${cid}/members`)) {
      const f = m.fields || {}, from = f.movedFrom && f.movedFrom.stringValue;
      if (!from) continue;
      const to = tail(m.name).split("/").pop();
      console.log(`::notice::CLB ${cid} · ${f.role?.stringValue} · ${f.name?.stringValue || ""} | TO ${to} (${await acct(to)}) | FROM ${from} (${await acct(from)})`);
    }
  }
} else if (MODE === "links") {
  // Liên kết VĐV nằm ở tài khoản khác với tài khoản ghi trên hồ sơ VĐV (zuid): dấu hiệu bị chuyển
  for (const c of await F.list("clubs", "owner")) {
    const cid = tail(c.name).split("/")[1];
    const P = {}; for (const p of await F.list(`clubs/${cid}/players`)) P[tail(p.name).split("/").pop()] = p.fields || {};
    for (const l of await F.list(`clubs/${cid}/links`)) {
      const f = l.fields || {}, uid = tail(l.name).split("/").pop(), pid = f.pid?.stringValue, st = f.status?.stringValue, z = pid && P[pid]?.zuid?.stringValue;
      if (st !== "ok" || !z || z === uid) continue;
      console.log(`::notice::CLB ${cid} · VĐV ${P[pid]?.name?.stringValue || pid} | LINK ${uid} (${await acct(uid)}) | ZUID ${z} (${await acct(z)})`);
    }
  }
} else if (MODE === "detach") {
  // Gỡ liên kết VĐV và quyền CLB đã bị chuyển nhầm sang tài khoản UID (chỉ trong CLB CID)
  const UID = process.env.TUID, CID = process.env.CID;
  if (!/^zalo_[0-9a-f]{40}$/.test(UID || "") || !/^[a-z0-9-]+$/.test(CID || "")) throw new Error("UID/CID sai");
  const P = `clubs/${CID}`, l = await F.get(`${P}/links/${UID}`), m = await F.get(`${P}/members/${UID}`);
  const pid = l?.fields?.pid?.stringValue;
  console.log(`::notice::Trước: link ${l ? l.fields.status?.stringValue + " pid " + pid : "không"} · quyền ${m ? m.fields.role?.stringValue + " movedFrom " + (m.fields.movedFrom?.stringValue || "-") : "không"}`);
  for (const x of await F.list(`${P}/links`)) { const f = x.fields || {}; if (pid && f.pid?.stringValue === pid) console.log(`::notice::Liên kết của VĐV ${pid}: ${tail(x.name).split("/").pop()} · ${f.status?.stringValue}`); }
  for (const r of await F.query(P, "regs", "uid", UID)) console.log(`::notice::Đăng ký của tài khoản: ${tail(r.name).split("/").pop()}`);
  if (l) console.log(`::notice::Xoá liên kết: ${await F.del(`${P}/links/${UID}`)}`);
  if (m && m.fields.movedFrom) console.log(`::notice::Xoá quyền chuyển nhầm: ${await F.del(`${P}/members/${UID}`)}`);
} else if (MODE === "apply") {
  const TO = process.env.TO, FROM = process.env.FROM;
  if (!/^zalo_[0-9a-f]+$/.test(TO || "") || !/^zalo_[0-9a-f]+$/.test(FROM || "")) throw new Error("TO/FROM sai");
  console.log("::notice::Chuyển trả " + TO + " → " + FROM + " " + JSON.stringify(await moveAccount(sa, TO, FROM)));
}
