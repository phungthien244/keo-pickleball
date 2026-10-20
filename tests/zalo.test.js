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
const sched = (extra = {}) => { const at = tmr().getTime(); return { name: "Giải đấu tối", fmt: "xoay", at, end: "21:30", courts: 2, target: 11, max: 8, guests: false, thu: "keo", fee: 0, pay: "off", lockH: 2, dlH: 0, deadline: at, lockAt: at - 2 * 3600e3, st: "open", openAt: 0, ...extra }; };

test("chủ CLB: Lịch giải đấu, tạo giải đấu Xoay cặp và mở đăng ký, thêm người, danh sách chờ, link Mini App của giải đấu", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base() });
  await e.boot(); await e.until(() => e.V().includes('data-act="xnew"'));
  await e.click("xnew"); await e.until(() => e.V().includes('data-act="xfmt" data-v="giai"'));
  await e.click("xfmt", { v: "xoay" }); await e.until(() => e.V().includes('data-act="xsave"'));
  e.input("xf-name", "Giải đấu tối thứ 5"); e.input("xf-date", iso(tmr())); e.input("xf-time", "19:00"); e.input("xf-max", "1");
  await e.click("xsave", { v: "open" });
  await e.until(() => [...e.store.keys()].some(k => k.startsWith("clubs/q7/sched/")));
  const [k, X] = [...e.store].find(([k]) => k.startsWith("clubs/q7/sched/")), id = k.split("/").pop();
  expect(X).toMatchObject({ name: "Giải đấu tối thứ 5", fmt: "xoay", st: "open", max: 1 });
  expect(X.at).toBe(tmr().getTime());
  await e.until(() => e.V().includes('data-act="regadd"'));
  expect(e.V()).toContain(`zalo.me/s/180913816434821856/?clb=q7&amp;buoi=${id}`);
  await e.click("regadd"); await e.click("regaddp", { id: "p1" });
  await e.until(() => e.store.get(`clubs/q7/regs/${id}_p_p1`)?.sid === id);
  await e.click("regadd"); await e.click("regaddp", { id: "p2" });
  await e.until(() => e.T().includes("chờ"));
  expect(e.store.get("clubs/q7/players/p1").active).toBe(false);
});

test("lặp lại hằng tuần, tự mở đăng ký: tạo lịch lặp và các giải đấu 2 tuần tới, giải đấu lặp tự mở trước 2 ngày", async () => {
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

test("người chơi: Trang chủ Mini App liệt kê các giải đấu sắp tới, mở giải đấu và đăng ký riêng từng giải đấu", async () => {
  const data = base({ "clubs/q7/sched/s1": sched(), "clubs/q7/sched/s2": sched({ name: "Giải đấu cuối tuần", at: tmr().getTime() + 2 * DAY, st: "plan", openAt: Date.now() + DAY }),
    "clubs/q7/sched/s3": sched({ name: "Nháp riêng", st: "draft" }), "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7");
  await e.boot(); await e.until(() => e.T().includes("Giải đấu sắp tới"));
  expect(e.T()).toContain("Giải đấu tối"); expect(e.T()).toContain("Giải đấu cuối tuần"); expect(e.T()).toContain("Tự mở");
  expect(e.T()).not.toContain("Nháp riêng");
  expect(e.V()).toContain('data-x="s1"');
  expect(e.V()).toContain('class="gdcard x');
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes('data-act="gdreg"'));
  expect(e.T()).toContain("THỂ THỨC"); expect(e.T()).toContain("Hủy và hoàn phí"); expect(e.T()).toContain("Luật thi đấu");
  await e.click("gdreg"); await e.until(() => e.V().includes('data-act="regin"'));
  expect(e.T()).toContain("Bạn đăng ký với tư cách");
  await e.click("regin"); expect(e.T()).toContain("Đánh dấu đã đọc chính sách hủy");
  await e.click("gdagree"); await e.click("regin");
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.sid === "s1");
  await e.until(() => e.T().includes("Vé của bạn"));
  expect(e.T()).toContain("QUÉT MÃ CHECK-IN");
});

test("bắt đầu giải đấu: tự điểm danh người đã đăng ký và đóng đăng ký", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, sid: 1, max: 8 } },
    "clubs/q7/regs/1_p_p1": { sid: 1, pid: "p1", at: 1 }, "clubs/q7/regs/1_p_p2": { sid: 1, pid: "p2", at: 2 } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data });
  await e.boot(); await e.until(() => e.V().includes('data-act="start"'));
  await e.ok("start");
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
  await e.ok("lnkok", { id: "zalo_5", v: "new" });
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
  delete globalThis.window.ZMINI;
  await e.boot();
  await e.until(() => e.T().includes("Đăng ký giải đấu"));
  expect(e.V()).not.toContain('data-act="zlogin"');
  expect(e.V()).not.toContain('data-act="regin"');
  expect(e.V()).toContain("zalo.me/s/180913816434821856/?clb=q7");
  expect(e.T()).toContain("Mở trong Zalo để đăng ký");
});

