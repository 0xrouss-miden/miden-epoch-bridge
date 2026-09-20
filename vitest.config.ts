import { defineConfig } from "vitest/config";
import path from "node:path";
export default defineConfig({ resolve: { alias: { "@": path.resolve(import.meta.dirname) } }, test: { server: { deps: { inline: [/@epoch-protocol\//] } }, environment: "jsdom", globals: true, setupFiles: ["./vitest.setup.ts"], include: ["**/__tests__/*.test.{ts,tsx}"], exclude: ["node_modules/**"] } });
