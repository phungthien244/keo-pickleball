import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

const data = () => ({
  "clubs/aep": { name: "AEP", public: true, owner: "u1", mfee: { on: true, k: 200, per: "m", due: 5, perk: 100, fund: true } },
  "clubs/aep/members/u1": { role: "owner", name: "Chủ" },
  "clubs/aep/app/config": { title: "AEP", courts: 2, session: 2 },
  "clubs/aep/players/p1": { name: "An", rating0: 3.2, gender: "M", active: true },
  "clubs/aep/players/p2": { name: "Bình", rating0: 3, gender: "F", active: false },
  "clubs/aep/players/g1": { name: "Khách", rating0: 3, gender: "M", active: false, guest: true }
});
const OWNER = { uid: "u1", isAnonymous: false, email: "chu@x.vn", displayName: "Chủ" };

test("danh sách thành viên: lọc, nợ phí, chuyển thành viên, tạm nghỉ, ghi chú, thu phí", async () => {
  const e = setup({ user: OWNER, data: data() });
  await e.boot(); await e.until(() => e.V().includes("Cài đặt CLB") || true);
  await e.nav("app", { t: "nguoi" });
  await e.until(() => e.V().includes('class="tvmain"'));
  expect(e.T()).toMatch(/Còn nợ/);
  await e.click("tvsel", { id: "p1" });
  expect(e.T()).toContain("Hồ sơ đầy đủ"); expect(e.T()).toContain("Nhắn Zalo");
  await e.click("tvmore"); expect(e.T()).toContain("Có mặt hôm nay");
  await e.click("tvselx");
  expect(e.T()).not.toContain("Hồ sơ đầy đủ");
  await e.click("tvf", { v: "pend" });
  expect(e.T()).toContain("Không có ai chờ duyệt");
  await e.click("tvf", { v: "guest" });
  expect(e.T()).toContain("Khách"); expect(e.T()).not.toContain("Bình");
  await e.click("tvmem", { id: "g1" }); await e.until(() => e.store.get("clubs/aep/players/g1").guest === false);
  await e.click("tvhold", { id: "p2" }); await e.until(() => e.store.get("clubs/aep/players/p2").hold === true);
  e.input("tvn-p1", "Đánh tay trái"); await e.click("tvnote", { id: "p1" });
  await e.until(() => e.store.has("clubs/aep/notes/p1"));
  expect(e.store.get("clubs/aep/notes/p1")).toMatchObject({ t: "Đánh tay trái" });
  const now = new Date(), key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  await e.ok("mfpaid", { id: "p1", v: key });
  await e.until(() => e.store.has("clubs/aep/app/mfee-" + key));
  expect(e.store.get("clubs/aep/app/mfee-" + key).paid.p1).toMatchObject({ k: 200 });
});

test("cài đặt nhóm gọn + giới thiệu: ngày đánh, nhãn", async () => {
  const e = setup({ user: OWNER, data: data() });
  await e.boot(); await e.nav("caidat");
  expect(e.T()).toContain("Nhận tiền");
  await e.click("cdo", { v: "intro" });
  await e.click("gtday", { v: "2" }); await e.until(() => (e.store.get("clubs/aep").days || []).includes(2));
  await e.click("gttag", { v: "Nhận người mới" }); await e.until(() => (e.store.get("clubs/aep").tags || []).length === 1);
  await e.click("fvset", { v: "bal" }); await e.until(() => e.store.get("clubs/aep").fundView === "bal");
});

test("lọc nam/nữ, giao quyền trọng tài/quản lý cho người đã liên kết Zalo, thu quyền", async () => {
  const d = data();
  d["clubs/aep/players/p1"].zuid = "zalo_an";
  d["clubs/aep/links/zalo_an"] = { status: "ok", pid: "p1" };
  const e = setup({ user: OWNER, data: d });
  await e.boot(); await e.nav("app", { t: "nguoi" });
  await e.until(() => e.V().includes('data-act="tvfltx"')); await e.click("tvfltx");
  await e.until(() => e.V().includes('data-act="tvg"'));
  await e.click("tvg", { v: "F" });
  expect(e.T()).toContain("Bình"); expect(e.T()).not.toContain("An\n");
  expect(e.V()).not.toMatch(/data-pid="p1"/);
  await e.click("tvg", { v: "" });
  await e.ok("tvrole", { id: "p1", v: "scorer" });
  await e.until(() => e.store.get("clubs/aep/members/zalo_an")?.role === "scorer");
  expect(e.store.get("clubs/aep/members/zalo_an")).toMatchObject({ name: "An", via: "zalo", pid: "p1" });
  await e.ok("tvrole", { id: "p1", v: "admin" });
  await e.until(() => e.store.get("clubs/aep/members/zalo_an")?.role === "admin");
  await e.click("tvf", { v: "btc" });
  expect(e.T()).toContain("An");
  await e.ok("tvrole", { id: "p1", v: "" });
  await e.until(() => !e.store.has("clubs/aep/members/zalo_an"));
});

test("chủ CLB đăng nhập Google tạo mã liên kết Zalo (cùng quyền, 10 phút), Zalo nhận là có quyền chủ", async () => {
  const e = setup({ user: OWNER, data: data() });
  await e.boot(); await e.nav("caidat");
  await e.until(() => e.V().includes('data-act="alnk"'));
  await e.click("alnk");
  const [k, iv] = [...e.store].find(([k]) => k.startsWith("clubs/aep/invites/"));
  expect(iv).toMatchObject({ role: "owner", link: true });
  expect(iv.exp - Date.now()).toBeLessThanOrEqual(10 * 60e3);
  expect(e.T()).toContain("Quét bằng Zalo trên điện thoại"); expect(k).toMatch(/invites\/[0-9a-f]{24}$/);
});
