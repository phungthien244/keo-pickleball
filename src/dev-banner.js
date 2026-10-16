// Bản thử luôn có dải báo để không nhầm với trang thật.
if (window.FB_TARGET !== "prod") {
  const b = document.createElement("div");
  b.textContent = window.FB_TARGET === "mock" ? "BẢN THỬ · dữ liệu giả, chỉ lưu trên máy này" : "BẢN THỬ · dữ liệu thử, không phải dữ liệu CLB thật";
  b.setAttribute("style", "position:sticky;top:0;z-index:999;background:#f2e600;color:#0c2b44;font:700 12px/1.2 system-ui,sans-serif;letter-spacing:.06em;text-align:center;padding:6px 8px");
  document.body.prepend(b);
}
