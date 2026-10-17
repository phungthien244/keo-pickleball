import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("hủy trận phải xác nhận, hoàn tác khôi phục mọi trận đã hủy/xóa", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "Tuấn\nHà | nữ\nMinh\nLan | nữ\nKhoa\nVy | nữ\nBình\nMai | nữ"); await e.click("add");
  await e.tab("san"); await e.click("start");
  await e.click("courts", { d: "1" }).catch(() => {});
  await e.click("gen");
  const playing = () => e.docs("matches/", x => x.status === "playing");
  const n0 = playing().length;
  expect(n0).toBeGreaterThan(0);
  const [id] = playing()[0];
  await e.click("cancel", { id });
  expect(playing().length).toBe(n0);
  expect(e.T()).toContain("Xác nhận hủy");
  await e.click("cancelx", { id });
  expect(e.T()).not.toContain("Xác nhận hủy");
  await e.click("cancel", { id });
  await e.click("cancelok", { id });
  expect(playing().length).toBe(n0 - 1);
  expect(e.T()).toContain("1 trận đã hủy hoặc xóa");
  expect(e.V()).toContain('data-act="undoall"');
  await e.click("undoall");
  expect(playing().length).toBe(n0);
  expect(e.store.get("matches/" + id)).toBeTruthy();
  expect(e.V()).not.toContain('data-act="undoall"');
});
