import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  workers: 1,
  // the studio is paid-only: tests run as a paid account created in the local database (see global-setup.ts)
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL: "http://localhost:3000",
    storageState: "e2e/.auth/paid.json",
    // software WebGL so the suite also runs on machines with no GPU
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  // Next allows one dev server per folder, so reuse one that is already running.
  webServer: { command: "npm run dev", url: "http://localhost:3000", reuseExistingServer: true, timeout: 180_000 },
});
