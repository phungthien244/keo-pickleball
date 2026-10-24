import { readFileSync } from "node:fs";
import { beforeAll, afterAll, beforeEach, describe, test } from "vitest";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, deleteDoc, getDocs, collection, writeBatch } from "firebase/firestore";

const PA = "phungthien244@gmail.com";
let env;
const google = (uid, email = uid + "@x.vn") => env.authenticatedContext(uid, { email, email_verified: true, firebase: { sign_in_provider: "google.com" } }).firestore();
const anon = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: "anonymous" } }).firestore();
const guest = () => env.unauthenticatedContext().firestore();
const seed = async docs => env.withSecurityRulesDisabled(async c => { const db = c.firestore(); for (const [p, d] of Object.entries(docs)) await setDoc(doc(db, p), d); });

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: "demo-pikeco", firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 } });
});
afterAll(async () => { await env?.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  await seed({
    "clubs/aep": { name: "AEP", public: true, owner: "own", createdAt: 1 },
    "clubs/aep/members/own": { role: "owner" },
    "clubs/aep/members/sc": { role: "scorer", courts: [1] },
    "clubs/aep/members/ad": { role: "admin" },
    "clubs/aep/matches/m1": { session: 1, court: 1, status: "playing", sa: null, sb: null },
    "clubs/aep/matches/m2": { session: 1, court: 2, status: "playing", sa: null, sb: null },
    "clubs/aep/secret/pin": { value: "2468" },
    "clubs/aep/players/p1": { name: "A" },
    "clubs/pend": { name: "Pend", public: true, owner: "po", status: "pending", createdAt: 1 },
    "clubs/pend/members/po": { role: "owner" },
    "clubs/pend/private/info": { contact: "0901234567", ownerEmail: "po@x.vn" },
    "clubs/lock": { name: "Lock", public: true, owner: "lo", status: "locked", createdAt: 1 },
    "clubs/lock/members/lo": { role: "owner" },
    "clubs/lock/players/p1": { name: "A" },
    "codes/GOOD1234": { used: false, at: 1 },
    "users/own": { club: "aep", at: 1 },
    "editors/root": { pin: "x" },
    "players/p1": { name: "legacy" }
  });
});

const newClub = (db, uid, slug, extra = {}, code) => {
  const b = writeBatch(db);
  b.set(doc(db, "clubs/" + slug), { name: "CLB mới", public: true, owner: uid, status: code ? "active" : "pending", city: "HCM", size: "20–50", createdAt: 2, ...(code ? { code } : {}), ...extra });
  b.set(doc(db, `clubs/${slug}/private/info`), { contact: "0900000000", ownerEmail: uid + "@x.vn" });
  b.set(doc(db, `clubs/${slug}/members/${uid}`), { role: "owner", name: "N", email: uid + "@x.vn", at: 2 });
  b.set(doc(db, "users/" + uid), { club: slug, at: 2 });
  if (code) b.update(doc(db, "codes/" + code), { used: true, club: slug, by: uid, at: 2 });
  return b.commit();
};

describe("đọc công khai", () => {
  test("ai cũng đọc được thông tin CLB và dữ liệu CLB công khai đang hoạt động", async () => {
    await assertSucceeds(getDoc(doc(guest(), "clubs/aep")));
    await assertSucceeds(getDoc(doc(guest(), "clubs/aep/players/p1")));
    await assertSucceeds(getDocs(collection(guest(), "clubs")));
  });
  test("liên hệ chủ CLB không công khai", async () => {
    await assertFails(getDoc(doc(guest(), "clubs/pend/private/info")));
    await assertFails(getDoc(doc(google("x"), "clubs/pend/private/info")));
    await assertSucceeds(getDoc(doc(google("po"), "clubs/pend/private/info")));
    await assertSucceeds(getDoc(doc(google("pa", PA), "clubs/pend/private/info")));
  });
  test("CLB bị khoá: người ngoài không đọc dữ liệu, chủ CLB vẫn đọc", async () => {
    await assertFails(getDoc(doc(guest(), "clubs/lock/players/p1")));
    await assertSucceeds(getDoc(doc(google("lo"), "clubs/lock/players/p1")));
  });
  test("mã mời chỉ người đăng nhập đọc được", async () => {
    await assertFails(getDoc(doc(guest(), "codes/GOOD1234")));
    await assertSucceeds(getDoc(doc(google("x"), "codes/GOOD1234")));
  });
});

