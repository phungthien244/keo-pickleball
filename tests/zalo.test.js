import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 },
  "clubs/q7/members/own": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep" },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: false, createdAt: 1 },
  "clubs/q7/players/p2": { name: "Bình", rating0: 3, gender: "M", active: false, createdAt: 2 },
  "clubs/q7/players/p3": { name: "Chi", rating0: 3, gender: "F", active: true, createdAt: 3 },
  ...extra
});
const OWNER = { uid: "own", isAnonymous: false, email: "o@x.vn", displayName: "Chủ" };
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };

test("chủ CLB mở đăng ký: số chỗ, khóa hủy, thêm người, điểm danh theo đăng ký", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data: base() });
  await e.boot(); await e.until(() => e.V().includes('data-act="regon"'));
  await e.click("regon");
  await e.until(() => e.store.get("clubs/q7/app/config").reg?.on === true);
  await e.until(() => e.V().includes('data-key="max"'));
  e.H.change({ target: { dataset: { save: "reg", key: "max" }, value: "1" } });
  await e.until(() => e.store.get("clubs/q7/app/config").reg.max === 1);
  await e.click("regadd"); await e.click("regaddp", { id: "p1" });
  await e.until(() => e.store.get("clubs/q7/regs/1_p_p1"));
  await e.click("regadd"); await e.click("regaddp", { id: "p2" });
  await e.until(() => e.T().includes("chờ"));
  await e.click("regatt"); await e.click("regatt");
  await e.until(() => e.store.get("clubs/q7/players/p1").active === true);
  expect(e.store.get("clubs/q7/players/p2").active).toBe(false);
  expect(e.store.get("clubs/q7/players/p3").active).toBe(false);
});

test("người chơi Zalo: chọn hồ sơ, chờ duyệt, đăng ký, vào danh sách chờ, hủy", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, max: 1, lockH: 2 } },
    "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", name: "Bình", at: 1 } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: ZU, data });
  await e.boot(); await e.until(() => e.T().includes("Bạn là ai trong CLB"));
  expect(e.V()).not.toContain('data-act="regin"');
  await e.click("lnkpick", { id: "p1" }); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/zalo_9")?.status === "pending");
  await e.until(() => e.T().includes("Đang chờ chủ CLB duyệt"));
  // chủ CLB duyệt (giả lập)
  await e.FB.setDoc(e.FB.doc(e.FB.fs, "clubs/q7/links/zalo_9"), { status: "ok", pid: "p1" });
  await e.until(() => e.V().includes('data-act="regin"'));
  expect(e.T()).toContain("Vào danh sách chờ");
  await e.click("regin");
  await e.until(() => e.store.get("clubs/q7/regs/1_zalo_9"));
  await e.until(() => e.T().includes("Bạn đang chờ"));
  await e.click("regout"); await e.click("regout");
  await e.until(() => !e.store.get("clubs/q7/regs/1_zalo_9"));
});

test("chủ CLB duyệt người mới: tạo hồ sơ gắn tài khoản Zalo", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7", user: OWNER, data: base({ "clubs/q7/links/zalo_5": { status: "pending", newName: "Dũng", gender: "M", zname: "Dũng Z", at: 1 } }) });
  await e.boot(); await e.until(() => e.T().includes("Người chơi chờ duyệt"));
  await e.click("lnkok", { id: "zalo_5" });
  await e.until(() => e.store.get("clubs/q7/links/zalo_5").status === "ok");
  const pid = e.store.get("clubs/q7/links/zalo_5").pid;
  expect(e.store.get("clubs/q7/players/" + pid)).toMatchObject({ name: "Dũng", zuid: "zalo_5" });
});

test("người chơi không cần tài khoản: vào bằng máy mình, chọn tên, chờ duyệt", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-nhap", data: base() });
  globalThis.window.ZMINI = 1;
  await e.boot(); await e.until(() => e.V().includes('data-act="zlogin"'));
  await e.click("zlogin");
  await e.until(() => e.T().includes("Bạn là ai trong CLB"));
  await e.click("lnkpick", { id: "p2" }); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/anon")?.pid === "p2");
});

test("bản web: không có nút tham gia cho người chơi", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, max: 4 } } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", data });
  await e.boot(); await e.until(() => e.T().includes("Đăng ký buổi"));
  expect(e.V()).not.toContain('data-act="zlogin"');
  expect(e.T()).toContain("Zalo Mini App");
});
