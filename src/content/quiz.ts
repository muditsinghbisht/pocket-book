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
