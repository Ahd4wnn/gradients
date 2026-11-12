import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 180_000,
  workers: 1,
  use: {
    baseURL: "http://localhost:3100",
    // software WebGL so the suite also runs on machines with no GPU
    launchOptions: { args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] },
  },
  webServer: { command: "npm run build:embed && npx next dev -p 3100", url: "http://localhost:3100", reuseExistingServer: false, timeout: 180_000 },
});
