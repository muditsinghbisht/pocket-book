// Build-time only: validates the content/ tree and compiles it to runtime data.
// Pure (no fs) so it can be unit tested; the Vite plugin feeds it file contents.
import { parse } from "yaml";
import type { z } from "zod";
import {
  caseStudyFrontmatterSchema,
  caseStudySections,
  cheatsheetFileSchema,
  flashcardsFileSchema,
  lessonFrontmatterSchema,
  nodeFileSchema,
  questionsFileSchema,
  quizzesFileSchema,
  type Question,
  type TopicNode,
} from "./schema.ts";
import { isQuizQuestion, sections } from "./model.ts";

/** Map of path relative to content/ (with "/" separators) to file text. */
export type ContentFiles = Record<string, string>;

const slugRe = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const frontmatterRe = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/;

export function compileContent(files: ContentFiles): {
  domains: TopicNode[];
  errors: string[];
} {
  const errors: string[] = [];
  const err = (file: string, msg: string) =>
    errors.push(`content/${file}: ${msg}`);

  function check<T>(
    file: string,
    schema: z.ZodType<T>,
    data: unknown,
  ): T | undefined {
    const r = schema.safeParse(data);
    if (r.success) return r.data;
    for (const i of r.error.issues)
      err(file, `${i.path.join(".") || "(root)"}: ${i.message}`);
  }

  function yaml<T>(file: string, schema: z.ZodType<T>): T | undefined {
    try {
      return check(file, schema, parse(files[file]));
    } catch (e) {
      err(file, `invalid YAML: ${(e as Error).message}`);
    }
  }

  function frontmatter<T>(
    file: string,
    schema: z.ZodType<T>,
  ): { fm: T; body: string } | undefined {
    const m = frontmatterRe.exec(files[file]);
    if (!m) return void err(file, "missing frontmatter (--- title: ... ---)");
    try {
      const fm = check(file, schema, parse(m[1]));
      if (fm) return { fm, body: files[file].slice(m[0].length) };
    } catch (e) {
      err(file, `invalid frontmatter YAML: ${(e as Error).message}`);
    }
  }

  // Every directory that holds a file (and each ancestor) is a node,
  // except a trailing case-studies/ directory, which belongs to its parent.
  const dirs = new Set<string>();
  for (const file of Object.keys(files)) {
    const parts = file.split("/").slice(0, -1);
    if (parts.at(-1) === "case-studies") parts.pop();
    if (!parts.length) err(file, "files must live inside a topic directory");
    for (let i = 1; i <= parts.length; i++)
      dirs.add(parts.slice(0, i).join("/"));
  }

  // Inline quiz questions are collected here too, for global duplicate-ID checks.
  const questionIds = new Map<string, string>();
  const quizIds = new Map<string, string>();
  const nodeOrder = new Map<string, number | undefined>();
  const byId = new Map<string, Question>();
  let questionsIncomplete = false; // a questions.yaml failed: skip dangling-ref noise
  const pendingQuizzes: {
    file: string;
    node: TopicNode;
    raw: z.infer<typeof quizzesFileSchema>;
  }[] = [];

  function claim(
    ids: Map<string, string>,
    kind: string,
    id: string,
    file: string,
  ) {
    const prev = ids.get(id);
    if (prev)
      err(file, `duplicate ${kind} id "${id}" (also in content/${prev})`);
    else ids.set(id, file);
  }

  function build(dir: string): TopicNode {
    const id = dir.split("/").pop()!;
    if (!slugRe.test(id))
      err(dir, "directory name must be a lowercase slug (a-z, 0-9, -)");
    if ((sections as readonly string[]).includes(id))
      err(dir, `"${id}" is a reserved section name, not a valid node id`);
    if (!(`${dir}/node.yaml` in files)) err(dir, "missing node.yaml");
    const meta =
      `${dir}/node.yaml` in files
        ? yaml(`${dir}/node.yaml`, nodeFileSchema)
        : undefined;

    nodeOrder.set(dir, meta?.order);
    const node: TopicNode = {
      id,
      path: dir,
      title: meta?.title ?? id,
      ...(meta?.summary && { summary: meta.summary }),
      lessons: [],
      caseStudies: [],
      questions: [],
      flashcards: [],
      quizzes: [],
      children: [],
    };
    const order = new Map<string, number | undefined>(); // by file

    for (const file of Object.keys(files)) {
      const parent = file.slice(0, file.lastIndexOf("/"));
      if (parent === `${dir}/case-studies`) {
        const csId = file.slice(parent.length + 1).replace(/\.mdx?$/, "");
        if (!/\.mdx?$/.test(file) || !slugRe.test(csId)) {
          err(file, "case studies must be <lowercase-slug>.md or .mdx");
          continue;
        }
        const r = frontmatter(file, caseStudyFrontmatterSchema);
        if (!r) continue;
        // Template order is enforced on the h2 headings (code fences ignored).
        const h2 = [
          ...r.body
            .replace(/^```[\s\S]*?^```/gm, "")
            .matchAll(/^## +(.+?)\s*$/gm),
        ].map((m) => m[1]);
        if (h2.join("|") !== caseStudySections.join("|"))
          err(
            file,
            `h2 headings must be exactly: ${caseStudySections.join(", ")} (found: ${h2.join(", ") || "none"}). Sources go in frontmatter.`,
          );
        const { order: o, ...fm } = r.fm;
        order.set(file, o);
        node.caseStudies.push({ id: csId, file, ...fm });
        continue;
      }
      if (parent !== dir) continue;
      const name = file.slice(dir.length + 1);
      if (name === "node.yaml") continue;
      else if (name === "questions.yaml") {
        const data = yaml(file, questionsFileSchema);
        if (!data) questionsIncomplete = true;
        for (const q of data?.questions ?? []) {
          claim(questionIds, "question", q.id, file);
          byId.set(q.id, q);
        }
        node.questions = data?.questions ?? [];
      } else if (name === "flashcards.yaml")
        node.flashcards = yaml(file, flashcardsFileSchema)?.cards ?? [];
      else if (name === "cheatsheet.yaml")
        node.cheatsheet = yaml(file, cheatsheetFileSchema);
      else if (name === "quizzes.yaml") {
        const raw = yaml(file, quizzesFileSchema);
        if (!raw) continue;
        for (const quiz of raw.quizzes) {
          claim(quizIds, "quiz", quiz.id, file);
          for (const q of quiz.questions)
            if (typeof q !== "string")
              claim(questionIds, "question", q.id, file);
        }
        pendingQuizzes.push({ file, node, raw });
      } else if (/\.mdx?$/.test(name)) {
        const lessonId = name.replace(/\.mdx?$/, "");
        if (!slugRe.test(lessonId))
          err(file, "lesson file name must be a lowercase slug");
        if (node.lessons.some((l) => l.id === lessonId))
          err(file, `duplicate lesson id "${lessonId}"`);
        const fm = frontmatter(file, lessonFrontmatterSchema)?.fm;
        if (!fm) continue;
        order.set(file, fm.order);
        node.lessons.push({ id: lessonId, title: fm.title, file });
      } else
        err(
          file,
          "unknown content file (expected node.yaml, questions.yaml, flashcards.yaml, quizzes.yaml, cheatsheet.yaml, *.md, *.mdx or case-studies/*.md(x))",
        );
    }

    const sort = (a: { id: string; file: string }, b: typeof a) =>
      byOrder(order.get(a.file), a.id, order.get(b.file), b.id);
    node.lessons.sort(sort);
    node.caseStudies.sort(sort);
    node.children = childrenOf(dir);
    return node;
  }

  function childrenOf(dir: string): TopicNode[] {
    const prefix = dir ? `${dir}/` : "";
    return [...dirs]
      .filter(
        (d) => d.startsWith(prefix) && !d.slice(prefix.length).includes("/"),
      )
      .map(build)
      .sort((a, b) =>
        byOrder(nodeOrder.get(a.path), a.id, nodeOrder.get(b.path), b.id),
      );
  }

  const domains = childrenOf("");

  // Resolve quiz question references once every question id is known.
  for (const { file, node, raw } of pendingQuizzes) {
    node.quizzes = raw.quizzes.map((quiz, qi) => ({
      id: quiz.id,
      title: quiz.title,
      questions: quiz.questions.flatMap((q, i) => {
        if (typeof q !== "string") return [q];
        const found = byId.get(q);
        const at = `quizzes.${qi}.questions.${i}`;
        if (!found) {
          if (!questionsIncomplete)
            err(file, `${at}: unknown question id "${q}"`);
          return [];
        }
        if (isQuizQuestion(found)) return [found];
        err(
          file,
          `${at}: "${q}" is a ${found.type} (practice) question; quizzes take mcq, numeric or free`,
        );
        return [];
      }),
    }));
  }

  return { domains, errors };
}

function byOrder(
  ao: number | undefined,
  a: string,
  bo: number | undefined,
  b: string,
) {
  return (ao ?? Infinity) - (bo ?? Infinity) || a.localeCompare(b);
}