test("Mini App lần đầu, không có link CLB: vào trang Khám phá, chọn CLB", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", data: { ...base(), "clubs/q8": { name: "Q8 Smash", public: true, owner: "o8", createdAt: 1, city: "TP.HCM" } } });
  MINI(e);
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  await e.boot(); await e.until(() => e.T().includes("Chơi pickleball"));
  expect(e.T()).toContain("Giải đấu đang nhận vận động viên");
  expect(e.T()).toContain("Dùng pikeco thế nào");
  expect(e.V()).toContain('data-act="miniclub" data-id="q8"');
  expect(e.V()).toContain('data-act="mxtao"');
  expect(e.V()).not.toContain('data-act="openweb"');
  await e.click("mxexme"); expect(e.T()).toContain("Bạn quản lý một CLB?");
  await e.click("mxexfind");
  await e.click("miniclub", { id: "q8" });
  expect(String(e.replaced || e.url || "")).toContain("#/q8");
  expect(e.reloaded).toBe(1);
});

test("Mini App: người dùng Zalo tạo CLB ngay trong app, thành Chủ CLB, vào thẳng quản lý", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", data: base() });
  MINI(e);
  globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
  globalThis.window.ZMP = { getUserID: async () => "777", getAccessToken: async () => "AT", getUserInfo: async () => ({ userInfo: { name: "Dũng Nguyễn", avatar: "" } }) };
  globalThis.fetch = async () => ({ json: async () => ({ token: "77" }) });
  await e.boot(); await e.until(() => e.T().includes("Chơi pickleball"));
  await e.click("mxtao"); await e.until(() => e.T().includes("Dũng Nguyễn (Zalo) sẽ là Chủ CLB"));
  e.input("nc-name", "CLB Pickleball Quận 7"); e.input("nc-city", "TP.HCM");
  await e.click("nc-create"); expect(e.T()).toContain("Nhập số Zalo liên hệ");
  e.input("nc-contact", "0901234567");
  await e.click("nc-create");
  await e.until(() => e.store.get("clubs/clb-pickleball-quan"));
  const c = e.store.get("clubs/clb-pickleball-quan");
  expect(c.owner).toBe("zalo_77"); expect(c.status).toBe("pending");
  expect(e.store.get("clubs/clb-pickleball-quan/members/zalo_77")).toMatchObject({ role: "owner", name: "Dũng Nguyễn", via: "zalo" });
  expect(e.store.get("users/zalo_77").club).toBe("clb-pickleball-quan");
  await e.until(() => e.reloaded === 1);
  expect(String(e.replaced || e.url || "")).toContain("#/clb-pickleball-quan");
  delete globalThis.window.ZMP;
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

test("thu phí trước: người chơi chuyển khoản lúc đăng ký, chủ CLB xác nhận, chuẩn bị giải đấu hôm nay thì trang Quỹ đánh dấu đã trả", async () => {
  // Giải đấu hôm nay: 23:00, hoặc 10 phút nữa nếu đã quá 23:00 (chạy test lúc khuya)
  const now = new Date(Math.min(Math.max(new Date().setHours(23, 0, 0, 0), Date.now() + 10 * 6e4), new Date().setHours(23, 59, 0, 0)));
  const data = base({ "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1, bank: { code: "mb", bin: "970422", name: "MB Bank", acc: "0123456789", holder: "NGUYEN A" } },
    "clubs/q7/sched/s1": sched({ at: now.getTime(), deadline: now.getTime(), thu: "phi", phi: 60, pay: "opt" }),
    "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky/s1");
  await e.boot();
  await e.until(() => e.V().includes('data-act="gdreg"'));
  await e.click("gdreg"); await e.until(() => e.V().includes('data-act="regin" data-v="hold"'));
  expect(e.T()).toContain("GIỮ CHỖ CHẮC"); expect(e.T()).toContain("Trả tại sân");
  await e.click("gdagree"); await e.click("regin", { v: "hold" });
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.hold === true);
  await e.until(() => e.V().includes("class=\"vqr\""));
  expect(e.T()).toContain("60.000đ"); expect(e.T()).toContain("Đang giữ chỗ #1");
  await e.click("regpaid"); expect(e.store.get("clubs/q7/regs/s1_zalo_9").pay).toBe("none");
  await e.ok("regpaid");
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.pay === "sent");
  await e.until(() => e.T().includes("Chờ BTC xác nhận"));
  delete globalThis.window.ZMINI; await new Promise(r => setTimeout(r, 700));
  // chủ CLB xác nhận ở trang buổi
  const o = setup({ host: "pikeco.app", path: "/q7/dang-ky/s1", user: OWNER, data: Object.fromEntries(e.store) });
  await o.boot(); await o.until(() => o.V().includes('data-act="regpayok"'));
  await o.ok("regpayok", { id: "s1_zalo_9" });
  await o.until(() => o.store.get("clubs/q7/regs/s1_zalo_9").pay === "ok");
  // hôm nay ở tab Sân: chuẩn bị buổi theo lịch
  // hôm nay ở tab Sân: buổi theo lịch được chọn sẵn, điểm danh theo đăng ký
  await o.nav("app", { t: "san" });
  await o.until(() => o.store.get("clubs/q7/app/config").schedId === "s1");
  await o.until(() => o.T().includes("Sửa giải đấu"));
  expect(o.store.get("clubs/q7/app/config")).toMatchObject({ thu: "phi", phi: 60, sname: "Giải đấu tối" });
  await o.until(() => o.store.get("clubs/q7/app/pay-1")?.paid?.p1 === true);
  expect(o.store.get("clubs/q7/players/p1").active).toBe(false); // đã trả nhưng chưa check-in: chưa có mặt
});

