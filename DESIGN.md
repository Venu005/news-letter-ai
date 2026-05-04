# Newsletter AI — Product design system

Living reference for **color**, **typography**, **shape**, **motion**, and **landing** composition. **Approach:** marketing uses a **brand (coral) layer**; the **app shell** (dashboard, editors, dense lists) stays **neutral and calm**. **Themes:** **light** and **dark** are first-class and documented in parallel.

Implementation lives in `app/globals.css`, `app/layout.tsx`, and route layouts — this file is the **source of intent**; adjust OKLCH values during build if contrast checks require it.

---

## 1. Principles & scope

| Principle | Rule |
| --- | --- |
| Brand vs product | **Coral / display / hero treatments** apply on **marketing** and aligned **public** surfaces only unless a screen explicitly opts in (see scope). |
| App shell | **Neutrals** and existing shadcn semantics dominate; avoid coral fills on large editor panels. |
| Themes | Every **brand** and **semantic** rule has **light** and **dark** behavior; no “dark TBD”. |
| Accessibility | Text/background **WCAG 2.2 AA** minimum; **focus** rings visible in both themes; respect **`prefers-reduced-motion`**. |
| Content | **No essential information** conveyed only by motion or color alone. |

### Surfaces where brand tokens are allowed

Use the brand scale and display typography on these routes (or their subtree), typically behind a single layout wrapper (e.g. `data-surface="marketing"`):

| Route / area | Brand usage |
| --- | --- |
| `/` (home / landing) | Full: hero, CTAs, accents, optional gradient. |
| `/sign-in`, `/sign-up` | Light touch: logo wordmark, primary CTA, subtle accent — avoid loud hero gradients. |
| `/p/[slug]` (public subscribe) | Strong: headline, primary subscribe CTA, success state accent. |
| `/subscribe/success`, `/subscribe/error` | Accent on icon/heading and primary link/button. |

**Not** in default brand treatment: `/dashboard/**` and in-app editors — use neutrals + default `Button` variants; use **brand** only for **isolated primary actions** called out in product copy (e.g. Publish) if product later standardizes that in code.

---

## 2. Color system

### 2.1 Neutrals (product shell)

Align with shadcn-style semantics already mapped in `app/globals.css`: `background`, `foreground`, `card`, `popover`, `muted`, `muted-foreground`, `border`, `input`, `ring`, `secondary`, `accent` (as subtle surface), etc.

| Role | Intent (light) | Intent (dark) |
| --- | --- | --- |
| Page background | Clean white or near-white; minimal chroma. | Deep neutral; not pure black unless contrast-tested. |
| Text | Near-black gray for body; stepped down for muted. | Off-white body; muted text clearly legible on surfaces. |
| Borders | Light gray hairlines; separators subtle. | Low-contrast light alpha on dark. |
| Cards | Slightly lifted from page or same as page with border. | Slightly elevated from background. |

Tuning OKLCH chroma slightly toward **warm** grays pairs with coral brand without tinting entire UI orange.

### 2.2 Brand scale (coral) — OKLCH

Use these as **CSS variables** (suggested names in §5). Values are starting points; **verify contrast** against chosen backgrounds before release.

**Light theme (typical marketing background ~`oklch(0.99 0.005 90)` or white)**

| Token | OKLCH (approx.) | Usage |
| --- | --- | --- |
| `--brand-subtle` | `oklch(0.96 0.04 45)` | Subtle fills, badges, tinted sections. |
| `--brand-muted` | `oklch(0.88 0.12 42)` | Hover on soft brand chips, secondary highlights. |
| `--brand` | `oklch(0.63 0.19 42)` | **Primary marketing CTA** fill, key links on light. |
| `--brand-strong` | `oklch(0.52 0.2 40)` | Hover/active on `--brand` buttons. |
| `--brand-foreground` | `oklch(0.99 0.01 95)` | Text/icons **on** `--brand` / `--brand-strong` fills. |

**Dark theme (typical marketing background ~`oklch(0.16 0.01 280)` or system dark)**

| Token | OKLCH (approx.) | Usage |
| --- | --- | --- |
| `--brand-subtle` | `oklch(0.28 0.06 42)` | Dark panels, tinted strips. |
| `--brand-muted` | `oklch(0.45 0.14 42)` | Borders/accents on dark, ghost button borders. |
| `--brand` | `oklch(0.7 0.17 42)` | **Primary marketing CTA** on dark (lighter for luminance). |
| `--brand-strong` | `oklch(0.78 0.16 42)` | Hover glow / emphasis (use sparingly). |
| `--brand-foreground` | `oklch(0.15 0.02 40)` | Text/icons **on** `--brand` fill when fill is light (high L). |

**Rules**

- Do **not** place **muted body text** directly on `--brand` without checking contrast; prefer `--brand-foreground` at **default** and **large** sizes per WCAG.
- **Destructive** actions use existing `destructive` tokens — never reuse coral for errors.
- **Gradients (optional, marketing only):** e.g. `linear-gradient(135deg, oklch(0.63 0.19 42), oklch(0.58 0.18 25))` — use only in **hero** or **top band**, never behind dense paragraph text without a scrim.

---

## 3. Typography & shape

### 3.1 Font stacks

