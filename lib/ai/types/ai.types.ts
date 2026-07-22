import type {
  AIErrorCode,
  AIGenerationRecord,
  AIExplanationContent,
  AIExplanationRecord,
  AISavedCollection,
  AIUsageRecord,
  ChoiceQuestion,
  GrammarComparison,
  GrammarPoint,
  TestMode,
  TestSourceFilter,
  WordPair,
} from "@/lib/models";

export interface AIRequestUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheHitTokens: number;
}

export interface AIProviderRequest {
  requestId: string;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxTokens: number;
  thinking: boolean;
  signal?: AbortSignal;
}

export interface AIProviderResponse {
  requestId: string;
  model: string;
  content: string;
  finishReason: string;
  durationMs: number;
  retryCount: number;
  usage: AIRequestUsage;
}

export interface AIConnectionResult {
  ok: boolean;
  availableModels: string[];
  fastModel: string;
  qualityModel: string;
}

export interface AIProvider {
  generateJSON(request: AIProviderRequest): Promise<AIProviderResponse>;
  testConnection(signal?: AbortSignal): Promise<AIConnectionResult>;
  listModels(signal?: AbortSignal): Promise<string[]>;
}

export interface ExistingWordSummary {
  japanese: string;
  reading: string;
  english: string;
  meaningZh: string;
}

export interface WordGenerationInput {
  count: 1 | 5 | 10;
  japaneseLevel: "N3" | "N2" | "N1";
  englishLevel: "四级" | "六级" | "TOEIC";
  frequency: "高频" | "常用" | "普通";
  purpose: "日常" | "考试" | "综合";
  quality: "fast" | "quality";
  qualityReview: boolean;
  existingWords: ExistingWordSummary[];
}

export interface GrammarGenerationInput {
  count: number;
  language: "japanese" | "english" | "comparison";
  level: string;
  topic?: string;
  quality: "fast" | "quality";
  qualityReview: boolean;
  existingTitles: string[];
}

export interface AISourceSummary {
  source: "word" | "grammar" | "comparison";
  sourceId: string;
  language: "japanese" | "english" | "mixed";
  difficulty: string;
  title: string;
  summary: string;
}

export interface QuizGenerationInput {
  count: number;
  mode: TestMode;
  sourceFilter: TestSourceFilter | "specified";
  quality: "fast" | "quality";
  sources: AISourceSummary[];
}

export interface ExplanationGenerationInput {
  question: ChoiceQuestion;
  selectedIndex: number;
  variant: "simple" | "detailed";
  relatedSummary?: string;
  force?: boolean;
}

export interface AIGenerationPayload {
  generation: AIGenerationRecord;
  usage: AIUsageRecord;
  words?: WordPair[];
  grammar?: GrammarPoint[];
  comparisons?: GrammarComparison[];
  questions?: ChoiceQuestion[];
  explanation?: AIExplanationRecord;
  rejectedReasons?: string[];
}

export interface AIHealthResponse {
  enabled: boolean;
  provider: "deepseek";
  serverModeConfigured: boolean;
  serverModeProtected: boolean;
  fastModel: string;
  qualityModel: string;
  timeoutMs: number;
  maxRetries: number;
  maxConcurrency: number;
}

export interface AIAPIErrorBody {
  error: { code: AIErrorCode; message: string; retryable: boolean };
  requestId?: string;
}

export interface AIAPIResponse<T> {
  data: T;
  requestId: string;
}

export type AIClientOperation =
  | "models"
  | "generate-words"
  | "generate-grammar"
  | "generate-quiz"
  | "explain-mistake";

export type AITransientResult =
  | { kind: "words"; payload: AIGenerationPayload; saved: boolean }
  | { kind: "grammar"; payload: AIGenerationPayload; saved: boolean }
  | { kind: "quiz"; payload: AIGenerationPayload; saved: boolean; collection?: AISavedCollection }
  | { kind: "explanation"; content: AIExplanationContent; record: AIExplanationRecord };
