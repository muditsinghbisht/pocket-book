// Interactive quiz player. Nothing is stored: a run lives in component state
// only and is gone when the view changes (no score history, by design).
import { useEffect, useRef, useState, type CSSProperties } from "react";
import domains from "virtual:content";
import { levels, type Level } from "./content/model.ts";
import { deriveQuiz, gradeNumeric, shuffle } from "./content/quiz.ts";
import type { QuizQuestion, TopicNode } from "./content/schema.ts";

/** A quiz to play: `make` returns a freshly shuffled question list for each run. */
type Source = { title: string; make: () => QuizQuestion[] };
/** true or false for graded answers, null for ungraded free answers. */
type Result = boolean | null;

const tone = (key: string) =>
  ({ "--tone": `var(--c-${key})` }) as CSSProperties;
const btn =
  "inline-flex min-h-12 items-center justify-center rounded-xl px-6 font-semibold focus-visible:outline-2";
const primary = `${btn} bg-primary text-primary-fg hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50`;
const secondary = `${btn} border border-line bg-surface hover:bg-subtle`;
const h2 = "mb-3 text-sm font-semibold tracking-wide text-muted uppercase";
const choice =
  "card flex min-h-12 cursor-pointer items-center gap-3 px-4 py-3 has-checked:border-tone has-checked:bg-subtle has-focus-visible:outline-2";

