import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Giải nhiều nội dung chạy song song (canvas trang nd)
const P = (n, g = "M", r = 2) => ({ name: n, rating0: r, gender: g, active: false, createdAt: 1 });
const reg = (sid, pid, team, x = {}) => ({ sid, pid, name: pid, at: 1, pay: "none", team, ...x });
const today = () => Math.min(Date.now() + 3600e3, new Date().setHours(23, 59, 30, 0));
const NDS = [{ k: "o", name: "Đôi open", dt: "free", cap: 0, max: 8, koN: 2, fee: 100, courts: [1] }, { k: "f", name: "Nữ 4.2", dt: "FF", cap: 4.2, max: 4, koN: 1, fee: 50, courts: [2] }];
const arr = { arrived: true, arrivedAt: 1 };
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 3, session: 1, phase: "prep" },
  ...Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`clubs/q7/players/p${i + 1}`, P("N" + (i + 1), i >= 8 ? "F" : "M")])),
  "clubs/q7/sched/s1": { name: "AEP Open", fmt: "giai", ko: true, koN: "2", koQ: "4", koThird: "1", pairReg: "pair", dt: "free", at: today(), courts: 3, target: 11, max: 40, st: "open", openAt: 0, deadline: today(), nds: NDS,
    kdn: { o: { groups: [{ p: ["s1~o_a1", "s1~o_a3"] }, { p: ["s1~o_a5", "s1~o_a7"] }], at: 1, by: "BTC", n: 1 }, f: { groups: [{ p: ["s1~f_b1", "s1~f_b3"] }], at: 1, by: "BTC", n: 1 } } },
  // Đôi open: N9 (nữ) đánh cả 2 nội dung
  "clubs/q7/regs/s1~o_a1": reg("s1~o", "p1", "s1~o_a1", arr), "clubs/q7/regs/s1~o_a2": reg("s1~o", "p2", "s1~o_a1", arr),
  "clubs/q7/regs/s1~o_a3": reg("s1~o", "p3", "s1~o_a3", arr), "clubs/q7/regs/s1~o_a4": reg("s1~o", "p4", "s1~o_a3", arr),
  "clubs/q7/regs/s1~o_a5": reg("s1~o", "p5", "s1~o_a5", arr), "clubs/q7/regs/s1~o_a6": reg("s1~o", "p6", "s1~o_a5", arr),
  "clubs/q7/regs/s1~o_a7": reg("s1~o", "p9", "s1~o_a7", arr), "clubs/q7/regs/s1~o_a8": reg("s1~o", "p7", "s1~o_a7", arr),
  // Nữ 4.2: N9 check-in ở nội dung open là đủ
  "clubs/q7/regs/s1~f_b1": reg("s1~f", "p9", "s1~f_b1"), "clubs/q7/regs/s1~f_b2": reg("s1~f", "p10", "s1~f_b1", arr),
  "clubs/q7/regs/s1~f_b3": reg("s1~f", "p11", "s1~f_b3", arr), "clubs/q7/regs/s1~f_b4": reg("s1~f", "p12", "s1~f_b3", arr),
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const boot = async data => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };

test("BTC thêm nội dung: tên, loại đôi, tổng trình, số cặp, sân ưu tiên", async () => {
  const data = base(); data["clubs/q7/sched/s1"] = { ...data["clubs/q7/sched/s1"], nds: null, kdn: null };
  const e = await boot(data);
  await e.nav("app", { t: "dk", x: "s1" }); await e.click("gmst", { v: "0" }); await e.until(() => e.V().includes('class="g2st"'));
  await e.click("ksh", { v: "more" }); await e.until(() => e.V().includes('data-act="ndpg"'));
  await e.click("ndpg", { id: "s1" }); await e.until(() => e.T().includes("Giải này đang có 1 nội dung"));
  await e.click("nded", { v: "+" }); e.input("nd-name", "Nữ 4.2"); await e.click("ndset", { k: "dt", v: "FF" });
  await e.click("ndstp", { k: "cap", d: "0.1", mn: "0", mx: "16" }); await e.click("ndcourt", { v: "2" });
  await e.click("ndok"); await e.until(() => (e.store.get("clubs/q7/sched/s1").nds || []).length === 1);
  expect(e.store.get("clubs/q7/sched/s1").nds[0]).toMatchObject({ name: "Nữ 4.2", dt: "FF", courts: [2] });
  expect(e.store.get("clubs/q7/sched/s1").nds[0].cap).toBeCloseTo(4.0);
});