describe("tạo CLB", () => {
  test("tài khoản Google mới tạo CLB chờ duyệt", async () => {
    await assertSucceeds(newClub(google("n1"), "n1", "clb-moi"));
  });
  test("mỗi tài khoản một CLB", async () => {
    await assertFails(newClub(google("own"), "own", "clb-thu-hai"));
  });
  test("không tạo được CLB hoạt động ngay nếu không có mã", async () => {
    await assertFails(newClub(google("n1"), "n1", "clb-moi", { status: "active" }));
  });
  test("mã mời hợp lệ thì CLB hoạt động ngay, mã chỉ dùng một lần", async () => {
    await assertSucceeds(newClub(google("n1"), "n1", "clb-ma", {}, "GOOD1234"));
    await assertFails(newClub(google("n2"), "n2", "clb-ma-2", {}, "GOOD1234"));
  });
  test("tên dành riêng và đường dẫn sai bị chặn", async () => {
    await assertFails(newClub(google("n1"), "n1", "admin"));
    await assertFails(newClub(google("n1"), "n1", "quan-tri"));
    await assertFails(newClub(google("n1"), "n1", "-abc"));
    await assertFails(newClub(google("n1"), "n1", "AB"));
  });
  test("tài khoản ẩn danh không tạo được CLB", async () => {
    await assertFails(newClub(anon("a1"), "a1", "clb-an"));
  });
  test("không nhận làm chủ CLB của người khác", async () => {
    await assertFails(setDoc(doc(google("x"), "clubs/aep/members/x"), { role: "owner" }));
    await assertFails(setDoc(doc(google("x"), "users/x"), { club: "aep", at: 1 }));
  });
  test("không ghi thêm trường lạ vào CLB mới", async () => {
    await assertFails(newClub(google("n1"), "n1", "clb-moi", { bank: { acc: "1" } }));
  });
});

describe("duyệt và trạng thái", () => {
  test("chỉ quản trị nền tảng đổi trạng thái", async () => {
    await assertFails(updateDoc(doc(google("po"), "clubs/pend"), { status: "active" }));
    await assertFails(updateDoc(doc(google("x", "fake@gmail.com"), "clubs/pend"), { status: "active" }));
    await assertSucceeds(updateDoc(doc(google("pa", PA), "clubs/pend"), { status: "active", reviewedAt: 3, statusNote: "" }));
  });
  test("quản trị nền tảng không sửa được tên hay chủ CLB", async () => {
    await assertFails(updateDoc(doc(google("pa", PA), "clubs/pend"), { owner: "pa" }));
    await assertFails(updateDoc(doc(google("pa", PA), "clubs/pend"), { name: "X" }));
  });
  test("chủ CLB sửa ngân hàng, không đổi được chủ", async () => {
    await assertSucceeds(updateDoc(doc(google("own"), "clubs/aep"), { bank: { code: "mb", acc: "1" } }));
    await assertFails(updateDoc(doc(google("own"), "clubs/aep"), { owner: "x" }));
  });
  test("CLB chờ duyệt: chưa ghi dữ liệu buổi, vẫn đặt PIN được", async () => {
    await assertFails(setDoc(doc(google("po"), "clubs/pend/players/p9"), { name: "B" }));
    await assertSucceeds(setDoc(doc(google("po"), "clubs/pend/secret/pin"), { value: "1111" }));
  });
  test("CLB bị khoá: chủ CLB không ghi dữ liệu", async () => {
    await assertFails(setDoc(doc(google("lo"), "clubs/lock/players/p9"), { name: "B" }));
  });
  test("chỉ quản trị nền tảng tạo và xoá mã mời", async () => {
    await assertFails(setDoc(doc(google("own"), "codes/NEW12345"), { used: false, at: 1 }));
    await assertSucceeds(setDoc(doc(google("pa", PA), "codes/NEW12345"), { used: false, at: 1 }));
    await assertSucceeds(deleteDoc(doc(google("pa", PA), "codes/NEW12345")));
  });
  test("chỉ quản trị nền tảng sửa cài đặt email", async () => {
    await assertFails(setDoc(doc(google("own"), "platform/config"), { emailjs: {} }));
    await assertSucceeds(setDoc(doc(google("pa", PA), "platform/config"), { emailjs: {} }));
    await assertSucceeds(getDoc(doc(guest(), "platform/config")));
  });
});

