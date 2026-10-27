import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Đợt 4 · Chia bảng → Knockout trong Mini App (canvas trang kb)
const tmr = () => { const d = new Date(Date.now() + 864e5); d.setHours(7, 30, 0, 0); return d.getTime(); };
const P = (n, g = "M", r = 3) => ({ name: n, rating0: r, gender: g, active: false, createdAt: 1 });
const reg = (pid, team) => ({ sid: "s1", pid, name: pid, at: 1, pay: "none", ...(team ? { team } : { seek: true }) });
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep" },
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`clubs/q7/players/p${i + 1}`, P("N" + (i + 1), i % 2 ? "F" : "M", 2.5 + i / 10)])),
  "clubs/q7/sched/s1": { name: "Giải chia bảng", fmt: "giai", ko: true, koN: "2", koQ: "4", koThird: "1", pairReg: "pair", dt: "free", at: tmr(), courts: 2, target: 11, max: 20, st: "open", openAt: 0, deadline: Date.now() - 1 },
  "clubs/q7/regs/r1": reg("p1", "r1"), "clubs/q7/regs/r2": reg("p2", "r1"),
  "clubs/q7/regs/r3": reg("p3", "r3"), "clubs/q7/regs/r4": reg("p4", "r3"),
  "clubs/q7/regs/r5": reg("p5", "r5"), "clubs/q7/regs/r6": reg("p6", "r5"),
  "clubs/q7/regs/r7": reg("p7"), "clubs/q7/regs/r8": reg("p8"),
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const boot = async data => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };

test("tạo giải chia bảng: câu 3 hỏi cặp, nội dung, cách đăng ký; Thể thức có 32/64, lưu vào giải", async () => {
  const e = await boot(base());
  await e.click("xnew"); await e.click("xqsel", { v: "bang" }); await e.click("xqgo", { v: "2" });
  await e.until(() => e.T().includes("Giải chia bảng nên có 3–4 sân"));
  await e.click("xqgo", { v: "3" }); await e.until(() => e.T().includes("Bao nhiêu cặp, đánh nội dung gì?"));
  expect(e.T()).toContain("Tối đa bao nhiêu cặp?"); expect(e.T()).toContain("Từng người, BTC ghép");
  await e.click("gsopt", { v: "ko" }); await e.until(() => e.T().includes("Vào vòng trong"));
  expect(e.V()).toContain('data-k="koQ" data-v="64"');
  await e.click("xfset", { k: "koQ", v: "16" }); await e.click("gsok");
  await e.click("xfset", { k: "dt", v: "mix" }); await e.click("xsave", { v: "open" });
  await e.until(() => [...e.store.keys()].filter(k => k.startsWith("clubs/q7/sched/")).length === 2);
  const X = [...e.store].filter(([k]) => k.startsWith("clubs/q7/sched/") && !k.endsWith("/s1"))[0][1];
  expect(X).toMatchObject({ fmt: "giai", ko: true, koQ: "16", dt: "mix" });
  await e.until(() => e.T().includes("Rủ đồng đội rồi đăng ký"));
});

test("đăng ký: người lẻ → bốc thăm ghép → giữ; hạt giống; chia đều → bảng; đổi chỗ 2 cặp", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.T().includes("Ghép cặp cho 2 người lẻ"));
  expect(e.T()).toContain("Người lẻ 2");
  await e.click("ksh", { v: "pair" }); await e.click("kpg", { v: "k7" }); await e.until(() => e.T().includes("Giữ 1 cặp này"));
  await e.click("k7ok"); await e.until(() => e.store.get("clubs/q7/regs/r8").team);
  await e.until(() => e.T().includes("Cặp 4"));
  await e.click("ksh", { v: "more" }); await e.click("kpg", { v: "k8" }); await e.until(() => e.T().includes("★ HG 1"));
  await e.click("k8go"); await e.until(() => e.T().includes("Chia bảng thế nào?"));
  await e.click("k9bal"); await e.until(() => (e.store.get("clubs/q7/sched/s1").kd || {}).groups);
  const G = e.store.get("clubs/q7/sched/s1").kd.groups.map(g => g.p);
  expect(G.length).toBe(2); expect(G.flat().length).toBe(4);
  await e.until(() => e.T().includes("Đã chia 2 bảng"));
  await e.click("k10sw", { v: G[0][1] }); await e.click("k10sw", { v: G[1][1] });
  await e.until(() => e.store.get("clubs/q7/sched/s1").kd.groups[0].p[1] === G[1][1]);
});

test("tự ghép cặp và bốc chia bảng từng lượt", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.T().includes("Ghép cặp cho 2 người lẻ"));
  await e.click("ksh", { v: "pair" }); await e.click("kpg", { v: "k7b" }); await e.until(() => e.T().includes("Tự ghép cặp"));
  await e.click("k7bp", { id: "r7" }); await e.click("k7bp", { id: "r8" }); await e.until(() => e.store.get("clubs/q7/regs/r8").team === "r7");
  await e.click("kpgx"); await e.click("ksh", { v: "chia" }); await e.click("kpg", { v: "k9d" }); await e.until(() => e.T().includes("Lượt 0/4"));
  await e.click("k9next"); await e.until(() => e.T().includes("Lượt 1/4"));
  await e.click("k9all"); await e.until(() => (e.store.get("clubs/q7/sched/s1").kd || {}).groups);
});

