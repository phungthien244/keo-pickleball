import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// K14 · thẻ sân theo trạng thái trọng tài, kết thúc có Đọc kết quả + Tạo trận mới, huỷ trận có hoàn tác
const P = n => ({ name: n, rating0: 3, gender: "M", active: true, createdAt: 1 });
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live", sname: "Giao lưu sáng", target: 11, loaDev: "khac" },
  "clubs/q7/players/p1": P("An"), "clubs/q7/players/p2": P("Bình"), "clubs/q7/players/p3": P("Chi"), "clubs/q7/players/p4": P("Dũng"),
  "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: Date.now() - 6e5 },
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const boot = async data => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };
const calls = e => [...e.store.keys()].filter(k => k.startsWith("clubs/q7/calls/")).map(k => e.store.get(k));

test("trọng tài đang điểm danh: thanh 4 bước, số người có mặt; Mời vào sân gửi câu loa", async () => {
  const e = await boot(base({ "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: Date.now() - 6e5, ref: { by: "r1", byName: "Nam", at: Date.now(), pos: { a: ["p1", "p3"], b: ["p2", "p4"] }, first: "a", left: "a", ev: [] } } }));
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('class="scst"'));
  expect(e.T()).toContain("Điểm danh"); expect(e.T()).toContain("TT Nam"); expect(e.T()).toContain("4/4 có mặt");
  await e.click("scinv", { id: "m1" }); await e.until(() => calls(e).length === 1);
  expect(calls(e)[0].txt).toBe("Mời An và Chi, Bình và Dũng vào sân 1 chuẩn bị thi đấu");
  // trọng tài sang bốc thăm rồi bắt đầu
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/m1"), { ref: { ...e.store.get("clubs/q7/matches/m1").ref, st: 2 } });
  await e.until(() => e.V().includes('<i class="on">Bốc thăm</i>'));
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/m1"), { ref: { ...e.store.get("clubs/q7/matches/m1").ref, started: Date.now(), ev: [{ k: "p", w: "a", at: Date.now() }] } });
  await e.until(() => e.V().includes('<i class="on">Bắt đầu</i>'));
  expect(e.T()).toContain("Lịch sử từng pha");
});

test("BTC bấm (mặc định): lưu xong sân hiện Kết thúc + Đọc kết quả + Tạo trận mới; ⋯ mở lại trận", async () => {
  const e = await boot(base({ "clubs/q7/players/p5": P("Én"), "clubs/q7/players/p6": P("Phúc"), "clubs/q7/players/p7": P("Giang"), "clubs/q7/players/p8": P("Hải") }));
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('data-act="scinv"'));
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/m1"), { sa: 11, sb: 7, status: "done", doneAt: Date.now() });
  await e.until(() => e.T().includes("✓ Kết thúc"));
  expect(e.T()).toContain("An & Chi thắng 11–7"); expect(e.V()).toContain('data-act="scread"'); expect(e.V()).toContain('data-act="scfill"');
  await e.click("scsh", { v: "1" }); await e.until(() => e.T().includes("Mở lại trận"));
  await e.click("screopen", { id: "m1" }); await e.click("screopen", { id: "m1" });
  await e.until(() => e.store.get("clubs/q7/matches/m1").status === "playing");
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/m1"), { sa: 11, sb: 7, status: "done", doneAt: Date.now() });
  await e.until(() => e.T().includes("✓ Kết thúc"));
  await e.click("scfill", { v: "1" });
  await e.until(() => e.docs("clubs/q7/matches/", m => m.status === "playing" && m.court === 1).length === 1);
});

test("huỷ trận ở ⋯ của sân (bấm 2 lần) → dải hoàn tác → khôi phục", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('data-act="scinv"'));
  await e.click("scsh", { v: "1" }); await e.until(() => e.T().includes("Huỷ trận"));
  await e.click("sccancel", { id: "m1" }); await e.click("sccancel", { id: "m1" });
  await e.until(() => !e.store.get("clubs/q7/matches/m1"));
  await e.until(() => e.T().includes("Đã huỷ trận sân 1"));
  await e.click("scundo", { id: "m1" }); await e.until(() => e.store.get("clubs/q7/matches/m1"));
  expect(e.store.get("clubs/q7/matches/m1").status).toBe("playing");
});

test("cài đặt Xếp trận tiếp ở ⋯ Đang đánh: chuyển Tự động", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('data-act="scinv"'));
  await e.click("gmmore"); await e.until(() => e.T().includes("Đang: BTC bấm"));
  await e.click("gmdo", { a: "scauto" }); await e.until(() => e.store.get("clubs/q7/app/config").autoNext === true);
});