describe("nhập tỉ số", () => {
  test("trọng tài chỉ nhập tỉ số sân được giao", async () => {
    await assertSucceeds(updateDoc(doc(google("sc"), "clubs/aep/matches/m1"), { sa: 11, sb: 5, status: "done", doneAt: 1 }));
    await assertFails(updateDoc(doc(google("sc"), "clubs/aep/matches/m2"), { sa: 11, sb: 5, status: "done", doneAt: 1 }));
    await assertFails(updateDoc(doc(google("sc"), "clubs/aep/matches/m1"), { court: 2 }));
    await assertFails(setDoc(doc(google("sc"), "clubs/aep/matches/m9"), { sa: 11, sb: 5 }));
    await assertFails(deleteDoc(doc(google("sc"), "clubs/aep/matches/m1")));
    await assertFails(updateDoc(doc(google("sc"), "clubs/aep/players/p1"), { active: false }));
    await assertFails(setDoc(doc(google("sc"), "clubs/aep/app/config"), { courts: 3 }));
  });
  test("PIN đúng thì vào được, nhưng chỉ nhập điểm sân được giao", async () => {
    await assertFails(setDoc(doc(anon("a1"), "clubs/aep/editors/a1"), { pin: "0000", at: 1 }));
    await assertSucceeds(setDoc(doc(anon("a2"), "clubs/aep/editors/a2"), { pin: "2468", at: 1, name: "Hùng" }));
    await assertFails(updateDoc(doc(anon("a2"), "clubs/aep/matches/m2"), { sa: 11, sb: 9, status: "done" }));
    await assertFails(updateDoc(doc(anon("a2"), "clubs/aep/editors/a2"), { courts: [2] }));
    await assertSucceeds(updateDoc(doc(google("own"), "clubs/aep/editors/a2"), { courts: [2] }));
    await assertSucceeds(updateDoc(doc(anon("a2"), "clubs/aep/matches/m2"), { sa: 11, sb: 9, status: "done" }));
    await assertFails(updateDoc(doc(anon("a2"), "clubs/aep/players/p1"), { name: "X" }));
  });
  test("quản lý sửa được mọi thứ; buổi đã xóa chỉ chủ CLB khôi phục", async () => {
    await assertSucceeds(setDoc(doc(google("ad"), "clubs/aep/matches/m9"), { court: 1, status: "playing" }));
    await assertSucceeds(setDoc(doc(google("ad"), "clubs/aep/deleted/s1"), { sid: 1 }));
    await assertFails(getDoc(doc(google("sc"), "clubs/aep/deleted/s1")));
    await assertFails(deleteDoc(doc(google("ad"), "clubs/aep/deleted/s1")));
    await assertSucceeds(deleteDoc(doc(google("own"), "clubs/aep/deleted/s1")));
  });
  test("người lạ không ghi được", async () => {
    await assertFails(setDoc(doc(anon("a3"), "clubs/aep/matches/m3"), { sa: 11, sb: 0 }));
    await assertFails(updateDoc(doc(anon("a3"), "clubs/aep/matches/m1"), { sa: 11, sb: 0 }));
    await assertFails(setDoc(doc(guest(), "clubs/aep/players/p2"), { name: "X" }));
  });
  test("PIN không ai đọc được", async () => {
    await assertFails(getDoc(doc(google("own"), "clubs/aep/secret/pin")));
  });
  test("dữ liệu cũ ở gốc vẫn ghi được bằng PIN chung", async () => {
    await assertSucceeds(setDoc(doc(anon("root"), "players/p2"), { name: "B" }));
    await assertFails(setDoc(doc(anon("zz"), "players/p3"), { name: "C" }));
  });
});

