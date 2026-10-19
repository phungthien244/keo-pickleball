import { defineConfig } from "vite";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import zaloMiniApp from "zmp-vite-plugin";
import { appParts } from "../vite.parts.js";

// Dùng chung toàn bộ code trang pikeco.app (../src), chạy với dữ liệu thật (Firebase prod).
// firebase và zmp-sdk lấy từ node_modules của thư mục miniapp.
const NM = resolve(dirname(fileURLToPath(import.meta.url)), "node_modules");
export default defineConfig({
  plugins: [appParts(), zaloMiniApp()],
  define: { __FB_TARGET__: JSON.stringify("prod") },
  resolve: { alias: [{ find: /^firebase\/(.*)$/, replacement: NM + "/firebase/$1" }, { find: /^zmp-sdk$/, replacement: NM + "/zmp-sdk" }] },
  server: { fs: { allow: [".."] } },
  build: { target: "es2020", outDir: "www", emptyOutDir: true }
});
