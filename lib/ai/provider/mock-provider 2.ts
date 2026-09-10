import type {
  AIConnectionResult,
  AIProvider,
  AIProviderRequest,
  AIProviderResponse,
} from "@/lib/ai/types/ai.types";

export type MockAIResolver = (
  request: AIProviderRequest,
) => AIProviderResponse | Promise<AIProviderResponse>;

export class MockAIProvider implements AIProvider {
  constructor(private readonly resolver: MockAIResolver) {}

  generateJSON(request: AIProviderRequest): Promise<AIProviderResponse> {
    return Promise.resolve(this.resolver(request));
  }

  async listModels(): Promise<string[]> {
    return ["deepseek-v4-flash", "deepseek-v4-pro"];
  }

  async testConnection(): Promise<AIConnectionResult> {
    const availableModels = await this.listModels();
    return {
      ok: true,
      availableModels,
      fastModel: availableModels[0],
      qualityModel: availableModels[1],
    };
  }
}
