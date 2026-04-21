"use client";

import { useState } from "react";

/**
 * Low-fi wireframe for the Ramp portfolio expense-categorization flow.
 *
 * Shape:
 *   Input → Activity feed (full audit trail) ⇄ Results (actions)
 *
 * Design rules locked in during design review:
 *   1. Every state change must be readable WITHOUT motion. Motion layers
 *      on top; it never carries the signal alone (users can disable it).
 *   2. Reclassify preserves the original guess as the frame for the
 *      correction — "I thought this was X because Y. What is this actually?"
 *   3. Teaching commitment is shown in-place on the row after a reclassify
 *      ("I'll remember..."), not hidden in the feed. Default = remember,
 *      with a "just this one" opt-out link.
 *   4. Activity feed is a full session audit trail — AI thinking + user
 *      actions + learned commitments, visually distinguished.
 *
 * Styling is intentionally rough — dashed borders, monospace, no color.
 * Annotations in [brackets] mark motion beats for the real build.
 */

// --- Mock data ------------------------------------------------------------

type Txn = { id: string; description: string };

type Result = {
  id: string;
  category: string;
  confidence: number;
  reasoning: string;
};

/**
 * Feed entries. Agent lines = what the model did/thought. User lines = what
 * the human did (accept, reclassify, flag, undo). Learned lines = the
 * commitment spawned by a reclassify. All three share the feed so there's
 * one audit trail rather than three parallel timelines.
 */
type FeedEntry =
  | { kind: "process"; label: string; detail: string }
  | { kind: "classify"; label: string; txnId: string; detail: string }
  | { kind: "user"; label: string; txnId: string; detail: string }
  | { kind: "learned"; label: string; txnId: string; detail: string }
  | { kind: "unlearned"; label: string; txnId: string; detail: string };

const MOCK_TXNS: Txn[] = [
  { id: "t1", description: "SQ *BLUE BOTTLE COFFEE 4TH ST" },
  { id: "t2", description: "UBER TRIP 7A8F2" },
  { id: "t3", description: "AMZN Mktp US*RT4L9" },
  { id: "t4", description: "DELTA AIR 0067123456789" },
  { id: "t5", description: "GITHUB INC. TEAM PLAN" },
  { id: "t6", description: "WE WORK 450 PARK AVE" },
  { id: "t7", description: "PAYPAL *UNKNOWNVENDOR" },
  { id: "t8", description: "TST*SWEETGREEN SOMA" },
];

const MOCK_RESULTS: Result[] = [
  { id: "t1", category: "Meals", confidence: 0.97, reasoning: "Coffee shop, small amount" },
  { id: "t2", category: "Travel", confidence: 0.94, reasoning: "Ride-share vendor match" },
  { id: "t3", category: "Office Supplies", confidence: 0.61, reasoning: "Amazon — ambiguous without items" },
  { id: "t4", category: "Travel", confidence: 0.99, reasoning: "Airline code matched" },
  { id: "t5", category: "Software", confidence: 0.98, reasoning: "Known SaaS vendor" },
  { id: "t6", category: "Rent", confidence: 0.72, reasoning: "Coworking — could be Rent or Meals" },
  { id: "t7", category: "Uncategorized", confidence: 0.28, reasoning: "Vendor name missing" },
  { id: "t8", category: "Meals", confidence: 0.89, reasoning: "Known restaurant chain" },
];

const MOCK_ACTIVITY: FeedEntry[] = [
  { kind: "process", label: "Reading 8 transactions", detail: "Parsed 8 line items from pasted input. Stripped vendor prefixes (SQ*, TST*, AMZN Mktp)." },
  { kind: "process", label: "Matching vendors against known list", detail: "Looked up each normalized vendor in the curated vendor → category map. 4 hits, 4 misses." },
  { kind: "classify", label: "Classifying SQ *BLUE BOTTLE COFFEE 4TH ST", txnId: "t1", detail: "Vendor 'Blue Bottle' in known list → Meals. Amount $4.80 matches coffee-shop profile. High confidence." },
  { kind: "classify", label: "Classifying UBER TRIP 7A8F2", txnId: "t2", detail: "Vendor 'Uber' in known list → Travel. Trip ID present, typical ride-share format." },
  { kind: "classify", label: "Classifying AMZN Mktp US*RT4L9", txnId: "t3", detail: "Amazon Marketplace — no item detail in memo. Heuristic: amount under $50 + business account → guessed Office Supplies. Flagging low confidence because Amazon sells everything." },
  { kind: "classify", label: "Classifying DELTA AIR 0067123456789", txnId: "t4", detail: "Airline carrier code 006 = Delta. Ticket number format confirms flight purchase. Unambiguous." },
  { kind: "classify", label: "Classifying GITHUB INC. TEAM PLAN", txnId: "t5", detail: "'GitHub Inc.' in known SaaS vendor list. 'Team Plan' memo confirms subscription." },
  { kind: "classify", label: "Classifying WE WORK 450 PARK AVE", txnId: "t6", detail: "Coworking space. Policy ambiguity — some orgs code this as Rent, others as Meals/Office. Defaulted to Rent but user should confirm." },
  { kind: "classify", label: "Classifying PAYPAL *UNKNOWNVENDOR", txnId: "t7", detail: "PayPal wrapper hides the real vendor. No memo, no amount signal strong enough to guess. Returning Uncategorized — this one needs a human." },
  { kind: "classify", label: "Classifying TST*SWEETGREEN SOMA", txnId: "t8", detail: "Toast POS prefix + Sweetgreen in known restaurant list → Meals. Location suffix is noise." },
  { kind: "process", label: "Done — 8 categorized", detail: "3 high-confidence (≥0.9), 2 medium (0.6–0.9), 1 low (<0.6), 2 needing review." },
];

