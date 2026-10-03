import { expect, test } from "vitest";
import type { Question, TopicNode } from "./content/schema.ts";
import { href, parseHash, resolve, toHash, type Route } from "./route.ts";

test.each<[string, string, Route]>([
  ["", "", { path: "caching" }],
  ["#", "", { path: "caching" }],
  ["#eviction/lru", "", { path: "caching/eviction/lru" }],
  ["#/eviction/lru/", "", { path: "caching/eviction/lru" }],
  ["#lessons", "", { path: "caching", section: "lessons" }],
  [
    "#eviction/lessons/intro",
    "",
    { path: "caching/eviction", section: "lessons", item: "intro" },
  ],
  [
    "#case-studies/outage/extra",
    "",
    { path: "caching", section: "case-studies", item: "outage" },
  ],
])("parseHash(caching, %j)", (hash, _, route) => {
  expect(parseHash("caching", hash)).toEqual(route);
});

test("home page ignores the hash", () => {
  expect(parseHash("", "#eviction")).toEqual({ path: "" });
});

test("toHash round-trips through parseHash", () => {
  for (const r of [
    { path: "caching" },
    { path: "caching/eviction/lru" },
    { path: "caching", section: "notes" },
    { path: "caching/eviction", section: "lessons", item: "intro" },
  ] satisfies Route[])
    expect(parseHash("caching", toHash(r))).toEqual(r);
  expect(toHash({ path: "caching" })).toBe("");
  expect(toHash({ path: "caching", item: "x" })).toBe(""); // item needs a section
});

test("href is relative, so it works under any subpath", () => {
  const lru = { path: "caching/eviction/lru" };
  expect(href(lru, "caching")).toBe("#eviction/lru");
  expect(href({ path: "caching" }, "caching")).toBe("#");
  expect(href(lru, "")).toBe("./caching/#eviction/lru");
  expect(href({ path: "caching" }, "")).toBe("./caching/");
  expect(href(lru, "networking")).toBe("../caching/#eviction/lru");
  expect(href({ path: "" }, "caching")).toBe("../");
  expect(href({ path: "" }, "")).toBe("./");
});

test("resolve finds nodes and items, else the closest valid route", () => {
  const blank = { lessons: [], caseStudies: [], questions: [], flashcards: [] };
  const lru: TopicNode = {
    ...blank,
    id: "lru",
    path: "caching/lru",
    title: "LRU",
    quizzes: [],
    children: [],
    lessons: [{ id: "intro", title: "Intro", file: "x.md" }],
    questions: [
      { id: "p1", type: "open" },
      { id: "q1", type: "mcq" },
    ] as Question[],
  };
  const caching: TopicNode = {
    ...blank,
    id: "caching",
    path: "caching",
    title: "Caching",
    quizzes: [],
    children: [lru],
  };
  const r = (route: Route) => resolve([caching], route);
  expect(r({ path: "caching/lru" })).toEqual({ node: lru });
  expect(r({ path: "caching/lru", section: "lessons", item: "intro" })).toEqual(
    { node: lru },
  );
  expect(r({ path: "caching/lru", section: "practice", item: "p1" })).toEqual({
    node: lru,
  });
  // Unknown item, quiz question as practice item, item on a section without items.
  for (const [section, item] of [
    ["lessons", "nope"],
    ["practice", "q1"],
    ["notes", "x"],
  ] as const)
    expect(r({ path: "caching/lru", section, item })).toEqual({
      closest: { node: lru, section },
    });
  expect(r({ path: "caching/lru/missing/deeper" })).toEqual({
    closest: { node: lru },
  });
  expect(r({ path: "caching/missing" })).toEqual({
    closest: { node: caching },
  });
  expect(r({ path: "networking/x" })).toEqual({});
});
