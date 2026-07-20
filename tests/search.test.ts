import { describe, expect, it } from "vitest";
import { searchGrammar, searchWords } from "../lib/search";
import { makeGrammar, makeGrammarProgress, makeMistake, makeReviewState, makeWord, makeWordProgress, NOW } from "./fixtures";

describe("local search and filters", () => {
  it("searches words across Chinese, Japanese, reading, English and collocations", () => {
    const words = [makeWord("word-1", "一"), makeWord("word-2", "二")];
    const base = {
      japaneseLevel: "all",
      englishLevel: "all",
      frequency: "all" as const,
      status: "all" as const,
      favorite: false,
      mistake: false,
      due: false,
      mode: "combined" as const,
    };
    for (const query of ["含义一", "日本語一", "にほんご一", "english 一", "example"]) {
      expect(
        searchWords(words, { ...base, query }, {
          progress: [],
          favorites: [],
          mistakes: [],
          nowTimestamp: new Date(NOW).getTime(),
        }).length,
      ).toBeGreaterThan(0);
    }
  });

  it("combines favorite, mistake, status and due filters", () => {
    const words = [makeWord("word-1", "一"), makeWord("word-2", "二")];
    const due = makeWordProgress(
      "word-1",
      "combined",
      makeReviewState("fuzzy", { nextReviewAt: "2026-07-19T04:00:00.000Z" }),
    );
    const result = searchWords(
      words,
      {
        query: "",
        japaneseLevel: "all",
        englishLevel: "all",
        frequency: "all",
        status: "learning",
        favorite: true,
        mistake: true,
        due: true,
        mode: "combined",
      },
      {
        progress: [due],
        favorites: ["word:word-1"],
        mistakes: [makeMistake()],
        nowTimestamp: new Date(NOW).getTime(),
      },
    );
    expect(result.map((word) => word.id)).toEqual(["word-1"]);
  });

  it("searches and filters grammar by language and mastery", () => {
    const japanese = makeGrammar("grammar-1");
    const english = { ...makeGrammar("grammar-2"), language: "english" as const, title: "Conditionals" };
    const result = searchGrammar(
      [japanese, english],
      {
        query: "condition",
        language: "english",
        level: "all",
        status: "all",
        favorite: false,
        mistake: false,
        due: false,
      },
      {
        progress: [makeGrammarProgress("grammar-2")],
        favorites: [],
        mistakes: [],
        nowTimestamp: new Date(NOW).getTime(),
      },
    );
    expect(result.map((point) => point.id)).toEqual(["grammar-2"]);
  });
});