describe("người chơi Zalo", () => {
  const zalo = uid => env.authenticatedContext(uid, { zalo: true, firebase: { sign_in_provider: "custom" } }).firestore();
  const openReg = (extra = {}) => seed({ "clubs/aep/app/config": { session: 3, reg: { on: true, ...extra } } });
  test("Zalo không được coi là tài khoản Google", async () => {
    await assertFails(setDoc(doc(zalo("zalo_1"), "clubs/aep/members/zalo_1"), { role: "owner" }));
    await assertFails(setDoc(doc(zalo("zalo_1"), "users/zalo_1"), { club: "aep", at: 1 }));
  });
  test("tài khoản Zalo tạo CLB mới (chờ duyệt hoặc có mã mời), mỗi tài khoản một CLB", async () => {
    await assertSucceeds(newClub(zalo("zalo_7"), "zalo_7", "q7-zalo"));
    await assertFails(newClub(zalo("zalo_7"), "zalo_7", "q7-zalo2"));
    await assertFails(newClub(zalo("zalo_8"), "zalo_9", "q8-zalo"));
    await assertFails(newClub(zalo("zalo_8"), "zalo_8", "q8-zalo", { status: "active" }));
    await assertSucceeds(newClub(zalo("zalo_8"), "zalo_8", "q8-zalo", {}, "GOOD1234"));
  });
  test("nhận link mời quản lý/trọng tài bằng Zalo, không tự làm chủ, không dùng link hết hạn", async () => {
    await seed({ "clubs/aep/invites/ok1": { role: "admin", exp: Date.now() + 864e5 }, "clubs/aep/invites/old": { role: "scorer", exp: 1 } });
    await assertFails(setDoc(doc(zalo("zalo_2"), "clubs/aep/members/zalo_2"), { role: "scorer", invite: "ok1" }));
    await assertFails(setDoc(doc(zalo("zalo_2"), "clubs/aep/members/zalo_2"), { role: "scorer", invite: "old" }));
    await assertFails(setDoc(doc(zalo("zalo_2"), "clubs/aep/members/zalo_3"), { role: "admin", invite: "ok1" }));
    await assertFails(setDoc(doc(anon("a9"), "clubs/aep/members/a9"), { role: "admin", invite: "ok1" }));
    await assertSucceeds(setDoc(doc(zalo("zalo_2"), "clubs/aep/members/zalo_2"), { role: "admin", invite: "ok1", via: "zalo", name: "Z", email: "", at: 1 }));
  });
  test("mã mời: chỉ đọc đúng mã, không liệt kê; chủ CLB tạo link liên kết tài khoản chủ ngắn hạn", async () => {
    await seed({ "clubs/aep/invites/ok1": { role: "admin", exp: Date.now() + 864e5 } });
    await assertSucceeds(getDoc(doc(anon("a1"), "clubs/aep/invites/ok1")));
    await assertFails(getDocs(collection(anon("a1"), "clubs/aep/invites")));
    await assertFails(getDocs(collection(zalo("zalo_5"), "clubs/aep/invites")));
    await assertSucceeds(getDocs(collection(google("ad"), "clubs/aep/invites")));
    await assertFails(setDoc(doc(google("ad"), "clubs/aep/invites/o1"), { role: "owner", exp: Date.now() + 6e5 }));
    await assertFails(setDoc(doc(google("own"), "clubs/aep/invites/o2"), { role: "owner", exp: Date.now() + 864e5 }));
    await assertSucceeds(setDoc(doc(google("own"), "clubs/aep/invites/o3"), { role: "owner", exp: Date.now() + 6e5, link: true }));
    await assertSucceeds(setDoc(doc(zalo("zalo_own"), "clubs/aep/members/zalo_own"), { role: "owner", invite: "o3", via: "zalo", name: "Chủ", email: "", at: 1 }));
    await assertFails(deleteDoc(doc(google("ad"), "clubs/aep/members/zalo_own")));
    await assertFails(deleteDoc(doc(google("own"), "clubs/aep/members/own")));
    await assertSucceeds(deleteDoc(doc(google("own"), "clubs/aep/members/zalo_own")));
  });
  test("đăng nhập web bằng Zalo: Mini App chỉ đồng ý cho chính mình, khi mã còn hạn", async () => {
    const exp = Date.now() + 18e4;
    await seed({ "qrlogin/t1": { st: "wait", sh: "h", exp, at: 1 }, "qrlogin/t2": { st: "wait", sh: "h", exp: 1, at: 1 }, "qrlogin/t3": { st: "wait", sh: "h", exp, at: 1 } });
    await assertSucceeds(getDoc(doc(guest(), "qrlogin/t1")));
    await assertFails(getDocs(collection(guest(), "qrlogin")));
    await assertFails(setDoc(doc(zalo("zalo_1"), "qrlogin/t9"), { st: "ok", uid: "zalo_1" }));
    await assertFails(updateDoc(doc(anon("a1"), "qrlogin/t1"), { st: "ok", uid: "a1" }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "qrlogin/t1"), { st: "ok", uid: "zalo_2" }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "qrlogin/t1"), { st: "ok", uid: "zalo_1", sh: "x" }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "qrlogin/t2"), { st: "ok", uid: "zalo_1" }));
    await assertSucceeds(updateDoc(doc(zalo("zalo_1"), "qrlogin/t1"), { st: "ok", uid: "zalo_1", zn: "An", okAt: 1 }));
    await assertFails(updateDoc(doc(zalo("zalo_2"), "qrlogin/t1"), { st: "ok", uid: "zalo_2" }));
    await assertSucceeds(updateDoc(doc(zalo("zalo_2"), "qrlogin/t3"), { st: "no" }));
  });
  test("mã chat Zalo: người chơi tự cập nhật zid trong yêu cầu tham gia của mình, không sửa được gì khác", async () => {
    await seed({ "clubs/aep/links/zalo_4": { status: "ok", pid: "p4" } });
    await assertSucceeds(updateDoc(doc(zalo("zalo_4"), "clubs/aep/links/zalo_4"), { zid: "12345" }));
    await assertFails(updateDoc(doc(zalo("zalo_4"), "clubs/aep/links/zalo_4"), { pid: "p1" }));
    await assertFails(updateDoc(doc(zalo("zalo_5"), "clubs/aep/links/zalo_4"), { zid: "999" }));
  });
  test("ảnh thẻ chia sẻ: BTC và người chơi đã duyệt lưu ảnh, poster chỉ BTC, ai xem được CLB thì đọc được", async () => {
    await seed({ "clubs/aep/links/zalo_4": { status: "ok", pid: "p4" }, "clubs/aep/links/zalo_6": { status: "pending" } });
    const img = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    await assertSucceeds(setDoc(doc(zalo("zalo_4"), "clubs/aep/the/vdv_p4"), { img, at: 1 }));
    await assertFails(setDoc(doc(zalo("zalo_6"), "clubs/aep/the/vdv_p4"), { img, at: 1 }));
    await assertFails(setDoc(doc(zalo("zalo_4"), "clubs/aep/the/poster_x1"), { img, at: 1 }));
    await assertSucceeds(setDoc(doc(google("ad"), "clubs/aep/the/poster_x1"), { img, at: 1 }));
    await assertFails(setDoc(doc(google("ad"), "clubs/aep/the/vdv_p4"), { img: "data:image/svg+xml;base64,PHN2Zz4=", at: 1 }));
    await assertFails(setDoc(doc(google("ad"), "clubs/aep/the/a%2Fb"), { img, at: 1 }));
    await assertSucceeds(getDoc(doc(guest(), "clubs/aep/the/vdv_p4")));
  });
  test("ban tổ chức giao quyền thẳng cho người chơi đã liên kết Zalo", async () => {
    await seed({ "clubs/aep/links/zalo_4": { status: "ok", pid: "p4" }, "clubs/aep/links/zalo_6": { status: "pending" } });
    const m = { role: "scorer", name: "Bốn", via: "zalo", pid: "p4", at: 1, by: "QL" };
    await assertFails(setDoc(doc(google("sc"), "clubs/aep/members/zalo_4"), m));
    await assertFails(setDoc(doc(google("ad"), "clubs/aep/members/zalo_6"), m));
    await assertFails(setDoc(doc(google("ad"), "clubs/aep/members/zalo_4"), { ...m, role: "owner" }));
    await assertSucceeds(setDoc(doc(google("ad"), "clubs/aep/members/zalo_4"), m));
    await assertSucceeds(updateDoc(doc(google("ad"), "clubs/aep/members/zalo_4"), { role: "admin" }));
    await assertSucceeds(deleteDoc(doc(google("ad"), "clubs/aep/members/zalo_4")));
  });
  test("lịch buổi: chỉ quản lý tạo buổi; người chơi đăng ký buổi đang mở hoặc đã tới giờ tự mở", async () => {
    const T = Date.now(), at = T + 2 * 864e5;
    await assertFails(setDoc(doc(zalo("zalo_1"), "clubs/aep/sched/x"), { st: "open", at }));
    await assertSucceeds(setDoc(doc(google("ad"), "clubs/aep/sched/x0"), { st: "draft", at }));
    await seed({ "clubs/aep/links/zalo_1": { status: "ok", pid: "p1" },
      "clubs/aep/sched/op": { st: "open", at, deadline: at, lockAt: at - 7200e3, guests: true },
      "clubs/aep/sched/dr": { st: "draft", at, deadline: at },
      "clubs/aep/sched/pl": { st: "plan", openAt: T - 1000, at, deadline: at },
      "clubs/aep/sched/fu": { st: "plan", openAt: T + 864e5, at, deadline: at },
      "clubs/aep/sched/dl": { st: "open", at, deadline: T - 1000 },
      "clubs/aep/sched/lk": { st: "open", at: T + 3600e3, deadline: T + 3600e3, lockAt: T - 1000 } });
    const reg = (sid, extra = {}) => setDoc(doc(zalo("zalo_1"), `clubs/aep/regs/${sid}_zalo_1`), { sid, uid: "zalo_1", pid: "p1", at: 1, pay: "none", ...extra });
    await assertSucceeds(reg("op"));
    await assertSucceeds(reg("pl"));
    await assertFails(reg("dr"));
    await assertFails(reg("fu"));
    await assertFails(reg("dl"));
    await assertFails(reg("nope"));
    await assertFails(reg("op", { pid: "p2" }));
    // khách: buổi cho khách mới được
    await assertSucceeds(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/op_zalo_7"), { sid: "op", uid: "zalo_7", name: "Khách", guest: true, at: 1, pay: "sent" }));
    await assertFails(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/pl_zalo_7"), { sid: "pl", uid: "zalo_7", name: "Khách", guest: true, at: 1 }));
    // hủy: trước giờ khóa hủy của buổi đó
    await assertSucceeds(deleteDoc(doc(zalo("zalo_1"), "clubs/aep/regs/op_zalo_1")));
    await seed({ "clubs/aep/regs/lk_zalo_1": { sid: "lk", uid: "zalo_1", pid: "p1", at: 1, pay: "none" } });
    await assertFails(deleteDoc(doc(zalo("zalo_1"), "clubs/aep/regs/lk_zalo_1")));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "clubs/aep/regs/lk_zalo_1"), { cancel: true, cancelAt: 2 }));
  });
  test("gửi yêu cầu nhận hồ sơ, chỉ quản lý duyệt", async () => {
    await assertSucceeds(setDoc(doc(zalo("zalo_1"), "clubs/aep/links/zalo_1"), { status: "pending", pid: "p1", zname: "A", at: 1 }));
    await assertFails(setDoc(doc(zalo("zalo_2"), "clubs/aep/links/zalo_2"), { status: "ok", pid: "p1", at: 1 }));
    await assertFails(setDoc(doc(zalo("zalo_2"), "clubs/aep/links/zalo_1"), { status: "pending", at: 1 }));
    await assertSucceeds(setDoc(doc(anon("an"), "clubs/aep/links/an"), { status: "pending", pid: "p1", at: 1 }));
    await assertFails(setDoc(doc(guest(), "clubs/aep/links/gg"), { status: "pending", at: 1 }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "clubs/aep/links/zalo_1"), { status: "ok" }));
    await assertFails(getDoc(doc(zalo("zalo_2"), "clubs/aep/links/zalo_1")));
    await assertSucceeds(updateDoc(doc(google("ad"), "clubs/aep/links/zalo_1"), { status: "ok" }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "clubs/aep/players/p1"), { zuid: "zalo_1" }));
  });
  test("đăng ký buổi: cần được duyệt, đúng buổi, đang mở", async () => {
    await seed({ "clubs/aep/links/zalo_1": { status: "ok", pid: "p1" }, "clubs/aep/links/zalo_2": { status: "pending", pid: "p2" } });
    const r = { sid: 3, uid: "zalo_1", pid: "p1", name: "A", at: 1 };
    await seed({ "clubs/aep/app/config": { session: 3, reg: { on: false } } });
    await assertFails(setDoc(doc(zalo("zalo_1"), "clubs/aep/regs/3_zalo_1"), r));
    await openReg();
    await assertFails(setDoc(doc(zalo("zalo_1"), "clubs/aep/regs/2_zalo_1"), { ...r, sid: 2 }));
    await assertFails(setDoc(doc(zalo("zalo_1"), "clubs/aep/regs/3_zalo_1"), { ...r, pid: "p9" }));
    await assertFails(setDoc(doc(zalo("zalo_2"), "clubs/aep/regs/3_zalo_2"), { ...r, uid: "zalo_2", pid: "p2" }));
    await assertSucceeds(setDoc(doc(zalo("zalo_1"), "clubs/aep/regs/3_zalo_1"), r));
    await assertSucceeds(getDocs(collection(guest(), "clubs/aep/regs")));
    await assertFails(deleteDoc(doc(zalo("zalo_2"), "clubs/aep/regs/3_zalo_1")));
    await assertSucceeds(deleteDoc(doc(zalo("zalo_1"), "clubs/aep/regs/3_zalo_1")));
  });
  test("qua giờ khóa hủy thì người chơi không tự hủy, quản lý vẫn bỏ được", async () => {
    await seed({ "clubs/aep/links/zalo_1": { status: "ok", pid: "p1" } });
    await openReg({ lockAt: 1000 });
    await seed({ "clubs/aep/regs/3_zalo_1": { sid: 3, uid: "zalo_1", pid: "p1", at: 1 } });
    await assertFails(deleteDoc(doc(zalo("zalo_1"), "clubs/aep/regs/3_zalo_1")));
    await assertSucceeds(deleteDoc(doc(google("ad"), "clubs/aep/regs/3_zalo_1")));
    await assertSucceeds(setDoc(doc(google("own"), "clubs/aep/regs/3_p_p1"), { sid: 3, pid: "p1", at: 2 }));
  });
});

