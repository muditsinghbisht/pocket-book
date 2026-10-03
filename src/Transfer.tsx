// Export and import bar shared by notes and custom flashcards.
import { useState } from "react";
import domains from "virtual:content";
import type { Section } from "./content/model.ts";
import { getAll, putAll, storageError } from "./db.ts";
import { find } from "./route.ts";
import {
  parseImport,
  split,
  toJson,
  toMarkdown,
  type Card,
  type Note,
} from "./userdata.ts";
import { labels } from "./views.tsx";

export const btn =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-surface px-4 font-medium hover:bg-subtle focus-visible:outline-2 disabled:opacity-50";
export const primaryBtn =
  "inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 font-semibold text-primary-fg hover:opacity-90 focus-visible:outline-2";

/** "Caching › Eviction — Lessons" for "caching/eviction#lessons". */
export function titleOf(key: string) {
  const [path, section] = key.split("#");
  const parts = path.split("/");
  const names = parts.map(
    (_, i) => find(domains, parts.slice(0, i + 1).join("/"))?.title ?? parts[i],
  );
  return (
    names.join(" › ") +
    (section ? ` — ${labels[section as Section]?.[0] ?? section}` : "")
  );
}

function download(name: string, text: string, type: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
}

type Props = { kind: "notes" | "flashcards"; onImported: () => void };

export function Transfer({ kind, onImported }: Props) {
  const [msg, setMsg] = useState("");
  const store = kind === "notes" ? "notes" : "cards";
  const id = (x: Note | Card) => ("key" in x ? x.key : x.id);

  const exportAs = async (md: boolean) => {
    try {
      const items = (await getAll(store)).sort((a, b) =>
        id(a).localeCompare(id(b)),
      );
      if (!items.length) return setMsg(`You have no ${kind} to export yet.`);
      const date = new Date().toISOString().slice(0, 10);
      const text = md ? toMarkdown(kind, items, titleOf) : toJson(kind, items);
      download(
        `pocketbook-${kind}-${date}.${md ? "md" : "json"}`,
        text,
        md ? "text/markdown" : "application/json",
      );
      setMsg("");
    } catch {
      setMsg(storageError);
    }
  };

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    let incoming: (Note | Card)[];
    try {
      incoming = parseImport(kind, await file.text());
    } catch (e) {
      return setMsg(`Could not import ${file.name}: ${(e as Error).message}`);
    }
    try {
      const { fresh, conflicts } = split(await getAll(store), incoming, id);
      const replace =
        conflicts.length > 0 &&
        confirm(
          `${conflicts.length} imported ${kind === "notes" ? "notes differ from yours" : "cards differ from yours"}.\n\nOK: replace yours with the imported versions.\nCancel: keep yours and import only new ones.`,
        );
      const write = replace ? [...fresh, ...conflicts] : fresh;
      await putAll(store, write);
      setMsg(
        `Imported ${write.length} of ${incoming.length} ${kind}` +
          (incoming.length > write.length
            ? " (the rest were unchanged or kept)."
            : "."),
      );
      onImported();
    } catch {
      setMsg(storageError);
    }
  };

  return (
    <section className="mt-10 print:hidden">
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        Export and import
      </h2>
      <p className="mb-3 text-sm text-muted">
        Your {kind === "notes" ? "notes" : "own cards"} for the whole book stay
        in this browser. Export them to back up or move to another device.
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className={btn} onClick={() => exportAs(false)}>
          Export JSON
        </button>
        <button type="button" className={btn} onClick={() => exportAs(true)}>
          Export Markdown
        </button>
        <label className={`${btn} cursor-pointer focus-within:outline-2`}>
          Import file
          <input
            type="file"
            accept=".json,.md,.markdown,.txt,application/json,text/markdown,text/plain"
            className="sr-only"
            onChange={(e) => {
              importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
      {msg && (
        <p role="status" className="mt-3 text-sm">
          {msg}
        </p>
      )}
    </section>
  );
}
