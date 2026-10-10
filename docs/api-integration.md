# API integration and contracts

## Provider decisions (checked 2026-10-09)

- Mazii: [official terms](https://mazii.net/terms-of-user.html) found; no verified public developer grant/quota/schema established. Do not call private endpoints or scrape. Adapter remains unavailable until authorization exists.
- JMdict/KANJIDIC2: [EDRDG licence](https://www.edrdg.org/edrdg/licence.html) currently CC BY-SA 4.0 for covered data; attribution per screen or sources page, links, derivative dataset share-alike and monthly updates required. Other language components can have separate rights. No assumption of Vietnamese support.
- Jotoba: [official docs](https://jotoba.de/docs.html) and [upstream fair-use guidance](https://github.com/WeDontPanic/Jotoba) checked; one live Japanese lookup returned 200. Opt-in adapter validates the documented response plus observed tagged POS fields. English glosses are labeled, JLPT level is unknown. See backend/src/providers/RESEARCH.md for bounded cache, transport, attribution and test details.
- Kanji Alive: [project](https://kanjialive.com/) and [upstream repository](https://github.com/kanjialive/kanji-data-media). Verify media licensing and hosted API credentials/quota before enabling. Do not imply stroke recognition is available.
- Default: independently authored starter Japanese/Vietnamese learning content with explicit provenance and limited coverage. Do not import existing crawler output of uncertain provenance. Attach source metadata to each record.
- Browser SpeechSynthesis and optional microphone recording: feature detection, explicit user gesture/permission, no invented pronunciation score. Tutor/translation/STT: server-side provider interfaces, bounded input/output, timeout/rate limits, disabled when credentials absent.

## HTTP v1 contract

Base `/api`. JSON success endpoints below return the stated shape directly (no universal envelope). Errors `{error:string, code?:string}` with appropriate 400/401/403/404/409/429/503 status. Dates ISO 8601, IDs strings, levels `N5|N4|N3|N2|N1`. Browser requests use a same-origin `HttpOnly`, `SameSite=Strict` session cookie and `credentials: include`; unsafe cookie-authenticated requests must have an allowed `Origin`. Bearer tokens remain accepted for non-browser/API compatibility, but the browser does not persist them. The server validates account ownership. JSON bodies are bounded and request validation is server-side.

### Auth and state (T02 owner)

- POST `/auth/register` `{email,password}` → 201 `{success:true}`; passwords 8–72 UTF-8 bytes, normalized email, unique constraint.
- POST `/auth/login` `{email,password}` → `{success:true,token,user:{id,email}}` plus the session cookie. `token` is retained for API compatibility.
- GET `/auth/session` → `{user:{id,email}|null}` without returning 401 for an anonymous browser; refreshes a valid cookie.
- GET `/auth/me` → `{id,email}` authenticated.
- POST `/auth/logout` → 204 and expires the browser cookie.
- POST `/auth/password` `{currentPassword,newPassword}` → `{success:true,token,user}`; increments `session_version`, invalidates every older session and keeps the current browser signed in with a new cookie.
- GET `/me/state` → `LearningState` below, defaults for new account.
- PUT `/me/preferences` `{level,targetLevel,dailyMinutes,furigana,romaji}` → saved preferences; minutes 5–180.
- POST `/me/cards` `{entry:DictionaryEntry}` → saved card; server validate bounded snapshot, idempotent by entry.id/account.
- POST `/me/cards/:id/review` `{rating:0|1|2|3, reviewedAt?:string}` → saved card. Server uses own time and locks row; reject reviews before due to prevent duplicate mastery increments.
- DELETE `/me/cards/:id` → `{success:true}` account scoped.
- POST `/me/activity` `{kind:'kanji'|'grammar'|'reading'|'listening',itemId:string,minutes:number,completed:boolean}` → `{success:true}`. Completion deduplicated per item. Reject unbounded minutes.
- POST `/me/history` `{query}` → `{success:true}`; cap history per account.

```
Preferences = {level,targetLevel,dailyMinutes,furigana:boolean,romaji:boolean}
Card = {id:string,entry:DictionaryEntry,dueAt:string,interval:number,ease:number,repetitions:number,lastReviewed:string|null}
LearningState = {preferences:Preferences,cards:Card[],history:string[],activities:Activity[],exams:ExamResult[],stats:{cards:number,due:number,mastered:number,streak:number,minutesToday:number,accuracy:number}}
Activity = {kind,itemId,minutes,completed,createdAt:string}
ExamResult = {id,level,score:number,total:number,bySkill:Record<string,{correct,total}>,createdAt:string,answers:Array<{questionId,answer:number,correctAnswer:number,correct:boolean,explanation:string}>}
```

Expose `pool` from `backend/src/config/db.ts`; auth middleware and `AuthenticatedRequest` from existing middleware. Add tables `learning_profiles(user_id primary key,preferences jsonb)`, `learning_cards(id text primary key,user_id integer,entry jsonb,due_at timestamptz,interval numeric,ease numeric,repetitions integer,last_reviewed timestamptz)`, `learning_activity(id bigserial,user_id integer,kind text,item_id text,minutes integer,completed boolean,created_at timestamptz)`, `learning_history(user_id integer,query text,created_at timestamptz)`, `exam_attempts(id text primary key,user_id integer,level text,questions jsonb,started_at timestamptz,expires_at timestamptz,result jsonb,saved_answers jsonb)`; FK users(id). `users.session_version` revokes older signed sessions after a password change. All schema changes use additive migrations; avoid altering legacy vocab data.

### Dictionary/content/exams/AI (T01 worker owner)

- GET `/dictionary?q=&level=&topic=` → `{entries:DictionaryEntry[],source:string,limited:boolean}`. Empty query lists local starter collection; maximum query 100 chars. Related words/conjugations optional; no fabricated upstream metadata.
- Optional `provider=jotoba` requests verified public Japanese–English lookup; upstream entries have `level:null`, empty/unknown topic and `meaningLanguage:'en'`. Never fabricate JLPT level or Vietnamese glosses; level/topic filters apply to local content only. Default local entries may carry `meaningLanguage:'vi'`. Saved-card validation and UI must preserve these differences.
- `DictionaryEntry = {id,word,reading,romaji,meanings:string[],partOfSpeech:string,level,topic,examples:Array<{japanese,vietnamese}>,source:{name,url?,license},conjugations?:Record<string,string>,related?:string[]}`.
- GET `/content/kanji?level=` → `{items:Kanji[]}`; `Kanji={id,character,onyomi:string[],kunyomi:string[],meaning,radical,strokes:number,level,mnemonic,words:string[],source}`.
- GET `/content/grammar?level=&q=` → `{items:Grammar[]}`; `Grammar={id,title,structure,explanation,level,examples:Array<{japanese,reading?,vietnamese}>,source}`.
- GET `/content/reading?level=` → `{items:Reading[]}`; `Reading={id,title,level,segments:Array<{text,reading?,meaning?}>,translation,questions:Array<{prompt,options:string[],answer:number,explanation}>,source}`.
- GET `/content/listening?level=` → `{items:Listening[]}`; `Listening={id,title,level,transcript,translation,question:{prompt,options:string[],answer:number,explanation},source}`. Browser TTS generated playback clearly labeled.
- GET `/exams/active` authenticated → the latest unsubmitted attempt with its validated saved answer indices, or `{attempt:null}`. The client handles an already-expired attempt by submitting only its server-saved snapshot.
- POST `/exams/start` `{level}` authenticated → `{id,level,expiresAt,questions:Array<{id,skill,prompt,options:string[],audioText?:string}>,savedAnswers}`. Reuses the account's unexpired attempt instead of creating a duplicate. Server keeps answer keys; no grading metadata leaks before submit. `audioText` is an optional browser-TTS listening script.
- PUT `/exams/:id/answers` `{answers:Record<string,number>}` authenticated → `{success:true}`; persist while before expiry. `exam_attempts.saved_answers jsonb NOT NULL DEFAULT '{}'` stores the last accepted snapshot. Serialize saves per attempt on client.
- POST `/exams/:id/submit` `{answers:Record<string,number>}` authenticated → `ExamResult`; grade server-side, validate chosen indices, allow missing as incorrect; after expiry grade the server-saved snapshot only. Retry returns the same persisted result without duplicate stats.
- GET `/ai/status` → `{available:boolean,provider:string,reason?:string}`.
- POST `/ai/tutor` `{message,level,explainVietnamese:boolean,history?:Array<{role:'user'|'assistant',content:string}>}` authenticated → `{reply,provider,notice}`; unavailable 503 without key; no history saved without opt-in. Provider client abstracted, no fake response.

### Frontend integration

`frontend/utils/api.ts` exports `api<T>(path:string, options?:RequestInit):Promise<T>` (path includes `/api`) with timeout/error handling and cookies included. A legacy Bearer value is accepted only for one-way migration and removed from browser storage. Pages use the existing `AuthContext` and `Layout`. CSS contract: `panel`, `btn`, `btn-primary`, `field`, `page-heading`, `muted`, `badge`, `notice`, `grid-cards`; accessible default HTML and responsive Tailwind utilities are allowed.
