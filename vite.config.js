// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";

export default defineConfig({
  plugins: [react()],
  server: {
  
    port: 5173,
    proxy: {
      "/api": {
        target: "https://chatify-api.up.railway.app",
        changeOrigin: true,
        secure: true, 
        rewrite: (p) => p.replace(/^\/api/, ""),
      },
    },
  },
});
