# Architecture audit — 2026-10-09

Baseline: `2b1a8a5`; clean worktree, branch `main`. Integration branch: `integration/japanese-platform`.

## Stack and reusable components

Next.js 13 Pages Router, React 18, TypeScript 4.9, Tailwind 3; Express 4, PostgreSQL 15, npm workspaces. Preserve these frameworks. Reuse auth/theme contexts, layout boundaries, flashcard and audio interaction patterns. No component library or working test harness is present. Node 22 and Docker are available locally.

## Baseline verification

- Backend build FAIL: auth imports missing `../db`; crawler response untyped; invalid migration runner import/API. `src/index.ts` is missing although dev/start depend on it.
- Frontend build FAIL: unknown catch variable in AuthForm, further type errors may follow.
- Frontend lint DOES NOT RUN: ESLint is missing (Next returns exit zero despite the error). This is not a pass.
- No test/typecheck scripts. Existing schema and clients disagree (`vocab` versus `vocabulary`, multiple meanings formats).
- Auth returns `{success,token,user}` but context saves the entire envelope as the user. No working session validation. JWT signing has an unsafe fallback.
- Two progress hooks write incompatible shapes to the same localStorage key and can overwrite loaded data on mount. Account synchronization is absent.
- Existing Mazii HTTP calls and crawler do not document permission; disable these and replace the active path with lawful providers.
- Tracked infrastructure/configuration contains embedded development credentials. Replace with environment configuration; existing history is not rewritten.

| Module | Baseline status | Evidence |
|---|---|---|
| A Dictionary | Broken | Unverified Mazii endpoints, incompatible API shapes |
| B Kanji | Missing | No working page/backend |
| C Vocabulary | Partial | Cards/list UI exist, schema/server missing |
| D Grammar | Missing | Navigation points to absent page |
| E JLPT | Missing | No exam engine or persistence |
| F Reading | Missing | No article reader |
| G Listening | Partial | Browser speech button only |
| H Tutor | Missing | No provider/configuration |
| I Learning plan | Missing | No durable plan |
| J Account/dashboard | Broken | Auth contract mismatch and placeholder statistics |

## Constraints

No external service credentials or public publishing authority supplied. Do not infer consent to paid provider calls. Provider-dependent features must show unavailable states. Original starter learning material is usable content, but is not an exhaustive N5–N1 curriculum or expert-certified question bank. Preserve all existing data; use additive migrations and a separate disposable test database.
