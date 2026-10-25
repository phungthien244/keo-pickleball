import { test, expect, beforeAll, afterEach } from "vitest";
import { onRequestPost } from "../functions/api/zalo-mini.js";
import { onRequestPost as unmerge } from "../functions/api/zalo-unmerge.js";
import { hmacHex, sha256Hex } from "../lib/fbtoken.js";
const zhOf = async id => (await sha256Hex("pikeco-zid:" + id)).slice(0, 32);

// Máy giữ phiên Zalo cũ (mã tài khoản lệch) → máy chủ gộp quyền, liên kết, đăng ký sang tài khoản đúng
let sa, gk, jwk;
const store = new Map();
const realFetch = globalThis.fetch;
const b64u = b => Buffer.from(b).toString("base64url");
async function idToken(sub, opt = {}) {
  const now = Math.floor(Date.now() / 1000);
  const h = b64u(JSON.stringify({ alg: "RS256", kid: opt.kid || "k1" })), p = b64u(JSON.stringify({ aud: "demo-x", iss: "https://securetoken.google.com/demo-x", sub, iat: now, exp: now + (opt.exp ?? 3600), ...(opt.zh ? { zh: opt.zh } : {}) }));
  const s = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", gk.privateKey, new TextEncoder().encode(h + "." + p));
  return h + "." + p + "." + b64u(s);
}
const sv = v => ({ stringValue: v });
beforeAll(async () => {
  const k = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", k.privateKey)).toString("base64");
  sa = { project_id: "demo-x", client_email: "sv@demo-x.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----\n` };
  gk = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  jwk = { ...(await crypto.subtle.exportKey("jwk", gk.publicKey)), kid: "k1" };
  const base = "https://firestore.googleapis.com/v1/projects/demo-x/databases/(default)/documents/";
  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "AT", expires_in: 3600 }));
    if (url.includes("securetoken@system")) return new Response(JSON.stringify({ keys: [jwk] }));
    if (url.startsWith("https://graph.zalo.me")) return new Response("{}", { status: 403 });
    const path = decodeURIComponent(url.slice(base.length).split("?")[0]);
    if (path.endsWith(":runQuery")) {
      const parent = path.slice(0, -9), q = JSON.parse(o.body).structuredQuery, coll = q.from[0].collectionId, f = q.where.fieldFilter;
      const docs = [...store].filter(([k, v]) => k.startsWith(parent + "/" + coll + "/") && k.split("/").length === parent.split("/").length + 2 && v[f.field.fieldPath]?.stringValue === f.value.stringValue);
      return new Response(JSON.stringify(docs.map(([k, v]) => ({ document: { name: base + k, fields: v } }))));
    }
    if (o.method === "PATCH") {
      if (url.includes("exists=false") && store.has(path)) return new Response("{}", { status: 409 });
      const f = JSON.parse(o.body).fields, m = [...url.matchAll(/updateMask\.fieldPaths=([^&]+)/g)].map(x => x[1]);
      store.set(path, m.length ? { ...(store.get(path) || {}), ...Object.fromEntries(m.map(k => [k, f[k]])) } : f);
      return new Response("{}");
    }
    if (o.method === "DELETE") { store.delete(path); return new Response("{}"); }
    if (!path.includes("/") || path === "clubs") {
      const docs = [...store].filter(([k]) => k.startsWith(path + "/") && k.split("/").length === 2).map(([k, v]) => ({ name: base + k, fields: v }));
      return new Response(JSON.stringify({ documents: docs }));
    }
    return store.has(path) ? new Response(JSON.stringify({ name: base + path, fields: store.get(path) })) : new Response("{}", { status: 404 });
  };
});
afterEach(() => store.clear());
const call = async body => (await onRequestPost({ request: new Request("https://x/api/zalo-mini", { method: "POST", body: JSON.stringify(body) }), env: { FIREBASE_SA: JSON.stringify(sa), ZALO_SECRET: "s3cret" } })).json();

