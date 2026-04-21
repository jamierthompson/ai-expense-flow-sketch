# Decision Log

Each entry captures one meaningful design call made during the sketching session. Format: context → options considered → decision → consequence. Ordered roughly chronologically; numbered for stable reference.

Use this doc (not the process-summary) when you need a sharp, scannable version of what was decided and why.

---

## 1. Keep the activity feed and results separate

**Context.** Early on, the question came up: should the agent activity feed and the results list be combined, or stay as two surfaces?

**Options.**

- **(a)** Single timeline where each line is either a process step _or_ a transaction result.
- **(b)** Keep them separate — feed = narrative, results = ledger.
- **(c)** Merge but give classify lines the affordances of a result row.

**Decision.** (b) — separate, but link them.

**Consequence.** Clear division of labor: the feed is for scanning the story, the results list is for taking action (accept / reclassify / flag / batch). Merging would force one component to do both jobs badly and kill the batch-accept interaction. Instead, the two surfaces reinforce each other through a hover-link (decision 3).

---

## 2. Make activity feed lines expandable to reveal reasoning

**Context.** The original plan named the activity feed as a core primitive but underspecified its contents. Needed a way to surface the agent's per-transaction reasoning without bloating the row.

**Options.**

- **(a)** Show reasoning inline on every line (too dense).
- **(b)** Show reasoning only in result row annotations (hidden from the narrative).
- **(c)** Expandable feed lines — click to reveal the detail for that step.

**Decision.** (c).

**Consequence.** Matches the plan's Claude-Code-inspired "expand any step to see what happened underneath." Reasoning lives in a single field on the streamed object and is rendered in both surfaces (feed detail + row annotation), so one source feeds two places.

---

## 3. Link feed and results via hover state

**Context.** Once feed and results were separate with linked content (same reasoning text in both), needed a way to reinforce the connection.

**Options.**

- **(a)** Explicit buttons ("jump to result") on each feed line.
- **(b)** Hover linking — hovering one highlights the matching item on the other.
- **(c)** Click-to-focus with a persistent selection.

**Decision.** (b).

**Consequence.** No extra UI needed — the two surfaces feel connected without a new component. In the real build this is where a subtle motion beat earns its place (it communicates "this outcome came from that thinking"). Works without motion because the background change is visible on its own.

---

## 4. Remove Reject as a standalone action

**Context.** Original plan had Accept / Reject / Reclassify as the three per-row actions. In the sketch, Reject dimmed the row — but the transaction still needed a category, so dimming was a dead end.

**Options.**

- **(a)** Keep Reject, route it to a "needs review" bucket.
- **(b)** Remove Reject; collapse into Reclassify (saying "not this" means "give me a different one").
- **(c)** Replace with an explicit "Skip / Decide Later" action.

**Decision.** (b).

**Consequence.** Cleaner action set. A suggestion is either right (Accept) or needs adjustment (Reclassify); there's no meaningful third state where you "just don't like it." The "needs review" case gets handled elsewhere (decision 8).

---

## 5. Reclassify preserves the agent's original guess as diff context

**Context.** First pass at the Reclassify panel showed a text input and chips — but wiped the agent's existing category header.

**Options.**

- **(a)** Clear the old category; user starts fresh.
- **(b)** Keep the old category visible (dimmed) above the input, as a blockquote: _"I thought this was X because Y (conf 0.NN)."_
- **(c)** Show the old category only in the feed.

**Decision.** (b).

**Consequence.** The correction becomes a diff, not a replacement. Matches the plan's "AI diff UI" goal — showing the change trustworthily. The user sees exactly what they're overriding and why the agent originally thought what it did. Also makes the original reasoning available as the frame for the user's correction.

---

## 6. Remove the "Remember" checkbox; default to remember with opt-out

**Context.** Initial implementation of the teaching moment had a "Remember this vendor → category" checkbox on the Reclassify panel.

**Options.**

- **(a)** Keep the checkbox (opt-in to remembering).
- **(b)** Remove the checkbox; always remember; expose a post-commit opt-out link.
- **(c)** Remove the checkbox; never remember automatically; require an explicit "save as rule" click.

**Decision.** (b) — remember by default, with a visible `just this one` link on the committed row.

