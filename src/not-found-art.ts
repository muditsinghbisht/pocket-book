// "Not found" illustration: an open book whose right page has floated away.
// A plain string so the app (views.tsx) and the standalone dist/404.html
// (build/content-plugin.ts) share one artwork. Colors are the theme tokens
// from index.css, which 404.html defines inline. Static markup, no user input.
export const notFoundArt = `<svg class="nf-art" viewBox="0 0 200 150" role="img" aria-label="An open book with a page floating away">
<style>
.nf-art{display:block;width:100%;height:auto}
.nf-page{transform-box:view-box;transform-origin:152px 34px;transform:rotate(12deg)}
@keyframes nf-float{0%,100%{transform:translateY(0) rotate(12deg)}50%{transform:translateY(-7px) rotate(4deg)}}
@media (prefers-reduced-motion:no-preference){.nf-page{animation:nf-float 4s ease-in-out infinite}}
</style>
<ellipse cx="100" cy="134" rx="66" ry="6" fill="var(--line)"/>
<path d="M28 54Q64 42 100 56Q136 42 172 54V126Q136 114 100 128Q64 114 28 126Z" fill="var(--primary)"/>
<path d="M34 49Q67 39 100 51V121Q67 109 34 119Z" fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1.5"/>
<path d="M166 49Q133 39 100 51V121Q133 109 166 119Z" fill="var(--subtle)" stroke="var(--line-strong)" stroke-width="1.5" stroke-dasharray="4 4"/>
<path d="M44 63Q66 57 90 64M44 74Q66 68 90 75M44 85Q66 79 90 86M44 96Q60 92 76 96" fill="none" stroke="var(--line-strong)" stroke-width="3" stroke-linecap="round"/>
<path d="M80 113h9v25l-4.5-4-4.5 4z" fill="#fbbf24"/>
<g class="nf-page">
<rect x="132" y="8" width="40" height="52" rx="3" fill="var(--surface)" stroke="var(--line-strong)" stroke-width="1.5"/>
<text x="152" y="45" text-anchor="middle" font-family="system-ui,sans-serif" font-size="30" font-weight="700" fill="var(--primary)">?</text>
</g>
<path d="M120 22l-6-3M122 34h-7M182 66l5 4M176 72l2 6" fill="none" stroke="var(--muted)" stroke-width="2" stroke-linecap="round"/>
</svg>`;