test("phiên cũ hợp lệ: chuyển quyền chủ CLB, liên kết VĐV, đăng ký, CLB đã tạo sang tài khoản tính từ mã Zalo", async () => {
  const id = "1234567890954716", to = "zalo_" + (await hmacHex("s3cret", "mini:" + id)).slice(0, 40), from = "zalo_b94999263aaaa";
  store.set("clubs/aep", { owner: sv(from), name: sv("AEP") });
  store.set("clubs/aep/members/" + from, { role: sv("owner"), name: sv("Dũng") });
  store.set("clubs/aep/links/" + from, { status: sv("ok"), pid: sv("p1") });
  store.set("clubs/aep/links/" + to, { status: sv("pending"), pid: sv("p9") });
  store.set("clubs/aep/regs/s1_" + from, { sid: sv("s1"), uid: sv(from), name: sv("Dũng") });
  store.set("clubs/aep/regpics/s1_" + from, { uid: sv(from), img: sv("data:") });
  store.set("users/" + from, { club: sv("aep") });
  const j = await call({ id, old: await idToken(from, { zh: await zhOf(id) }) });
  expect(j.uid).toBe(to);
  expect(j.moved).toMatchObject({ members: 1, links: 1, regs: 1, clubs: 1 });
  expect(store.get("clubs/aep/members/" + to).role.stringValue).toBe("owner");
  expect(store.has("clubs/aep/members/" + from)).toBe(false);
  expect(store.get("clubs/aep/links/" + to).pid.stringValue).toBe("p1");
  expect(store.get("clubs/aep/regs/s1_" + to).uid.stringValue).toBe(to);
  expect(store.get("clubs/aep/regpics/s1_" + to).uid.stringValue).toBe(to);
  expect(store.get("clubs/aep").owner.stringValue).toBe(to);
  expect(store.get("users/" + to).club.stringValue).toBe("aep");
});

test("token giả, hết hạn, khoá lạ hoặc đã đúng tài khoản thì không chuyển gì", async () => {
  const id = "1234567890954716", from = "zalo_b94999263aaaa";
  store.set("clubs/aep", { owner: sv(from) });
  store.set("clubs/aep/members/" + from, { role: sv("owner") });
  const t = await idToken(from), bad = t.slice(0, -4) + (t.endsWith("AAAA") ? "BBBB" : "AAAA");
  expect((await call({ id, old: bad })).moved).toBeUndefined();
  expect((await call({ id, old: await idToken(from, { exp: -10 }) })).moved).toBeUndefined();
  expect((await call({ id, old: await idToken(from, { kid: "lạ" }) })).moved).toBeUndefined();
  expect(store.get("clubs/aep/members/" + from).role.stringValue).toBe("owner");
  const to = (await call({ id })).uid;
  expect((await call({ id, old: await idToken(to) })).moved).toBeUndefined();
});

test("máy đổi sang người Zalo khác: phiên cũ của người khác hoặc không có dấu thì không gộp; gộp nhầm thì tách lại được", async () => {
  const id = "222000111", to = "zalo_" + (await hmacHex("s3cret", "mini:" + id)).slice(0, 40), from = "zalo_oldowner1";
  const seed = () => { store.set("clubs/aep", { owner: sv(from) }); store.set("clubs/aep/members/" + from, { role: sv("owner") }); store.set("clubs/aep/links/" + from, { status: sv("ok"), pid: sv("p1") }); };
  seed();
  expect((await call({ id, old: await idToken(from, { zh: await zhOf("999") }) })).moved).toBeUndefined();
  expect((await call({ id, old: await idToken(from) })).moved).toBeUndefined();
  expect(store.get("clubs/aep").owner.stringValue).toBe(from);
  // giả lập bản cũ đã gộp nhầm (không kiểm dấu)
  const { moveAccount } = await import("../lib/zmove.js");
  await moveAccount(sa, from, to);
  expect(store.get("clubs/aep/members/" + to).role.stringValue).toBe("owner");
  const r = await (await unmerge({ request: new Request("https://x/api/zalo-unmerge", { method: "POST", body: JSON.stringify({ tok: await idToken(to) }) }), env: { FIREBASE_SA: JSON.stringify(sa) } })).json();
  expect(r.ok).toBe(true); expect(r.from).toBe(from);
  expect(store.get("clubs/aep").owner.stringValue).toBe(from);
  expect(store.get("clubs/aep/members/" + from).role.stringValue).toBe("owner");
  expect(store.get("clubs/aep/members/" + from).movedFrom).toBeUndefined();
  expect(store.has("clubs/aep/members/" + to)).toBe(false);
  expect(store.get("clubs/aep/links/" + from).pid.stringValue).toBe("p1");
  expect(store.has("zmoves/" + to)).toBe(false);
});
