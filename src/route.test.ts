import { expect, test } from "vitest";
import { href, parseHash, toHash, type Route } from "./route.ts";

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
