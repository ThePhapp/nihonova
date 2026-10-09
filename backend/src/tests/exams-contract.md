# Exam integration addition

Original starter practice only: 5 questions/level (vocabulary, kanji, grammar, reading, listening), a 10-minute timer, not an official JLPT simulation. Start returns id/skill/prompt/options and optional audioText for listening TTS; no answers, explanation or source in questions. Listening prompt is only the question; original dialogue is in audioText, to be played by the browser with transcript hidden during the attempt. Score is a count of correct answers, never a percentage.

Foundation migration required: add `exam_attempts.saved_answers jsonb NOT NULL DEFAULT '{}'::jsonb`. Preserve existing attempts; no data replacement. Lead owns migration and mounting default routers.

`PUT /api/exams/:id/answers` authenticated `{answers:Record<string,number>}` returns `{success:true}`. A complete answer snapshot replaces the previous snapshot. Validate all IDs and indices. Ownership/expiry/submission checked under row lock. Save before deadline only; after expiry or submission returns 409.

Frontend should serialize autosave requests when choices change and show failed saves. At deadline, POST submit `{answers:{}}` to finalize from the last server-saved snapshot. Before expiry, submit uses validated submitted answers. After expiry, a nonempty payload differing from the saved snapshot returns 409 `EXAM_EXPIRED`; empty payload or the identical snapshot finalizes using saved answers. Missing answers count as incorrect. Once submitted, valid retries return exactly the stored result, including createdAt; no duplicate stats. A first request waits for the row lock before checking PostgreSQL clock time, so autosave completed before expiry is preserved. Server clock, not browser timer, governs expiry.

Start serializes per-user creation with an advisory transaction lock and allows at most 10 starts/hour. Tests use an isolated injected store and transactional SQL fake; full PostgreSQL migration/integration verification belongs to lead's disposable test database, never existing data.
