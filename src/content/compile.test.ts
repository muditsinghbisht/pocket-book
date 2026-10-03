import { describe, expect, test } from "vitest";
import { compileContent } from "./compile.ts";
import { questionSchema } from "./schema.ts";

const mcq = `
  - id: q-mcq
    level: beginner
    type: mcq
    q: Pick one
    options: [a, b]
    answer: 1
    explain: because
    hints: [h1, h2]`;

const base = {
  "caching/node.yaml": "title: Caching\n",
  "caching/questions.yaml": `questions:${mcq}`,
  "caching/eviction/node.yaml": "title: Eviction\norder: 1\n",
  "caching/eviction/questions.yaml": `questions:
  - id: q-code
    level: advanced
    type: coding
    q: Build it
    explain: like so
    hints: [h1, h2, h3]
    link: https://leetcode.com
    solutions:
      - { title: One, java: "class A {}", cpp: "struct A {};" }
  - id: q-open
    level: beginner
    type: open
    q: Explain it
    explain: like so
    hints: [h1, h2]
  - id: q-num
    level: beginner
    type: numeric
    q: How many?
    answer: 90
    tolerance: 0.5
    unit: "%"
    explain: 900 / 1000`,
  "caching/intro.md": "---\ntitle: Intro\n---\n# Hello\n",
  "caching/flashcards.yaml": "cards:\n  - { front: f, back: b }\n",
  "caching/cheatsheet.yaml": "sections:\n  - { heading: H, items: [x] }\n",
  "caching/quizzes.yaml": `quizzes:
  - id: basics
    title: Basics
    questions:
      - q-mcq
      - id: q-inline
        level: staff
        type: free
        q: Why?
        answer: model answer
        explain: because`,
};

const errorsFor = (overrides: Record<string, string>) =>
  compileContent({ ...base, ...overrides }).errors;

describe("compileContent", () => {
  test("compiles a valid nested tree", () => {
    const { domains, errors } = compileContent(base);
    expect(errors).toEqual([]);
    const [caching] = domains;
    expect(caching.path).toBe("caching");
    expect(caching.lessons).toEqual([
      { id: "intro", title: "Intro", file: "caching/intro.md" },
    ]);
    expect(caching.children[0].path).toBe("caching/eviction");
    expect(caching.quizzes[0].questions.map((q) => q.id)).toEqual([
      "q-mcq",
      "q-inline",
    ]);
    // Several practice (and quiz) questions per node, in file order.
    expect(caching.children[0].questions.map((q) => q.id)).toEqual([
      "q-code",
      "q-open",
      "q-num",
    ]);
    expect(caching.flashcards).toHaveLength(1);
    expect(caching.cheatsheet?.sections[0].heading).toBe("H");
  });

  test("reports file and field for an out-of-range mcq answer", () => {
    const errors = errorsFor({
      "caching/questions.yaml": `questions:${mcq.replace("answer: 1", "answer: 2")}`,
    });
    expect(errors).toEqual([
      "content/caching/questions.yaml: questions.0.answer: answer is not a valid index into options",
    ]);
  });

  test("coding questions require a link", () => {
    const errors = errorsFor({
      "caching/eviction/questions.yaml": base[
        "caching/eviction/questions.yaml"
      ].replace("    link: https://leetcode.com\n", ""),
    });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(
      /^content\/caching\/eviction\/questions.yaml: questions.0.link: /,
    );
  });

  test("duplicate question ids across files, including inline quiz questions", () => {
    const errors = errorsFor({
      "caching/eviction/questions.yaml": `questions:${mcq}`,
    });
    expect(
      errors.some((e) => e.includes('duplicate question id "q-mcq"')),
    ).toBe(true);
    expect(errors).toHaveLength(1);
  });

  test("duplicate question ids within one file", () => {
    expect(
      errorsFor({ "caching/questions.yaml": `questions:${mcq}${mcq}` }),
    ).toEqual([
      'content/caching/questions.yaml: duplicate question id "q-mcq" (also in content/caching/questions.yaml)',
    ]);
  });

  test("quizzes cannot use practice questions", () => {
    const errors = errorsFor({
      "caching/quizzes.yaml":
        "quizzes:\n  - { id: x, title: X, questions: [q-code] }\n",
    });
    expect(errors).toEqual([
      'content/caching/quizzes.yaml: quizzes.0.questions.0: "q-code" is a coding (practice) question; quizzes take mcq, numeric or free',
    ]);
    expect(
      errorsFor({
        "caching/quizzes.yaml": `quizzes:
  - id: x
    title: X
    questions:
      - { id: q-x, level: beginner, type: open, q: Q, explain: E, hints: [a, b] }`,
      }),
    ).toHaveLength(1);
  });

  test("dangling quiz question id", () => {
    const errors = errorsFor({
      "caching/quizzes.yaml":
        "quizzes:\n  - { id: x, title: X, questions: [nope] }\n",
    });
    expect(errors).toEqual([
      'content/caching/quizzes.yaml: quizzes.0.questions.0: unknown question id "nope"',
    ]);
  });

  test("structural errors", () => {
    expect(errorsFor({ "caching/extra/notes.txt": "x" })).toEqual([
      "content/caching/extra: missing node.yaml",
      expect.stringContaining(
        "content/caching/extra/notes.txt: unknown content file",
      ),
    ]);
    expect(errorsFor({ "caching/bad.md": "# no frontmatter" })).toEqual([
      "content/caching/bad.md: missing frontmatter (--- title: ... ---)",
    ]);
    expect(errorsFor({ "caching/node.yaml": "title: [" })[0]).toMatch(
      /^content\/caching\/node.yaml: invalid YAML/,
    );
    expect(
      errorsFor({ "caching/node.yaml": "title: T\ntypo: 1\n" })[0],
    ).toMatch(/^content\/caching\/node.yaml: \(root\): Unrecognized key/);
    expect(errorsFor({ "caching/notes/node.yaml": "title: N\n" })).toEqual([
      'content/caching/notes: "notes" is a reserved section name, not a valid node id',
    ]);
  });
});

