// User data (notes and custom flashcards): types, export/import formats and merge.
// Pure, so it is unit tested; storage lives in db.ts.

/** `key` is a node path ("caching/eviction") or a node path and section ("caching/eviction#lessons"). */
export type Note = { key: string; text: string };
/** A user-made card in the deck of node `path`. */
export type Card = { id: string; path: string; front: string; back: string };

export const noteKey = (path: string, section?: string) =>
  section ? `${path}#${section}` : path;

type Kind = "notes" | "flashcards";
type Item = { notes: Note; flashcards: Card };
const listKey = { notes: "notes", flashcards: "cards" } as const;
const VERSION = 1;

// ---- JSON: lossless, versioned ----

export const toJson = <K extends Kind>(kind: K, items: Item[K][]) =>
  JSON.stringify(
    { format: `pocketbook-${kind}`, version: VERSION, [listKey[kind]]: items },
    null,
    2,
  ) + "\n";

// ---- Markdown: readable, and parsed back exactly ----
// Each record is a block: a marker comment (machine part), a heading (for
// people, ignored on import), a blank line, the body and a blank line.

const header = (kind: Kind) =>
  `<!-- pocketbook ${kind} v${VERSION} -->\n# PocketBook ${kind}\n\n`;
const marker = /^<!-- pb (\S+)(?: (\S+))? -->\n/m;
const front = "**Front**\n\n";
const back = "\n\n**Back**\n\n";

function block(
  id: string,
  extra: string | undefined,
  title: string,
  body: string,
) {
  return `<!-- pb ${id}${extra ? " " + extra : ""} -->\n## ${title}\n\n${body}\n\n`;
}

export function toMarkdown<K extends Kind>(
  kind: K,
  items: Item[K][],
  titleOf: (path: string) => string = (p) => p,
): string {
  return (
    header(kind) +
    items
      .map((i) =>
        "text" in i
          ? block(i.key, undefined, titleOf(i.key), i.text)
          : block(
              i.id,
              i.path,
              titleOf(i.path),
              front + i.front + back + i.back,
            ),
      )
      .join("")
  );
}

/** Splits a Markdown export into [id, extra, body] triples. */
function blocks(md: string, kind: Kind) {
  md = md.replace(/\r\n/g, "\n");
  if (!md.startsWith(`<!-- pocketbook ${kind} v`))
    throw new Error(`This is not a PocketBook ${kind} file.`);
  const parts = md.split(new RegExp(marker.source, "gm")).slice(1);
  const out: [string, string | undefined, string][] = [];
  for (let i = 0; i < parts.length; i += 3) {
    const body = parts[i + 2]
      .replace(/^## .*\n\n/, "")
      .replace(/\n\n$|\n$/, "");
    out.push([parts[i], parts[i + 1], body]);
  }
  return out;
}

// ---- Import ----

const str = (v: unknown, empty = false): v is string =>
  typeof v === "string" && (empty || v.trim() !== "");
const noSpace = (v: unknown) => str(v) && !/\s/.test(v);

function check<K extends Kind>(kind: K, items: unknown): Item[K][] {
  if (!Array.isArray(items))
    throw new Error(`Missing the ${listKey[kind]} list.`);
  items.forEach((x, i) => {
    const ok =
      kind === "notes"
        ? noSpace(x?.key) && str(x?.text, true)
        : noSpace(x?.id) && noSpace(x?.path) && str(x?.front) && str(x?.back);
    if (!ok)
      throw new Error(
        `Entry ${i + 1} is not a valid ${kind.replace(/s$/, "")}.`,
      );
  });
  // Keep only known fields.
  return items.map((x) =>
    kind === "notes"
      ? { key: x.key, text: x.text }
      : { id: x.id, path: x.path, front: x.front, back: x.back },
  ) as Item[K][];
}

/** Parses an exported JSON or Markdown file. Throws an Error with a readable message. */
export function parseImport<K extends Kind>(kind: K, text: string): Item[K][] {
  if (!text.trimStart().startsWith("{")) {
    const items = blocks(text, kind).map(([id, extra, body]) => {
      if (kind === "notes") return { key: id, text: body };
      const i = body.indexOf(back);
      if (!body.startsWith(front) || i < 0)
        throw new Error(`Card ${id} needs a **Front** and a **Back**.`);
      return {
        id,
        path: extra,
        front: body.slice(front.length, i),
        back: body.slice(i + back.length),
      };
    });
    return check(kind, items);
  }
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  if (data?.format !== `pocketbook-${kind}`)
    throw new Error(`This is not a PocketBook ${kind} file.`);
  if (data.version !== VERSION)
    throw new Error(`Unsupported file version ${data.version}.`);
  return check(kind, data[listKey[kind]]);
}

/**
 * Splits imported records against stored ones (same id): `fresh` are new or
 * identical, `conflicts` would overwrite different stored data.
 */
export function split<T>(stored: T[], incoming: T[], id: (t: T) => string) {
  const json = (t: T) => JSON.stringify(t, Object.keys(t as object).sort());
  const have = new Map(stored.map((s) => [id(s), json(s)]));
  const fresh: T[] = [];
  const conflicts: T[] = [];
  for (const t of incoming) {
    const old = have.get(id(t));
    if (old === undefined) fresh.push(t);
    else if (old !== json(t)) conflicts.push(t);
  }
  return { fresh, conflicts };
}
