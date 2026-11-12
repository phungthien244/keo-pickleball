import { test, expect } from "vitest";
import { setup } from "./helpers/env.js";

// Quản lý một lịch đánh (canvas Mq1–Mq8) + thẻ mời một kiểu (Sh1–Sh4)
const tmr = () => { const d = new Date(Date.now() + 864e5); d.setHours(19, 0, 0, 0); return d.getTime(); };
const base = (extra = {}) => ({
  "clubs/q7": { name: "Q7", public: true, owner: "zalo_9", createdAt: 1 },
  "clubs/q7/members/zalo_9": { role: "owner", name: "Chủ" },
  "clubs/q7/app/config": { title: "Q7", courts: 2, session: 1, phase: "prep" },
  "clubs/q7/players/p1": { name: "Lê An", rating0: 3, gender: "M", active: false, createdAt: 1 },
  "clubs/q7/players/p2": { name: "Bình", rating0: 3.2, gender: "M", active: false, createdAt: 2 },
  "clubs/q7/sched/s1": { name: "Giao lưu tối", fmt: "xoay", at: tmr(), end: "21:30", courts: 2, target: 11, max: 8, st: "open", openAt: 0, place: "Kỳ Hòa", lockAt: tmr() - 7200e3, cp: true, thu: "phi", phi: 60, pay: "opt" },
  "clubs/q7/regs/s1_p_p1": { sid: "s1", pid: "p1", name: "Lê An", at: 1, pay: "ok" },
  "clubs/q7/regs/s1_p_p2": { sid: "s1", pid: "p2", name: "Bình", at: 2, pay: "none" },
  ...extra
});
const ZU = { uid: "zalo_9", isAnonymous: false, displayName: "Zalo" };
const boot = async (data) => { const e = setup({ host: "h5.zdn.vn", path: "/zapps/x/", search: "?clb=q7", user: ZU, data }); globalThis.window.ZMINI = 1; await e.boot(); await e.until(() => e.V().includes('data-act="mxsheet"')); return e; };

test("trang quản lý: thanh 4 chặng, tóm tắt, Cần làm có nút, lọc người; không còn nút Gửi nhắc nhóm ở đáy", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes("qmsum"));
  expect(e.V()).toContain('class="zstep"'); expect(e.V()).not.toContain('class="gmst"');
  expect(e.T()).toContain("người đã đăng ký · còn 6 chỗ");
  expect(e.T()).toContain("1 người chưa trả"); expect(e.T()).toContain("Còn 6 chỗ");
  expect(e.T()).toContain("Thêm người"); expect(e.T()).not.toContain("Gửi nhắc vào nhóm");
  await e.click("xbfl", { v: "chua" }); await e.until(() => e.V().includes(`data-v="chua" aria-pressed="true"`)); expect(e.V()).toContain(`data-act="xbsel" data-id="s1_p_p2"`); expect(e.V()).not.toContain(`data-act="xbsel" data-id="s1_p_p1"`);
});

test("bấm một người: sửa giới tính; huỷ chỗ hỏi lại, đã trả thì giữ lại để hoàn tiền, chưa trả thì xoá", async () => {
  const e = await boot(base());
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes("qmsum"));
  await e.click("xbsel", { id: "s1_p_p2" }); await e.click("qmgen", { id: "s1_p_p2", v: "F" });
  await e.until(() => e.store.get("clubs/q7/players/p2").gender === "F"); expect(e.store.get("clubs/q7/regs/s1_p_p2").gender).toBe("F");
  await e.click("qmhuy", { id: "s1_p_p1" });
  expect(globalThis.document.querySelector("#cfm").innerHTML).toContain("cần hoàn tiền");
  await e.click("cfmok"); await e.until(() => e.store.get("clubs/q7/regs/s1_p_p1")?.cancel === true);
  await e.click("qmhuy", { id: "s1_p_p2" }); await e.click("cfmok");
  await e.until(() => !e.store.has("clubs/q7/regs/s1_p_p2"));
});

test("thẻ mời: một kiểu thẻ, tiêu đề có điểm hấp dẫn, mô tả 3 dòng, không có link", async () => {
  const e = await boot(base());
  const shares = []; globalThis.window.ZMP = { openShareSheet: async o => { shares.push(o); } };
  await e.nav("app", { t: "dk", x: "s1" }); await e.until(() => e.V().includes("qmsum"));
  await e.click("regshare", { id: "s1" });
  const h = globalThis.document.querySelector("#shs").innerHTML;
  expect(h).toContain("Lời nhắn kèm"); expect(h).toContain("Giao lưu tối · còn 6 chỗ"); expect(h).not.toContain("zalo.me/s/");
  await e.click("shzgo");
  expect(shares[0].type).toBe("zmp_deep_link");
  expect(shares[0].data.title).toBe("Giao lưu tối · còn 6 chỗ");
  const L = shares[0].data.description.split("\n");
  expect(L[0]).toContain("xoay cặp"); expect(L[1]).toContain("Kỳ Hòa");
  expect(shares[0].data.path).toContain("p=dang-ky/s1");
  delete globalThis.window.ZMP;
});
