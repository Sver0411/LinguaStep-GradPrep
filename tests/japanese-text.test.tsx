// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { JapaneseText } from "../components/JapaneseText";
import words from "../data/word-books.generated.json";
import grammar from "../data/grammar-bluebook.generated.json";
afterEach(cleanup);
describe("Japanese example readings", () => {
  it("renders ruby above kanji while keeping the original sentence as its accessible name", () => {
    render(<JapaneseText text="本を読む。" ruby={[["本","ほん"],"を",["読","よ"],"む。"]} />);
    expect(screen.getByLabelText("本を読む。")).toBeTruthy();
    expect(document.querySelectorAll("rt")).toHaveLength(2);
    expect(document.querySelector("rt")?.textContent).toBe("ほん");
  });
  it("falls back to the original sentence if annotation does not match", () => {
    render(<JapaneseText text="本を読む。" ruby={[["別","べつ"]]} />);
    expect(screen.getByText("本を読む。")).toBeTruthy();
    expect(document.querySelector("ruby")).toBeNull();
  });
  it("preserves every released example exactly when removing its ruby", () => {
    const restore = (parts: (string | string[])[]) => parts.map(p => typeof p === "string" ? p : p[0]).join("");
    for (const word of words.words) expect(restore(word.exampleRuby),word.id).toBe(word.exampleJp);
    for (const point of grammar) for (const example of point.examples) expect(restore(example.ruby),point.id).toBe(example.text);
  });
});
