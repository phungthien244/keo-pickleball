import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("bấm ảnh vận động viên mở hồ sơ: rating, buổi, đồng đội, đối thủ", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "An\nBình\nChi | nữ\nDung | nữ"); await e.click("add");
  await e.tab("san"); await e.click("start");
  for (let r = 0; r < 4; r++) {
    await e.click("gen");
    for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, "11"); e.input("sb-" + id, "5"); await e.click("save", { id }); }
  }
  await e.click("chot"); await e.click("chot"); await e.until(() => e.store.has("app/hist-1"));
  const an = e.pid("An");
  expect(e.V()).toContain(`data-pid="${an}"`);
  await e.H.click({ target: { closest: s => (s === "[data-pid]" ? { dataset: { pid: an } } : null) } }); await e.tick();
  expect(e.url).toBe("/aep/vdv/" + an);
  await e.until(() => e.T().includes("Phong độ") || e.T().includes("Đồng đội hợp nhất"));
  expect(e.T()).toContain("Hồ sơ vận động viên");
  expect(e.T()).toContain("An");
  expect(e.T()).toMatch(/1 Buổi 4 Trận/);
  expect(e.T()).toContain("Các buổi đã đánh");
  expect(e.T()).not.toContain("phải đóng ");
});
