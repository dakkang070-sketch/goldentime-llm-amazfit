import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 5000,
      host: true, // 모든 네트워크 인터페이스 허용
      allowedHosts: true,
      proxy: {
        "/api": {
          target: "http://127.0.0.1:5001",
          changeOrigin: true,
          secure: false,
        },
        "/uploads": {
          target: "http://127.0.0.1:5001",
          changeOrigin: true,
          secure: false,
        },
        "/socket.io": {
          target: "http://127.0.0.1:5001",
          ws: true,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
