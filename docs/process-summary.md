# Process Summary — Low-Fi Sketch Session

A chronological record of the design conversation that produced the sketch. Written so it can be quoted or paraphrased in a case study later, with specifics of what was tried, what was kept, what was cut, and why.

---

## The original ask

The conversation started from a plan document (`ramp-portfolio-plan-original.md`) describing a toy expense-categorization flow where AI confidence drives every visual beat — with motion as the "honesty signal" for AI acting on money.

The plan was strong on thesis and stack, but thin on interaction decisions. Week 1 called for "a low-fi flow on paper or Figma." The problem: paper doesn't rough out interactivity, and Figma is slow for state-heavy flows.

Opening ask to the AI collaborator:

> "I'm having trouble visualizing this project. I'm on Week 1, Low-fi flow. Let's create a new Next.js project in this folder. It will be a throw-away project, so no branching, tests, API calls, etc. I just need help visualizing this project, and then I'll start a fresh Next.js project to do the work for real. Paper doesn't work for me and Figma is slow."

The throw-away framing was important: the goal was to answer "does the flow shape make sense?" — not to build production UI.

---

## Phase 1 — Scaffolding and the baseline sketch

- Scaffolded a Next.js 16 + Tailwind app in a `lofi-sketch/` subfolder.
- Deliberately rough styling: monospace, dashed borders, greyscale only — to keep focus on structure and not accidentally design the real thing in the throwaway.
- Built a single-page layout with four sections: Input, Activity feed, Results, Notes.
- Mock data: 8 transactions, 8 classifications with confidence + reasoning, ~11 activity lines.
- Fake stream using `setTimeout` (activity lines every 350ms; results offset by 700ms).
- Per-row actions: `accept`, `reject`, `reclassify`.
- Annotations in `[brackets]` throughout for where real motion would go.

**Decision locked in:** motion annotations live in the wireframe, but no motion library yet. Text and layout should carry the signal; motion is layered on later.

---

## Phase 2 — Activity feed and results: separate or combined?

User thought aloud: _"Should the Agent Activity Feed and Results be combined somehow? Or should the line items in Agent Activity Feed expand — show reasoning?"_

**Analysis:** The original plan's description of the activity feed named "expand any step to see what happened underneath" as a core behavior (analogous to what Claude Code does in a terminal). That directly maps to **expandable lines with reasoning**.

**Decision:**

- Keep feed and results **separate**. Feed = narrative (what the agent did). Results = ledger (what the user acts on).
- **Expand activity feed lines** to reveal the model's thinking for each classify step. Same reasoning text flows into the result row annotation — one source, two surfaces.
- **Link them with hover state.** Hovering a classify line highlights the matching result row, and vice versa. Reinforces "this outcome came from that thinking" — and it's a motion beat worth earning.

---

## Phase 3 — Collapsing the action set: Reject → Reclassify

User observation: _"Rejecting currently dims the line item, but then what? Doesn't the transaction still need to be classified? Is 'reject' needed? What happens on 'reclassify'?"_

**Analysis:** Reject with no replacement is limbo. The transaction still needs a category. Saying "this isn't Office Supplies" is saying "give me a different category." That's Reclassify.

**Decisions:**

- **Remove Reject as a standalone action.** Collapse into Reclassify.
- **Reclassify opens an inline panel** with both a natural-language text box and category chips. Text input enables a richer `generateObject` call; chips provide the fast path.
- **Flag added as a tertiary action** for "something's off but I don't know the category" cases — structured reason picker (Needs receipt, Personal charge, Potential fraud, Route to manager, Other).

**Primary actions settle at: Accept / Reclassify / Flag.**

---

## Phase 4 — The teaching moment

User: _"When the AI gets it wrong, how could we add a teaching moment that simulates feeding back into the model?"_

**Analysis:** The plan said `generateObject` for reclassify but treated it as one-shot. A richer story is that the correction can teach the agent, which is directly on-thesis: "motion is the honesty signal for AI acting on your money" extends naturally to "and when it's wrong, you can see it learn."

**Several options considered:**

- Per-correction "Remember?" checkbox
- A separate "Lessons learned" panel
- A "Learned:" line added to the activity feed after corrections
- An "apply to similar" bulk action within the batch

**Decision:** A **Learned:** line appears in the activity feed after the reclassify — paired with an opt-in checkbox on the reclassify panel. Same surface, same POV — the activity feed is the system-of-record for agent memory as well as agent thinking. Motion beat: the feed adds a line after the user's correction, a tiny "I heard you."

---

## Phase 5 — Reclassify as diff, not replacement

