# Agent assignments

All workers use `gpt-6.1-sol`, medium reasoning, substituted because GPT-5.6 is not exposed by the tool. Lead retains architecture/review/integration. No metered cost or token report is provided by the agent tools.

Shared instruction: read AGENTS.md and the API contracts; use the assigned isolated worktree; do not modify another worker's files or run npm install against shared dependencies; preserve existing data; implement real loading/error/empty states and validation; run relevant checks; stage explicit paths; create a separate Conventional Commit per completed task; report actual hashes, test evidence and limitations. No remote push. Production mock responses and unverified Mazii endpoints are forbidden.

| Worker | Worktree | Branch | Tasks |
|---|---|---|---|
| Aquinas | `D:/cd/JLPT-worktrees/foundation` | `task/backend-foundation` | T02, T06 server |
| Leibniz | `D:/cd/JLPT-worktrees/content` | `task/content-providers` | T01, T07 server, T09 server |
| Nash | `D:/cd/JLPT-worktrees/ui` | `task/frontend-core` | T03, T04, T06 client, T10 |
| Arendt | `D:/cd/JLPT-worktrees/learning` | `task/learning-pages` | T05, T07 client, T08, T09 client |

## Foundation prompt

Repair Express startup, reuse pg/auth, add bounded validated register/login/me routes and persistent preferences/cards/activity/history. Implement SRS with server clock and row locks. Create additive, repeatable migrations for the contract tables, including exam_attempts.saved_answers; do not modify/drop legacy user data. Expose a testable app separately from the listening index. Fail closed without JWT secret. Remove credentials from tracked config, disable crawler, fix migration runner. Own only backend foundation files listed in task board. Verify backend build plus scheduling/validation tests; integration DB is local `jlpt_test` on port 5440. Other agent owns content/exam/tutor routers; lead mounts them after integration.

## Content prompt

Implement typed local dictionary provider and independently authored, explicitly limited N5–N1 starter words, kanji, grammar, reading/listening content and questions. Search kana/romaji/Japanese/Vietnamese with bounded fuzzy matching; retain provenance and do not translate English provider glosses silently. Research official alternative provider licensing/schema; enable external services only with verified terms/configuration. Implement authenticated timed server exams with no answer leakage, saved answers, ownership checks, atomic idempotent grading and per-skill results. Implement bounded server-side tutor adapter with mocks and explicit unavailable state without credentials. Own providers/content/routes dictionary/content/exams/ai and their tests. Do not edit app.ts or DB migrations. Separate commits T01/T07/T09 with targeted tests.

## Core UI prompt

Keep Pages Router/React/Tailwind and auth/theme concepts. Build Vietnamese responsive sidebar/mobile shell, typed API helper, session restoration/logout/expiry, real dictionary/history/bookmarks, due-card SRS, server-derived dashboard and preferences. Replace unauthorized Mazii calls and unsafe old progress hooks. Match exact API contracts and shared CSS names for the learning worker. Respect accessiblity including visible focus, 375px and dark mode. System Japanese font fallback avoids network font build failures. Original starter content must be labeled. Own existing frontend files, new dictionary/settings only; do not touch the learning worker's six pages/components. Root manifests/Next config belong to lead. Separate commits T03/T04/T06/T10; lead handles integrated browser verification.

## Learning UI prompt

Build only kanji/grammar/jlpt/reading/listening/tutor pages and components/learning. Reuse Layout, AuthContext and named api helper from core UI. Provide level/search filters, writing canvas with honest recognition limitation, grammar exercises/progress, server-timed exam with autosave/results, reader ruby/lookup/translation/font size/progress/questions, TTS speed/transcript/dictation and optional local microphone recording, and configured tutor/disabled states. Prevent audio/stream leaks and stale requests/account data. Scope of external speech assessment stays unavailable without valid provider; do not invent scores. Separate commits by task, check scoped types, report pending integration dependencies.

## Lead-owned work

Root dependency/security fixes, lockfile, test DB, integration tests, Playwright E2E, app router wiring, infrastructure/deployment docs and final status. Review worker commits before cherry-pick; inspect errors and fix integration conflicts. Dependency patching preserves framework/router, with justified upgrade to Next 15 for security. Test against isolated PostgreSQL, never existing learner databases. No deployment or paid API usage occurs automatically.
