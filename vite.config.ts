import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Served at the root of the custom domain (sighlo.news), so assets live at "/".
  base: "/",
  plugins: [react()],
});
