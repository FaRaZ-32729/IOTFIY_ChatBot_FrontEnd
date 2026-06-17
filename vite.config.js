import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/api": {
        // target: "http://localhost:5000",
        target: "https://chatbotnd.iotfiysolutions.com",
        changeOrigin: true,
      },
      "/pdf-images": {
        target: "https://chatbotnd.iotfiysolutions.com",
        changeOrigin: true,
      },
      "/uploads": {
        target: "https://chatbotnd.iotfiysolutions.com",
        changeOrigin: true,
      },
      "/live": {
        target: "https://chatbotnd.iotfiysolutions.com",
        ws: true,
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
  },
});