test("vận động viên ngoài CLB đăng ký không cần duyệt, bắt đầu giải đấu thì có hồ sơ và được điểm danh", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep", reg: { on: true, sid: 1, max: 8, guests: true, feeG: 80 } } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7/dang-ky");
  await e.boot(); await e.until(() => e.V().includes('data-act="mxsheetreg"'));
  await e.click("mxsheetreg"); await e.click("mxdk", { v: "guest" }); await e.until(() => e.V().includes('id="gs-name"'));
  e.input("gs-name", "Tuấn vận động viên ngoài CLB"); await e.click("gsg", { v: "M" });
  await e.click("guestin", { v: "none" });
  await e.until(() => e.store.get("clubs/q7/regs/1_zalo_9")?.guest === true);
  expect(e.store.get("clubs/q7/regs/1_zalo_9").name).toBe("Tuấn vận động viên ngoài CLB");
  const o = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data: Object.fromEntries(e.store) });
  await o.boot(); await o.until(() => o.V().includes('data-act="start"'));
  await o.ok("start");
  await o.until(() => o.store.get("clubs/q7/app/config").phase === "live");
  await o.until(() => o.store.get("clubs/q7/regs/1_zalo_9").pid);
  const pid = o.store.get("clubs/q7/regs/1_zalo_9").pid;
  expect(o.store.get("clubs/q7/players/" + pid)).toMatchObject({ name: "Tuấn vận động viên ngoài CLB", guest: true, active: true, rating0: 3 });
});

test("bắt buộc thu trước: giữ chỗ quá 30 phút chưa chuyển thì nhường chỗ (đăng ký cách cũ tự chuyển sang lịch giải đấu)", async () => {
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
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base({ "clubs/q7/links/zalo_6": { status: "pending", newName: "an", zname: "An Nguyen", at: 1 }, "clubs/q7/links/zalo_7": { status: "pending", newName: "Vận động viên ngoài CLB lạ", at: 2 } }) });
  await e.boot(); await e.until(() => e.T().includes("Xin tham gia CLB (2)"));
  expect(e.V()).toContain('data-act="lnkok" data-id="zalo_6" data-v="p1"');
  await e.ok("lnkok", { id: "zalo_6", v: "p1" });
  await e.until(() => e.store.get("clubs/q7/links/zalo_6").status === "ok");
  expect(e.store.get("clubs/q7/links/zalo_6").pid).toBe("p1");
  expect(e.store.get("clubs/q7/players/p1").zuid).toBe("zalo_6");
  await e.click("apvpick", { id: "zalo_7" }); await e.until(() => e.V().includes('data-act="apvp"'));
  expect(e.V()).not.toContain('data-act="apvp" data-id="p1"');
  await e.click("apvp", { id: "p2" }); await e.until(() => e.T().includes("Ghép với Bình"));
  await e.ok("lnkok", { id: "zalo_7", v: "p2" });
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
  await e.boot(); await e.until(() => e.V().includes('data-act="cdo" data-v="team"'));
  await e.click("cdo", { v: "team" });
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

