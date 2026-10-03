// The only routing module. Hybrid URLs, all relative so the build works under any subpath:
//   <base>/                              home (list of domains)
//   <base>/<domain>/                     domain overview; a real index.html per domain
//   <base>/<domain>/#<node path>         deeper node, e.g. /caching/#eviction/lru
//   ...#<node path>/<section>[/<item>]   section view, e.g. /caching/#eviction/lessons/intro
// Section names are reserved (the content build rejects them as node ids), so the
// first section-name segment ends the node path.
import { useMemo, useSyncExternalStore } from "react";
import { isQuizQuestion, sections, type Section } from "./content/model.ts";
import type { TopicNode } from "./content/schema.ts";

/** `path` is the full node path ("caching/eviction"); "" is the home page. */
export type Route = { path: string; section?: Section; item?: string };

export function find(nodes: TopicNode[], path: string): TopicNode | undefined {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (path.startsWith(n.path + "/")) return find(n.children, path);
  }
}

/** Ids a section's `item` may name; sections not listed take no item. */
const itemIds = (n: TopicNode, s: Section) => {
  const items: Partial<Record<Section, { id: string }[]>> = {
    lessons: n.lessons,
    "case-studies": n.caseStudies,
    practice: n.questions.filter((q) => !isQuizQuestion(q)),
  };
  return items[s]?.map((x) => x.id) ?? [];
};

/**
 * The node a (non-home) route shows. If any part of the route is unknown,
 * `node` is undefined and `closest` is the deepest valid route above it, if any.
 */
export function resolve(
  nodes: TopicNode[],
  { path, section, item }: Route,
): { node?: TopicNode; closest?: { node: TopicNode; section?: Section } } {
  const node = find(nodes, path);
  if (node && (!section || !item || itemIds(node, section).includes(item)))
    return { node };
  if (node) return { closest: { node, section } };
  const parts = path.split("/");
  for (let i = parts.length - 1; i > 0; i--) {
    const n = find(nodes, parts.slice(0, i).join("/"));
    if (n) return { closest: { node: n } };
  }
  return {};
}

const isSection = (s: string): s is Section =>
  (sections as readonly string[]).includes(s);

/** Parses a location hash on the page of `domain` ("" = home, which ignores the hash). */
export function parseHash(domain: string, hash: string): Route {
  if (!domain) return { path: "" };
  const parts = hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const i = parts.findIndex(isSection);
  const route: Route = {
    path: [domain, ...(i < 0 ? parts : parts.slice(0, i))].join("/"),
  };
  if (i >= 0) route.section = parts[i] as Section;
  if (i >= 0 && parts[i + 1]) route.item = parts[i + 1];
  return route;
}

/** The hash for a route on its domain's page ("" for the domain overview). */
export function toHash({ path, section, item }: Route): string {
  const rest = [...path.split("/").slice(1), section, section && item]
    .filter(Boolean)
    .join("/");
  return rest && `#${rest}`;
}

/** Relative href to `route` from the page of domain `from` ("" = home). */
export function href(route: Route, from: string): string {
  const domain = route.path.split("/")[0];
  if (domain && domain === from) return toHash(route) || "#";
  return (from ? "../" : "./") + (domain && `${domain}/`) + toHash(route);
}

/** Set at build time on each <domain>/index.html (see build/content-plugin.ts). */
export const pageDomain =
  typeof document === "undefined"
    ? ""
    : (document.querySelector<HTMLMetaElement>('meta[name="domain"]')
        ?.content ?? "");

/** href to `route` from the current page. */
export const link = (route: Route) => href(route, pageDomain);

const subscribe = (cb: () => void) => {
  addEventListener("hashchange", cb);
  return () => removeEventListener("hashchange", cb);
};

export function useRoute(): Route {
  const hash = useSyncExternalStore(subscribe, () => location.hash);
  return useMemo(() => parseHash(pageDomain, hash), [hash]);
}