test("ngày đánh: cặp thiếu người (chờ thêm, thay người); bắt đầu vòng bảng tạo cặp theo bảng; Sân · Bảng · Nhánh; tạo nhánh khi BTC bấm", async () => {
  const at = Date.now() + 3600e3;
  const arr = { arrived: true, arrivedAt: 1 };
  const data = base({
    "clubs/q7/sched/s1": { name: "Giải chia bảng", fmt: "giai", ko: true, koN: "2", koQ: "4", koThird: "1", pairReg: "pair", dt: "free", at, courts: 2, target: 11, max: 20, st: "open", openAt: 0, deadline: at,
      kd: { groups: [{ p: ["r1", "r3"] }, { p: ["r5", "r7"] }], seeds: ["r1", "r5"], at: 1, by: "BTC", n: 1 } },
    "clubs/q7/regs/r1": { ...reg("p1", "r1"), ...arr }, "clubs/q7/regs/r2": { ...reg("p2", "r1"), ...arr },
    "clubs/q7/regs/r3": { ...reg("p3", "r3"), ...arr }, "clubs/q7/regs/r4": { ...reg("p4", "r3"), ...arr },
    "clubs/q7/regs/r5": { ...reg("p5", "r5"), ...arr }, "clubs/q7/regs/r6": { ...reg("p6", "r5"), ...arr },
    "clubs/q7/regs/r7": { ...reg("p7", "r7"), ...arr }, "clubs/q7/regs/r8": reg("p8", "r7")
  });
  const e = await boot(data);
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.store.get("clubs/q7/app/config").schedId === "s1");
  await e.until(() => e.V().includes('data-act="k12"'));
  expect(e.T()).toContain("½ N7");
  await e.click("k12", { v: "r7" }); await e.until(() => e.T().includes("Thay người"));
  await e.click("k12late", { v: "r7" }); await e.until(() => (e.store.get("clubs/q7/sched/s1").kd.late || {}).r7);
  await e.click("ksh", { v: "k13" }); await e.until(() => e.T().includes("Bắt đầu vòng bảng?"));
  expect(e.T()).toContain("2 trận");
  await e.click("k13go"); await e.until(() => e.store.get("clubs/q7/app/config").phase === "live");
  const G = e.store.get("clubs/q7/app/config").giai;
  expect(G.pairs.map(p => p.id).sort()).toEqual(["t_r1", "t_r3", "t_r5", "t_r7"]);
  expect(G.ko.groups.map(g => g.p)).toEqual([["t_r1", "t_r3"], ["t_r5", "t_r7"]]);
  expect(G).toMatchObject({ koGate: true, koGo: false, locked: true }); expect(G.rest.t_r7).toBe(true);
  await e.until(() => [...e.store.keys()].some(k => k.startsWith("clubs/q7/matches/")));
  await e.nav("app", { t: "dk", x: "s1" }); await e.click("gmst", { v: "2" }); await e.until(() => e.V().includes('class="kseg"'));
  expect(e.T()).toContain("Vòng bảng · 0/2 trận");
  await e.click("kseg", { v: "bang" }); await e.until(() => e.T().includes("BẢNG A"));
  await e.click("ksh", { v: "m15" }); await e.ok("kforce");
  await e.until(() => e.store.get("clubs/q7/app/config").giai.koForce === true);
  await e.until(() => e.T().includes("Vòng bảng xong"));
  await e.click("kgo"); await e.until(() => e.store.get("clubs/q7/app/config").giai.koGo === true);
  await e.until(() => e.T().includes("Đã tạo nhánh."));
});

test("người chơi: hôm nay có giải → chỉ một nút quét mã; quét rồi chờ BTC; BTC duyệt thì thấy bảng và đồng đội", async () => {
  const at = Date.now() + 3600e3;
  const data = base({ "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 }, "clubs/q7/members/zalo_9": null,
    "clubs/q7/sched/s1": { name: "Giải chia bảng", fmt: "giai", ko: true, koN: "2", koQ: "4", pairReg: "pair", at, courts: 2, target: 11, max: 20, st: "open", openAt: 0, deadline: at, kd: { groups: [{ p: ["r1", "r3"] }, { p: ["r5", "r7"] }], seeds: ["r1"] } },
    "clubs/q7/regs/r1": { ...reg("p1", "r1"), uid: "zalo_9" }, "clubs/q7/links/zalo_9": { pid: "p1", status: "ok" } });
  delete data["clubs/q7/members/zalo_9"];
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot();
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('data-act="mxscan"'));
  expect(e.T()).toContain("Tới sân rồi thì check-in"); expect(e.T()).toContain("Bảng A");
  await globalThis.window.FB.updateDoc({ path: "clubs/q7/regs/r1" }, { ci: Date.now() });
  await e.until(() => e.T().includes("Chờ ban tổ chức xác nhận"));
  await globalThis.window.FB.updateDoc({ path: "clubs/q7/regs/r1" }, { arrived: true, arrivedAt: Date.now() });
  await e.until(() => e.T().includes("Đang chờ N2"));
  expect(e.T()).toContain("BẢNG A");
});
