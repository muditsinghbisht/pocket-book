// Node and section views. The quiz player lives in Quiz.tsx; flashcards and notes live in Flashcards.tsx and Notes.tsx.
import type { CSSProperties, ReactNode } from "react";
import { isQuizQuestion, type Level, type Section } from "./content/model.ts";
import type { PracticeQuestion, TopicNode } from "./content/schema.ts";
import { Flashcards } from "./Flashcards.tsx";
import { Mdx } from "./Mdx.tsx";
import { Quiz } from "./Quiz.tsx";
import { Notes } from "./Notes.tsx";
import { notFoundArt } from "./not-found-art.ts";
import { link } from "./route.ts";

export const labels: Record<Section, [long: string, short: string]> = {
  lessons: ["Lessons", "Lessons"],
  "case-studies": ["Case studies", "Cases"],
  practice: ["Practice", "Practice"],
  quizzes: ["Quizzes", "Quiz"],
  flashcards: ["Flashcards", "Cards"],
  cheatsheet: ["Cheat-sheet", "Cheat"],
  notes: ["Notes", "Notes"],
};

/** Sets --tone (badge, accent and text-tone color) to a section's or level's accent. */
export const tone = (key: Section | Level) =>
  ({ "--tone": `var(--c-${key})` }) as CSSProperties;

const LevelBadge = ({ level }: { level: Level }) => (
  <span className="badge capitalize" style={tone(level)}>
    {level}
  </span>
);

/** Small colored label above a page title. The title itself is the document's own H1. */
const Eyebrow = ({
  section,
  children,
}: {
  section: Section;
  children: ReactNode;
}) => (
  <p
    className="text-sm font-semibold tracking-wide text-tone uppercase"
    style={tone(section)}
  >
    {children}
  </p>
);

const practiceOf = (n: TopicNode) =>
  n.questions.filter((q): q is PracticeQuestion => !isQuizQuestion(q));

const row =
  "card flex min-h-12 items-center justify-between gap-3 px-4 py-3 focus-visible:outline-2";

const Chevron = () => (
  <svg
    viewBox="0 0 20 20"
    className="size-4 shrink-0 text-muted"
    aria-hidden="true"
  >
    <path
      d="m7.5 5 5 5-5 5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

function Empty({ children = "Nothing here yet." }: { children?: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-muted">
      {children}
    </p>
  );
}

function Links({ items }: { items: { href: string; label: ReactNode }[] }) {
  if (!items.length) return <Empty />;
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.href}>
          <a className={row} href={i.href}>
            {i.label}
            <Chevron />
          </a>
        </li>
      ))}
    </ul>
  );
}

export function Home({ domains }: { domains: TopicNode[] }) {
  return (
    <>
      <section className="mb-8 pt-2 sm:pt-6">
        <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
          A book of software engineering
        </h1>
        <p className="mt-3 max-w-prose text-lg text-muted">
          Lessons, case studies, practice questions, quizzes, flashcards and
          cheat-sheets, all in your browser. No account, nothing tracked.
        </p>
      </section>
      <h2 className="mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
        Domains
      </h2>
      <Links
        items={domains.map((d) => ({
          href: link({ path: d.path }),
          label: (
            <span>
              <span className="text-lg font-semibold">{d.title}</span>
              {d.summary && (
                <span className="mt-0.5 block text-sm text-muted">
                  {d.summary}
                </span>
              )}
            </span>
          ),
        }))}
      />
    </>
  );
}

const button =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-6 font-semibold focus-visible:outline-2";

/** `path` is shown as text (React escapes it); `closest` is a valid route above it. */
export function NotFound({
  path,
  closest,
}: {
  path: string;
  closest?: { href: string; label: string };
}) {
  return (
    <section className="mx-auto flex max-w-md flex-col items-center py-6 text-center sm:py-12">
      <div
        className="w-56 sm:w-64"
        dangerouslySetInnerHTML={{ __html: notFoundArt }}
      />
      <p className="mt-6 text-sm font-semibold tracking-wide text-primary uppercase">
        Error 404
      </p>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance">
        This page fell out of the book
      </h1>
      <p className="mt-3 text-muted">
        We checked every chapter, but{" "}
        <code className="rounded border border-line bg-subtle px-1.5 py-px font-mono text-[0.85em] break-all text-fg">
          {path}
        </code>{" "}
        is not in PocketBook.
      </p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <a
          className={`${button} bg-primary text-primary-fg hover:opacity-90`}
          href={link({ path: "" })}
        >
          Back to home
        </a>
        {closest && (
          <a
            className={`${button} border border-line bg-surface hover:bg-subtle`}
            href={closest.href}
          >
            {closest.label}
          </a>
        )}
      </div>
    </section>
  );
}

