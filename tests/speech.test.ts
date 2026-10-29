// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.resetModules(); });
describe("neural audio player", () => {
  it("never synthesizes speech when loading or playback fails", async () => {
    const synthesize = vi.fn();
    vi.stubGlobal("speechSynthesis", { speak: synthesize });
    class BrokenAudio extends EventTarget {
      pause = vi.fn();
      play = vi.fn().mockRejectedValue(new Error("Missing recording"));
    }
    vi.stubGlobal("Audio", BrokenAudio);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
    const { speak } = await import("../lib/speech");
    expect(await speak("計画", "ja-JP")).toMatchObject({ ok: false });
    expect(synthesize).not.toHaveBeenCalled();
  });
  it("starts audio synchronously on a cold click for mobile and cancels the previous request", async () => {
    const audios: MockAudio[] = [];
    class MockAudio extends EventTarget {
      constructor(public src = "") { super(); audios.push(this); }
      pause = vi.fn(); play = vi.fn().mockResolvedValue(undefined);
    }
    vi.stubGlobal("Audio", MockAudio);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
    const { speak } = await import("../lib/speech");
    const first = speak("plan", "en-US");
    expect(audios[0].play).toHaveBeenCalledTimes(1);
    expect(audios[0].src).toContain("v=neural-1");
    const second = speak("goal", "en-US");
    expect(await first).toMatchObject({ ok: false, message: "" });
    expect(audios[0].pause).toHaveBeenCalled();
    audios[0].dispatchEvent(new Event("playing"));
    expect(await second).toMatchObject({ ok: true });
  });
  it("preloads Chinese before the foreign audio ends and reuses the unlocked player", async () => {
    const audios: MockAudio[] = [];
    class MockAudio extends EventTarget {
      src = ""; pause = vi.fn(); play = vi.fn().mockResolvedValue(undefined);
      constructor() { super(); audios.push(this); }
    }
    vi.stubGlobal("Audio", MockAudio);
    const fetcher = vi.fn().mockResolvedValue(new Response("missing", { status: 404 }));
    vi.stubGlobal("fetch", fetcher);
    const { speakSequence } = await import("../lib/speech");
    const task = speakSequence([{ text: "計画", language: "ja-JP" }, { text: "计划", language: "zh-CN" }]);
    expect(fetcher.mock.calls.some(([url]) => String(url).includes("lang=zh"))).toBe(true);
    audios[0].dispatchEvent(new Event("playing")); audios[0].dispatchEvent(new Event("ended"));
    await Promise.resolve(); await Promise.resolve();
    expect(audios).toHaveLength(1); expect(audios[0].src).toContain("lang=zh");
    audios[0].dispatchEvent(new Event("playing")); audios[0].dispatchEvent(new Event("ended"));
    await task;
  });
  it("queues sentence warm-up requests so seven clips do not exceed three concurrent loads", async () => {
    vi.stubGlobal("Audio", class extends EventTarget {});
    const finishers: ((response: Response) => void)[] = [];
    let active = 0; let maximum = 0;
    const fetcher = vi.fn(() => {
      active += 1; maximum = Math.max(maximum, active);
      return new Promise<Response>((resolve) => finishers.push((response) => { active -= 1; resolve(response); }));
    });
    vi.stubGlobal("fetch", fetcher);
    const { preload } = await import("../lib/speech");
    for (let index = 0; index < 7; index++) preload(`clip-${index}`, "ja-JP");
    expect(fetcher).toHaveBeenCalledTimes(3);
    for (let index = 0; index < 7; index++) {
      await vi.waitFor(() => expect(finishers.length).toBeGreaterThan(index));
      finishers[index](new Response("missing", { status: 404 }));
    }
    expect(maximum).toBe(3);
    expect(fetcher).toHaveBeenCalledTimes(7);
  });

  it("plays book MP3 first and falls back to neural TTS if the file fails", async () => {
    const audios: MockAudio[] = [];
    class MockAudio extends EventTarget {
      src = ""; pause = vi.fn(); play = vi.fn().mockResolvedValue(undefined);
      constructor() { super(); audios.push(this); }
    }
    vi.stubGlobal("Audio", MockAudio);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
    const { speak } = await import("../lib/speech");
    const task = speak("暑い", "ja-JP", true, `/api/word-audio/${"a".repeat(32)}`);
    expect(audios[0].src).toContain("/api/word-audio/");
    audios[0].dispatchEvent(new Event("error"));
    expect(audios[0].src).toContain("/api/tts?");
    audios[0].dispatchEvent(new Event("playing")); audios[0].dispatchEvent(new Event("ended"));
    expect(await task).toEqual({ ok: true, voice: undefined });
  });

  it("does not start the next clip if stopped between ended and sequence continuation", async () => {
    const audios: MockAudio[] = [];
    class MockAudio extends EventTarget {
      src = ""; pause = vi.fn(); play = vi.fn().mockResolvedValue(undefined);
      constructor() { super(); audios.push(this); }
    }
    vi.stubGlobal("Audio", MockAudio);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
    const { speakSequence, stopSpeech } = await import("../lib/speech");
    const task = speakSequence([{ text: "計画", language: "ja-JP" }, { text: "计划", language: "zh-CN" }]);
    audios[0].dispatchEvent(new Event("playing"));
    audios[0].dispatchEvent(new Event("ended"));
    stopSpeech();
    expect(await task).toMatchObject({ok:false});
    expect(audios[0].play).toHaveBeenCalledTimes(1);
  });
  it("ignores a late play rejection after cancellation instead of starting fallback audio", async () => {
    let rejectPlay!: (error: Error) => void;
    const audios: MockAudio[] = [];
    class MockAudio extends EventTarget {
      src = ""; pause = vi.fn(); play = vi.fn(() => new Promise<void>((_resolve,reject) => { rejectPlay=reject; }));
      constructor() { super(); audios.push(this); }
    }
    vi.stubGlobal("Audio", MockAudio);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("missing", { status: 404 })));
    const { speak, stopSpeech } = await import("../lib/speech");
    const task = speak("暑い", "ja-JP", true, `/api/word-audio/${"a".repeat(32)}`);
    stopSpeech(); rejectPlay(new Error("aborted"));
    await task; await Promise.resolve();
    expect(audios[0].play).toHaveBeenCalledTimes(1);
    expect(audios[0].src).not.toContain("/api/tts?");
  });

});