User observation: _"For reclassify, let's try this: don't remove the old category, instead say something like 'I thought it was X because Y. What is this actually?' Then after the user selects another category there needs to be feedback somehow like 'Got it. Reclassified as Z.'"_

Also: _"Do we really need the 'Remember' checkbox?"_

And: _"I also don't think that pinning 'Learned..' in the activity feed is enough since your attention is now on the results."_

And critically: _"I also don't think motion can carry the load — motion off needs to still be obvious."_

**Decisions (these set the rules for everything that followed):**

1. **Reclassify panel preserves the agent's original guess as context.** A dimmed blockquote: _"I thought this was X because Y (conf 0.NN)."_ The correction is a diff, not a replacement.

2. **Explicit post-commit confirmation.** `✓ Got it. Reclassified as X.` as a visible bolded line. Readable as text, not just as the row re-rendering with a `↻` glyph.

3. **Remember checkbox removed.** Replaced with default-on + visible opt-out via a `just this one` link on the row. Commit first, correct the commitment if needed. Closer to how a real teaching moment works.

4. **Teaching commitment lives in-place on the row.** `I'll remember AMZN Mktp US → Meals next time. [just this one]` — attention is on the row after a reclassify, so the confirmation of what was learned belongs there, not only in the feed.

5. **Activity feed becomes a full audit trail.** Not just agent thinking — all user actions logged too. Three prefix columns: `[AGENT]`, `[YOU]`, `[LEARNED]`. One integrated timeline, one POV.

6. **Motion-off readability locked in as a design rule.** Every state change must be readable as plain text first. Motion layers polish; it never carries the signal alone. This single rule became the discipline that prevented "motion tourism" later.

---

## Phase 6 — The review bucket as motion destination

User: _"The 'Routed to review bucket' presents an opportunity to use motion to add it to a bucket icon. You think?"_

**Analysis:** Good instinct. A bucket gives flag actions a real destination, a visible count that grows, and a natural motion beat ("item flies to bucket") — while still reading clean without motion because the number changes.

**Decision:**

- Persistent `⚑ Review bucket [N]` counter in the Results section header, visible as soon as the stream starts producing results.
- Click to expand → inline list of flagged items with per-item `unflag`.
- **Flagged rows stay in place** (compressed to `⚑ Ready for review`), bucket is a summary + motion destination, not a relocation. Preserves undo-in-context.

User flagged that the flagged row's annotation `[routed to review bucket]` was doubling as state text — violating the motion-off rule we'd just locked in. Fix: state label becomes `⚑ Ready for review` (describes the state, not just the past action); motion annotation moved to a separate line explicitly marked as a wireframe note.

---

## Phase 7 — Cutting submit/cancel ceremony

User: _"Do we actually need 'submit' and 'cancel' buttons in the traditional sense? Or could selecting an option automatically 'submit' with clear cancel/undo options?"_

**Analysis:** Chip click is already a commitment signal; the submit button is a double-tap. Undo is universal, so the "guard me from myself" argument is weak. This is triage, not paperwork.

**Nuances:**

- Free text needs an explicit commit signal. **Enter key** is the natural answer.
- Chip + text together should still work — clicking a chip while text is in the input submits both as context.
- Cancel still needs to exist but doesn't need to be a button — a text link + Escape key suffices.

User added: _"We should probably have a visual commit button (as well as Enter key). Something like a checkmark icon on the far-right side of the input."_

**Decision:**

- Submit/cancel buttons removed from both Reclassify and Flag panels.
- Chip click = commit.
- Text input gets a `✓` icon button on its right (disabled until text exists). Enter also commits.
- `cancel` is a small text link with "[Esc also cancels]" annotation.

---

## Phase 8 — Handling the "either/or vs both" question

User asked if text input and chips should be either/or, noting that currently typing random text silently falls to Uncategorized.

**Analysis:** Both should work — they do different things.

- **Chip alone** = fast commit
- **Text alone** = let the model figure it out (`generateObject` reads text, infers category)
- **Chip + text** = user constrains category; text becomes reasoning context

The silent fallback to Uncategorized was the real bug — in the real build, text goes to the model, not to a regex. User observation led to the next phase.

---

## Phase 9 — Focused layouts for committed states

User: _"Now let's remove '✓ Got it. Reclassified as Uncategorized. undo' and the accept, reclassify, and flag buttons when the 'Couldn't map ... with confidence.' message is displayed. Right now, there's too many options shown at once."_

**Analysis:** Strong simplification instinct. The uncertain reclassify state shouldn't look like a successful commit with warnings layered on. The commit "didn't really succeed," so the UI shouldn't pretend it did.

