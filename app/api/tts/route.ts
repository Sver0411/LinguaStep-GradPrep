import { NextResponse, type NextRequest } from "next/server";

/**
 * Pronunciation proxy.
 *
 * Playing the dictionary audio straight from the browser turned out to be
 * unreliable (the request is blocked or simply never completes on some
 * networks), which silently dropped playback to the robotic system voice.
 * Routing it through our own origin means the browser only ever talks to the
 * server that served the page, and the upstream call happens where the
 * network is predictable.
 */
export const runtime = "nodejs";

const UPSTREAM = {
  ja: (text: string) =>
    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&le=jap`,
  en: (text: string) =>
    `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=2`,
} as const;

const MAX_LENGTH = 80;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const text = (params.get("text") ?? "").trim();
  const lang = params.get("lang") === "en" ? "en" : "ja";

  if (!text || text.length > MAX_LENGTH) {
    return new NextResponse("bad request", { status: 400 });
  }

  try {
    const upstream = await fetch(UPSTREAM[lang](text), {
      // Pronunciation for a given word never changes; let the CDN hold on to it.
      next: { revalidate: 604800 },
    });
    if (!upstream.ok) {
      return new NextResponse("tts upstream error", { status: 502 });
    }
    const audio = await upstream.arrayBuffer();
    if (audio.byteLength === 0) {
      return new NextResponse("empty audio", { status: 502 });
    }
    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "public, max-age=604800, s-maxage=604800, immutable",
      },
    });
  } catch {
    return new NextResponse("tts fetch failed", { status: 502 });
  }
}
