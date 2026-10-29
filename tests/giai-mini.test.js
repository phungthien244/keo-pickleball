import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Đợt 2 · các màn Giải trong Mini App (canvas trang gc)
const tmr = () => { const d = new Date(Date.now() + 864e5); d.setHours(19, 0, 0, 0); return d.getTime(); };
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep" },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: false, createdAt: 1 },
  "clubs/q7/players/p2": { name: "Bình", rating0: 3.2, gender: "M", active: false, createdAt: 2 },
  "clubs/q7/sched/s1": { name: "Giao lưu tối thứ 5", fmt: "xoay", at: tmr(), end: "21:30", courts: 2, target: 11, max: 8, st: "open", openAt: 0, place: "Kỳ Hòa", deadline: tmr(), lockAt: tmr() - 7200e3, cp: true, thu: "phi", phi: 60, pay: "opt" },
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const boot = async (data) => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };

test("tạo giải: câu 2 không còn ô tên, Khác mở ô ngày; câu 3 có Tuỳ chọn thêm → bảng Luật điểm → Lưu, tạo giải giữ luật", async () => {
  const e = await boot(base());
  await e.click("xnew"); await e.click("xqgo", { v: "2" }); await e.until(() => e.T().includes("Đánh khi nào, ở đâu?"));
  expect(e.V()).not.toContain('id="xf-name"');
  await e.click("gsk", { v: "d" }); expect(e.V()).toContain('id="xf-date"');
  await e.click("xqgo", { v: "3" }); await e.until(() => e.V().includes('data-act="gspg"'));
  await e.click("gspg"); await e.until(() => e.T().includes("Tuỳ chọn thêm"));
  await e.click("gsopt", { v: "luat" }); expect(e.T()).toContain("Đánh tới mấy điểm");
  await e.click("xfset", { k: "target", v: "15" }); await e.click("gsok");
  expect(e.T()).toContain("Chạm 15");
  await e.click("gspgx"); await e.click("xsave", { v: "open" });
  await e.until(() => [...e.store.keys()].filter(k => k.startsWith("clubs/q7/sched/")).length === 2);
  const X = [...e.store].filter(([k]) => k.startsWith("clubs/q7/sched/") && !k.endsWith("/s1"))[0][1];
  expect(X).toMatchObject({ target: 15, adv: true, st: "open" });
  await e.until(() => e.T().includes("Đã tạo giải")); expect(e.T()).toContain("Gửi vào nhóm Zalo");
});

test("đăng ký: 3 ô số, lọc, chạm người mở 3 nút to; ⋯ có Thêm người vào giải → trang riêng thêm được", async () => {
  const e = await boot(base({ "clubs/q7/regs/s1_p_p1": { sid: "s1", pid: "p1", name: "An", at: 1, pay: "sent" } }));
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes('class="g2st"'));
  expect(e.T()).toContain("Chưa trả 1"); expect(e.T()).toContain("BÁO CHUYỂN");
  await e.click("xbsel", { id: "s1_p_p1" }); await e.until(() => e.T().includes("Báo đã chuyển 60k"));
  expect(e.T()).toContain("Nhắn Zalo"); expect(e.T()).toContain("Huỷ chỗ");
  await e.click("xbselx");
  await e.click("xbmenu"); expect(e.T()).toContain("Duyệt tiền nhiều người");
  await e.click("gmxa"); await e.until(() => e.T().includes("Thêm người vào giải"));
  await e.click("regaddp", { id: "p2" }); await e.until(() => e.store.get("clubs/q7/regs/s1_p_p2"));
  await e.click("regadd"); await e.until(() => e.V().includes('class="g2st"'));
});

test("sửa giải: 6 nhóm có giá trị; Tiền › Lệ phí thành viên → 100k → Lưu ghi ngay vào giải", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes('class="g2st"'));
  await e.click("xbmenu"); await e.click("gmxe"); await e.until(() => e.T().includes("Tiền, giải thưởng"));
  expect(e.T()).toContain("60k");
  await e.click("gmsec", { v: "tien" }); await e.until(() => e.T().includes("Lệ phí thành viên"));
  await e.click("gsopt", { v: "fee" }); await e.click("xqfee", { v: "100" }); await e.click("gsok");
  await e.until(() => e.store.get("clubs/q7/sched/s1").phi === 100);
  expect(e.T()).toContain("Lệ phí thành viên");
});

