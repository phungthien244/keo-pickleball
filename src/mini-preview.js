// Xem thử Zalo Mini App trên trình duyệt (chỉ bản thử demo, dữ liệu giả):
// giả lập khung Zalo + SDK Zalo; ?nguoi=moi để làm một người dùng Zalo mới chưa từng vào app.
import BODY from "../miniapp/src/body.html?raw";
import "./styles/app.css";
import "../miniapp/src/mini.css";
(function () {
  const q = new URLSearchParams(location.search);
  if (q.get("nguoi") === "moi") {
    try {
      ["pb-mini-last", "pb-mini-clubs", "pb-zprof"].forEach(k => localStorage.removeItem(k));
      sessionStorage.setItem("pb-mock-zuid", "u" + Math.random().toString(36).slice(2, 8));

    } catch (e) {}
    q.delete("nguoi"); history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q : ""));
  }
  let zid = "";
  try { zid = sessionStorage.getItem("pb-mock-zuid") || "demo"; sessionStorage.setItem("pb-mock-zuid", zid); sessionStorage.setItem("pb-mock-zalo", "1"); sessionStorage.removeItem("pb-mock-khach"); } catch (e) { zid = "demo"; }
  window.ZMINI = 1;
  if (/[?&]debug\b/.test(location.search)) { window.APP_ENV = "TESTING"; window.APP_VERSION = "99"; }
  window.ZMP = {
    getUserID: async () => zid,
    getAccessToken: async () => "",
    getUserInfo: async () => ({ userInfo: { id: zid, name: zid === "demo" ? "Người chơi Zalo" : "Người chơi " + zid.slice(1, 4).toUpperCase(), avatar: "" } }),
    openWebview: async ({ url }) => { window.open(url, "_blank"); },
    openShareSheet: async o => { const t = document.createElement("pre"); t.className = "pvshare"; t.textContent = "(Bản thử) Zalo chia sẻ · " + o.type + "\n\n" + (o.data.text || o.data.link || JSON.stringify(o.data, null, 1)); t.style.cssText = "position:fixed;left:12px;right:12px;bottom:80px;z-index:99;background:#fff;color:#111;border:2px solid #0068ff;padding:12px;font:13px/1.45 system-ui;white-space:pre-wrap;max-height:60vh;overflow:auto;box-shadow:0 8px 30px rgba(0,0,0,.25)"; document.body.appendChild(t); setTimeout(() => t.remove(), 6000); return {}; },
    openChat: async ({ id, message }) => { const t = document.createElement("div"); t.className = "pvchat"; t.textContent = "(Bản thử) Mở chat Zalo với " + id + (message ? ": " + message : ""); t.style.cssText = "position:fixed;left:12px;right:12px;top:56px;z-index:99;background:#0068ff;color:#fff;padding:10px 12px;font:600 13px system-ui"; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); }
  };
  document.documentElement.classList.add("mini", "minipv");
  // Thanh Zalo đã ẩn (actionBarHidden): chỉ còn nút "··· ✕" nổi góc phải như trong Zalo
  const bar = document.createElement("div");
  bar.className = "zbar";
  bar.innerHTML = `<span class="zcap" aria-hidden="true"><i>···</i><i>✕</i></span>`;
  document.body.appendChild(bar);
  // ?sat=47: giả lập thanh trạng thái trong suốt (iPhone) để xem thanh đầu / poster tràn lên mép trên
  const sat = +(q.get("sat") || 0);
  if (sat) { document.documentElement.style.setProperty("--sat", sat + "px"); bar.style.top = (sat + 4) + "px";
    const sb = document.createElement("div"); sb.textContent = "9:41"; sb.style.cssText = `position:fixed;top:0;left:0;right:0;height:${sat}px;z-index:61;pointer-events:none;color:#fff;font:600 15px system-ui;display:flex;align-items:center;padding:6px 28px 0;box-sizing:border-box;text-shadow:0 0 4px rgba(0,0,0,.4)`; document.body.appendChild(sb); }
  document.body.insertAdjacentHTML("beforeend", BODY);
  const st = document.createElement("style");
  st.textContent = `[hidden]{display:none!important}img{max-width:100%}
  .zbar{position:fixed;top:8px;right:8px;z-index:60;pointer-events:none;font:600 16px system-ui;color:#fff}
  .zcap{display:flex;background:rgba(0,0,0,.22);border:1px solid rgba(255,255,255,.35);border-radius:16px;overflow:hidden}.zcap i{font-style:normal;padding:2px 10px;font-size:13px}.zcap i+i{border-left:1px solid rgba(255,255,255,.35)}
  @media(min-width:520px){html.minipv body{max-width:400px;margin:0 auto;box-shadow:0 0 0 1px #ccd}html.minipv .mnav{max-width:400px;margin:0 auto}}`;
  document.head.appendChild(st);
  const f = document.createElement("link"); f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600&display=swap";
  document.head.appendChild(f);
})();
import("./firebase.js").then(() => import("virtual:app"));
