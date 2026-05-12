---
name: marketing
priority: 50
---

# Marketing

Promotional emails. Archives only after first-time sender approval.

## Match

- Clear promotional content: `sale`, `% off`, `limited time`, `exclusive offer`, `new arrivals`, campaign-style HTML layouts.
- Sender NOT in `senders` as `whitelist`.

## Confidence

- **High** — sender already in `senders` as `blacklist`.
- **Medium** — first-time sender with clear promotional content → propose archive **and** ask to add to blacklist.
- **Low** — transactional-looking sender with promotional content (e.g. airline upgrade offer from a no-reply utility domain) → ❓ Needs your call.

## Action spec

1. **Archive** on approval.
2. **If first-time sender**, ask whether to add to `senders` as `blacklist` (auto-archive next time) or treat as one-off.

## Approval prompt

```
[Sender] — "[Subject]"
Marketing. First time seeing this sender.
Archive + add to blacklist? (y / archive only / keep / skip)
```

## Changelog
- 2026-04-18 — Scaffold.
