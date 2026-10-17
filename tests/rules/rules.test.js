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