**Consequence.** Faster flow (one less decision up front). More honest — when a user corrects something, the reasonable default is that the correction teaches. The `just this one` link keeps control without asking the user to predict the future at commit time.

---

## 7. Activity feed becomes a full audit trail, not just agent thinking

**Context.** Originally the feed logged agent activity only. Jamie's observation: _"I think that all actions (AI plus user) need to be tracked though in the log so there's an audit trail."_

**Options.**

- **(a)** Feed = agent only; separate user-action log.
- **(b)** Feed = everything (agent + user + learned commitments), with visual distinction via prefix columns.
- **(c)** Feed = agent + user toggle, but shown separately.

**Decision.** (b).

**Consequence.** One integrated timeline, one POV. Very Ramp-flavored — financial tools live and die by audit trails. Prefix column (`[AGENT]` / `[YOU]` / `[LEARNED]` / `[UNLEARNED]`) carries the distinction visually without segregating by surface. Sets up decision 12 (binary audit trail) cleanly.

---

## 8. Add Flag as a tertiary action with a structured reason picker

**Context.** After removing Reject, needed an escape hatch for "something's off here but I can't reclassify it" cases — needs receipt, personal charge, potential fraud, etc.

**Options.**

- **(a)** Flat "Needs review" flag with no reason.
- **(b)** Flag with structured reason chips + free-text "Other" option.
- **(c)** No flag at all; user leaves the flow to handle these manually.

**Decision.** (b).

**Consequence.** Route-to-review is explicit. The reason is structured for downstream work (review queue filtering, analytics, policy rules), but "Other" preserves the escape hatch. Later extended with "No fitting category" (decision 13).

---

## 9. Motion-off readability as a load-bearing rule

**Context.** Jamie's observation: _"We need to turn off motion in the real project, so the result of each action should be obvious regardless."_ This was called out mid-session, in response to the original commit confirmation being a quiet `↻` glyph.

**Options.**

- **(a)** Rely on motion + glyphs to signal state changes; make reduced-motion variants later.
- **(b)** Make every state change readable as plain text/layout first; motion layers polish on top.

**Decision.** (b). Locked in as a design rule for the rest of the session and the production build.

**Consequence.** Every state label became a visible word or sentence (`✓ Accepted`, `⚑ Ready for review`, `✓ Got it. Reclassified as Meals.`, `⚠ Low confidence`). Glyphs decorate but never carry the signal alone. `prefers-reduced-motion` now works by construction, not by retrofit. Also raised the bar on every subsequent design decision: "can this state be understood with motion off?" became a cheap, sharp test.

---

## 10. Add a review bucket as the flag destination

**Context.** Flag action left the row dimmed in place with no visible destination. Jamie's suggestion: _"Presents an opportunity to use motion to add it to a bucket icon."_

**Options.**

- **(a)** Flagged rows disappear from the results list, appear only in the bucket.
- **(b)** Flagged rows stay in place (compressed state) + a persistent bucket counter in the Results header, expandable to show flagged items.
- **(c)** Bucket as a separate full-page destination.

**Decision.** (b).

**Consequence.** Bucket is a summary + motion destination, not a relocation. Undo-in-context is preserved because the row stays visible. Count is load-bearing (readable without motion); arc-to-bucket motion is the polish layer. List doesn't jump around mid-flow.

---

## 11. No submit ceremony — chip click is commit; Enter is commit; universal undo

**Context.** Initial panels had submit/cancel buttons. Jamie's observation: _"Do we actually need 'submit' and 'cancel' buttons? Could selecting an option automatically 'submit'?"_

**Options.**

- **(a)** Keep explicit submit/cancel for safety.
- **(b)** Chip click = commit; text input commits on Enter or visible `✓` button; `cancel` becomes a text link; Escape cancels.
- **(c)** Chip click = select; explicit submit button remains.

**Decision.** (b).

**Consequence.** One-click commits for the fast path. Free text still has an explicit commit signal (Enter or ✓). Universal undo replaces the "guard me from myself" argument for submit buttons — the cost of a mistap is one undo click, not a form resubmit. Feels like triage, not paperwork, which is correct for this flow.

---

