import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("luồng buổi: chuẩn bị → đang đánh → chốt, quỹ buổi, còn nợ, sổ quỹ, sửa sau khi chốt", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "An\nBình\nChi | nữ\nDung | nữ\nEm\nPhương | nữ\nGiang\nHà | nữ"); await e.click("add");
  await e.tab("san");
  // ① Chuẩn bị: thấy điểm danh, thể thức, tiền, nút bắt đầu; chưa có ô xếp trận
  expect(e.T()).toContain("Buổi #1 · chuẩn bị");
  expect(e.T()).toContain("Điểm danh");
  expect(e.V()).toContain('data-act="start"');
  expect(e.V()).not.toContain('data-act="gen"');
  await e.click("cset", { k: "thu", v: "phi" }); await e.cfg("phi", 60); await e.cfg("court", 300);
  await e.click("target", { d: "-1" });
  expect(e.store.get("app/config").target).toBe(10);
  await e.click("target", { d: "1" });
  // cho 1 người nghỉ rồi vào lại
  const ha = e.pid("Hà");
  await e.click("att", { id: ha }); expect(e.store.get("players/" + ha).active).toBe(false);
  await e.click("att", { id: ha }); expect(e.store.get("players/" + ha).active).toBe(true);
  await e.click("start");
  expect(e.store.get("app/config").phase).toBe("live");
  // ② Đang đánh: dải tóm tắt + nút Sửa, bảng sửa mở được
  expect(e.T()).toContain("Buổi #1 · đang đánh");
  await e.click("sheet"); expect(e.V()).toContain("Sửa buổi #1");
  await e.click("courts", { d: "1" }); expect(e.store.get("app/config").courts).toBe(3);
  await e.click("sheetx");
  await e.click("gen");
  for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, "11"); e.input("sb-" + id, "7"); await e.click("save", { id }); }
  await e.click("gen");
  for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, "11"); e.input("sb-" + id, "9"); await e.click("save", { id }); }
  // Quỹ · Buổi này: 8 người × 60k
  await e.tab("tien");
  expect(e.T()).toContain("Phải thu 480k");
  expect(e.T()).toContain("Ai đã đóng · 0/8");
  const an = e.pid("An"), binh = e.pid("Bình"), chi = e.pid("Chi");
  await e.click("lpaid", { p: an }); await e.click("lpaid", { p: binh });
  expect(e.store.get("app/pay-1").paid).toEqual({ [an]: true, [binh]: true });
  expect(e.T()).toContain("Đã nhận 120k");
  // số riêng: Chi đến muộn đóng 30k
  await e.click("adj", { id: chi }); e.input("aj-" + chi, "30"); await e.click("adjsave", { id: chi });
  expect(e.store.get("app/pay-1").adj[chi]).toBe(30);
  expect(e.T()).toContain("Phải thu 450k");
  // ③ Chốt: người chưa đóng ghi vào Còn nợ
  await e.nav("chot");
  expect(e.url).toBe("/aep/chot-buoi");
  expect(e.T()).toContain("Chốt buổi #1");
  expect(e.T()).toContain("Vào quỹ ngay");
  await e.cfg("water", 30);
  await e.click("chot"); await e.click("chot"); await e.until(() => e.store.has("app/hist-1"));
  const h = e.store.get("app/hist-1");
  expect(h.track).toBe(true);
  expect(h.paid).toEqual({ [an]: true, [binh]: true });
  expect(h.money.cost).toBe(330);
  expect(h.money.club).toBe(450 - 330);
  expect(h.rows.find(r => r.id === chi).pay).toBe(30);
  expect(e.store.get("app/config").phase).toBe("prep");
  expect(e.store.get("app/config").session).toBe(2);
  // Sổ quỹ: số dư = 120 − nợ (450 − 120 đã nhận = 330) = −210
  await e.tab("tien"); await e.click("qv", { v: "so" });
  expect(e.T()).toContain("Còn nợ · 330k");
  expect(e.T()).toContain("Quỹ CLB hiện có −210k");
  await e.click("paid", { id: "1", p: chi });
  expect(e.T()).toContain("Còn nợ · 300k");
  // ghi tay
  await e.click("ledf", { v: "chi" }); e.input("lg-k", "50"); e.input("lg-n", "Mua bóng"); await e.click("ledsave");
  const led = e.docs("app/led-");
  expect(led.length).toBe(1); expect(led[0][1].k).toBe(-50);
  expect(e.T()).toContain("Mua bóng");
  expect(e.T()).toContain("Quỹ CLB hiện có −230k");
  // sau buổi: mở lại để sửa chi phí
  await e.nav("buoi", { id: "1" });
  expect(e.T()).toContain("Buổi #1 · đã chốt");
  await e.click("hopen", { id: "1" }); e.input("hc-court-1", "250"); await e.click("hsave", { id: "1" });
  expect(e.store.get("app/hist-1").money.club).toBe(450 - 280);
  expect(e.store.get("app/hist-1").editedAt).toBeGreaterThan(0);
  // buổi mới bắt đầu ở bước chuẩn bị
  await e.tab("san");
  expect(e.T()).toContain("Buổi #2 · chuẩn bị");
});

test("thành viên xem tab Sân: không thấy cài đặt, thấy trạng thái buổi", async () => {
  const players = { "players/a": { name: "An", active: true, createdAt: 1 }, "players/b": { name: "Bình", active: true, createdAt: 2 } };
  const e = setup({ path: "/aep/san", data: { "app/config": { session: 3, courts: 2 }, ...players } });
  await e.boot();
  expect(e.T()).toContain("Buổi #3 sắp bắt đầu");
  expect(e.V()).not.toContain('data-act="cset"');
  expect(e.V()).not.toContain('data-act="gen"');
  const e2 = setup({ path: "/aep/san", data: { "app/config": { session: 3, courts: 2, phase: "live" }, ...players } });
  await e2.boot();
  expect(e2.T()).toContain("Buổi #3 · đang đánh");
  expect(e2.V()).not.toContain('data-act="sheet"');
});
