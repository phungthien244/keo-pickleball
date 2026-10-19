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
  window.ZMP = {
    getUserID: async () => zid,
    getAccessToken: async () => "",
    getUserInfo: async () => ({ userInfo: { id: zid, name: zid === "demo" ? "Người chơi Zalo" : "Khách " + zid.slice(1, 4).toUpperCase(), avatar: "" } }),
    openWebview: async ({ url }) => { window.open(url, "_blank"); },
    openShareSheet: async () => ({})
  };
  document.documentElement.classList.add("mini", "minipv");
  // Khung giống thanh tiêu đề Zalo
  const bar = document.createElement("div");
  bar.className = "zbar";
  bar.innerHTML = `<span class="zb" aria-hidden="true">‹</span><b>Pikeco</b><span class="zcap" aria-hidden="true"><i>···</i><i>✕</i></span>`;
  document.body.appendChild(bar);
  document.body.insertAdjacentHTML("beforeend", BODY);
  const st = document.createElement("style");
  st.textContent = `[hidden]{display:none!important}img{max-width:100%}
  .zbar{position:sticky;top:0;z-index:50;display:flex;align-items:center;gap:10px;height:44px;padding:0 12px;background:#0c2b44;color:#fff;font:600 16px system-ui}
  .zbar b{flex:1}.zbar .zb{font-size:26px;line-height:1}.zcap{display:flex;border:1px solid rgba(255,255,255,.35);border-radius:16px;overflow:hidden}.zcap i{font-style:normal;padding:2px 10px;font-size:13px}.zcap i+i{border-left:1px solid rgba(255,255,255,.35)}
  @media(min-width:520px){html.minipv body{max-width:400px;margin:0 auto;box-shadow:0 0 0 1px #ccd}html.minipv .mnav{max-width:400px;margin:0 auto}}`;
  document.head.appendChild(st);
  const f = document.createElement("link"); f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600&display=swap";
  document.head.appendChild(f);
})();
import("./firebase.js").then(() => import("virtual:app"));
