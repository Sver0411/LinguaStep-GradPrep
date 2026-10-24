import { createHash } from "node:crypto";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

export const NEURAL_VOICES = { ja: "ja-JP-NanamiNeural", en: "en-US-JennyNeural", zh: "zh-CN-XiaoxiaoNeural" } as const;
export function escapeSpeechText(text: string): string {
  return text.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[character]!);
}
const cache = new Map<string, Uint8Array>();
const pending = new Map<string, Promise<Uint8Array>>();
let cachedBytes = 0;
const MAX_CACHE_BYTES = 16 * 1024 * 1024;
export class SpeechBusyError extends Error {}

/** Server-side Edge Read Aloud. A community integration, not an Azure contract. */
export async function synthesizeSpeech(text: string, language: keyof typeof NEURAL_VOICES): Promise<Uint8Array> {
  const key = createHash("sha256").update(`${NEURAL_VOICES[language]}:${text}`).digest("hex");
  const hit = cache.get(key);
  if (hit) { cache.delete(key); cache.set(key, hit); return hit; }
  const existing = pending.get(key);
  if (existing) return existing;
  if (pending.size >= 6) throw new SpeechBusyError("语音服务繁忙，请稍后重试");
  const task = (async () => {
    const tts = new MsEdgeTTS({ connectionTimeoutMs: 8000, synthesisTimeoutMs: 12000 });
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const work = async () => {
        await tts.setMetadata(NEURAL_VOICES[language], OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
        const { audioStream } = tts.toStream(escapeSpeechText(text));
        const chunks: Buffer[] = [];
        let bytes = 0;
        for await (const chunk of audioStream) {
          const buffer = Buffer.from(chunk);
          bytes += buffer.length;
          if (bytes > 4 * 1024 * 1024) throw new Error("Audio too large");
          chunks.push(buffer);
        }
        if (bytes < 512) throw new Error("Empty speech audio");
        return new Uint8Array(Buffer.concat(chunks));
      };
      const audio = await Promise.race([work(), new Promise<never>((_, reject) => {
        timer = setTimeout(() => { reject(new Error("Speech timed out")); tts.close(); }, 18000);
      })]);
      while (cache.size && (cache.size >= 128 || cachedBytes + audio.byteLength > MAX_CACHE_BYTES)) {
        const oldest = cache.keys().next().value!;
        cachedBytes -= cache.get(oldest)!.byteLength; cache.delete(oldest);
      }
      cache.set(key, audio); cachedBytes += audio.byteLength;
      return audio;
    } finally {
      clearTimeout(timer); tts.close(); pending.delete(key);
    }
  })();
  pending.set(key, task);
  return task;
}