describe("case studies", () => {
  const source = (over = "") => `
  - type: paper
    title: A paper
    url: https://example.com/paper
    gist: What it says.
    verified: true${over}`;
  const body =
    "## Context\nc\n\n## What happened\nw\n\n```md\n## not a heading\n```\n\n## Root cause\nr\n\n### Detail\nd\n\n## Fix\nf\n\n## Lessons\nl\n";
  const cs = (sources = source(), text = body) =>
    `---\ntitle: Outage\nsources:${sources}\n---\n${text}`;
  const withCase = (file: string) =>
    compileContent({ ...base, "caching/case-studies/outage.md": file });

  test("compiles into the parent node, not a child node", () => {
    const { domains, errors } = withCase(
      cs(source() + source("\n").replace("true", "false")),
    );
    expect(errors).toEqual([]);
    expect(domains[0].children.map((c) => c.id)).toEqual(["eviction"]);
    expect(domains[0].caseStudies).toEqual([
      {
        id: "outage",
        title: "Outage",
        file: "caching/case-studies/outage.md",
        sources: [
          expect.objectContaining({ type: "paper", verified: true }),
          expect.objectContaining({ verified: false }),
        ],
      },
    ]);
  });

  test("sources must be https, typed and carry a verified flag", () => {
    expect(withCase(cs(source().replace("https:", "http:"))).errors).toEqual([
      expect.stringMatching(
        /^content\/caching\/case-studies\/outage.md: sources.0.url: /,
      ),
    ]);
    expect(withCase(cs(source().replace("paper", "podcast"))).errors).toEqual([
      expect.stringContaining("sources.0.type: "),
    ]);
    expect(
      withCase(cs(source().replace("    verified: true", ""))).errors,
    ).toEqual([expect.stringContaining("sources.0.verified: ")]);
    expect(withCase(cs(" []")).errors).toEqual([
      expect.stringContaining("sources: "),
    ]);
  });

  test("template headings are required, in order", () => {
    const swapped = body
      .replace("## Fix", "## X")
      .replace("## Lessons", "## Fix");
    expect(withCase(cs(source(), swapped)).errors).toEqual([
      expect.stringContaining(
        "h2 headings must be exactly: Context, What happened, Root cause, Fix, Lessons (found: Context, What happened, Root cause, X, Fix)",
      ),
    ]);
    expect(
      withCase(cs(source(), body + "\n## Sources\nx\n")).errors,
    ).toHaveLength(1);
  });

  test("only slug-named Markdown files", () => {
    expect(
      compileContent({ ...base, "caching/case-studies/x.yaml": "a: 1" }).errors,
    ).toEqual([
      "content/caching/case-studies/x.yaml: case studies must be <lowercase-slug>.md or .mdx",
    ]);
  });
});

describe("questionSchema", () => {
  const q = {
    id: "a-b",
    level: "beginner",
    type: "open",
    q: "Q",
    explain: "E",
    hints: ["1", "2"],
  };
  test.each([
    ["valid open question", q, true],
    ["one hint", { ...q, hints: ["1"] }, false],
    ["four hints", { ...q, hints: ["1", "2", "3", "4"] }, false],
    ["unknown level", { ...q, level: "expert" }, false],
    ["non-slug id", { ...q, id: "A B" }, false],
    ["http link", { ...q, link: "http://example.com" }, false],
    ["mcq without options", { ...q, type: "mcq", answer: 0 }, false],
    [
      "coding without solutions",
      { ...q, type: "coding", link: "https://leetcode.com" },
      false,
    ],
    ["open without hints", { ...q, hints: undefined }, false],
    [
      "mcq without hints",
      { ...q, type: "mcq", options: ["a", "b"], answer: 1, hints: undefined },
      true,
    ],
    [
      "numeric with tolerance and unit",
      { ...q, type: "numeric", answer: 1.5, tolerance: 0.1, unit: "ms" },
      true,
    ],
    ["numeric with text answer", { ...q, type: "numeric", answer: "1" }, false],
    [
      "numeric with negative tolerance",
      { ...q, type: "numeric", answer: 1, tolerance: -1 },
      false,
    ],
    ["free with model answer", { ...q, type: "free", answer: "A" }, true],
    ["free without answer", { ...q, type: "free" }, false],
    [
      "free with solutions",
      {
        ...q,
        type: "free",
        answer: "A",
        solutions: [{ title: "t", java: "j", cpp: "c" }],
      },
      false,
    ],
  ])("%s", (_name, input, ok) => {
    expect(questionSchema.safeParse(input).success).toBe(ok);
  });
});
