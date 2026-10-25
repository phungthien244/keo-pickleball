import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

const club = {
  "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 },
  "clubs/q7/editors/ref1": { pin: "2468", at: 1, name: "Hùng", courts: [1] },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "live" },
  "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: true, createdAt: 1 },
  "clubs/q7/players/p2": { name: "Bình", rating0: 3, gender: "M", active: true, createdAt: 2 },
  "clubs/q7/players/p3": { name: "Chi", rating0: 3, gender: "F", active: true, createdAt: 3 },
  "clubs/q7/players/p4": { name: "Dung", rating0: 3, gender: "F", active: true, createdAt: 4 },
  "clubs/q7/players/p5": { name: "Em", rating0: 3, gender: "M", active: true, createdAt: 5 },
  "clubs/q7/players/p6": { name: "Phú", rating0: 3, gender: "M", active: true, createdAt: 6 },
  "clubs/q7/players/p7": { name: "Giang", rating0: 3, gender: "F", active: true, createdAt: 7 },
  "clubs/q7/players/p8": { name: "Hoa", rating0: 3, gender: "F", active: true, createdAt: 8 },
  "clubs/q7/matches/m1": { session: 1, seq: 1, court: 1, a: ["p1", "p3"], b: ["p2", "p4"], status: "playing", createdAt: 1 },
  "clubs/q7/matches/m2": { session: 1, seq: 2, court: 2, a: ["p5", "p7"], b: ["p6", "p8"], status: "playing", createdAt: 1 }
};

test("trọng tài chỉ nhập điểm sân được giao, không sửa giải đấu, không xếp trận, không điểm danh", async () => {
  const e = setup({ host: "pikeco.app", path: "/q7/san", data: club, user: { uid: "ref1", isAnonymous: true } });
  await e.boot(); await e.until(() => e.T().includes("Bạn là trọng tài"));
  expect(e.T()).toContain("sân 1");
  const V = e.V();
  expect(V).not.toContain('data-act="gen"');
  expect(V).not.toContain('data-act="sheet"');
  expect(V).not.toContain('data-act="step"');
  expect(V).not.toContain('data-act="cancel"');
  expect(V).toContain('data-act="savechk" data-id="m1"');
  expect(V).not.toContain('data-act="savechk" data-id="m2"');
  expect(V).not.toContain('id="sa-m2"');
  expect(e.T()).toContain("Sân của bạn");
  // không lưu được sân 2 kể cả bấm thẳng
  e.input("sa-m2", "11"); e.input("sb-m2", "5"); await e.click("save", { id: "m2" });
  expect(e.store.get("clubs/q7/matches/m2").status).toBe("playing");
  // lưu được sân 1
  e.input("sa-m1", "11"); e.input("sb-m1", "7"); await e.click("savechk", { id: "m1" }); await e.click("save", { id: "m1" });
  await e.until(() => e.store.get("clubs/q7/matches/m1").status === "done");
  // không điểm danh, không xóa
  await e.click("att", { id: "p1" });
  expect(e.store.get("clubs/q7/players/p1").active).toBe(true);
});

test("Chuẩn bị: mục Trọng tài mặc định tắt, bật lên giao sân ngay tại chỗ", async () => {
  const e = setup({
    host: "pikeco.app", path: "/q7/san", user: { uid: "own", isAnonymous: false, email: "o@x.vn", displayName: "Chủ" },
    data: {
      "clubs/q7": { name: "Q7", public: true, owner: "own", createdAt: 1 },
      "clubs/q7/members/own": { role: "owner", name: "Chủ" },
      "clubs/q7/members/sc1": { role: "scorer", name: "Hùng" },
      "clubs/q7/editors/pin1": { pin: "x", at: 1, name: "Lan" },
      "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1 },
      "clubs/q7/players/p1": { name: "An", rating0: 3, gender: "M", active: true, createdAt: 1 }
    }
  });
  await e.boot(); await e.until(() => e.T().includes("Trọng tài"));
  await e.click("hqtab", { v: "tt" });
  expect(e.T()).toContain("ban tổ chức tự nhập");
  await e.click("prow", { v: "tt" });
  expect(e.T()).toContain("Giải đấu này ban tổ chức tự nhập tỉ số");
  expect(e.V()).not.toContain('data-act="refct"');
  await e.click("refon");
  expect(e.store.get("clubs/q7/app/config").refOn).toBe(true);
  await e.until(() => e.V().includes('data-act="refct"'));
  expect(e.T()).toContain("Hùng");
  expect(e.T()).toContain("Lan");
  expect(e.V()).toContain('data-act="inv" data-v="scorer"');
  await e.click("refct", { k: "m:sc1", c: "2" });
  await e.until(() => (e.store.get("clubs/q7/members/sc1").courts || []).includes(2));
  await e.click("refct", { k: "e:pin1", c: "1" });
  await e.until(() => (e.store.get("clubs/q7/editors/pin1").courts || []).includes(1));
});
