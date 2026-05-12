---
name: auth-codes
priority: 5
---

# Auth codes / OTPs

Never archive, never print the code.

## Match

- Sender is a transactional auth service (e.g. `@accounts.google.com`, `@login.microsoft.com`, banking 2FA services).
- Subject / body contains: `verification code`, `one-time`, `2FA`, `OTP`, `security code`.

## Confidence

Always high.

## Action spec

1. **Keep in inbox.**
2. In the proposal summary, note `auth code from [service]`. **Never include the code contents.**

## Approval prompt

None — surfaced in "Kept for your attention" only.

## Changelog
- 2026-04-18 — Scaffold.
