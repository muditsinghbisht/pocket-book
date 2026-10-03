// Runtime constants of the content model. Kept free of zod so the app bundle
// stays small; the build-time schemas live in schema.ts.
import type { Question, QuizQuestion } from "./schema.ts";

export const levels = [
  "beginner",
  "intermediate",
  "advanced",
  "staff",
] as const;

/** The views every node has. Also reserved: no node directory may use these names. */
export const sections = [
  "lessons",
  "case-studies",
  "practice",
  "quizzes",
  "flashcards",
  "cheatsheet",
  "notes",
] as const;

/** Question types that quizzes play. The rest (open, coding) are practice questions. */
export const quizTypes = ["mcq", "numeric", "free"] as const;

export type Level = (typeof levels)[number];
export type Section = (typeof sections)[number];

export const isQuizQuestion = (q: Question): q is QuizQuestion =>
  (quizTypes as readonly string[]).includes(q.type);
