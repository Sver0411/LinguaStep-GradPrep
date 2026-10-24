import { NextResponse, type NextRequest } from "next/server";
import { NEURAL_VOICES, SpeechBusyError, synthesizeSpeech } from "@/lib/tts";

export const runtime = "nodejs";
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const text = (params.get("text") ?? "").trim();
  const lang = params.get("lang");
  if (!text || text.length > 1200 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text) || (lang !== "ja" && lang !== "en" && lang !== "zh")) {
    return NextResponse.json({ message: "请输入 1–1200 字符的日语、英语或中文内容" }, { status: 400 });
  }
  try {
    const audio = await synthesizeSpeech(text, lang);
    return new NextResponse(new Uint8Array(audio), { headers: {
      "Content-Type": "audio/mpeg",
      "X-Speech-Voice": NEURAL_VOICES[lang],
      "Cache-Control": "private, max-age=604800",
    } });
  } catch (error) {
    return NextResponse.json({ message: "自然语音暂时无法加载，请稍后重试" }, { status: error instanceof SpeechBusyError ? 503 : 502 });
  }
}
