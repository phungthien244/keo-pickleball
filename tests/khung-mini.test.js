import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Đợt 1 · khung Mini App (canvas trang mn): màn gốc một dòng đầu, màn đi sâu ‹ tên ▾, ẩn tab dưới, ⋯ có Sửa giải + Đổi giải
const tmr = () => { const d = new Date(Date.now() + 864e5); d.setHours(19, 0, 0, 0); return d.getTime(); };
const data = () => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep" },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: true, createdAt: 1 },
  "clubs/q7/sched/s1": { name: "Giao lưu tối thứ 5", fmt: "xoay", at: tmr(), end: "21:30", courts: 2, target: 11, max: 8, st: "open", openAt: 0, place: "Kỳ Hòa", deadline: tmr(), lockAt: tmr() - 7200e3 },
  "clubs/q7/sched/s2": { name: "Giải cặp CN", fmt: "giai", at: tmr() + 864e5, end: "21:30", courts: 2, target: 11, max: 8, st: "open", openAt: 0, deadline: tmr() + 864e5 }
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const H = () => globalThis.document.querySelector("#view").innerHTML;

test("màn gốc: một dòng đầu (CLB ▾ + tên tab), không còn dải trạng thái; có thanh 4 tab", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data: data() }); globalThis.window.ZMINI = 1;
  await e.boot(); await e.until(() => e.V().includes('class="mxnav n4"') && e.V().includes('data-act="mxsheet"'));
  expect(e.V()).not.toContain('class="mxstrip"');
  expect(e.V()).not.toContain('class="mxhd sub mxdr');
  await e.nav("app", { t: "tien" }); await e.until(() => /<small>Quỹ<\/small>/.test(e.V()));
});

test("vào một giải: đầu trang ‹ tên ▾ + dòng phụ, ẩn tab dưới; ⋯ mở Sửa giải, Đổi sang giải khác", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data: data() }); globalThis.window.ZMINI = 1;
  await e.boot(); await e.until(() => e.V().includes('class="mxnav n4"'));
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes("mxdr"));
  expect(e.V()).toContain('data-act="gmsw"');
  expect(e.T()).toContain("Giao lưu tối thứ 5");
  expect(e.T()).toContain("Kỳ Hòa");
  expect(e.V()).not.toContain('class="mxnav');
  expect(e.V()).not.toContain('data-act="gmedit">✎ Sửa');
  await e.click("gmmore"); await e.until(() => e.T().includes("Đổi sang giải khác"));
  expect(e.T()).toContain("Sửa giải"); expect(e.T()).toContain("Giải cặp CN");
  await e.click("gmmorex");
  await e.click("gmsw"); await e.until(() => e.V().includes('aria-label="Đổi giải"'));
});

test("tạo giải: màn riêng ✕ Tạo giải · 1/3, chọn kiểu rồi Tiếp ›, không tab dưới", async () => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data: data() }); globalThis.window.ZMINI = 1;
  await e.boot(); await e.until(() => e.V().includes('data-act="xnew"'));
  await e.click("xnew"); await e.until(() => e.T().includes("Tạo giải · 1/3"));
  expect(e.V()).not.toContain('class="mxnav');
  await e.click("xqsel", { v: "giai" }); expect(e.V()).toMatch(/gmopt on" data-act="xqsel" data-v="giai"/);
  await e.click("xqgo", { v: "2" }); await e.until(() => e.T().includes("Tạo giải · 2/3"));
  await e.click("xclose"); await e.until(() => e.V().includes('class="mxnav n4"'));
});
