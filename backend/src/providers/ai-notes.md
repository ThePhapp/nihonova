# Tutor adapter

Official schema reviewed 2026-10-09: [Messages API](https://platform.claude.com/docs/en/api/messages/create), [API overview](https://platform.claude.com/docs/en/api/overview).

HTTP POST https://api.anthropic.com/v1/messages; headers `x-api-key`, `anthropic-version: 2023-06-01`, `content-type: application/json`. Text-only request carries `model`, `max_tokens`, `system`, `messages`; response is an assistant message with text content blocks and input/output token usage. Tool/thinking/non-text responses are rejected. No SDK/dependency added. Mock tests exercise schema, transport limits and sanitized errors; no paid live calls made.

Server environment: `ANTHROPIC_API_KEY` (required to enable), `AI_MODEL` (optional, default `claude-haiku-4-5-20251001`). These values are read by the server only; no key or provider error body is returned. Without valid configuration status is unavailable and authenticated tutor requests return 503. Availability means configured, not a live credential health check.

Limits: 4,000 UTF-8 bytes per message, 10 history turns, 16,000 input bytes, 24,000 body bytes, 1,024 output tokens, 16,000 output bytes, 64,000 HTTP response bytes, 15-second total timeout. Per user: 6 calls/minute, one concurrent call, 100,000 daily tokens; service: 4 concurrent calls, 1,000 tracked users. A conservative token reservation precedes each call; failures retain the reservation because upstream billing is unknown. Successful calls reconcile reported usage.

Budgets are process-local and restart daily/on process restart. They must be moved to a shared durable store before enabling multiple server instances or relying on a monetary spending guarantee. Token caps bound workload, not exact currency cost. Conversation is not stored locally; configured provider receives the request/history under its own terms. History is supplied explicitly by the caller. AI explanations may be wrong.
