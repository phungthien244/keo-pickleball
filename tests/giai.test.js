import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("giải cặp cố định: xếp lịch, kiểm tỉ số, rút lui, tổng kết và giải thưởng", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ\nI\nJ | nữ\nK");
  await e.click("add");
  await e.tab("san");
  await e.click("fmt", { v: "giai" });
  await e.click("cset", { k: "thu", v: "phi" }); await e.cfg("phi", 70); await e.cfg("court", 400);
  await e.click("cset", { k: "gt", v: "gop" }); await e.cfg("gtv", 30);
  for (const [x, y] of [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]) { e.input("gp1", e.pid(x)); e.input("gp2", e.pid(y)); await e.click("gadd"); }
  e.input("gp1", e.pid("K")); e.input("gp2", e.pid("K")); await e.click("gadd");
  expect(e.V()).toContain("Hai người phải khác nhau");
  await e.click("gstart");
  const playing = () => e.docs("matches/", m => m.status === "playing");
  expect(playing().length).toBe(2);
  const [id0] = playing()[0];
  e.input("sa-" + id0, "11"); e.input("sb-" + id0, "11"); await e.click("save", { id: id0 });
  expect(e.V()).toContain("Đội thắng đúng 11");

  let k = 0, withdrew = null;
  while (playing().length && k < 30) {
    const [id] = playing()[0];
    if (k === 3) {
      const free = e.store.get("app/config").giai.pairs.filter(p => !playing().some(([, m]) => m.pa === p.id || m.pb === p.id));
      withdrew = free[free.length - 1].id;
      await e.click("gout", { id: withdrew }); await e.click("gout", { id: withdrew });
    }
    e.input("sa-" + id, k % 3 ? "11" : "7"); e.input("sb-" + id, k % 3 ? "5" : "11"); await e.click("save", { id }); k++;
  }
  expect(playing().length).toBe(0);
  expect(withdrew).toBeTruthy();
  expect(e.store.get("app/config").giai.out).toHaveProperty(withdrew);
  // không cặp nào gặp nhau hai lần
  const seen = new Set();
  for (const [, m] of e.docs("matches/", m => m.giai && m.status === "done")) { const key = [m.pa, m.pb].sort().join("~"); expect(seen.has(key)).toBe(false); seen.add(key); }

  await e.click("gend"); await e.click("gend"); await e.wait(60);
  const cfg = e.store.get("app/config");
  expect(cfg.session).toBe(2);
  const h = e.store.get("app/hist-1");
  expect(h.giai).toBeTruthy();
  expect(h.giai.prizes.length).toBeGreaterThan(0);
  const sv = e.V();
  expect((sv.match(/class="av /g) || []).length).toBeGreaterThanOrEqual(10);
  expect(sv).toContain('class="champ"');
  await e.tab("home");
  expect(e.V()).toContain("vô địch");
});
