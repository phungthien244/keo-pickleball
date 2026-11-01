// Tạo giải nhanh bằng AI: đọc câu tả giải (tiếng Việt, kiểu nói của người chơi) thành các mục của form tạo giải.
//  - Có `cur` (giải đang soạn): chỉ trả về các mục người dùng muốn đổi.
//  - Groq (GROQ_API_KEY) trước, lỗi thì Gemini (GEMINI_API_KEY). Gemini chặn máy chủ ở Hồng Kông nên chỉ là dự phòng.
// Khoá để trong biến bí mật của Cloudflare Pages, không gửi ra trình duyệt. Chỉ nhận câu tả giải và cài đặt chung của CLB,
// không nhận tên hay số điện thoại người chơi. Mỗi CLB tối đa 40 lượt mỗi ngày.
const OK_HOST = /(^|\.)pikeco\.app$|^h5\.zdn\.vn$|\.pikeco\.pages\.dev$|^pikeco\.pages\.dev$|^localhost$/;
// Máy chủ Cloudflare gần Việt Nam thường chạy ở Hồng Kông, nơi Gemini chặn: dùng Groq trước, Gemini sau
const GM = ["gemini-flash-latest"];
const GROQ = ["openai/gpt-oss-120b", "qwen/qwen3.8-27b", "openai/gpt-oss-20b"];
const LIMIT = 40;

const SCHEMA = `Trả về MỘT đối tượng JSON, chỉ gồm các khoá dưới đây. Mục nào câu không nói rõ thì BỎ QUA khoá đó (không đoán, không để null).
- fmt: "bang" (chia bảng rồi đánh loại / knockout / tứ kết…), "giai" (cặp cố định đánh vòng tròn), "xoay" (giao lưu xoay cặp, đăng ký từng người, ghép cặp mỗi trận)
- name: tên giải nếu người dùng đặt tên (tối đa 30 ký tự)
- date: "YYYY-MM-DD" (tính từ hôm nay; "chủ nhật này" là chủ nhật gần nhất chưa qua; "tuần sau" cộng 7 ngày)
- time: giờ bắt đầu "HH:MM" 24 giờ ("7h tối" = "19:00", "6 rưỡi chiều" = "18:30")
- end: giờ kết thúc dự kiến "HH:MM"; endBy: giờ bắt buộc phải xong "HH:MM" (chỉ khi nói "phải xong trước…")
- courts: số sân; place: tên sân, địa điểm; target: điểm chạm mỗi ván (11, 15, 21…)
- pairs: số cặp tối đa (với fmt bang/giai); people: số người tối đa (với fmt xoay)
- koN: số bảng; lay: số cặp mỗi bảng vào vòng trong; third: true/false có tranh hạng ba
- dt: nội dung "MM" đôi nam, "FF" đôi nữ, "mix" nam nữ, "free" mở/open
- cap: tổng trình 2 người tối đa (ví dụ "đôi nam 5.5" → cap 5.5)
- pairReg: "pair" đăng ký theo cặp, "solo" đăng ký từng người rồi BTC ghép
- guests: true nếu nhận người ngoài CLB/vãng lai, false nếu chỉ thành viên; feeG: lệ phí người ngoài (nghìn đồng)
- fee: lệ phí mỗi người, ĐƠN VỊ NGHÌN ĐỒNG (200k = 200; "150 cành" = 150; "1 lít" = 100; "1 xị" = 100; "1 củ"/"1 triệu" = 1000; miễn phí = 0)
- thu: "phi" lệ phí cố định, "deu" chia đều tiền sân, "keo" ai thua góp
- pay: "req" phải chuyển khoản trước mới giữ chỗ, "opt" chuyển khoản tuỳ chọn, "off" trả tại sân/tiền mặt
- gton: true có giải thưởng, false không có giải
- gt: "hang" mức thưởng cố định từng hạng, "trich" trích % lệ phí, "codinh" CLB bỏ ra một khoản, "gop" mỗi người góp thêm
- h1, h2, h3: tiền thưởng nhất, nhì, ba (nghìn đồng); gtv: % trích (gt trich) hoặc số nghìn đồng (gt codinh/gop)
- trao: "namnu" số 1 nam và nữ, "top3" hạng 1, 2, 3
- nds: chỉ khi giải có từ 2 nội dung trở lên: [{name, dt, cap, max (số cặp), fee, koN}]
Quy ước tiền: số trơn nhỏ (≤ 20) đi với giải thưởng là triệu ("nhất 2" = 2000); "500" là 500 nghìn. "lít"/"xị" = 100 nghìn ("8 lít" = 800, "2 lít" = 200).
Quy ước khác: có nói số bảng hoặc chia bảng → fmt "bang". "nhất nhì (mỗi bảng) vào vòng trong" → lay 2; "chỉ nhất bảng đi tiếp" → lay 1. "không tranh hạng 3/không đánh tranh 3" → third false.
Mọi số phải là số JSON (không để trong ngoặc kép).`;

