<p align="center">
  <img src="docs/assets/linguastep-banner.svg" alt="LinguaStep: learn Japanese and English, one step at a time" width="100%" />
</p>

<p align="center">
  <a href="docs/changelog.en.md"><img src="https://img.shields.io/badge/version-0.20.3-5964f2?style=flat-square" alt="Version 0.20.3" /></a>
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

LinguaStep is a local-first Japanese and English vocabulary app for Chinese-speaking learners. It includes ten Red/Green Book volumes covering N1–N5, with 12,905 unique word entries. Browse a whole book, search, select specific words, or study in sequential/random order. The last book is remembered; use the change-book button to switch.

The study flow introduces up to five new words, tests recognition, carries incorrect words forward and fills empty slots with new words. Japanese word MP3s take priority, with neural TTS for fallback and sentences. Both languages include examples and Chinese translations. Progress stays in the browser and can be exported as JSON.

The home screen now focuses on the current book and daily tasks. Standalone tests and training are temporarily hidden; their implementation and saved history are retained. Recognition questions within vocabulary study remain active.

Version 0.20.0 unifies the mobile and desktop grammar workspace around six remembered courses: Blue Book N1–N5 and the existing English course. The reviewed Japanese import contains 766 lessons, 2,465 paired examples and 159 source figures. Unresolved source defects are quarantined. Grammar study displays the complete source explanations, usage notes and up to two examples; missing content is not authored. [Source and review details](docs/grammar-sources.md).

All 12,905 Chinese vocabulary glosses were checked, with 1,248 shortened or corrected. Previous glosses remain in an audit manifest; word IDs and learner progress are unchanged.

Patch **0.20.3** makes word reveal cards more compact: a small progress header, a large centered meaning with a separate favorite control, and side-by-side Japanese/English panels on desktop. Complete examples and translations remain visible, with a larger centered meaning and comfortable spacing on phones, plus natural scrolling for long entries.

## Run locally

```bash
npm ci
npx next dev
```

```bash
npm run typecheck
npm test
npm run build:vercel
```

Book audio is kept outside Git: set `LINGUASTEP_AUDIO_DIR`, or use the local default `work/book-audio`. Missing MP3s fall back to the existing neural TTS service.

## Documentation

- [Word books](docs/word-books.md)
- [Grammar sources and review](docs/grammar-sources.md)
- [Sources, attribution and licenses](docs/vocabulary-sources.md)
- [User guide](docs/user-guide.md)
- [Deployment](docs/deployment.md)
- [Full documentation](docs/README.md)
- [Release notes](docs/changelog.md)

Learning history does not sync automatically between devices. Third-party textbook material and audio retain their original rights; JMdict/Tatoeba and other corpora have separate licenses described in the attribution document.
