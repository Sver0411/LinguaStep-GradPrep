# Release history

[Project home](../README.en.md) · [Documentation](README.md) · [中文版本记录](changelog.md)

## v0.20.0 · 2026-10-29

- Rebuilt the shared mobile/desktop grammar workspace with remembered courses, an on-demand catalog, sequential/random study and due reviews.
- Imported reviewed Blue Book source: 766 Japanese lessons, 2,465 translated examples and 159 original figures. One suspect lesson and two additional examples are quarantined. The 15 existing English lessons are retained separately.
- Recall blanks reuse explicitly highlighted original text; reading-only lessons do not manufacture answers or count as correct attempts.
- Checked 12,905 Chinese vocabulary glosses and shortened or corrected 1,248, retaining previous values and stable progress IDs in an audit manifest.

## v0.19.0 · 2026-10-29

- Ten Red/Green Book volumes, N1–N5, with covers, remembered selection, explicit change-book control, optional full-book browser and collapsible language/order settings.
- Sequential, random and selected-word study; shared cross-book progress and book MP3 playback.
- Replaced the former built-in vocabulary; retained personal history and backup compatibility.
- Simplified the home screen and removed decorative copy. Standalone tests/training are hidden with files and history retained; word recognition remains active.

## v0.18.4 · 2026-10-28

- Upgraded `msedge-tts` to 2.1.1 for the updated Edge Read Aloud handshake, restoring synthesis when the previous integration fails.
- Kept the same Japanese, English and Chinese neural voices and bilingual example playback without an API key.

## v0.18.3 · 2026-10-27

- Expanded both READMEs into medium-length project overviews with learning flow, live page links, features, content counts, stack and common commands.
- Kept the banner and focused documentation navigation; detailed guides and release history remain separate.

## v0.18.2 · 2026-10-27

- Consolidated development into `main`; the older exam-bank branch was already part of the main history.
- Added an SVG project banner and concise Chinese/English READMEs, with dedicated guides for usage, content, development and deployment.
- Preserved release history and links to the paused AI backend documentation.

## v0.18.1 (2026-10-24)

Revealed words always show an example and its Chinese translation, including compact mode. Automatic playback reads the word, its example and the sentence translation for both languages; only the first revealed word additionally reads the word's Chinese definition. Example buttons replay the foreign sentence followed by Chinese. Quiz examples appear only after answering. Audio warm-up is queued at three concurrent requests. All 2,560 built-in pairs have both sentence translations; missing imported translations are labeled rather than fabricated.

## v0.18.0 (2026-10-24)

Learn by revealing up to five word pairs, then answer correspondence questions. Correct words leave the active pool; failed words stay in practice while newly revealed words refill five slots. The last question continues directly into the next batch without a round-summary confirmation page.

Japanese-English mode alternates both translation directions; single-language mode tests Chinese meanings. FSRS-6 (`ts-fsrs@5.4.2`) schedules objective answers using Again/Good at 90% desired retention. Session passing is separate from mature memory: the latter requires spaced successful reviews and sufficient stability. Old self-ratings remain separate; no personal parameter optimization is claimed. See [algorithm details and sources](spaced-repetition.md).

## v0.17.1 (2026-10-23)

Chinese is spoken only after the first revealed foreign word. Revealing both reads: first language → Chinese → second language. Single-language cards still read foreign → Chinese.

## v0.17.0 (2026-10-23)