const EX = [
  ["Chủ nhật 7h, 16 cặp chia 4 bảng lấy 2, 200k, nhất 1 củ nhì 500, ck trước", { fmt: "bang", time: "07:00", pairs: 16, koN: 4, lay: 2, fee: 200, gton: true, gt: "hang", h1: 1000, h2: 500, pay: "req" }],
  ["tối t7 giao lưu xoay cặp 24 người, ai thua góp, không giải", { fmt: "xoay", time: "19:00", people: 24, thu: "keo", gton: false }],
  ["8 đôi nam 5.5 đánh vòng tròn, 2 xị một người, trả tại sân", { fmt: "giai", pairs: 8, dt: "MM", cap: 5.5, fee: 200, pay: "off" }],
  ["đôi nữ 12 cặp 3 bảng nhất nhì vào bán kết, không đánh tranh 3, nhất 8 lít nhì 4 lít", { fmt: "bang", dt: "FF", pairs: 12, koN: 3, lay: 2, third: false, gton: true, gt: "hang", h1: 800, h2: 400 }]
];

function prompt(b) {
  const c = b.ctx || {};
  const head = `Bạn đọc câu của ban tổ chức một CLB pickleball ở Việt Nam để điền form tạo giải đấu.
Hôm nay là ${c.dow || ""} ${c.today || ""}, bây giờ ${c.now || ""}.${c.last ? ` Giải gần nhất của CLB: ${JSON.stringify(c.last)} (chỉ để hiểu ngữ cảnh, KHÔNG chép vào kết quả nếu câu không nói).` : ""}
${SCHEMA}
Ví dụ:
${EX.map(([q, a]) => `Câu: ${q}\nJSON: ${JSON.stringify(a)}`).join("\n")}`;
  if (b.cur) return `${head}
Giải đang soạn: ${JSON.stringify(b.cur)}
Người dùng muốn sửa: "${b.txt}"
Chỉ trả về các khoá cần đổi theo lời người dùng (số mới là giá trị cuối cùng, ví dụ "thêm 2 sân" khi đang 4 sân → courts 6).`;
  return `${head}
Câu: ${b.txt}
JSON:`;
}

