# AI Expense Flow — Low-Fi Sketch

A working, deliberately rough wireframe of an AI-assisted expense-categorization flow. Built to answer one question: _does the shape of this interaction — agent thinking → confidence-driven results → human override — hold up under real use?_

The answer is a sketch you can click through, not a static mockup.

**Live demo:** [ai-expense-flow-sketch.vercel.app](https://ai-expense-flow-sketch.vercel.app)

## What this is

An exploration of the design problem: **an AI agent does something with your money; motion and transparency are what make it OK to let it run.**

- Paste 8 messy transaction descriptions
- A simulated agent streams its thinking into an activity feed
- Results appear with confidence values, then:
  - Accept single / accept all high-confidence
  - Reclassify with natural language or category chips (agent acknowledges what it learned)
  - Flag to a review bucket with a structured reason
- Every state change is readable as plain text — motion layers polish on top, but never carries the signal alone

The sketch models the problem space exemplified by modern fintech expense-management tools: admin-managed categories, audit trails as a first-class concern, AI-assisted workflows with transparent human override.

## What this is NOT

- Not a production app. No real AI, no real API, no real styling system.
- Not a Figma-polished mockup. Everything is monospace, dashed borders, greyscale — intentionally rough so the conversation stays on structure and interaction rather than visual polish.
- Not the final artifact. See [`docs/ramp-portfolio-plan-v2.md`](./docs/ramp-portfolio-plan-v2.md) for the production build plan that this sketch informed.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router)
- [React 19](https://react.dev)
- [TypeScript](https://www.typescriptlang.org) — strict
- [Tailwind CSS](https://tailwindcss.com)
- No motion library yet — annotations in the code mark where motion beats belong

## Getting started

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## How to explore

1. Click **Run**. Watch the activity feed populate, then the results fill in.
2. Click any `▸` chevron in the activity feed to expand a line and read the agent's reasoning for that step.
3. Hover a classify line in the feed — the matching result row highlights. Hover a result row — the linked feed line highlights.
4. On a pending result row, try each action:
   - **accept** → row collapses to `✓ Accepted` with an undo link
   - **reclassify** → inline panel preserves the agent's original guess, text input + category chips, ✓ commit button or Enter
   - **⚑ flag** → reason picker; flagged items appear in the review bucket (top-right of Results)
5. Try reclassifying with text the model can't confidently map (e.g. _"employee birthday decorations"_) to see the `⚠ Low confidence` handling and the one-click `Flag as "No fitting category"` action.
6. Scroll the activity feed after any action — every state change is recorded with a binary inverse (`You reclassified` / `You unclassified`, `Learned` / `Unlearned`, etc.).

## Documentation

Inside [`docs/`](./docs/):

- [`user-flow.md`](./docs/user-flow.md) — full prose walkthrough of the interaction model, every state, every reversal.
- [`decisions.md`](./docs/decisions.md) — decision log (ADR-style). Each major design call with context, options considered, decision, and consequence.
- [`open-questions.md`](./docs/open-questions.md) — what the sketch deliberately didn't answer. TODO list for the production build.
- [`ramp-portfolio-plan-v2.md`](./docs/ramp-portfolio-plan-v2.md) — the revised production build plan informed by the sketch.
- [`ramp-portfolio-plan-original.md`](./docs/ramp-portfolio-plan-original.md) — the original plan before the sketching session (preserved as audit trail).
- [`process-summary.md`](./docs/process-summary.md) — chronological record of the design conversation that produced this sketch.

## Design principles

Six principles that emerged through the sketching session, in the order they surfaced:

1. **Feed and results are linked but separate.** One integrated audit trail; two components that reinforce each other via hover.
2. **Expand-to-reveal reasoning.** Every feed line can show the agent's thinking or user action detail.
3. **Motion-off readability is load-bearing.** Text and layout carry every signal. `prefers-reduced-motion` works by construction, not by retrofit.
4. **Universal undo, no submit ceremony.** Chip click = commit. Enter = commit. Every committed state has a visible reversal link.
5. **Dedicated layouts per state.** Pending has action buttons; committed states show only the actions that make sense for that state.
6. **Binary audit trail.** Every action and every commitment has a matching inverse with a specific verb.

## License

MIT — see [`LICENSE`](./LICENSE).
