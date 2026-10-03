// The only IndexedDB access in the app: user notes and custom flashcards, nothing else.
// A native wrapper (no `idb` dependency): four promise helpers cover every use.
import type { Card, Note } from "./userdata.ts";

type Stores = { notes: Note; cards: Card };
type Store = keyof Stores;

let conn: Promise<IDBDatabase> | undefined;

const wrap = <T>(r: IDBRequest<T>) =>
  new Promise<T>((ok, fail) => {
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
  });

function open() {
  conn ??= new Promise<IDBDatabase>((ok, fail) => {
    // Throws synchronously or fails when storage is blocked (some private modes).
    const r = indexedDB.open("pocketbook", 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore("notes", { keyPath: "key" });
      r.result.createObjectStore("cards", { keyPath: "id" });
    };
    r.onsuccess = () => ok(r.result);
    r.onerror = () => fail(r.error);
    r.onblocked = () => fail(new Error("Database blocked by another tab"));
  }).catch((e) => {
    conn = undefined; // allow a retry later
    throw e;
  });
  return conn;
}

async function tx<S extends Store, T>(
  store: S,
  mode: IDBTransactionMode,
  run: (s: IDBObjectStore) => IDBRequest<T>,
) {
  const db = await open();
  return wrap(run(db.transaction(store, mode).objectStore(store)));
}

export const getAll = <S extends Store>(store: S) =>
  tx(store, "readonly", (s) => s.getAll() as IDBRequest<Stores[S][]>);

export const get = <S extends Store>(store: S, key: string) =>
  tx(store, "readonly", (s) => s.get(key) as IDBRequest<Stores[S] | undefined>);

export const put = <S extends Store>(store: S, value: Stores[S]) =>
  tx(store, "readwrite", (s) => s.put(value));

export const del = (store: Store, key: string) =>
  tx(store, "readwrite", (s) => s.delete(key));

/** Writes many records in one transaction (imports). */
export async function putAll<S extends Store>(store: S, values: Stores[S][]) {
  const t = (await open()).transaction(store, "readwrite");
  for (const v of values) t.objectStore(store).put(v);
  await new Promise((ok, fail) => {
    t.oncomplete = ok;
    t.onerror = t.onabort = () => fail(t.error);
  });
}

/** Shown when any call above fails. */
export const storageError =
  "Your browser blocked local storage (for example in a private window), so changes here cannot be saved.";
