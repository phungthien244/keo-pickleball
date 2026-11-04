import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Khung 5 tab Mini App (canvas "Hệ sinh thái · Lịch đánh"): Tìm · Lịch · ＋ · Tin · Tôi
const DAY = 864e5, at = d => { const x = new Date(Date.now() + d * DAY); x.setHours(19, 0, 0, 0); return x.getTime(); };
const sc = (extra = {}) => ({ name: "Social tối thứ 7", fmt: "xoay", at: at(1), end: "21:30", courts: 2, target: 11, max: 8, guests: true, st: "open", openAt: 0, deadline: at(1), lockAt: at(1) - 7200e3, place: "Sân AEP", ...extra });
const data = () => ({
  "clubs/q7": { name: "Pickleball Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Dũng" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep" },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: true, createdAt: 1 },
  "clubs/q7/sched/s1": sc(),
  "clubs/q7/sched/s2": sc({ name: "Giải đôi nam", fmt: "giai", ko: true, loai: "g", at: at(3), cp: true, fee: 200 }),
  "clubs/q7/regs/s1_x": { sid: "s1", uid: "zalo_5", pid: "", name: "Lan", at: Date.now() - 60e3 },
  "clubs/q7/regs/s1_y": { sid: "s1", uid: "zalo_6", pid: "", name: "Minh", at: Date.now() - 30e3 },
  "clubs/q8": { name: "Q8 Smash", public: true, owner: "o8", createdAt: 1 },
  "clubs/q8/app/config": { title: "Q8", courts: 2, session: 1, phase: "prep" },
  "clubs/q8/sched/m1": sc({ name: "Mini game CN", fmt: "giai", loai: "m", at: at(1), cp: true, fee: 100 }),
  "clubs/q8/regs/m1_zalo_9": { sid: "m1", uid: "zalo_9", pid: "", name: "Dũng", at: 1, guest: true }
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const LS = { "pb-mini-last": "q7", "pb-mini-clubs": JSON.stringify([{ id: "q7", name: "Pickleball Q7", role: "Chủ CLB" }, { id: "q8", name: "Q8 Smash", role: "VĐV ngoài CLB" }]) };
const boot = async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user: ZU, data: data() });
  globalThis.window.ZMINI = 1; globalThis.location.hash = "";
  globalThis.localStorage = { getItem: k => LS[k] ?? null, setItem() {}, removeItem() {} };
  await e.boot(); return e;
};

test("mở app không kèm link: vào tab Lịch, thấy lịch đã đăng ký ở trang khác, chưa trả tiền", async () => {
  const e = await boot();
  await e.until(() => e.T().includes("Lịch đánh của tôi") && e.T().includes("Mini game CN"));
  expect(e.V()).toContain('class="mxnav n5"');
  expect(e.V()).toMatch(/class="on" href="#" data-act="mtab" data-v="lich"/);
  expect(e.T()).toContain("MINI GAME"); expect(e.T()).toContain("Q8 Smash"); expect(e.T()).toContain("Chưa trả 100k");
  expect(e.V()).toContain('data-act="miniclub" data-id="q8" data-x="m1"');
});

test("Lịch · Tôi tổ chức: thẻ từng lịch đánh có số người, bấm vào thì vào quản lý; ‹ quay về tab", async () => {
  const e = await boot();
  await e.until(() => e.T().includes("Tôi tổ chức · 2"));
  await e.click("mtseg", { v: "tc" });
  expect(e.T()).toContain("Social tối thứ 7"); expect(e.T()).toContain("2/8"); expect(e.T()).toContain("Còn 6 chỗ");
  expect(e.T()).toContain("GIẢI");
  await e.click("mtql", { x: "s1" }); await e.until(() => e.V().includes("mxdr"));
  expect(e.V()).not.toContain('class="mxnav n5"');
});

test("Tin: người mới đăng ký lịch đánh của tôi, nhắc lịch sắp tới; Tìm lọc theo loại", async () => {
  const e = await boot();
  await e.until(() => e.T().includes("Mini game CN"));
  await e.click("mtab", { v: "tin" });
  expect(e.T()).toContain("Social tối thứ 7: +2 người đăng ký"); expect(e.T()).toContain("mới nhất Minh");
  expect(e.T()).toContain("Sắp tới: Mini game CN");
  await e.click("mtab", { v: "tim" });
  await e.until(() => e.T().includes("Lịch đánh gần bạn") && e.V().includes('id="os-q8-m1"'));
  await e.click("mttyp", { v: "s" });
  expect(e.V()).not.toContain('id="os-q8-m1"'); expect(e.V()).toContain('id="os-q7-s1"');
  await e.click("mttyp", { v: "m" });
  expect(e.V()).toContain('id="os-q8-m1"'); expect(e.V()).not.toContain('id="os-q7-s1"');
});

test("＋ khi đã có trang tổ chức: vào thẳng Tạo lịch đánh với 3 loại", async () => {
  const e = await boot();
  e.store.set("users/zalo_9", { club: "q7", at: 1 });
  await e.until(() => e.T().includes("Lịch đánh của tôi"));
  await e.click("mtplus"); await e.until(() => e.T().includes("Tả lịch đánh bằng một câu"));
  expect(e.T()).toContain("HOẶC CHỌN LOẠI");
  expect(e.V()).toContain('class="tgfc s" data-act="tnfmt" data-v="xoay"');
  expect(e.V()).toContain('class="tgfc m" data-act="tnfmt" data-v="giai"');
});

test("Tôi: đổi tên trang tổ chức tại chỗ (tên tục bị chặn)", async () => {
  const e = await boot();
  e.store.set("users/zalo_9", { club: "q7", at: 1 });
  await e.until(() => e.T().includes("Lịch đánh của tôi"));
  await e.click("mtab", { v: "toi" }); await e.until(() => e.V().includes('data-act="mtren"'));
  expect(e.T()).toContain("Pickleball Q7");
  await e.click("mtren"); e.input("mt-nm", "ab"); await e.click("mtrenok"); expect(e.T()).toContain("ít nhất 3 chữ");
  e.input("mt-nm", "Pickleball Q7 tối thứ 7"); await e.click("mtrenok");
  await e.until(() => e.store.get("clubs/q7").name === "Pickleball Q7 tối thứ 7");
  expect(e.V()).toContain('data-act="mtren"');
});
