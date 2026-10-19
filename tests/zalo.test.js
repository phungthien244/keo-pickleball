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

const DAY = 864e5, tmr = () => { const d = new Date(Date.now() + DAY); d.setHours(19, 0, 0, 0); return d; };
const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const sched = (extra = {}) => { const at = tmr().getTime(); return { name: "Kèo tối", fmt: "xoay", at, end: "21:30", courts: 2, target: 11, max: 8, guests: false, thu: "keo", fee: 0, pay: "off", lockH: 2, dlH: 0, deadline: at, lockAt: at - 2 * 3600e3, st: "open", openAt: 0, ...extra }; };

test("chủ CLB: Lịch buổi, tạo buổi Xoay cặp và mở đăng ký, thêm người, danh sách chờ, link Mini App của buổi", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base() });
  await e.boot(); await e.until(() => e.V().includes('data-act="xnew"'));
  await e.click("xnew"); await e.until(() => e.V().includes('data-act="xfmt" data-v="giai"'));
  await e.click("xfmt", { v: "xoay" }); await e.until(() => e.V().includes('data-act="xsave"'));
  e.input("xf-name", "Kèo tối thứ 5"); e.input("xf-date", iso(tmr())); e.input("xf-time", "19:00"); e.input("xf-max", "1");
  await e.click("xsave", { v: "open" });
  await e.until(() => [...e.store.keys()].some(k => k.startsWith("clubs/q7/sched/")));
  const [k, X] = [...e.store].find(([k]) => k.startsWith("clubs/q7/sched/")), id = k.split("/").pop();
  expect(X).toMatchObject({ name: "Kèo tối thứ 5", fmt: "xoay", st: "open", max: 1 });
  expect(X.at).toBe(tmr().getTime());
  await e.until(() => e.V().includes('data-act="regadd"'));
  expect(e.V()).toContain(`zalo.me/s/180913816434821856/?clb=q7&amp;buoi=${id}`);
  await e.click("regadd"); await e.click("regaddp", { id: "p1" });
  await e.until(() => e.store.get(`clubs/q7/regs/${id}_p_p1`)?.sid === id);
  await e.click("regadd"); await e.click("regaddp", { id: "p2" });
  await e.until(() => e.T().includes("chờ"));
  expect(e.store.get("clubs/q7/players/p1").active).toBe(false);
});

test("lặp lại hằng tuần, tự mở đăng ký: tạo lịch lặp và các buổi 2 tuần tới, buổi lặp tự mở trước 2 ngày", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base() });
  await e.boot(); await e.until(() => e.V().includes('data-act="xnew"'));
  await e.click("xnew"); await e.click("xfmt", { v: "xoay" }); await e.until(() => e.V().includes('data-k="rep"'));
  e.input("xf-date", iso(tmr())); e.input("xf-time", "19:00");
  await e.click("xfset", { k: "rep", v: "1" }); await e.until(() => e.V().includes('data-act="xfday"'));
  await e.click("xsave", { v: "open" });
  await e.until(() => [...e.store.keys()].some(k => k.startsWith("clubs/q7/series/")));
  const S = [...e.store].find(([k]) => k.startsWith("clubs/q7/series/"))[1];
  expect(S).toMatchObject({ days: [tmr().getDay()], time: "19:00", auto: true, openD: 2, on: true });
  await e.until(() => [...e.store.keys()].filter(k => k.startsWith("clubs/q7/sched/")).length >= 2);
  const L = [...e.store].filter(([k]) => k.startsWith("clubs/q7/sched/")).map(([, v]) => v).sort((a, b) => a.at - b.at);
  expect(L[0].st).toBe("open");
  expect(L[1]).toMatchObject({ st: "plan", openAt: L[1].at - 2 * DAY });
  expect(L[1].at - L[0].at).toBe(7 * DAY);
});

