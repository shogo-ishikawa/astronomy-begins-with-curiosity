import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173/astronomy-begins-with-curiosity/" },
  webServer: {
    command: "npm run build && npm run preview -- --host 127.0.0.1",
    url: "http://127.0.0.1:4173/astronomy-begins-with-curiosity/",
    reuseExistingServer: !process.env.CI,
  },
});
