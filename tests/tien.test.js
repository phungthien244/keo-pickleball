import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("tiền quỹ: trích % giải, chia đều, lệ phí, quỹ CLB cộng dồn", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ"); await e.click("add");
  await e.tab("san");
  await e.click("cset", { k: "gt", v: "trich" }); await e.click("cset", { k: "thu", v: "deu" }); await e.cfg("court", 300);
  const play = async (sa, sb) => { for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, sa); e.input("sb-" + id, sb); await e.click("save", { id }); } };
  for (let r = 0; r < 4; r++) { await e.click("gen"); await play("11", "6"); }
  await e.click("cset", { k: "thu", v: "phi" });
  expect(e.store.get("app/config").thu).toBe("phi"); // đổi được cả khi đang đánh
  await e.click("cset", { k: "thu", v: "deu" });
  await e.tab("tien");
  await e.click("reset"); await e.click("reset"); await e.until(() => e.store.has("app/hist-1"));
  const h = e.store.get("app/hist-1");
  expect(h.money.thu).toBe("deu");
  const pay = h.rows.reduce((s, r) => s + r.pay, 0);
  expect(pay).toBeGreaterThanOrEqual(h.money.cost);
  expect(h.money.club).toBe(pay - h.money.cost - (h.money.pot || 0));
  expect(h.money.prizes.map(p => p.label)).toEqual(["Số 1 nam", "Số 1 nữ"]);
  await e.tab("home");
  expect(e.T()).toMatch(/Quỹ CLB −?\d+k/);

  await e.tab("san"); await e.click("cset", { k: "thu", v: "phi" }); await e.cfg("phi", 60); await e.cfg("court", 300);
  await e.click("gen"); await play("11", "9");
  await e.tab("tien");
  expect(e.T()).toContain("Phải thu 480k");
  expect(e.T()).toContain("Lệ phí cố định 60k/người");
  expect(e.T()).toMatch(/Dự kiến vào quỹ CLB \+\d+k/);
});
