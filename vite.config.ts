import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    base: env.VITE_APP_BASE_URL,
    build: {
      outDir: "docs",
    },
    plugins: [react(), tailwindcss()],
  };
});
