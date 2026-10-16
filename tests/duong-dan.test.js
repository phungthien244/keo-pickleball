import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

const club = (id, extra = {}) => ({
  [`clubs/${id}`]: { name: "CLB " + id.toUpperCase(), public: true, owner: "own", createdAt: 1 },
  [`clubs/${id}/app/config`]: { title: "CLB " + id.toUpperCase(), courts: 2, session: 2 },
  [`clubs/${id}/players/p1`]: { name: "An", rating0: 3, gender: "M", active: true, createdAt: 1 },
  ...extra
});

test("link cũ ?clb=..&san=bxh đổi sang /clb/xep-hang", async () => {
  const e = setup({ search: "?clb=q7&san=bxh", data: club("q7") });
  await e.boot();
  expect(e.replaced).toBe("/q7/xep-hang");
  expect(e.T()).toContain("Bảng xếp hạng hôm nay");
});

test("link cũ ?buoi=1 trên rr.pikeco.app mở tổng kết buổi của AEP", async () => {
  const e = setup({ search: "?buoi=1", data: club("aep", { "clubs/aep/app/hist-1": { sid: 1, title: "AEP", startedAt: 1, endedAt: 2, matchCount: 0, rows: [], money: { gap: 0, cost: 0 } } }) });
  await e.boot();
  expect(e.replaced).toBe("/aep/buoi/1");
  expect(e.T()).toContain("Buổi #1");
});

test("trang gốc pikeco.app là trang giới thiệu, không tải dữ liệu CLB", async () => {
  const e = setup({ host: "pikeco.app", data: club("aep") });
  await e.boot(); await e.until(() => e.T().includes("CLB AEP"));
  expect(e.mk("#title").innerHTML).toContain("pikeco");
  expect(e.T()).toContain("Tạo CLB của bạn");
  expect(e.V()).toContain('href="/aep"');
  expect(e.mk("#tabs").hidden).toBe(true);
});

test("đường dẫn CLB: tab đổi URL, buổi và cài đặt mở đúng trang", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7", user: { uid: "own", isAnonymous: false, email: "o@x.vn" }, data: club("q7", { "clubs/q7/members/own": { role: "owner" } }) });
  await e.boot();
  await e.tab("bxh"); expect(e.url).toBe("/q7/xep-hang");
  await e.tab("nguoi"); expect(e.url).toBe("/q7/thanh-vien");
  expect(e.T()).not.toContain("Quản lý CLB");
  await e.tab("tien"); expect(e.url).toBe("/q7/quy");
  await e.tab("home"); expect(e.url).toBe("/q7");
  expect(e.mk("#sub").innerHTML).toContain('href="/q7/cai-dat"');
  await e.nav("caidat"); expect(e.url).toBe("/q7/cai-dat");
  expect(e.T()).toContain("Quản lý CLB");
  expect(e.T()).toContain("pikeco.app · quản lý CLB pickleball");
});

test("mở link mời dạng /clb/moi/<mã> thì nhận quyền", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/moi/tok9", user: { uid: "u5", isAnonymous: false, email: "m@x.vn", displayName: "M" },
    data: club("q7", { "clubs/q7/members/own": { role: "owner" }, "clubs/q7/invites/tok9": { role: "scorer", exp: Date.now() + 1e6 } }) });
  await e.boot(); await e.until(() => e.store.has("clubs/q7/members/u5"));
  expect(e.store.get("clubs/q7/members/u5")).toMatchObject({ role: "scorer", invite: "tok9" });
  expect(e.replaced).toBe("/q7");
});

test("đăng nhập xong tự mở CLB của mình", async () => {
  const e = setup({ host: "pikeco.app", path: "/dang-nhap", user: { uid: "own", isAnonymous: false, email: "o@x.vn" }, data: { ...club("q7"), "users/own": { club: "q7", at: 1 } } });
  await e.boot(); await e.until(() => e.href);
  expect(e.href).toBe("/q7");
});

test("chuyển từ trang CLB sang trang nền tảng thì tải lại trang", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7", data: club("q7") });
  await e.boot();
  await e.nav("tao");
  expect(e.href).toBe("/tao-clb");
});
