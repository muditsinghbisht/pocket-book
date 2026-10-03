import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import type { Plugin } from "vite";
import { compileContent, type ContentFiles } from "../src/content/compile.ts";
import type { TopicNode } from "../src/content/schema.ts";
import { notFoundArt } from "../src/not-found-art.ts";

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
 * dist/404.html: standalone (no app JS), served by the host for a missing path
 * at any depth, so it uses only inline CSS/SVG and absolute links. Colors
 * mirror the tokens in src/index.css.
 */
export const notFoundHtml = `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
<meta name="robots" content="noindex" />
<meta name="color-scheme" content="light dark" />
<title>Page not found | PocketBook</title>
<link rel="icon" href="/icon.svg" type="image/svg+xml" />
<style>
:root{color-scheme:light;--bg:#fafaf9;--surface:#fff;--subtle:#f3f2ef;--fg:#1c1917;--muted:#57534e;--line:#e7e5e4;--line-strong:#d6d3d1;--primary:#4338ca;--primary-fg:#fff}
@media (prefers-color-scheme:dark){:root{color-scheme:dark;--bg:#0f1117;--surface:#161922;--subtle:#1f2330;--fg:#e6e8ee;--muted:#a3a9b7;--line:#2a2f3d;--line-strong:#3b4254;--primary:#a5b4fc;--primary-fg:#0f1117}}
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px max(16px,env(safe-area-inset-right)) 24px max(16px,env(safe-area-inset-left));background:var(--bg);color:var(--fg);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}
main{max-width:28rem;text-align:center;display:flex;flex-direction:column;align-items:center}
.art{width:14rem}
.eyebrow{margin:24px 0 0;color:var(--primary);font-size:14px;font-weight:600;letter-spacing:.05em;text-transform:uppercase}
h1{margin:4px 0 0;font-size:30px;line-height:1.2;letter-spacing:-.02em;text-wrap:balance}
p.msg{margin:12px 0 0;color:var(--muted)}
a{margin-top:32px;display:inline-flex;align-items:center;justify-content:center;min-height:48px;padding:0 24px;border-radius:12px;background:var(--primary);color:var(--primary-fg);font-weight:600;text-decoration:none}
a:hover{opacity:.9}
a:focus-visible{outline:2px solid var(--primary);outline-offset:2px}
@media (min-width:640px){.art{width:16rem}}
</style>
</head>
<body>
<main>
<div class="art">${notFoundArt}</div>
<p class="eyebrow">Error 404</p>
<h1>This page fell out of the book</h1>
<p class="msg">We checked every chapter, but this page is not in PocketBook. It may have moved, or it was never written.</p>
<a href="/">Back to home</a>
</main>
</body>
</html>
`;

/**
 * Validates content/ and serves it as `virtual:content`: the compiled tree as
 * the default export, plus `modules`, lazy imports of every lesson and case
 * study (compiled by @mdx-js/rollup). Any error fails the build. Also emits
 * <domain>/index.html for each top-level domain, and 404.html.
 */
export default function content(): Plugin {
  let root = "";
  let dir = "";
  let domains: TopicNode[] = [];
  return {
    name: "pocket-book-content",
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
        this.emitFile({
          type: "asset",
          fileName: "404.html",
          source: notFoundHtml,
        });
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
