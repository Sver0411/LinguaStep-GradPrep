import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
vi.mock("node:fs/promises", () => ({ readFile: vi.fn() }));
import { readFile } from "node:fs/promises";
import { GET } from "../app/api/word-audio/[hash]/route";
const hash = "a".repeat(32);
const context = { params: Promise.resolve({ hash }) };
afterEach(() => vi.resetAllMocks());
describe("book word audio", () => {
  it("serves immutable MP3 and supports byte and suffix ranges", async () => {
    vi.mocked(readFile).mockResolvedValue(Buffer.from("0123456789"));
    const full = await GET(new NextRequest(`http://localhost/api/word-audio/${hash}`), context);
    expect(full.status).toBe(200); expect(full.headers.get("X-Speech-Voice")).toBe("book-audio");
    expect(full.headers.get("Cache-Control")).toContain("immutable");
    const range = await GET(new NextRequest(`http://localhost/api/word-audio/${hash}`, { headers: { range: "bytes=2-4" } }), context);
    expect(range.status).toBe(206); expect(range.headers.get("Content-Range")).toBe("bytes 2-4/10"); expect(await range.text()).toBe("234");
    const suffix = await GET(new NextRequest(`http://localhost/api/word-audio/${hash}`, { headers: { range: "bytes=-3" } }), context);
    expect(await suffix.text()).toBe("789");
  });
  it("rejects traversal and invalid ranges and handles missing files", async () => {
    expect((await GET(new NextRequest("http://localhost/api/word-audio/invalid"), { params: Promise.resolve({ hash: "../secret" }) })).status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
    vi.mocked(readFile).mockResolvedValue(Buffer.from("0123"));
    expect((await GET(new NextRequest(`http://localhost/api/word-audio/${hash}`, { headers: { range: "bytes=9-10" } }), context)).status).toBe(416);
    vi.mocked(readFile).mockRejectedValue(new Error("missing"));
    expect((await GET(new NextRequest(`http://localhost/api/word-audio/${hash}`), context)).status).toBe(404);
  });
});
