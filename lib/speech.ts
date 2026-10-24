export type SpeechLanguage = "ja-JP" | "en-US" | "zh-CN";
export type SpeechResult = { ok: true; voice?: string } | { ok: false; message: string };
const APP_BASE_PATH = (process.env.NEXT_PUBLIC_BASE_PATH ?? "").trim().replace(/\/+$/, "");
interface Clip { url: string; voice?: string }
const cache = new Map<string, Clip>();
const inflight = new Map<string, Promise<Clip | null>>();
let activeLoads = 0;
const waitingLoads: (() => void)[] = [];
function scheduleLoad<T>(work: () => Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeLoads += 1;
      void work().then(resolve, reject).finally(() => {
        activeLoads -= 1;
        waitingLoads.shift()?.();
      });
    };
    if (activeLoads < 3) run(); else waitingLoads.push(run);
  });
}
let currentAudio: HTMLAudioElement | null = null;
let cancelCurrent: (() => void) | null = null;
function source(text: string, language: SpeechLanguage) {
  // Version the URL so old dictionary clips are not reused.
  return `${APP_BASE_PATH}/api/tts?text=${encodeURIComponent(text)}&lang=${language === "ja-JP" ? "ja" : language === "zh-CN" ? "zh" : "en"}&v=neural-1`;
}
async function resolveAudio(url: string): Promise<Clip | null> {
  const cached = cache.get(url);
  if (cached) return cached;
  const pending = inflight.get(url);
  if (pending) return pending;
  const request = scheduleLoad(async () => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok || !response.headers.get("content-type")?.startsWith("audio/")) return null;
      const blob = await response.blob();
      if (blob.size < 512) return null;
      const clip = { url: URL.createObjectURL(blob), voice: response.headers.get("X-Speech-Voice") ?? undefined };
      if (cache.size >= 128) {
        const oldest = cache.keys().next().value;
        if (oldest) { URL.revokeObjectURL(cache.get(oldest)!.url); cache.delete(oldest); }
      }
      cache.set(url, clip);
      return clip;
    } catch { return null; }
    finally { inflight.delete(url); }
  });
  inflight.set(url, request);
  return request;
}
export function preload(text: string, language: SpeechLanguage): void {
  if (text.trim() && isSpeechSupported()) void resolveAudio(source(text.trim(), language));
}
export function isSpeechSupported(): boolean {
  return typeof window !== "undefined" && typeof window.Audio === "function";
}
/** Only the configured neural voice; never fall back to system speech. */
export function speak(text: string, language: SpeechLanguage, waitForEnd = false): Promise<SpeechResult> {
  if (!text.trim() || !isSpeechSupported()) return Promise.resolve({ ok: false, message: "当前设备无法播放自然语音" });
  cancelCurrent?.();
  currentAudio?.pause();
  const url = source(text.trim(), language);
  const ready = cache.get(url);
  // Start synchronously inside the user's click: iOS requires the gesture.
  const audio = currentAudio ?? new Audio();
  audio.src = ready?.url ?? url;
  audio.currentTime = 0;
  currentAudio = audio;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: SpeechResult) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      audio.removeEventListener("playing", playing);
      audio.removeEventListener("error", failed);
      audio.removeEventListener("ended", ended);
      if (cancelCurrent === cancel) cancelCurrent = null;
      resolve(result);
    };
    const failed = () => { audio.pause(); finish({ ok: false, message: "自然语音暂时无法播放，请稍后重试" }); };
    const playing = () => {
      window.clearTimeout(timer);
      if (!waitForEnd) finish({ ok: true, voice: ready?.voice });
    };
    const ended = () => finish({ ok: true, voice: ready?.voice });
    const cancel = () => { audio.pause(); finish({ ok: false, message: "" }); };
    const timer = window.setTimeout(failed, 20000);
    cancelCurrent = cancel;
    audio.addEventListener("playing", playing);
    audio.addEventListener("error", failed);
    audio.addEventListener("ended", ended);
    void audio.play().catch((error: unknown) => {
      if (error instanceof Error && error.name === "NotAllowedError") {
        audio.pause(); finish({ ok: false, message: "请点击喇叭播放自然语音" });
      } else failed();
    });
    // Populate the cache even when a cold click starts streaming first.
    if (!ready) void resolveAudio(url);
  });
}

export async function speakSequence(clips: { text: string; language: SpeechLanguage }[]): Promise<SpeechResult> {
  // Prepare every segment now, while the first one is already playing.
  // Waiting to request the Chinese clip until the foreign clip ends caused a network-sized gap.
  clips.forEach((clip) => preload(clip.text, clip.language));
  for (const clip of clips) { const result = await speak(clip.text, clip.language, true); if (!result.ok) return result; }
  return { ok: true };
}
export function stopSpeech(): void { cancelCurrent?.(); currentAudio?.pause(); }
