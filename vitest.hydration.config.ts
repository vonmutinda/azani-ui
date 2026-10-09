import { defineConfig } from "vitest/config";
import path from "node:path";
import react from "@vitejs/plugin-react";

// Next ships a different React renderer from the app's regular unit-test dependency.
export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, include: ["src/**/*.hydration-spec.tsx"] },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./src") },
      {
        find: /^react(\/.*)?$/,
        replacement: path.resolve(__dirname, "node_modules/next/dist/compiled/react") + "$1",
      },
      {
        find: /^react-dom(\/.*)?$/,
        replacement: path.resolve(__dirname, "node_modules/next/dist/compiled/react-dom") + "$1",
      },
    ],
  },
});