test("tab Sân: hôm nay 2 giải đấu theo lịch thì tự chọn giải đấu gần giờ nhất, đổi được; chỉ người đã check-in mới có mặt", async () => {
  const now = Date.now(), near = now + 60e3, far = now + 120e3;
  const data = base({ "clubs/q7/sched/a": sched({ name: "Giải đấu gần", at: near, deadline: near }), "clubs/q7/sched/b": sched({ name: "Giải đấu xa", at: far, deadline: far, courts: 3 }),
    "clubs/q7/regs/a_p_p1": { sid: "a", pid: "p1", at: 1 }, "clubs/q7/regs/b_p_p2": { sid: "b", pid: "p2", at: 1, arrived: true } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data });
  await e.boot(); await e.until(() => e.store.get("clubs/q7/app/config").schedId === "a");
  // đã đăng ký nhưng chưa check-in: chưa vào danh sách có mặt
  await e.until(() => e.store.get("clubs/q7/players/p1").active === false);
  expect(e.store.get("clubs/q7/players/p3").active).toBe(false);
  await e.until(() => e.V().includes('data-act="xprep" data-id="b"'));
  await e.click("xprep", { id: "b" });
  await e.until(() => e.store.get("clubs/q7/app/config").schedId === "b");
  expect(e.store.get("clubs/q7/app/config").courts).toBe(3);
  await e.until(() => e.store.get("clubs/q7/players/p2").active === true);
  expect(e.T()).toContain("QR");
});

