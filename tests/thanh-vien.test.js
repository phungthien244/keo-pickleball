import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

const club = {
  "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 },
  "clubs/q7/secret/pin": { value: "2468" },
  "clubs/q7/app/config": { title: "Q7", courts: 1, session: 1 },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: true, createdAt: 1 },
  "clubs/q7/players/p2": { name: "Bình", rating0: 3, gender: "M", active: true, createdAt: 2 },
  "clubs/q7/players/p3": { name: "Chi", rating0: 3, gender: "F", active: true, createdAt: 3 },
  "clubs/q7/players/p4": { name: "Dung", rating0: 3, gender: "F", active: true, createdAt: 4 },
  "clubs/q7/players/p5": { name: "Em", rating0: 3, gender: "F", active: true, createdAt: 5 },
  "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: 1 }
};

test("người xem chọn tên mình: thấy đang đánh sân nào, hàng chờ có thứ tự, không thấy nút quản lý", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/san", data: club });
  const mem = {};
  globalThis.localStorage = { getItem: k => mem[k] ?? null, setItem: (k, v) => (mem[k] = v), removeItem: k => delete mem[k] };
  await e.boot();
  expect(e.T()).not.toContain("Bạn là ai?");
  e.H.change({ target: { dataset: { me: "1" }, value: "p1" } }); await e.tick();
  expect(mem["pb-me-q7"]).toBe("p1");
  expect(e.T()).toContain("Đang đánh sân 1");
  expect(e.T()).toContain("Xin chào");

  e.H.change({ target: { dataset: { me: "1" }, value: "p5" } }); await e.tick();
  expect(e.T()).toContain("Thứ 1 trong hàng chờ");
  expect(e.mk("#hact").innerHTML).toContain('href="/q7/dang-nhap"');
});

test("trang đăng nhập CLB: vào bằng PIN rồi chuyển sang Sân", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/dang-nhap", data: club });
  await e.boot();
  expect(e.T()).toContain("Đăng nhập bằng Google");
  expect(e.T()).toContain("Vào bằng PIN");
  e.input("pinname", "Hùng"); e.input("pin", "2468"); await e.click("login"); await e.until(() => e.url === "/q7/san");
  expect(e.mk("#hact").innerHTML).toContain('href="/q7/cai-dat"');
  expect(e.T()).toContain("Chưa được giao sân");
});

test("đang có buổi đánh: người xem không vào được Quỹ và Lịch sử, có nút chia sẻ trực tiếp", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/san", data: { ...club, "clubs/q7/app/config": { title: "Q7", courts: 1, session: 1, phase: "live" } } });
  let shared = null;
  globalThis.navigator.clipboard = { writeText: async t => { shared = t; } };
  await e.boot();
  await e.tab("tien");
  expect(e.T()).toContain("đang đánh");
  expect(e.T()).not.toContain("Sổ quỹ CLB");
  await e.tab("ls");
  expect(e.T()).toContain("đang đánh");
  await e.click("lshare"); await e.until(() => shared);
  expect(shared).toMatch(/^📣 Q7: .+ đang diễn ra! 🔴 𝗟𝗜𝗩𝗘\n1 sân · \d+ người\. Mời cả nhà vào xem trực tiếp:/);
  expect(shared).toContain("👉 Bấm link (không cần đăng nhập):");
  expect(shared).not.toContain("Buổi #");
  expect(shared).toContain("/q7/san");
});
