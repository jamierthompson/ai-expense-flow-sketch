# Ramp Design Engineer — Portfolio Project Plan

## Original Notes

**Confidence-weighted output.** Render AI text where the model's own token probabilities drive subtle motion or weight. Lower-confidence words arrive a beat slower or shimmer uncertainly; high-confidence phrases snap into place. This is _directly_ motion-for-AI-trust — the motion itself is the honesty signal, because the model is no longer pretending it's equally sure about everything it says. This is the single strongest piece you could put in a Ramp application.

**The agent activity feed.** What Claude Code does in your terminal, but generalized into a UI pattern. Structured, legible progress — "Reading 3 files," "Checking the schema," "Writing changes" — with the ability to interrupt, redirect, or expand any step to see what happened underneath. This is basically the Ramp core UX problem: an AI agent doing something with your money, and motion/transparency is what makes it OK to let it run.

**AI diff UI.** When AI edits your text, receipt data, or document, showing the change in a way that feels trustworthy. Better than Google Docs suggestions. Character-level morphing, old text aging out, new text arriving with appropriate weight, accept/reject gestures that feel tactile. Ramp's expense categorization flow is essentially this problem wearing a fintech hat.

## The Project (one sentence)

A toy expense-categorization flow where an AI agent processes ~15–20 transactions, and its **confidence drives every visual beat** — how suggestions appear, how the agent activity feed reveals itself, and how accept / reject / reclassify feels in the hand.

The one-sentence test: motion is the honesty signal for AI acting on your money.

---

## Stack

- **Framework:** Next.js (App Router)
- **AI:** Vercel AI SDK + AI Gateway
- **Model for demo:** Pick one and tune against it (Claude or GPT-4-class). Gateway is infrastructure, not a feature.
- **Motion:** Motion (Framer Motion) or Motion One
- **Schema/validation:** Zod
- **Hosting:** Vercel
- **Language:** TypeScript, strict

---

## Scope Discipline

### In scope

- [ ] Paste or upload ~15–20 messy transaction descriptions
- [ ] Agent categorizes with a visible activity feed driven by real streaming output
- [ ] Each result arrives with a confidence value (0–1) that shapes its motion
- [ ] Low-confidence shimmers / hesitates; high-confidence snaps into place
- [ ] Accept single / accept-all-high-confidence / reclassify inline (diff-style)
- [ ] Full keyboard navigation with visible focus
- [ ] `prefers-reduced-motion` designed in from the start, not bolted on
- [ ] Motion on/off toggle on the live demo

### Out of scope (protect this list)

- [ ] Auth, accounts, saved state
- [ ] Real receipt / OCR parsing
- [ ] Dashboards, charts, "second screens"
- [ ] Multi-user, collaboration, comments
- [ ] A backend beyond the single API route

---

## Key Decisions Up Front

### Confidence signal

- [ ] Use `streamObject` with a Zod schema returning `{ transactionId, category, confidence: number, reasoning: string }` per item
- [ ] Confidence comes from the model via structured output — not logprobs
- [ ] `reasoning` field powers the agent activity feed for free
- [ ] Tune motion thresholds against one specific model; document which

### Streaming vs. atomic

- [ ] `streamObject` for the initial batch categorization (the activity feed IS the stream)
- [ ] `generateObject` for the reclassify-one-item flow (atomic, not streaming)
- [ ] Knowing which to use when is itself the craft signal

### Motion primitives (build in isolation first)

- [ ] `<ConfidenceText>` — your signature primitive, obsess over it
- [ ] `<AgentStep>` — one line in the activity feed
- [ ] `<DiffRow>` — the accept/reject/reclassify unit
- [ ] Everything else inherits from these three

---

## Week 1 — Design & Primitives

Goal: the **feel** is right before anything is wired to a real API.

- [ ] Low-fi flow on paper or Figma (one pass, don't linger)
- [ ] Next.js + AI SDK + Tailwind + Motion scaffolded
- [ ] `/playground` route that renders primitives against hard-coded mock data
- [ ] `<ConfidenceText>` with 3–5 confidence tiers and distinct motion personalities
- [ ] `<AgentStep>` with enter / active / done states
- [ ] `<DiffRow>` with hover, focus, accept, reject, reclassify states
- [ ] Reduced-motion variants for each primitive
- [ ] Color + type system locked (keep it tight — 2 fonts max, restrained palette)
- [ ] **Do not** wire real streaming yet

---

## Week 2 — The Flow

Goal: real API, real transactions, real interactions, end-to-end.

- [ ] API route using `streamObject` with Zod schema
- [ ] Sample dataset of 15–20 transactions (public data or hand-written)
- [ ] Activity feed renders from partial streamed objects (not simulated progress)
- [ ] Results list populates as stream arrives, using `<ConfidenceText>`
- [ ] Accept single item — smooth state transition
- [ ] Accept-all-high-confidence batch action
- [ ] Reclassify flow using `generateObject` (atomic replacement)
- [ ] Error + empty + loading states designed
- [ ] Full keyboard path through the whole flow
- [ ] Deploy an alpha to Vercel and use it yourself for a day

---

## Week 3 — Polish & Ship (buffer)

Goal: the details that separate this from "another AI demo."

- [ ] Accessibility audit: keyboard, focus order, ARIA labels, screen reader pass
- [ ] `prefers-reduced-motion` verified in browser DevTools
- [ ] Performance pass: check bundle size, Core Web Vitals, no layout shift
- [ ] Watch one or two people use it without you — write down every hesitation
- [ ] Fix the top 3 hesitations
- [ ] Motion on/off toggle working and prominent
- [ ] Copy pass on every label, empty state, and error message
- [ ] Favicon, OG image, page title, meta description
- [ ] Final deploy + custom domain if you have one

> If week 3 isn't enough, cut scope from week 2 — **never** cut the accessibility or polish pass.

---

## The Write-up

A short page (or README) that lives with the demo.

- [ ] One-paragraph problem statement
- [ ] 2–3 key decisions you made and why (confidence-via-schema, streamObject vs. generateObject, motion-as-trust-signal)
- [ ] A before / after or motion-on / motion-off moment, ideally a short video or GIF
- [ ] **Open disclosure of AI workflow** — which tools (Cursor, Claude Code), where they helped, where you had to steer
- [ ] One "what I'd do next" paragraph showing you know the artifact's limits

Length target: a reader can digest it in under 2 minutes.

---

## Pre-Launch Checklist

- [ ] Demo loads in under 2 seconds on a cold visit
- [ ] Works on mobile (even if not optimized for it, don't be broken)
- [ ] No console errors
- [ ] No API key leaked in client bundle
- [ ] Rate-limit or cap usage (someone will hammer it)
- [ ] Link to source on GitHub
- [ ] Your name and a way to contact you, on the page

---

## Failure Modes to Watch

- **Scope creep disguised as ambition.** Day 10, you want to add auth or a dashboard. That's the signal to stop adding and start polishing.
- **Wiring the real API too early.** If the mock version doesn't feel right, the real version won't either.
- **Motion tourism.** Every animation should earn its place. If you can't say what it communicates, delete it.
- **Hiding the AI workflow.** Ramp explicitly values this; burying it is a negative signal.
- **Polishing the wrong primitive.** `<ConfidenceText>` is the one that matters. Spend disproportionate time there.

---

## The Bar

A small artifact, executed at a level that makes someone stop scrolling, beats a bigger artifact executed at parity with everyone else applying.

One surface. One motion language. One decisive point of view.