test("đăng ký theo nội dung, ngày đánh, bắt đầu tất cả, xếp trận song song không trùng người, bảng và nhánh từng nội dung", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.store.get("clubs/q7/app/config").schedId === "s1");
  // Ngày đánh: mỗi nội dung một khối, N9 check-in 1 lần
  await e.until(() => e.T().includes("Bắt đầu tất cả nội dung"));
  expect(e.T()).toContain("Đôi open"); expect(e.T()).toContain("Nữ 4.2"); expect(e.T()).toContain("2/2 cặp đủ người");
  // Đăng ký: chip nội dung, tổng quan
  await e.click("gmst", { v: "0" }); await e.until(() => e.V().includes('class="ndchips"'));
  expect(e.T()).toContain("ĐÃ CHIA BẢNG"); expect(e.T()).toContain("1 người đăng ký từ 2 nội dung");
  await e.click("ndrf", { v: "f" }); await e.until(() => e.T().includes("BẢNG A"));
  await e.click("gmst", { v: "1" }); await e.until(() => e.T().includes("Bắt đầu tất cả nội dung"));
  await e.click("ndstart"); await e.until(() => e.store.get("clubs/q7/app/config").phase === "live");
  const G = e.store.get("clubs/q7/app/config").giai;
  expect(Object.keys(G.nd).sort()).toEqual(["f", "o"]);
  expect(G.nd.o.pairs.length).toBe(4); expect(G.nd.f.pairs.length).toBe(2); expect(G.locked).toBe(true);
  // Đang đánh: 3 sân, sân 1 open, sân 2 nữ; N9 không vào 2 sân cùng lúc
  await e.nav("app", { t: "dk", x: "s1" }); await e.click("gmst", { v: "2" }); await e.until(() => e.V().includes('class="ndprog"'));
  await e.click("scfillall"); await e.until(() => e.docs("clubs/q7/matches/").length >= 2);
  const M = e.docs("clubs/q7/matches/").map(([, m]) => m);
  expect(M.every(m => m.nd)).toBe(true);
  expect(M.find(m => m.court === 1).nd).toBe("o"); expect(M.find(m => m.court === 2).nd).toBe("f");
  const ppl = M.flatMap(m => [...m.a, ...m.b]); expect(new Set(ppl).size).toBe(ppl.length);
  await e.until(() => e.V().includes('class="ndtag"'));
  // Bảng: chọn nội dung
  await e.click("kseg", { v: "bang" }); await e.until(() => e.V().includes('data-act="ndf"'));
  await e.click("ndf", { v: "f" }); await e.until(() => e.T().includes("BẢNG A"));
  expect(e.T()).not.toContain("BẢNG B");
  await e.click("ndf", { v: "o" }); await e.until(() => e.T().includes("BẢNG B"));
  // Nữ xong vòng bảng: chỉ nội dung đó hiện Tạo nhánh, bấm thì chỉ nội dung đó sang knockout
  const [fid] = e.docs("clubs/q7/matches/", m => m.nd === "f").map(([k]) => k);
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/" + fid), { status: "done", sa: 11, sb: 5, doneAt: Date.now() });
  await e.click("kseg", { v: "san" }); await e.until(() => e.T().includes("Tạo nhánh Nữ 4.2"));
  await e.click("kgo", { v: "f" }); await e.until(() => e.store.get("clubs/q7/app/config").giai.nd.f.koGo === true);
  expect(e.store.get("clubs/q7/app/config").giai.nd.o.koGo).toBe(false);
});

test("người chơi: trang giải hiện các nội dung, mở nội dung để đăng ký; đủ số nội dung thì không đăng ký thêm", async () => {
  const data = base({ "clubs/q7/links/zalo_9": { status: "ok", pid: "p8" } });
  data["clubs/q7/members/zalo_9"] = null; data["clubs/q7"] = { name: "Q7", public: true, owner: "own", createdAt: 1 };
  data["clubs/q7/sched/s1"] = { ...data["clubs/q7/sched/s1"], ndMax: 1 };
  data["clubs/q7/regs/s1~o_zalo_9"] = reg("s1~o", "p8", "s1~o_zalo_9", { uid: "zalo_9" });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data: Object.fromEntries(Object.entries(data).filter(([, v]) => v)) }); globalThis.window.ZMINI = 1; await e.boot();
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.T().includes("Nội dung thi đấu"));
  expect(e.T()).toContain("Đôi open"); expect(e.T()).toContain("Bạn đã đăng ký");
  expect(e.V()).toMatch(/data-act="ndgo" data-v="f" disabled/);
  // Mở thẳng nội dung khác: trang đăng ký của nội dung đó, đăng ký bị chặn vì đủ số nội dung
  await e.nav("app", { t: "dk", x: "s1~f" }); await e.until(() => e.V().includes('data-act="gdreg"'));
  await e.click("gdreg"); await e.until(() => e.V().includes('data-act="regin"'));
  await e.click("regin", { v: "none" });
  expect(e.store.get("clubs/q7/regs/s1~f_zalo_9")).toBeFalsy();
});
