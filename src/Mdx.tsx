import {
  isValidElement,
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  type ComponentProps,
} from "react";
import { modules } from "virtual:content";
import { useTheme } from "./theme.ts";

// Each lesson or case study is its own lazily loaded chunk.
const pages = Object.fromEntries(
  Object.entries(modules).map(([file, load]) => [file, lazy(load)]),
);

type Mermaid = (typeof import("mermaid"))["default"];
let mermaid: Promise<Mermaid> | undefined; // loaded on first diagram only

function Diagram({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const id = "mermaid-" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const { theme } = useTheme(); // re-rendered on theme change
  useEffect(() => {
    let live = true;
    mermaid ??= import("mermaid").then((m) => m.default);
    mermaid
      .then((m) => {
        m.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: theme === "dark" ? "dark" : "default",
        });
        return m.render(id, code);
      })
      .then(({ svg }) => {
        const el = ref.current;
        if (!live || !el) return;
        el.innerHTML = svg;
        // Natural size instead of shrink-to-fit, so labels stay readable; the box scrolls.
        const s = el.querySelector("svg");
        if (s?.style.maxWidth) {
          s.style.width = s.style.maxWidth;
          s.style.maxWidth = "none";
        }
      })
      .catch((e: Error) => {
        if (live && ref.current)
          ref.current.textContent = `Diagram error: ${e.message}`;
      });
    return () => {
      live = false;
    };
  }, [code, id, theme]);
  return (
    // No React children: the SVG is injected, so React never reconciles it.
    <div
      ref={ref}
      className="diagram empty:before:content-['Loading_diagram…']"
    />
  );
}

function Pre(props: ComponentProps<"pre">) {
  const code = props.children;
  if (
    isValidElement<{ className?: string; children?: unknown }>(code) &&
    code.props.className === "language-mermaid"
  )
    return <Diagram code={String(code.props.children)} />;
  return <pre {...props} />;
}

const Table = (props: ComponentProps<"table">) => (
  <div className="table-wrap">
    <table {...props} />
  </div>
);

const components = { pre: Pre, table: Table };

/** Renders a compiled lesson or case study by its content/ path. */
export function Mdx({ file }: { file: string }) {
  const Page = pages[file];
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <div className="prose">
        <Page components={components} />
      </div>
    </Suspense>
  );
}
