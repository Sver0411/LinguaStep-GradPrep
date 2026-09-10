# LinguaStep (Japanese & English Step-by-Step)

> Steady progress in Japanese and English

[中文版](README.md)

LinguaStep is a Chinese-interface web app for personal Japanese and English study. It is designed for long-term goals including Japanese JLPT N3/N2/N1 and English CET-4/CET-6/TOEIC. It brings bilingual word cards, grammar, review plans, exam-style practice, mistakes, favorites, and statistics into one learning loop.

The current version is **v0.14.9**. No account is required; built-in content and learning records are stored in the current browser, and core learning features continue to work offline. The frontend AI entry points are currently paused and removed, while the related backend code and existing content data are retained for possible future re-enablement.

Public site: [Open LinguaStep](https://twclab.top/LinguaStep)

## Highlights

- **A complete product, not a prototype**: Learning, review, tests, mistakes, and progress persistence are all fully interactive.
- **Synchronized Japanese and English study**: Learn both languages from the same Chinese meaning, or study either language independently.
- **Local-first**: No login is required. IndexedDB stores structured learning data, and core features do not depend on the network.
- **Long-term review**: An explainable spaced-repetition scheduler and daily plan help you study instead of merely browsing a word list.
- **Ready-to-study content**: Includes 2,559 curated or textbook-aligned exam word groups, with at least 800 words at each N1/N2/N3 level, 80 independent grammar points, and 137 Japanese-English grammar comparisons.
- **Exam-style practice**: Japanese is organized by N3/N2/N1, while English is organized by CET-4/CET-6/TOEIC. The question bank is independent from the word-learning library.
- **Dedicated mobile experience**: Desktop keeps its sidebar; mobile uses an independent hierarchy, fixed bottom navigation, filter drawers, and one-primary-action pages instead of compressing desktop content.

## Features

### Home and daily plan

- Automatically creates tasks for new words, due reviews, mistakes, grammar, and tests.
- Refreshing on the same day or opening multiple tabs does not create duplicate plans.
- The home page keeps only three core indicators—today's progress, overdue reviews, and active mistakes—and provides a single “Continue” primary action.
- The fixed learning path is: due reviews → today's new words → today's grammar → today's test → reinforce today's mistakes → complete for today.
- Each completion page goes directly to the next item, so you do not need to return to the home page repeatedly.
- Recommends the next step based on current progress; “More” on the home page can recalculate the plan from the latest settings.
- Supports automatic completion of unfinished tasks and three weekend rhythms: light, unchanged, and intensive.
- Keeps a free-study entry point for users who do not want to follow the plan.

### Word study

- Includes **2,559** Japanese-English word groups covering common exam vocabulary for N3/N2/N1 and CET-4/CET-6/TOEIC. Each N1/N2/N3 level contains at least 800 words; newly added words were aligned with local Red/Green reference-book units through OCR and supplemented by a reviewed expansion set.
- Each group includes a Chinese core meaning, Japanese writing/kana/romaji, English word/phonetic transcription, parts of speech, levels, example sentences, translations, collocations, and usage differences.
- Japanese transitive and intransitive verbs use dictionary-form headwords consistently. サ変 verbs such as `勉強する` and `確認する` are stored as the stems `勉強` and `確認`, with the ability to attach `する` retained in parts of speech and notes.
- Supports three independent study tracks:
  - Japanese-English comparison
  - Japanese only
  - English only
- The page separates “Start studying” from “Browse library”; search and filters do not interfere with the daily study entry point.
- Supports compact and full card views, reveal-all and step-by-step reveal, and Japanese-first/English-first/random reveal. Defaults are managed in Settings.
- Choose 10, 20, 30, or a custom number of cards, then review the proportions of known, uncertain, unknown, and mastered items.
- Every study session reselects and shuffles its cards while prioritizing unlearned words. Review, favorite, and today's-new-word queues are shuffled as well.
- Continue with remaining new words after a session. “Retry new words” only retries words marked “unknown” in the current session.
- Search Chinese, Japanese kanji, kana, romaji, English, example sentences, and collocations.
- Start Study first chooses Japanese, English, or mixed mode and then shows the relevant levels. Browse Library supports Japanese levels, English levels, and mastery-status filters.

Study shortcuts:

| Key | Action |
| --- | --- |
| `Space` | Reveal the answer |
| `1` | Know it |
| `2` | Uncertain |
| `3` | Don't know |
| `←` / `→` | Previous / next card |
| `Esc` | Exit focus mode |

### Spaced-repetition review

LinguaStep uses an explainable **SM-2-derived scheduler** rather than claiming to implement full FSRS. The three feedback options produce different review intervals:

| Feedback | Main effect |
| --- | --- |
| Know it | Extends the interval and increases consecutive-correct counts; repeated correct answers lead to mastery |
| Uncertain | Reviews again after about one day and lowers stability |
| Don't know | Reappears after about 10 minutes and raises forgetting priority |

Review state includes first/most-recent study times, next review time, review count, consecutive correct answers, forgetting count, stability, difficulty, pause state, language mode, and algorithm version. The queue prioritizes overdue mistakes, overdue items, “don't know” items, uncertain items, today's due items, and new content.

### Grammar and Japanese-English comparisons

- Includes **80 grammar points**: 65 Japanese and 15 English. The latest 30 Japanese patterns were added from a local N3 grammar reference book's table of contents and explanation pages.
- Japanese covers N3 consolidation, core N2, and a small amount of N1 transition material. English covers high-school, CET-4, and a small amount of CET-6 transition material.
- Each grammar point includes a Chinese explanation, structure, connections/usage, context, tone, examples, translations, common errors, confusing points, and five multiple-choice exercises.
- Includes **137 Japanese-English grammar comparisons** covering basic patterns, tense/aspect, conditionals, inference, cause, concession, honorifics, and formal N2/N1 expressions without forcing word-for-word equivalence.
- Japanese-English comparisons can enter mixed tests with one click. Each round draws from different comparisons instead of practicing only the current item.
- Grammar supports unlearned, learning, due-for-review, mastered, favorite, and mistake states. Wrong answers lower mastery and add items to mistakes and later review.
- Today's planned grammar is shown first by default; full search and filtering can be expanded when needed.
- Search and filter by keyword, language, level, status, favorite, mistake, and due state.

### Exam-style practice

- Choose Japanese or English first, then choose a level. Japanese additionally offers character/vocabulary, grammar, and reading sections.
- Japanese N3/N2/N1 character, vocabulary, and grammar questions are based on a local *Red/Blue Book 1000 Questions N5–N1* reference and supplemented with built-in level-based questions. Reading questions are original exam-style passages for each level and are clearly labeled in the UI.
- Real drill questions from the local 红蓝宝书1000题 PDFs are now in the bank — **378 items in total**: 245 N1 (pypdf layout parsing cross-checked with Vision OCR), 68 N2 and 65 N3 (scanned books OCRed in full; only completely recovered answer rows were kept), all with the publisher's answers and deduplicated.

- Real composition per level and section (every item is genuine material — no generated templates remain):

| Section | N3 | N2 | N1 |
|---|---|---|---|
| Vocabulary | 225 | 301 | 410 |
| Grammar | 260 | 243 | 253 |
| Reading | 8 (original) | 8 (original) | 8 (original) |

The English bank was expanded the same way:

| Level | Questions |
|---|---|
| CET-4 | 416 |
| CET-6 | 416 |
| TOEIC | 16 |

English items come from the public "Chinese middle school English exam questions" dataset (Hugging Face, CC BY 4.0) — all four-option multiple choice with answer keys. Grade 7-8 map to CET-4 and grade 9 to CET-6. There is no comparable open TOEIC source, so TOEIC keeps its hand-written items.

- Sources: past-paper questions extracted from the local 红蓝宝书1000题 PDFs (publisher answer keys) plus the public JLPT exercise bank at japanesetest4you.com (grammar and vocabulary drills with their own answer keys). Practice items carry their own source label so they can be told apart from past papers.
- The auto-generated filler, which reused one sentence template per section, has been removed entirely.
- Question bank sizes are reported honestly: each level/section holds what the real content adds up to. Character questions are derived from the graded vocabulary, grammar questions only use grammar points that belong to that level, and reading keeps its hand-written passages.
- The bank is never padded by repetition: the same prompt cannot appear twice inside one level/section, and grammar material is not reused across levels. When a bucket is smaller than the requested round size the UI says so and uses the available maximum.
- English offers three original exam-style sets: CET-4, CET-6, and TOEIC, mixing vocabulary, grammar, and reading.
- Each level has an independent question bank. Questions are shuffled and do not depend on learned words or repeat multiple translation directions for one word in the same round.
- Before starting, choose 10, 20, 30, or 50 questions. Starting or choosing “Another set” randomly samples again from the complete bank for the selected level and section.
- The four options are reshuffled for every round, with correct answers randomly and evenly distributed across A/B/C/D. Use 1–4 to answer; after selecting an option, press Space to continue or submit.
- “Exit test” is always available. The completion view shows score, category accuracy, time, and explanations for each question; wrong answers are added to the mistake book.

### Mistake book

- Groups mistakes by word, Japanese grammar, English grammar, and Japanese-English comparison.
- Lifecycle: active mistake → reinforcing → mastered → archived.
- Records error count, consecutive correct answers, latest error time, source, and historical option snapshots.
- By default, three consecutive correct answers remove an item from active mistakes; this can be adjusted in Settings.
- “Review active mistakes” enters the next question continuously by priority instead of repeatedly returning to the list.
- Supports focused retry, mark as mastered, re-add, archive, remove, and favorite. Management actions are collapsed by default.
- Explanations primarily use local question explanations. The AI entry point is currently hidden and does not affect mistake review.

### Favorites

- Favorite words, grammar, and Japanese-English comparisons.
- Filter by keyword, language, and level.
- Start studying or generate a focused test directly from favorites.
- Supports bulk unfavorite with confirmation protection.

### Learning statistics

- Shows today's, this week's, and cumulative study volume, plus learned/mastered words and grammar.
- Shows test count, overall accuracy, current/longest streak, due reviews, and active mistakes.
- Provides 7-day and 30-day trends for study volume, accuracy, new/reviewed items, and Japanese/English activity.
- Shows mastery distributions for Japanese, English, Japanese-English comparison, and grammar.
- Charts work with light, dark, and mobile layouts and include numeric text so information does not depend only on color or graphics.

### AI status

The AI entry point has been removed from frontend navigation, the home page, words, grammar, tests, and settings so it does not interrupt the personal learning flow. The repository retains compatible backend routes and historical AI data models, but external AI services are not called by default. Re-enabling the frontend entry point requires another security review.

### Settings, themes, and device support

- Study settings: default mode, reveal order, daily new-word/review/grammar/test counts, round size, mistake priority, and weekend rhythm.
- Display settings: focus mode; light, dark, or system theme; compact/full cards; standard/larger font; animation and reduced-motion preferences.
- Data settings: separately reset learning progress, tests, mistakes, favorites, or all data. Dangerous actions require confirmation.
- Desktop uses a sidebar; mobile uses bottom navigation and a “More” drawer. Focus mode is available during study.
- v0.7.0 redesigned mobile: the home page shows only the next step, words keep only the round selection, grammar uses a vertical list, test-bank statistics are hidden, mistake/favorite management is collapsed, statistics remove secondary charts, and Settings is grouped by study and appearance.
- v0.7.1 added 10/20/30/50-question choices and fresh random sampling every time a test starts.
- v0.7.2 separated mobile navigation from page scrolling, fixed word-rating controls in the thumb zone, cleared focus mode when leaving a study session, and added recent 7-day rhythm and today's answer status to Home.
- v0.7.3 fixed the continue and retry buttons on the word-summary page; “Retry new words” now uses only words marked unknown in the current round, with extra mobile safe space for the fixed rating area.
- v0.7.4 fixed the concentration of correct-answer positions by randomizing and balancing A/B/C/D each round, and added Space to continue or submit after selecting an answer.
- v0.7.5 connected the daily flow after tests and mistake reviews; removed padded question duplicates and shows real counts; writes learning data incrementally; added text-to-speech pronunciation and JSON backup export/import.
- v0.8.0 merged the reference module from the standalone mobile project: a new "Reference" section with the kana chart (now with romaji and audio) and seven daily-Japanese lookup groups, reachable from the desktop sidebar and the mobile "More" drawer.
- v0.9.0 switched the whole phone experience to the standalone mobile project's four-tab UI (Home/Practice/Reference/Profile), sharing the main app's IndexedDB data; illustrations compressed to 240KB; desktop unchanged.
- v0.10.0 imported the local 红蓝宝书1000题 N1 PDF: 245 real N1 questions with publisher answers and Chinese explanations, validated by pypdf + Vision OCR cross-checking and deduplicated against the existing bank.
- v0.11.0 OCRed the scanned 红蓝宝书1000题 N2/N3 in full and added 133 real questions (68 N2 + 65 N3); only completely recovered answer rows were kept to protect correctness. All three levels now carry local PDF drill questions — 378 in total.
- v0.12.0 added a "high-frequency words" library section (1989 words across N3/N2/N1/Basic) built mainly from open Wikdict definitions plus filtered local book-scan OCR entries, each tagged with provenance; book words are lookup-only and stay out of the SRS flow.
- v0.12.1 walked the whole app as a user and fixed three issues: (1) book-vocab favourites were silently deleted by the snapshot cleanup — they now use a dedicated `vocab` favourite kind and appear on the favourites page; (2) the mobile word library was hard-capped at 36 entries with no way to browse further — it now supports load-more paging; (3) the mobile library gained the source-section picker and book cards with speech and favourites.- v0.12.1 walked the whole app as a user and fixed three issues: (1) book-vocab favourites were silently deleted by the snapshot cleanup — they now use a dedicated `vocab` favourite kind and appear on the favourites page; (2) the mobile word library was hard-capped at 36 entries with no way to browse further — it now supports load-more paging; (3) the mobile library gained the source-section picker and book cards with speech and favourites.
- v0.13.0 product-review fixes: (1) the section classifier was rewritten — it used to label a question by whether its options were all kana, which sent nearly every grammar item into the vocabulary bucket (139 of the 220 N1 vocabulary items were actually grammar blanks) and left the grammar round 99% filler; labelling now follows the grammatical function words in the options, so N1 grammar is 37 real questions and N3/N2 grammar went from 1% to 35-45% real; (2) generated questions only top thin sections up to 40 instead of padding every bucket to a fixed quota; (3) bank stats split real vs generated; (4) the home screen now guides users with zero progress; (5) the home screen shows a consecutive-study-day metric.
- v0.14.0 content cleanup and expansion: (1) every generated template question is gone (they made up 99% of grammar rounds and nearly half of vocabulary rounds); (2) 1266 answer-keyed grammar and vocabulary practice items were scraped from the public JLPT exercise bank and imported by level and section, each labelled with its source; (3) bank stats follow: the Japanese bank went from 765 inflated entries to 1716 genuine questions, with grammar rounds growing from 14-37 to 243-260.

## Recommended workflow

1. Open Home and click the single “Continue” button.
2. Follow the app through due reviews, today's new words, and today's grammar.
3. Complete today's test, then reinforce the active mistakes from this round.
4. After completing today, check trends in Statistics or expand the free-study entry point.
5. For weak areas, open the relevant focused practice from Mistakes or Favorites.

Desktop navigation is grouped into “Study / Review / Tools”; mobile keeps five fixed entries: “Today / Words / Grammar / Test / More”.

## Tech stack and rationale

| Technology | Use and rationale |
| --- | --- |
| React 19 + Next.js 16 | Mature components, routing, and server API capabilities; can run locally and adapt to Vercel |
| Vinext + Vite | Next.js-compatible build path and fast development experience for OpenAI Sites/Cloudflare |
| TypeScript strict | Centralized constraints for learning, review, storage, API, and AI content models |
| Native CSS + Lucide React | A controllable visual system with lightweight dependencies, responsive layouts, themes, and accessible focus states |
| IndexedDB + Repository Pattern | Stores structured learning data locally while isolating UI from storage implementation |
| Zod | Validates server input and structured AI output so incomplete content cannot enter the database |
| Native `fetch` | Connects to the DeepSeek OpenAI-compatible API without a large AI framework |
| Vitest + Testing Library + fake-indexeddb | Covers business logic, components, APIs, database migrations, and complete mocked workflows |

## Architecture

```text
Pages and components
  ├─ LearningContext
  │    ├─ Learning, test, plan, and statistics pure functions
  │    └─ LearningRepository → IndexedDB v3 / in-memory fallback
  └─ AIContext
       └─ AIAPIClient → React Server Action (default)
                          └─ Request protection and rate limiting (/study-service/* retained for compatibility)
                               └─ AIContentService
                                    ├─ Prompt templates
                                    ├─ Zod and business validation
                                    └─ AIProvider
                                         ├─ DeepSeekProvider
                                         └─ MockAIProvider
```

Pages do not operate on IndexedDB directly or call DeepSeek directly. Learning logic, storage, AI providers, content validation, and UI are separated. AI-generated vocabulary, grammar, and comparisons enter the same learning, search, favorite, test, and statistics flows as built-in content.

## Directory structure

```text
app/                    Page entry points, layout, and same-origin AI API
components/             App shell, learning components, filters, charts, and views
context/                LearningContext and AIContext
data/                   2,559 curated exam words, 80 grammar points, and 137 comparisons
lib/                    Models, review, plans, tests, statistics, and shared logic
lib/ai/                 AI configuration, providers, prompts, schemas, validation, and services
lib/repositories/       IndexedDB, migrations, repositories, and in-memory fallback
tests/                  Unit, API, component, migration, and workflow tests
docs/                   Architecture, algorithms, storage, security, testing, and deployment docs
.openai/hosting.json    OpenAI Sites project configuration
```

## Local installation and development

Requirement: Node.js `>= 22.13`.

```bash
npm install
npm run dev
```

The default address is usually `http://localhost:3000`. All local learning features work without an API key.

Build and run locally in production mode:

```bash
npm run build
npm start
```

## DeepSeek configuration

### Option 1: Server-hosted key

This is the recommended setup for self-hosted deployments. Copy the environment template and write real values only to the uncommitted `.env.local` file:

```bash
cp .env.example .env.local
```

```env
AI_PROVIDER=deepseek
DEEPSEEK_BASE_URL=https://api.deepseek.com
DEEPSEEK_API_KEY=your-server-key
DEEPSEEK_MODEL_FAST=deepseek-v4-flash
DEEPSEEK_MODEL_QUALITY=deepseek-v4-pro
AI_ENABLED=true
AI_TIMEOUT_MS=45000
AI_MAX_RETRIES=3
AI_MAX_CONCURRENCY=2
AI_PROXY_ACCESS_TOKEN=
```

`localhost` can access the service without a proxy access token. A public deployment using a server key must set a sufficiently long, random `AI_PROXY_ACCESS_TOKEN` and enter the same token in the browser's AI settings. Otherwise, production server mode rejects requests to prevent the public URL from consuming your personal quota.

The AI backend still accepts environment-variable configuration, but the current product UI does not expose or call this capability.

### Option 2: Bring Your Own Key (BYOK, not currently available)

The planned flow is to select “Personal API Key” in Settings. The browser sends the key per request in a dedicated header to the same-origin proxy; the server does not store or return it, and the key is not placed in the URL, request body, IndexedDB, learning snapshots, or AI history.

The public site currently does not expose the BYOK entry point; this section remains for backend compatibility maintenance.

- By default, the key is stored only in `sessionStorage` and expires when the browser session ends.
- “Save on this device” uses `localStorage` and should only be enabled on a trusted personal device.
- The browser never makes a direct cross-origin request to DeepSeek.

Current default models:

- Fast: `deepseek-v4-flash`, for ordinary structured generation.
- Quality: `deepseek-v4-pro`, for complex grammar, Japanese-English comparisons, mistake explanations, or quality review.
- API base URL: `https://api.deepseek.com`.

See the [DeepSeek Models](https://api-docs.deepseek.com/api/list-models), [Chat Completions](https://api-docs.deepseek.com/api/create-chat-completion), and [Thinking Mode](https://api-docs.deepseek.com/guides/thinking_mode) documentation for the current model and API details.

## Data storage and migrations

The database is named `lingua-step-learning`. It is currently IndexedDB **v3** with 15 object stores.

- v1: Basic learning progress, mistakes, favorites, tests, and daily records.
- v2: Three-mode review state, daily plans, and complete second-phase data.
- v3: AI vocabulary, grammar, comparisons, generation history, usage, explanation cache, practice sets, and correction records.

Upgrades run transactionally in the existing database without clearing the old database or changing existing content IDs. If a migration fails, the browser rolls back the transaction; the app falls back to an in-memory repository for the current session while preserving the original data.

Themes and non-sensitive settings are stored in `localStorage`. BYOK and proxy tokens use separate session/local-storage keys and are not part of the learning database. Web Locks and BroadcastChannel can merge and notify changes across tabs.

## Testing and quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run test:components
npm run test:e2e
npm run build
npm run build:vercel
```

Current acceptance status (2026-07-23):

- TypeScript strict mode, ESLint, Vinext/Sites build, and Next.js/Vercel build pass.
- 19 automated test files with **132 tests passing**.
- Tests cover the integrity of 2,559 curated exam words, 80 grammar points, 137 comparisons, and 2,160 exam-style exercises; 120-question distribution for every language, level, and section; language and level filters; review algorithms; daily plans; date boundaries; random study order; three study modes; search and filters; test grading; mistake lifecycle; statistics aggregation; settings; resets; and v1/v2/v3-to-v4 settings migration.
- AI tests cover configuration, providers, JSON Schema, business validation, key isolation, request protection, timeouts, cancellation, retries, components, and complete mocked workflows.
- Two default models and the complete word-card, Japanese-grammar, Japanese-English-comparison, exercise, and mistake-explanation flows have been checked with the real DeepSeek API.

Regular tests use a Mock Provider and do not access DeepSeek or incur API charges. An optional minimal real smoke test is available:

```bash
DEEPSEEK_API_KEY=your-key npm run test:deepseek
```

Without the environment variable, the script skips automatically. When enabled, it may incur a small API charge and does not print the key.

## Deployment

### Vercel

1. Import the project into Vercel and choose Next.js as the Framework Preset.
2. Use `npm run build:vercel` as the Build Command and `npm install` as the Install Command.
3. Configure the variables corresponding to `.env.example` in Production and Preview environments.
4. `DEEPSEEK_API_KEY` and `AI_PROXY_ACCESS_TOKEN` must be secret variables; do not add public prefixes such as `NEXT_PUBLIC_`.
5. Public server-key mode must configure the proxy access token as well.
6. After deployment, run the connection test in Settings and inspect the page source, Server Action responses, `/study-service/health`, and error responses to confirm they show only whether configuration exists and never contain secret values. `/study-service/*` and `/api/ai/*` remain as compatibility and diagnostic paths.
7. Change `DEEPSEEK_MODEL_FAST/QUALITY` to switch among allowed models. Set `AI_ENABLED=false` to disable AI without affecting local learning.

Rate limiting is in-memory and per instance. In a serverless multi-instance environment it is not a globally distributed quota; combine it with the proxy access token and DeepSeek account limits.

### OpenAI Sites

The project includes `.openai/hosting.json` and a Vinext build, so it can be published to OpenAI Sites. Configure runtime environment variables in the Sites project; do not put them in `hosting.json` or commit them to the repository.

## Security and privacy

- Server keys are read only from server-side environment variables and never enter the client bundle.
- BYOK and proxy tokens are not written to IndexedDB, URLs, logs, generation history, or test snapshots; they are sent temporarily to the server through an HTTPS Server Action only when the user starts an AI operation.
- The server validates origin, method, request size, generation count, string/array lengths, and allowed models.
- AI output is handled as plain text data. It is not executed or injected as HTML.
- At most 100 necessary learning summaries are sent for question generation; mistake explanations send only the current question and relevant summaries.
- Names, email addresses, the complete database, and unrelated learning history are not sent.
- Deleting AI content also removes related progress, favorites, mistakes, practice sets, and feedback references.
- AI content may be inaccurate; verify it against reliable textbooks or official sources.

## Release phases

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
| v0.6.0 | Complete | Aligned and expanded the library to 2,559 words from Red/Green reference books, with at least 800 words per N1/N2/N3 level; simplified grammar levels to N1/N2/N3 |
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
| Future | Uncommitted | Accounts and cloud sync, import/export, pronunciation, speech recognition, free-text correction, PWA, and full FSRS |

## Current boundaries

The project currently does not provide accounts, cloud learning progress, multi-device sync, audio pronunciation, speech recognition, spelling input, free-text translation or essay correction, AI chat practice, data import/export, a full PWA, an admin console, or social features. It is intentionally a personal, local-first Japanese and English learning app without coins, leaderboards, or energy systems.

## Detailed documentation

- [Architecture](docs/architecture.md)
- [Vocabulary sources and updates](docs/vocabulary-sources.md)
- [Local storage](docs/storage.md)
- [Spaced-repetition algorithm](docs/spaced-repetition.md)
- [Daily plan](docs/daily-plan.md)
- [v1/v2 → v3 data migration](docs/data-migration.md)
- [Roadmap](docs/roadmap.md)
- [DeepSeek integration](docs/deepseek-integration.md)
- [AI security](docs/ai-security.md)
- [Prompt management](docs/ai-prompts.md)
- [AI content validation](docs/ai-content-validation.md)
- [AI testing](docs/ai-testing.md)
- [AI deployment](docs/ai-deployment.md)
