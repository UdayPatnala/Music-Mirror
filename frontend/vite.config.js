import { defineConfig, transformWithOxc } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    {
      name: "treat-js-files-as-jsx",
      enforce: "pre",
      async transform(code, id) {
        if (/\/src\/.*\.js$/.test(id.replace(/\\/g, "/"))) {
          return transformWithOxc(code, id, {
            lang: "jsx",
            jsx: {
              runtime: "automatic",
            },
          });
        }
      },
    },
    react(),
  ],
  define: {
    "process.env.PUBLIC_URL": JSON.stringify(""),
    "process.env.REACT_APP_API_URL": JSON.stringify(
      process.env.REACT_APP_API_URL || ""
    ),
  },
  build: {
    outDir: "build",
    emptyOutDir: true,
    chunkSizeWarningLimit: 1600,
  },
});
