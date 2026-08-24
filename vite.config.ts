import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // GitHub Pages serves this project from /sighlo/, not the domain root.
  base: "/sighlo/",
  plugins: [react()],
  server: {
    proxy: {
      "/api/news": {
        target: "https://news.google.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/news/, "/rss/search"),
      },
    },
  },
});
