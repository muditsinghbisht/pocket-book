import { describe, expect, it } from "vitest";
import {
  noteKey,
  parseImport,
  split,
  toJson,
  toMarkdown,
  type Card,
  type Note,
} from "./userdata.ts";

const notes: Note[] = [
  { key: "caching", text: "Plain note" },
  {
    key: noteKey("caching/eviction", "lessons"),
    text: "## My heading\n\n- a list\n\nTrailing newline\n",
  },
];
const cards: Card[] = [
  { id: "c1", path: "caching", front: "What is a TTL?", back: "Time to live" },
  {
    id: "c2",
    path: "caching/eviction",
    front: "Multi\n\nline **front**",
    back: "```\ncode\n```",
  },
];

describe("notes export/import", () => {
  it("round-trips through JSON", () => {
    expect(parseImport("notes", toJson("notes", notes))).toEqual(notes);
  });

  it("round-trips through Markdown", () => {
    expect(parseImport("notes", toMarkdown("notes", notes))).toEqual(notes);
  });

  it("writes readable Markdown with titled headings", () => {
    expect(toMarkdown("notes", [notes[0]], (k) => `Title of ${k}`)).toBe(
      "<!-- pocketbook notes v1 -->\n# PocketBook notes\n\n" +
        "<!-- pb caching -->\n## Title of caching\n\nPlain note\n\n",
    );
  });

  it("reads files with Windows line endings", () => {
    const md = toMarkdown("notes", [notes[0]]).replace(/\n/g, "\r\n");
    expect(parseImport("notes", md)).toEqual([notes[0]]);
  });
});

describe("flashcards export/import", () => {
  it("round-trips through JSON", () => {
    expect(parseImport("flashcards", toJson("flashcards", cards))).toEqual(
      cards,
    );
  });

  it("round-trips through Markdown", () => {
    expect(parseImport("flashcards", toMarkdown("flashcards", cards))).toEqual(
      cards,
    );
  });
});

describe("import validation", () => {
  it("rejects the wrong kind, version and bad JSON", () => {
    expect(() => parseImport("flashcards", toJson("notes", notes))).toThrow(
      "not a PocketBook flashcards file",
    );
    expect(() => parseImport("notes", toMarkdown("flashcards", cards))).toThrow(
      "not a PocketBook notes file",
    );
    expect(() =>
      parseImport(
        "notes",
        JSON.stringify({ format: "pocketbook-notes", version: 9, notes }),
      ),
    ).toThrow("Unsupported file version 9");
    expect(() => parseImport("notes", "{ nope")).toThrow("not valid JSON");
  });

  it("rejects invalid entries and drops unknown fields", () => {
    const bad = { format: "pocketbook-flashcards", version: 1 };
    expect(() =>
      parseImport(
        "flashcards",
        JSON.stringify({ ...bad, cards: [{ id: "x", path: "a", front: "" }] }),
      ),
    ).toThrow("Entry 1 is not a valid flashcard");
    expect(
      parseImport(
        "flashcards",
        JSON.stringify({ ...bad, cards: [{ ...cards[0], extra: 1 }] }),
      ),
    ).toEqual([cards[0]]);
  });
});

describe("split", () => {
  it("separates new, identical and conflicting records", () => {
    const changed = { ...cards[0], back: "Changed" };
    const reordered = {
      back: cards[1].back,
      front: cards[1].front,
      path: cards[1].path,
      id: cards[1].id,
    };
    const extra = { ...cards[0], id: "c3" };
    expect(split(cards, [changed, reordered, extra], (c) => c.id)).toEqual({
      fresh: [extra],
      conflicts: [changed],
    });
  });
});
