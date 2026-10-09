# Provider review (2026-10-09)

The default LicensedLocalDictionaryProvider uses independently authored Japanese/Vietnamese starter material only. No crawler output, Mazii requests, dictionary imports, or external calls are used. Coverage is intentionally small; levels are pedagogical estimates, not an official JLPT syllabus.

Reviewed official sources:

- https://jotoba.de/docs.html — OpenAPI embedded in the official page specifies POST /api/search/words, query, language and no_english; response words have reading, common and senses. Language enum does not include Vietnamese. The documented Word schema has no JLPT level or topic, while our DictionaryEntry requires both. https://github.com/WeDontPanic/Jotoba explicitly permits documented API use within a fair amount. Adapter is deferred rather than fabricating required metadata or Vietnamese translations. Local provider needs no network.
- https://www.edrdg.org/edrdg/licence.html — Japanese/English JMdict and KANJIDIC2 have CC BY-SA 4.0 terms, attribution and update obligations; other language components have separate rights. No imported data is bundled here.
- https://github.com/kanjialive/kanji-data-media — official data/media project: README states CC BY 4.0, with font exceptions (Apache 2.0 and M+ font license). The official web-app repository links public hosted API documentation at https://app.kanjialive.com/api/docs/ and a RapidAPI subscription. Hosted API credentials/quota have not been supplied or verified for this installation. No media is copied and no stroke-recognition claim is made.

Browser speech synthesis uses the original listening transcript; it is synthetic playback, not recorded native-speaker audio. Optional provider integrations require a separate contract for unknown levels and gloss language before mounting.
