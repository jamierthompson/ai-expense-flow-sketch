# Open Questions & Loose Ends

Things the low-fi sketch deliberately did not answer. Captured here so they're visible — both as a TODO list for the production build and as an honest acknowledgment of what's unresolved.

Grouped by theme.

---

## Motion specification

The sketch annotates _where_ motion beats belong but not _what_ they look like. Concrete timing and easing decisions still need to be made.

- [ ] **Confidence tier timings.** What are the specific durations and easing curves for high / medium / low? E.g., does "shimmer" mean a 2s oscillation at low amplitude, or a single shake? Pick against a specific model (Claude or GPT-4-class) and tune.
- [ ] **`<ConfidenceText>` character-level behavior.** Does each token arrive individually, or do words arrive as units? What happens if a token is highly likely vs highly unlikely? (Note: the plan says confidence comes from the model-returned field, not logprobs — so this is one value per result, not per token. But the _rendering_ of that value could still be character-level.)
- [ ] **Activity feed line arrival.** Slide in? Fade? Both? Does the cursor/caret behavior differ for the currently-streaming line?
- [ ] **Accept collapse.** Duration of the row compression. Does the row visually "slide down" into a footer, or just compact in place?
- [ ] **Reclassify flip.** How does the pending row visually transform into the reclassify panel? Rotation? Fade+scale? What's the reverse beat on cancel?
- [ ] **Review bucket arc.** Path and easing for the ghost of a flagged row flying to the bucket. Bezier? Spring? Count increment beat (scale pulse? number morph?).
- [ ] **Teaching-moment "Learned" line entrance.** Should it highlight differently when it first appears, to signal it's a commitment and not a pedestrian log line?

## Color + type system

The sketch is intentionally greyscale + monospace. The real build needs a tight, restrained palette. **Keep it tight — 2 fonts max.**

- [ ] Primary / secondary / accent colors. Usage map (e.g., what color is confidence shown in, if any? What color is the confidence warning box?).
- [ ] Body typeface + display typeface.
- [ ] Confidence tier visual encoding beyond motion: different weight? different color? (Risk: this starts layering signals in a way that breaks the "motion-off readable" rule — careful.)
- [ ] Flag reason visual treatment — do reasons carry a tiny icon, a color, or just text?

## Copy

Every label, state name, error message.

- [ ] **State labels** — the sketch uses `✓ Accepted`, `⚑ Ready for review`, `✓ Got it. Reclassified as X.`, `⚠ Low confidence`. Are these right for production? Alternative verbs to consider: "Confirmed," "Sent for review," "Marked for review," "Updated."
- [ ] **"Just this one"** — is this phrasing clear enough to first-time users? Alternatives: "Only this transaction", "Don't save a rule", "Apply once."
- [ ] **"I thought this was X because Y. What is this actually?"** — the reclassify frame. First-person phrasing from the agent. Do we keep the anthropomorphism, or move to neutral ("Previous category: X (reason: Y). New category:")? Trade-off: personality vs. clinical neutrality. Probably keep — it reinforces trust and matches the overall tone.
- [ ] **Low-confidence copy** — "I couldn't map your note to a known category" is honest but could be clearer. Alternatives: "No match found for your note. Flag for review?" Or softer: "I wasn't able to find a good fit."
- [ ] **Feed entry labels** — binary verbs are locked in (unaccepted, unclassified, unflagged). Is there a shorter form for the common case? Keep for now; iterate after user testing.

## Keyboard + accessibility

The sketch has Enter and Escape in the panels. Full keyboard navigation is a Week 2 task but the rules should be specified now.

- [ ] **Tab order for a pending row** — description text, then accept → reclassify → flag?
- [ ] **Tab order across rows** — left-to-right then down, or row-then-actions-then-row?
- [ ] **Activity feed keyboard access** — Enter to expand/collapse? Arrow keys to navigate between lines?
- [ ] **Focus visible styling** — what does focus look like across all three (panel, pending row, feed line)?
- [ ] **ARIA labels for the confidence values** — does a screen reader announce "Meals, 97% confidence" or just "Meals"?
- [ ] **Screen reader handling of the activity feed stream** — do new lines announce? Polite or assertive?
- [ ] **Focus trap / restore for the reclassify and flag panels** — open focuses the input; close returns focus to the triggering action button.
- [ ] **Keyboard shortcut for Accept all high-confidence** — worth offering? (e.g., A key)