test("ngày đánh (Mini App): chỉ check-in bằng mã, không còn bàn đón, check-in tay hay người đến muộn", async () => {
  const at = Date.now() + 3600e3;
  const e = await boot(base({ "clubs/q7/sched/s1": { name: "Hôm nay", fmt: "xoay", at, courts: 2, target: 11, max: 8, st: "open", openAt: 0, deadline: at }, "clubs/q7/regs/s1_p_p1": { sid: "s1", pid: "p1", name: "An", at: 1, arrived: true } }));
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes("MỞ MÃ CHECK-IN"));
  expect(e.V()).toContain('data-act="ckopen"'); expect(e.T()).toContain("✓ An");
  await e.click("gmmore"); expect(e.T()).toContain("Mã QR check-in");
  expect(e.V()).not.toContain('data-a="ckall"'); expect(e.V()).not.toContain('data-a="hnlate"');
});

test("đang đánh: thẻ sân to → Nhập điểm (hai ô to, + −) → Lưu; Kết quả; Chốt 4 bước có thanh bước", async () => {
  const P = n => ({ name: n, rating0: 3, gender: "M", active: true, createdAt: 1 });
  const e = await boot(base({ "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live", sname: "Giao lưu sáng" },
    "clubs/q7/players/p1": P("An"), "clubs/q7/players/p2": P("Bình"), "clubs/q7/players/p3": P("Chi"), "clubs/q7/players/p4": P("Dũng"),
    "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: Date.now() - 6e5 } }));
  await e.nav("app", { t: "san" }); await e.until(() => e.V().includes('class="sct'));
  expect(e.T()).toContain("SÂN 1"); expect(e.T()).toContain("TRỐNG"); expect(e.T()).toContain("Hết giờ · sang chốt");
  await e.click("g4m", { id: "m1" }); await e.until(() => e.T().includes("Sân 1 · nhập điểm"));
  for (let i = 0; i < 11; i++) await e.click("g4d", { k: "sa-m1", d: "1" });
  await e.click("g4d", { k: "sb-m1", d: "1" }); await e.click("g4d", { k: "sb-m1", d: "1" });
  expect(e.T()).toContain("An & Chi thắng");
  await e.click("save", { id: "m1" }); await e.until(() => e.store.get("clubs/q7/matches/m1").status === "done");
  expect(e.store.get("clubs/q7/matches/m1")).toMatchObject({ sa: 11, sb: 2 });
  await e.until(() => e.V().includes('data-act="g4v" data-v="kq"'));
  await e.click("g4v", { v: "kq" }); await e.until(() => e.T().includes("Kết quả · 1 trận"));
  await e.click("g4x"); await e.click("gmst", { v: "3" }); await e.until(() => e.T().includes("Bước 1/4"));
  await e.click("chotgo", { v: "4" }); await e.until(() => e.T().includes("Dư vào quỹ CLB") || e.T().includes("Quỹ bù"));
  expect(e.T()).toContain("Gửi kết quả vào nhóm Zalo");
});

test("ngày đánh: ⋯ → BTC check-in giùm, tích chọn là check-in, bỏ tích bấm 2 lần", async () => {
  const at = Date.now() + 60e3;
  const e = await boot(base({ "clubs/q7/sched/s1": { name: "Hôm nay", fmt: "xoay", at, courts: 2, target: 11, max: 8, st: "open", openAt: 0, deadline: at }, "clubs/q7/regs/s1_p_p1": { sid: "s1", pid: "p1", name: "An", at: 1, arrived: true }, "clubs/q7/regs/s1_p_p2": { sid: "s1", pid: "p2", name: "Bình", at: 2 } }));
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes("MỞ MÃ CHECK-IN"));
  await e.click("gmmore"); expect(e.V()).toContain('data-a="ckbtc"');
  await e.click("gmdo", { a: "ckbtc", id: "s1" }); await e.until(() => e.T().includes("BTC check-in giùm"));
  expect(e.T()).toContain("Đã tới 1/2");
  await e.click("ckbtct", { id: "s1_p_p2" }); await e.until(() => e.store.get("clubs/q7/regs/s1_p_p2").arrived === true);
  expect(e.store.get("clubs/q7/regs/s1_p_p2").arrBy).toBe("btc");
  await e.click("ckbtct", { id: "s1_p_p1" }); expect(e.store.get("clubs/q7/regs/s1_p_p1").arrived).toBe(true);
  await e.click("ckbtct", { id: "s1_p_p1" }); await e.until(() => e.store.get("clubs/q7/regs/s1_p_p1").arrived === false);
  await e.click("ckbtcx"); await e.until(() => e.V().includes("MỞ MÃ CHECK-IN"));
});