export function NodeOverview({ node }: { node: TopicNode }) {
  const counts: Partial<Record<Section, number>> = {
    lessons: node.lessons.length,
    "case-studies": node.caseStudies.length,
    practice: practiceOf(node).length,
    quizzes: node.quizzes.length,
    flashcards: node.flashcards.length,
    cheatsheet: node.cheatsheet ? 1 : 0,
  };
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight text-balance sm:text-4xl">
        {node.title}
      </h1>
      {node.summary && (
        <p className="mt-3 max-w-prose text-lg text-muted">{node.summary}</p>
      )}
      {node.children.length > 0 && (
        <>
          <h2 className={h2}>Topics</h2>
          <Links
            items={node.children.map((c) => ({
              href: link({ path: c.path }),
              label: c.title,
            }))}
          />
        </>
      )}
      <h2 className={h2}>In this section</h2>
      <ul className="grid gap-2 sm:grid-cols-2">
        {(Object.keys(labels) as Section[])
          .filter((s) => counts[s] !== 0)
          .map((s) => (
            <li key={s} style={tone(s)}>
              <a
                className={`${row} border-l-4 border-l-tone`}
                href={link({ path: node.path, section: s })}
              >
                <span className="font-medium">{labels[s][0]}</span>
                {counts[s] !== undefined && (
                  <span className="badge ml-auto">{counts[s]}</span>
                )}
                <Chevron />
              </a>
            </li>
          ))}
      </ul>
    </>
  );
}

const h2 = "mt-8 mb-3 text-sm font-semibold tracking-wide text-muted uppercase";

/** Tap to reveal; hidden by default. `accent` colors the label (hint, solution). */
const Reveal = ({
  label,
  accent = "",
  children,
}: {
  label: string;
  accent?: string;
  children: ReactNode;
}) => (
  <details className="group rounded-lg border border-line bg-surface open:bg-subtle/50">
    <summary
      className={`flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-4 font-medium select-none hover:bg-subtle focus-visible:outline-2 [&::-webkit-details-marker]:hidden ${accent}`}
    >
      <span className="transition-transform group-open:rotate-90">
        <Chevron />
      </span>
      {label}
    </summary>
    <div className="min-w-0 px-4 pb-4">{children}</div>
  </details>
);

const Code = ({ lang, code }: { lang: string; code: string }) => (
  <>
    <p className="mt-3 text-xs font-semibold tracking-wide text-muted uppercase">
      {lang}
    </p>
    <pre className="code-block mt-1">
      <code>{code}</code>
    </pre>
  </>
);

function Practice({ q }: { q: PracticeQuestion }) {
  return (
    <li id={q.id} className="card space-y-3 p-4 sm:p-5">
      <p className="flex flex-wrap gap-2">
        <LevelBadge level={q.level} />
        <span className="badge capitalize" style={tone("practice")}>
          {q.type}
        </span>
      </p>
      <p className="text-lg leading-snug font-medium">{q.q}</p>
      {q.link && (
        <a
          className="inline-flex min-h-11 items-center rounded-lg border border-line px-4 font-medium text-primary hover:bg-subtle focus-visible:outline-2"
          href={q.link}
          target="_blank"
          rel="noreferrer"
        >
          Practice on {new URL(q.link).hostname}
        </a>
      )}
      {q.hints.map((h, i) => (
        <Reveal key={i} label={`Hint ${i + 1}`} accent="text-warn">
          {h}
        </Reveal>
      ))}
      <Reveal label="Explanation">{q.explain}</Reveal>
      {q.solutions?.map((s) => (
        <Reveal
          key={s.title}
          label={`Solution: ${s.title}`}
          accent="text-success"
        >
          <Code lang="Java" code={s.java} />
          <Code lang="C++" code={s.cpp} />
        </Reveal>
      ))}
    </li>
  );
}

