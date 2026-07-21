import { createAIHandler } from "@/lib/ai/server/api-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = createAIHandler("explain-mistake");
