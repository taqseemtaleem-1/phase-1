import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [basicSsl()],
    server: {
      host: "0.0.0.0",
      port: 8080,
      https: {},
    },
  },
});