# API integration and contracts

## Provider decisions (checked 2026-10-09)

- Mazii: [official terms](https://mazii.net/terms-of-user.html) found; no verified public developer grant/quota/schema established. Do not call private endpoints or scrape. Adapter remains unavailable until authorization exists.
- JMdict/KANJIDIC2: [EDRDG licence](https://www.edrdg.org/edrdg/licence.html) currently CC BY-SA 4.0 for covered data; attribution per screen or sources page, links, derivative dataset share-alike and monthly updates required. Other language components can have separate rights. No assumption of Vietnamese support.
- Jotoba: [official docs](https://jotoba.de/docs.html) require further schema/live verification. Optional adapter only if documented; English glosses must be labeled as English. Never invent Vietnamese translations.
- Kanji Alive: [project](https://kanjialive.com/) and [upstream repository](https://github.com/kanjialive/kanji-data-media). Verify media licensing and hosted API credentials/quota before enabling. Do not imply stroke recognition is available.
- Default: independently authored starter Japanese/Vietnamese learning content with explicit provenance and limited coverage. Do not import existing crawler output of uncertain provenance. Attach source metadata to each record.
- Browser SpeechSynthesis and optional microphone recording: feature detection, explicit user gesture/permission, no invented pronunciation score. Tutor/translation/STT: server-side provider interfaces, bounded input/output, timeout/rate limits, disabled when credentials absent.

## HTTP v1 contract

Base `/api`. JSON success endpoints below return the stated shape directly (no universal envelope). Errors `{error:string, code?:string}` with appropriate 400/401/404/409/429/503 status. Dates ISO 8601, IDs strings, levels `N5|N4|N3|N2|N1`. Client fetch sends Bearer token from `jlpt-token`; server validates account ownership. JSON bodies bounded. Request validation is server-side.

### Auth and state (T02 owner)

- POST `/auth/register` `{email,password}` → 201 `{success:true}`; passwords 8–72 UTF-8 bytes, normalized email, unique constraint.
- POST `/auth/login` `{email,password}` → `{success:true,token,user:{id,email}}`.
- GET `/auth/me` → `{id,email}` authenticated.
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

Expose `pool` from `backend/src/config/db.ts`; authMiddleware and AuthenticatedRequest from existing middleware. Add tables `learning_profiles(user_id primary key,preferences jsonb)`, `learning_cards(id text primary key,user_id integer,entry jsonb,due_at timestamptz,interval numeric,ease numeric,repetitions integer,last_reviewed timestamptz)`, `learning_activity(id bigserial,user_id integer,kind text,item_id text,minutes integer,completed boolean,created_at timestamptz)`, `learning_history(user_id integer,query text,created_at timestamptz)`, `exam_attempts(id text primary key,user_id integer,level text,questions jsonb,started_at timestamptz,expires_at timestamptz,result jsonb)`; FK users(id). T02 owns migrations; T07 uses exam_attempts only. Avoid altering legacy vocab data.

### Dictionary/content/exams/AI (T01 worker owner)

- GET `/dictionary?q=&level=&topic=` → `{entries:DictionaryEntry[],source:string,limited:boolean}`. Empty query lists local starter collection; maximum query 100 chars. Related words/conjugations optional; no fabricated upstream metadata.
- `DictionaryEntry = {id,word,reading,romaji,meanings:string[],partOfSpeech:string,level,topic,examples:Array<{japanese,vietnamese}>,source:{name,url?,license},conjugations?:Record<string,string>,related?:string[]}`.
- GET `/content/kanji?level=` → `{items:Kanji[]}`; `Kanji={id,character,onyomi:string[],kunyomi:string[],meaning,radical,strokes:number,level,mnemonic,words:string[],source}`.
- GET `/content/grammar?level=&q=` → `{items:Grammar[]}`; `Grammar={id,title,structure,explanation,level,examples:Array<{japanese,reading?,vietnamese}>,source}`.
- GET `/content/reading?level=` → `{items:Reading[]}`; `Reading={id,title,level,segments:Array<{text,reading?,meaning?}>,translation,questions:Array<{prompt,options:string[],answer:number,explanation}>,source}`.
- GET `/content/listening?level=` → `{items:Listening[]}`; `Listening={id,title,level,transcript,translation,question:{prompt,options:string[],answer:number,explanation},source}`. Browser TTS generated playback clearly labeled.
- POST `/exams/start` `{level}` authenticated → `{id,level,expiresAt,questions:Array<{id,skill,prompt,options:string[]}>}`. Server keeps answers; no answer leak before submit.
- POST `/exams/:id/submit` `{answers:Record<string,number>}` authenticated → `ExamResult`; grade server-side, validate chosen indices, allow missing as incorrect, expiration enforced, retry returns same persisted result without duplicate stats.
- GET `/ai/status` → `{available:boolean,provider:string,reason?:string}`.
- POST `/ai/tutor` `{message,level,explainVietnamese:boolean,history?:Array<{role:'user'|'assistant',content:string}>}` authenticated → `{reply,provider,notice}`; unavailable 503 without key; no history saved without opt-in. Provider client abstracted, no fake response.

### Frontend integration

T03 creates `frontend/utils/api.ts`: `api<T>(path:string, options?:RequestInit):Promise<T>` (path includes `/api`), timeout/error checking, auth header. Export named `api`. Use existing AuthContext API. T05/07/08/09 pages wrap existing `Layout`, import named `api`, use local types until shared types are safely integrated. CSS contract from T03: `panel`, `btn`, `btn-primary`, `field`, `page-heading`, `muted`, `badge`, `notice`, `grid-cards`; accessible default HTML, responsive Tailwind utilities allowed.
