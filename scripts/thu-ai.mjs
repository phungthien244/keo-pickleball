// Chạy bộ câu mẫu qua AI thật: node scripts/thu-ai.mjs [https://pikeco.app]
// So sánh các mục AI trả về với đáp án trong tests/data/mau-tao-giai.json, in câu nào sai.
import { readFileSync } from "node:fs";
const base = process.argv[2] || "https://pikeco.app", MAU = JSON.parse(readFileSync(new URL("../tests/data/mau-tao-giai.json", import.meta.url), "utf8"));
const now = new Date(), ctx = { today: now.toISOString().slice(0, 10), dow: ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"][now.getDay()], now: now.toTimeString().slice(0, 5) };
let ok = 0;
for (const m of MAU) {
  const r = await fetch(base + "/api/tao-giai", { method: "POST", headers: { "content-type": "application/json", referer: "https://pikeco.app/", origin: "https://pikeco.app" }, body: JSON.stringify({ cid: "thu-ai", txt: m.txt, ctx }) });
  const j = await r.json().catch(() => ({})), t = j.t || {}, bad = Object.entries(m.ok).filter(([k, v]) => t[k] !== v).map(([k, v]) => `${k}: ${JSON.stringify(t[k])} ≠ ${JSON.stringify(v)}`);
  if (!bad.length) ok++; else console.log("✗", m.txt, "\n   ", bad.join(" · "), j.by ? `(${j.by})` : j.e || "");
}
console.log(`${ok}/${MAU.length} câu đúng`);
