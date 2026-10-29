import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Đợt 5 · luồng trọng tài Mini App (canvas trang rf)
const P = n => ({ name: n, rating0: 3, gender: "M", active: true, createdAt: 1 });
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live", sname: "Giao lưu", target: 11 },
  "clubs/q7/players/p1": P("An"), "clubs/q7/players/p2": P("Bình"), "clubs/q7/players/p3": P("Chi"), "clubs/q7/players/p4": P("Dũng"),
  "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: Date.now() - 6e4 },
  ...extra
});
const ZU = { uid: "zalo_5", isAnonymous: false, displayName: "Zalo" };
const REFD = { "clubs/q7/refs/zalo_5": { court: 1, code: "K", name: "Nam", at: Date.now(), sid: 1 } };
const ss = () => { const m = new Map(); globalThis.sessionStorage = { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) }; };
const boot = async (data, search = "?clb=q7") => { ss(); const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search, user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); return e; };

test("quét mã: màn nhận sân (R1) → sửa tên → Nhận sân → chỉ còn sân của mình, trận mới nổi bật (R3)", async () => {
  const e = await boot(base(), "?clb=q7&tt=1&ttk=K");
  await e.until(() => e.T().includes("Bạn được mời làm trọng tài sân này"));
  expect(e.T()).toContain("Nhận sân 1"); expect(e.T()).toContain("Không phải tôi");
  await e.click("ttname"); e.input("rf-name", "Nam"); await e.click("dhclaimok");
  await e.until(() => e.store.get("clubs/q7/refs/zalo_5"));
  expect(e.store.get("clubs/q7/refs/zalo_5")).toMatchObject({ court: 1, name: "Nam" });
  await e.until(() => e.V().includes('class="rfsh"'));
  expect(e.V()).not.toContain('class="mxnav"');
  expect(e.T()).toContain("TRẬN MỚI VÀO SÂN 1"); expect(e.T()).toContain("ĐIỂM DANH ›"); expect(e.T()).not.toContain("check-in");
  expect(e.T()).not.toContain("Bàn giao sân");
});