const CATEGORIES = ["Meals", "Travel", "Software", "Office Supplies", "Rent", "Uncategorized"];

const FLAG_REASONS = [
  "Needs receipt",
  "Personal charge",
  "Potential fraud",
  "Route to manager",
  "No fitting category",
  "Other",
];

/**
 * Per-row state machine. Reclassified carries `ruleKept` — the teaching
 * commitment. When the user clicks "just this one" we flip ruleKept to
 * false and append an undo entry to the feed.
 */
type RowState =
  | { kind: "pending" }
  | { kind: "accepted" }
  | { kind: "reclassifying" }
  | {
      kind: "reclassified";
      category: string;
      confidence: number;
      reasoning: string;
      userText: string;
      ruleKept: boolean;
    }
  | { kind: "flagging" }
  | { kind: "flagged"; reason: string; note?: string };

// --- Component ------------------------------------------------------------

export default function Home() {
  const [phase, setPhase] = useState<"idle" | "running" | "done">("idle");
  const [activityIndex, setActivityIndex] = useState(0);
  const [resultsShown, setResultsShown] = useState(0);
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});
  // User actions + learned commitments, appended as they happen.
  const [userFeedEntries, setUserFeedEntries] = useState<FeedEntry[]>([]);
  const [expandedStep, setExpandedStep] = useState<string | null>(null);
  const [hoveredTxnId, setHoveredTxnId] = useState<string | null>(null);
  // Review bucket starts collapsed — user opts in to seeing its contents.
  const [bucketOpen, setBucketOpen] = useState(false);

  function runFakeStream() {
    setPhase("running");
    setActivityIndex(0);
    setResultsShown(0);
    setRowStates({});
    setUserFeedEntries([]);
    setExpandedStep(null);

    MOCK_ACTIVITY.forEach((_, i) => {
      setTimeout(() => setActivityIndex(i + 1), i * 350);
    });

    MOCK_RESULTS.forEach((_, i) => {
      setTimeout(() => setResultsShown(i + 1), 700 + i * 350);
    });

    setTimeout(
      () => setPhase("done"),
      MOCK_ACTIVITY.length * 350 + 200
    );
  }

  function rowStateFor(id: string): RowState {
    return rowStates[id] ?? { kind: "pending" };
  }

  function setRowState(id: string, state: RowState) {
    setRowStates((prev) => ({ ...prev, [id]: state }));
  }

  function appendFeed(entry: FeedEntry) {
    setUserFeedEntries((prev) => [...prev, entry]);
  }

  function vendorKey(txnId: string): string {
    const txn = MOCK_TXNS.find((t) => t.id === txnId)!;
    return txn.description.split(" ").slice(0, 3).join(" ");
  }

  function accept(id: string) {
    const txn = MOCK_TXNS.find((t) => t.id === id)!;
    const r = MOCK_RESULTS.find((x) => x.id === id)!;
    setRowState(id, { kind: "accepted" });
    appendFeed({
      kind: "user",
      label: `You accepted: ${txn.description}`,
      txnId: id,
      detail: `Confirmed ${r.category} (conf ${r.confidence.toFixed(2)}).`,
    });
  }

  function acceptAllHighConfidence() {
    const next: Record<string, RowState> = { ...rowStates };
    const accepted: Result[] = [];
    for (const r of MOCK_RESULTS) {
      if (r.confidence >= 0.9 && !next[r.id]) {
        next[r.id] = { kind: "accepted" };
        accepted.push(r);
      }
    }
    setRowStates(next);
    if (accepted.length > 0) {
      appendFeed({
        kind: "user",
        label: `You accepted ${accepted.length} high-confidence items`,
        txnId: accepted[0].id,
        detail: `Batch action. Items: ${accepted.map((a) => MOCK_TXNS.find((t) => t.id === a.id)!.description).join(", ")}.`,
      });
    }
  }

  function startReclassify(id: string) {
    setRowState(id, { kind: "reclassifying" });
  }

  /**
   * Simulates generateObject. User picks a chip or types free text, or both.
   * Returns a new classification with high confidence + a user-steered
   * reasoning string. Default behavior = remember the vendor→category
   * mapping. User can opt out afterward via "just this one".
   */
  function submitReclassify(id: string, chipCategory: string, freeText: string) {
    const txn = MOCK_TXNS.find((t) => t.id === id)!;
    const baseline = MOCK_RESULTS.find((r) => r.id === id)!;

    // Three paths map to three real-build behaviors:
    //   • chip only   → commit the chip category, skip the model call
    //   • text only   → generateObject reads text, infers category
    //   • chip + text → generateObject gets both; chip constrains category
    // The wireframe fakes path 2 with guessFromText + a low-confidence
    // fallback so the "model inferred from user text" beat is visible.
    const hasText = freeText.trim() !== "";
    const inferredFromText = hasText ? guessFromText(freeText) : "";
    const categoryLabel = chipCategory || inferredFromText || "Uncategorized";

    // Low confidence = text-only path fell through to Uncategorized. This is
    // the "model couldn't confidently classify" case. We still commit — the
    // user deserves an answer — but surface uncertainty and offer a flag.
    const modelWasUnsure =
      !chipCategory && hasText && inferredFromText === "Uncategorized";
    const confidence = modelWasUnsure ? 0.4 : 0.95;

    const reasoning = chipCategory
      ? hasText
        ? `User chose ${chipCategory}; added context: "${freeText.trim()}".`
        : `User override — committed ${chipCategory}.`
      : modelWasUnsure
        ? `Couldn't map "${freeText.trim()}" to a known category with confidence.`
        : `Model inferred ${categoryLabel} from: "${freeText.trim()}".`;

    setRowState(id, {
      kind: "reclassified",
      category: categoryLabel,
      confidence,
      reasoning,
      userText: freeText,
      // No learned rule when the model was unsure — don't commit a vendor
      // rule based on a low-confidence answer.
      ruleKept: !modelWasUnsure,
    });

    const vendor = vendorKey(id);

    appendFeed({
      kind: "user",
      label: `You reclassified: ${txn.description}`,
      txnId: id,
      detail: `${baseline.category} → ${categoryLabel}${modelWasUnsure ? " (low confidence — model unsure)" : ""}. ${freeText.trim() ? `User note: "${freeText.trim()}".` : "No note provided."}`,
    });

    // Only append a Learned entry when we're actually learning. Low-confidence
    // reclassifies don't teach the system anything reliable.
    if (!modelWasUnsure) {
      appendFeed({
        kind: "learned",
        label: `Learned: ${vendor} → ${categoryLabel}`,
        txnId: id,
        detail: `Default rule active. Next time I see "${vendor}" I'll suggest ${categoryLabel}. User can undo by clicking "just this one" on the result row. [In real build: persist to user preferences, surface as a suggestion in future batches.]`,
      });
    }
  }

  /**
   * Drop just the learned rule — keep the per-instance reclassification.
   * Visible on the row as "just this one".
   */
  function forgetRule(id: string) {
    const state = rowStateFor(id);
    if (state.kind !== "reclassified") return;
    setRowState(id, { ...state, ruleKept: false });
    // Agent-voice entry paired with the original "Learned:" — keeps the
    // learn/unlearn pair binary and scannable in the log.
    appendFeed({
      kind: "unlearned",
      label: `Unlearned: ${vendorKey(id)} → ${state.category}`,
      txnId: id,
      detail: `User chose "just this one". Rule dropped — next time I see "${vendorKey(id)}" I won't auto-suggest ${state.category}. Per-transaction reclassification still applies.`,
    });
  }

  /**
   * Restore the learned rule after "just this one" was clicked. Reverses
   * forgetRule without touching the per-instance reclassification.
   */
  function restoreRule(id: string) {
    const state = rowStateFor(id);
    if (state.kind !== "reclassified") return;
    setRowState(id, { ...state, ruleKept: true });
    // Fresh Learned: entry — the net effect is a re-learning, and matching
    // the original learn label keeps the log consistent.
    appendFeed({
      kind: "learned",
      label: `Learned: ${vendorKey(id)} → ${state.category}`,
      txnId: id,
      detail: `User restored the rule after "just this one". Next time I see "${vendorKey(id)}" I'll suggest ${state.category} again.`,
    });
  }

  function cancelReclassify(id: string) {
    setRowState(id, { kind: "pending" });
  }

  function startFlag(id: string) {
    setRowState(id, { kind: "flagging" });
  }

  function submitFlag(id: string, reason: string, note?: string) {
    const txn = MOCK_TXNS.find((t) => t.id === id)!;
    setRowState(id, { kind: "flagged", reason, note });
    appendFeed({
      kind: "user",
      label: `You flagged: ${txn.description}`,
      txnId: id,
      detail: `Reason: ${reason}.${note ? ` Note: "${note}".` : ""} Routed to review bucket.`,
    });
  }

  /**
   * One-click flag from the low-confidence reclassified state.
   * Shortcut: skips the flag panel, commits "No fitting category" directly.
   */
  function flagAsNoFit(id: string) {
    submitFlag(id, "No fitting category");
  }

  function cancelFlag(id: string) {
    setRowState(id, { kind: "pending" });
  }

  function undoRowState(id: string) {
    const prev = rowStateFor(id);
    const txn = MOCK_TXNS.find((t) => t.id === id)!;
    setRowState(id, { kind: "pending" });

    // Action-specific verbs keep the audit trail binary and scannable.
    // Each top-level action has a matching inverse label.
    let label: string;
    let detail = "Row is back to the agent's original classification.";
    if (prev.kind === "accepted") {
      label = `You unaccepted: ${txn.description}`;
    } else if (prev.kind === "reclassified") {
      label = `You unclassified: ${txn.description}`;
      // If the scope correction had already unlearned the rule, note that
      // no additional unlearn event fires (rule was already gone).
      if (!prev.ruleKept) {
        detail += ` Rule was already unlearned via "just this one".`;
      }
    } else if (prev.kind === "flagged") {
      label = `You unflagged: ${txn.description}`;
      detail = `Removed from the review bucket. Row is back to the agent's original classification.`;
    } else {
      label = `You undid: ${txn.description}`;
    }
    appendFeed({ kind: "user", label, txnId: id, detail });

    // Pair the user-undo with an Unlearned: entry when a rule was active —
    // mirrors the two-line reclassify (You reclassified + Learned) on the
    // way in. Users asked for this specifically: binary in, binary out.
    if (prev.kind === "reclassified" && prev.ruleKept) {
      appendFeed({
        kind: "unlearned",
        label: `Unlearned: ${vendorKey(id)} → ${prev.category}`,
        txnId: id,
        detail: `Rule dropped as part of the unclassify. Next time I see "${vendorKey(id)}" I won't auto-suggest ${prev.category}.`,
      });
    }
  }

  function confidenceTier(c: number): "high" | "medium" | "low" {
    if (c >= 0.9) return "high";
    if (c >= 0.6) return "medium";
    return "low";
  }

  const fullFeed: FeedEntry[] = [
    ...MOCK_ACTIVITY.slice(0, activityIndex),
    ...userFeedEntries,
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <h1 className="mb-1 text-base font-bold">Expense categorization — low-fi flow</h1>
      <p className="annotation mb-8">
        Wireframe only. Motion, styling, and real AI are all later. Every state
        change is readable as text first — motion layers on top.
      </p>

      {/* SECTION 1 — INPUT */}
      <Section label="1. Input">
        <div className="mb-2 annotation">[Paste or upload ~15–20 transaction descriptions]</div>
        <textarea
          className="w-full border border-dashed border-stone-400 bg-white p-3 font-mono text-xs"
          rows={5}
          defaultValue={MOCK_TXNS.map((t) => t.description).join("\n")}
          readOnly
        />
        <button
          onClick={runFakeStream}
          disabled={phase === "running"}
          className="mt-3 border border-stone-800 bg-white px-4 py-1.5 text-xs font-bold hover:bg-stone-100 disabled:opacity-40"
        >
          {phase === "idle" ? "Run" : phase === "running" ? "Running…" : "Run again"}
        </button>
      </Section>

      {/* SECTION 2 — ACTIVITY FEED / AUDIT TRAIL */}
      <Section label="2. Activity feed (audit trail)">
        <div className="mb-2 annotation">
          [Full session log: agent thinking + your actions + learned
          commitments. Click any line to expand. Hover a linked line to
          highlight its row below.]
        </div>
        <div className="min-h-[180px] border border-dashed border-stone-400 bg-white p-3 text-xs">
          {phase === "idle" ? (
            <span className="text-stone-400">— waiting for Run —</span>
          ) : (
            <ul className="space-y-0.5">
              {fullFeed.map((entry, i) => {
                const linked =
                  entry.kind === "classify" ||
                  entry.kind === "user" ||
                  entry.kind === "learned" ||
                  entry.kind === "unlearned";
                const linkedTxnId = linked ? entry.txnId : null;
                const isLinkedHover = linkedTxnId !== null && linkedTxnId === hoveredTxnId;
                const stepKey = `${entry.kind}-${i}`;
                const isExpanded = expandedStep === stepKey;

                // Distinct prefix per entry kind so the line is readable
                // at a glance without relying on weight / color.
                const prefix =
                  entry.kind === "user"
                    ? "you"
                    : entry.kind === "learned"
                      ? "learned"
                      : entry.kind === "unlearned"
                        ? "unlearned"
                        : "agent";

                const isCommitment =
                  entry.kind === "learned" || entry.kind === "unlearned";

                return (
                  <li
                    key={stepKey}
                    onMouseEnter={() => linkedTxnId && setHoveredTxnId(linkedTxnId)}
                    onMouseLeave={() => linkedTxnId && setHoveredTxnId(null)}
                  >
                    <button
                      onClick={() => setExpandedStep(isExpanded ? null : stepKey)}
                      className={`flex w-full gap-2 py-0.5 text-left ${
                        isLinkedHover ? "bg-stone-200" : ""
                      }`}
                    >
                      <span className="text-stone-400 select-none">
                        {isExpanded ? "▾" : "▸"}
                      </span>
                      <span className="w-28 shrink-0 text-stone-400 uppercase">
                        [{prefix}]
                      </span>
                      <span
                        className={`flex-1 ${isCommitment ? "font-bold" : ""}`}
                      >
                        {entry.label}
                      </span>
                    </button>
                    {isExpanded && (
                      <div className="ml-5 mb-1 border-l border-dashed border-stone-300 py-1 pl-3 text-stone-600">
                        {entry.detail}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>

      {/* SECTION 3 — RESULTS */}
      <Section label="3. Results">
        <div className="mb-2 annotation">
          [Each row is a &lt;DiffRow&gt;. Confidence drives motion on arrival:
          high=snap, medium=settle, low=shimmer/hesitate. Every state label is
          visible as text — motion enhances, it doesn't carry the signal.]
        </div>

        {/* Header: batch action on the left, review bucket on the right.
            Bucket is visible as soon as results start streaming so the user
            sees the destination before they use it. Count changes without
            motion — the number itself is the signal. */}
        <div className="mb-2 flex items-start justify-between gap-4">
          <div>
            {phase === "done" && (
              <>
                <button
                  onClick={acceptAllHighConfidence}
                  className="border border-stone-800 bg-white px-3 py-1 text-xs hover:bg-stone-100"
                >
                  Accept all high-confidence ({MOCK_RESULTS.filter((r) => r.confidence >= 0.9).length})
                </button>
                <span className="annotation ml-2">[Batch action]</span>
              </>
            )}
          </div>
          {resultsShown > 0 && (
            <ReviewBucket
              flagged={MOCK_RESULTS
                .map((r) => ({ txn: MOCK_TXNS.find((t) => t.id === r.id)!, state: rowStateFor(r.id) }))
                .filter((x) => x.state.kind === "flagged")}
              open={bucketOpen}
              onToggle={() => setBucketOpen((v) => !v)}
              onUnflag={undoRowState}
            />
          )}
        </div>

        <div className="border border-dashed border-stone-400 bg-white">
          {resultsShown === 0 ? (
            <div className="p-3 text-xs text-stone-400">— results will populate as stream arrives —</div>
          ) : (
            <ul>
              {MOCK_RESULTS.slice(0, resultsShown).map((r) => {
                const txn = MOCK_TXNS.find((t) => t.id === r.id)!;
                const state = rowStateFor(r.id);
                const isLinkedHover = hoveredTxnId === r.id;

                return (
                  <li
                    key={r.id}
                    onMouseEnter={() => setHoveredTxnId(r.id)}
                    onMouseLeave={() => setHoveredTxnId(null)}
                    className={`border-b border-dashed border-stone-300 p-3 text-xs last:border-b-0 ${
                      isLinkedHover ? "bg-stone-200" : ""
                    }`}
                  >
                    <ResultRow
                      txn={txn}
                      baseResult={r}
                      state={state}
                      confidenceTier={confidenceTier}
                      onAccept={() => accept(r.id)}
                      onStartReclassify={() => startReclassify(r.id)}
                      onSubmitReclassify={(chip, freeText) =>
                        submitReclassify(r.id, chip, freeText)
                      }
                      onCancelReclassify={() => cancelReclassify(r.id)}
                      onForgetRule={() => forgetRule(r.id)}
                      onRestoreRule={() => restoreRule(r.id)}
                      onStartFlag={() => startFlag(r.id)}
                      onSubmitFlag={(reason, note) => submitFlag(r.id, reason, note)}
                      onCancelFlag={() => cancelFlag(r.id)}
                      onFlagAsNoFit={() => flagAsNoFit(r.id)}
                      onUndo={() => undoRowState(r.id)}
                      vendorLabel={vendorKey(r.id)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Section>

      {/* SECTION 4 — NOTES FOR THE REAL BUILD */}
      <Section label="4. Notes for the real build">
        <ul className="list-disc space-y-1 pl-5 text-xs text-stone-700">
          <li>
            <b>Motion-off reads clean.</b> Every state ships with visible text
            labels. Motion is polish, not load-bearing.
          </li>
          <li>
            Confidence comes from the model via Zod schema, not logprobs.
          </li>
          <li>
            Reasoning text is a single field on the result object — powers the
            expanded feed line and the row annotation.
          </li>
          <li>
            streamObject powers sections 2 &amp; 3. generateObject powers the
            Reclassify call (atomic) with the user's free text + chosen
            category injected into the prompt.
          </li>
          <li>
            <b>Commit model:</b> chip click = instant commit (no submit
            button). Text input commits on Enter or ✓ button. Esc cancels.
            Undo is always available after commit — the safety net replaces
            pre-commit confirmation ceremony.
          </li>
          <li>
            <b>Text-only path</b> is where the motion-for-AI-trust story
            shines on Reclassify: user types context, the model reconsiders,
            the row re-renders with its own confidence + reasoning. Same
            &lt;ConfidenceText&gt; primitive as the original classification.
          </li>
          <li>
            <b>Categories are admin-managed</b> (they map to the chart of
            accounts). Users never add categories mid-flow — the escape hatch
            is <b>Flag → &quot;No fitting category&quot;</b>, which routes to
            review so a reviewer / admin can handle it upstream.
          </li>
          <li>
            <b>Model-unsure case:</b> if Reclassify from text lands on low
            confidence, the row commits but shows ⚠ Low confidence + a
            one-click flag action. No silent fallback to Uncategorized; the
            uncertainty is surfaced and the next step is obvious.
          </li>
          <li>
            Reclassify preserves the original guess as context (&quot;I thought
            this was X because Y&quot;) so the correction is a diff, not a
            replacement.
          </li>
          <li>
            Teaching commitment is opt-OUT, not opt-in. Default = remember;
            &quot;just this one&quot; scopes it to the single transaction.
          </li>
          <li>
            Activity feed is a full audit trail. Agent / you / learned are
            visually distinguished via the [prefix] column.
          </li>
          <li>
            Flag never reclassifies — routes to a review bucket with a
            structured reason + optional free-text note. Bucket is visible
            as soon as results start streaming so the destination is known
            before the action.
          </li>
          <li>
            <b>Bucket motion beat:</b> flagged row compresses + a ghost of
            the row arcs to the bucket icon; count increments. With motion
            off, the count simply changes — still readable.
          </li>
          <li>
            Motion primitives live in <code>/playground</code> — build
            &lt;ConfidenceText&gt;, &lt;AgentStep&gt;, &lt;DiffRow&gt; in
            isolation before wiring here.
          </li>
        </ul>
      </Section>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-stone-500">
        {label}
      </h2>
      {children}
    </section>
  );
}

/**
 * Cheap text-to-category guesser for the wireframe. Real build = generateObject
 * with the user's free text injected into the system prompt. Here we just
 * peek at keywords so submitting "team lunch" lands on Meals.
 */
function guessFromText(text: string): string {
  const t = text.toLowerCase();
  if (/lunch|dinner|coffee|meal|food|eat/.test(t)) return "Meals";
  if (/flight|hotel|taxi|uber|trip/.test(t)) return "Travel";
  if (/subscription|saas|software|license/.test(t)) return "Software";
  if (/office|supplies|stationery/.test(t)) return "Office Supplies";
  if (/rent|coworking|space/.test(t)) return "Rent";
  return "Uncategorized";
}

// --- Row renderer ---------------------------------------------------------

function ResultRow({
  txn,
  baseResult,
  state,
  confidenceTier,
  onAccept,
  onStartReclassify,
  onSubmitReclassify,
  onCancelReclassify,
  onForgetRule,
  onRestoreRule,
  onStartFlag,
  onSubmitFlag,
  onCancelFlag,
  onFlagAsNoFit,
  onUndo,
  vendorLabel,
}: {
  txn: Txn;
  baseResult: Result;
  state: RowState;
  confidenceTier: (c: number) => "high" | "medium" | "low";
  onAccept: () => void;
  onStartReclassify: () => void;
  onSubmitReclassify: (chipCategory: string, freeText: string) => void;
  onCancelReclassify: () => void;
  onForgetRule: () => void;
  onRestoreRule: () => void;
  onStartFlag: () => void;
  onSubmitFlag: (reason: string, note?: string) => void;
  onCancelFlag: () => void;
  onFlagAsNoFit: () => void;
  onUndo: () => void;
  vendorLabel: string;
}) {
  if (state.kind === "accepted") {
    // Compact confirmed state — "Accepted" as a visible word, not just a glyph.
    return (
      <div className="flex items-center gap-2">
        <span className="w-32 shrink-0 font-bold text-stone-700">✓ Accepted</span>
        <span className="flex-1 truncate text-stone-600">
          {txn.description} → {baseResult.category}
        </span>
        <button onClick={onUndo} className="text-xs underline hover:no-underline">
          undo
        </button>
      </div>
    );
  }

  if (state.kind === "flagged") {
    // State is readable as text: "Ready for review" describes WHERE it is,
    // not just WHAT happened. Works with motion off.
    return (
      <div>
        <div className="flex items-center gap-2">
          <span className="w-32 shrink-0 font-bold text-stone-700">
            ⚑ Ready for review
          </span>
          <span className="flex-1 truncate text-stone-600">
            {txn.description} — <b>{state.reason}</b>
            {state.note ? `: ${state.note}` : ""}
          </span>
          <button onClick={onUndo} className="text-xs underline hover:no-underline">
            undo
          </button>
        </div>
        <div className="mt-0.5 annotation">
          [motion beat: row compresses, ghost arcs to ⚑ Review bucket above,
          count ticks up. Label above is load-bearing; motion is polish.]
        </div>
      </div>
    );
  }

  if (state.kind === "reclassifying") {
    return (
      <ReclassifyPanel
        txn={txn}
        baseResult={baseResult}
        onSubmit={onSubmitReclassify}
        onCancel={onCancelReclassify}
      />
    );
  }

  if (state.kind === "flagging") {
    return (
      <FlagPanel
        txn={txn}
        onSubmit={onSubmitFlag}
        onCancel={onCancelFlag}
      />
    );
  }

  // pending or reclassified — same layout shape, different header + footer.
  const isReclassified = state.kind === "reclassified";
  const shown = isReclassified
    ? { category: state.category, confidence: state.confidence, reasoning: state.reasoning }
    : { category: baseResult.category, confidence: baseResult.confidence, reasoning: baseResult.reasoning };
  const tier = confidenceTier(shown.confidence);

  // Uncertain reclassify = its own focused layout. The commit didn't really
  // succeed (model couldn't map the text), so we don't show a "Got it"
  // confirmation or the accept/reclassify/flag actions. Two choices only:
  // route it to review, or undo back to the agent's original guess.
  if (isReclassified && shown.confidence < 0.6) {
    return (
      <div>
        <div className="mb-2 truncate">{txn.description}</div>
        <div className="border border-dashed border-stone-400 p-2 text-stone-700">
          <div className="font-bold">
            ⚠ Low confidence ({shown.confidence.toFixed(2)})
          </div>
          <div className="mt-0.5 text-stone-600">
            I couldn&apos;t map your note to a known category. Nothing
            learned, no vendor rule saved.
          </div>
          <div className="mt-2 flex gap-3 text-xs">
            <button
              onClick={onFlagAsNoFit}
              className="underline hover:no-underline"
            >
              Flag as &quot;No fitting category&quot;
            </button>
            <button
              onClick={onUndo}
              className="underline hover:no-underline"
              title="Back to the agent's original classification"
            >
              undo
            </button>
          </div>
          <div className="annotation mt-1">
            [Motion: row shimmers/hesitates — same pattern as low-confidence
            streaming. Label above is load-bearing; motion is polish.]
          </div>
        </div>
      </div>
    );
  }

  // Confident reclassify = its own focused layout too. A reclassify IS a
  // commit, so accept/reclassify/flag would be redundant noise. Only undo
  // (back to the agent's original guess) + the optional "just this one"
  // teaching-scope link stay visible.
  if (isReclassified) {
    return (
      <div>
        <div className="mb-1 flex items-center gap-2">
          <span className="font-bold text-stone-700">
            ✓ Got it. Reclassified as {shown.category}.
          </span>
          <button
            onClick={onUndo}
            className="text-xs underline hover:no-underline"
            title="Back to the agent's original classification"
          >
            undo
          </button>
        </div>
        <div className="truncate">{txn.description}</div>
        <div className="mt-0.5 text-stone-500">
          → {shown.category}{" "}
          <span className="annotation">
            [conf {shown.confidence.toFixed(2)} / {tier} — {shown.reasoning}]
          </span>
        </div>
        <div className="mt-1 text-stone-600">
          {state.ruleKept ? (
            <>
              I&apos;ll remember <b>{vendorLabel}</b> → {shown.category} next time.{" "}
              <button
                onClick={onForgetRule}
                className="underline hover:no-underline"
              >
                just this one
              </button>
            </>
          ) : (
            <>
              Scoped to this transaction only. No vendor rule saved.{" "}
              <button
                onClick={onRestoreRule}
                className="underline hover:no-underline"
                title="Restore the vendor→category rule"
              >
                undo
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pending row — the agent has classified, user hasn't acted yet.
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="truncate">{txn.description}</div>
        <div className="mt-0.5 text-stone-500">
          → {shown.category}{" "}
          <span className="annotation">
            [conf {shown.confidence.toFixed(2)} / {tier} — {shown.reasoning}]
          </span>
        </div>
      </div>
      <div className="flex shrink-0 gap-1 self-start">
        <button
          onClick={onAccept}
          className="border border-stone-400 bg-white px-2 py-0.5 hover:bg-stone-100"
        >
          accept
        </button>
        <button
          onClick={onStartReclassify}
          className="border border-stone-400 bg-white px-2 py-0.5 hover:bg-stone-100"
        >
          reclassify
        </button>
        <button
          onClick={onStartFlag}
          className="border border-stone-300 bg-white px-2 py-0.5 text-stone-500 hover:bg-stone-100"
          title="Flag — route to review"
        >
          ⚑ flag
        </button>
      </div>
    </div>
  );
}

// --- Inline panels --------------------------------------------------------

function ReclassifyPanel({
  txn,
  baseResult,
  onSubmit,
  onCancel,
}: {
  txn: Txn;
  baseResult: Result;
  onSubmit: (chipCategory: string, freeText: string) => void;
  onCancel: () => void;
}) {
  const [freeText, setFreeText] = useState("");

  const canCommitText = freeText.trim() !== "";

  // Chip click auto-submits, carrying any current text as context.
  // Enter in the input submits with text only (model-inferred path).
  // Escape cancels.
  function commitFromText() {
    if (canCommitText) onSubmit("", freeText);
  }

  function handleInputKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitFromText();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <div className="mb-2 font-bold truncate">{txn.description}</div>

      {/* Original guess preserved as context for the correction. */}
      <div className="mb-3 border-l border-dashed border-stone-400 pl-3 text-stone-600">
        I thought this was <b>{baseResult.category}</b> because{" "}
        <i>{baseResult.reasoning.toLowerCase()}</i> (conf{" "}
        {baseResult.confidence.toFixed(2)}).
        <div className="annotation mt-0.5">
          [Motion: the original guess stays visible but dims. It's the frame
          for the correction, not discarded.]
        </div>
      </div>

      <label className="mb-1 block text-stone-700 font-bold">
        What is this actually?
      </label>

      {/* Input + inline commit button. Button enabled only when text exists.
          Enter commits via keyboard; the ✓ button is the visible affordance. */}
      <div className="mb-2 flex gap-1">
        <input
          type="text"
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          onKeyDown={handleInputKey}
          placeholder="e.g. team lunch for the design review"
          className="flex-1 border border-dashed border-stone-400 bg-white p-2 font-mono text-xs"
          autoFocus
        />
        <button
          onClick={commitFromText}
          disabled={!canCommitText}
          title="Commit — send your text to the model (Enter)"
          className="border border-stone-800 bg-white px-2 font-bold hover:bg-stone-100 disabled:border-stone-300 disabled:text-stone-300"
        >
          ✓
        </button>
      </div>

      <div className="annotation mb-2">
        [Text alone → generateObject reads your words and infers a category
        with its own confidence + reasoning. This is the re-consider moment.]
      </div>

      <div className="mb-1 text-stone-500">— or pick one directly —</div>
      <div className="mb-3 flex flex-wrap gap-1">
        {CATEGORIES.map((c) => {
          // Disable the current category — reclassifying to the same value
          // is a no-op and just adds confusion.
          const isCurrent = c === baseResult.category;
          return (
            <button
              key={c}
              onClick={() => !isCurrent && onSubmit(c, freeText)}
              disabled={isCurrent}
              className={`border px-2 py-0.5 ${
                isCurrent
                  ? "border-stone-300 bg-stone-100 text-stone-400 line-through cursor-not-allowed"
                  : "border-stone-400 bg-white hover:bg-stone-100"
              }`}
              title={isCurrent ? `Already classified as ${c}` : `Commit as ${c}`}
            >
              {c}
            </button>
          );
        })}
      </div>

      <div className="mb-2 annotation">
        [Chip click = instant commit (fast path). Carries any text you've
        typed as additional context. Submitting defaults to remembering the
        vendor→category rule — scope via &quot;just this one&quot; after.]
      </div>

      <button
        onClick={onCancel}
        className="text-xs text-stone-500 underline hover:no-underline"
      >
        cancel
      </button>{" "}
      <span className="annotation">[Esc also cancels]</span>
    </div>
  );
}

/**
 * Persistent review bucket. Shows a count of flagged items. Click to expand
 * an inline list with per-item unflag. The count alone carries the signal
 * without motion — motion adds polish (item arcs in, count pulses) but is
 * never required for the UI to make sense.
 */
function ReviewBucket({
  flagged,
  open,
  onToggle,
  onUnflag,
}: {
  flagged: { txn: Txn; state: RowState }[];
  open: boolean;
  onToggle: () => void;
  onUnflag: (id: string) => void;
}) {
  const count = flagged.length;

  return (
    <div className="shrink-0">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 border border-stone-400 bg-white px-2 py-1 text-xs hover:bg-stone-100"
      >
        <span>⚑ Review bucket</span>
        <span
          className={`border px-1.5 ${
            count > 0 ? "border-stone-800 bg-stone-800 text-white" : "border-stone-400 text-stone-500"
          }`}
        >
          {count}
        </span>
        <span className="text-stone-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="mt-1 w-72 border border-dashed border-stone-400 bg-white p-2 text-xs">
          <div className="annotation mb-1">
            [Destination for flagged items. In real build: this list is the
            review queue that a reviewer / manager works through.]
          </div>
          {count === 0 ? (
            <div className="text-stone-400">— empty —</div>
          ) : (
            <ul className="space-y-1">
              {flagged.map(({ txn, state }) => {
                if (state.kind !== "flagged") return null;
                return (
                  <li key={txn.id} className="flex items-start gap-2 border-b border-dashed border-stone-300 pb-1 last:border-b-0 last:pb-0">
                    <div className="flex-1">
                      <div className="truncate">{txn.description}</div>
                      <div className="text-stone-500">
                        {state.reason}
                        {state.note ? `: ${state.note}` : ""}
                      </div>
                    </div>
                    <button
                      onClick={() => onUnflag(txn.id)}
                      className="text-xs underline hover:no-underline"
                    >
                      unflag
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function FlagPanel({
  txn,
  onSubmit,
  onCancel,
}: {
  txn: Txn;
  onSubmit: (reason: string, note?: string) => void;
  onCancel: () => void;
}) {
  // "Other" is the only reason that needs a text note — reveal the input
  // on click, auto-submit on Enter or ✓.
  const [isOtherSelected, setIsOtherSelected] = useState(false);
  const [note, setNote] = useState("");

  const canCommitOther = note.trim() !== "";

  function commitOther() {
    if (canCommitOther) onSubmit("Other", note);
  }

  function handleNoteKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      commitOther();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  function chipClick(r: string) {
    if (r === "Other") {
      setIsOtherSelected(true);
      return;
    }
    onSubmit(r);
  }

  return (
    <div onKeyDown={(e) => e.key === "Escape" && onCancel()}>
      <div className="mb-2 font-bold truncate">⚑ {txn.description}</div>
      <div className="annotation mb-2">
        [Flag = route out of the auto-flow to the review bucket. Chip click
        commits instantly; &quot;Other&quot; reveals a note input.]
      </div>

      <label className="mb-1 block text-stone-700 font-bold">
        What&apos;s the issue?
      </label>
      <div className="mb-2 flex flex-wrap gap-1">
        {FLAG_REASONS.map((r) => (
          <button
            key={r}
            onClick={() => chipClick(r)}
            className={`border px-2 py-0.5 ${
              r === "Other" && isOtherSelected
                ? "border-stone-800 bg-stone-800 text-white"
                : "border-stone-400 bg-white hover:bg-stone-100"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      {isOtherSelected && (
        <div className="mb-2 flex gap-1">
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={handleNoteKey}
            placeholder="Describe the issue…"
            className="flex-1 border border-dashed border-stone-400 bg-white p-2 font-mono text-xs"
            autoFocus
          />
          <button
            onClick={commitOther}
            disabled={!canCommitOther}
            title="Commit (Enter)"
            className="border border-stone-800 bg-white px-2 font-bold hover:bg-stone-100 disabled:border-stone-300 disabled:text-stone-300"
          >
            ✓
          </button>
        </div>
      )}

      <button
        onClick={onCancel}
        className="text-xs text-stone-500 underline hover:no-underline"
      >
        cancel
      </button>{" "}
      <span className="annotation">[Esc also cancels]</span>
    </div>
  );
}
