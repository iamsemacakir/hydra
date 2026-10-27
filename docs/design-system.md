# Design system

The Version 2 interface uses a light, restrained operational palette. CSS tokens live in `frontend/web/src/app/globals.css`; new components should use these tokens rather than hard-coded colors. The existing overview, topology, deployment, and event layouts retain their behavior while adopting this palette.

| Role | Token | Value |
| --- | --- | --- |
| Page background | `--color-bg` | `#F8FAFC` |
| Surface | `--color-surface` | `#FFFFFF` |
| Subtle surface | `--color-surface-subtle` | `#F1F5F9` |
| Border / strong border | `--color-border` / `--color-border-strong` | `#E2E8F0` / `#CBD5E1` |
| Text / secondary / muted | `--color-text` / `--color-text-secondary` / `--color-text-muted` | `#0F172A` / `#475569` / `#64748B` |
| Primary / hover | `--color-primary` / `--color-primary-hover` | `#2563EB` / `#1D4ED8` |
| Success | `--color-success` | `#15803D` |
| Warning | `--color-warning` | `#B45309` |
| Danger | `--color-danger` | `#B91C1C` |
| Info / unknown | `--color-info` / `--color-unknown` | `#1D4ED8` / `#64748B` |

The semantic colors have pale background companions. Statuses must also have readable text labels, as in the topology nodes and event severity badges. Focus outlines use primary blue and must stay visible on white surfaces. Cards use `--radius-lg` and `--shadow-card`; graph nodes use `--shadow-node`. Typography is a compact system sans stack with clear heading hierarchy. The board and forms introduced in later slices should reuse these primitives.

The palette was the first Version 2 slice and did not change the database model.

The board reuses these neutrals and semantic colors. Tag colors are selected from named tokens; priority always has a readable text label. The work-item panel uses the same surface, border, focus, and spacing conventions as the project forms.

## Landing page tokens

The public landing page (`/`, see [landing.md](landing.md)) has its own `--lp-*` tokens at the end of `globals.css`, in a Light and a Dark set. Only the landing page reads them; the signed-in application keeps the tokens above. Dark applies when `<html>` has `data-landing-theme="dark"`. Neutrals lean slightly cool (derived from OKLCH hue 262 at low chroma) and the single accent, `--lp-signal`, means "degraded or potentially affected" everywhere it appears.

| Role | Token | Light | Dark |
| --- | --- | --- | --- |
| Page background | `--lp-bg` | `#F6F8FA` | `#0C0E12` |
| Surface / subtle surface | `--lp-surface` / `--lp-surface-2` | `#FDFEFF` / `#EDEFF4` | `#15171C` / `#1F2227` |
| Border / strong border | `--lp-line` / `--lp-line-strong` | `#DDE0E4` / `#BABEC4` | `#2B2E34` / `#464B52` |
| Graph line | `--lp-edge` | `#82868F` | `#63676F` |
| Text / secondary / muted | `--lp-ink` / `--lp-ink-2` / `--lp-ink-3` | `#10141A` / `#484D56` / `#616670` | `#F0F2F4` / `#A7ABB3` / `#888C94` |
| Inverse panel / text on it | `--lp-inverse` / `--lp-on-inverse` | `#10141A` / `#F8F9FC` | `#F0F2F4` / `#0D0F13` |
| Signal / soft signal | `--lp-signal` / `--lp-signal-soft` | `#CB3814` / `#FFE7DD` | `#FF874C` / `#3E1D13` |

Other tokens: radii `--lp-radius-sm/md/lg/xl` (8, 12, 16, 24 px), easing `--lp-ease-out` and `--lp-ease-in-out`, durations `--lp-dur-press` (160 ms), `--lp-dur-ui` (240 ms) and `--lp-dur-reveal` (500 ms), and `--lp-shadow-stage`.

Rules the landing page follows, in addition to the ones above:

- Status always has a shape and a text label, never colour alone (see the legend in the hero).
- Body text is at least 4.5:1 against its background in both themes, and graph lines at least 3:1. Borders are decoration, so they are lighter than that.
- Interactive targets are at least 44 px tall; hover styles apply only where the device can hover.
- Typefaces are Geist (text) and Geist Mono (code, labels), loaded with `next/font/google` for the landing page only.