## Mobile / responsive

Not a primary target per the plan ("Works on mobile (even if not optimized for it, don't be broken)"), but there are layout questions.

- [ ] **Row action buttons** — too wide on small screens? Stack vertically? Icon-only?
- [ ] **Reclassify panel** — text input + chips flow OK at 375px wide? Chip wrap behavior?
- [ ] **Review bucket positioning** — top-right sticky on mobile, or moves?
- [ ] **Activity feed expandable detail** — still readable at small widths?

## Interaction edge cases not yet explored

- [ ] **Batch reclassify.** If three Amazon transactions are pending and you reclassify one as Meals with Remember on, should a prompt offer to apply the new rule to the other two _in this batch_? Ramp-flavored move. Could be a follow-up after the single reclassify commits.
- [ ] **Conflicting rules.** What if the user has already learned "AMZN Mktp → Office Supplies" and then reclassifies another Amazon as Meals with Remember on? Which rule wins? Offer to update? Warn?
- [ ] **Model retry.** Low-confidence reclassify has `Flag` and `undo`. Should it also have `try again` (call `generateObject` with the same text, maybe a different temperature)?
- [ ] **Accept-all-high-confidence with partial acceptance.** What if the user has already manually accepted some items? The batch button ignores them (correct). But should the button count reflect the _remaining_ high-confidence items or the _total_? Currently total — consider changing to remaining.
- [ ] **Accepted → re-reclassify.** An accepted row can only be undone, not reclassified. Should it also allow direct reclassify? Or is undo-then-reclassify correct? Probably correct — accepted means committed.
- [ ] **Flagged → accept.** Similar — a flagged row can only be unflagged. Is there ever a reason to accept a flagged row's original classification without unflagging first? Probably no.

## Data + API

- [ ] **Schema shape.** Final Zod definition: `{ transactionId: string, category: enum, confidence: number (0-1), reasoning: string }`? Do we need `suggestedAlternatives: [{ category, confidence }]` for the reclassify prompt?
- [ ] **Prompt engineering for Reclassify.** What exactly does the system prompt for `generateObject` look like when the user provides text? When they pick a chip? When both?
- [ ] **Rate limiting / cost cap.** The plan says cap usage. What's the specific limit? Per-user (no accounts in scope), per-IP, per-session?
- [ ] **Model choice.** Plan says "pick one and tune against it." Which one? Is the AI Gateway picking based on cost/latency, or do we hard-code?
- [ ] **Failure modes for `streamObject`** — what happens if the stream drops mid-way? Partial results showing? Error state? Retry button?

## Things the sketch doesn't simulate

- [ ] **Real streaming latency.** The fake stream is 350ms per line. Real `streamObject` latency will vary (first token, per-object pacing). The motion spec needs to accommodate both "too slow" and "too fast" streams.
- [ ] **Persistence.** Rules aren't saved across sessions. Real build persists to user preferences.
- [ ] **Receipt / OCR.** Not in scope — but worth noting that the real PAYPAL *UNKNOWNVENDOR case would benefit from receipt OCR to disambiguate. The sketch handles it by flagging; real build does the same until receipts are added.

## Open questions about the case study narrative

- [ ] One specific "before / after" moment to record as a short video or GIF — which moment? (Candidates: the reclassify panel opening with original-guess-preserved, the Learned feed line appearing after a correction, the low-confidence surface replacing a silent Uncategorized.)
- [ ] How explicitly to name the AI tools used in the process. The plan says "open disclosure." Probably: Claude Code (this collaboration) + whatever was used for any later production implementation work.

---

Anything here that blocks the real build should be resolved before or during Week 1 primitive work. Anything that's polish / edge-case can wait until Week 2 or 3.
