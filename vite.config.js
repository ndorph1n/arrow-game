import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// https://vite.dev/config/
export default defineConfig({
  plugins: [viteSingleFile()],

  server: {
    host: true,
    port: 8080,
    open: true,
  },
});
