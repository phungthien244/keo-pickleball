import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("nút loa mời vào sân đọc đúng xưng hô anh/chị và số sân", async () => {
  const said = [];
  const e = setup({ pin: true });
  globalThis.window.speechSynthesis = { getVoices: () => [{ name: "Linh", lang: "vi-VN" }], cancel() {}, speak: u => said.push(u) };
  globalThis.SpeechSynthesisUtterance = function (t) { this.text = t; };
  globalThis.speechSynthesis = globalThis.window.speechSynthesis;
  await e.boot();
  e.input("bulk", "Tuấn\nHà | nữ\nMinh\nLan | nữ"); await e.click("add");
  await e.tab("san"); await e.click("start"); await e.click("gen");
  const [id, m] = e.docs("matches/", x => x.status === "playing")[0];
  expect(e.V()).toContain('data-act="speak"');
  await e.click("speak", { id });
  expect(said.length).toBe(1);
  expect(said[0].lang).toBe("vi-VN");
  expect(said[0].voice.name).toBe("Linh");
  expect(said[0].text).toMatch(/^Xin mời cặp (anh|chị) .+, và cặp (anh|chị) .+, vào sân số 1, chuẩn bị thi đấu\.$/);
  expect(said[0].text).toContain("chị Hà");
  expect(said[0].text).toContain("anh Tuấn");
});
