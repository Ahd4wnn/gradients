import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3000",
    // software WebGL so the suite also runs on machines with no GPU
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  // Next allows one dev server per folder, so reuse one that is already running.
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
