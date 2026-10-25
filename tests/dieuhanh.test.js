import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("điều hành: ô sân, nghỉ giữa giờ chặn đưa trận mới, đánh tiếp", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF\nG | nữ\nH | nữ"); await e.click("add");
  await e.tab("san"); await e.ok("start");
  expect(e.V()).toContain('data-act="dhct"');
  await e.click("dhps"); expect(e.T()).toContain("Nghỉ giữa giờ");
  await e.click("dhpsgo", { v: "10" });
  expect(e.store.get("app/config").pause.until).toBeGreaterThan(Date.now());
  expect(e.T()).toContain("Đang nghỉ giữa giờ");
  await e.click("gen");
  expect(e.docs("matches/").length).toBe(0);
  await e.click("dhresume");
  expect(e.store.get("app/config").pause).toBeFalsy();
  await e.click("gen");
  expect(e.docs("matches/").length).toBe(2);
  await e.click("dhct", { v: "1" });
  expect(e.V()).toContain('class="dhct g on"');
  await e.click("dhan"); e.input("dh-ann", "Thử loa"); await e.click("dhango");
  expect(e.T()).not.toContain("Câu mẫu");
  await e.click("dhqr");
  await e.until(() => e.V().includes('class="dhqr one"><b>SÂN 1</b>'));
  expect(e.V()).not.toContain('class="dhqrs"');
  await e.click("dhqrk", { v: "2" });
  expect(e.V()).toContain('class="dhqr one"><b>SÂN 2</b>');
});
