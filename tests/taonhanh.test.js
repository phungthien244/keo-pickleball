import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Tạo giải nhanh (canvas trang ai) · giai đoạn 1: đọc câu bằng luật, hỏi chip, thẻ xác nhận
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 4, session: 1, phase: "prep" },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", createdAt: 1 },
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const boot = async data => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };
const sched = e => [...e.store.entries()].filter(([k]) => /^clubs\/q7\/sched\/[^/]+$/.test(k)).map(([, v]) => v);

test("đọc câu: chia bảng 16 cặp 4 bảng lấy 2, chủ nhật 7h, 200k → hiểu ngay, thẻ xác nhận, tạo giải mở đăng ký", async () => {
  const e = await boot(base());
  await e.click("xnew"); await e.until(() => e.T().includes("Tạo nhanh"));
  expect(e.T()).toContain("Tạo đầy đủ");
  await e.click("tnpg", { v: "txt" }); await e.until(() => e.T().includes("Chạm để dùng câu mẫu"));
  e.input("tn-txt", "Chủ nhật này 7h sáng, 16 cặp đôi nam nữ, chia 4 bảng lấy 2 cặp mỗi bảng đánh loại trực tiếp, 200k một người, 4 sân");
  await e.until(() => e.T().includes("App đã hiểu"));
  expect(e.T()).toContain("Chia bảng + knockout"); expect(e.T()).toContain("16 cặp"); expect(e.T()).toContain("4 bảng · lấy 2"); expect(e.T()).toContain("07:00");
  await e.click("tngo"); await e.until(() => e.T().includes("Xác nhận giải"));
  expect(e.T()).toContain("Kịp giờ"); expect(e.T()).toContain("200k/người"); expect(e.T()).toContain("Đôi nam nữ".toLowerCase());
  await e.click("tnmk"); await e.until(() => sched(e).length === 1);
  const X = sched(e)[0];
  expect(X).toMatchObject({ fmt: "giai", ko: true, max: 32, dt: "mix", courts: 4, phi: 200, st: "open" });
  expect(new Date(X.at).getDay()).toBe(0); expect(new Date(X.at).getHours()).toBe(7);
});

test("thiếu thông tin thì hỏi bằng chip; không kịp giờ thì báo đỏ và sửa 1 chạm", async () => {
  const e = await boot(base());
  await e.click("xnew"); await e.until(() => e.T().includes("Tạo nhanh")); await e.click("tnpg", { v: "txt" }); await e.until(() => e.T().includes("Chạm để dùng câu mẫu"));
  e.input("tn-txt", "16 cặp chia 4 bảng đánh loại, 2 sân, phải xong trước 9h");
  await e.click("tngo"); await e.until(() => e.T().includes("Đánh ngày nào?"));
  expect(e.T()).toContain("Còn 2 câu");
  await e.click("tnset", { v: "date:" + new Date().setHours(0, 0, 0, 0) }); await e.click("tnnext", { v: "date" });
  await e.until(() => e.T().includes("Mấy giờ bắt đầu?"));
  await e.click("tnset", { v: "time:07:00" }); await e.click("tnnext", { v: "time" });
  await e.until(() => e.T().includes("Không kịp"));
  expect(e.V()).toContain('data-act="tnfix" data-v="c2"');
  await e.click("tnfix", { v: "noend" }); await e.until(() => e.T().includes("Kịp giờ"));
});

test("nhiều nội dung trong một câu → giải có nội dung", async () => {
  const e = await boot(base());
  await e.click("xnew"); await e.until(() => e.T().includes("Tạo nhanh")); await e.click("tnpg", { v: "txt" }); await e.until(() => e.T().includes("Chạm để dùng câu mẫu"));
  e.input("tn-txt", "Chủ nhật 7h, 6 sân, đôi open 16 cặp 300k, đôi nữ 4.2 8 cặp 200k, đôi nam 5.5 16 cặp 200k");
  await e.click("tngo"); await e.until(() => e.T().includes("Xác nhận giải"));
  expect(e.T()).toContain("Đôi nữ 4.2"); expect(e.T()).toContain("Đôi nam 5.5");
  await e.click("tnmk"); await e.until(() => (sched(e)[0] || {}).nds);
  const X = sched(e)[0];
  expect(X.nds.map(n => n.name)).toEqual(["Open", "Đôi nữ 4.2", "Đôi nam 5.5"]);
  expect(X.nds[1]).toMatchObject({ dt: "FF", cap: 4.2, max: 8, fee: 200 });
});

test("như giải lần trước: dùng lại cài đặt, ngày sang tuần sau", async () => {
  const old = Date.now() - 6 * 864e5;
  const e = await boot(base({ "clubs/q7/sched/s0": { name: "Giải tối", fmt: "xoay", at: old, courts: 3, target: 11, max: 20, st: "done", place: "Sân A", createdAt: 1 } }));
  await e.click("xnew"); await e.until(() => e.T().includes("Như giải lần trước"));
  await e.click("tnprev", { id: "s0" }); await e.until(() => e.T().includes("Dựa trên"));
  expect(e.T()).toContain("20 người"); expect(e.V()).toContain('class="tnrow chg"');
  await e.click("tnmk"); await e.until(() => sched(e).length === 2);
  const X = sched(e).find(x => x.at > Date.now());
  expect(X).toMatchObject({ fmt: "xoay", courts: 3, max: 20, place: "Sân A" });
});
