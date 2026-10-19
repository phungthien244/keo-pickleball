import { getUserID, getUserInfo, getAccessToken, openShareSheet } from "zmp-sdk";
import BODY from "./body.html?raw";
window.ZMINI = 1;
window.ZMP = { getUserID, getUserInfo, getAccessToken, openShareSheet };
// Zalo nạp JS/CSS vào trang khung của nó: tự dựng khung giao diện nếu chưa có
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