test("người chơi: Trang chủ Mini App liệt kê các buổi sắp tới, mở buổi và đăng ký riêng từng buổi", async () => {
  const data = base({ "clubs/q7/sched/s1": sched(), "clubs/q7/sched/s2": sched({ name: "Kèo cuối tuần", at: tmr().getTime() + 2 * DAY, st: "plan", openAt: Date.now() + DAY }),
    "clubs/q7/sched/s3": sched({ name: "Nháp riêng", st: "draft" }), "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7");
  await e.boot(); await e.until(() => e.T().includes("Buổi sắp tới"));
  expect(e.T()).toContain("Kèo tối"); expect(e.T()).toContain("Kèo cuối tuần"); expect(e.T()).toContain("Tự mở");
  expect(e.T()).not.toContain("Nháp riêng");
  expect(e.V()).toContain('data-x="s1"');
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes('data-act="regin"'));
  await e.click("regin");
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.sid === "s1");
  await e.until(() => e.T().includes("Bạn đã giữ chỗ"));
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

test("Mini App: người chơi xin tham gia CLB, chờ duyệt, đăng ký, vào danh sách chờ, hủy", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, max: 1, lockH: 2 } },
    "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", name: "Bình", at: 1 } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.V().includes('data-act="mxsheetreg"'));
  expect(e.V()).toContain('class="mxnav"');
  expect(e.V()).not.toContain('data-act="regin"');
  await e.click("mxsheetreg"); await e.until(() => e.V().includes('data-act="mxdk" data-v="pick"'));
  await e.click("mxdk", { v: "pick" }); await e.until(() => e.T().includes("Gửi yêu cầu tham gia"));
  expect(e.V()).not.toContain('data-act="lnkpick"');
  e.input("lnk-name", "An"); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/zalo_9")?.status === "pending");
  expect(e.store.get("clubs/q7/links/zalo_9")).toMatchObject({ newName: "An" });
  expect(e.store.get("clubs/q7/links/zalo_9").pid).toBeUndefined();
  await e.until(() => e.T().includes("Đã gửi yêu cầu tham gia"));
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
  await e.nav("app", { t: "dk" }); await e.until(() => e.T().includes("Xin tham gia CLB"));
  await e.click("apvnew", { id: "zalo_5" }); await e.until(() => e.T().includes("Tạo hồ sơ và duyệt"));
  await e.click("lnkok", { id: "zalo_5", v: "new" });
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
  await e.until(() => e.T().includes("Gửi yêu cầu tham gia"));
  e.input("lnk-name", "Bình"); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/anon")?.newName === "Bình");
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

test("Zalo Mini App: tự vào bằng ID Zalo, mở thẳng CLB, xin tham gia bằng tên Zalo", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/180913816434821856/", search: "?clb=q7", data: base() });
  let sent = null;
  MINI(e);
  globalThis.window.ZMP = { getUserID: async () => "5550001112", getAccessToken: async () => "AT", getUserInfo: async () => ({ userInfo: { name: "Lan Zalo", avatar: "" } }) };
  globalThis.fetch = async (u, o) => { sent = { u, body: JSON.parse(o.body) }; return { json: async () => ({ token: "9" }) }; };
  await e.boot(); await e.until(() => e.T().includes("Chào mừng tới Q7"));
  expect(sent.u).toBe("https://pikeco.app/api/zalo-mini");
  await e.click("mxdk", { v: "pick" }); await e.until(() => e.T().includes("Gửi yêu cầu tham gia"));
  expect(sent.body).toEqual({ id: "5550001112", at: "AT" });
  e.input("lnk-name", "Lan"); await e.click("lnksend");
  await e.until(() => e.store.get("clubs/q7/links/zalo_9")?.newName === "Lan");
  delete globalThis.window.ZMP;
});

