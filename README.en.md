<p align="center">
  <img src="docs/assets/linguastep-banner.svg" alt="LinguaStep: learn Japanese and English, one step at a time" width="100%" />
</p>

<p align="center">
  <a href="docs/changelog.en.md"><img src="https://img.shields.io/badge/version-0.18.4-5964f2?style=flat-square" alt="Version 0.18.4" /></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D22.13-43853d?style=flat-square" alt="Node.js >=22.13" />
  <img src="https://img.shields.io/badge/TypeScript-3178c6?style=flat-square" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Local--first-278c82?style=flat-square" alt="Local-first" />
</p>

<p align="center">
  <a href="https://twclab.top/LinguaStep">Try it</a> ·
  <a href="docs/README.md">Documentation</a> ·
  <a href="docs/changelog.en.md">Release history</a> ·
  <a href="README.md">中文</a>
</p>

LinguaStep is a Chinese-interface application for studying Japanese and English. Word cards, spoken examples, grammar, objective practice and spaced review form one daily learning path. No account is required; progress stays in the current browser.

It is intended for personal study, vocabulary consolidation and practice around JLPT, CET or TOEIC goals. You can study both languages together or keep a separate track for either language.

## Try the app

[Open LinguaStep](https://twclab.top/LinguaStep), or explore [word study](https://twclab.top/LinguaStep/words), [grammar](https://twclab.top/LinguaStep/grammar), [practice](https://twclab.top/LinguaStep/test) and [statistics](https://twclab.top/LinguaStep/stats). The live site reflects its deployed version; this README describes the repository's `main` branch.

## The learning experience

### Reveal a small batch, then check it with questions

**Reveal five word groups → answer correspondence questions → keep mistakes and add new words → continue.**

1. Start from a Chinese meaning, then reveal Japanese and English together or step by step.
2. Practice Japanese-to-English or English-to-Japanese correspondence; single-language mode tests Chinese meanings.
3. Correct words leave the current pool. Incorrect answers and early answer reveals remain for practice.
4. Reveal only the newly added words, refill the pool to five and continue without an intermediate round-summary confirmation.

If you pass three groups and miss two, reveal three new groups and practice “two retained + three new.” If there are fewer new words left, continue with the available count. There are no manual Known / Uncertain / Unknown ratings in this flow.

### Hear words, examples and Chinese translations

Both language sides show an example with its Chinese translation, including compact mode. Automatic playback reads the word, its example and the sentence translation; only the first revealed word additionally reads the word's Chinese definition.

Example buttons replay the foreign sentence followed by Chinese. Current voices are Nanami for Japanese, Jenny for English and Xiaoxiao for Chinese. Automatic playback can be disabled while keeping manual controls. Quiz examples stay hidden until the answer is submitted.

### Make review part of the daily routine

Objective word answers use **FSRS-6** to update memory state and schedule the next review from correct/incorrect responses and elapsed intervals. Passing the current batch is separate from mature memory, which requires spaced success and stability. See the [review algorithm](docs/spaced-repetition.md).

The home page continues through due reviews, new words, grammar, tests and mistakes. Choose a primary goal, study scope and task counts or a **10 / 20 / 30 minute** daily budget. Recent recorded study time helps estimate workload; an exam date is optional.

### Connect reference material with practice

| Capability | What is available |
| --- | --- |
| Three study tracks | Japanese, English and paired study keep their own progress and reveal preferences |
| Grammar and comparisons | Usage, sentence connections, examples and confusing points linked to exercises |
| Skill practice | Listening, dictation, grammar cloze and new-context reading, up to five items per round |
| Mistake review | Error history with replay for listening items and typed responses for input tasks |
| Library and favorites | Search words and examples; book vocabulary can join learning and review |
| Feedback | Study activity, first-attempt accuracy and delayed recognition, separate from old self-ratings |
| Desktop and mobile | Dedicated layouts, themes, font-size settings and focus mode |
| Backups | JSON export/import on desktop and mobile, with confirmation before replacement |

[Read the user guide](docs/user-guide.md)

## Content at a glance

| Content | Size | Scope |
| --- | --- | --- |
| Core bilingual vocabulary | **2,560 groups** | At least 800 words for each N3/N2/N1 level, with examples and Chinese translations |
| Book vocabulary | **1,989 entries** | N3 / N2 / N1 / foundation sections, available for learning |
| Grammar points | **80** | 65 Japanese and 15 English |
| Grammar comparisons | **137** | Expression contexts, common ground and frequent errors |
| Japanese practice | **1,715 items** | Textbook, public and built-in/original items across N3/N2/N1 |
| English practice | **848 items** | 800 foundation items; 16 original items each for CET-4, CET-6 and TOEIC |
| Quick reference | **92 basic kana and 7 themes** | Time, numbers, greetings, transport and more |

Sources are classified explicitly. No current item is counted as a verified official past-paper question. Foundation English is not relabeled as CET difficulty, and practice results are not predicted exam scores. Paired vocabulary does not imply interchangeability in every context.

[Coverage and provenance](docs/content.md) · [Vocabulary sources and updates](docs/vocabulary-sources.md)

## Run locally

Requires **Node.js ≥ 22.13**. Core learning requires no API key.

```bash
git clone https://github.com/Sver0411/LinguaStep-GradPrep.git
cd LinguaStep-GradPrep
npm ci
npm run dev
```

Open the URL printed in the terminal, usually `http://localhost:3000`. Online speech needs a network connection and a server with outbound WebSocket support.

```bash
npm run typecheck       # Type checking
npm test                # Automated tests
npm run build           # Vinext production build
npm start               # Start the Vinext server
npm run build:vercel    # Next.js / Vercel build
```

[Development details](docs/development.md) · [Vercel, Docker and subpath hosting](docs/deployment.md)

## Stack and structure

| Technology | Role |
| --- | --- |
| React 19 / Next.js 16 / TypeScript | Pages, interaction and types |
| Tailwind CSS / Lucide | Styling and icons |
| IndexedDB | Local progress, mistakes, plans and backup data |
| ts-fsrs | Objective word-review scheduling |
| msedge-tts | Same-origin server speech for words and arbitrary sentences |
| Vinext / Vite | Development and an additional production build path |
| Vitest / Testing Library / Zod | Automated checks and input validation |

The code follows `app → components → context → lib → data`: interaction, learning actions, scheduling, persistence and content have separate responsibilities. See [architecture](docs/architecture.md).

## Data and boundaries

- Built-in content and progress are local-first. Online speech still depends on the network.
- Devices and browsers do not automatically sync. Export backups before switching devices or clearing browser data.
- Coverage and difficulty calibration remain limited; recognition accuracy does not represent complete exam or language ability.
- The AI frontend is paused. Compatibility code remains, while everyday learning does not depend on an AI key.

## Documentation

Detailed guides are primarily in Chinese.

| Topic | Documentation |
| --- | --- |
| Learning, speech and backups | [User guide](docs/user-guide.md) |
| Content coverage and provenance | [Content and sources](docs/content.md) |
| Development and checks | [Development guide](docs/development.md) |
| Hosting and configuration | [Deployment guide](docs/deployment.md) |
| Scheduling and persistence | [Review algorithm](docs/spaced-repetition.md) · [Daily plan](docs/daily-plan.md) · [Storage](docs/storage.md) |
| Updates and future directions | [Release history](docs/changelog.en.md) · [Roadmap](docs/roadmap.md) |

The [documentation index](docs/README.md) also links to backend maintenance references and historical AI documentation.
