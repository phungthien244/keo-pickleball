// Token đăng nhập Firebase (custom token, RS256) ký bằng khoá dịch vụ, chạy trên Cloudflare
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = s => b64u(enc.encode(s));
async function signJwt(sa, payload) {
  const head = b64uStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64uStr(JSON.stringify(payload));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(head + "." + body));
  return head + "." + body + "." + b64u(sig);
}
export async function customToken(sa, uid, claims) {
  const now = Math.floor(Date.now() / 1000);
  return signJwt(sa, {
    iss: sa.client_email, sub: sa.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now, exp: now + 3600, uid, claims
  });
}
// Mã truy cập Google API (Firestore REST) bằng khoá dịch vụ, giữ lại dùng tiếp trong lúc còn hạn
let gtCache = { t: "", exp: 0, key: "" };
export async function gToken(sa, scope = "https://www.googleapis.com/auth/datastore") {
  const key = sa.client_email + "|" + scope;
  if (gtCache.t && gtCache.key === key && gtCache.exp > Date.now() + 60e3) return gtCache.t;
  const now = Math.floor(Date.now() / 1000);
  const assertion = await signJwt(sa, { iss: sa.client_email, scope, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 });
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=" + encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + assertion });
  const j = await r.json();
  if (!j.access_token) throw new Error("google token");
  gtCache = { t: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000, key };
  return j.access_token;
}
export async function sha256Hex(s) {
  return [...new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(s)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
export const randHex = n => [...crypto.getRandomValues(new Uint8Array(n))].map(b => b.toString(16).padStart(2, "0")).join("");

export async function hmacHex(key, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return [...new Uint8Array(await crypto.subtle.sign("HMAC", k, enc.encode(msg)))].map(b => b.toString(16).padStart(2, "0")).join("");
}