## 12. Binary audit trail — every action has a matching inverse verb

**Context.** Jamie: _"Can you make the top-line message in the activity log binary? Change 'You undid ...' to 'You unclassified ...'. I'm getting confused trying to make sure we've covered all edge cases, so let's make it explicit for now."_

**Options.**

- **(a)** Keep a generic "You undid: …" label for all undo actions.
- **(b)** Use action-specific inverse verbs: unaccepted, unclassified, unflagged; Learned / Unlearned for commitments.
- **(c)** Put action/undo in a single entry with sub-details.

**Decision.** (b).

**Consequence.** Each state change emits a feed entry whose verb tells you exactly what happened and what was undone. Learn/unlearn commitments render in bold with distinct prefixes (`[LEARNED]` / `[UNLEARNED]`). Reclassify-with-rule emits two lines on commit (`You reclassified` + `Learned`) and two matching lines on undo (`You unclassified` + `Unlearned`). Edge cases become self-checking: if an action can't produce a meaningful inverse, that's the signal that something's wrong with the design.

---

## 13. Handle model uncertainty with a dedicated row layout + one-click flag

**Context.** Jamie's observation: the current fallback to "Uncategorized" was silent when the model couldn't confidently map a user's reclassify text. Asked about adding a category on the fly, which led to examining how this product class handles unknowns.

**Options.**

- **(a)** Allow users to add categories on the fly (fintech anti-pattern — categories map to chart of accounts).
- **(b)** Silently commit to Uncategorized.
- **(c)** Commit to Uncategorized at low confidence, but surface the uncertainty visibly with a one-click Flag-as-"No fitting category" escape hatch.

**Decision.** (c). Added "No fitting category" as a new flag reason.

**Consequence.** Directly on-thesis — the agent doesn't pretend to be confident when it isn't. "Uncategorized" stays as a legitimate category (real uncategorized spend exists) but it's no longer the silent default for "model is unsure." Reinforced by dedicated layout (decision 14). Matches how this product class actually works (admin-managed categories, escape hatch to review).

---

## 14. Dedicated layouts per committed state

**Context.** Jamie's feedback on the uncertain-reclassify state: _"There's too many options shown at once on the one line item."_ Then on the confident reclassify: _"Now let's remove the accept, reclassify, and flag buttons when ✓ Got it. Reclassified as Software. is shown."_

**Options.**

- **(a)** Show the same three action buttons (accept / reclassify / flag) in every row state.
- **(b)** Focused layouts per state: only the actions that make sense for the current commit.

**Decision.** (b).

**Consequence.** Pending has the three action buttons. Accepted shows only `undo`. Flagged shows only `undo`. Reclassified (confident) shows only `undo` + the teaching commitment line. Uncertain-reclassified has its own focused block with just `Flag as "No fitting category"` and `undo`. Every state shows only the controls that matter — redundant noise scoped out.

---

## 15. Disable the current category in the reclassify chip list

**Context.** Nothing stopped a user from reclassifying an item as its current category (a no-op).

**Options.**

- **(a)** Allow the click; just treat it as no-op.
- **(b)** Hide the chip matching the current category.
- **(c)** Show the chip but disable it with visible strikethrough + tooltip.

**Decision.** (c).

**Consequence.** Users see the full category set (useful for orientation) but can't commit a no-op. Hiding it would make the chip list shift as categories change, which would be more disorienting. The strikethrough carries the "not available" meaning without motion.

---

## Pattern observations

A few patterns emerged across decisions that are worth keeping separate from any single call:

- **Motion-off readability (decision 9)** became a lens applied to every subsequent decision. "Does this read without motion?" was a cheap test that kept the interaction honest.
- **Binary audit trail (decision 12)** became a self-checking invariant. Every new feature proposal could be sanity-checked by asking: "what's its inverse? how is it logged?"
- **Dedicated layouts per state (decision 14)** came late but could have informed earlier decisions — the "accepted row" was always too cluttered; the cleanup was obvious in retrospect.
- **Scope discipline held.** Several times the conversation touched potential additions (add-category-on-fly, dispute routing, admin flows) — each was deflected back to the core flow or to the Flag escape hatch. Protected the "one surface, one motion language, one POV" bar.