- Corrected English difficulty and exam provenance, hid mobile word answers until reveal, and restored one shared Known / Uncertain / Unknown rating per card.
- Keyless Edge neural speech: Nanami (Japanese), Jenny (English), Xiaoxiao (Chinese). Revealing a word reads the foreign expression followed by its Chinese meaning; audio is prepared together to shorten the gap. System-speech fallbacks were removed.
- Book vocabulary can join daily learning and spaced review. Added listening, dictation, grammar cloze and unseen-first reading practice, with audio and typed recall retained in mistake review.
- Added mobile backup/restore and export timestamps, a primary goal and daily time budget, delayed self-recall and first-attempt statistics. Devices require manual backup transfer; they do not sync automatically.
- Reuses the existing corpus and scheduler; this is not a complete exam course or professional difficulty calibration. See the [Chinese release notes](changelog.md#v0170-使用体验修复2026-10-23) for details.


## Historical releases (v0.1–v0.16)

Historical descriptions below reflect their original releases. v0.17.0 corrects textbook/past-paper terminology and the incorrect mapping of middle-school English to CET levels.

| Version | Status | Main changes |
| --- | --- | --- |
| v0.1 | Complete | Home, 100 word groups, 20 grammar points, basic learning/tests/mistakes/favorites/statistics, IndexedDB v1, themes, and responsive layout |
| v0.2 | Complete | 300 word groups, 50 grammar points, 15 comparisons, three-mode review, daily plans, search/filtering, full statistics, IndexedDB v2 |
| v0.3 | Complete | DeepSeek dual-key modes, AI content generation/explanations/validation/history/usage, offline fallback, IndexedDB v3 |
| v0.3.4 | Complete | Switched Sites AI communication to Server Actions/RSC to bypass hosting-layer interception of ordinary API fetches while retaining compatibility routes |
| v0.3.5 | Complete | Continuous AI vocabulary/grammar ingestion, two-layer deduplication, automatic top-up, and an on-page generation entry point |
| v0.4.0 | Complete | Single daily learning path, cross-page next steps, one-click tests, continuous mistake queue, and separated navigation/filter layers |
| v0.4.1 | Complete | Added a study focus-mode setting, enabled by default but configurable to keep ordinary page navigation visible |
| v0.4.2 | Complete | Deduplicated test content first, rotated six translation directions, and shuffled entries to prevent repeats in one round |
| v0.5.0 | Complete | Expanded the word library to 6,000 groups, Japanese-English comparisons to 137, added mixed comparison tests, adjustable grammar AI batch sizes, and simpler mistake cards |
| v0.5.1 | Complete | Unified Japanese verb entries, rebuilt the exam-practice page, added language-level question banks and Japanese sections, explicit exit controls, and mobile improvements |
| v0.5.2 | Complete | Expanded the curated library to 461 groups, randomized word study, fixed English/mixed filtering, removed mastery filtering from study, enabled immediate test feedback, and simplified Statistics |
| v0.5.3 | Complete | Separated grammar lists and details, split test setup into steps, unified mistake/favorite card layouts, and fixed mobile controls and spacing |
| v0.5.4 | Complete | Fixed stretched mistake-filter status areas and aligned favorite-page actions with filtered result rows |
| v0.5.5 | Complete | Aligned the favorite-page search, language, and level controls along their input baselines |
| v0.5.6 | Complete | Moved grammar details to `/grammar/:id` and split tests into `/test`, `/test/setup`, and `/test/session` routes |
| v0.5.7 | Complete | Reverted grammar and test subroutes as requested and restored browsing, configuration, and practice within single pages |
| v0.5.8 | Complete | Removed the current-goal card from the bottom of the sidebar |
| v0.6.0 | Complete | Aligned and expanded the library to 2,560 words from Red/Green reference books, with at least 800 words per N1/N2/N3 level; simplified grammar levels to N1/N2/N3 |
| v0.6.1 | Complete | Reworked mobile navigation, filter drawers, and card spacing; added grouped “More” menus while preserving desktop layout and data structures |
| v0.7.0 | Complete | Rebuilt mobile as an independent app shell with a single-action home, simplified study setup, vertical grammar list, mobile filter drawer, collapsed management controls, and categorized settings; desktop and database unchanged |
| v0.7.1 | Complete | Added 10/20/30/50-question choices and fresh random sampling whenever a test starts or restarts |
| v0.7.2 | Complete | Fixed mobile navigation drift and focus-mode residue; kept rating buttons in the thumb zone and added a concise recent-study status to Home |
| v0.7.3 | Complete | Fixed the word-summary continue/retry flow, limited retries to new words from the current round, and prevented notes from being covered by the mobile rating area |
| v0.7.4 | Complete | Randomized and balanced correct-answer positions each round and added the Space shortcut for the next question/submission |
| v0.7.5 | Complete | Connected the daily flow after tests and mistake reviews, removed padded question duplicates, switched to incremental data writes, and added speech pronunciation plus backup export/import |
| v0.8.0 | Complete | Merged the reference module from the standalone mobile project, adding a "Reference" section with the kana chart (romaji plus audio) and seven daily-Japanese lookup groups on both desktop and mobile |
| v0.9.0 | Complete | Switched the phone experience to the standalone mobile project's four-tab UI sharing the main app's IndexedDB data; illustrations compressed to 240KB; desktop unchanged |
| v0.10.0 | Complete | Imported the local 红蓝宝书1000题 N1 PDF: 245 real N1 questions with publisher answers and Chinese explanations, validated by pypdf + Vision OCR cross-checking and deduplicated |
| v0.11.0 | Complete | OCRed the scanned N2/N3 books in full and added 133 real questions (68 N2 + 65 N3); 378 PDF drill questions now cover all three levels |
| v0.12.0 | Complete | Added "high-frequency word" sections to the library (N3/N2/N1/Basic, 1989 words) from open dictionary data and filtered book-scan OCR, with speech/favourites/search |
| v0.12.1 | Complete | Full walkthrough fixes: book-vocab favourites were silently dropped by the snapshot cleanup (now a dedicated vocab favourite kind shown on the favourites page); the mobile word library showed only 36 entries with no way to load more (now paged); the mobile library gained a source-section picker with book cards || v0.12.1 | Complete | Full walkthrough fixes: book-vocab favourites were silently dropped by the snapshot cleanup (now a dedicated vocab favourite kind shown on the favourites page); the mobile word library showed only 36 entries with no way to load more (now paged); the mobile library gained a source-section picker with book cards |
| v0.13.0 | Complete | Four fixes after a product review: (1) question-section labelling rewritten (grammar items had been mis-filed as vocabulary, leaving grammar rounds 99% filler); (2) bank stats now split real vs generated; (3) first-run home screen now guides new users; (4) home screen shows a study-streak metric |
| v0.14.0 | Complete | Removed all generated template questions; imported 1266 answer-keyed grammar and vocabulary items from the public JLPT exercise bank, growing grammar rounds from 14-37 to 243-260 questions. The Japanese bank now holds 1716 genuine questions |
| v0.14.1 | Complete | English bank expanded: 800 answer-keyed multiple-choice items imported from an open middle-school English exam dataset; CET-4 and CET-6 now hold 416 questions each (previously 8) |
| v0.14.2 | Complete | Japanese-English pairing completed: all 1989 high-frequency entries now carry an English counterpart from JMdict and the book cards show all three languages; the core bank was verified against JMdict and 19 wrong pairs were fixed |
| v0.14.3 | Complete | Example sentences: real JMdict / Tanaka corpus pairs replaced the templated sentences in the core bank (4410 entries) and 1943 Japanese-English example pairs were added to the high-frequency words |
| v0.14.4 | Complete | Pronunciation upgraded: word playback now prefers Youdao's real dictionary recordings (Japanese and English) with the browser voice as an offline fallback; buttons no longer disappear when no system Japanese voice is installed |
| v0.14.5 | Complete | Pronunciation source chain: Youdao real recording → Baidu voice → browser speech, switching automatically when a source is unreachable |
| v0.14.6 | Complete | Fixed pronunciation always sounding synthetic: loading the third-party audio straight from the browser fails (measured error:4), so the audio is now proxied through the app's own /api/tts endpoint |
| v0.14.7 | Complete | Fixed clipped endings and missing openings: audio is now downloaded in full before playback (blob + local cache) instead of streaming; removed the dead Baidu source |
| v0.14.8 | Complete | Pronunciation added across the phone experience: flashcards (word, English, example), kana charts (tap to hear), reference entries |
| v0.14.9 | Complete | Phone study flow aligned with desktop (Chinese prompt → Japanese → English → rating, the order was reversed); audio is preloaded and played synchronously, fixing the fallback to the system voice on mobile |
| v0.15.0 | Complete | Study mechanics brought in line with mainstream apps: (1) same-session looping — an "unknown" word returns at the end of the round and a "fuzzy" one a few cards later; (2) the phone gained the "retry unknown words" action; (3) the daily new-word budget shrinks with the review backlog; (4) a "known for good" button in the top-right corner |
| v0.15.1 | Complete | Starting a round is now a single click: level and round size moved into settings (one-time setup) and the study screen keeps only the action plus a language switch. The card also dropped romanisation, generated boilerplate notes and the prev/next footer |
| v0.15.2 | Complete | Explanations added: publisher commentary extracted from the 1000题 answer pages (856 / 931 / 938 entries per level), giving 354 of 378 past-paper questions a translation plus vocabulary/grammar notes |
| v0.15.3 | Complete | Every question now carries a hand-written Chinese explanation: all 1266 JLPT practice items (including the correct word order for the ★ ordering questions) and all 378 1000題 past-paper questions, replacing the OCR-mangled publisher notes. 1644/1644 questions explained, zero OCR noise |
| v0.15.4 | Complete | Fixed questions where you could not tell what was being asked: (1) vocabulary items now mark the tested word with 〔 〕 and say whether the reading or the meaning is tested (169 items); (2) reading-blank items got their passage back, shown above the question (16 items); (3) restored blanks truncated by OCR; (4) fixed ~20 scan-damaged words. The Japanese bank now has zero unmarked questions |
| v0.15.5 | Complete | Two real bugs: (1) the phone got stuck on the first word — the queue was reseeded every time the snapshot changed (i.e. after every rating); it is now seeded once per session. (2) Japanese always fell back to the robotic system voice — the dictionary audio sends no CORS header, so the fetch()-based path was always blocked; playback now goes through an `<audio>` element (media is not CORS-restricted), with the same-origin proxy as an optimisation only |
| v0.15.6 | Complete | Three phone fixes: (1) the tab bar's own rule was missing (only `.m2-tabbar-item` existed), so the nav rendered as four stacked rows at the bottom of the page — it is a real fixed bar again; (2) the phone's round summary now continues the daily plan ("继续：今日新词 / 今日语法") instead of dead-ending on "回到首页"; (3) the phone served the **same ten words every round** (plan ids were sliced without excluding words already studied), so items 11-20 were unreachable and progress stuck at 10/20. Also unified both shells on remaining-count and gave the phone a four-step rhythm that includes grammar |
| v0.16.0 | Complete | Structural refactor: (1) removed 137 macOS duplicate files that had been committed but were referenced by nothing (1.3MB image, 655KB JSON); (2) split the 893-line `MobileExperience.tsx` into 18 files organised as `screens/ + ui/ + navigation.ts + MobileApp.tsx`; (3) split the 1214-line `LearningContext.tsx` into `context/learning/` (types / snapshot-utils / use-snapshot-store / actions/* / context / provider); (4) fixed a lib→app dependency inversion and deleted the vestigial forwarding module; (5) rewrote `docs/architecture.md` with an explicit layering contract. No new type errors; 26/26 flow checks pass on desktop and phone |
