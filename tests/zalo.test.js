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

const MINI = (e, hash) => { globalThis.window.ZMINI = 1; if (hash) globalThis.location.hash = hash; };

test("chủ CLB: trang Đăng ký mở đăng ký, số chỗ, thêm người, danh sách chờ, link Mini App", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base() });
  await e.boot(); await e.until(() => e.V().includes('data-act="regon"'));
  await e.click("regon");
  await e.until(() => e.store.get("clubs/q7/app/config").reg?.on === true);
  expect(e.store.get("clubs/q7/app/config").reg.sid).toBe(1);
  await e.until(() => e.V().includes('data-key="max"'));
  expect(e.V()).toContain("zalo.me/s/180913816434821856/?clb=q7");
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

test("bắt đầu buổi: tự điểm danh người đã đăng ký và đóng đăng ký", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, sid: 1, max: 8 } },
    "clubs/q7/regs/1_p_p1": { sid: 1, pid: "p1", at: 1 }, "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", at: 2 } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data });
  await e.boot(); await e.until(() => e.V().includes('data-act="start"'));
  await e.click("start");
  await e.until(() => e.store.get("clubs/q7/app/config").phase === "live");
  expect(e.store.get("clubs/q7/players/p1").active).toBe(true);
  expect(e.store.get("clubs/q7/players/p2").active).toBe(true);
  expect(e.store.get("clubs/q7/players/p3").active).toBe(true);
  expect(e.store.get("clubs/q7/app/config").reg.on).toBe(false);
});

test("Mini App: người chơi chọn tên, chờ duyệt, đăng ký, vào danh sách chờ, hủy", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, max: 1, lockH: 2 } },
    "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", name: "Bình", at: 1 } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.T().includes("Bạn là ai trong CLB"));
  expect(e.V()).toContain('class="mnav"');
  expect(e.V()).not.toContain('data-act="regin"');
  await e.click("lnkpick", { id: "p1" }); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/zalo_9")?.status === "pending");
  await e.until(() => e.T().includes("Đang chờ chủ CLB duyệt"));
  await e.FB.setDoc(e.FB.doc(e.FB.fs, "clubs/q7/links/zalo_9"), { status: "ok", pid: "p1" });
  await e.until(() => e.V().includes('data-act="regin"'));
  expect(e.T()).toContain("Vào danh sách chờ");
  await e.click("regin");
  await e.until(() => e.store.get("clubs/q7/regs/1_zalo_9"));
  await e.until(() => e.T().includes("Bạn đang chờ"));
  await e.click("regout"); await e.click("regout");
  await e.until(() => !e.store.get("clubs/q7/regs/1_zalo_9"));
  await e.tab("toi"); await e.until(() => e.T().includes("CLB của bạn"));
  expect(e.T()).toContain("An");
});

test("chủ CLB duyệt người mới ở trang Đăng ký: tạo hồ sơ gắn tài khoản Zalo, có số chờ trên tab", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7", user: OWNER, data: base({ "clubs/q7/links/zalo_5": { status: "pending", newName: "Dũng", gender: "M", zname: "Dũng Z", at: 1 } }) });
  await e.boot(); await e.until(() => e.T().includes("1 người chờ duyệt"));
  await e.nav("app", { t: "dk" }); await e.until(() => e.T().includes("Người chơi chờ duyệt"));
  await e.click("lnkok", { id: "zalo_5" });
  await e.until(() => e.store.get("clubs/q7/links/zalo_5").status === "ok");
  const pid = e.store.get("clubs/q7/links/zalo_5").pid;
  expect(e.store.get("clubs/q7/players/" + pid)).toMatchObject({ name: "Dũng", zuid: "zalo_5" });
});

test("Mini App không có Zalo SDK (bản thử): vào bằng máy mình, chọn tên, chờ duyệt", async () => {
  const e = setup({ host: "pikeco.app", path: "/", data: base() });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.V().includes('data-act="zlogin"'));
  await e.click("zlogin");
  await e.until(() => e.T().includes("Bạn là ai trong CLB"));
  await e.click("lnkpick", { id: "p2" }); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/anon")?.pid === "p2");
});

test("bản web: người xem thấy nút mở Mini App để đăng ký, không đăng ký trên web", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, max: 4 } } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", data });
  await e.boot(); await e.until(() => e.T().includes("Đăng ký buổi"));
  expect(e.V()).not.toContain('data-act="zlogin"');
  expect(e.V()).not.toContain('data-act="regin"');
  expect(e.V()).toContain("zalo.me/s/180913816434821856/?clb=q7");
  expect(e.T()).toContain("Mở trong Zalo để đăng ký");
});

test("Mini App lần đầu, không có link CLB: vào trang Khám phá, chọn CLB", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", data: { ...base(), "clubs/q8": { name: "Q8 Smash", public: true, owner: "o8", createdAt: 1, city: "TP.HCM" } } });
  MINI(e);
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  await e.boot(); await e.until(() => e.T().includes("Tìm CLB pickleball"));
  expect(e.V()).toContain('data-act="miniclub" data-id="q8"');
  expect(e.V()).toContain('data-act="openweb"');
  await e.click("miniclub", { id: "q8" });
  expect(String(e.replaced || e.url || "")).toContain("#/q8/dang-ky");
  expect(e.reloaded).toBe(1);
});

test("Zalo Mini App: tự vào bằng ID Zalo, mở thẳng CLB, chọn tên", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/180913816434821856/", search: "?clb=q7", data: base() });
  let sent = null;
  MINI(e);
  globalThis.window.ZMP = { getUserID: async () => "5550001112", getAccessToken: async () => "AT", getUserInfo: async () => ({ userInfo: { name: "Lan Zalo", avatar: "" } }) };
  globalThis.fetch = async (u, o) => { sent = { u, body: JSON.parse(o.body) }; return { json: async () => ({ token: "9" }) }; };
  await e.boot(); await e.until(() => e.T().includes("Bạn là ai trong CLB"));
  expect(sent.u).toBe("https://pikeco.app/api/zalo-mini");
  expect(sent.body).toEqual({ id: "5550001112", at: "AT" });
  await e.click("lnkpick", { id: "p3" }); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/zalo_9")?.pid === "p3");
  delete globalThis.window.ZMP;
});
