"use server";

import {
  executeAIAction,
  type AIActionRequest,
  type AIActionResult,
} from "@/lib/ai/server/action-handler";

export async function invokeAIAction(action: AIActionRequest): Promise<AIActionResult> {
  return executeAIAction(action);
}
