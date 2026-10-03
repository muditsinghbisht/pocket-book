// Light/dark theme. The choice is a UI preference kept in localStorage (not user
// data, so not IndexedDB): it has to be read synchronously before first paint,
// see the inline script in index.html, which mirrors `resolveTheme` and `apply`.
import { useSyncExternalStore } from "react";

export const themePrefs = ["system", "light", "dark"] as const;
export type ThemePref = (typeof themePrefs)[number];
export type Theme = "light" | "dark";

export const parsePref = (v: unknown): ThemePref =>
  themePrefs.includes(v as ThemePref) ? (v as ThemePref) : "system";

export const nextPref = (p: ThemePref): ThemePref =>
  themePrefs[(themePrefs.indexOf(p) + 1) % themePrefs.length];

export const resolveTheme = (p: ThemePref, systemDark: boolean): Theme =>
  p === "system" ? (systemDark ? "dark" : "light") : p;

/** Browser chrome color per theme; matches --bg in index.css. */
export const themeColor: Record<Theme, string> = {
  light: "#fafaf9",
  dark: "#0f1117",
};

const KEY = "theme";
const mq = matchMedia("(prefers-color-scheme: dark)");
const listeners = new Set<() => void>();
let pref: ThemePref = "system";
try {
  pref = parsePref(localStorage.getItem(KEY));
} catch {
  // Storage blocked: fall back to the system theme.
}

function apply() {
  const theme = resolveTheme(pref, mq.matches);
  document.documentElement.classList.toggle("dark", theme === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", themeColor[theme]);
  listeners.forEach((l) => l());
}
mq.addEventListener("change", apply);

export function setThemePref(p: ThemePref) {
  pref = p;
  try {
    localStorage.setItem(KEY, p);
  } catch {
    // Not persisted; still applies for this page.
  }
  apply();
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

/** Current preference and the theme it resolves to. */
export function useTheme(): { pref: ThemePref; theme: Theme } {
  const key = useSyncExternalStore(
    subscribe,
    () => `${pref}:${resolveTheme(pref, mq.matches)}`,
  );
  const [p, t] = key.split(":") as [ThemePref, Theme];
  return { pref: p, theme: t };
}
