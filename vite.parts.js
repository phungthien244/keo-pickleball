import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

// Code app nằm trong src/parts/*.js, nối theo thứ tự tên file thành một module chung
// (các phần dùng chung trạng thái S, CLUB, ROLE...). Tách dần sang module thật sau.
const PARTS = resolve(import.meta.dirname || new URL(".", import.meta.url).pathname, "src/parts");
export function appParts() {
  const id = "virtual:app", rid = "\0virtual:app";
  return {
    name: "app-parts",
    resolveId: s => (s === id ? rid : null),
    load(s) {
      if (s !== rid) return null;
      const files = readdirSync(PARTS).filter(f => f.endsWith(".js")).sort();
      files.forEach(f => this.addWatchFile(resolve(PARTS, f)));
      return files.map(f => `// ===== ${f} =====\n` + readFileSync(resolve(PARTS, f), "utf8")).join("");
    }
  };
}

