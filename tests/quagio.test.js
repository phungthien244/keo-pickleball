import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Buổi đã bắt đầu mà người tổ chức quên kết thúc: nhắc → ẩn với người chơi → tự đóng (tiền không tự chốt)
const H = 36e5;
const at0 = (agoH) => Date.now() - agoH * H;
const hhmm = t => { const d = new Date(t); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
// Buổi bắt đầu lúc `startAt`, kéo dài 2 tiếng (end tính theo giờ trong ngày)
const data = (startAt, lastAt) => ({
  "clubs/q7": { name: "Pickleball Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Dũng" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live", schedId: "s1", fee: 0, costs: { court: 0, water: 0, ball: 0, other: 0 } },
  "clubs/q7/players/p1": { name: "An", gender: "M", active: true, createdAt: 1, uid: "zalo_5" },
  "clubs/q7/players/p2": { name: "Bình", gender: "M", active: true, createdAt: 1 },
  "clubs/q7/players/p3": { name: "Cường", gender: "M", active: true, createdAt: 1 },
  "clubs/q7/players/p4": { name: "Dương", gender: "M", active: true, createdAt: 1 },
  "clubs/q7/links/zalo_5": { status: "ok", pid: "p1", at: 1 },
  "clubs/q7/sched/s1": { name: "Social tối T5", fmt: "xoay", at: startAt, end: hhmm(startAt + 2 * H), courts: 2, target: 11, max: 8, guests: true, st: "open", openAt: 0, place: "Sân AEP", createdAt: 1 },
  "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p2"], b: ["p3", "p4"], sa: 11, sb: 7, status: "done", createdAt: lastAt - 6e5, doneAt: lastAt },
  "clubs/q7/matches/m2": { session: 1, seq: 2, court: 2, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: lastAt - 6e5 }
});
const boot = async (user, d, ls = {}) => {
  const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", user, data: d });
  globalThis.window.ZMINI = 1; globalThis.location.hash = "";
  const LS = { "pb-mini-last": "q7", ...ls };
  globalThis.localStorage = { getItem: k => LS[k] ?? null, setItem() {}, removeItem() {} };
  await e.boot(); return e;
};
const ORG = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const PLR = { uid: "zalo_5", isAnonymous: false, displayName: "Zalo" };

test("quá giờ 1 tiếng: người tổ chức thấy dải nhắc ở Lịch · Tôi tổ chức, bấm Chốt ngay vào trang chốt", async () => {
  const start = at0(3.6); // kết thúc dự kiến ~1.6 tiếng trước, trận cuối 1 tiếng trước
  const e = await boot(ORG, data(start, at0(1)));
  await e.until(() => e.T().includes("Lịch đánh của tôi"));
  await e.click("mtseg", { v: "tc" });
  await e.until(() => e.T().includes("Social tối T5 đã quá giờ kết thúc"));
  await e.click("mtab", { v: "tin" });
  expect(e.T()).toContain("Chốt ngay để lưu kết quả và tiền");
  await e.click("ovgo"); await e.until(() => e.T().includes("Thu nốt"));
  expect(e.store.get("clubs/q7/app/config").phase).toBe("live"); // chưa tự đóng
});

test("qua nửa đêm, yên 3 tiếng: máy người tổ chức tự đóng buổi, giữ kết quả, bỏ trận chưa có tỉ số, tiền chờ chốt", async () => {
  const start = at0(30); // hôm qua
  const e = await boot(ORG, data(start, start + 1.5 * H));
  await e.until(() => e.store.get("clubs/q7/app/hist-1")?.auto === true);
  const h = e.store.get("clubs/q7/app/hist-1");
  expect(h.matchCount).toBe(1); expect(h.closedBy).toBe("Tự đóng"); expect(h.sname).toBe("Social tối T5");
  await e.until(() => e.store.get("clubs/q7/app/config").phase === "prep");
  expect(e.store.get("clubs/q7/sched/s1").st).toBe("done"); expect(e.store.get("clubs/q7/sched/s1").auto).toBe(true);
  expect(e.store.get("clubs/q7/matches/m2")).toBeFalsy();
  expect(e.store.get("clubs/q7/matches/m1").status).toBe("done");
  // Nhắc chốt tiền ở Tin
  await e.click("mtab", { v: "tin" });
  await e.until(() => e.T().includes("Social tối T5 đã tự đóng · chưa chốt tiền"));
});

test("người chơi: buổi đang trong giờ vẫn hiện Đang đánh", async () => {
  const start = at0(1);
  const e = await boot(PLR, data(start, at0(0.1)));
  await e.until(() => e.T().includes("● Đang đánh"));
});

test("người chơi: buổi quá giờ lâu không còn hiện Đang đánh; người chơi không tự đóng buổi", async () => {
  const start = at0(30);
  const e = await boot(PLR, data(start, start + 1.5 * H));
  await e.until(() => e.T().includes("Lịch đánh của tôi"));
  expect(e.T()).not.toContain("● Đang đánh");
  expect(e.store.get("clubs/q7/app/config").phase).toBe("live");
  expect(e.store.get("clubs/q7/app/hist-1")).toBeFalsy();
});
