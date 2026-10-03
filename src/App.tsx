import { useEffect, useRef, type MouseEvent } from "react";
import domains from "virtual:content";
import { sections } from "./content/model.ts";
import type { TopicNode } from "./content/schema.ts";
import { applyUpdate, dismissUpdate, useUpdateReady } from "./pwa.ts";
import { find, link, resolve, useRoute } from "./route.ts";
import { nextPref, setThemePref, useTheme, type ThemePref } from "./theme.ts";
import {
  Home,
  labels,
  NodeOverview,
  NotFound,
  SectionView,
  tone,
} from "./views.tsx";

/** Open book with a bookmark; same artwork as public/icon.svg. */
const Logo = () => (
  <svg viewBox="0 0 64 64" className="size-8 shrink-0" aria-hidden="true">
    <rect width="64" height="64" rx="14" fill="#4338ca" />
    <path d="M13 20c6-2 13-1.5 18 2v24c-5-3-12-3.5-18-1.5z" fill="#fff" />
    <path d="M51 20c-6-2-13-1.5-18 2v24c5-3 12-3.5 18-1.5z" fill="#e0e7ff" />
    <path d="M40 19.5v11l3-2.2 3 2.2v-11.8z" fill="#fbbf24" />
  </svg>
);

const safeDecode = (s: string) => {
  try {
    return decodeURI(s);
  } catch {
    return s;
  }
};

const iconBtn =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-subtle hover:text-fg focus-visible:outline-2";

const themeIcons: Record<ThemePref, string> = {
  system: "M4 5h16v11H4zM9 20h6M12 16v4",
  light:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4",
  dark: "M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z",
};

/** Cycles system -> light -> dark. */
function ThemeToggle() {
  const { pref } = useTheme();
  const name = (p: ThemePref) => p[0].toUpperCase() + p.slice(1);
  const label = `Theme: ${name(pref)}. Switch to ${name(nextPref(pref))}`;
  return (
    <button
      type="button"
      onClick={() => setThemePref(nextPref(pref))}
      aria-label={label}
      title={label}
      className={iconBtn}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
        <path
          d={themeIcons[pref]}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

/** Topic tree; only the active node's ancestors (and itself) are expanded. */
function Tree({ nodes, active }: { nodes: TopicNode[]; active: string }) {
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => (
        <li key={n.path}>
          <a
            href={link({ path: n.path })}
            aria-current={n.path === active ? "page" : undefined}
            className="flex min-h-11 items-center rounded-lg px-3 py-2 text-[15px] leading-snug text-muted hover:bg-subtle hover:text-fg focus-visible:outline-2 aria-[current=page]:bg-primary-soft aria-[current=page]:font-semibold aria-[current=page]:text-primary"
          >
            {n.title}
          </a>
          {n.children.length > 0 &&
            (active === n.path || active.startsWith(n.path + "/")) && (
              <div className="ml-4 border-l border-line pl-1.5">
                <Tree nodes={n.children} active={active} />
              </div>
            )}
        </li>
      ))}
    </ul>
  );
}

