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
  await e.boot(); await e.until(() => e.V().includes('data-act="mxsheetreg"'));
  expect(e.V()).toContain('class="mxnav"');
  expect(e.V()).not.toContain('data-act="regin"');
  await e.click("mxsheetreg"); await e.until(() => e.V().includes('data-act="mxdk" data-v="pick"'));
  await e.click("mxdk", { v: "pick" }); await e.until(() => e.T().includes("Bạn là ai trong CLB"));
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
  await e.nav("app", { t: "toi" }); await e.until(() => e.T().includes("CLB của tôi"));
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
  const e = setup({ host: "pikeco.app", path: "/", data: base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, sid: 1 } } }) });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.V().includes('data-act="zlogin"'));
  await e.click("zlogin");
  await e.until(() => e.V().includes('data-act="mxsheetreg"'));
  await e.click("mxsheetreg"); await e.click("mxdk", { v: "pick" });
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
  await e.boot(); await e.until(() => e.T().includes("Tìm chỗ chơi pickleball"));
  expect(e.T()).toContain("Kèo đang nhận khách");
  expect(e.V()).toContain('data-act="miniclub" data-id="q8"');
  expect(e.V()).toContain('data-act="openweb"');
  await e.click("miniclub", { id: "q8" });
  expect(String(e.replaced || e.url || "")).toContain("#/q8");
  expect(e.reloaded).toBe(1);
});

test("Zalo Mini App: tự vào bằng ID Zalo, mở thẳng CLB, chọn tên", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/180913816434821856/", search: "?clb=q7", data: base() });
  let sent = null;
  MINI(e);
  globalThis.window.ZMP = { getUserID: async () => "5550001112", getAccessToken: async () => "AT", getUserInfo: async () => ({ userInfo: { name: "Lan Zalo", avatar: "" } }) };
  globalThis.fetch = async (u, o) => { sent = { u, body: JSON.parse(o.body) }; return { json: async () => ({ token: "9" }) }; };
  await e.boot(); await e.until(() => e.T().includes("Chào mừng tới Q7"));
  expect(sent.u).toBe("https://pikeco.app/api/zalo-mini");
  await e.click("mxdk", { v: "pick" }); await e.until(() => e.T().includes("Bạn là ai trong CLB"));
  expect(sent.body).toEqual({ id: "5550001112", at: "AT" });
  await e.click("lnkpick", { id: "p3" }); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/zalo_9")?.pid === "p3");
  delete globalThis.window.ZMP;
});

test("thu tiền trước: người chơi chuyển khoản lúc đăng ký, chủ CLB xác nhận, trang Quỹ đánh dấu đã trả", async () => {
  const data = base({ "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1, bank: { code: "mb", bin: "970422", name: "MB Bank", acc: "0123456789", holder: "NGUYEN A" } },
    "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", thu: "phi", phi: 60, reg: { on: true, sid: 1, max: 8, pay: "opt" } },
    "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.V().includes('data-act="regin" data-v="sent"'));
  expect(e.V()).toContain("img.vietqr.io");
  expect(e.T()).toContain("60.000đ");
  expect(e.T()).toContain("trả tại sân");
  await e.click("regin", { v: "sent" });
  await e.until(() => e.store.get("clubs/q7/regs/1_zalo_9")?.pay === "sent");
  await e.until(() => e.T().includes("Chờ xác nhận tiền"));
  // chủ CLB xác nhận
  const o = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: Object.fromEntries(e.store) });
  await o.boot(); await o.until(() => o.V().includes('data-act="regpayok"'));
  await o.click("regpayok", { id: "1_zalo_9" });
  await o.until(() => o.store.get("clubs/q7/regs/1_zalo_9").pay === "ok");
  await o.until(() => o.store.get("clubs/q7/app/pay-1")?.paid?.p1 === true);
});

test("khách vãng lai đăng ký không cần duyệt, bắt đầu buổi thì có hồ sơ và được điểm danh", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, sid: 1, max: 8, guests: true, feeG: 80 } } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.V().includes('data-act="mxsheetreg"'));
  await e.click("mxsheetreg"); await e.click("mxdk", { v: "guest" }); await e.until(() => e.V().includes('id="gs-name"'));
  e.input("gs-name", "Tuấn khách"); await e.click("gsg", { v: "M" });
  await e.click("guestin", { v: "none" });
  await e.until(() => e.store.get("clubs/q7/regs/1_zalo_9")?.guest === true);
  expect(e.store.get("clubs/q7/regs/1_zalo_9").name).toBe("Tuấn khách");
  const o = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data: Object.fromEntries(e.store) });
  await o.boot(); await o.until(() => o.V().includes('data-act="start"'));
  await o.click("start");
  await o.until(() => o.store.get("clubs/q7/app/config").phase === "live");
  await o.until(() => o.store.get("clubs/q7/regs/1_zalo_9").pid);
  const pid = o.store.get("clubs/q7/regs/1_zalo_9").pid;
  expect(o.store.get("clubs/q7/players/" + pid)).toMatchObject({ name: "Tuấn khách", guest: true, active: true, rating0: 3 });
});

test("bắt buộc thu trước: giữ chỗ quá 30 phút chưa chuyển thì nhường chỗ", async () => {
  const old = Date.now() - 31 * 60e3;
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", thu: "phi", phi: 50, reg: { on: true, sid: 1, max: 1, pay: "req" } },
    "clubs/q7/regs/1_p_p1": { sid: 1, pid: "p1", at: old, pay: "none" }, "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", at: old + 1000, pay: "sent" } });
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data });
  await e.boot(); await e.until(() => e.T().includes("đã nhường chỗ"));
  expect(e.T()).toContain("Đã đăng ký 1");
  expect(e.T()).not.toContain("chờ 1");
});

test("Mini App: nút Hồ sơ góc phải, người chơi tự sửa ảnh, biệt danh, giới thiệu, tay thuận, vợt", async () => {
  const data = base({ "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.mk("#hact").innerHTML.includes('data-go="vdv"'));
  const openPro = async pid => { await e.H.click({ target: { closest: s => (s === "[data-pid]" ? { dataset: { pid } } : null) }, preventDefault() {} }); await e.tick(); };
  await openPro("p1"); await e.until(() => e.V().includes('data-act="meedit"'));
  await e.click("meedit"); await e.until(() => e.V().includes('id="me-bio"'));
  e.input("me-nick", "Sát thủ"); e.input("me-bio", "Thích đánh đôi nam nữ"); e.input("me-paddle", "Joola"); e.input("me-since", "2023");
  await e.click("mehand", { v: "L" }); await e.click("mesave");
  await e.until(() => e.store.get("clubs/q7/players/p1").bio === "Thích đánh đôi nam nữ");
  expect(e.store.get("clubs/q7/players/p1")).toMatchObject({ nick: "Sát thủ", hand: "L", paddle: "Joola", since: "2023" });
  await e.until(() => e.T().includes("Tay trái"));
  // không sửa được hồ sơ người khác
  await openPro("p2"); await e.until(() => e.V().includes("Chia sẻ hồ sơ") && !e.T().includes("Sát thủ"));
  expect(e.V()).not.toContain('data-act="meedit"');
});