test("thu tiền trước: người chơi chuyển khoản lúc đăng ký, chủ CLB xác nhận, chuẩn bị buổi hôm nay thì trang Quỹ đánh dấu đã trả", async () => {
  const now = new Date(); now.setHours(23, 0, 0, 0);
  const data = base({ "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1, bank: { code: "mb", bin: "970422", name: "MB Bank", acc: "0123456789", holder: "NGUYEN A" } },
    "clubs/q7/sched/s1": sched({ at: now.getTime(), deadline: now.getTime(), thu: "phi", phi: 60, pay: "opt" }),
    "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky/s1");
  await e.boot(); await e.until(() => e.V().includes('data-act="regin" data-v="sent"'));
  expect(e.V()).toContain("img.vietqr.io");
  expect(e.T()).toContain("60.000đ");
  expect(e.T()).toContain("trả tại sân");
  await e.click("regin", { v: "sent" });
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.pay === "sent");
  await e.until(() => e.T().includes("Chờ xác nhận tiền"));
  delete globalThis.window.ZMINI; await new Promise(r => setTimeout(r, 700));
  // chủ CLB xác nhận ở trang buổi
  const o = setup({ host: "pikeco.app", path: "/q7/dang-ky/s1", user: OWNER, data: Object.fromEntries(e.store) });
  await o.boot(); await o.until(() => o.V().includes('data-act="regpayok"'));
  await o.click("regpayok", { id: "s1_zalo_9" });
  await o.until(() => o.store.get("clubs/q7/regs/s1_zalo_9").pay === "ok");
  // hôm nay ở tab Sân: chuẩn bị buổi theo lịch
  // hôm nay ở tab Sân: buổi theo lịch được chọn sẵn, điểm danh theo đăng ký
  await o.nav("app", { t: "san" });
  await o.until(() => o.store.get("clubs/q7/app/config").schedId === "s1");
  await o.until(() => o.T().includes("Sửa buổi"));
  expect(o.store.get("clubs/q7/app/config")).toMatchObject({ thu: "phi", phi: 60, sname: "Kèo tối" });
  await o.until(() => o.store.get("clubs/q7/app/pay-1")?.paid?.p1 === true);
  expect(o.store.get("clubs/q7/players/p1").active).toBe(true);
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

test("bắt buộc thu trước: giữ chỗ quá 30 phút chưa chuyển thì nhường chỗ (đăng ký cách cũ tự chuyển sang lịch buổi)", async () => {
  const old = Date.now() - 31 * 60e3;
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", thu: "phi", phi: 50, reg: { on: true, sid: 1, max: 1, pay: "req" } },
    "clubs/q7/regs/1_p_p1": { sid: 1, pid: "p1", at: old, pay: "none" }, "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", at: old + 1000, pay: "sent" } });
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data });
  await e.boot(); await e.until(() => e.store.get("clubs/q7/sched/m1")?.st === "open");
  await e.until(() => e.store.get("clubs/q7/regs/m1_p_p2")?.sid === "m1");
  expect(e.store.get("clubs/q7/regs/1_p_p1")).toBeUndefined();
  expect(e.store.get("clubs/q7/app/config").reg.on).toBe(false);
  await e.nav("app", { t: "dk", x: "m1" });
  await e.until(() => e.T().includes("đã nhường chỗ"));
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

test("chủ CLB ghép người xin tham gia với hồ sơ cũ: gợi ý trùng tên, giữ rating và lịch sử", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base({ "clubs/q7/links/zalo_6": { status: "pending", newName: "an", zname: "An Nguyen", at: 1 }, "clubs/q7/links/zalo_7": { status: "pending", newName: "Khách lạ", at: 2 } }) });
  await e.boot(); await e.until(() => e.T().includes("Xin tham gia CLB (2)"));
  expect(e.V()).toContain('data-act="lnkok" data-id="zalo_6" data-v="p1"');
  await e.click("lnkok", { id: "zalo_6", v: "p1" });
  await e.until(() => e.store.get("clubs/q7/links/zalo_6").status === "ok");
  expect(e.store.get("clubs/q7/links/zalo_6").pid).toBe("p1");
  expect(e.store.get("clubs/q7/players/p1").zuid).toBe("zalo_6");
  await e.click("apvpick", { id: "zalo_7" }); await e.until(() => e.V().includes('data-act="apvp"'));
  expect(e.V()).not.toContain('data-act="apvp" data-id="p1"');
  await e.click("apvp", { id: "p2" }); await e.until(() => e.T().includes("Ghép với Bình"));
  await e.click("lnkok", { id: "zalo_7", v: "p2" });
  await e.until(() => e.store.get("clubs/q7/players/p2").zuid === "zalo_7");
});

