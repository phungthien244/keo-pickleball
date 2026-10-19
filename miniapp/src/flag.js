import { getUserID, getUserInfo, getAccessToken, openShareSheet, openWebview } from "zmp-sdk";
import BODY from "./body.html?raw";
window.ZMINI = 1;
window.ZMP = { getUserID, getUserInfo, getAccessToken, openShareSheet, openWebview };
document.documentElement.classList.add("mini");
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
