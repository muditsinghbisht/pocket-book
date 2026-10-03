import { describe, expect, it, vi } from "vitest";

// theme.ts reads matchMedia and localStorage on import; stub them for node.
vi.stubGlobal("matchMedia", () => ({ matches: false, addEventListener() {} }));
vi.stubGlobal("localStorage", { getItem: () => null });
const { nextPref, parsePref, resolveTheme } = await import("./theme.ts");

describe("theme", () => {
  it("resolves system to the OS theme and keeps explicit choices", () => {
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
  });

  it("cycles system -> light -> dark -> system", () => {
    expect(nextPref("system")).toBe("light");
    expect(nextPref("light")).toBe("dark");
    expect(nextPref("dark")).toBe("system");
  });

  it("falls back to system for missing or bad stored values", () => {
    expect(parsePref(null)).toBe("system");
    expect(parsePref("purple")).toBe("system");
    expect(parsePref("dark")).toBe("dark");
  });
});