describe("đăng ký: khách vãng lai và chuyển khoản", () => {
  const zalo = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: "custom" } }).firestore();
  const cfg = (reg) => seed({ "clubs/aep/app/config": { session: 3, reg: { on: true, ...reg } } });
  const g = { sid: 3, uid: "zalo_7", guest: true, name: "Khách A", gender: "M", lv: "3.0", at: 1, pay: "none" };
  test("khách đăng ký được khi CLB nhận khách, không được khi chỉ thành viên", async () => {
    await cfg({ guests: false });
    await assertFails(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), g));
    await cfg({ guests: true });
    await assertSucceeds(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), g));
    await assertFails(setDoc(doc(zalo("zalo_8"), "clubs/aep/regs/3_zalo_8"), { ...g, uid: "zalo_8", pid: "p1" }));
  });
  test("không tự đánh dấu đã trả, chỉ báo đã chuyển; chủ CLB xác nhận", async () => {
    await cfg({ guests: true });
    await assertFails(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { ...g, pay: "ok" }));
    await seed({ "clubs/aep/regs/3_zalo_7": g });
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { pay: "ok" }));
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { name: "Khác" }));
    await assertSucceeds(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { pay: "sent", paidAt: 2 }));
    await assertSucceeds(updateDoc(doc(google("ad"), "clubs/aep/regs/3_zalo_7"), { pay: "ok" }));
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { pay: "none" }));
  });
  test("hủy khi đã trả: trước giờ khóa được, sau giờ khóa không; hết hạn đăng ký không tạo mới", async () => {
    await seed({ "clubs/aep/regs/3_zalo_7": { ...g, pay: "ok" } });
    await cfg({ guests: true, lockAt: 4102444800000 });
    await assertSucceeds(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { cancel: true, cancelAt: 3 }));
    await seed({ "clubs/aep/regs/3_zalo_7": { ...g, pay: "ok" } });
    await cfg({ guests: true, lockAt: 1000 });
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/3_zalo_7"), { cancel: true, cancelAt: 3 }));
    await cfg({ guests: true, deadline: 1000 });
    await assertFails(setDoc(doc(zalo("zalo_9"), "clubs/aep/regs/3_zalo_9"), { ...g, uid: "zalo_9" }));
  });
});

