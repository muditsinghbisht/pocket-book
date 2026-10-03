// Notes section: one autosaved note per node, and one per section of the node.
import { useEffect, useRef, useState } from "react";
import domains from "virtual:content";
import { sections, type Section } from "./content/model.ts";
import type { TopicNode } from "./content/schema.ts";
import { del, get, getAll, put, storageError } from "./db.ts";
import { find, link } from "./route.ts";
import { titleOf, Transfer } from "./Transfer.tsx";
import { noteKey } from "./userdata.ts";
import { labels, tone } from "./views.tsx";

const scopes = [undefined, ...sections.filter((s) => s !== "notes")];

function Editor({ k, label }: { k: string; label: string }) {
  const [text, setText] = useState<string>();
  const [status, setStatus] = useState("");
  const pending = useRef<string>(undefined);
  const timer = useRef(0);

  const flush = () => {
    clearTimeout(timer.current);
    const t = pending.current;
    if (t === undefined) return;
    pending.current = undefined;
    (t.trim() ? put("notes", { key: k, text: t }) : del("notes", k))
      .then(() => setStatus("Saved"))
      .catch(() => setStatus(storageError));
  };

  useEffect(() => {
    get("notes", k)
      .then((n) => setText(n?.text ?? ""))
      .catch(() => {
        setText("");
        setStatus(storageError);
      });
    return flush; // save a pending edit when switching notes or leaving
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [k]);

  useEffect(() => {
    // Mobile browsers may kill a backgrounded tab without unmounting.
    const onHide = () => document.hidden && flush();
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  });

  return (
    <>
      <label htmlFor="note" className="sr-only">
        {label}
      </label>
      <textarea
        id="note"
        value={text ?? ""}
        disabled={text === undefined}
        placeholder="Write your notes here. They save automatically and stay in this browser."
        onChange={(e) => {
          setText(e.target.value);
          setStatus("Saving…");
          pending.current = e.target.value;
          clearTimeout(timer.current);
          timer.current = window.setTimeout(flush, 500);
        }}
        onBlur={flush}
        className="block min-h-[45dvh] w-full resize-y rounded-xl border border-line bg-surface p-4 text-base leading-relaxed placeholder:text-muted focus-visible:outline-2"
      />
      <p role="status" className="mt-2 min-h-5 text-sm text-muted">
        {status}
      </p>
    </>
  );
}

/** Links to every node that has notes, so imported notes are easy to find. */
function AllNotes({ version }: { version: number }) {
  const [paths, setPaths] = useState<string[]>([]);
  useEffect(() => {
    getAll("notes")
      .then((ns) =>
        setPaths([...new Set(ns.map((n) => n.key.split("#")[0]))].sort()),
      )
      .catch(() => setPaths([]));
  }, [version]);
  const found = paths.filter((p) => find(domains, p));
  if (!found.length) return null;
  return (
    <section className="mt-10 print:hidden">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        Topics with notes
      </h2>
      <ul className="flex flex-wrap gap-2">
        {found.map((p) => (
          <li key={p}>
            <a
              className="inline-flex min-h-11 items-center rounded-lg border border-line bg-surface px-3 text-sm hover:bg-subtle focus-visible:outline-2"
              href={link({ path: p, section: "notes" })}
            >
              {titleOf(p)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Notes({ node }: { node: TopicNode }) {
  const [scope, setScope] = useState<Section>();
  // Bumped after an import so the editor and the list reload.
  const [version, setVersion] = useState(0);
  const k = noteKey(node.path, scope);
  return (
    <>
      <div
        role="group"
        aria-label="Note for"
        className="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        {scopes.map((s) => (
          <button
            key={s ?? "topic"}
            type="button"
            aria-pressed={s === scope}
            onClick={() => setScope(s)}
            style={tone(s ?? "notes")}
            className="min-h-11 shrink-0 rounded-full border border-line bg-surface px-4 text-sm font-medium whitespace-nowrap text-muted hover:bg-subtle focus-visible:outline-2 aria-pressed:border-tone aria-pressed:text-tone"
          >
            {s ? labels[s][0] : "Whole topic"}
          </button>
        ))}
      </div>
      <Editor key={`${k}@${version}`} k={k} label={`Notes: ${titleOf(k)}`} />
      <AllNotes version={version} />
      <Transfer kind="notes" onImported={() => setVersion((v) => v + 1)} />
    </>
  );
}
