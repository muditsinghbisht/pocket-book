import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";
import { compileContent, type ContentFiles } from "../src/content/compile.ts";
import type { TopicNode } from "../src/content/schema.ts";

const ID = "virtual:content";
const RESOLVED = "\0" + ID;

/**
 * The page for a top-level domain, served at <base>/<domain>/: page-relative
 * asset URLs move up one level, and a meta tag tells the router which domain it is.
 */
export const domainHtml = (html: string, domain: string) =>
  html
    .replaceAll('="./', '="../')
    .replace(
      "</head>",
      `  <meta name="domain" content="${domain}" />\n  </head>`,
    );

/**
 * Validates content/ and serves it as `virtual:content`: the compiled tree as
 * the default export, plus `modules`, lazy imports of every lesson and case
 * study (compiled by @mdx-js/rollup). Any error fails the build. Also emits
 * <domain>/index.html for each top-level domain.
 */
export default function content(): Plugin {
  let root = "";
  let dir = "";
  let domains: TopicNode[] = [];
  return {
    name: "study-assistant-content",
    configResolved(config) {
      root = config.root;
      dir = join(root, "content");
    },
    resolveId: (id) => (id === ID ? RESOLVED : undefined),
    load(id) {
      if (id !== RESOLVED) return;
      const files: ContentFiles = {};
      for (const e of readdirSync(dir, {
        recursive: true,
        withFileTypes: true,
      })) {
        if (!e.isFile() || e.name.startsWith(".")) continue;
        const path = join(e.parentPath, e.name);
        this.addWatchFile(path);
        files[relative(dir, path).split(sep).join("/")] = readFileSync(
          path,
          "utf8",
        );
      }
      const result = compileContent(files);
      if (result.errors.length)
        throw new Error(
          `Content validation failed (${result.errors.length}):\n  ${result.errors.join("\n  ")}`,
        );
      domains = result.domains;
      const modules = Object.keys(files)
        .filter((f) => /\.mdx?$/.test(f))
        .map(
          (f) =>
            `  ${JSON.stringify(f)}: () => import(${JSON.stringify(join(dir, f))}),`,
        );
      return `export default ${JSON.stringify(domains)};\nexport const modules = {\n${modules.join("\n")}\n};`;
    },
    generateBundle: {
      order: "post",
      handler(_, bundle) {
        const html = bundle["index.html"];
        if (html?.type !== "asset") return;
        for (const d of domains)
          this.emitFile({
            type: "asset",
            fileName: `${d.id}/index.html`,
            source: domainHtml(String(html.source), d.id),
          });
      },
    },
    configureServer(server) {
      // Dev equivalent of the emitted <domain>/index.html pages.
      server.middlewares.use(async (req, res, next) => {
        const m = /^\/([a-z0-9-]+)\/(index\.html)?(\?.*)?$/.exec(req.url ?? "");
        if (!m || !existsSync(join(dir, m[1], "node.yaml"))) return next();
        const html = readFileSync(join(root, "index.html"), "utf8");
        res.setHeader("Content-Type", "text/html");
        res.end(
          await server.transformIndexHtml(req.url!, domainHtml(html, m[1])),
        );
      });
      server.watcher.add(dir);
      server.watcher.on("all", (_event, file) => {
        if (!file.startsWith(dir + sep)) return;
        const graph = server.environments.client.moduleGraph;
        const mod = graph.getModuleById(RESOLVED);
        if (mod) graph.invalidateModule(mod);
        server.ws.send({ type: "full-reload" });
      });
    },
  };
}
