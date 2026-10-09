# Provider review (2026-10-09)

The default LicensedLocalDictionaryProvider uses independently authored Japanese/Vietnamese starter material only. No crawler output, Mazii requests, dictionary imports, or external calls are used. Coverage is intentionally small; levels are pedagogical estimates, not an official JLPT syllabus.

Reviewed official sources:

- https://jotoba.de/docs.html — OpenAPI embedded in the official page specifies POST /api/search/words, query, language and no_english; response words have reading, common and senses. Language enum does not include Vietnamese. The documented Word schema has no JLPT level or topic. https://github.com/WeDontPanic/Jotoba explicitly permits documented API use within a fair amount. T01.2 extends DictionaryEntry to level: Level|null and meaningLanguage: 'vi'|'en', preserving absence rather than inventing metadata. Local provider needs no network.
- https://www.edrdg.org/edrdg/licence.html — Japanese/English JMdict and KANJIDIC2 have CC BY-SA 4.0 terms, attribution and update obligations; other language components have separate rights. No imported data is bundled here.
- https://github.com/kanjialive/kanji-data-media — official data/media project: README states CC BY 4.0, with font exceptions (Apache 2.0 and M+ font license). The official web-app repository links public hosted API documentation at https://app.kanjialive.com/api/docs/ and a RapidAPI subscription. Hosted API credentials/quota have not been supplied or verified for this installation. No media is copied and no stroke-recognition claim is made.

Browser speech synthesis uses the original listening transcript; it is synthetic playback, not recorded native-speaker audio.

## Optional Jotoba adapter (T01.2)

GET `/api/dictionary?provider=jotoba&q=...` selects Jotoba; default remains local. Jotoba entries return English meanings (`meaningLanguage:'en'`), `level:null`, `topic:''`, `romaji:''`, empty examples, and no conjugations or media. Local entries explicitly have `meaningLanguage:'vi'`. Level/topic filters are local-only; supplying them for Jotoba returns 400. Frontend and saved-card validation must accept null level and render gloss language; preserve attribution when saving snapshots.

One free live lookup on 2026-10-09 POST `{query:'猫',language:'English',no_english:false}` returned HTTP 200 with words including 猫/ねこ and English glosses. The actual sense POS used tagged objects (`{Noun:'Normal'}`), whereas the docs describe strings. Validation supports bounded string or tagged-object labels; nested enum labels are retained as English labels. Only requested English senses are returned. The response's kanji JLPT tag is not used for the word's level. No upstream audio, examples, Vietnamese translations or recognition results are claimed.

Attribution: JMdict by Jim Breen/EDRDG, https://www.edrdg.org/wiki/index.php/JMdict-EDICT_Dictionary_Project and CC BY-SA 4.0 https://www.edrdg.org/edrdg/licence.html. These links are attached to each record. This proxy caches for only 60 seconds, never bundles a dictionary snapshot, and propagates share-alike licensing for the returned dictionary data. UI consumers must display source/license links.

Each upstream attempt has a 3.5-second total deadline, at most two attempts with 200 ms backoff (7.2 seconds total), retrying only transport/5xx failures. 429 is not retried. Max response 256 KiB; bounded records/strings and at most 50 returned entries. Word/reading max 200 characters, POS max 500, meanings max 24 × 512 characters; trailing glosses are omitted if needed to keep each entry under 16,000 UTF-8 bytes (within the saved-card 16 KiB cap including wrapper). Cache max 100 query keys, TTL 60 seconds. Rate: 10 requests/client IP/minute, 30 upstream attempts/service/minute, two concurrent calls, at most 1,000 client windows. Cache requests still count toward client rate. Limits/cache are process-local and need a shared limiter before scaling to multiple instances. Failure returns clear 503/429 without upstream bodies; local remains independently usable.
