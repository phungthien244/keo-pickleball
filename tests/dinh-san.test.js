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
  await e.ok("start");
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

test("cặp cố định xoay vòng: trận định sẵn được gọi vào sân trước theo thứ tự", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ\nI\nK | nữ"); await e.click("add");
  await e.tab("san");
  await e.click("cset", { k: "fmt", v: "giai" });
  const id = n => e.pid(n);
  for (const [x, y] of [["A", "C"], ["B", "D"], ["E", "F"], ["G", "H"], ["I", "K"]]) { await e.click("gpick", { id: id(x) }); await e.click("gpick", { id: id(y) }); await e.click("gadd"); }
  const P = e.store.get("app/config").giai.pairs;
  expect(P.length).toBe(5);
  await e.click("gpreon");
  // trận 1: cặp 5 vs cặp 4, trận 2: cặp 1 vs cặp 3
  await e.click("gprepick", { id: P[4].id }); await e.click("gprepick", { id: P[3].id }); await e.click("gpreadd");
  await e.click("gprepick", { id: P[0].id }); await e.click("gprepick", { id: P[2].id }); await e.click("gpreadd");
  expect(e.store.get("app/config").giai.presets.length).toBe(2);
  await e.ok("gstart");
  const live = e.docs("matches/", m => m.status === "playing").map(([, m]) => m).sort((a, b) => a.court - b.court);
  expect(live.length).toBe(2);
  expect([live[0].pa, live[0].pb].sort()).toEqual([P[4].id, P[3].id].sort());
  expect([live[1].pa, live[1].pb].sort()).toEqual([P[0].id, P[2].id].sort());
});

test("cặp cố định vòng tròn: chọn cặp đấu tiếp theo ngay lúc đang đánh", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ\nI\nK | nữ\nL\nM | nữ"); await e.click("add");
  await e.tab("san");
  await e.click("cset", { k: "fmt", v: "giai" });
  const id = n => e.pid(n);
  for (const [x, y] of [["A", "C"], ["B", "D"], ["E", "F"], ["G", "H"], ["I", "K"], ["L", "M"]]) { await e.click("gpick", { id: id(x) }); await e.click("gpick", { id: id(y) }); await e.click("gadd"); }
  await e.ok("gstart");
  const playing = () => e.docs("matches/", m => m.status === "playing").map(([k, m]) => [k, m]);
  expect(playing().length).toBe(2);
  const busy = new Set(playing().flatMap(([, m]) => [m.pa, m.pb]));
  const P = e.store.get("app/config").giai.pairs, freeP = P.filter(p => !busy.has(p.id));
  await e.click("gnowopen");
  expect(e.V()).toContain('data-act="gnowpick"');
  await e.click("gnowpick", { id: freeP[0].id }); await e.click("gnowpick", { id: freeP[1].id });
  // sân đều bận → xếp làm trận kế tiếp
  await e.click("gnext");
  expect(e.store.get("app/config").giai.presets[0]).toMatchObject({ x: freeP[0].id, y: freeP[1].id });
  const [mid] = playing()[0];
  e.input("sa-" + mid, "11"); e.input("sb-" + mid, "4"); await e.click("save", { id: mid });
  await e.until(() => playing().length === 2);
  expect(playing().some(([, m]) => [m.pa, m.pb].sort().join() === [freeP[0].id, freeP[1].id].sort().join())).toBe(true);
});
