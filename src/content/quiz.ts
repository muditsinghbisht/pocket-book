import { isQuizQuestion, type Level } from "./model.ts";
import type { QuizQuestion, TopicNode } from "./schema.ts";

/** Fisher-Yates; returns a new array. */
export function shuffle<T>(items: T[], random = Math.random): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Quiz questions (mcq, numeric, free) for a scope (a node and all its
 * descendants; pass the domain list for the whole book) at exactly the chosen
 * level, freshly shuffled. Practice questions (open, coding) are never included.
 */
export function deriveQuiz(
  scope: TopicNode | TopicNode[],
  level: Level,
  random = Math.random,
): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  const walk = (n: TopicNode) => {
    out.push(
      ...n.questions.filter(isQuizQuestion).filter((q) => q.level === level),
    );
    n.children.forEach(walk);
  };
  (Array.isArray(scope) ? scope : [scope]).forEach(walk);
  return shuffle(out, random);
}

/**
 * Grades a typed numeric answer: correct when |input - answer| <= tolerance
 * (default 0, plus a tiny epsilon for float noise). Accepts thousands
 * separators and a trailing unit ("1,000", "90%", "6 ms"). Returns undefined
 * when the input is not a number.
 */
export function gradeNumeric(
  input: string,
  q: { answer: number; tolerance?: number; unit?: string },
): boolean | undefined {
  let s = input.trim();
  if (q.unit && s.toLowerCase().endsWith(q.unit.toLowerCase()))
    s = s.slice(0, -q.unit.length);
  s = s.replace(/[\s,_]/g, "");
  const x = s ? Number(s) : NaN;
  if (!Number.isFinite(x)) return undefined;
  const eps = 1e-9 * Math.max(1, Math.abs(q.answer));
  return Math.abs(x - q.answer) <= (q.tolerance ?? 0) + eps;
}