describe("giữ chỗ, ảnh VĐV ngoài CLB, check-in quét mã máy BTC", () => {
  const zalo = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: "custom" } }).firestore();
  const r = { sid: "s1", uid: "zalo_7", guest: true, name: "Lan", gender: "F", lv: "3.0", at: 1, pay: "none" };
  beforeEach(async () => { await seed({ "clubs/aep/sched/s1": { st: "open", guests: true, at: Date.now() + 864e5, lockAt: Date.now() + 864e5 - 7200e3 } }); });
  test("đăng ký kèm giữ chỗ, đổi sang trả tại sân, không tự bật lại giữ chỗ", async () => {
    await assertSucceeds(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ...r, hold: true }));
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { hold: "x" }));
    await assertSucceeds(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { hold: false }));
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { hold: true }));
  });
  test("ảnh chỉ chủ đăng ký ghi, ban tổ chức đọc, người khác không đọc", async () => {
    await seed({ "clubs/aep/regs/s1_zalo_7": r });
    await assertFails(setDoc(doc(zalo("zalo_8"), "clubs/aep/regpics/s1_zalo_7"), { img: "data:image/jpeg;base64,AA", uid: "zalo_8", at: 1 }));
    await assertSucceeds(setDoc(doc(zalo("zalo_7"), "clubs/aep/regpics/s1_zalo_7"), { img: "data:image/jpeg;base64,AA", uid: "zalo_7", at: 1 }));
    await assertSucceeds(getDoc(doc(google("ad"), "clubs/aep/regpics/s1_zalo_7")));
    await assertSucceeds(getDoc(doc(zalo("zalo_7"), "clubs/aep/regpics/s1_zalo_7")));
    await assertFails(getDoc(doc(zalo("zalo_8"), "clubs/aep/regpics/s1_zalo_7")));
    await assertFails(getDoc(doc(guest(), "clubs/aep/regpics/s1_zalo_7")));
  });
  test("check-in chỉ với mã đang hiện và còn hạn; người chơi không tự đánh dấu đã tới", async () => {
    await seed({ "clubs/aep/regs/s1_zalo_7": r, "clubs/aep/ci/s1": { code: "K7QF9A", exp: Date.now() + 40000 } });
    await assertFails(getDoc(doc(zalo("zalo_7"), "clubs/aep/ci/s1")));
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ci: Date.now(), ciCode: "SAI000" }));
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { arrived: true, arrivedAt: 1 }));
    await assertSucceeds(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ci: Date.now(), ciCode: "K7QF9A" }));
    await assertFails(updateDoc(doc(zalo("zalo_8"), "clubs/aep/regs/s1_zalo_7"), { ci: Date.now(), ciCode: "K7QF9A" }));
    await seed({ "clubs/aep/ci/s1": { code: "OLD111", exp: Date.now() - 1000 } });
    await assertFails(updateDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ci: Date.now(), ciCode: "OLD111" }));
    await assertSucceeds(setDoc(doc(google("ad"), "clubs/aep/ci/s1"), { code: "NEW222", exp: Date.now() + 40000 }));
    await assertSucceeds(updateDoc(doc(google("ad"), "clubs/aep/regs/s1_zalo_7"), { arrived: true, arrBy: "qr", arrivedAt: 2 }));
  });
  test("vãng lai xin vào bằng mã đang hiện, kể cả đã hết hạn đăng ký; mã sai, tự ghi đã trả, giải tắt vãng lai thì không", async () => {
    const w = { sid: "s1", uid: "zalo_7", guest: true, name: "Lan", gender: "F", lv: "3.0", at: 1, pay: "none", walkin: true, ci: Date.now(), ciCode: "K7QF9A" };
    await seed({ "clubs/aep/sched/s1": { st: "open", deadline: 1000, at: Date.now() - 3600e3 }, "clubs/aep/ci/s1": { code: "K7QF9A", exp: Date.now() + 40000 } });
    await assertFails(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ...w, ciCode: "SAI000" }));
    await assertFails(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ...w, pay: "ok" }));
    await assertFails(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ...w, arrived: true }));
    await assertFails(setDoc(doc(zalo("zalo_8"), "clubs/aep/regs/s1_zalo_7"), { ...w, uid: "zalo_8" }));
    await assertSucceeds(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), w));
    await seed({ "clubs/aep/sched/s1": { st: "open", walkin: false } });
    await assertFails(setDoc(doc(zalo("zalo_8"), "clubs/aep/regs/s1_zalo_8"), { ...w, uid: "zalo_8" }));
    await seed({ "clubs/aep/sched/s1": { st: "open" }, "clubs/aep/ci/s1": { code: "K7QF9A", exp: Date.now() - 1000 } });
    await assertFails(setDoc(doc(zalo("zalo_8"), "clubs/aep/regs/s1_zalo_8"), { ...w, uid: "zalo_8" }));
  });
  test("đăng ký theo cặp: người rủ ghi mã cặp và đồng đội muốn mời, người nhận lời ghi cùng mã cặp", async () => {
    await assertSucceeds(setDoc(doc(zalo("zalo_7"), "clubs/aep/regs/s1_zalo_7"), { ...r, team: "s1_zalo_7", want: "p2", wantName: "Minh" }));
    await assertSucceeds(setDoc(doc(zalo("zalo_8"), "clubs/aep/regs/s1_zalo_8"), { ...r, uid: "zalo_8", team: "s1_zalo_7" }));
    await assertSucceeds(setDoc(doc(zalo("zalo_9"), "clubs/aep/regs/s1_zalo_9"), { ...r, uid: "zalo_9", seek: true }));
    await assertFails(setDoc(doc(zalo("zalo_6"), "clubs/aep/regs/s1_zalo_6"), { ...r, uid: "zalo_6", seek: "x" }));
    await assertFails(setDoc(doc(zalo("zalo_5"), "clubs/aep/regs/s1_zalo_5"), { ...r, uid: "zalo_5", team: 5 }));
  });
});

describe("người chơi tự sửa hồ sơ", () => {
  const zalo = uid => env.authenticatedContext(uid, { firebase: { sign_in_provider: "custom" } }).firestore();
  test("chỉ sửa hồ sơ của mình, chỉ các mục giới thiệu", async () => {
    await seed({ "clubs/aep/links/zalo_1": { status: "ok", pid: "p1" }, "clubs/aep/players/p2": { name: "B" }, "clubs/aep/links/zalo_2": { status: "pending", pid: "p2" } });
    await assertSucceeds(updateDoc(doc(zalo("zalo_1"), "clubs/aep/players/p1"), { bio: "Xin chào", hand: "R", nick: "A1" }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "clubs/aep/players/p1"), { rating0: 5 }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "clubs/aep/players/p1"), { name: "Khác" }));
    await assertFails(updateDoc(doc(zalo("zalo_1"), "clubs/aep/players/p2"), { bio: "x" }));
    await assertFails(updateDoc(doc(zalo("zalo_2"), "clubs/aep/players/p2"), { bio: "x" }));
  });
});
