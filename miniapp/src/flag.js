import { getUserID, getUserInfo, getAccessToken, openShareSheet, openWebview, saveImageToGallery, scanQRCode, openOutApp, openChat, getPhoneNumber, openPhone, events, EventName, configAppView } from "zmp-sdk";
import BODY from "./body.html?raw";
window.ZMINI = 1;
window.ZMP = { getUserID, getUserInfo, getAccessToken, openShareSheet, openWebview, saveImageToGallery, scanQRCode, openOutApp, openChat, getPhoneNumber, openPhone, events, EventName, configAppView };
document.documentElement.classList.add("mini");
// Thanh trạng thái trong suốt: thanh đầu xanh / poster giải tràn lên tận mép trên như các app khác.
// Đo độ cao thanh trạng thái (Android: Zalo đặt --zaui-safe-area-inset-top; iOS: env()); đo không ra thì giữ thanh thường.
(async () => {
  const root = document.documentElement;
  try {
    await configAppView({ headerColor: "#0c2b44", headerTextColor: "white", statusBarType: "transparent", actionBar: { hide: true } });
    await new Promise(r => setTimeout(r, 60));
    const pr = document.createElement("div");
    pr.style.cssText = "position:fixed;top:0;left:0;width:1px;height:0;visibility:hidden;padding-top:env(safe-area-inset-top,0px)";
    document.body.appendChild(pr);
    let h = parseFloat(getComputedStyle(pr).paddingTop) || 0; pr.remove();
    const z = parseFloat(getComputedStyle(root).getPropertyValue("--zaui-safe-area-inset-top")) || 0;
    h = Math.max(h, z);
    if (h < 12 || h > 80) { await configAppView({ statusBarType: "normal", actionBar: { hide: true } }); h = 0; }
    root.style.setProperty("--sat", Math.round(h) + "px");
  } catch (e) {}
})();
// Zalo nạp JS/CSS vào trang khung của nó: tự dựng khung giao diện nếu chưa có
// Trang khung của Zalo có thể thiếu thẻ viewport → giao diện bị phóng to, tràn ngang
if (!document.querySelector('meta[name="viewport"]')) {
  const m = document.createElement("meta"); m.name = "viewport";
  m.content = "width=device-width,initial-scale=1,maximum-scale=1,viewport-fit=cover";
  document.head.appendChild(m);
}
if (!document.getElementById("view")) {
  const host = document.getElementById("app") || document.body;
  host.insertAdjacentHTML("beforeend", BODY);
  const f = document.createElement("link");
  f.rel = "stylesheet";
  f.href = "https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800;900&family=Be+Vietnam+Pro:wght@400;500;600&display=swap";
  document.head.appendChild(f);
  const st = document.createElement("style");
  st.textContent = "[hidden]{display:none!important}img{max-width:100%}";
  document.head.appendChild(st);
}

// Ép mọi lớp bọc của trang khung Zalo giãn hết bề ngang (khung có thể co theo nội dung)
function pkFull() {
  const w = document.querySelector(".wrap");
  for (let el = w && w.parentElement; el && el !== document.documentElement; el = el.parentElement) {
    const s = el.style;
    s.setProperty("display", "block", "important");
    s.setProperty("width", "100%", "important");
    s.setProperty("max-width", "none", "important");
    s.setProperty("margin", "0", "important");
    s.setProperty("padding", "0", "important");
  }
}
pkFull(); addEventListener("load", pkFull);
