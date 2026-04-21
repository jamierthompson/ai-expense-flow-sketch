# User Flow & Functionality

A prose description of the interaction model the low-fi sketch implements. Every state, every action, every reversal. Written so it can stand alone as a functional spec or be lifted into a case study.

---

## Overview

The sketch is a single-page flow that simulates an AI agent categorizing ~8 messy transaction descriptions. It exists to answer one question: _does the shape of the flow — input → agent thinking → results → human action — make sense before we wire real AI and design motion?_

Styling is intentionally rough (monospace, dashed borders, greyscale) so that the conversation stays on structure and interaction rather than visual polish.

---

## The four sections, top to bottom

### 1. Input

- Pre-filled textarea with 8 mock transaction descriptions.
- A single **Run** button triggers a fake stream.
- On **Run**, the activity feed and results both start populating.
- After a Run completes, the button relabels to **Run again** and is clickable.

### 2. Activity feed (audit trail)

The agent's thinking _and_ the user's actions, interleaved in chronological order.

Three entry kinds, each with a prefix column so they're scannable:

- `[AGENT]` — process steps (reading, matching) and per-transaction classifications.
- `[YOU]` — user actions (accept, unaccept, reclassify, unclassify, flag, unflag).
- `[LEARNED]` / `[UNLEARNED]` — agent-authored commitments (vendor→category rules learned and unlearned).

