// Đăng nhập với Zalo (OAuth v4 + PKCE) → đổi sang tài khoản Firebase (custom token)
// Cần biến môi trường trên Cloudflare: ZALO_SECRET (khoá bí mật app Zalo), FIREBASE_SA (JSON khoá dịch vụ Firebase)
const APP_ID = "381645138886815816";
const CALLBACK = "https://pikeco.app/api/zalo";
const enc = new TextEncoder();
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uStr = s => b64u(enc.encode(s));
const rand = n => { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64u(a).slice(0, n); };
const cookie = (req, k) => { const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|; )" + k + "=([^;]*)")); return m ? decodeURIComponent(m[1]) : ""; };
const safeBack = b => (typeof b === "string" && /^\/[a-z0-9][a-z0-9-]{1,18}[a-z0-9](\/[\w\-\/]*)?$/i.test(b) ? b : "/");

async function customToken(sa, uid, claims) {
  const now = Math.floor(Date.now() / 1000);
  const head = b64uStr(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const body = b64uStr(JSON.stringify({
    iss: sa.client_email, sub: sa.client_email,
    aud: "https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit",
    iat: now, exp: now + 3600, uid, claims
  }));
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, enc.encode(head + "." + body));
  return head + "." + body + "." + b64u(sig);
}

const fail = (back, why) => Response.redirect(new URL(back + "#zerr=" + encodeURIComponent(why), CALLBACK).toString(), 302);

export async function onRequestGet(ctx) {
  const { request, env } = ctx, url = new URL(request.url);
  // Bước 1: bấm "Đăng nhập với Zalo" → tạo PKCE, chuyển sang trang cấp quyền của Zalo
  if (url.searchParams.has("start")) {
    const back = safeBack(url.searchParams.get("back") || "/");
    const verifier = rand(43), state = rand(24);
    const challenge = b64u(await crypto.subtle.digest("SHA-256", enc.encode(verifier)));
    const to = "https://oauth.zaloapp.com/v4/permission?app_id=" + APP_ID + "&redirect_uri=" + encodeURIComponent(CALLBACK) +
      "&code_challenge=" + challenge + "&state=" + state;
    const h = new Headers({ Location: to });
    h.append("Set-Cookie", `zv=${encodeURIComponent(JSON.stringify({ v: verifier, s: state, b: back }))}; Path=/api/zalo; Max-Age=600; HttpOnly; Secure; SameSite=Lax`);
    return new Response(null, { status: 302, headers: h });
  }
  // Bước 2: Zalo gửi code về → đổi lấy access token → lấy id, tên, ảnh → tạo token đăng nhập Firebase
  let st = {}; try { st = JSON.parse(cookie(request, "zv") || "{}"); } catch (e) { }
  const back = safeBack(st.b || "/");
  const code = url.searchParams.get("code"), state = url.searchParams.get("state");
  if (!code) return fail(back, "Bạn chưa cho phép đăng nhập.");
  if (!st.v || state !== st.s) return fail(back, "Phiên đăng nhập đã hết hạn, bấm đăng nhập lại.");
  if (!env.ZALO_SECRET || !env.FIREBASE_SA) return fail(back, "Máy chủ chưa cài khoá Zalo.");
  const tr = await fetch("https://oauth.zaloapp.com/v4/access_token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", secret_key: env.ZALO_SECRET },
    body: new URLSearchParams({ code, app_id: APP_ID, grant_type: "authorization_code", code_verifier: st.v })
  });
  const tj = await tr.json().catch(() => ({}));
  if (!tj.access_token) return fail(back, "Zalo không xác nhận được, thử lại.");
  // appsecret_proof = HMAC-SHA256(access_token, khoá bí mật), một số app Zalo bắt buộc
  const hk = await crypto.subtle.importKey("raw", enc.encode(env.ZALO_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const proof = [...new Uint8Array(await crypto.subtle.sign("HMAC", hk, enc.encode(tj.access_token)))].map(b => b.toString(16).padStart(2, "0")).join("");
  let me = {};
  for (const [fields, withProof] of [["id,name,picture.type(large)", true], ["id,name,picture", false], ["id", true], ["id", false]]) {
    const hd = { access_token: tj.access_token };
    if (withProof) hd.appsecret_proof = proof;
    const mr = await fetch("https://graph.zalo.me/v2.0/me?fields=" + fields, { headers: hd });
    me = await mr.json().catch(() => ({}));
    if (me.id) break;
  }
  if (!me.id) return fail(back, `Không lấy được thông tin Zalo (mã ${me.error ?? "?"}: ${String(me.message || "").slice(0, 80)}).`);
  let sa; try { sa = JSON.parse(env.FIREBASE_SA); } catch (e) { return fail(back, "Khoá Firebase trên máy chủ bị lỗi."); }
  const name = String(me.name || "").slice(0, 40), pic = me.picture && me.picture.data && me.picture.data.url || "";
  const tok = await customToken(sa, "zalo_" + me.id, { zalo: true, zname: name });
  const h = new Headers({ Location: new URL(back + "#zt=" + tok + "&zn=" + encodeURIComponent(name) + "&zp=" + encodeURIComponent(pic), CALLBACK).toString() });
  h.append("Set-Cookie", "zv=; Path=/api/zalo; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
  return new Response(null, { status: 302, headers: h });
}