const sourceTypeLabel = {
  paper: "Paper",
  blog: "Blog",
  talk: "Talk",
  youtube: "YouTube",
};

export function SectionView({
  node,
  section,
  item,
}: {
  node: TopicNode;
  section: Section;
  item?: string;
}) {
  const at = (s: Section, i?: string) =>
    link({ path: node.path, section: s, item: i });
  const title = (
    <header className="mb-6">
      <Eyebrow section={section}>{labels[section][0]}</Eyebrow>
      <h1 className="mt-1 text-3xl font-bold tracking-tight text-balance">
        {node.title}
      </h1>
    </header>
  );

  switch (section) {
    case "lessons": {
      // An unknown item never gets here: App resolves it to NotFound.
      const i = node.lessons.findIndex((l) => l.id === item);
      if (i < 0)
        return (
          <>
            {title}
            <Links
              items={node.lessons.map((l) => ({
                href: at("lessons", l.id),
                label: l.title,
              }))}
            />
          </>
        );
      const prev = node.lessons[i - 1];
      const next = node.lessons[i + 1];
      return (
        <article>
          <Eyebrow section="lessons">
            Lesson {i + 1} of {node.lessons.length}
          </Eyebrow>
          <Mdx file={node.lessons[i].file} />
          <nav className="mt-8 flex justify-between gap-3">
            {prev ? (
              <a className={row} href={at("lessons", prev.id)}>
                ← {prev.title}
              </a>
            ) : (
              <span />
            )}
            {next && (
              <a className={row} href={at("lessons", next.id)}>
                {next.title} →
              </a>
            )}
          </nav>
        </article>
      );
    }
    case "case-studies": {
      const cs = node.caseStudies.find((c) => c.id === item);
      if (!cs)
        return (
          <>
            {title}
            <Links
              items={node.caseStudies.map((c) => ({
                href: at("case-studies", c.id),
                label: c.title,
              }))}
            />
          </>
        );
      return (
        <article>
          <Eyebrow section="case-studies">Case study</Eyebrow>
          <Mdx file={cs.file} />
          <h2 className="mt-12 mb-4 border-b border-line pb-2 text-2xl font-semibold tracking-tight">
            Sources
          </h2>
          <ul className="space-y-3">
            {cs.sources.map((s) => (
              <li key={s.url} className="card p-4">
                <p className="mb-2 flex flex-wrap gap-2">
                  <span className="badge">{sourceTypeLabel[s.type]}</span>
                  {!s.verified && (
                    <span className="badge-warn">Gist unverified</span>
                  )}
                </p>
                <a
                  className="font-medium break-words text-primary underline decoration-primary/40 underline-offset-2 hover:decoration-primary"
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {s.title}
                </a>
                <p className="mt-1 text-muted">{s.gist}</p>
              </li>
            ))}
          </ul>
        </article>
      );
    }
    case "practice": {
      const qs = practiceOf(node);
      return (
        <>
          {title}
          {qs.length ? (
            <ul className="space-y-4">
              {qs.map((q) => (
                <Practice key={q.id} q={q} />
              ))}
            </ul>
          ) : (
            <Empty />
          )}
        </>
      );
    }
    case "quizzes":
      return (
        <>
          {title}
          <Quiz key={node.path} node={node} />
        </>
      );
    case "flashcards":
      return (
        <>
          {title}
          <Flashcards node={node} />
        </>
      );
    case "cheatsheet":
      return (
        <>
          {title}
          {node.cheatsheet ? (
            node.cheatsheet.sections.map((s) => (
              <section
                key={s.heading}
                style={tone("cheatsheet")}
                className="card mb-4 p-4 break-inside-avoid sm:p-5"
              >
                <h2 className="mb-2 text-lg font-semibold text-tone">
                  {s.heading}
                </h2>
                <ul className="list-disc space-y-1.5 pl-5 marker:text-muted">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </section>
            ))
          ) : (
            <Empty />
          )}
        </>
      );
    case "notes":
      return (
        <>
          {title}
          <Notes node={node} />
        </>
      );
  }
}
