import { defineConfig } from "vitest/config";
// Test rules Firestore, cần emulator: npm run test:rules (chạy trên GitHub Actions)
export default defineConfig({ test: { include: ["tests/rules/*.test.js"], testTimeout: 20000, fileParallelism: false } });
