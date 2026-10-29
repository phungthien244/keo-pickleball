import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Đợt 3 · yêu cầu của trọng tài hiện trên máy BTC (Y1–Y6)
const P = n => ({ name: n, rating0: 3, gender: "M", active: true, createdAt: 1 });
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live", sname: "Giao lưu", target: 11 },
  "clubs/q7/players/p1": P("An"), "clubs/q7/players/p2": P("Bình"), "clubs/q7/players/p3": P("Chi"), "clubs/q7/players/p4": P("Dũng"),
  "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: Date.now() - 6e5 },
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const call = (why, extra = {}) => ({ k: "btc", court: 1, why, by: "Trọng tài Nam", uid: "zalo_5", at: Date.now() - 6e4, sid: 1, st: "new", ...extra });
const boot = async data => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };

test("một sân gọi: dải đỏ ở tab khác và trong giải, ô sân đỏ lên đầu; chạm → bảng tranh cãi điểm → Đã xử lý", async () => {
  const e = await boot(base({ "clubs/q7/calls/c1": call("Tranh cãi điểm") }));
  await e.nav("app", { t: "nguoi" }); await e.until(() => e.V().includes('class="ycban"'));
  expect(e.T()).toContain("SÂN 1 CẦN BTC"); expect(e.T()).toContain("Tranh cãi điểm");
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('class="sct x"'));
  expect(e.T()).toContain("Tới xử lý");
  await e.click("dhsc", { id: "c1" }); await e.until(() => e.T().includes("Xem lịch sử từng pha"));
  expect(e.T()).toContain("Sửa điểm");
  await e.click("dhscok", { id: "c1" }); await e.until(() => e.store.get("clubs/q7/calls/c1").st === "done");
});

test("bỏ cuộc: Chờ thêm 5 phút, Xử thua (bấm 2 lần) → trận lưu 0–11, yêu cầu xong", async () => {
  const e = await boot(base({ "clubs/q7/calls/c1": call("Thiếu người, bỏ cuộc") }));
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('class="sct x"'));
  await e.click("dhsc", { id: "c1" }); await e.until(() => e.T().includes("Chờ thêm 5 phút"));
  await e.click("ycwait", { id: "c1" }); await e.until(() => (e.store.get("clubs/q7/calls/c1").wait || 0) > Date.now());
  await e.click("dhsc", { id: "c1" }); await e.until(() => e.T().includes("Xử thua"));
  await e.ok("ycff", { id: "m1", v: "a" });
  await e.until(() => e.store.get("clubs/q7/matches/m1").status === "done");
  expect(e.store.get("clubs/q7/matches/m1")).toMatchObject({ sa: 0, sb: 11, ff: "a" });
  await e.until(() => e.store.get("clubs/q7/calls/c1").st === "done");
});

test("nhiều việc: dải ghi số việc, mở danh sách GẤP + LOA", async () => {
  const e = await boot(base({ "clubs/q7/calls/c1": call("Tranh cãi điểm"), "clubs/q7/calls/c2": call("Cần bóng, nước, việc khác", { court: 2 }), "clubs/q7/calls/c3": { k: "loa", txt: "Mời Hùng ra sân 1", by: "Trọng tài Nam", uid: "zalo_5", at: Date.now(), sid: 1, st: "new" }, "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live", loaMode: "duyet", target: 11 } }));
  await e.nav("app", { t: "tien" }); await e.until(() => e.T().includes("3 VIỆC CẦN BTC"));
  await e.click("yclist"); await e.until(() => e.T().includes("3 việc cần BTC"));
  expect(e.T()).toContain("GẤP"); expect(e.T()).toContain("LOA"); expect(e.T()).toContain("Mời Hùng ra sân 1");
});

test("máy trọng tài: thấy 'Đã gọi BTC' và huỷ gọi được", async () => {
  const data = base({ "clubs/q7/members/zalo_9": { role: "scorer", name: "TT" }, "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 }, "clubs/q7/calls/c1": call("Tranh cãi điểm", { uid: "zalo_9" }) });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot();
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('class="ycmine"'));
  expect(e.T()).toContain("Đã gọi BTC");
  await e.click("yccancel", { id: "c1" }); await e.until(() => e.store.get("clubs/q7/calls/c1").st === "skip");
});
