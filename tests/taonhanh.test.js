import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Tạo giải nhanh (canvas trang ai): đọc câu (AI, dự phòng bằng luật), 4 nhóm bắt buộc, thẻ xác nhận, sửa bằng lời
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
const open = async e => { await e.click("xnew"); await e.until(() => e.T().includes("Tạo nhanh")); await e.click("tnpg", { v: "txt" }); await e.until(() => e.T().includes("Chạm để dùng câu mẫu")); };
const day0 = () => new Date().setHours(0, 0, 0, 0);

test("câu đủ mọi mục (đọc bằng luật khi không có AI) → trò chuyện chỉ còn câu có sẵn cách phổ biến → bỏ qua hết → tạo giải đúng luật từng vòng", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "Chủ nhật này 7h đến 11h30, 16 cặp đôi nam nữ, chia 4 bảng lấy 2 đánh loại trực tiếp, 4 sân, 200k/người, chuyển khoản trước, nhất 1 triệu nhì 500 ba 200k, thành viên clb");
  await e.until(() => e.T().includes("App đọc nhanh được"));
  expect(e.T()).toContain("nhất 1 triệu"); expect(e.T()).toContain("chuyển khoản trước");
  await e.click("tngo"); await e.until(() => e.T().includes("Mình đã hiểu"));
  // Mục đã nói không hỏi lại; câu đầu tiên là luật điểm vòng bảng, có Bỏ qua hết
  expect(e.T()).toContain("Vòng bảng mỗi trận đánh thế nào?"); expect(e.V()).toContain('data-act="tcskip"');
  expect(e.T()).not.toContain("Nội dung đánh đôi gì?");
  await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
  expect(e.T()).toContain("Nhất 1 triệu · Nhì 500k · Ba 200k"); expect(e.T()).toContain("Thắng 2/3 ván chạm 11, cách 2, tối đa 15");
  await e.click("tnmk"); await e.until(() => sched(e).length === 1);
  const X = sched(e)[0];
  expect(X).toMatchObject({ fmt: "giai", ko: true, max: 32, dt: "mix", courts: 4, phi: 200, pay: "req", gton: true, gt: "hang", hang: [1000, 500, 200], end: "11:30", st: "open" });
  expect(X).toMatchObject({ koGt: "11", koGw: "0", koKt: "15", koKw: "1", koKc: "18", koFt: "11", koFs: "3", koFw: "1", koFc: "15" });
  expect(new Date(X.at).getDay()).toBe(0); expect(new Date(X.at).getHours()).toBe(7);
});

test("thiếu thì hỏi bắt buộc trước (chưa có Bỏ qua hết), nút trả lời nhanh, tối đa khác, vòng sau tuỳ chỉnh; không kịp giờ gợi ý sửa; bấm dòng thì hỏi lại", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "16 cặp chia 4 bảng đánh loại, 2 sân, phải xong trước 9h");
  await e.click("tngo"); await e.until(() => e.T().includes("Đánh ngày nào?"));
  expect(e.V()).not.toContain('data-act="tcskip"'); expect(e.V()).not.toContain('data-v="__def"');
  await e.click("tca", { k: "date", v: String(day0() + 864e5) }); await e.until(() => e.T().includes("Mấy giờ bắt đầu?"));
  await e.click("tca", { k: "time", v: "07:00" }); await e.until(() => e.T().includes("Lệ phí mỗi người"));
  e.input("tn-say", "250k"); await e.click("tnsay"); await e.until(() => e.T().includes("Có cần chuyển khoản"));
  await e.click("tca", { k: "pay", v: "opt" }); await e.click("tca", { k: "gton", v: "0" });
  await e.until(() => e.T().includes("Nội dung đánh đôi gì?")); expect(e.V()).toContain('data-act="tcskip"');
  await e.click("tca", { k: "dt", v: "__def" }); expect(e.T()).toContain("Để app chọn: Đôi hỗn hợp");
  await e.until(() => e.T().includes("Vòng bảng mỗi trận đánh thế nào?"));
  await e.click("tca", { k: "sG", v: "1:11" }); await e.click("tca", { k: "wG", v: "more" }); await e.until(() => e.T().includes("Tối đa mấy điểm?"));
  await e.click("tca", { k: "cG", v: "15" });
  await e.until(() => e.T().includes("Tứ kết và bán kết đánh thế nào?"));
  await e.click("tca", { k: "pK", v: "more" }); await e.until(() => e.T().includes("Mỗi trận vòng loại đánh mấy ván?"));
  await e.click("tca", { k: "sK", v: "3:11" }); await e.click("tca", { k: "wK", v: "0" });
  await e.click("tca", { k: "pF", v: "5:11:15" });
  await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
  expect(e.T()).toContain("1 ván chạm 11, cách 2, tối đa 15"); expect(e.T()).toContain("Thắng 2/3 ván chạm 11"); expect(e.T()).toContain("Thắng 3/5 ván chạm 11");
  expect(e.T()).toContain("Không kịp"); expect(e.V()).toContain('data-act="tnfix" data-v="c2"');
  await e.click("tnfix", { v: "noend" }); await e.until(() => !e.T().includes("Không kịp"));
  // Bấm dòng Sân → hỏi lại số sân
  await e.click("tcre", { v: "courts" }); await e.until(() => e.T().includes("Dùng mấy sân?"));
  await e.click("tca", { k: "courts", v: "4" }); await e.until(() => e.T().includes("Xong rồi!"));
  await e.click("tnmk"); await e.until(() => sched(e).length === 1);
  expect(sched(e)[0]).toMatchObject({ phi: 250, courts: 4, koGt: "11", koGw: "1", koGc: "15", koKs: "3", koKw: "0", koFs: "5", koFc: "15" });
});

