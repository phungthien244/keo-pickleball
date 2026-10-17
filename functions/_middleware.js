// Xem trước link (Zalo, Messenger…): sửa tiêu đề và mô tả theo CLB và buổi.
// Trình đọc link không chạy JavaScript nên cần ghi sẵn vào HTML trả về.
const RESERVED = new Set(["", "clb", "tao-clb", "dang-nhap", "quan-tri", "assets", "index.html"]);
const val = v => v == null ? null : "stringValue" in v ? v.stringValue : "integerValue" in v ? Number(v.integerValue)
  : "doubleValue" in v ? v.doubleValue : "booleanValue" in v ? v.booleanValue
  : "arrayValue" in v ? (v.arrayValue.values || []).map(val)
  : "mapValue" in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, val(x)])) : null;
async function getDoc(project, path) {
  const u = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/${path}`;
  const r = await fetch(u, { cf: { cacheTtl: 120, cacheEverything: true } });
  if (!r.ok) return null;
  const j = await r.json();
  return Object.fromEntries(Object.entries(j.fields || {}).map(([k, x]) => [k, val(x)]));
}
const dmy = t => { if (!t) return ""; const d = new Date(t + 7 * 3600e3); return `${d.getUTCDate()}/${d.getUTCMonth() + 1}/${d.getUTCFullYear()}`; };
const TAB = { san: "Sân đấu", "xep-hang": "Xếp hạng", "thanh-vien": "Thành viên", quy: "Quỹ", "lich-su": "Lịch sử" };

export async function meta(url) {
  const seg = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
  const cid = (seg[0] || "").toLowerCase();
  if (!cid || RESERVED.has(cid) || !/^[a-z0-9-]{2,20}$/.test(cid)) return null;
  const project = /(^|\.)pikeco\.app$/.test(url.hostname) ? "keo-pickleball" : "pikeco-dev-53834";
  const club = await getDoc(project, `clubs/${cid}`);
  if (!club || !club.name) return null;
  const name = club.name;
  let title = `${name} · pikeco.app`, desc = `Bảng rating, kết quả từng trận và tổng kết mỗi buổi của ${name}. Xem trực tiếp, không cần đăng nhập.`;
  if (seg[1] === "buoi" && /^\d+$/.test(seg[2] || "") && club.public !== false) {
    const h = await getDoc(project, `clubs/${cid}/app/hist-${seg[2]}`);
    if (h) {
      const sn = h.sname ? `${h.sname} · ` : "";
      title = `${sn}Tổng kết buổi #${seg[2]} · ${name}`;
      if (h.type === "giai") {
        const T = ((h.giai || {}).table || []).filter(t => !t.out);
        desc = [`Giải vòng tròn ${((h.giai || {}).table || []).length} cặp · ${dmy(h.startedAt)}`, T[0] && `Nhất: ${T[0].na} & ${T[0].nb}`, T[1] && `Nhì: ${T[1].na} & ${T[1].nb}`, T[2] && `Ba: ${T[2].na} & ${T[2].nb}`].filter(Boolean).join(" · ");
      } else {
        const R = h.rows || [];
        desc = [`${h.matchCount || 0} trận · ${R.length} người · ${dmy(h.startedAt)}`, R.length && "Top 3: " + R.slice(0, 3).map(r => r.name).join(", ")].filter(Boolean).join(" · ");
      }
    }
  } else if (TAB[seg[1]]) title = `${TAB[seg[1]]} · ${name}`;
  return { title, desc };
}
class SetAttr { constructor(v) { this.v = v } element(e) { e.setAttribute("content", this.v) } }
class SetText { constructor(v) { this.v = v } element(e) { e.setInnerContent(this.v) } }

export async function onRequest(ctx) {
  const res = await ctx.next();
  const ct = res.headers.get("content-type") || "";
  if (ctx.request.method !== "GET" || !ct.includes("text/html")) return res;
  let m = null;
  try { m = await Promise.race([meta(new URL(ctx.request.url)), new Promise(r => setTimeout(() => r(null), 1500))]); } catch (e) { m = null; }
  const u = new URL(ctx.request.url), url = u.origin + u.pathname;
  // Ảnh xem trước lấy theo tên miền đang mở (bản thử dùng ảnh của bản thử)
  let rw = new HTMLRewriter()
    .on('meta[property="og:image"]', new SetAttr(u.origin + "/og.png?v=2"))
    .on('meta[name="twitter:image"]', new SetAttr(u.origin + "/og.png?v=2"))
    .on('meta[property="og:url"]', new SetAttr(url));
  if (m) rw = rw
    .on("title", new SetText(m.title))
    .on('meta[property="og:title"]', new SetAttr(m.title))
    .on('meta[name="twitter:title"]', new SetAttr(m.title))
    .on('meta[property="og:description"]', new SetAttr(m.desc))
    .on('meta[name="twitter:description"]', new SetAttr(m.desc))
    .on('meta[name="description"]', new SetAttr(m.desc));
  return rw
    .transform(res);
}
