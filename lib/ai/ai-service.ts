import type { AiGenerationRequest, AiGenerationResult } from "../models";

export interface AiService {
  generate<T>(request: AiGenerationRequest): Promise<AiGenerationResult<T>>;
}

export class AiServiceUnavailableError extends Error {
  constructor() {
    super("AI 生成功能将在后续版本开放。");
    this.name = "AiServiceUnavailableError";
  }
}

export class MockAiService implements AiService {
  async generate<T>(
    request: AiGenerationRequest,
  ): Promise<AiGenerationResult<T>> {
    void request;
    throw new AiServiceUnavailableError();
  }
}
