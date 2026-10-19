import { defineConfig } from "vite";
import { resolve } from "node:path";
import { FIREBASE } from "./firebase.config.js";
import { appParts } from "./vite.parts.js";

// Nhánh main trên Cloudflare Pages = trang thật; nhánh khác = Firebase dev.
function target() {
  if (process.env.FB_TARGET) return process.env.FB_TARGET;
  const br = process.env.CF_PAGES_BRANCH;
  if (br === "demo") return "mock"; // demo.pikeco.pages.dev: dữ liệu mẫu, chạy trên máy, để thử luồng
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
