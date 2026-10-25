import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("luồng giải đấu: chuẩn bị → đang đánh → chốt, quỹ giải đấu, còn nợ, sổ quỹ, sửa sau khi chốt", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "An\nBình\nChi | nữ\nDung | nữ\nEm\nPhương | nữ\nGiang\nHà | nữ"); await e.click("add");
  await e.tab("san");
  // ① Chuẩn bị: thấy điểm danh, thể thức, tiền, nút bắt đầu; chưa có ô xếp trận
  await e.open("gio");
  expect(e.T()).toContain("Giải đấu #1 · chuẩn bị");
  await e.open("ck");
  expect(e.T()).toContain("Ai có mặt");
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
  await e.ok("start");
  expect(e.store.get("app/config").phase).toBe("live");
  // ② Đang đánh: dải tóm tắt + nút Sửa, bảng sửa mở được
  expect(e.T()).toContain("TRỰC TIẾP");
  await e.click("sheet");
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
  expect(e.T()).toContain("Chốt giải đấu #1");
  await e.click("chotgo", { v: "4" });
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
  expect(e.T()).toContain("Giải đấu #1 · đã chốt");
  await e.click("hopen", { id: "1" }); e.input("hc-court-1", "250"); await e.click("hsave", { id: "1" });
  expect(e.store.get("app/hist-1").money.club).toBe(450 - 280);
  expect(e.store.get("app/hist-1").editedAt).toBeGreaterThan(0);
  // buổi mới bắt đầu ở bước chuẩn bị
  await e.tab("san");
  await e.open("gio");
  expect(e.T()).toContain("Giải đấu #2 · chuẩn bị");
});

test("thành viên xem tab Sân: không thấy cài đặt, thấy trạng thái giải đấu", async () => {
  const players = { "players/a": { name: "An", active: true, createdAt: 1 }, "players/b": { name: "Bình", active: true, createdAt: 2 } };
  const e = setup({ path: "/aep/san", data: { "app/config": { session: 3, courts: 2 }, ...players } });
  await e.boot();
  expect(e.T()).toContain("Giải đấu #3 sắp bắt đầu");
  expect(e.V()).not.toContain('data-act="cset"');
  expect(e.V()).not.toContain('data-act="gen"');
  const e2 = setup({ path: "/aep/san", data: { "app/config": { session: 3, courts: 2, phase: "live" }, ...players } });
  await e2.boot();
  expect(e2.T()).toContain("Giải đấu #3 · đang đánh");
  expect(e2.V()).not.toContain('data-act="sheet"');
});

test("luật điểm: chạm, cách 2, điểm trần; tên giải đấu; tắt chi phí", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ"); await e.click("add");
  await e.tab("san");
  e.H.change({ target: { dataset: { save: "cfg", key: "sname" }, value: "Giải đấu tối thứ 5" } }); await e.tick();
  expect(e.store.get("app/config").sname).toBe("Giải đấu tối thứ 5");
  await e.open("gio");
  expect(e.T()).toContain("Giải đấu tối thứ 5 · chuẩn bị");
  expect(e.T()).not.toContain("Giải đấu tối thứ 5 · Giải đấu #1");
  await e.click("ptmax", { v: "1" });
  expect(e.store.get("app/config").ptMax).toBe(15);
  await e.open("tien");
  await e.click("cphi");
  expect(e.store.get("app/config").cphi).toBe(false);
  expect(e.T()).toContain("Giải đấu này không thu phí");
  await e.ok("start"); await e.click("gen");
  const [id] = e.docs("matches/", m => m.status === "playing")[0];
  const tryScore = async (a, b) => { e.input("sa-" + id, a); e.input("sb-" + id, b); await e.click("save", { id }); return e.store.get("matches/" + id).status; };
  expect(await tryScore("16", "14")).toBe("playing");     // vượt trần
  expect(e.V()).toContain("Tối đa 15");
  expect(await tryScore("15", "14")).toBe("done");        // chạm trần trước
  await e.tab("tien");
  expect(e.T()).toContain("Giải đấu này không thu phí");
  await e.tab("san");
  await e.click("win2", { v: "0" });
  expect(e.store.get("app/config").win2).toBe(false);
});

test("đổi thể thức trong bảng Sửa không đẩy về bước Chuẩn bị", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ"); await e.click("add");
  await e.tab("san"); await e.ok("start"); await e.click("sheet");
  await e.click("cset", { k: "fmt", v: "giai" });
  expect(e.T()).toContain("TRỰC TIẾP");
  await e.click("cset", { k: "fmt", v: "xoay" });
  expect(e.store.get("app/config").phase).toBe("live");
  expect(e.T()).toContain("TRỰC TIẾP");
  expect(e.T()).not.toContain("· chuẩn bị");
});

test("giải vòng tròn: giải thưởng nhất nhì ba tuỳ chỉnh", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ"); await e.click("add");
  await e.tab("san");
  await e.click("cset", { k: "fmt", v: "giai" });
  await e.click("gton");
  expect(e.store.get("app/config").gt).toBe("hang");
  await e.cfg("hang1", 500); await e.cfg("hang3", 0);
  await e.open("giai"); expect(e.T()).toContain("Quỹ CLB trả tổng 600k");
  await e.click("cset", { k: "gt", v: "trich" });
  await e.cfg("chia1", 70); await e.cfg("chia2", 30); await e.cfg("chia3", 0);
  expect(e.T()).toContain("Tổng 100%");
});

test("giải đấu không tích Chi phí và Giải thưởng: trang tổng kết không hiện phần chi phí", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ"); await e.click("add");
  await e.tab("san"); await e.click("cphi"); await e.ok("start"); await e.click("gen");
  for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, "11"); e.input("sb-" + id, "4"); await e.click("save", { id }); }
  await e.click("chot"); await e.click("chot"); await e.until(() => e.store.has("app/hist-1"));
  expect(e.store.get("app/hist-1").money.on).toBe(false);
  expect(e.T()).toContain("Kết quả các trận");
  expect(e.T()).not.toContain("Quỹ");
  expect(e.T()).not.toContain("Phải đóng");
  await e.tab("ls");
  expect(e.T()).not.toContain("Quỹ +");
  expect(e.T()).not.toContain("Chưa có bảng chi phí");
});

test("xoay cặp: giải thưởng chi phí từng hạng hoặc chia % cho hạng 1, 2, 3 như cặp cố định", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF"); await e.click("add");
  await e.tab("san"); await e.click("gton"); await e.open("giai");
  await e.click("cset", { k: "gt", v: "hang" });
  expect(e.store.get("app/config")).toMatchObject({ gt: "hang", hang1: 200, hang2: 100, hang3: 50 });
  expect(e.T()).toContain("Quỹ CLB trả tổng 350k");
  await e.click("cset", { k: "gt", v: "trich" });
  expect(e.T()).toContain("Số 1 nam & Số 1 nữ");
  await e.click("cset", { k: "trao", v: "top3" });
  expect(e.store.get("app/config").trao).toBe("top3");
  expect(e.T()).toContain("Chia quỹ giải");
  await e.click("cset", { k: "gt", v: "hang" });
  await e.ok("start"); await e.click("gen");
  for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, "11"); e.input("sb-" + id, "4"); await e.click("save", { id }); }
  await e.tab("tien");
  expect(e.T()).toContain("Hạng nhất");
});
