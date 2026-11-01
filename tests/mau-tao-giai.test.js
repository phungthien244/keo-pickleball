import { test, expect } from "vitest";
import { readFileSync } from "node:fs";
import { setup } from "./helpers/env.js";

// Bộ câu mẫu tạo giải: phần đọc bằng luật (dự phòng khi AI lỗi) phải hiểu đúng các mục chính
const MAU = JSON.parse(readFileSync(new URL("./data/mau-tao-giai.json", import.meta.url), "utf8"));
test("đọc bằng luật: bộ câu mẫu", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", data: { "clubs/q7": { name: "Q7", public: true, owner: "x", createdAt: 1 } } });
  globalThis.window.ZMINI = 1; await e.boot();
  const parse = globalThis.window.__tnParse;
  const bad = [];
  for (const m of MAU.filter(m => !m.ai)) { const o = parse(m.txt); for (const [k, v] of Object.entries(m.ok)) if (o[k] !== v) bad.push(`${m.txt} · ${k}: ${o[k]} ≠ ${v}`); }
  expect(bad).toEqual([]);
});