**Decision:** Carved out **dedicated layouts per commit state.**

- **Uncertain reclassify** — focused block: `⚠ Low confidence (0.40)` + _"I couldn't map your note..."_ + two actions: `Flag as "No fitting category"` | `undo`. No confirmation line, no action buttons.

User followed up: _"Same thing with the '✓ Got it. Reclassified as Software.' state. Remove the accept, reclassify, and flag buttons."_

- **Confident reclassify** — dedicated layout with the `✓ Got it.` confirmation + `undo`, the category + reasoning line, and the teaching commitment line (`I'll remember…` with `just this one`). No redundant action buttons.

Reclassify IS a commit; offering accept/reclassify/flag after the fact is noise. The user can `undo` to return to pending if they need to change approach.

---

## Phase 10 — The binary audit trail

Edge-case handling request: _"If you undo back to the original classification, we need to clear the scope correction (if present). If you click 'just this one', we need an undo after 'Scoped to this transaction only. No vendor rule saved.'"_

Then: _"Can you make the top-line message in the activity log binary? 'You reclassified: ...' is good, so change 'You undid ...' to 'You unclassified ...'. And 'Learned: ...' is good, so change 'You scoped the correction ...' to something like 'I've unlearned ...'. I'm just getting confused trying to make sure we've covered all edge cases, so let's make it explicit for now."_

**Decision (big one):**

- Every user action gets an inverse-verb label: `You accepted / unaccepted`, `You reclassified / unclassified`, `You flagged / unflagged`.
- Every agent commitment has a pair: `Learned: X → Y` / `Unlearned: X → Y`, rendered with distinct `[LEARNED]` / `[UNLEARNED]` prefixes, both bold.
- **Reclassify with a rule emits two lines** (`You reclassified` + `Learned`). **Top-undo emits the matching two lines** (`You unclassified` + `Unlearned`). Binary in, binary out.
- `just this one` emits a single `Unlearned: X → Y` (agent voice, paired with the original `Learned`).
- Undo of `just this one` emits `Learned: X → Y` again.

This rule — the "binary audit trail" invariant — made every edge case self-checking. If an action happens without its inverse being recordable, something's wrong.

---

## Phase 11 — Current category chip disabled

Small final polish: _"Let's disable the current category in the chip list. For example, if an item is classified as Travel, and shouldn't be able to reclassify it as Travel."_

**Decision:** The chip matching the row's current category is disabled, struck through, with a tooltip "Already classified as X." Prevents no-op reclassifies.

---

## Design principles that emerged

Six principles locked in during the session, in the order they surfaced:

1. **Feed ⇄ results are linked but separate.** One integrated audit trail as a surface; two components that reinforce each other via hover.
2. **Expand-to-reveal reasoning.** Every feed line can show the agent's thinking or user action detail. Reuses the Claude Code mental model.
3. **Motion-off readability is load-bearing.** Text and layout carry every signal; motion adds polish. `prefers-reduced-motion` works by construction.
4. **Universal undo, no submit ceremony.** Chip click = commit. Enter = commit. Every committed state has a visible reversal link.
5. **Dedicated layouts per state.** Pending has action buttons; committed states (accepted, reclassified, flagged, uncertain-reclassified) show only the actions that make sense for that state.
6. **Binary audit trail.** Every action and every commitment has a matching inverse, with specific verbs and visual prefix columns. Edge cases become self-obvious.

---

## What this sketch proved

1. The plan's thesis (confidence-driven motion as the honesty signal) holds up under real interaction pressure.
2. The activity feed is much more than a progress indicator — it's the system-of-record for the whole session, and the teaching moment lives there.
3. Motion-off readability isn't a constraint, it's a clarifier — once we committed to it, interaction decisions got sharper because we had to name what each state actually _meant_.
4. The reclassify interaction is the richest surface for the "AI diff UI" idea: original guess preserved, user steering captured, model reconsidering, confidence re-surfaced, rule learned and undoable. Worth disproportionate design attention in the real build.

---

## The workflow itself

The session modelled the collaboration pattern described in target-role job descriptions for this kind of design engineer work:

- Work started in an LLM conversation to clarify intent and scope, not in a design tool.
- Iterated via a working code sketch rather than paper or Figma — interaction feel validated by use, not imagination.
- Every iteration was grounded in a concrete user question ("does the agent feed need to combine with results?", "is reject needed?", "does this work motion-off?") — not in a pre-planned feature list.
- Design principles were extracted as the work produced them, not imposed up front.

This document is the audit trail of that process.
