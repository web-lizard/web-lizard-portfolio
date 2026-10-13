import { defineConfig } from "vite";
import { resolve } from "node:path";
export default defineConfig({
  build: {
    assetsDir: "portfolio-assets",
    target: "es2022",
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        approach: resolve(import.meta.dirname, "approach/index.html"),
      },
    },
  },
});
