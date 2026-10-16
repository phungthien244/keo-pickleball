import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("tạo CLB: kiểm form, giữ tên dành riêng, ghi đủ tài liệu", async () => {
  const e = setup({
    search: "?tao",
    user: { uid: "g2", isAnonymous: false, email: "new@x.vn", displayName: "New" },
    data: { "clubs/aep": { name: "AEP", public: true, owner: "u1" }, "codes/ABCD1234": { used: false } }
  });
  await e.boot();
  expect(e.T()).toContain("Tạo CLB");
  e.input("nc-name", "CLB Quận 7"); await e.click("nc-create");
  expect(e.T()).toContain("Nhập số Zalo");
  e.input("nc-contact", "0901234567"); e.input("nc-slug", "aep"); await e.click("nc-create");
  expect(e.T()).toMatch(/Đường dẫn (đã|này)/);
  e.input("nc-slug", "clb-quan-7"); await e.click("nc-create"); await e.until(() => e.href);
  expect(e.store.get("clubs/clb-quan-7")).toMatchObject({ name: "CLB Quận 7", owner: "g2", status: "pending", public: true });
  expect(e.store.get("clubs/clb-quan-7")).not.toHaveProperty("contact");
  expect(e.store.get("clubs/clb-quan-7/private/info")).toEqual({ contact: "0901234567", ownerEmail: "new@x.vn" });
  expect(e.store.get("users/g2").club).toBe("clb-quan-7");
  expect(e.store.get("clubs/clb-quan-7/members/g2").role).toBe("owner");
  expect(e.href).toBe("/?clb=clb-quan-7&san=nguoi");
});

test("tạo CLB bằng mã mời thì hoạt động ngay và đánh dấu mã đã dùng", async () => {
  const e = setup({
    search: "?tao",
    user: { uid: "g3", isAnonymous: false, email: "b@x.vn", displayName: "B" },
    data: { "codes/ABCD1234": { used: false } }
  });
  await e.boot();
  e.input("nc-name", "Hà Nội Dinks"); e.input("nc-contact", "0912345678"); e.input("nc-code", "abcd1234");
  await e.click("nc-create"); await e.until(() => e.href);
  expect(e.store.get("clubs/ha-noi-dinks")).toMatchObject({ status: "active", code: "ABCD1234" });
  expect(e.store.get("codes/ABCD1234")).toMatchObject({ used: true, club: "ha-noi-dinks", by: "g3" });
});

test("quản trị nền tảng duyệt CLB chờ", async () => {
  const e = setup({
    search: "?quantri",
    user: { uid: "pa", isAnonymous: false, email: "phungthien244@gmail.com", displayName: "PA" },
    data: { "clubs/q7": { name: "Q7", public: true, owner: "u7", status: "pending", createdAt: 1 }, "clubs/q7/private/info": { contact: "0901234567", ownerEmail: "q7@x.vn" } }
  });
  await e.boot(); await e.until(() => e.T().includes("Chờ duyệt (1)"));
  expect(e.T()).toContain("q7@x.vn");
  await e.click("qa-ok", { id: "q7" }); await e.until(() => e.store.get("clubs/q7").status === "active");
  expect(e.store.get("clubs/q7").status).toBe("active");
});
