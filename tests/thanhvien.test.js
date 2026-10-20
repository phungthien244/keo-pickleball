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
  await e.until(() => e.V().includes('class="tvstat"'));
  expect(e.T()).toMatch(/NỢ PHÍ T\d+/);
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
  expect(e.T()).toContain("PHÍ & THANH TOÁN");
  await e.click("cdo", { v: "intro" });
  await e.click("gtday", { v: "2" }); await e.until(() => (e.store.get("clubs/aep").days || []).includes(2));
  await e.click("gttag", { v: "Nhận người mới" }); await e.until(() => (e.store.get("clubs/aep").tags || []).length === 1);
  await e.click("fvset", { v: "bal" }); await e.until(() => e.store.get("clubs/aep").fundView === "bal");
});
