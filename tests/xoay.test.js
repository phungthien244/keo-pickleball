import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("xoay cặp: 4 lượt, tiền kèo, chốt buổi", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ\nI\nJ | nữ");
  await e.click("add");
  expect(e.docs("players/").length).toBe(10);
  for (let r = 0; r < 4; r++) {
    await e.click("gen");
    const playing = e.docs("matches/", m => m.status === "playing");
    expect(playing.length).toBeGreaterThan(0);
    for (const [id] of playing) { e.input("sa-" + id, "11"); e.input("sb-" + id, "6"); await e.click("save", { id }); }
  }
  const done = e.docs("matches/", m => m.status === "done");
  expect(done.length).toBe(8);
  for (const [, m] of done) { expect(new Set([...m.a, ...m.b]).size).toBe(4); expect([m.sa, m.sb]).toEqual([11, 6]); }

  await e.cfg("court", 300);
  await e.tab("bxh");
  expect(e.V()).toContain("Số 1 · Nam");
  expect(e.V()).toContain("Số 1 · Nữ");

  await e.tab("tien");
  await e.click("reset"); await e.click("reset"); await e.wait(60);
  const h = e.store.get("app/hist-1");
  expect(h).toBeTruthy();
  expect(h.matchCount).toBe(8);
  expect(h.rows.length).toBe(10);
  const paid = h.rows.reduce((s, r) => s + r.pay, 0);
  expect(paid).toBeGreaterThanOrEqual(300);
  expect(e.url).toContain("buoi=1");
  expect(e.T()).toContain("Kết quả các trận");
  await e.tab("home");
  expect(e.V()).toContain("sescard");
});
