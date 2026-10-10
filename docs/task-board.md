# Task board

Models: lead current session; workers `gpt-6.1-sol` (available substitute for requested GPT-5.6). Each row is an independent prompt: implement goal in scope, honor docs/api-integration.md, use explicit staging and conventional commit, report tests/hash/limits. All branch names start `task/` and fork committed T00 contracts. No push.

| ID | Priority | Goal and exact file scope | Dependencies | Acceptance / tests | Model | Status |
|---|---|---|---|---|---|---|
| T00 | P0 | Audit/contracts/plan: docs/architecture-audit.md, docs/implementation-plan.md, docs/api-integration.md, docs/task-board.md | none | Baseline commands recorded, contracts and graph reviewed; diff check | Lead | Done |
| T01 | P0 | Providers/original data: backend/src/providers/**, backend/src/content/**, backend/src/routes/dictionary.ts, backend/src/routes/content.ts, backend/src/tests/providers* | T00 | Typed validated lookup; source/coverage; tests | Worker content | In progress — starter/provider delivered; full corpus pending |
| T02 | P0 | Auth/runtime/persistence: backend/src/index.ts, app.ts, config/**, middleware/**, routes/auth.ts, routes/me.ts, migrations/**, services/**, scripts/**, backend/package.json, backend/tsconfig.json, backend/src/tests/foundation* | T00 | Build, SRS tests, additive migrations, ownership/session tests | Worker foundation | Done — HttpOnly browser session, password change and old-session revocation |
| T03 | P0 | UI/auth/client: frontend components/layout/**, components/auth/**, contexts/**, styles/**, utils/api.ts, pages/_app.tsx,index.tsx,login.tsx,register.tsx; frontend package/config only if coordinated | T00 | Responsive shell/theme/auth; no build/type errors in scope | Worker UI | Done — responsive shell and global search |
| T04 | P0 | Dictionary: frontend/pages/dictionary.tsx,vocabulary.tsx,vocab.tsx,vocab/[id].tsx; utils/maziiScraper.ts, components/vocabulary/** | T01,T03 | Search modes/history/save/errors; no unauthorized Mazii calls | Worker UI | In progress — working limited dictionary; expanded corpus pending |
| T05 | P1 | Learning: frontend/pages/kanji.tsx,grammar.tsx,components/learning/** | T01,T03 | Level filters, handwriting pad, grammar exercises and saved progress | Worker learning | In progress — lessons/pad/quiz done; advanced exercises and licensed media pending |
| T06 | P1 | SRS: backend/services/srs.ts (foundation); frontend/pages/study.tsx,hooks/**,components/study/** (UI) | T02,T03,T04 | Persisted due scheduling; failure/repeat edge tests | Foundation/UI | Done — core saved-card SRS |
| T07 | P1 | Exams: backend/routes/exams.ts, tests/exams* (content); frontend/pages/jlpt.tsx (learning) | T01,T02,T03 | Server grading, timer, ownership, persisted results | Content/learning | Done — starter practice with reload recovery, not full official-length bank |
| T08 | P1 | Reading/listening: frontend/pages/reading.tsx,listening.tsx,components/learning/** | T01,T03 | Reader lookup/progress, quizzes, TTS speed/transcript, mic handling | Worker learning | In progress — reader/TTS/dictation done; external speech/translation pending |
| T09 | P2 | Tutor: backend/routes/ai.ts,providers/ai* (content); frontend/pages/tutor.tsx (learning) | T02,T03 | Limits, timeout, explicit unavailable state, provider mock tests | Content/learning | Blocked live validation — adapter done; provider key absent |
| T10 | P1 | Dashboard/plan: frontend/pages/dashboard.tsx,settings.tsx | T02,T03,T06,T07 | Actual server counters, account preferences, study recommendations | Worker UI | In progress — dashboard/preferences/password done; calibrated placement/reminders pending |
| T11 | P1 | QA: tests/**, playwright.config.*, root package/lock, lint configs | integrated core | Lint/typecheck/build, isolated PostgreSQL integration, browser journey | Lead | Done — 48 unit/hook, 11 integration, 28 production E2E pass |
| T12 | P1 | Setup/security: README.md, docs/setup.md, docs/delivery.md, docker-compose.yml, infra/**, env examples, gitignore | T11 | Reproducible setup/deploy, limitations/commits documented, no embedded credentials | Lead | Done for controlled single-instance deployment; public rollout checks remain documented |

Subtasks may be marked Partial/Blocked honestly when content coverage or provider credentials prevent full acceptance. Commit completed independently verifiable slices with their exact acceptance recorded. Main agent integrates in dependency order.

## Integration checkpoint — 2026-10-10

Current branch: `main`. All earlier worker implementation commits listed in [delivery](delivery.md) and the follow-up hardening commits are integrated locally; no push command was run. Status above applies to the wider master prompt, not a claim that starter content satisfies a complete curriculum.

T11.1 API wiring: `2ee6e02`; T11.2 QA/toolchain: `8dcbfc3`; T03.1 search: `c56f3ed`; T03.2 validated learning targets: `64c564a`. Follow-up hardening adds exam recovery (`741c170`), cookie sessions/password revocation (`7565101`), deployment/runtime protections (`6b24f79`), full TypeScript/Next lint (`240e166`) and anonymous session probing without console 401s (`88ec949`). Final production browser run is **28/28 pass** on desktop and Chromium 375px. See delivery for the exact tested scope and outstanding product work.