test("AI đọc câu và gõ thêm trong khung trò chuyện", async () => {
  const e = await boot(base());
  globalThis.window.__PBAI = 1;
  const calls = [];
  globalThis.fetch = async (u, o) => { const b = JSON.parse(o.body); calls.push(b);
    const t = b.cur ? { courts: 6, h3: 300 } : { fmt: "giai", pairs: 8, date: (d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`)(new Date(day0() + 864e5)), time: "18:30", courts: 4, fee: 150, pay: "off", gton: true, gt: "hang", h1: 800, h2: 400, dt: "MM", guests: false };
    return { ok: true, json: async () => ({ ok: true, t }) }; };
  try {
    await open(e);
    e.input("tn-txt", "tối mai 6 rưỡi 8 đôi nam đánh vòng tròn, 150 cành, nhất 8 lít nhì 4 lít, trả tiền tại sân");
    await e.click("tngo"); await e.until(() => e.T().includes("Mình đã hiểu"));
    expect(calls[0].txt).toContain("8 đôi nam"); expect(calls[0].ctx.today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(e.T()).toContain("Mỗi trận đánh thế nào?"); expect(e.T()).not.toContain("Thắng 2/3");
    e.input("tn-say", "thêm 2 sân, giải ba 300"); await e.click("tnsay"); await e.until(() => e.T().includes("thêm 2 sân, giải ba 300"));
    expect(calls[1].cur.courts).toBe(4);
    await e.click("tca", { k: "wG", v: "c:0" }); await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
    expect(e.T()).toContain("Vòng tròn theo cặp"); expect(e.T()).toContain("6 sân"); expect(e.T()).toContain("Ba 300k"); expect(e.T()).toContain("18:30");
    await e.click("tnmk"); await e.until(() => sched(e).length === 1);
    expect(sched(e)[0]).toMatchObject({ fmt: "giai", ko: false, max: 16, dt: "MM", courts: 6, phi: 150, pay: "off", hang: [800, 400, 300], adv: true, win2: true, ptMax: 0 });
  } finally { delete globalThis.window.__PBAI; delete globalThis.fetch; }
});

test("nhiều nội dung trong một câu → giải có nội dung", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "Chủ nhật 7h, 6 sân, đôi open 16 cặp 300k, đôi nữ 4.2 8 cặp 200k, đôi nam 5.5 16 cặp 200k, chuyển khoản tuỳ chọn, không có giải thưởng");
  await e.click("tngo"); await e.until(() => e.T().includes("Mình đã hiểu"));
  expect(e.T()).toContain("Đôi nữ 4.2"); expect(e.T()).toContain("Đôi nam 5.5");
  await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
  await e.click("tnmk"); await e.until(() => (sched(e)[0] || {}).nds);
  const X = sched(e)[0];
  expect(X.nds.map(n => n.name)).toEqual(["Đôi open", "Đôi nữ 4.2", "Đôi nam 5.5"]);
  expect(X.nds[1]).toMatchObject({ dt: "FF", cap: 4.2, max: 8, fee: 200 });
});

test("như giải lần trước: dùng lại cả tiền và giải thưởng, ngày sang tuần sau", async () => {
  const old = Date.now() - 6 * 864e5;
  const e = await boot(base({ "clubs/q7/sched/s0": { name: "Giải tối", fmt: "xoay", at: old, courts: 3, target: 11, max: 20, st: "done", place: "Sân A", thu: "keo", pay: "off", gton: true, gt: "codinh", gtv: 300, trao: "namnu", createdAt: 1 } }));
  await e.click("xnew"); await e.until(() => e.T().includes("Như giải lần trước"));
  await e.click("tnprev", { id: "s0" }); await e.until(() => e.T().includes("Mình lấy lại cài đặt"));
  expect(e.T()).toContain("Xong rồi!");
  expect(e.T()).toContain("20 người"); expect(e.T()).toContain("Ai thua góp"); expect(e.T()).toContain("CLB bỏ ra 300k");
  await e.click("tnmk"); await e.until(() => sched(e).length === 2);
  const X = sched(e).find(x => x.at > Date.now());
  expect(X).toMatchObject({ fmt: "xoay", courts: 3, max: 20, place: "Sân A", thu: "keo", gton: true, gt: "codinh", gtv: 300 });
});
