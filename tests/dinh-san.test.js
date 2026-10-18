import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("xoay cặp: trận định sẵn vào sân trước theo thứ tự, sau đó tự xếp như cũ", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ\nI\nK | nữ\nL\nM | nữ"); await e.click("add");
  await e.tab("san");
  expect(e.T()).toContain("Xếp sẵn các trận đầu");
  await e.click("preon");
  const id = n => e.pid(n);
  for (const n of ["A", "C", "B", "D"]) await e.click("prepick", { id: id(n) });
  await e.click("preadd");
  for (const n of ["E", "F", "G", "H"]) await e.click("prepick", { id: id(n) });
  await e.click("preadd");
  for (const n of ["A", "F", "E", "C"]) await e.click("prepick", { id: id(n) });
  await e.click("preadd");
  expect(e.store.get("app/config").presets.length).toBe(3);
  // đưa trận 3 lên đầu
  const p3 = e.store.get("app/config").presets[2].id;
  await e.click("premv", { id: p3, d: "-1" });
  expect(e.store.get("app/config").presets[1].id).toBe(p3);
  await e.click("start");
  // 2 sân: trận 1 (A,C vs B,D) và trận 2 (A,F vs E,C) đụng người → trận 3 (E,F vs G,H) vào sân 2
  await e.click("gen");
  const P = () => e.docs("matches/", m => m.status === "playing").map(([, m]) => m).sort((x, y) => x.court - y.court);
  expect(P().length).toBe(2);
  expect(P()[0].a).toEqual([id("A"), id("C")]);
  expect(P()[0].b).toEqual([id("B"), id("D")]);
  expect(P()[1].a).toEqual([id("E"), id("F")]);
  expect(P().every(m => m.preset)).toBe(true);
  // lưu tỉ số, xếp tiếp: trận định sẵn còn lại (A,F vs E,C) vào sân
  for (const m of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + m[0], "11"); e.input("sb-" + m[0], "5"); await e.click("save", { id: m[0] }); }
  await e.click("gen");
  const P2 = P();
  expect(P2.some(m => m.preset === p3)).toBe(true);
  expect(P2.filter(m => !m.preset).length).toBe(1);
});