export function Quiz({ node }: { node: TopicNode }) {
  const [scope, setScope] = useState<"node" | "book">("node");
  const [level, setLevel] = useState<Level>("beginner");
  const [source, setSource] = useState<Source>();

  if (source)
    return <Player source={source} onExit={() => setSource(undefined)} />;

  const target = scope === "node" ? node : domains;
  const count = (l: Level) => deriveQuiz(target, l).length;
  const scopes = [
    ["node", `${node.title} and its subtopics`],
    ["book", "Whole book"],
  ] as const;

  return (
    <>
      <fieldset className="mb-6">
        <legend className={h2}>Scope</legend>
        <div className="grid gap-2 sm:grid-cols-2" style={tone("quizzes")}>
          {scopes.map(([value, label]) => (
            <label key={value} className={choice}>
              <input
                type="radio"
                name="quiz-scope"
                className="size-5 shrink-0 accent-primary"
                checked={scope === value}
                onChange={() => setScope(value)}
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <fieldset className="mb-6">
        <legend className={h2}>Level</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {levels.map((l) => (
            <label
              key={l}
              style={tone(l)}
              className={`${choice} border-t-4 border-t-tone`}
            >
              <input
                type="radio"
                name="quiz-level"
                className="size-5 shrink-0 accent-primary"
                checked={level === l}
                onChange={() => setLevel(l)}
              />
              <span>
                <span className="block font-semibold text-tone capitalize">
                  {l}
                </span>
                <span className="text-sm text-muted tabular-nums">
                  {count(l)} questions
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      {count(level) ? (
        <button
          type="button"
          className={`${primary} w-full sm:w-auto`}
          onClick={() =>
            setSource({
              title: `${scope === "node" ? node.title : "Whole book"}, ${level}`,
              make: () => deriveQuiz(target, level),
            })
          }
        >
          Start quiz ({count(level)} questions)
        </button>
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-muted">
          No {level} questions here yet. Try another level
          {scope === "node" && " or the whole book"}.
        </p>
      )}
      {node.quizzes.length > 0 && (
        <>
          <h2 className={`mt-10 ${h2}`}>Curated quizzes</h2>
          <ul className="space-y-2">
            {node.quizzes.map((z) => (
              <li key={z.id}>
                <button
                  type="button"
                  className="card flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-subtle focus-visible:outline-2"
                  onClick={() =>
                    setSource({
                      title: z.title,
                      make: () => shuffle(z.questions),
                    })
                  }
                >
                  <span className="font-medium">{z.title}</span>
                  <span className="text-sm whitespace-nowrap text-muted">
                    {z.questions.length} questions
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function Player({ source, onExit }: { source: Source; onExit: () => void }) {
  const [qs, setQs] = useState(source.make);
  const [results, setResults] = useState<Result[]>([]);
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0);
  const restart = () => {
    setQs(source.make());
    setResults([]);
    setI(0);
    setRun(run + 1);
  };

  if (i === qs.length)
    return <Summary results={results} onRestart={restart} onExit={onExit} />;

  const answered = results.length > i;
  return (
    <section aria-label={source.title} style={tone("quizzes")}>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm text-muted">
        <span className="min-w-0 truncate">{source.title}</span>
        <span className="whitespace-nowrap tabular-nums">
          {i + 1} of {qs.length}
        </span>
      </div>
      <div className="mb-6 h-1.5 overflow-hidden rounded-full bg-subtle">
        <div
          className="h-full bg-tone transition-[width]"
          style={{ width: `${((i + Number(answered)) / qs.length) * 100}%` }}
        />
      </div>
      <Question
        key={`${run}-${i}`}
        q={qs[i]}
        answered={answered}
        onAnswer={(r) => setResults([...results, r])}
      />
      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
        <button type="button" className={secondary} onClick={onExit}>
          End quiz
        </button>
        {answered && (
          <button
            type="button"
            className={primary}
            onClick={() => setI(i + 1)}
            autoFocus
          >
            {i + 1 < qs.length ? "Next question" : "See results"}
          </button>
        )}
      </div>
    </section>
  );
}

function Question({
  q,
  answered,
  onAnswer,
}: {
  q: QuizQuestion;
  answered: boolean;
  onAnswer: (r: Result) => void;
}) {
  const [picked, setPicked] = useState<number>();
  const [input, setInput] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [correct, setCorrect] = useState<boolean>();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  const answer = (r: Result) => {
    setCorrect(r ?? undefined);
    onAnswer(r);
  };

  return (
    <div className="card p-4 sm:p-6">
      <p className="mb-3">
        <span className="badge capitalize" style={tone(q.level)}>
          {q.level}
        </span>
      </p>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-lg leading-snug font-medium outline-none sm:text-xl"
      >
        {q.q}
      </h2>

      <div className="mt-5">
        {q.type === "mcq" && (
          <ul className="space-y-2">
            {q.options.map((o, k) => {
              const right = answered && k === q.answer;
              const wrong = answered && k === picked && !right;
              return (
                <li key={k}>
                  <button
                    type="button"
                    disabled={answered}
                    onClick={() => {
                      setPicked(k);
                      answer(k === q.answer);
                    }}
                    className={`flex min-h-14 w-full items-center gap-3 rounded-xl border-2 bg-surface px-4 py-3 text-left focus-visible:outline-2 enabled:hover:bg-subtle ${
                      right
                        ? "border-success"
                        : wrong
                          ? "border-danger"
                          : "border-line"
                    } ${answered && !right && !wrong ? "text-muted" : ""}`}
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-sm font-semibold">
                      {String.fromCharCode(65 + k)}
                    </span>
                    <span className="flex-1">{o}</span>
                    {right && (
                      <span className="text-sm font-semibold text-success">
                        Correct answer
                      </span>
                    )}
                    {wrong && (
                      <span className="text-sm font-semibold text-danger">
                        Your answer
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {q.type === "numeric" && (
          <form
            noValidate
            className="flex flex-wrap items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const r = gradeNumeric(input, q);
              setInvalid(r === undefined);
              if (r !== undefined) answer(r);
            }}
          >
            <label className="min-w-0 flex-1 basis-48">
              <span className="mb-1 block text-sm font-medium">
                Your answer{q.unit && ` (${q.unit})`}
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoComplete="off"
                value={input}
                readOnly={answered}
                aria-invalid={invalid}
                aria-describedby={invalid ? `${q.id}-error` : undefined}
                onChange={(e) => setInput(e.target.value)}
                className="min-h-12 w-full rounded-xl border border-line-strong bg-surface px-4 text-lg tabular-nums focus-visible:outline-2"
              />
            </label>
            {!answered && (
              <button type="submit" className={primary}>
                Check
              </button>
            )}
            {invalid && (
              <p id={`${q.id}-error`} className="w-full text-sm text-danger">
                Enter a number, for example 42 or 0.5.
              </p>
            )}
          </form>
        )}

        {q.type === "free" && !answered && (
          <>
            <p className="mb-3 text-muted">
              Answer in your head or on paper, then compare. This one is not
              graded.
            </p>
            <button
              type="button"
              className={primary}
              onClick={() => answer(null)}
            >
              Show model answer
            </button>
          </>
        )}
      </div>

      {!answered &&
        q.hints?.map((h, k) => (
          <details
            key={k}
            className="mt-3 rounded-lg border border-line open:bg-subtle/50"
          >
            <summary className="flex min-h-11 cursor-pointer items-center rounded-lg px-4 font-medium text-warn select-none hover:bg-subtle focus-visible:outline-2">
              Hint {k + 1}
            </summary>
            <p className="px-4 pb-4">{h}</p>
          </details>
        ))}

      <div role="status" className="mt-5 empty:hidden">
        {answered && (
          <div className="space-y-2 border-t border-line pt-4">
            {q.type === "free" ? (
              <>
                <p className="font-semibold">Model answer</p>
                <p>{q.answer}</p>
              </>
            ) : (
              <p
                className={`font-semibold ${correct ? "text-success" : "text-danger"}`}
              >
                {correct ? "Correct" : "Not quite"}
                {q.type === "numeric" && (
                  <span className="font-normal text-fg">
                    {" "}
                    · Answer: {q.answer}
                    {q.unit && ` ${q.unit}`}
                    {q.tolerance ? ` (±${q.tolerance})` : ""}
                  </span>
                )}
              </p>
            )}
            <p className="text-muted">{q.explain}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Summary({
  results,
  onRestart,
  onExit,
}: {
  results: Result[];
  onRestart: () => void;
  onExit: () => void;
}) {
  const graded = results.filter((r) => r !== null);
  const right = graded.filter(Boolean).length;
  const free = results.length - graded.length;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => heading.current?.focus(), []);

  return (
    <section className="card p-6 text-center sm:p-8" style={tone("quizzes")}>
      <h2
        ref={heading}
        tabIndex={-1}
        className="text-2xl font-bold tracking-tight outline-none"
      >
        Quiz complete
      </h2>
      {graded.length > 0 && (
        <p className="mt-4">
          <span className="block text-5xl font-bold text-tone tabular-nums">
            {right} / {graded.length}
          </span>
          <span className="text-muted">correct</span>
        </p>
      )}
      {free > 0 && (
        <p className="mt-3 text-muted">
          {free} free-answer {free === 1 ? "question" : "questions"} to
          self-check, not graded.
        </p>
      )}
      <p className="mt-3 text-sm text-muted">This score is not saved.</p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <button type="button" className={primary} onClick={onRestart}>
          Restart (new order)
        </button>
        <button type="button" className={secondary} onClick={onExit}>
          Choose another quiz
        </button>
      </div>
    </section>
  );
}
