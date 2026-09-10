import type { AIProviderResponse } from "../lib/ai/types/ai.types";

export const validAIWord = {
  meaningZh: "改善",
  japanese: {
    term: "改善する",
    reading: "かいぜんする",
    romanization: "kaizen suru",
    partOfSpeech: "动词",
    difficulty: "JLPT N2" as const,
    example: "生活習慣を少しずつ改善しています。",
    exampleZh: "我正在逐步改善生活习惯。",
    collocations: ["品質を改善する", "状況を改善する"],
  },
  english: {
    term: "improve",
    phonetic: "/ɪmˈpruːv/",
    partOfSpeech: "verb",
    difficulty: "CET-4" as const,
    example: "She wants to improve her listening skills.",
    exampleZh: "她想提高听力能力。",
    collocations: ["improve quality", "improve gradually"],
  },
  note: "日语常与品质、制度搭配，英语 improve 的使用范围更广。",
  frequency: "高频" as const,
  tags: ["成长", "高频动词"],
};

export const validAIQuestion = {
  source: "word" as const,
  sourceId: "word-source-1",
  prompt: "请选择 improve 在句中的正确含义。",
  context: "We need to improve the service.",
  options: ["改善", "推迟", "取消", "记录"] as [string, string, string, string],
  correctIndex: 0,
  explanation: "improve 表示使事物变得更好，即改善或提高。",
  language: "english" as const,
  difficulty: "CET-4",
  category: "词义辨析",
};

export const validAIGrammar = {
  title: "〜ことになっている",
  language: "japanese" as const,
  level: "JLPT N2",
  explanation: "规则、安排或制度已经由外部条件决定时使用，重点不是说话人的临时决定，而是既定事实。",
  structure: "动词辞书形／ない形 + ことになっている",
  connection: "接在动词辞书形或ない形之后，描述持续有效的规则与安排。",
  scenarios: ["说明公司或学校的规定", "介绍已经确定的日程安排"],
  nuance: "带有客观、既定的语气；若强调自己做出的决定，通常使用ことにしている。",
  examples: [
    { text: "この図書館では飲食しないことになっています。", translationZh: "这家图书馆规定不能饮食。" },
    { text: "来月から大阪で働くことになっています。", translationZh: "已经安排我从下个月起在大阪工作。" },
    { text: "会議は九時に始まることになっています。", translationZh: "会议定于九点开始。" },
  ],
  comparison: { japanese: "毎日勉強することにしています。", english: "I make it a rule to study every day.", translationZh: "我规定自己每天学习。" },
  commonErrors: ["个人临时决定时误用ことになっている。"],
  confusables: ["〜ことにしている"],
  confusableDifferences: ["ことになっている强调外部决定，ことにしている强调说话人主动设定。"],
  exercises: [{
    source: "grammar" as const,
    sourceId: "draft-grammar",
    prompt: "请选择表示既定公司规定的正确表达。",
    context: "社員は名札を付ける＿＿。",
    options: ["ことになっている", "ことにしてみる", "ことができる", "ことはない"] as [string, string, string, string],
    correctIndex: 0,
    explanation: "既定规则使用ことになっている，强调规定由组织决定。",
    language: "japanese" as const,
    difficulty: "JLPT N2",
    category: "规则表达",
  }],
};

export function providerResponse(
  content: unknown,
  overrides: Partial<AIProviderResponse> = {},
): AIProviderResponse {
  return {
    requestId: "request-test",
    model: "deepseek-v4-flash",
    content: typeof content === "string" ? content : JSON.stringify(content),
    finishReason: "stop",
    durationMs: 120,
    retryCount: 0,
    usage: { inputTokens: 100, outputTokens: 200, totalTokens: 300, cacheHitTokens: 20 },
    ...overrides,
  };
}
