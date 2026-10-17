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

test("lời MC đọc thể thức: tự tạo theo cài đặt, sửa được, đọc bằng nút Thể thức", async () => {
  const said = [];
  const e = setup({ pin: true });
  globalThis.window.speechSynthesis = { getVoices: () => [{ name: "Linh", lang: "vi-VN" }], cancel() {}, speak: u => said.push(u) };
  globalThis.SpeechSynthesisUtterance = function (t) { this.text = t; };
  globalThis.speechSynthesis = globalThis.window.speechSynthesis;
  await e.boot();
  e.input("bulk", "Tuấn\nHà | nữ\nMinh\nLan | nữ"); await e.click("add");
  await e.tab("san");
  expect(e.T()).toContain("Lời MC đọc thể thức");
  expect(e.T()).toContain("Mỗi trận đánh chạm 11 điểm, đội thắng phải cách biệt 2 điểm");
  expect(e.T()).toContain("Khi một đội đạt 6 điểm, hai đội đổi sân");
  expect(e.T()).toContain("đánh lại");
  await e.click("start");
  expect(e.V()).toContain('data-act="speakrules"');
  await e.click("speakrules");
  expect(said.pop().text).toMatch(/^Xin chào các vận động viên/);
  e.H.change({ target: { dataset: { save: "cfg", key: "mc" }, value: "Chào mừng anh chị em, hôm nay đánh chạm 15." } }); await e.tick();
  expect(e.store.get("app/config").mc).toBe("Chào mừng anh chị em, hôm nay đánh chạm 15.");
  await e.click("speakrules");
  expect(said.pop().text).toBe("Chào mừng anh chị em, hôm nay đánh chạm 15.");
  await e.click("mcreset");
  expect(e.store.get("app/config").mc).toBe("");
});

test("lưu tỉ số: hiện Xác nhận và Đọc kết quả, đọc đúng sân và tỉ số", async () => {
  const said = [];
  const e = setup({ pin: true });
  globalThis.window.speechSynthesis = { getVoices: () => [{ name: "Linh", lang: "vi-VN" }], cancel() {}, speak: u => said.push(u) };
  globalThis.SpeechSynthesisUtterance = function (t) { this.text = t; };
  globalThis.speechSynthesis = globalThis.window.speechSynthesis;
  await e.boot();
  e.input("bulk", "Tuấn\nHà | nữ\nMinh\nLan | nữ"); await e.click("add");
  await e.tab("san"); await e.click("start"); await e.click("gen");
  const [id] = e.docs("matches/", x => x.status === "playing")[0];
  e.input("sa-" + id, "11"); e.input("sb-" + id, "7");
  await e.click("savechk", { id });
  expect(e.store.get("matches/" + id).status).toBe("playing");
  expect(e.T()).toContain("Xác nhận");
  expect(e.T()).toContain("Đọc kết quả");
  await e.click("readres", { id });
  expect(said.pop().text).toMatch(/^Sân số 1 kết thúc\. Cặp .+ đã chiến thắng cặp .+, với tỉ số 11, 7\.$/);
  await e.click("save", { id });
  expect(e.store.get("matches/" + id).status).toBe("done");
});
