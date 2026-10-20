import { test, expect, beforeAll, afterEach } from "vitest";
import { onRequestPost } from "../functions/api/qr-login.js";

let sa;
const store = new Map();
const realFetch = globalThis.fetch;
beforeAll(async () => {
  const k = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const der = Buffer.from(await crypto.subtle.exportKey("pkcs8", k.privateKey)).toString("base64");
  sa = { project_id: "demo-x", client_email: "sv@demo-x.iam.gserviceaccount.com", private_key: `-----BEGIN PRIVATE KEY-----\n${der}\n-----END PRIVATE KEY-----\n` };
  globalThis.fetch = async (url, o = {}) => {
    url = String(url);
    if (url.startsWith("https://oauth2.googleapis.com/token")) return new Response(JSON.stringify({ access_token: "AT", expires_in: 3600 }));
    const m = url.match(/documents\/qrlogin\/([0-9a-f]+)/); const id = m && m[1];
    if (!id) return new Response("{}", { status: 404 });
    if (o.method === "PATCH") { if (url.includes("exists=false") && store.has(id)) return new Response("{}", { status: 409 }); store.set(id, JSON.parse(o.body).fields); return new Response("{}"); }
    if (o.method === "DELETE") { store.delete(id); return new Response("{}"); }
    return store.has(id) ? new Response(JSON.stringify({ fields: store.get(id) })) : new Response("{}", { status: 404 });
  };
});
afterEach(() => store.clear());
const call = async body => (await onRequestPost({ request: new Request("https://x/api/qr-login", { method: "POST", body: JSON.stringify(body) }), env: { FIREBASE_SA: JSON.stringify(sa) } })).json();

test("đăng nhập web bằng Zalo: tạo mã, chờ, Mini App đồng ý, nhận token một lần", async () => {
  const n = await call({ op: "new" });
  expect(n.tok).toMatch(/^[0-9a-f]{48}$/); expect(n.s).toMatch(/^[0-9a-f]{64}$/);
  expect(store.get(n.tok).st.stringValue).toBe("wait");
  expect(JSON.stringify(store.get(n.tok))).not.toContain(n.s);
  expect(await call({ op: "claim", tok: n.tok, s: n.s })).toEqual({ wait: true });
  expect((await call({ op: "claim", tok: n.tok, s: "0".repeat(64) })).error).toMatch(/không khớp/);
  store.get(n.tok).st = { stringValue: "ok" }; store.get(n.tok).uid = { stringValue: "zalo_abc123" };
  const c = await call({ op: "claim", tok: n.tok, s: n.s });
  expect(c.uid).toBe("zalo_abc123");
  const body = JSON.parse(Buffer.from(c.token.split(".")[1], "base64url").toString());
  expect(body).toMatchObject({ uid: "zalo_abc123", claims: { zalo: true, qr: true } });
  expect(store.has(n.tok)).toBe(false);
  expect((await call({ op: "claim", tok: n.tok, s: n.s })).error).toMatch(/không còn/);
});

test("mã hết hạn, bị từ chối, uid lạ đều không cấp token", async () => {
  const a = await call({ op: "new" });
  store.get(a.tok).exp = { integerValue: String(Date.now() - 1) };
  expect((await call({ op: "claim", tok: a.tok, s: a.s })).error).toMatch(/hết hạn/);
  const b = await call({ op: "new" });
  store.get(b.tok).st = { stringValue: "no" };
  expect((await call({ op: "claim", tok: b.tok, s: b.s })).no).toBe(true);
  const c = await call({ op: "new" });
  store.get(c.tok).st = { stringValue: "ok" }; store.get(c.tok).uid = { stringValue: "own" };
  expect((await call({ op: "claim", tok: c.tok, s: c.s })).token).toBeUndefined();
});