Every line is expandable via a `▸` chevron — click to reveal the detail (the agent's reasoning on classify lines, specifics of a user action, what a rule means on commitment lines).

Classify, user, learned, and unlearned lines are linked to a transaction. Hovering them highlights the matching result row below (and vice versa).

### 3. Results

One row per transaction. When the stream finishes, two additional surfaces appear above the list:

- **Accept all high-confidence** batch button (accepts everything ≥ 0.9 confidence).
- **⚑ Review bucket** on the top right — a counter that increments as items are flagged. Click to expand an inline list of flagged items with per-item unflag.

Every row occupies one of six states. State transitions are logged in the feed.

### 4. Notes for the real build

Static list of design decisions pinned at the bottom for reference when implementing the production version.

---

## Row states

### State: Pending

The starting state of every row once the stream lands its classification.

Shows:

- Transaction description
- `→ [category]` with a dimmed annotation `[conf 0.97 / high — reasoning text]`

Actions on the right:

- `accept`
- `reclassify`
- `⚑ flag`

### State: Accepted

Compact confirmed state.

Shows:

- `✓ Accepted` label (visible word, not just a glyph)
- `description → category`
- `undo` link

Reversing: `undo` returns to **Pending**. Feed appends `[YOU] You unaccepted: …`

### State: Reclassifying (panel open)

When the user clicks `reclassify`, the row flips to an inline panel.

Panel contents:

- Transaction description (bold header)
- A dimmed blockquote preserving the agent's original guess: _"I thought this was **Office Supplies** because _amazon — ambiguous without items_ (conf 0.61)."_
- Heading: _What is this actually?_
- Text input with an inline `✓` commit button on its right (disabled until there's text). `Enter` also commits.
- Annotation explaining that text → model infers a category via `generateObject`.
- _— or pick one directly —_
- Category chips (Meals, Travel, Software, Office Supplies, Rent, Uncategorized). The chip matching the row's current category is **disabled with strikethrough** — you can't reclassify as the same thing.
- `cancel` text link + Escape key.

Three commit paths:

- **Chip click** → instant commit (no submit button). Any current text goes along as context.
- **Text + ✓ or Enter** → model-inferred path. Text drives the new category.
- **Cancel / Escape** → closes panel, returns to Pending.

### State: Reclassified (confident)

Dedicated layout — no accept / reclassify / flag buttons. A reclassify IS a commit; those actions would be redundant noise.

Shows:

- `✓ Got it. Reclassified as [category].` with `undo` link next to it
- Transaction description
- `→ [category]` with dimmed annotation `[conf 0.95 — reasoning]`
- **Teaching commitment line** (two variants):
  - When rule is kept: _"I'll remember **[vendor]** → [category] next time._ `just this one`_"_
  - After `just this one` is clicked: _"Scoped to this transaction only. No vendor rule saved._ `undo`_"_

Reversing:

- Top-level `undo` → returns to **Pending** (agent's original guess). If a rule was active, it's also dropped. Feed appends `[YOU] You unclassified: …` and `[UNLEARNED] Unlearned: vendor → category`.
- `just this one` → unlearns the rule but keeps the reclassification. Feed appends `[UNLEARNED] Unlearned: vendor → category`.
- `undo` next to "Scoped to this transaction only…" → re-learns the rule. Feed appends `[LEARNED] Learned: vendor → category`.

### State: Reclassified (uncertain)

When the model couldn't confidently map the user's text (confidence < 0.6), the row gets a different, focused layout. The commit "didn't really succeed," so the usual confirmation + action buttons would be misleading.

Shows:

- Transaction description
- A bordered block containing:
  - `⚠ Low confidence (0.40)`
  - _"I couldn't map your note to a known category. Nothing learned, no vendor rule saved."_
  - Two inline links: `Flag as "No fitting category"` | `undo`
  - Motion annotation (for the real build: shimmer/hesitate)

Reversing:

- `Flag as "No fitting category"` → direct transition to **Flagged** with that reason, skipping the flag panel. Bucket count increments.
- `undo` → returns to **Pending**.

**No teaching commitment** appears in this state — we don't learn from a low-confidence guess.

### State: Flagging (panel open)

When the user clicks `⚑ flag`, the row flips to an inline panel.

Panel contents:

- `⚑ description` (bold header)
- Annotation explaining flag routes to review; doesn't reclassify.
- Heading: _What's the issue?_
- Reason chips: Needs receipt, Personal charge, Potential fraud, Route to manager, No fitting category, Other.
- `Other` reveals a text input with its own `✓` button + Enter support.
- `cancel` text link + Escape key.

Commit paths:

- **Any chip except Other** → instant commit with that reason.
- **Other → type note → ✓ or Enter** → commit with reason "Other" and the note.

### State: Flagged

Compact routed-for-review state.

Shows:

- `⚑ Ready for review` label
- `description — reason[: note]`
- `undo` link
- Small motion annotation below, explicitly marked as a wireframe design note

Reversing: `undo` returns to **Pending**, bucket count decrements. Feed appends `[YOU] You unflagged: …`.

---

## Cross-cutting mechanics

### The binary audit trail

Every user action and every agent commitment has a matching inverse in the feed. Specific verbs — not a generic "undid" — make the log scannable:

| Action           | Inverse                         |
| ---------------- | ------------------------------- |
| You accepted     | You unaccepted                  |
| You reclassified | You unclassified                |
| You flagged      | You unflagged                   |
| Learned          | Unlearned                       |

Example: reclassifying with a rule produces two lines (`You reclassified` + `Learned`). Top-undo produces two matching inverse lines (`You unclassified` + `Unlearned`). Binary in, binary out.

### Feed ⇄ results hover link

Hovering a classify / user / learned / unlearned feed line highlights the matching result row. Hovering a result row highlights all matching feed lines. The highlight is a soft `bg-stone-200`; in the real build this is where the motion beat earns its place (it reinforces "this outcome came from that thinking" without extra UI).

### Motion-off readability (load-bearing rule)

Every state label is a visible word or full sentence — `✓ Accepted`, `⚑ Ready for review`, `✓ Got it. Reclassified as Meals.`, `⚠ Low confidence (0.40)`, `— or pick one directly —`. Glyphs (`✓`, `⚑`, `↻`, `▸`) decorate but never carry the signal alone. Motion layers polish on top of text that already tells the truth.

### Commit model (no submit ceremony)

There are no **submit** buttons. Chip click = commit. Enter in a text input = commit. A `✓` icon button next to text inputs is the visible affordance for mouse users. Submit ceremony is replaced by universal undo — every commitment has a visible reversal link, so the cost of a mistap is one click.

### Review bucket as motion destination

The `⚑ Review bucket [N]` counter appears as soon as the stream produces its first result. Flagging a transaction:

1. Row compresses to `⚑ Ready for review`.
2. (Motion beat for real build) a ghost of the row arcs toward the bucket.
3. Count ticks up.

With motion off, the count simply changes — still readable. The bucket is a summary view, not a relocation: flagged rows stay in place so undo-in-context works.

---

## What's _not_ in the sketch (intentionally)

- No real streaming (setTimeouts mock it).
- No real model calls (`generateObject` / `streamObject` are named in annotations but not wired).
- No motion library yet — only hover-based greys. Motion beats are annotated, not implemented.
- No auth, persistence, or multi-user state.
- No styling system — intentionally rough so we stay focused on flow, not polish.