const parseJ = s => { try { const m = String(s || "").match(/\{[\s\S]*\}/); return m ? JSON.parse(m[0]) : null } catch (e) { return null } };
async function gemini(key, p, dbg) {
  for (const model of GM) {
    try {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST", headers: { "x-goog-api-key": key, "content-type": "application/json" },
        body: JSON.stringify({ contents: [{ parts: [{ text: p }] }], generationConfig: { temperature: 0, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } } })
      });
      if (!r.ok) { dbg.push(`${model}: ${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
      const j = await r.json(), t = j?.candidates?.[0]?.content?.parts?.map(x => x.text || "").join("");
      const o = parseJ(t); if (o) return o;
      dbg.push(`${model}: không đọc được JSON ${String(t || "").slice(0, 80)}`);
    } catch (e) { dbg.push(`${model}: ${String(e).slice(0, 80)}`) }
  }
  return null;
}
async function groq(key, p, dbg) {
  for (const model of GROQ) {
    try {
      const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST", headers: { authorization: "Bearer " + key, "content-type": "application/json" },
        body: JSON.stringify({ model, temperature: 0, response_format: { type: "json_object" }, ...(/gpt-oss/.test(model) ? { reasoning_effort: "low" } : {}), messages: [{ role: "user", content: p }] })
      });
      if (!r.ok) { dbg.push(`${model}: ${r.status} ${(await r.text()).slice(0, 160)}`); continue; }
      const j = await r.json(), o = parseJ(j?.choices?.[0]?.message?.content); if (o) return o;
      dbg.push(`${model}: không đọc được JSON`);
    } catch (e) { dbg.push(`${model}: ${String(e).slice(0, 80)}`) }
  }
  return null;
}
const cors = req => { const o = req.headers.get("origin") || ""; let ok = false; try { ok = OK_HOST.test(new URL(o).hostname) } catch (e) { }
  return ok ? { "access-control-allow-origin": o, "access-control-allow-methods": "POST", "access-control-allow-headers": "content-type", vary: "origin" } : {}; };
const out = (req, j, s = 200) => new Response(JSON.stringify(j), { status: s, headers: { "content-type": "application/json", ...cors(req) } });

export async function onRequestOptions(ctx) { return new Response(null, { status: 204, headers: cors(ctx.request) }); }
export async function onRequestPost(ctx) {
  const req = ctx.request, ref = req.headers.get("referer") || req.headers.get("origin") || "";
  let refOk = false; try { refOk = OK_HOST.test(new URL(ref).hostname) } catch (e) { }
  if (!refOk) return out(req, { ok: false, e: "forbidden" }, 403);
  const raw = await req.text(); if (raw.length > 6000) return out(req, { ok: false, e: "too big" }, 413);
  let b; try { b = JSON.parse(raw) } catch (e) { return out(req, { ok: false, e: "bad json" }, 400) }
  if (b && b.models) return models(ctx);
  const txt = String(b.txt || "").trim(), cid = String(b.cid || "").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
  if (!txt || txt.length > 400 || !cid) return out(req, { ok: false, e: "bad input" }, 400);
  const gk = ctx.env.GEMINI_API_KEY, qk = ctx.env.GROQ_API_KEY;
  if (!gk && !qk) return out(req, { ok: false, e: "no key" }, 503);
  // Giới hạn lượt mỗi CLB mỗi ngày (đếm gần đúng bằng bộ đệm)
  const day = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10), ck = new Request(`https://rl.pikeco/tg/${cid}/${day}`), cache = caches.default;
  const hit = await cache.match(ck), n = hit ? +(await hit.text()) || 0 : 0;
  if (n >= LIMIT) return out(req, { ok: false, e: "limit" }, 429);
  ctx.waitUntil(cache.put(ck, new Response(String(n + 1), { headers: { "cache-control": "max-age=90000" } })));
  const p = prompt({ txt, cur: b.cur && typeof b.cur === "object" ? b.cur : null, ctx: b.ctx && typeof b.ctx === "object" ? b.ctx : {} });
  const dbg = [];
  let t = qk ? await groq(qk, p, dbg) : null, by = "groq";
  if (!t && gk) { t = await gemini(gk, p, dbg); by = "gemini"; }
  if (!t || typeof t !== "object" || Array.isArray(t)) return out(req, { ok: false, e: "ai failed", d: dbg }, 502);
  for (const [k, v] of Object.entries(t)) if (typeof v === "string" && /^\d+(\.\d+)?$/.test(v) && !["time", "end", "endBy", "date", "name", "place"].includes(k)) t[k] = +v;
  return out(req, { ok: true, t, by });
}
// Xem các model đang dùng được (chỉ từ trang pikeco): GET /api/tao-giai?models=1
async function models(ctx) {
  const req = ctx.request;
  const o = { colo: req.cf && req.cf.colo, country: req.cf && req.cf.country };
  try { const r = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": ctx.env.GEMINI_API_KEY || "" } }); const j = await r.json();
    o.gemini = (j.models || []).filter(m => (m.supportedGenerationMethods || []).includes("generateContent")).map(m => m.name.replace("models/", "")); if (!r.ok) o.geminiErr = JSON.stringify(j).slice(0, 200) } catch (e) { o.geminiErr = String(e) }
  try { const r = await fetch("https://api.groq.com/openai/v1/models", { headers: { authorization: "Bearer " + (ctx.env.GROQ_API_KEY || "") } }); const j = await r.json(); o.groq = (j.data || []).map(m => m.id); if (!r.ok) o.groqErr = JSON.stringify(j).slice(0, 200) } catch (e) { o.groqErr = String(e) }
  return out(req, o);
}
