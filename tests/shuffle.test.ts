import { describe, expect, it } from "vitest";
import { shuffled } from "../lib/shuffle";

describe("session shuffle", () => {
  it("returns a randomized copy without mutating the source", () => {
    const source = [1, 2, 3, 4];
    const result = shuffled(source, () => 0);
    expect(result).toEqual([2, 3, 4, 1]);
    expect(source).toEqual([1, 2, 3, 4]);
  });
});
