import mdx from "@mdx-js/rollup";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import { defineConfig } from "vitest/config";
import content from "./build/content-plugin.ts";
import pwa from "./build/pwa-plugin.ts";

export default defineConfig(({ command }) => {
  // Always a production build, whatever NODE_ENV the shell has (a stray
  // NODE_ENV=development would otherwise ship React's dev build).
  // Vite reads NODE_ENV after loading this config.
  if (command === "build") process.env.NODE_ENV = "production";
  return {
    base: "./",
    plugins: [
      // Lessons and case studies: .md as Markdown, .mdx as MDX. Frontmatter is
      // validated by the content plugin and stripped here.
      {
        enforce: "pre",
        ...mdx({ remarkPlugins: [remarkFrontmatter, remarkGfm] }),
      },
      react(),
      tailwindcss(),
      content(),
      pwa(),
    ],
    test: {
      environment: "node",
      include: ["src/**/*.test.{ts,tsx}"],
    },
  };
});
