import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export async function GET(request: NextRequest, context: { params: Promise<{ hash: string }> }) {
  const { hash } = await context.params;
  if (!/^[a-f0-9]{32}$/.test(hash)) return new NextResponse(null, { status: 404 });
  try {
    const folder = process.env.LINGUASTEP_AUDIO_DIR || path.join(process.cwd(), "work", "book-audio");
    const data = await readFile(path.join(folder, `${hash}.mp3`));
    const headers = new Headers({ "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=31536000, immutable", "X-Speech-Voice": "book-audio" });
    const range = request.headers.get("range");
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match || !match[1] && !match[2]) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
      const start = match[1] ? Number(match[1]) : Math.max(0, data.length - Number(match[2]));
      const end = match[1] && match[2] ? Math.min(Number(match[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length || !Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${data.length}` } });
      headers.set("Content-Range", `bytes ${start}-${end}/${data.length}`);
      headers.set("Content-Length", String(end - start + 1));
      return new NextResponse(data.subarray(start, end + 1), { status: 206, headers });
    }
    headers.set("Content-Length", String(data.length));
    return new NextResponse(data, { headers });
  } catch { return new NextResponse(null, { status: 404 }); }
}