test("tạo giải đấu: tùy chọn bật/tắt (chi phí, giải thưởng hạng 1-2-3, luật nâng cao, trọng tài) được áp vào giải đấu khi chuẩn bị", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky", user: OWNER, data: base() });
  await e.boot(); await e.click("xnew"); await e.click("xfmt", { v: "xoay" }); await e.until(() => e.V().includes('data-k="gton"'));
  // Giải đấu hôm nay: 30 phút nữa, nhưng không qua nửa đêm (chạy test lúc khuya)
  const d = new Date(Math.min(Date.now() + 30 * 6e4, new Date().setHours(23, 59, 0, 0)));
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

test("giải đăng ký theo cặp: người rủ chọn đồng đội trong CLB, đồng đội thấy lời mời và nhận lời, thành một cặp", async () => {
  const data = base({ "clubs/q7/sched/s1": sched({ fmt: "giai", pairReg: "pair", name: "Giải cặp" }), "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  MINI(e, "#/q7");
  await e.boot(); await e.until(() => e.T().includes("Giải đấu sắp tới"));
  expect(e.T()).toContain("Đăng ký theo cặp");
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes('data-act="gdreg"'));
  await e.click("gdreg"); await e.until(() => e.V().includes('data-act="regin"'));
  expect(e.T()).toContain("Tôi rủ đồng đội");
  const p2 = Object.keys(data).find(k => k.startsWith("clubs/q7/players/") && k !== "clubs/q7/players/p1").split("/").pop();
  await e.click("gdmate", { v: p2 });
  await e.click("gdagree"); await e.click("regin");
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.team === "s1_zalo_9");
  expect(e.store.get("clubs/q7/regs/s1_zalo_9").want).toBe(p2);
  await e.until(() => e.T().includes("MỜI ĐỒNG ĐỘI QUA ZALO"));
  // đồng đội nhận lời: đăng ký với cùng mã cặp
  await globalThis.window.FB.setDoc({ path: "clubs/q7/regs/s1_zalo_8" }, { sid: "s1", uid: "zalo_8", pid: p2, name: "B", at: Date.now(), pay: "none", team: "s1_zalo_9" });
  await e.until(() => e.T().includes("CẶP CỦA BẠN"));
});

test("check-in: các nút đều hỏi xác nhận; check-in tay vào danh sách có mặt, hoàn tác thì ra lại", async () => {
  const now = Date.now(), at = now + 60e3;
  const data = base({ "clubs/q7/sched/a": sched({ name: "Giải đấu gần", at, deadline: at }), "clubs/q7/regs/a_p_p1": { sid: "a", pid: "p1", at: 1 } });
  const e = setup({ host: "pikeco.app", path: "/q7/san", user: OWNER, data });
  await e.boot(); await e.until(() => e.store.get("clubs/q7/app/config").schedId === "a");
  await e.until(() => e.store.get("clubs/q7/players/p1").active === false);
  await e.click("ckman", { id: "a_p_p1" });
  expect(e.store.get("clubs/q7/regs/a_p_p1").arrived).toBeFalsy();
  expect(e.CF()).toContain("Check-in tay");
  await e.ok("ckman", { id: "a_p_p1" });
  await e.until(() => e.store.get("clubs/q7/regs/a_p_p1").arrived === true);
  await e.until(() => e.store.get("clubs/q7/players/p1").active === true);
  await e.ok("ckundo", { id: "a_p_p1" });
  await e.until(() => e.store.get("clubs/q7/regs/a_p_p1").arrived === false);
  await e.until(() => e.store.get("clubs/q7/players/p1").active === false);
});

test("web: VĐV vãng lai đăng ký không cần đăng nhập, bắt buộc chuyển khoản trước (giữ chỗ 15 phút)", async () => {
  const data = base({ "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1, bank: { code: "mb", bin: "970422", name: "MB Bank", acc: "123456", holder: "A" } },
    "clubs/q7/sched/s1": sched({ guests: true, thu: "phi", phi: 60, feeG: 80, pay: "off" }) });
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky/s1", data });
  await e.boot(); await e.until(() => e.V().includes('data-act="gdreg"'));
  expect(e.T()).toContain("Đăng ký ngay trên web, không cần tài khoản");
  await e.click("gdreg"); await e.until(() => e.V().includes('data-act="guestin"'));
  expect(e.T()).toContain("BẮT BUỘC");
  expect(e.V()).not.toContain('data-v="site"');
  expect(e.V()).not.toContain('data-v="mem"');
  expect(e.V()).toContain('data-act="guestin" data-v="hold"');
  e.input("gs-name", "Khách Web"); await e.click("gdagree");
  await e.click("guestin", { v: "hold" });
  expect(e.T()).toContain("Thêm ảnh rõ mặt");
});

test("web: giải không nhận VĐV ngoài CLB thì chỉ có nút đăng ký trong Zalo", async () => {
  const data = base({ "clubs/q7/sched/s1": sched({ guests: false }) });
  const e = setup({ host: "pikeco.app", path: "/q7/dang-ky/s1", data });
  await e.boot(); await e.until(() => e.T().includes("ĐĂNG KÝ TRONG ZALO"));
  expect(e.V()).not.toContain('data-act="gdreg"');
  expect(e.V()).toContain("zalo.me/s/180913816434821856/?clb=q7&amp;buoi=s1");
});

test("nhắn tin: người chơi nhắn người tạo giải từ vé, BTC nhắn người đăng ký; vé không còn nút Thêm lịch", async () => {
  const data = base({ "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1, zalo: "0901234567" },
    "clubs/q7/sched/s1": sched({ byZ: "z-own", byN: "Anh Chủ" }), "clubs/q7/links/zalo_9": { status: "ok", pid: "p1" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  const chats = [];
  globalThis.window.ZMP = { getUserID: async () => "zid9", openChat: async o => { chats.push(o); } };
  MINI(e, "#/q7");
  await e.boot(); await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes('data-act="gdreg"'));
  expect(e.T()).toContain("Liên hệ ban tổ chức"); expect(e.T()).toContain("Anh Chủ");
  await e.click("gdreg"); await e.until(() => e.V().includes('data-act="regin"'));
  await e.click("gdagree"); await e.click("regin");
  await e.until(() => e.store.get("clubs/q7/regs/s1_zalo_9")?.zid === "zid9");
  await e.until(() => e.T().includes("Vé của bạn"));
  expect(e.T()).not.toContain("THÊM LỊCH");
  expect(e.V()).toContain('data-act="gdchat" data-v="by"');
  globalThis.window.open = () => {};
  await e.click("gdchat", { v: "by" });
  expect(chats[0]).toMatchObject({ type: "user", id: "z-own" });
  expect(chats[0].message).toContain("Giải đấu tối");
  delete globalThis.window.ZMP;
});

test("Mini App: chia sẻ gửi tin nhắn kèm link mở đúng trang (Zalo tự nhận link)", async () => {
  const data = base({ "clubs/q7/app/config": { title: "Q7", courts: 1, session: 1, phase: "live" } });
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data });
  const shares = [];
  globalThis.window.ZMP = { getUserID: async () => "zid9", openShareSheet: async o => { shares.push(o); } };
  MINI(e, "#/q7/xep-hang");
  await e.boot(); await e.until(() => e.V().includes("data-pid"));
  await e.click("pshare", { id: "p1" });
  expect(shares[0].type).toBe("text");
  expect(shares[0].data.autoParseLink).toBe(true);
  expect(shares[0].data.text).toContain("HỒ SƠ AN");
  expect(shares[0].data.text).toMatch(/\nhttps:\/\/zalo\.me\/s\/180913816434821856\/\?clb=q7&p=vdv\/p1$/);
  delete globalThis.window.ZMP;
});
