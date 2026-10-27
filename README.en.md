<p align="center">
  <img src="docs/assets/linguastep-banner.svg" alt="LinguaStep: learn Japanese and English, one step at a time" width="100%" />
</p>

<p align="center">
  <a href="docs/changelog.en.md"><img src="https://img.shields.io/badge/version-0.18.2-5964f2?style=flat-square" alt="Version 0.18.2" /></a>
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

LinguaStep is a Chinese-interface app for studying Japanese and English. Word cards, spoken examples, grammar, practice and spaced review form one daily learning path. No account is required; progress stays in the current browser.

## The learning loop

**Reveal five word groups → answer correspondence questions → keep mistakes and add new words → continue.**

If you pass three groups and miss two, reveal three new groups and practice them alongside the two retained groups. Failed words stay in practice without repeating their reveal cards. Passing the current session still leads to scheduled FSRS reviews later.

| Capability | What is available |
| --- | --- |
| Bilingual cards | 2,560 word groups; Japanese-only, English-only and paired study |
| Spoken examples | Examples with Chinese translations, neural speech and bilingual replay |
| Spaced review | FSRS-6 for objective word answers, linked mistakes and daily plans |
| Grammar and skills | 80 grammar points, 137 comparisons, listening, dictation, cloze and reading |
| Planning and feedback | Primary goal, daily time budget, first-attempt and delayed-recognition statistics |
| Desktop and mobile | Dedicated mobile layout, book vocabulary import and manual JSON backups |

## Run locally

Requires **Node.js ≥ 22.13**.

```bash
git clone https://github.com/Sver0411/LinguaStep-GradPrep.git
cd LinguaStep-GradPrep
npm ci
npm run dev
```

Open the URL printed in the terminal, usually `http://localhost:3000`. Core learning requires no API key. Online speech needs a network connection and a server with outbound WebSocket support.

## Read more

The detailed guides are primarily in Chinese.

| Topic | Documentation |
| --- | --- |
| Learning, speech and backups | [User guide](docs/user-guide.md) |
| Content coverage and provenance | [Content and sources](docs/content.md) |
| Development and checks | [Development guide](docs/development.md) |
| Hosting and configuration | [Deployment guide](docs/deployment.md) |
| Scheduling and storage | [Review algorithm](docs/spaced-repetition.md) · [Architecture](docs/architecture.md) |
| Updates and future directions | [Release history](docs/changelog.en.md) · [Roadmap](docs/roadmap.md) |

Progress does not automatically sync between devices; transfer it using backups. Exercise coverage is limited and practice scores do not predict exam results. The AI frontend is currently paused; backend maintenance references remain in the [documentation index](docs/README.md).
