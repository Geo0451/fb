import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        login: resolve(import.meta.dirname, "login.html"),
        dashboard: resolve(import.meta.dirname, "dashboard.html"),
        admin: resolve(import.meta.dirname, "admin.html"),
      },
    },
  },
});