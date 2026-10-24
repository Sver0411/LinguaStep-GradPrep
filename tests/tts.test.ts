import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ metadata: vi.fn(), stream: vi.fn(), close: vi.fn() }));
vi.mock("msedge-tts", () => ({
  OUTPUT_FORMAT: { AUDIO_24KHZ_48KBITRATE_MONO_MP3: "audio-24khz-48kbitrate-mono-mp3" },
  MsEdgeTTS: class { setMetadata = mocks.metadata; toStream = mocks.stream; close = mocks.close; },
}));
afterEach(() => { vi.clearAllMocks(); vi.resetModules(); });
describe("neural sentence speech", () => {
  it("escapes custom text and selects Nanami, caching repeated requests", async () => {
    mocks.metadata.mockResolvedValue(undefined);
    mocks.stream.mockImplementation(() => ({ audioStream: Readable.from([Buffer.alloc(1024, 1)]) }));
    const { synthesizeSpeech } = await import("../lib/tts");
    const text = '今日は <voice> & "テスト"。';
    const [first, second] = await Promise.all([synthesizeSpeech(text, "ja"), synthesizeSpeech(text, "ja")]);
    expect(first.byteLength).toBe(1024); expect(second).toBe(first);
    expect(mocks.metadata).toHaveBeenCalledWith("ja-JP-NanamiNeural", "audio-24khz-48kbitrate-mono-mp3");
    expect(mocks.stream).toHaveBeenCalledWith('今日は &lt;voice&gt; &amp; &quot;テスト&quot;。');
    await synthesizeSpeech(text, "ja");
    expect(mocks.stream).toHaveBeenCalledTimes(1);
    expect(mocks.close).toHaveBeenCalledTimes(1);
  });
  it("supports English sentences and returns playable MP3 headers", async () => {
    mocks.metadata.mockResolvedValue(undefined);
    mocks.stream.mockImplementation(() => ({ audioStream: Readable.from([Buffer.alloc(1024, 1)]) }));
    const { GET } = await import("../app/api/tts/route");
    const result = await GET(new NextRequest("http://localhost/api/tts?lang=en&text=This%20is%20a%20custom%20sentence."));
    expect(result.status).toBe(200);
    expect(result.headers.get("content-type")).toBe("audio/mpeg");
    expect(result.headers.get("x-speech-voice")).toBe("en-US-JennyNeural");
  });
  it("rejects empty, oversized and invalid-language requests before contacting the provider", async () => {
    const { GET } = await import("../app/api/tts/route");
    for (const query of ["text=&lang=ja", "text=hello&lang=xx", `text=${"a".repeat(1201)}&lang=en`]) {
      expect((await GET(new NextRequest(`http://localhost/api/tts?${query}`))).status).toBe(400);
    }
    expect(mocks.metadata).not.toHaveBeenCalled();
  });
  it("uses Xiaoxiao for the Chinese meaning after foreign-language playback", async () => {
    mocks.metadata.mockResolvedValue(undefined);
    mocks.stream.mockImplementation(() => ({ audioStream: Readable.from([Buffer.alloc(1024, 1)]) }));
    const { GET } = await import("../app/api/tts/route");
    const result = await GET(new NextRequest(`http://localhost/api/tts?lang=zh&text=${encodeURIComponent("计划")}`));
    expect(result.status).toBe(200);
    expect(result.headers.get("x-speech-voice")).toBe("zh-CN-XiaoxiaoNeural");
  });
  it("cleans up failed synthesis and returns an error without a dictionary/system fallback", async () => {
    mocks.metadata.mockRejectedValue(new Error("upstream unavailable"));
    const { GET } = await import("../app/api/tts/route");
    expect((await GET(new NextRequest("http://localhost/api/tts?text=test&lang=en"))).status).toBe(502);
    expect(mocks.close).toHaveBeenCalledTimes(1);
    expect(mocks.stream).not.toHaveBeenCalled();
  });
});