function UpdateToast({ aboveNav }: { aboveNav: boolean }) {
  if (!useUpdateReady()) return null;
  return (
    <div
      role="status"
      className={`fixed inset-x-3 z-30 mx-auto flex max-w-md items-center gap-2 rounded-xl border border-line bg-surface py-2 pr-2 pl-4 shadow-lg md:bottom-4 print:hidden ${aboveNav ? "bottom-[calc(4.25rem+env(safe-area-inset-bottom))]" : "bottom-[calc(1rem+env(safe-area-inset-bottom))]"}`}
    >
      <span className="flex-1 text-sm">New content available.</span>
      <button
        type="button"
        onClick={applyUpdate}
        className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-fg focus-visible:outline-2"
      >
        Reload
      </button>
      <button
        type="button"
        onClick={dismissUpdate}
        aria-label="Dismiss"
        className={iconBtn}
      >
        <svg viewBox="0 0 24 24" className="size-5" aria-hidden="true">
          <path
            d="M6 6l12 12M18 6 6 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  );
}

const tab =
  "flex items-center justify-center focus-visible:outline-2 aria-[current=page]:font-semibold aria-[current=page]:text-tone";

export default function App() {
  const route = useRoute();
  const { node, closest } = route.path ? resolve(domains, route) : {};
  const domain = route.path.split("/")[0];
  const drawer = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    document.title = node
      ? `${route.section ? labels[route.section][0] + ": " : ""}${node.title} | PocketBook`
      : route.path
        ? "Page not found | PocketBook"
        : "PocketBook";
    window.scrollTo(0, 0);
  }, [route, node]);

  // Close the drawer on backdrop taps and on any link tap inside it.
  const onDrawerClick = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget || (e.target as Element).closest("a"))
      drawer.current?.close();
  };

  const crumbs = node
    ? node.path
        .split("/")
        .map((_, i, a) => find(domains, a.slice(0, i + 1).join("/"))!)
    : [];

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 pt-[env(safe-area-inset-top)] backdrop-blur print:hidden">
        <div className="flex h-14 items-center gap-1 pr-[max(0.5rem,env(safe-area-inset-right))] pl-[max(0.5rem,env(safe-area-inset-left))] md:px-4">
          <button
            type="button"
            onClick={() => drawer.current?.showModal()}
            aria-label="Open topics"
            className={`${iconBtn} md:hidden`}
          >
            <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
              <path
                d="M4 6h16M4 12h16M4 18h16"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
          <a
            href={link({ path: "" })}
            className="flex min-h-11 min-w-0 items-center gap-2.5 rounded-lg px-1.5 font-semibold tracking-tight focus-visible:outline-2"
          >
            <Logo />
            <span className="truncate">PocketBook</span>
          </a>
          <nav
            aria-label="Domains"
            className="ml-3 hidden min-w-0 items-center gap-1 overflow-x-auto sm:flex"
          >
            {domains.map((d) => (
              <a
                key={d.id}
                href={link({ path: d.path })}
                aria-current={d.id === domain ? "true" : undefined}
                className="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium whitespace-nowrap text-muted hover:bg-subtle hover:text-fg focus-visible:outline-2 aria-[current]:text-primary"
              >
                {d.title}
              </a>
            ))}
          </nav>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <dialog
        ref={drawer}
        onClick={onDrawerClick}
        aria-label="Topics"
        className="inset-y-0 right-auto left-0 m-0 h-dvh max-h-none w-80 max-w-[85vw] border-r border-line bg-surface p-0 pt-[env(safe-area-inset-top)] pl-[env(safe-area-inset-left)] text-fg shadow-xl backdrop:bg-black/50"
      >
        <nav aria-label="Topics" className="p-3">
          <a
            href={link({ path: "" })}
            className="mb-2 flex min-h-11 items-center gap-2.5 px-2 font-semibold"
          >
            <Logo />
            PocketBook
          </a>
          <Tree nodes={domains} active={route.path} />
        </nav>
      </dialog>

      <div className="md:flex">
        <aside className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] hidden h-[calc(100dvh-3.5rem-env(safe-area-inset-top))] w-64 shrink-0 lg:w-72 overflow-y-auto border-r border-line md:block print:hidden">
          <nav aria-label="Topics" className="p-3">
            <Tree nodes={domains} active={route.path} />
          </nav>
        </aside>

        <main
          className={`mx-auto min-w-0 max-w-3xl flex-1 px-4 pt-4 sm:px-6 md:pt-8 md:pb-16 ${node ? "pb-[calc(6rem+env(safe-area-inset-bottom))]" : "pb-[calc(3rem+env(safe-area-inset-bottom))]"}`}
        >
          {node && (
            <>
              <nav
                aria-label="Breadcrumb"
                className="mb-4 text-sm print:hidden"
              >
                <ol className="flex flex-wrap items-center gap-x-1 text-muted">
                  {crumbs.map((c) => (
                    <li
                      key={c.path}
                      className="flex items-center gap-1 after:text-line-strong after:content-['/'] last:after:content-none"
                    >
                      <a
                        href={link({ path: c.path })}
                        className="inline-flex min-h-8 items-center hover:text-fg hover:underline"
                      >
                        {c.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
              <nav
                aria-label="Sections"
                className="mb-8 hidden gap-x-0.5 overflow-x-auto border-b border-line md:flex print:hidden"
              >
                {[undefined, ...sections].map((s) => (
                  <a
                    key={s ?? "overview"}
                    href={link({ path: node.path, section: s })}
                    aria-current={route.section === s ? "page" : undefined}
                    style={s && tone(s)}
                    className={`${tab} min-h-11 shrink-0 border-b-2 border-transparent px-2.5 text-sm whitespace-nowrap text-muted hover:text-fg aria-[current=page]:border-tone`}
                  >
                    {s ? labels[s][0] : "Overview"}
                  </a>
                ))}
              </nav>
            </>
          )}

          {!route.path ? (
            <Home domains={domains} />
          ) : !node ? (
            <NotFound
              path={safeDecode(location.pathname + location.hash)}
              closest={
                closest && {
                  href: link({
                    path: closest.node.path,
                    section: closest.section,
                  }),
                  label: `Go to ${closest.section ? labels[closest.section][0] + ": " : ""}${closest.node.title}`,
                }
              }
            />
          ) : route.section ? (
            <SectionView
              node={node}
              section={route.section}
              item={route.item}
            />
          ) : (
            <NodeOverview node={node} />
          )}
        </main>
      </div>

      {node && (
        <nav
          aria-label="Sections"
          className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-7 border-t border-line bg-surface/95 pr-[env(safe-area-inset-right)] pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)] backdrop-blur md:hidden print:hidden"
        >
          {sections.map((s) => (
            <a
              key={s}
              href={link({ path: node.path, section: s })}
              aria-current={route.section === s ? "page" : undefined}
              style={tone(s)}
              className={`${tab} group relative min-h-14 flex-col gap-1 px-0.5 text-center text-[11px] leading-tight text-muted`}
            >
              <span
                aria-hidden="true"
                className="size-1.5 rounded-full bg-tone opacity-60 group-aria-[current=page]:opacity-100"
              />
              {labels[s][1]}
              <span
                aria-hidden="true"
                className="absolute inset-x-2 top-0 hidden h-0.5 rounded-full bg-tone group-aria-[current=page]:block"
              />
            </a>
          ))}
        </nav>
      )}

      <UpdateToast aboveNav={!!node} />
    </div>
  );
}
