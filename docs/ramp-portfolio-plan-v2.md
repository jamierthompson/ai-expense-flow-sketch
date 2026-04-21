# Portfolio Project — Plan v2

**Version 2.** Revised after the low-fi sketching session. The original plan (preserved as `ramp-portfolio-plan-original.md`) captured the thesis correctly but underspecified the interaction model. This version replaces the sparse Week 1 bullet list with concrete interaction decisions validated in a working sketch, and reorders the remaining work accordingly.

---

## The thesis (unchanged)

A toy expense-categorization flow where an AI agent processes ~15–20 transactions, and its **confidence drives every visual beat** — how suggestions appear, how the agent activity feed reveals itself, and how accept / reclassify / flag feels in the hand.

> Motion is the honesty signal for AI acting on your money.

Designed for the product class exemplified by Ramp and other modern expense-management tools: admin-managed categories, audit trails as a first-class concern, AI-assisted workflows with human override.

---

## What changed from v1

**v1 was a plan. v2 is a plan informed by a working low-fi sketch** that exercised the whole flow end-to-end with mock data. The sketch validated the thesis and exposed a handful of interaction decisions the original plan didn't have.

### New design principles (locked in via the sketch)

1. **Motion-off readability is load-bearing.** Every state change — accepted, reclassified, flagged, learned, unlearned, uncertain — is readable as plain text first. Motion layers polish on top. This makes `prefers-reduced-motion` a first-class citizen, not a compliance checkbox.

2. **Binary audit trail.** Every user action and agent commitment has a matching inverse in the activity feed. Specific verbs (unaccepted, unclassified, unflagged, unlearned) — not a generic "undid" — make the log scannable and make edge cases obvious.

3. **Teaching moment as a first-class beat.** When the user corrects the agent, the agent commits a vendor→category rule by default, visibly. `just this one` is the opt-out link. This turns the reclassify interaction into a two-sided trust exchange: the user corrects, the agent acknowledges what it's learning.

4. **No submit ceremony.** Chip click = commit. Enter = commit. A visible `✓` icon affords mouse-commits on text inputs. Universal undo replaces pre-commit confirmation.

5. **Dedicated layouts for each commit state.** Pending has action buttons; committed states (accepted, reclassified, flagged) have only the reversal links that make sense for that state. Redundant noise is scoped out of each layout.

6. **Honest handling of model uncertainty.** When Reclassify from text lands on low confidence, the row surfaces `⚠ Low confidence` visibly and offers a one-click flag — no silent fallback to Uncategorized. Directly on-thesis.

### New surfaces introduced

- **Review bucket** (top-right of Results). Persistent count + expandable list. Motion destination for flag actions; readable as a number without motion.
- **Expandable activity feed entries.** Click any line to reveal the agent's reasoning, the details of a user action, or what a rule means.
- **Feed ⇄ results hover link.** Hovering either side highlights the matching item on the other. One surface, one POV.

### Scope changes

- **Reject removed.** "Reject" with no replacement is limbo — it's either Reclassify (the user knows the real category) or Flag (they don't). Collapsed into those two.
- **Flag added as a tertiary action** with a structured reason picker (Needs receipt, Personal charge, Potential fraud, Route to manager, No fitting category, Other). "No fitting category" is the specific escape hatch for cases the model can't handle — important because **categories are admin-managed in this product class**, not user-created.
- **Remember checkbox removed.** Replaced with default-on + visible opt-out via `just this one`. Faster, more informed, more controllable.

---

## Stack (unchanged)

- Framework: Next.js 16 (App Router)
- AI: Vercel AI SDK + AI Gateway
- Motion: Motion (Framer Motion) or Motion One
- Schema/validation: Zod
- Hosting: Vercel
- Language: TypeScript, strict

---

## Scope

### In scope (revised)

- [x] Low-fi flow validated in a working sketch (not paper, not Figma)
- [ ] Paste or upload ~15–20 messy transaction descriptions
- [ ] Agent categorizes via `streamObject` with Zod schema; activity feed is the stream
- [ ] Each result carries a confidence value (0–1) that shapes its arrival motion
- [ ] Low-confidence shimmers / hesitates; high-confidence snaps into place
- [ ] Accept single / accept-all-high-confidence / reclassify inline / flag to review
- [ ] Reclassify preserves the original guess as a diff; takes chip or free text; uses `generateObject` with user context
- [ ] Teaching moment: vendor→category rules learned by default; `just this one` opt-out; audit trail records both sides
- [ ] Review bucket as persistent destination for flagged items
- [ ] Binary audit trail: every action and commitment has a matching inverse
- [ ] Full keyboard navigation with visible focus
- [ ] `prefers-reduced-motion` designed in from day one
- [ ] Motion on/off toggle on the live demo

