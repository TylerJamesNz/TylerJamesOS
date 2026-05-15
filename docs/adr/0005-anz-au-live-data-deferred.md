# 0005. ANZ AU live-data path deferred from V1

**Status:** Accepted, 2026-05-11. Amends ADR 0004 step 4.

## Context

ADR 0004 (2026-05-11, same day) decided that AU live data would arrive by Gmail-parsing ANZ AU "Account Activity Alert" emails: Tyler enables per-transaction email alerts at a $1 threshold in ANZ internet banking, a Gmail filter labels them, an Edge Function ingests them hourly. The whole design rested on the assumption that ANZ AU personal accounts can be configured to send per-transaction email alerts at a customer-chosen threshold.

A verification pass on 2026-05-11 (against current ANZ AU support documentation and the broader 2026 banking-API landscape) disproved that assumption:

- ANZ classic personal Internet Banking in 2026 only supports notifications for **Osko payments**, **payee-list changes**, and a **daily overdraft SMS**. There is no per-transaction email alert with a configurable threshold for personal accounts. The threshold-configurable alerts that do exist are restricted to "eligible business accounts" in the ANZ App.
- ANZ Plus (the newer product) supports per-transaction **push notifications** with amount preview, but push, not email. Bridging push to Gmail requires an iOS Shortcut or third-party forwarder, which is brittle to iOS updates and depends on the phone being on and connected.
- Free single-user access to Australian CDR open banking has no path in 2026. Consumer data is only available to accredited data recipients (ADRs). Basiq remains the closest commercial path but its 12-month B2B contract is the original ADR 0004 rejection reason and still holds.

Without the email stream, the ADR 0004 step 4 design has no source to parse from.

## Decision

**Defer the ANZ AU live-data tracer (T1e) out of V1.** No Gmail-parse path ships. AU coverage in V1 relies on the half-yearly ANZ Online Saver statement, imported through the existing T1c parser. "This month trending" is invisible for AU accounts; the gap is explicit, not papered over.

The amendments to ADR 0004:

1. **Step 4 (AU live: Gmail-parse) is superseded.** ADR 0004 retains its other decisions: alongside-not-replace (step 1), one `transactions` table + `source` enum (step 2), match-and-merge supersedure (step 3), NZ via Akahu (step partly via the now-revised T1d shape), free-only principle (step 5).
2. **Schema additions stay in place.** Phase J already shipped `accounts.gmail_label` and the `gmail` value in `integration_provider`. Both are cheap, future-friendly, and not coupled to T1e specifically. If a future tracer needs them, they are ready.
3. **GitHub issue #29 (T1e) closes** with a reference to this ADR. The tracer becomes a future candidate, not a planned V1 commit.

## Re-enablement triggers

Any one of these would justify reopening T1e (or a successor tracer):

- ANZ AU ships per-transaction email alerts at a configurable threshold to personal accounts.
- Tyler moves daily AU spending to Up Bank (free public REST API + webhooks, account-id-stable transactions).
- Basiq launches a consumer-friendly tier without the 12-month B2B contract requirement.
- A new free-for-personal-use Australian aggregator emerges under CDR (e.g., a non-commercial accredited intermediary).

## Consequences

- "This month trending" works for NZ accounts (via T1d Akahu) and for manually-entered transactions only. AU accounts show the last statement's closing balance until the next statement lands.
- The match-and-merge supersedure code from ADR 0004 step 3 is exercised only by NZ live data in V1, but the shape generalises if AU live is added later.
- The drop reduces V1 scope by one tracer and removes the Google Cloud OAuth + ANZ AU alert + Gmail filter setup steps from the operator-side prerequisites for the rolling PR.
- ADR 0004 stays in the docs index as the architectural decision for live-data sources alongside file-import. This ADR (0005) sits beside it as the inline amendment.
- Reversing this decision is easy: a future T1e tracer can land without schema work, just an Edge Function + UI + the relevant data source.