test("chờ trận (R2): ô chờ, đã xong, chỉ nút Gọi BTC", async () => {
  const e = await boot(base({ ...REFD, "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "done", sa: 11, sb: 6, doneAt: Date.now() - 3e5 } }));
  await e.until(() => e.T().includes("Chờ trận vào sân"));
  expect(e.T()).toContain("Đã xong · 1 trận"); expect(e.T()).toContain("Gọi BTC");
});

test("luồng mới: Điểm danh (Có mặt từng người, Gọi tên có xác nhận) → Bốc thăm gộp vị trí + luật → Bắt đầu; hoàn tác hỏi lại; BTC mời vào sân hiện dải", async () => {
  const e = await boot(base({ ...REFD, "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: Date.now() - 6e4, inv: Date.now() } }));
  await e.until(() => e.V().includes('class="rfsh"'));
  expect(e.T()).toContain("BTC đã mời vào sân"); expect(e.T()).toContain("Mời An và Chi, Bình và Dũng vào sân 1 chuẩn bị thi đấu");
  await e.click("tt", { id: "m1" }); await e.until(() => e.T().includes("Điểm danh trên sân"));
  expect(e.V()).toContain('<i class="on">Điểm danh</i>');
  await e.click("tthere", { v: "p1" }); await e.until(() => ((e.store.get("clubs/q7/matches/m1").ref || {}).here || {}).p1);
  await e.until(() => e.T().includes("có mặt trên sân"));
  await e.click("ttcallp", { v: "p3", m: "m1" });
  expect(e.T()).toContain("Mời vận động viên Chi, đội An và Chi, ra sân 1 thi đấu.");
  await e.click("ttcallgo", { v: "p3", m: "m1" });
  await e.until(() => [...e.store.keys()].some(k => k.startsWith("clubs/q7/calls/")));
  await e.until(() => e.T().includes("Đã gửi về máy BTC"));
  const [k] = [...e.store.keys()].filter(k => k.startsWith("clubs/q7/calls/"));
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, k), { st: "done", doneAt: Date.now() });
  await e.until(() => e.T().includes("BTC đã gọi tên Chi"));
  await e.click("ttstep", { v: "2" }); await e.until(() => e.T().includes("Đội nào chọn mặt đồng xu?"));
  await e.until(() => (e.store.get("clubs/q7/matches/m1").ref || {}).st === 2);
  expect(e.T()).toContain("Vị trí đứng"); expect(e.T()).toContain("Luật trận"); expect(e.V()).not.toContain('data-act="ttrally"');
  expect(e.V()).not.toContain('data-act="ttface"><');
  await e.click("ttstart"); await e.until(() => (e.store.get("clubs/q7/matches/m1").ref || {}).started);
  await e.click("ttp", { v: "a" }); await e.until(() => (e.store.get("clubs/q7/matches/m1").ref.ev || []).length === 1);
  await e.click("ttundoask"); await e.until(() => e.T().includes("Hoàn tác pha vừa nhập?"));
  await e.click("ttundox"); expect((e.store.get("clubs/q7/matches/m1").ref.ev || []).length).toBe(1);
  await e.click("ttundoask"); await e.click("ttundo"); await e.until(() => (e.store.get("clubs/q7/matches/m1").ref.ev || []).length === 0);
});

test("đã lưu, BTC bấm: Chờ BTC tạo trận mới + dải BTC đã đọc kết quả; BTC huỷ trận thì báo", async () => {
  const e = await boot(base({ ...REFD, "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "done", sa: 11, sb: 6, doneAt: Date.now() - 6e4, readAt: Date.now() } }));
  await e.until(() => e.T().includes("Chờ BTC tạo trận mới"));
  expect(e.T()).toContain("BTC đã đọc kết quả"); expect(e.T()).toContain("Đã lưu vào giải");
  await e.FB.setDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/m2"), { session: 1, seq: 2, court: 1, a: ["p1", "p2"], b: ["p3", "p4"], status: "playing", createdAt: Date.now() });
  await e.until(() => e.T().includes("TRẬN MỚI"));
  await e.FB.deleteDoc(e.FB.doc(e.FB.fs, "clubs/q7/matches/m2"));
  await e.until(() => e.T().includes("BTC đã huỷ trận sân 1"));
});

test("BTC thu hồi sân: hiện màn cảm ơn (R13)", async () => {
  const e = await boot(base(REFD));
  await e.until(() => e.V().includes('class="rfsh"'));
  await e.FB.deleteDoc(e.FB.doc(e.FB.fs, "clubs/q7/refs/zalo_5"));
  await e.until(() => e.T().includes("Cảm ơn bạn đã làm trọng tài"));
  expect(e.T()).toContain("BTC đã thu hồi sân 1");
});

test("lối ra để kín cuối màn chờ trận: Chế độ người chơi có dải Về sân; Kết thúc ca (xác nhận) → trả sân, cảm ơn", async () => {
  const e = await boot(base({ ...REFD, "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "done", sa: 11, sb: 6, doneAt: Date.now() - 3e5 } }));
  await e.until(() => e.V().includes('class="rflinks"'));
  expect(e.V()).not.toContain('data-act="rfmenu"');
  await e.click("rfaway"); await e.until(() => e.V().includes('class="rfaway'));
  expect(e.V()).not.toContain('class="rfsh"'); expect(e.T()).toContain("Bạn đang làm trọng tài sân 1");
  await e.click("rfback"); await e.until(() => e.V().includes('class="rfsh"'));
  await e.click("rfendask"); await e.until(() => e.T().includes("Kết thúc ca trọng tài sân 1?"));
  await e.click("rfend"); await e.until(() => !e.store.get("clubs/q7/refs/zalo_5"));
  await e.until(() => e.T().includes("Bạn đã kết thúc ca ở sân 1"));
});

test("đang có trận thì không hiện lối ra", async () => {
  const e = await boot(base(REFD));
  await e.until(() => e.V().includes('class="rfsh"'));
  expect(e.V()).not.toContain('class="rflinks"');
});

test("giải đã chốt (buổi mới) → quyền trọng tài hết: tự trả sân, cảm ơn", async () => {
  const e = await boot(base(REFD));
  await e.until(() => e.V().includes('class="rfsh"'));
  await e.FB.updateDoc(e.FB.doc(e.FB.fs, "clubs/q7/app/config"), { session: 2, phase: "prep" });
  await e.until(() => e.T().includes("Giải đã chốt"));
  await e.until(() => !e.store.get("clubs/q7/refs/zalo_5"));
});

test("máy BTC: mã dùng 1 lần, mỗi sân 1 trọng tài, bỏ hồ sơ giải cũ", async () => {
  const now = Date.now();
  const data = base({ "clubs/q7/members/zalo_5": { role: "owner", name: "Chủ" }, "clubs/q7": { name: "Q7", public: true, owner: "zalo_5", createdAt: 1 },
    "clubs/q7/refqr/1": { code: "K", at: 1, sid: 1 }, "clubs/q7/refqr/2": { code: "M", at: 1, sid: 1 },
    "clubs/q7/refs/u1": { court: 1, code: "OLD", name: "A", at: now - 6e4, sid: 1 }, "clubs/q7/refs/u2": { court: 1, code: "K", name: "B", at: now, sid: 1 },
    "clubs/q7/refs/u3": { court: 2, code: "X", name: "C", at: now, sid: 0 } });
  const e = await boot(data);
  await e.until(() => e.store.get("clubs/q7/refqr/1").code !== "K");
  await e.until(() => !e.store.get("clubs/q7/refs/u1") && !e.store.get("clubs/q7/refs/u3"));
  expect(e.store.get("clubs/q7/refs/u2")).toBeTruthy(); expect(e.store.get("clubs/q7/refqr/2").code).toBe("M");
});
