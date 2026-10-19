import { test, expect, vi } from "vitest";
import { meta } from "../functions/_middleware.js";

const S = v => typeof v === "number" ? { integerValue: String(v) } : typeof v === "boolean" ? { booleanValue: v } : Array.isArray(v) ? { arrayValue: { values: v.map(S) } } : v && typeof v === "object" ? { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, S(x)])) } } : { stringValue: String(v) };
const docs = {
  "clubs/aep": { name: "AEP Pickleball", public: true },
  "clubs/aep/app/hist-2": { type: "giai", startedAt: Date.UTC(2026, 9, 13), sname: "Giải tháng 10", giai: { table: [{ na: "Đức", nb: "Chi" }, { na: "Minh", nb: "Lan" }, { na: "Tuấn", nb: "Hà" }] } },
  "clubs/aep/app/hist-1": { matchCount: 6, startedAt: Date.UTC(2026, 9, 10), rows: [{ name: "Mai" }, { name: "Đức" }, { name: "Hà" }, { name: "Chi" }] }
};
globalThis.fetch = vi.fn(async u => { const p = decodeURIComponent(u).split("/documents/")[1]; const d = docs[p];
  return d ? { ok: true, json: async () => ({ fields: Object.fromEntries(Object.entries(d).map(([k, v]) => [k, S(v)])) }) } : { ok: false }; });

test("xem trước link: tên CLB, giải đấu xoay cặp, giải đấu giải", async () => {
  expect(await meta(new URL("https://pikeco.app/"))).toBe(null);
  expect(await meta(new URL("https://pikeco.app/clb"))).toBe(null);
  expect((await meta(new URL("https://pikeco.app/aep"))).title).toBe("AEP Pickleball · pikeco.app");
  expect((await meta(new URL("https://pikeco.app/aep/xep-hang"))).title).toBe("Xếp hạng · AEP Pickleball");
  const b1 = await meta(new URL("https://pikeco.app/aep/buoi/1"));
  expect(b1.title).toBe("Tổng kết giải đấu #1 · AEP Pickleball");
  expect(b1.desc).toBe("6 trận · 4 người · 10/10/2026 · Top 3: Mai, Đức, Hà");
  const b2 = await meta(new URL("https://pikeco.app/aep/buoi/2"));
  expect(b2.title).toBe("Giải tháng 10 · Tổng kết giải đấu #2 · AEP Pickleball");
  expect(b2.desc).toContain("Nhất: Đức & Chi");
  expect(await meta(new URL("https://pikeco.app/khong-co"))).toBe(null);
  expect(fetch.mock.calls[2][0]).toContain("/projects/keo-pickleball/");
});
