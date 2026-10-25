import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

const mid = e => e.docs("matches/", m => m.status !== "done")[0][0];

test("màn trọng tài: gọi điểm theo luật giao bóng, đổi bên, timeout, hoàn tác, lưu tỉ số", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "An\nBình\nChi | nữ\nDung | nữ"); await e.click("add");
  await e.tab("san"); await e.ok("start"); await e.click("gen");
  const id = mid(e);
  expect(e.V()).toContain('data-act="tt"');
  await e.click("tt", { id });
  expect(e.V()).toContain("Bắt đầu trận · 0-0-2");
  // bốc thăm: đội b chọn ngửa, tung, đội thắng chọn giao trước
  await e.click("tttc", { v: "b" }); await e.click("tttcall", { v: "N" }); await e.click("ttflip");
  const T = e.store.get("matches/" + id).ref.toss;
  expect(["a", "b"]).toContain(T.w);
  await e.click("ttpick", { v: "serve" });
  expect(e.store.get("matches/" + id).ref.first).toBe(T.w);
  await e.click("ttfirst", { v: "a" });
  await e.click("ttstart");
  expect(e.T()).toContain("0-0-2");
  await e.click("ttp", { v: "a" }); expect(e.T()).toContain("1-0-2");   // đội giao ghi điểm
  await e.click("ttp", { v: "b" }); expect(e.T()).toContain("0-1-1");   // người 2 mất giao → đổi giao
  await e.click("ttp", { v: "a" }); expect(e.T()).toContain("0-1-2");   // người 1 mất → người 2
  await e.click("ttundo"); expect(e.T()).toContain("0-1-1");
  await e.click("ttto", { v: "a" }); expect(e.T()).toContain("Timeout");
  await e.click("tttoe");
  expect(e.store.get("matches/" + id).ref.ev.length).toBe(4);
  // b ghi liên tiếp tới 6 → đổi bên (ván quyết định duy nhất)
  for (let i = 0; i < 6; i++) await e.click("ttp", { v: "b" });
  expect(e.T()).toContain("Đổi bên sân");
  await e.click("ttsw");
  for (let i = 0; i < 5; i++) await e.click("ttp", { v: "b" });
  expect(e.T()).toContain("Lưu tỉ số vào giải");
  await e.click("ttsave");
  const m = e.store.get("matches/" + id);
  expect(m).toMatchObject({ status: "done", sa: 1, sb: 11 });
  expect(m.ref.ev.filter(x => x.k === "p").length).toBe(13);
});