### Out of scope (protect this list)

- [ ] Auth, accounts, saved state
- [ ] Real receipt / OCR parsing
- [ ] Dashboards, charts, "second screens"
- [ ] Multi-user, collaboration, comments
- [ ] A backend beyond a single `streamObject` + single `generateObject` route
- [ ] User-created categories (categories are admin-managed in this product class; escape hatch is Flag → "No fitting category")

---

## Motion primitives (refined from v1)

Build in isolation on a `/playground` route before wiring to the main flow.

- `<ConfidenceText>` — the signature primitive. Drives category arrival, reclassify outcome, and any text that represents a model judgement.
- `<AgentStep>` — one line in the activity feed. Enter / active / done states. Expandable detail.
- `<DiffRow>` — the pending row and its committed states. Handles the reclassify flip, the accept collapse, the flag compress.
- `<ReviewBucket>` — counter + expandable list. Motion destination for flags. Count is load-bearing; motion is polish.

Everything else inherits from these four.

---

## Week 1 — Design & Primitives

**Status: low-fi complete.** The sketch in this repo covers the flow and interaction decisions.

Remaining for Week 1:

- [ ] Scaffold the real Next.js project (separate from the sketch) with AI SDK + Tailwind + Motion
- [ ] Port the mock data and state shape from the sketch
- [ ] Build `<ConfidenceText>` with 3–5 confidence tiers and distinct motion personalities
- [ ] Build `<AgentStep>` with enter / active / done states
- [ ] Build `<DiffRow>` including its five states (pending, accepted, reclassifying, reclassified, flagged) and the uncertain-reclassified variant
- [ ] Build `<ReviewBucket>` with the expand-to-list behavior
- [ ] Reduced-motion variants for each primitive
- [ ] Color + type system locked (keep it tight — 2 fonts max, restrained palette)
- [ ] Do **not** wire real streaming yet; primitives render against hard-coded mock data on `/playground`

---

## Week 2 — The Flow

Goal: real API, real transactions, real interactions, end-to-end.

- [ ] API route using `streamObject` with a Zod schema: `{ transactionId, category, confidence, reasoning }` per item
- [ ] Sample dataset of 15–20 transactions (public data or hand-written)
- [ ] Activity feed renders from partial streamed objects (not simulated progress)
- [ ] Results list populates as stream arrives, using `<ConfidenceText>`
- [ ] Accept single item — smooth state transition to the compact `✓ Accepted` state
- [ ] Accept-all-high-confidence batch action
- [ ] Reclassify flow using `generateObject` with user text + chosen chip as prompt context
- [ ] Teaching moment wired: learned/unlearned feed entries, `just this one` opt-out, `undo` restores the rule
- [ ] Flag flow routes to the review bucket; no-fitting-category handled via the flag reason
- [ ] Low-confidence reclassify handled honestly: `⚠ Low confidence` surface with one-click flag
- [ ] Error + empty + loading states designed
- [ ] Full keyboard path through the whole flow
- [ ] Deploy an alpha to Vercel and use it yourself for a day

---

## Week 3 — Polish & Ship (buffer)

- [ ] Accessibility audit: keyboard, focus order, ARIA labels, screen reader pass
- [ ] `prefers-reduced-motion` verified in browser DevTools — and the `motion-off readable` rule holds end-to-end
- [ ] Performance pass: bundle size, Core Web Vitals, no layout shift
- [ ] Watch one or two people use it without you — write down every hesitation
- [ ] Fix the top 3 hesitations
- [ ] Motion on/off toggle working and prominent
- [ ] Copy pass on every label, empty state, and error message
- [ ] Favicon, OG image, page title, meta description
- [ ] Final deploy + custom domain if available

> If Week 3 isn't enough, cut scope from Week 2 — **never** cut the accessibility or polish pass.

---

## Failure modes to watch (revised)

- **Scope creep disguised as ambition.** Day 10, you want to add auth or a dashboard. That's the signal to stop adding and start polishing.
- **Wiring the real API too early.** The low-fi sketch has already proven the shape — resist the urge to rebuild it in production code before primitives are tuned on `/playground`.
- **Motion tourism.** Every animation should earn its place. If you can't say what it communicates, delete it. The `motion-off readable` rule is the discipline that prevents this.
- **Letting the audit trail rot.** The binary invariant (every action has a matching inverse) breaks fast if new features are added without feed entries. Treat the feed as a contract.
- **Hiding the AI workflow.** The write-up should name tools, where they helped, where they hit limits.

---

## The bar (unchanged)

A small artifact, executed at a level that makes someone stop scrolling, beats a bigger artifact executed at parity with everyone else applying.

One surface. One motion language. One decisive point of view.
