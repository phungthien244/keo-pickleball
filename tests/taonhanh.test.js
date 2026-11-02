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
const open = async e => { await e.click("xnew"); await e.until(() => e.T().includes("Tả giải bằng một câu")); expect(e.T()).toContain("HOẶC CHỌN THỂ THỨC"); };
const day0 = () => new Date().setHours(0, 0, 0, 0);

test("câu đủ mọi mục (đọc bằng luật khi không có AI) → trò chuyện chỉ còn câu có sẵn cách phổ biến → bỏ qua hết → tạo giải đúng luật từng vòng", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "Chủ nhật này 7h đến 11h30, 16 cặp đôi nam nữ, chia 4 bảng lấy 2 đánh loại trực tiếp, 4 sân, 200k/người, chuyển khoản trước, nhất 1 triệu nhì 500 ba 200k, thành viên clb");
  await e.until(() => e.T().includes("App đã nhận ra · 7/7"));
  expect(e.T()).toContain("Nhất 1 triệu · Nhì 500k"); expect(e.T()).toContain("chuyển khoản trước"); expect(e.T()).not.toContain("HOẶC CHỌN THỂ THỨC");
  await e.click("tngo"); await e.until(() => e.T().includes("Mình đã hiểu"));
  // Mục đã nói không hỏi lại; câu đầu tiên là luật điểm vòng bảng, có Bỏ qua hết
  expect(e.T()).toContain("Vòng bảng mỗi trận đánh thế nào?"); expect(e.V()).toContain('data-act="tcskip"');
  expect(e.T()).not.toContain("Nội dung đánh đôi gì?");
  await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
  expect(e.T()).toContain("Nhất 1 triệu · Nhì 500k · Ba 200k"); expect(e.T()).toContain("Thắng 2/3 ván · mỗi ván 11 điểm cách 2, tối đa 15");
  await e.click("tnmk"); await e.until(() => sched(e).length === 1);
  const X = sched(e)[0];
  expect(X).toMatchObject({ fmt: "giai", ko: true, max: 32, dt: "mix", courts: 4, phi: 200, pay: "req", gton: true, gt: "hang", hang: [1000, 500, 200], end: "11:30", st: "open" });
  expect(X).toMatchObject({ koGt: "11", koGw: "0", koKt: "15", koKw: "1", koKc: "18", koFt: "11", koFs: "3", koFw: "1", koFc: "15" });
  expect(new Date(X.at).getDay()).toBe(0); expect(new Date(X.at).getHours()).toBe(7);
});

test("thiếu thì hỏi bắt buộc trước (chưa có Bỏ qua hết), nút trả lời nhanh, tối đa khác, vòng sau tuỳ chỉnh; không kịp giờ gợi ý sửa; bấm dòng thì hỏi lại", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "16 cặp chia 4 bảng đánh loại, 2 sân");
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
  expect(e.T()).toContain("1 ván · 11 điểm cách 2, tối đa 15"); expect(e.T()).toContain("Thắng 2/3 ván · mỗi ván chạm 11"); expect(e.T()).toContain("Thắng 3/5 ván · mỗi ván 11 điểm cách 2, tối đa 15");
  expect(e.T()).not.toContain("Xong trước"); expect(e.T()).not.toContain("Không kịp");
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

test("trang đầu: chạm thể thức (không gõ) → trò chuyện hỏi từ số cặp", async () => {
  const e = await boot(base());
  await open(e);
  await e.click("tnfmt", { v: "giai" }); await e.until(() => e.T().includes("Bao nhiêu cặp?"));
  expect(e.T()).toContain("Vòng tròn theo cặp"); expect(e.T()).not.toContain("Giải đánh theo thể thức nào?");
  await e.click("tca", { k: "n", v: "6" }); await e.until(() => e.T().includes("Đánh ngày nào?"));
});

