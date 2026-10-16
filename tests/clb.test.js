import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

test("chủ CLB cũ chuyển dữ liệu PIN chung sang tài khoản CLB", async () => {
  const e = setup({
    user: { uid: "u1", isAnonymous: false, email: "chu@x.vn", displayName: "Chủ" },
    data: {
      "editors/u1": { pin: "x" },
      "players/p1": { name: "A", rating0: 3, gender: "M", active: true, createdAt: 1 },
      "players/p2": { name: "B", rating0: 3, gender: "F", active: true, createdAt: 2 },
      "app/config": { title: "AEP", courts: 2, session: 2 },
      "app/hist-1": { sid: 1, rows: [], money: { gap: 0, cost: 0 } },
      "matches/m1": { session: 1, seq: 1, a: ["p1", "p2"], b: ["p1", "p2"], sa: 11, sb: 5, status: "done" }
    }
  });
  await e.boot();
  await e.nav("caidat");
  expect(e.url).toBe("/aep/cai-dat");
  expect(e.T()).toContain("Chuyển sang tài khoản CLB");
  await e.click("migrate"); await e.click("migrate"); await e.until(() => e.reloaded === 1);
  const keys = [...e.store.keys()].filter(k => k.startsWith("clubs/")).sort();
  expect(keys).toEqual(["clubs/aep", "clubs/aep/app/config", "clubs/aep/app/hist-1", "clubs/aep/matches/m1", "clubs/aep/members/u1", "clubs/aep/players/p1", "clubs/aep/players/p2"]);
  expect(e.store.get("clubs/aep").owner).toBe("u1");
  expect(e.reloaded).toBe(1);
});

test("quản lý nhận lời mời, đặt PIN, lưu ngân hàng", async () => {
  const e = setup({
    search: "?moi=tok1",
    user: { uid: "u9", isAnonymous: false, email: "ql@x.vn", displayName: "QL" },
    data: {
      "clubs/aep": { name: "AEP", public: true, owner: "u1", bank: { code: "vcb", bin: "970436", name: "Vietcombank", acc: "0123456789", holder: "NGUYEN A" } },
      "clubs/aep/members/u1": { role: "owner", name: "Chủ" },
      "clubs/aep/invites/tok1": { role: "admin", exp: Date.now() + 1e6 },
      "clubs/aep/app/config": { title: "AEP", courts: 2, session: 2 },
      "clubs/aep/players/p1": { name: "A", rating0: 3, active: true }
    }
  });
  await e.boot(); await e.until(() => e.store.has("clubs/aep/members/u9"));
  expect(e.store.get("clubs/aep/members/u9")).toMatchObject({ role: "admin", invite: "tok1", email: "ql@x.vn" });
  await e.nav("caidat");
  expect(e.T()).toContain("Ngân hàng nhận tiền");
  await e.click("inv", { v: "scorer" });
  expect(e.T()).toMatch(/Link mời Trọng tài/);
  expect(e.docs("clubs/aep/invites/", v => v.role === "scorer").length).toBe(1);
  e.input("newpin", "2468"); await e.click("pinset"); await e.until(() => e.store.has("clubs/aep/secret/pin"));
  expect(e.store.get("clubs/aep/secret/pin").value).toBe("2468");
  e.input("bk-acc", "99887766"); e.input("bk-holder", "Trần Bình"); await e.click("bsave"); await e.until(() => e.store.get("clubs/aep").bank.acc === "99887766");
  expect(e.store.get("clubs/aep").bank).toMatchObject({ code: "vcb", acc: "99887766", holder: "TRAN BINH" });
});