| Role | Family | Loading |
| --- | --- | --- |
| **Display** (marketing hero, major landing headings) | **Syne**, fallback `ui-sans-serif`, `system-ui`, `sans-serif` | `next/font/google` — variable `--font-display`. |
| **UI / body** | **Geist Sans** | Existing `--font-geist-sans` / app `layout.tsx`. |
| **Code / monospace** | **Geist Mono** | Existing `--font-geist-mono`. |

If Syne is replaced later, prefer a **geometric / semi-expanded** display sans (e.g. Outfit) and update this doc.

### 3.2 Type ramp (reference sizes)

Use **fluid** clamp in implementation where helpful; below are **reference** steps.

| Step | Typical use | Font | Weight | Notes |
| --- | --- | --- | --- | --- |
| Display | Hero headline | Display | 700–800 | Tight line-height ~1.05; slight negative tracking only at largest size. |
| H1 | Page title (marketing) | Display | 700 | Line-height ~1.1–1.15. |
| H2 | Section titles | Display or Geist | 600–700 | Geist acceptable in dashboard. |
| Lead | Hero supporting line | Geist | 400–500 | Slightly larger than body; `muted-foreground` acceptable. |
| Body | Paragraphs, UI | Geist | 400–500 | Line-height ~1.5–1.6. |
| UI sm / caption | Meta, labels | Geist | 400–500 | Smaller size; maintain min **16px** for interactive row text where possible. |

### 3.3 Shape & elevation

| Element | Rule |
| --- | --- |
| **Radius** | Default app radius from `--radius` (e.g. `0.625rem` base). **Marketing hero panels** may use **one step larger** (`--radius-xl` / `2xl`) — not larger than that without design review. |
| **Buttons** | Default: `rounded-md` / theme `lg` per shadcn. Marketing primary can match or use `lg` consistently. |
| **Elevation** | **Level 0:** flat sections. **Level 1:** marketing cards (soft shadow or border-only in dark). **Level 2:** sticky nav / modal — subtle; avoid heavy drop shadows in dark mode. |

---

## 4. Motion

| Context | Guideline |
| --- | --- |
| **Landing** | Optional **fade + slight translate** (8–16px) on hero content; duration **200–350ms**; easing `cubic-bezier(0.2, 0.8, 0.2, 1)` or standard `ease-out`. |
| **Reduced motion** | If `prefers-reduced-motion: reduce`, **disable** translate/scale; allow instant opacity or no animation. |
| **Loops** | No infinite decorative motion except **Rive** (or similar) if product adds one — must not block reading. |

---

## 5. Landing page structure & layout rules

### 5.1 Section order

1. **Top bar:** logo/wordmark, minimal nav (e.g. Product, Pricing if added), **theme toggle**, **Sign in** / **Dashboard** CTA.
2. **Hero:** display headline, **lead** line, **primary** CTA (brand), **secondary** CTA (outline or ghost on neutral).
3. **Value props:** 3–4 columns or stacked blocks; icon or short title + one sentence each.
4. **How it works:** 4 steps aligned to real product: **niche → topics (HITL) → draft (supervised) → publish / subscribe**.
5. **Footer band:** short repeat CTA + legal/links as needed.

### 5.2 Layout grid

| Rule | Value |
| --- | --- |
| Max content width | `min(72rem, 100% - 2rem)` or equivalent — hero text column narrower than full bleed if background is wide. |
| Horizontal padding | **1rem** mobile minimum; **1.5–2rem** tablet+ between section content and viewport. |
| Section vertical rhythm | **4–6rem** between major sections desktop; **3rem** mobile. |
| Hero min height | Optional `min-h` ~ **50–70vh** on large screens; content remains readable without viewport height (no clipping of CTAs). |

### 5.3 CTAs

- **One** visually dominant **primary** per viewport (hero). Secondary actions use outline/ghost.
- Sign-in card flows: primary = **Sign in**; link to sign-up as text + `Button variant="link"`.

### 5.4 Imagery

- Prefer **abstract** shapes, subtle grids, or **gradient mesh** behind hero — low noise so text stays primary.
- Any screenshot of the product: rounded corners aligned to **§3.3**; border or shadow per theme.

---

## 6. Implementation handoff (token names)

Suggested CSS custom properties (add to `:root` / `.dark` and wire in `@theme inline` for Tailwind v4):

- `--brand-subtle`, `--brand-muted`, `--brand`, `--brand-strong`, `--brand-foreground`
- Optional: `--brand-gradient-start`, `--brand-gradient-end` for documented gradients only.

**Scoping convention:** marketing layouts set `data-surface="marketing"` on `<body>` or a root wrapper for those routes; components use `bg-brand`, `text-brand-foreground`, etc., only under that surface **or** via explicit utility exceptions documented in PRs.

**Dashboard:** continue using `--primary` / shadcn defaults for global chrome until product explicitly remaps isolated actions to `--brand`.

---

## 7. Checklist before ship

- [ ] Light + dark: hero, buttons, links, muted text pass **contrast** checks.
- [ ] Focus visible on all interactive elements (keyboard).
- [ ] `prefers-reduced-motion` tested on landing.
- [ ] No coral used for **error** or **success** semantics without distinct tokens (success may use a separate green if introduced later).

---

## Revision history

| Date | Change |
| --- | --- |
| 2026-05-04 | Initial design system and landing rules (approved brainstorm: bold + coral + dual theme + marketing layer). |
