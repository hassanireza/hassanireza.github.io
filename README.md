<div align="center">

<img src="docs/diagrams/banner.svg" alt="Reza Hassani, Portfolio, React and TypeScript single page application" width="100%" />

<br />

[![Live Site](https://img.shields.io/badge/LIVE-hassanireza.github.io-e6e3da?style=flat-square&labelColor=08090b)](https://hassanireza.github.io/)
[![Stack](https://img.shields.io/badge/STACK-React_19_·_TypeScript-e6e3da?style=flat-square&labelColor=08090b)](#stack)
[![Brand](https://img.shields.io/badge/BRAND-Abyssal_Liturgy-7c8891?style=flat-square&labelColor=08090b)](https://hassanireza.github.io/branding)
[![License](https://img.shields.io/badge/LICENSE-Personal,_view_only-565f64?style=flat-square&labelColor=08090b)](#license)

</div>

<br />

This is the source of my personal site: a single, fully typed React application carrying my portfolio, my brand system, an interactive career roadmap, and a running record of what I'm learning, all under one design language. It's a private project, not open for contribution, kept here as a working reference for myself and a public demonstration of how I like to build.

**Live site:** [hassanireza.github.io](https://hassanireza.github.io/)
**Brand system:** [Abyssal Liturgy](https://hassanireza.github.io/branding)

---

## What's here

One design language, several distinct experiences, all in one app.

| Route | Purpose |
|---|---|
| `/` | Landing page, canvas-based particle field |
| `/portfolio` | Portfolio work, grouped by category |
| `/branding` | The Abyssal Liturgy brand system, published in full |
| `/contact` | Contact form, Cloudflare Turnstile verified |
| `/descent` | The Descent — an immersive, scroll-driven career retrospective |
| `/descent/cv` | Printable CV, reached from The Descent |
| `/journey` | My Journey — a self-graded skill tree and progress tracker |
| `/journey/roadmap` | The full phase-by-phase roadmap and achievements |
| `/journey/cheatsheets` | A catalog of long-form reference guides |
| `/journey/cheatsheets/:slug` | An individual reference guide |
| `*` | Branded 404, catch-all for unmatched paths |

<div align="center">
  <img src="docs/diagrams/architecture.svg" alt="Architecture diagram showing main.tsx rendering App.tsx, which routes to Home, Portfolio, Contact, Branding, Descent, and Journey, each with supporting components" width="100%" />
</div>

---

## Brand system — Abyssal Liturgy

Every surface across every route draws from a single named system: **Abyssal Liturgy**. Near-monochrome, restrained, one light source per surface — everything else is allowed to stay dark. The full brandbook — palette, type scale, logo marks, motion language, and usage guidance — is published at [hassanireza.github.io/branding](https://hassanireza.github.io/branding); the tokens that implement it in code live in `src/styles/tokens.css`.

<div align="center">
  <img src="docs/diagrams/palette.svg" alt="Abyssal Liturgy core palette, from void to bone" width="100%" />
</div>

| Token | Hex | Role |
|---|---|---|
| Void | `#08090b` | Primary background, every page |
| Charcoal | `#0d1013` | Secondary surface, layered panels |
| Deep Charcoal | `#12161a` | Tertiary depth, nested surfaces |
| Bone | `#e6e3da` | Primary text, the only true highlight |
| Fog | `#9aa3a8` | Secondary text, supporting copy |
| Ash | `#565f64` | Tertiary text, labels, timestamps |
| Oxidized Silver | `#7c8891` | Accent, hover and active states |
| Bright Silver | `#c9cfd2` | Accent peak, rare emphasis only |

Type follows the same restraint: **Cormorant Garamond**, italic, for display; **Jost** for body copy; **JetBrains Mono** for annotation, labels, and anything read as a field note rather than prose. Every route carries its own tab icon, drawn from the same mark system, so the browser tab itself reflects the mood of the page you're on.

---

## Stack

<div align="center">
  <img src="docs/diagrams/stack.svg" alt="Radial stack map, React and TypeScript at the core, Vite, React Router, plain CSS, oxlint, Turnstile, and Formspree around it" width="100%" />
</div>

- **React 19** with **TypeScript**, strict mode
- **React Router 7**, including nested routes for The Descent and My Journey
- **Vite**, for both development and the production build
- **GSAP**, driving the scroll physics and motion inside The Descent
- **oxlint** for linting
- Plain CSS per component and page — no CSS-in-JS, no utility framework, a single shared token file
- **Cloudflare Turnstile** for bot-resistant form verification, submitted through **Formspree**

No global state library. State is local to each page — `useState` and `useEffect` — which is enough for a site of this scope. That's a decision, not an omission.

---

## Routing on a static host

GitHub Pages has no server-side routing, so a direct link or hard refresh on a nested path like `/descent/cv` or `/journey/roadmap` would 404 on a naive static deploy. This site handles that with the established `rafgraph/spa-github-pages` pattern: a small redirect shim encodes the intended path into a query string, and an inline script restores it with `history.replaceState` before React Router ever mounts. From the outside, it's instant and invisible — the only page a visitor actually sees for a broken link is the branded 404 itself.

<div align="center">
  <img src="docs/diagrams/spa-routing.svg" alt="Sequence diagram, direct visit to a nested path served a 404, redirected through a query string, restored and matched by React Router" width="100%" />
</div>

---

## License

Personal project. Source is public for reference only. Portfolio content, copy, and imagery are not licensed for reuse.
