import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

async function session(e, sa, sb) {
  await e.tab("san"); await e.ok("start");
  for (let r = 0; r < 2; r++) {
    await e.click("gen");
    for (const [id] of e.docs("matches/", m => m.status === "playing")) { e.input("sa-" + id, sa); e.input("sb-" + id, sb); await e.click("save", { id }); }
  }
  const sid = e.store.get("app/config").session || 1;
  await e.click("chot"); await e.click("chot"); await e.until(() => e.store.has("app/hist-" + sid));
}
const ratings = e => Object.fromEntries(e.docs("players/").map(([id, p]) => [id, p.rating0]));

test("xoá giải đấu thì rating trừ lại về như trước giải đấu đó", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ"); await e.click("add");
  const r0 = ratings(e);
  await session(e, "11", "3");
  const r1 = ratings(e);
  expect(r1).not.toEqual(r0);
  await session(e, "11", "1");
  const r2 = ratings(e);
  expect(r2).not.toEqual(r1);
  const n2 = e.docs("matches/", m => m.session === 2).length;
  // xoá buổi 2 → về rating sau buổi 1
  await e.click("sdel", { id: "2" }); await e.click("sdel", { id: "2" });
  await e.until(() => !e.store.has("app/hist-2"));
  for (const [id, v] of Object.entries(ratings(e))) expect(v).toBeCloseTo(r1[id], 2);
  expect(e.docs("matches/", m => m.session === 2).length).toBe(0);
  // khôi phục → trận, kết quả và rating về như trước khi xoá
  const [did] = e.docs("deleted/")[0];
  await e.click("srestore", { id: did }); await e.click("srestore", { id: did });
  await e.until(() => e.store.has("app/hist-2"));
  expect(e.docs("matches/", m => m.session === 2).length).toBe(n2);
  for (const [id, v] of Object.entries(ratings(e))) expect(v).toBeCloseTo(r2[id], 2);
  expect(e.docs("deleted/").length).toBe(0);
});

test("công cụ tính lại: rating sửa lệch được kéo về đúng theo các giải đấu đã lưu", async () => {
  const e = setup({ pin: true });
  await e.boot();
  e.input("bulk", "A\nB\nC | nữ\nD | nữ\nE\nF | nữ\nG\nH | nữ"); await e.click("add");
  await session(e, "11", "3");
  const r1 = ratings(e);
  const a = e.pid("A");
  await e.FB.updateDoc({ path: "players/" + a }, { rating0: 5.5 }); await e.tick(); // lệch do buổi đã xoá
  await e.tab("nguoi");
  await e.click("rrcalc"); await e.until(() => e.T().includes("lệch rating"));
  await e.click("rrapply"); await e.click("rrapply");
  await e.until(() => Math.abs(e.store.get("players/" + a).rating0 - r1[a]) < 0.011);
});
