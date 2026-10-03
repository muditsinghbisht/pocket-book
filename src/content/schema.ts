// Source of truth for the content format. See .claude/requirements.md ("Content format").
import { z } from "zod";
import { levels } from "./model.ts";

const slug = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "must be a lowercase slug (a-z, 0-9, -)");
const text = z.string().trim().min(1);
const https = z.url({ protocol: /^https$/ });

const common = { id: slug, level: z.enum(levels), q: text, explain: text };
const hints = z.array(text).min(2).max(3);
const solutions = z
  .array(z.strictObject({ title: text, java: text, cpp: text }))
  .min(1);

const mcq = z
  .strictObject({
    ...common,
    type: z.literal("mcq"),
    options: z.array(text).min(2),
    answer: z.int().min(0),
    hints: hints.optional(),
  })
  .refine((x) => x.answer < x.options.length, {
    message: "answer is not a valid index into options",
    path: ["answer"],
  });
const numeric = z.strictObject({
  ...common,
  type: z.literal("numeric"),
  answer: z.number(),
  /** Absolute tolerance: |input - answer| <= tolerance counts as correct. */
  tolerance: z.number().min(0).optional(),
  unit: text.optional(),
  hints: hints.optional(),
});
/** Ungraded: the model `answer` and `explain` are shown on reveal. */
const free = z.strictObject({
  ...common,
  type: z.literal("free"),
  answer: text,
  hints: hints.optional(),
});
const open = z.strictObject({
  ...common,
  type: z.literal("open"),
  hints,
  solutions: solutions.optional(),
  link: https.optional(),
});
const coding = z.strictObject({
  ...common,
  type: z.literal("coding"),
  hints,
  solutions,
  link: https,
});

export const quizQuestionSchema = z.discriminatedUnion("type", [
  mcq,
  numeric,
  free,
]);
export const questionSchema = z.discriminatedUnion("type", [
  mcq,
  numeric,
  free,
  open,
  coding,
]);

export const questionsFileSchema = z.strictObject({
  questions: z.array(questionSchema),
});

export const flashcardsFileSchema = z.strictObject({
  cards: z.array(z.strictObject({ front: text, back: text })).min(1),
});

export const quizzesFileSchema = z.strictObject({
  quizzes: z.array(
    z.strictObject({
      id: slug,
      title: text,
      questions: z.array(z.union([slug, quizQuestionSchema])).min(1),
    }),
  ),
});

export const cheatsheetFileSchema = z.strictObject({
  sections: z
    .array(z.strictObject({ heading: text, items: z.array(text).min(1) }))
    .min(1),
});

export const nodeFileSchema = z.strictObject({
  title: text,
  summary: text.optional(),
  order: z.number().optional(),
});

export const lessonFrontmatterSchema = z.strictObject({
  title: text,
  order: z.number().optional(),
});

export const sourceTypes = ["paper", "blog", "talk", "youtube"] as const;

export const caseStudyFrontmatterSchema = z.strictObject({
  title: text,
  summary: text.optional(),
  order: z.number().optional(),
  sources: z
    .array(
      z.strictObject({
        type: z.enum(sourceTypes),
        title: text,
        url: https,
        gist: text,
        /** false = the gist could not be checked against the source; the UI marks it. */
        verified: z.boolean(),
      }),
    )
    .min(1),
});

/** The h2 headings a case study body must have, exactly and in this order. Sources come from frontmatter. */
export const caseStudySections = [
  "Context",
  "What happened",
  "Root cause",
  "Fix",
  "Lessons",
] as const;

export type Question = z.infer<typeof questionSchema>;
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;
export type PracticeQuestion = Exclude<Question, QuizQuestion>;
export type Flashcard = z.infer<typeof flashcardsFileSchema>["cards"][number];
export type Cheatsheet = z.infer<typeof cheatsheetFileSchema>;
export type Source = z.infer<
  typeof caseStudyFrontmatterSchema
>["sources"][number];

/** `file` is the path under content/; its compiled MDX module is `modules[file]` in `virtual:content`. */
export type Lesson = { id: string; title: string; file: string };
export type CaseStudy = Lesson & { summary?: string; sources: Source[] };
export type Quiz = { id: string; title: string; questions: QuizQuestion[] };

/** One node of the topic tree: Domain -> Topic -> Subtopic, unlimited depth. */
export type TopicNode = {
  id: string;
  /** Node id path from the domain down, e.g. "caching/eviction/lru". */
  path: string;
  title: string;
  summary?: string;
  lessons: Lesson[];
  caseStudies: CaseStudy[];
  /** All questions, quiz and practice types; split with `isQuizQuestion`. */
  questions: Question[];
  flashcards: Flashcard[];
  cheatsheet?: Cheatsheet;
  quizzes: Quiz[];
  children: TopicNode[];
};
