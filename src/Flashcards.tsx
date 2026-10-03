// Flashcards section: the node's ready-made deck plus the user's own cards.
// Tap to flip, swipe to move; Space/Enter and arrow keys on desktop. Prints as a grid.
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import type { TopicNode } from "./content/schema.ts";
import { del, getAll, put, storageError } from "./db.ts";
import { btn, primaryBtn, Transfer } from "./Transfer.tsx";
import type { Card } from "./userdata.ts";
import { tone } from "./views.tsx";

type DeckCard = { front: string; back: string; mine?: boolean };

const newId = () =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

function Viewer({ deck }: { deck: DeckCard[] }) {
  const [i, setI] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const start = useRef<{ x: number; y: number }>(undefined);
  const swiped = useRef(false);
  const at = Math.min(i, deck.length - 1);
  const card = deck[at];

  const move = useCallback(
    (d: number) => {
      setI((i) => Math.max(0, Math.min(deck.length - 1, i + d)));
      setFlipped(false);
    },
    [deck.length],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (t.closest("input, textarea, select, [contenteditable]")) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        move(e.key === "ArrowLeft" ? -1 : 1);
      } else if (
        (e.key === " " || e.key === "Enter") &&
        !t.closest("button, a, summary, label") // those activate themselves
      ) {
        e.preventDefault();
        setFlipped((f) => !f);
      }
    };
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [move]);

  if (!card) return null;
  return (
    <div className="print:hidden" style={tone("flashcards")}>
      <button
        type="button"
        aria-label={`Card ${at + 1} of ${deck.length}, ${flipped ? "answer" : "question"}. Tap to flip.`}
        aria-live="polite"
        onPointerDown={(e) => {
          start.current = { x: e.clientX, y: e.clientY };
          swiped.current = false;
        }}
        onPointerUp={(e) => {
          const s = start.current;
          if (!s) return;
          const dx = e.clientX - s.x;
          if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(e.clientY - s.y)) {
            swiped.current = true;
            move(dx < 0 ? 1 : -1);
          }
        }}
        onClick={() => {
          if (swiped.current) swiped.current = false;
          else setFlipped((f) => !f);
        }}
        className={`card flex min-h-64 w-full touch-pan-y flex-col items-center justify-center gap-3 border-t-4 border-t-tone p-6 text-center select-none focus-visible:outline-2 sm:min-h-72 ${flipped ? "bg-subtle" : ""}`}
      >
        <span className="flex gap-2">
          <span className="badge">{flipped ? "Answer" : "Question"}</span>
          {card.mine && <span className="badge">Yours</span>}
        </span>
        <span
          className={`max-w-prose whitespace-pre-wrap ${flipped ? "text-lg" : "text-xl font-semibold"}`}
        >
          {flipped ? card.back : card.front}
        </span>
      </button>
      <div className="mt-3 flex items-center justify-between gap-2">
        <button
          type="button"
          className={btn}
          disabled={at === 0}
          onClick={() => move(-1)}
          aria-label="Previous card"
        >
          ← Prev
        </button>
        <span className="text-sm text-muted tabular-nums">
          {at + 1} / {deck.length}
        </span>
        <button
          type="button"
          className={btn}
          disabled={at === deck.length - 1}
          onClick={() => move(1)}
          aria-label="Next card"
        >
          Next →
        </button>
      </div>
      <p className="mt-2 text-center text-xs text-muted">
        <span className="pointer-fine:hidden">Tap to flip, swipe to move.</span>
        <span className="hidden pointer-fine:inline">
          Space or Enter to flip, arrow keys to move.
        </span>
      </p>
    </div>
  );
}

function CardForm({
  initial,
  onSave,
  onCancel,
}: {
  initial?: Card;
  onSave: (front: string, back: string) => void;
  onCancel?: () => void;
}) {
  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    onSave(String(f.get("front")).trim(), String(f.get("back")).trim());
    if (!initial) e.currentTarget.reset();
  };
  const field =
    "mt-1 block min-h-20 w-full resize-y rounded-lg border border-line bg-surface p-3 text-base focus-visible:outline-2";
  return (
    <form onSubmit={submit} className="card space-y-3 p-4">
      <label className="block text-sm font-medium">
        Front
        <textarea
          name="front"
          required
          defaultValue={initial?.front}
          className={field}
        />
      </label>
      <label className="block text-sm font-medium">
        Back
        <textarea
          name="back"
          required
          defaultValue={initial?.back}
          className={field}
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={primaryBtn}>
          {initial ? "Save card" : "Add card"}
        </button>
        {onCancel && (
          <button type="button" className={btn} onClick={onCancel}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function Flashcards({ node }: { node: TopicNode }) {
  const [mine, setMine] = useState<Card[]>([]);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState<string>();
  const [version, setVersion] = useState(0);
  const deck: DeckCard[] = [
    ...node.flashcards,
    ...mine.map((c) => ({ ...c, mine: true })),
  ];

  useEffect(() => {
    getAll("cards")
      .then((cs) => setMine(cs.filter((c) => c.path === node.path)))
      .catch(() => setError(storageError));
  }, [node.path, version]);

  const save = (c: Card) =>
    put("cards", c)
      .then(() => setVersion((v) => v + 1))
      .catch(() => setError(storageError));

  return (
    <>
      {deck.length ? (
        <Viewer key={node.path} deck={deck} />
      ) : (
        <p className="rounded-xl border border-dashed border-line-strong p-6 text-center text-muted print:hidden">
          No cards here yet. Add your own below.
        </p>
      )}

      {/* Print: the whole deck, front and back. */}
      <dl className="hidden gap-3 print:grid print:grid-cols-2">
        {deck.map((c, i) => (
          <div key={i} className="card break-inside-avoid p-4">
            <dt className="font-semibold whitespace-pre-wrap">{c.front}</dt>
            <dd className="mt-2 whitespace-pre-wrap">{c.back}</dd>
          </div>
        ))}
      </dl>

      <div className="print:hidden">
        {deck.length > 0 && (
          <button
            type="button"
            className={`${btn} mt-6`}
            onClick={() => print()}
          >
            Print deck
          </button>
        )}

        <h2 className="mt-10 mb-3 text-sm font-semibold tracking-wide text-muted uppercase">
          Your cards
        </h2>
        {error && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {error}
          </p>
        )}
        {mine.length > 0 && (
          <ul className="mb-4 space-y-2">
            {mine.map((c) =>
              editing === c.id ? (
                <li key={c.id}>
                  <CardForm
                    initial={c}
                    onCancel={() => setEditing(undefined)}
                    onSave={(front, back) => {
                      setEditing(undefined);
                      save({ ...c, front, back });
                    }}
                  />
                </li>
              ) : (
                <li
                  key={c.id}
                  className="card flex flex-wrap items-start gap-3 p-4"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold break-words whitespace-pre-wrap">
                      {c.front}
                    </p>
                    <p className="mt-1 break-words whitespace-pre-wrap text-muted">
                      {c.back}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className={btn}
                      onClick={() => setEditing(c.id)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className={`${btn} text-danger`}
                      onClick={() =>
                        confirm("Delete this card?") &&
                        del("cards", c.id)
                          .then(() => setVersion((v) => v + 1))
                          .catch(() => setError(storageError))
                      }
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        )}
        <CardForm
          onSave={(front, back) =>
            save({ id: newId(), path: node.path, front, back })
          }
        />
      </div>

      <Transfer kind="flashcards" onImported={() => setVersion((v) => v + 1)} />
    </>
  );
}
