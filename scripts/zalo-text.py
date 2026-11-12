"""Một lần: chữ IN HOA viết cứng trong giao diện → viết thường kiểu câu (chuẩn Zalo, docs/zalo-ui.md).
Chỉ đổi cụm có dấu tiếng Việt (không đụng tên biến), giữ chữ viết tắt CLB, BTC, VĐV, QR, AI, KO…
Bỏ qua ảnh chia sẻ vẽ bằng canvas (78-anh.js) và thư viện QR."""
import re, glob
U = "A-ZĐÀÁẢÃẠĂẰẮẲẴẶÂẦẤẨẪẬÈÉẺẼẸÊỀẾỂỄỆÌÍỈĨỊÒÓỎÕỌÔỒỐỔỖỘƠỜỚỞỠỢÙÚỦŨỤƯỪỨỬỮỰỲÝỶỸỴ"
pat = re.compile(r"(?<![\w-])([%s][%s0-9]*(?:(?:[ ·→&/+:,]|-(?=[%s]))+[%s0-9]+)*)(?![\w])" % (U, U, U, U))
KEEP = {"CLB": "CLB", "BTC": "BTC", "VĐV": "VĐV", "QR": "QR", "AI": "AI", "KO": "KO", "ZALO": "Zalo", "VS": "VS", "ID": "ID", "OK": "OK", "MVP": "MVP", "HLV": "HLV", "PIN": "PIN", "SOCIAL": "Social", "APP": "app", "CHECK-IN": "check-in", "TB": "TB"}
def conv(m):
    w = m.group(1)
    if not re.search(r"[^\x00-\x7f]", w) or len(re.sub(r"[^%s]" % U, "", w)) < 2: return w
    parts = re.split(r"(\s+|[·→&/+:,]+)", w)
    out = []
    for p in parts:
        k = p.upper()
        if k in KEEP: out.append(KEEP[k])
        elif re.fullmatch(r"[%s0-9-]+" % U, p): out.append(p.lower())
        else: out.append(p)
    s = "".join(out)
    i = next((j for j, c in enumerate(s) if c.isalpha()), None)
    if i is not None and s[i].islower() and not any(s[i:].startswith(v) for v in ("app", "check-in")): s = s[:i] + s[i].upper() + s[i+1:]
    return s
n = 0
for f in sorted(glob.glob("src/parts/*.js")):
    if f.endswith(("78-anh.js", "09-qrlib.js")): continue
    s = open(f).read(); t = pat.sub(conv, s)
    if t != s:
        n += sum(1 for a, b in zip(s.splitlines(), t.splitlines()) if a != b); open(f, "w").write(t)
print("đổi", n, "dòng")
