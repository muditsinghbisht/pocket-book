import { expect, test } from "vitest";
import { deriveQuiz, gradeNumeric, shuffle } from "./quiz.ts";
import type { Level } from "./model.ts";
import type { Question, TopicNode } from "./schema.ts";

const q = (id: string, level: Level): Question => ({
  id,
  level,
  type: "free",
  q: id,
  answer: "model answer",
  explain: "e",
});
const practice = (id: string, level: Level): Question => ({
  id,
  level,
  type: "open",
  q: id,
  explain: "e",
  hints: ["1", "2"],
});

const node = (
  path: string,
  questions: Question[],
  children: TopicNode[] = [],
): TopicNode => ({
  id: path.split("/").pop()!,
  path,
  title: path,
  lessons: [],
  caseStudies: [],
  questions,
  flashcards: [],
  quizzes: [],
  children,
});

const lru = node("caching/eviction/lru", [
  q("c", "beginner"),
  q("d", "staff"),
  practice("p", "beginner"),
]);
const eviction = node("caching/eviction", [q("b", "beginner")], [lru]);
const caching = node(
  "caching",
  [q("a", "beginner"), q("x", "advanced")],
  [eviction],
);
const other = node("networking", [q("n", "beginner")]);
const ids = (qs: { id: string }[]) => qs.map((x) => x.id).sort();

test("scope includes descendants and the chosen level only", () => {
  expect(ids(deriveQuiz(caching, "beginner"))).toEqual(["a", "b", "c"]);
  expect(ids(deriveQuiz(eviction, "beginner"))).toEqual(["b", "c"]);
  expect(ids(deriveQuiz(caching, "staff"))).toEqual(["d"]);
  expect(deriveQuiz(caching, "intermediate")).toEqual([]);
});

test("practice questions (open, coding) are never in a quiz", () => {
  expect(ids(deriveQuiz(lru, "beginner"))).toEqual(["c"]);
});

test("whole-book scope", () => {
  expect(ids(deriveQuiz([caching, other], "beginner"))).toEqual([
    "a",
    "b",
    "c",
    "n",
  ]);
});

test("shuffles with the given random source and keeps every item", () => {
  const items = [1, 2, 3, 4, 5];
  expect(shuffle(items, () => 0)).toEqual([2, 3, 4, 5, 1]);
  expect(shuffle(items, () => 0.999)).toEqual(items);
  expect(items).toEqual([1, 2, 3, 4, 5]); // input untouched
  expect([...shuffle(items)].sort()).toEqual(items);
});

test("order differs between runs", () => {
  const many = node(
    "big",
    Array.from({ length: 20 }, (_, i) => q(`q${i}`, "beginner")),
  );
  const runs = new Set(
    Array.from({ length: 5 }, () =>
      deriveQuiz(many, "beginner")
        .map((x) => x.id)
        .join(),
    ),
  );
  expect(runs.size).toBeGreaterThan(1);
});

test("gradeNumeric: exact, tolerance, units, separators and bad input", () => {
  const pct = { answer: 90, unit: "%" };
  expect(gradeNumeric("90", pct)).toBe(true);
  expect(gradeNumeric(" 90 % ", pct)).toBe(true);
  expect(gradeNumeric("89.9", pct)).toBe(false);
  const ms = { answer: 6, tolerance: 0.05, unit: "ms" };
  expect(gradeNumeric("6.05", ms)).toBe(true);
  expect(gradeNumeric("5.95 MS", ms)).toBe(true);
  expect(gradeNumeric("6.06", ms)).toBe(false);
  expect(gradeNumeric("0.3", { answer: 0.1 + 0.2 })).toBe(true);
  expect(gradeNumeric("1,000", { answer: 1000 })).toBe(true);
  expect(gradeNumeric("-2", { answer: -2 })).toBe(true);
  expect(gradeNumeric("", pct)).toBeUndefined();
  expect(gradeNumeric("ninety", pct)).toBeUndefined();
  expect(gradeNumeric("%", pct)).toBeUndefined();
});
