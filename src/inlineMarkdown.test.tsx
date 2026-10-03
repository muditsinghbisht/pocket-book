import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { inlineMarkdown } from "./inlineMarkdown.tsx";

const html = (s: string) => renderToStaticMarkup(<>{inlineMarkdown(s)}</>);

describe("inlineMarkdown", () => {
  it("renders bold, italic and code", () => {
    expect(html("**TTL**: a *short* `ttl`")).toBe(
      '<strong>TTL</strong>: a <em>short</em> <code class="rounded bg-subtle px-1 font-mono text-[0.9em]">ttl</code>',
    );
  });

  it("nests italic inside bold", () => {
    expect(html("**a *b* c**")).toBe("<strong>a <em>b</em> c</strong>");
  });

  it("renders https links only", () => {
    expect(html("[Redis](https://redis.io)")).toContain(
      '<a href="https://redis.io" target="_blank" rel="noreferrer"',
    );
    expect(html("[x](javascript:alert(1))")).toBe("[x](javascript:alert(1))");
    expect(html("[x](http://a.b)")).toBe("[x](http://a.b)");
  });

  it("leaves unmatched markers and plain text literal", () => {
    expect(html("All O`one Data Structure")).toBe("All O`one Data Structure");
    expect(html("2 * 3 = 6")).toBe("2 * 3 = 6");
    expect(html("**open")).toBe("**open");
  });

  it("escapes HTML", () => {
    expect(html("<b>x</b>")).toBe("&lt;b&gt;x&lt;/b&gt;");
  });
});
