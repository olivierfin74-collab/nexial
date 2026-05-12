# MELI Flash Drop Reference Case

Case key: `MELI_FLASH_DROP_2026_05_11`

MELI is the first official Nexial reference behavior. It documents the expected product response to a high-quality asset under temporary market panic.

## Classification

- Ticker: `MELI`
- Type: `FLASH_DROP`
- Behavior: quality asset, brutal drop, temporary panic
- Philosophy: Reaction Quality System, not prediction system

## Expected System Behavior

1. Detect the `FLASH_DROP` deterministically.
2. Prioritize the event using watchlist, portfolio, and tier context.
3. Expose the event in the opportunity feed.
4. Generate a ladder plan with `Z1 / Z2 / Z3`.
5. Suggest only `WATCH`, `PREPARE_LADDER`, or `WAIT`.

## Guardrails

- No full buy immediately.
- No broker execution.
- No final BUY decision.
- No LLM reasoning.
- No learning automation.

## Ladder Behavior

- Z1: first disciplined entry level, 40% of intended amount.
- Z2: deeper pullback level, 35%.
- Z3: stress/capitulation level, 25%.

This case is a reference for future agents and implementation reviews. It is not a model-training input and must not trigger automatic strategy changes.