test("gõ sai: vô nghĩa (2 lần thì có form đầy đủ), hỏi luật, thể thức chưa có (ghi lại), số vô lý, mâu thuẫn, tên tục", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "16 cặp chia 2 bảng mỗi bảng 3 cặp, CN 7h, 4 sân, 200k, ck trước, không giải, tên \"địt mẹ cup\"");
  await e.click("tngo"); await e.until(() => e.T().includes("Bạn muốn sao?"));
  expect(e.T()).toContain("16 cặp mà 2 bảng × 3 cặp chỉ có 6 cặp");
  await e.click("tcx", { v: "0" }); await e.until(() => e.T().includes("Tên này không dùng được"));
  await e.click("tcx", { v: "0" });
  const say = async t => { e.input("tn-say", t); await e.click("tnsay"); };
  await say("haha"); await e.until(() => e.T().includes("Mình chưa hiểu"));
  expect(e.V()).not.toContain('data-act="tnfull"');
  await say("ê ê"); await e.until(() => e.T().includes("Có vẻ gõ hơi khó")); expect(e.V()).toContain('data-act="tnfull"');
  await say("cách 2 là gì vậy"); await e.until(() => e.T().includes("phải thắng cách 2 điểm"));
  await say("thôi đánh loại trực tiếp luôn, thua là về"); await e.until(() => e.T().includes("App chưa có loại trực tiếp riêng"));
  await e.until(() => e.store.has(`yeucau/${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}_q7_loai`));
  await e.click("tcx", { v: "0" }); await e.until(() => !e.T().includes("Chọn thể thức khác"));
  await say("500 cặp"); await e.until(() => e.T().includes("Bạn chắc chứ?"));
  await e.click("tcx", { v: "0" });
  await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
  expect(e.T()).toContain("Số cặp 50 cặp"); expect(e.T()).toContain("Tên giải Giải đôi");
});

test("gõ luật điểm đúng vòng đang hỏi; sửa ngay trên thẻ tóm tắt không hỏi lại từ đầu", async () => {
  const e = await boot(base());
  await open(e);
  e.input("tn-txt", "Chủ nhật 7h, 16 cặp chia 4 bảng, 4 sân, 200k/người, chuyển khoản trước, không giải");
  await e.click("tngo"); await e.until(() => e.T().includes("Mình đã hiểu"));
  await e.click("tca", { k: "dt", v: "mix" }); await e.click("tca", { k: "sG", v: "1:11" }); await e.click("tca", { k: "wG", v: "0" });
  await e.until(() => e.T().includes("Tứ kết và bán kết đánh thế nào?"));
  const say = async t => { e.input("tn-say", t); await e.click("tnsay"); };
  await say("1 ván chạm 15"); await e.until(() => e.T().includes("Chung kết đánh thế nào?"));
  expect(e.T()).toContain("Đã ghi tứ kết, bán kết"); expect(e.T()).toContain("1 ván · chạm 15.");
  await say("thắng 3/5, 15 cách 2"); await e.until(() => e.T().includes("Cách 2 thì tối đa mấy điểm?"));
  await e.click("tcx", { v: "2" }); await e.until(() => e.T().includes("Có đánh tranh hạng ba"));
  expect(e.T()).toContain("Thắng 3/5 ván · mỗi ván 15 điểm cách 2, tối đa ?");
  await e.click("tcskip"); await e.until(() => e.T().includes("Xong rồi!"));
  // Sửa sân ngay trên thẻ
  await e.click("tced", { v: "courts" }); await e.until(() => e.V().includes('data-act="tce" data-k="courts"'));
  await e.click("tce", { k: "courts", v: "6" }); await e.until(() => e.T().includes("6 sân"));
  expect(e.T()).toContain("Xong rồi!"); expect(e.T()).not.toContain("Dùng mấy sân?");
  // Sửa chung kết: số ván, tối đa
  await e.click("tced", { v: "pF" }); await e.click("tcr", { x: "F", f: "sets", v: "3" }); await e.click("tcr", { x: "F", f: "cap", v: "17" });
  await e.until(() => e.T().includes("Thắng 2/3 ván · mỗi ván 15 điểm cách 2, tối đa 17"));
  // Đổi sang xoay cặp: thiếu số người thì mở luôn dòng đó
  await e.click("tced", { v: "fmt" }); await e.click("tce", { k: "fmt", v: "xoay" }); await e.until(() => e.V().includes('data-act="tce" data-k="n"'));
  await e.click("tce", { k: "n", v: "20" }); await e.until(() => e.T().includes("Tối đa 20 người"));
  expect(e.T()).toContain("Xong rồi!");
  await e.click("tnmk"); await e.until(() => sched(e).length === 1);
  expect(sched(e)[0]).toMatchObject({ fmt: "xoay", max: 20, courts: 6 });
});