test("link mời quản lý mở bằng Zalo: nhận quyền trong Mini App, có giao diện Quản lý và chuyển về Chơi", async () => {
  const data = base({ "clubs/q7/invites/tk1": { role: "admin", exp: Date.now() + 864e5, by: "own", at: 1 } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7&moi=tk1", user: ZU, data });
  MINI(e);
  await e.boot(); await e.until(() => e.store.get("clubs/q7/members/zalo_9")?.role === "admin");
  expect(e.store.get("clubs/q7/members/zalo_9")).toMatchObject({ invite: "tk1", via: "zalo" });
  await e.until(() => e.V().includes('data-act="mxmode" data-v="ql" aria-pressed="true"'));
  expect(e.T()).toContain("Thành viên");
  expect(e.V()).toContain('data-go="caidat"');
  await e.click("mxmode", { v: "choi" });
  await e.until(() => e.T().includes("Trực tiếp"));
  expect(e.V()).toContain('data-act="mxmode" data-v="choi" aria-pressed="true"');
});

test("trang Cài đặt: link mời gửi qua Zalo mở Mini App", async () => {
  delete globalThis.window.ZMINI;
  await new Promise(r => setTimeout(r, 700)); // chờ hẹn giờ vẽ lại của bài Mini App trước chạy xong
  const e = setup({ host: "pikeco.app", path: "/q7/cai-dat", user: OWNER, data: base() });
  await e.boot(); await e.until(() => e.V().includes('data-act="inv"'));
  await e.click("inv", { v: "admin" });
  await e.until(() => e.V().includes("zalo.me/s/180913816434821856/?clb=q7&amp;moi="));
  expect(e.T()).toContain("copy link web");
});

test("bản Testing: dán link mời trong tab Tôi để nhận quyền quản lý", async () => {
  const data = base({ "clubs/q7/invites/abc123": { role: "scorer", exp: Date.now() + 864e5, by: "own", at: 1 } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data });
  MINI(e, "#/q7/cua-toi");
  await e.boot(); await e.until(() => e.V().includes('data-act="mxinv"'));
  await e.click("mxinv"); await e.until(() => e.V().includes('id="mx-inv"'));
  e.input("mx-inv", "https://zalo.me/s/180913816434821856/?clb=q7&moi=abc123"); await e.click("mxinvgo");
  await e.until(() => e.store.get("clubs/q7/members/zalo_9")?.role === "scorer");
  await e.until(() => e.V().includes('data-act="mxmode"'));
});

test("tab Sân: hôm nay 2 buổi theo lịch thì tự chọn buổi gần giờ nhất, đổi được; người quét QR ở sân tự có mặt", async () => {
  const now = Date.now(), near = now + 60e3, far = now + 120e3;
  const data = base({ "clubs/q7/sched/a": sched({ name: "Kèo gần", at: near, deadline: near }), "clubs/q7/sched/b": sched({ name: "Kèo xa", at: far, deadline: far, courts: 3 }),
    "clubs/q7/regs/a_p_p1": { sid: "a", pid: "p1", at: 1 }, "clubs/q7/regs/b_p_p2": { sid: "b", pid: "p2", at: 1, arrived: true } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data });
  await e.boot(); await e.until(() => e.store.get("clubs/q7/app/config").schedId === "a");
  await e.until(() => e.store.get("clubs/q7/players/p1").active === true);
  expect(e.store.get("clubs/q7/players/p3").active).toBe(false);
  await e.until(() => e.V().includes('data-act="xprep" data-id="b"'));
  await e.click("xprep", { id: "b" });
  await e.until(() => e.store.get("clubs/q7/app/config").schedId === "b");
  expect(e.store.get("clubs/q7/app/config").courts).toBe(3);
  await e.until(() => e.store.get("clubs/q7/players/p2").active === true);
  expect(e.T()).toContain("QR");
});

test("tạo buổi: tùy chọn bật/tắt (chi phí, giải thưởng hạng 1-2-3, luật nâng cao, trọng tài) được áp vào buổi khi chuẩn bị", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base() });
  await e.boot(); await e.click("xnew"); await e.click("xfmt", { v: "xoay" }); await e.until(() => e.V().includes('data-k="gton"'));
  const d = new Date(); d.setMinutes(d.getMinutes() + 30);
  e.input("xf-date", iso(d)); e.input("xf-time", `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
  await e.click("xfset", { k: "gton", v: "1" }); await e.until(() => e.V().includes('data-k="gt"'));
  await e.click("xfset", { k: "gt", v: "hang" }); e.input("xf-h1", "300");
  await e.click("xfset", { k: "adv", v: "1" }); await e.click("xfset", { k: "win2", v: "0" });
  await e.click("xfset", { k: "refOn", v: "1" });
  await e.click("xfset", { k: "cp", v: "0" });
  await e.click("xsave", { v: "open" });
  await e.until(() => [...e.store.keys()].some(k => k.startsWith("clubs/q7/sched/")));
  const X = [...e.store].find(([k]) => k.startsWith("clubs/q7/sched/"))[1];
  expect(X).toMatchObject({ gton: true, gt: "hang", adv: true, win2: false, refOn: true, cp: false, reg: true });
  expect(X.hang[0]).toBe(300);
  await e.nav("app", { t: "san" });
  await e.until(() => e.store.get("clubs/q7/app/config").schedId);
  expect(e.store.get("clubs/q7/app/config")).toMatchObject({ gt: "hang", hang1: 300, win2: false, refOn: true, cphi: false });
});
