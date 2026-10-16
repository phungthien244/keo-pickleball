import { defineConfig } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { FIREBASE } from "./firebase.config.js";

// Code app nằm trong src/parts/*.js, nối theo thứ tự tên file thành một module chung
// (các phần dùng chung trạng thái S, CLUB, ROLE...). Tách dần sang module thật sau.
const PARTS = resolve(__dirname, "src/parts");
function appParts() {
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

// Nhánh main trên Cloudflare Pages = trang thật; nhánh khác = Firebase dev.
function target() {
  if (process.env.FB_TARGET) return process.env.FB_TARGET;
  const br = process.env.CF_PAGES_BRANCH;
  return br && br !== "main" ? "dev" : "prod";
}

export default defineConfig(({ mode }) => {
  const t = mode === "test" ? "prod" : target();
  const mock = t === "mock";
  if (mode !== "test" && !mock && !FIREBASE[t]) throw new Error(`Thiếu cấu hình Firebase "${t}" trong firebase.config.js`);
  return {
    plugins: [appParts()],
    resolve: { alias: mock ? [{ find: /^\.\/firebase\.js$/, replacement: resolve(__dirname, "src/mock/firebase-mock.js") }] : [] },
    define: { __FB_TARGET__: JSON.stringify(t) },
    build: { target: "es2020", sourcemap: true, rollupOptions: { output: { manualChunks: id => (id.includes("node_modules/@firebase") || id.includes("node_modules/firebase") ? "firebase" : undefined) } } },
    test: { environment: "node", include: ["tests/*.test.js"], testTimeout: 20000 }
  };
});
