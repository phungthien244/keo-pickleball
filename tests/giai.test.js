import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("giải cặp cố định: xếp lịch, kiểm tỉ số, rút lui, tổng kết và giải thưởng", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ\nI\nJ | nữ\nK");
  await e.click("add");
  await e.tab("san");
  await e.click("fmt", { v: "giai" });
  await e.click("cset", { k: "thu", v: "phi" }); await e.cfg("phi", 70); await e.cfg("court", 400);
  await e.click("cset", { k: "gt", v: "gop" }); await e.cfg("gtv", 30);
  for (const [x, y] of [["A", "B"], ["C", "D"], ["E", "F"], ["G", "H"], ["I", "J"]]) { e.input("gp1", e.pid(x)); e.input("gp2", e.pid(y)); await e.click("gadd"); }
  e.input("gp1", e.pid("K")); e.input("gp2", e.pid("K")); await e.click("gadd");
  expect(e.V()).toContain("Hai người phải khác nhau");
  await e.ok("gstart");
  const playing = () => e.docs("matches/", m => m.status === "playing");
  expect(playing().length).toBe(2);
  // lịch theo sân: mỗi sân có trận đang đánh và các trận dự kiến, đủ hết số trận còn lại
  await e.click("lseg", { v: "lich" });
  expect(e.T()).toContain("SÂN 1");
  expect(e.T()).toContain("SÂN 2");
  expect(e.T()).toContain("Sắp tới · dự kiến");
  {const nx=(e.V().match(/data-l="\d+"/g)||[]).length;const tot=(e.V().match(/data-l="/g)||[]).length;expect(nx).toBeGreaterThan(0);expect(tot).toBeGreaterThanOrEqual(nx+2)}
  const vsSan = (e.V().match(/class="m vs"/g) || []).length;
  await e.click("gview", { v: "luot" });
  expect(e.T()).toContain("LƯỢT 1");
  expect((e.V().match(/class="m vs"/g) || []).length).toBe(vsSan);
  await e.click("gview", { v: "san" });
  await e.click("lseg", { v: "san" });
  const [id0] = playing()[0];
  e.input("sa-" + id0, "11"); e.input("sb-" + id0, "11"); await e.click("save", { id: id0 });
  expect(e.V()).toContain("không được hòa"); expect(e.V()).toContain("Chạm 11, không cần cách 2");

  let k = 0, withdrew = null;
  while (playing().length && k < 30) {
    const [id] = playing()[0];
    if (k === 3) {
      const free = e.store.get("app/config").giai.pairs.filter(p => !playing().some(([, m]) => m.pa === p.id || m.pb === p.id));
      withdrew = free[free.length - 1].id;
      await e.click("gout", { id: withdrew }); await e.click("gout", { id: withdrew });
    }
    e.input("sa-" + id, k % 3 ? "11" : "7"); e.input("sb-" + id, k % 3 ? "5" : "11"); await e.click("save", { id }); k++;
  }
  expect(playing().length).toBe(0);
  expect(withdrew).toBeTruthy();
  expect(e.store.get("app/config").giai.out).toHaveProperty(withdrew);
  // không cặp nào gặp nhau hai lần
  const seen = new Set();
  for (const [, m] of e.docs("matches/", m => m.giai && m.status === "done")) { const key = [m.pa, m.pb].sort().join("~"); expect(seen.has(key)).toBe(false); seen.add(key); }

  // công bố kết quả bằng loa
  const said = [];
  globalThis.window.speechSynthesis = { getVoices: () => [{ name: "Linh", lang: "vi-VN" }], cancel() {}, speak: u => said.push(u) };
  globalThis.SpeechSynthesisUtterance = function (t) { this.text = t; };
  globalThis.speechSynthesis = globalThis.window.speechSynthesis;
  expect(e.V()).toContain('data-act="champsay"');
  await e.click("champsay", { k: "champ:live" });
  const ann = said.pop().text;
  expect(ann).toMatch(/^Kính thưa các vận động viên\. .+ đã kết thúc\. Giải ba thuộc về cặp (anh|chị) /);
  expect(ann).toMatch(/Giải nhì thuộc về cặp .+, với \d+ trận thắng, \d+ trận thua/);
  expect(ann).toMatch(/Và vô địch là cặp .+!/);
  expect(ann).toContain("Xin chúc mừng các cặp đấu.");
  await e.click("gend"); await e.click("gend"); await e.until(() => e.store.has("app/hist-1"));
  const cfg = e.store.get("app/config");
  expect(cfg.session).toBe(2);
  const h = e.store.get("app/hist-1");
  expect(h.giai).toBeTruthy();
  expect(h.giai.prizes.length).toBeGreaterThan(0);
  const sv = e.V();
  expect((sv.match(/class="av /g) || []).length).toBeGreaterThanOrEqual(10);
  expect(sv).toContain('class="gpod"');
  expect(sv).toContain('data-act="champsay"');
  await e.tab("home");
  expect(e.V()).toContain("vô địch");
});

test("giải cặp ở bước Tùy chọn: ghép tự động cân trình, bảng thêm cặp gợi ý người cân trình", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF"); await e.click("add");
  await e.tab("san"); await e.click("cset", { k: "fmt", v: "giai" });
  expect(e.V()).toContain('data-act="gauto"');
  await e.click("gaddopen"); expect(e.V()).toContain('class="gsheet"');
  const [a, b] = e.docs("players/").map(([id]) => id);
  await e.click("gpick", { id: a }); expect(e.T()).toContain("gợi ý cân trình");
  await e.click("gpick", { id: b }); await e.click("gadd");
  expect(e.store.get("app/config").giai.pairs.length).toBe(1);
  expect(e.V()).not.toContain('class="gsheet"');
  await e.click("gauto");
  expect(e.store.get("app/config").giai.pairs.length).toBe(3);
  expect(e.T()).toContain("Tạo lịch thi đấu · 3 trận");
});

test("giải cặp: bốc thăm nhóm A/B, lẻ người phải chọn ngồi ngoài, mỗi cặp 1 người A + 1 người B, bốc lại", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF\nG"); await e.click("add");
  await e.tab("san"); await e.click("cset", { k: "fmt", v: "giai" });
  await e.click("gbopen"); expect(e.V()).toContain("gbsheet");
  // 7 người: lẻ 1, nút bốc bị khoá cho tới khi chọn người ngồi ngoài
  expect(e.V()).toMatch(/data-act="gbgo" disabled/);
  const ids = e.docs("players/").map(([id]) => id);
  const out = ids.find(id => e.V().includes(`data-act="gbout" data-id="${id}"`));
  await e.click("gbout", { id: out });
  await e.click("gblive");
  await e.click("gbgo");
  const G = e.store.get("app/config").giai;
  expect(G.pairs.length).toBe(3);
  expect(G.pairs.every(p => p.draw === 1)).toBe(true);
  expect(G.draw.n).toBe(1);
  expect(G.pairs.flatMap(p => [p.a, p.b])).not.toContain(out);
  expect(e.V()).toContain("Bốc thăm lúc");
  // Nam / Nữ: nhóm B toàn nữ
  await e.click("gbclose");
  await e.ok("gbredo");
  expect(e.store.get("app/config").giai.pairs.length).toBe(0);
  await e.click("gbmode", { v: "mf" });
  const women = e.docs("players/").filter(([, p]) => p.gender === "F").map(([id]) => id);
  expect(e.V()).toMatch(/data-act="gbgo" disabled/);
  for (const id of ids.filter(id => !women.includes(id)).slice(0, 3)) await e.click("gbout", { id });
  await e.click("gbgo");
  const G2 = e.store.get("app/config").giai;
  expect(G2.pairs.length).toBe(2);
  expect(G2.pairs.every(p => women.includes(p.b) && !women.includes(p.a))).toBe(true);
  expect(G2.draw.n).toBe(2);
});

test("vòng bảng → knockout: chia bảng có hạt giống, vòng bảng, bán kết, chung kết chạm 15, tranh hạng ba", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC\nD\nE\nF\nG\nH\nI\nJ\nK\nL\nM\nN\nO\nP"); await e.click("add");
  await e.tab("san"); await e.click("cset", { k: "fmt", v: "bang" });
  expect(e.store.get("app/config").fmt).toBe("giai");
  expect(e.store.get("app/config").giai.ko.n).toBe(4);
  await e.click("koset", { k: "n", v: "2" });
  await e.click("gauto");
  expect(e.store.get("app/config").giai.pairs.length).toBe(8);
  expect(e.V()).toMatch(/data-act="gstart" disabled/);
  await e.click("kodraw");
  const K = e.store.get("app/config").giai.ko;
  expect(K.groups.length).toBe(2);
  expect(K.groups.every(g => g.length === 4)).toBe(true);
  // mỗi bảng 1 hạt giống
  expect(K.groups.every(g => g.filter(id => K.seeds.includes(id)).length === 1)).toBe(true);
  expect(e.T()).toContain("BẢNG A");
  await e.ok("gstart");
  const playing = () => e.docs("matches/", m => m.status === "playing");
  let k = 0;
  while (playing().length && k < 40) {
    const [id, m] = playing()[0];
    if (m.ko) {
      if (m.ko === "k1-0") {
        expect(m.to).toBe(15);
        e.input("sa-" + id, "11"); e.input("sb-" + id, "9"); await e.click("save", { id });
        expect(e.V()).toContain("15");
        e.input("sa-" + id, "15"); e.input("sb-" + id, "12");
      } else { e.input("sa-" + id, "11"); e.input("sb-" + id, "6"); }
    } else { e.input("sa-" + id, k % 2 ? "11" : "8"); e.input("sb-" + id, k % 2 ? "4" : "11"); }
    await e.click("save", { id }); k++;
  }
  const done = e.docs("matches/", m => m.giai && m.status === "done");
  expect(done.filter(([, m]) => !m.ko).length).toBe(12);
  expect(done.filter(([, m]) => m.ko).map(([, m]) => m.ko).sort()).toEqual(["k0-0", "k0-1", "k1-0", "k3"]);
  // nhất bảng A không gặp nhì bảng A ở bán kết
  const sf = done.filter(([, m]) => m.ko && m.ko.startsWith("k0")).map(([, m]) => [m.pa, m.pb]);
  for (const [x, y] of sf) expect(K.groups.some(g => g.includes(x) && g.includes(y))).toBe(false);
  expect(e.T()).toContain("VÔ ĐỊCH");
  await e.click("gend"); await e.click("gend"); await e.until(() => e.store.has("app/hist-1"));
  const h = e.store.get("app/hist-1");
  const fin = done.find(([, m]) => m.ko === "k1-0")[1];
  expect(h.giai.table[0].id).toBe(fin.sa > fin.sb ? fin.pa : fin.pb);
  expect(h.giai.ko.n).toBe(2);
});
