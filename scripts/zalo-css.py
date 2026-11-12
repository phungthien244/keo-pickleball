"""Một lần: chuyển src/styles/app.css sang chuẩn giao diện Zalo (ZaUI, docs/zalo-ui.md).
Bỏ IN HOA và giãn chữ, font của máy, đậm vừa, chữ tối thiểu 12px,
nền navy/vàng → xanh Zalo (chữ trắng), chữ navy → màu chữ, nhấn không thu nhỏ."""
import re, sys
p = sys.argv[1] if len(sys.argv) > 1 else "src/styles/app.css"
s = open(p).read()

NAVY = r"(?:var\(--navy(?:-2|-3)?\)|#0c2b44|#08213a|#163a57)"
YEL = r"(?:var\(--yellow\)|var\(--ball\)|#f2e205)"

def size_of(decls):
    m = re.search(r"font-size:\s*(\d+(?:\.\d+)?)px", decls)
    return float(m.group(1)) if m else None

def fix(decls):
    d = decls
    d = re.sub(r"text-transform:\s*uppercase\s*;?", "", d)
    d = re.sub(r"letter-spacing:\s*\.?\d*\.?\d+em\s*;?", lambda m: m.group(0) if re.search(r":\s*-", m.group(0)) or float(re.search(r"(\.?\d*\.?\d+)em", m.group(0)).group(1)) < .02 else "", d)
    fs = size_of(d)
    def fw(m):
        w = int(m.group(1))
        if w < 600: return m.group(0)
        return f"font-weight:{700 if (fs and fs >= 22) else 500}"
    d = re.sub(r"font-weight:\s*(\d{3})", fw, d)
    d = re.sub(r"font-size:\s*(\d+(?:\.\d+)?)px", lambda m: f"font-size:{max(12, float(m.group(1))):g}px", d)
    # nền tối/vàng → xanh Zalo, chữ trắng
    bg_dark = re.search(r"background(?:-color)?:\s*[^;]*(?:%s|%s)" % (NAVY, YEL), d)
    d = re.sub(r"(background(?:-color)?:\s*[^;]*?)%s" % NAVY, r"\1var(--blue)", d)
    d = re.sub(r"(background(?:-color)?:\s*[^;]*?)%s" % YEL, r"\1var(--blue)", d)
    d = re.sub(r"(border(?:-[a-z]+)?(?:-color)?:\s*[^;]*?)%s" % NAVY, r"\1var(--blue)", d)
    d = re.sub(r"(border(?:-[a-z]+)?(?:-color)?:\s*[^;]*?)%s" % YEL, r"\1var(--blue)", d)
    d = re.sub(r"(outline(?:-color)?:\s*[^;]*?)%s" % NAVY, r"\1var(--blue)", d)
    d = re.sub(r"(box-shadow:\s*[^;]*?)%s" % YEL, r"\1var(--blue)", d)
    if bg_dark:
        d = re.sub(r"(?<![-a-z])color:\s*(?:%s|var\(--on-ball\)|var\(--ink\))" % NAVY, "color:#fff", d)
        if not re.search(r"(?<![-a-z])color:", d): d = d.rstrip(";") + ";color:#fff"
    d = re.sub(r"(?<![-a-z])color:\s*%s" % NAVY, "color:var(--ink)", d)
    d = re.sub(r"(?<![-a-z])color:\s*%s" % YEL, "color:#fff", d)
    d = re.sub(r"(?<![-a-z])color:\s*(?:var\(--sky\)|#a9cbe6|var\(--blue-2\))", "color:rgba(255,255,255,.85)", d)
    d = re.sub(r"transform:\s*scale\(\.9\d?\)", "transform:none", d)
    d = re.sub(r";{2,}", ";", d)
    return d

out = re.sub(r"\{([^{}]*)\}", lambda m: "{" + fix(m.group(1)) + "}", s)
# Biến màu chung
out = out.replace("""  --navy:#0c2b44; --navy-2:#08213a; --navy-3:#163a57; --navy-line:#34536d; --blue:#1f8fe5; --blue-2:#8cc8f5; --sky:#a9cbe6; --yellow:#f2e205;
  --bg:#f1f3f5; --surface:#ffffff; --sunk:#e8edf1; --ink:#0c2b44; --muted:#5d6f7e; --line:#dde3e8; --line-2:#c9d3db;
  --court:#0c2b44; --court-ink:#ffffff; --ball:#f2e205; --on-ball:#0c2b44;""",
"""  /* Chuẩn giao diện Zalo (ZaUI) · docs/zalo-ui.md */
  --navy:#0250b6; --navy-2:#023f8f; --navy-3:#0459c9; --navy-line:#b8d9ff; --blue:#006af5; --blue-p:#0250b6; --blue-s:#d6e9ff; --blue-2:#b8d9ff; --sky:#d6e9ff; --yellow:#006af5;
  --bg:#e9ebed; --surface:#ffffff; --sunk:#f1f3f5; --ink:#141415; --muted:#767a7f; --line:#e9ebed; --line-2:#d6d9dc;
  --court:#252627; --court-ink:#ffffff; --ball:#006af5; --on-ball:#ffffff; --red:#dc1f18;""")
out = out.replace('--display:"Montserrat","Arial Black",system-ui,sans-serif;', '--display:-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;')
out = out.replace('--body:"Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",sans-serif;', '--body:-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;')
open(p, "w").write(out)
print("ok")
