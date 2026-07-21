import { z } from "zod";

const cleanText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum).refine(
    (value) => !value.includes("```") && !/^here is|^以下是|^当然[，,:：]/i.test(value),
    "不能包含 Markdown 代码块或模型说明前缀",
  );

const optionalCleanText = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
    cleanText(minimum, maximum).optional(),
  );

const exampleSchema = z.object({
  text: cleanText(4, 300),
  translationZh: cleanText(2, 200),
}).strict();

const questionSchema = z.object({
  source: z.enum(["word", "grammar", "comparison"]),
  sourceId: cleanText(1, 120),
  prompt: cleanText(4, 500),
  context: optionalCleanText(1, 500),
  options: z.tuple([
    cleanText(1, 220),
    cleanText(1, 220),
    cleanText(1, 220),
    cleanText(1, 220),
  ]),
  correctIndex: z.number().int().min(0).max(3),
  explanation: cleanText(6, 700),
  language: z.enum(["japanese", "english", "mixed"]),
  difficulty: cleanText(1, 60),
  category: cleanText(1, 80),
}).strict();

export const aiWordItemSchema = z.object({
  meaningZh: cleanText(1, 40),
  japanese: z.object({
    term: cleanText(1, 40),
    reading: cleanText(1, 60),
    romanization: cleanText(1, 100),
    partOfSpeech: cleanText(1, 40),
    difficulty: z.enum(["JLPT N3", "JLPT N2", "JLPT N1 过渡"]),
    example: cleanText(4, 300),
    exampleZh: cleanText(2, 200),
    collocations: z.array(cleanText(1, 80)).min(1).max(5),
  }).strict(),
  english: z.object({
    term: cleanText(1, 60),
    phonetic: cleanText(1, 80),
    partOfSpeech: cleanText(1, 40),
    difficulty: z.enum(["高中基础", "CET-4", "CET-6", "TOEIC 过渡"]),
    example: cleanText(4, 300),
    exampleZh: cleanText(2, 200),
    collocations: z.array(cleanText(1, 80)).min(1).max(5),
  }).strict(),
  note: cleanText(6, 300),
  frequency: z.enum(["高频", "常用", "普通"]),
  tags: z.array(cleanText(1, 30)).min(1).max(6),
}).strict();

export const aiWordResponseSchema = z.object({
  items: z.array(aiWordItemSchema).min(1).max(10),
}).strict();

export const aiGrammarItemSchema = z.object({
  title: cleanText(2, 100),
  language: z.enum(["japanese", "english"]),
  level: cleanText(1, 40),
  explanation: cleanText(40, 1200),
  structure: cleanText(2, 300),
  connection: cleanText(2, 500),
  scenarios: z.array(cleanText(2, 160)).min(2).max(6),
  nuance: cleanText(10, 600),
  examples: z.array(exampleSchema).min(3).max(5),
  comparison: z.object({
    japanese: cleanText(2, 300),
    english: cleanText(2, 300),
    translationZh: cleanText(2, 200),
  }).strict(),
  commonErrors: z.array(cleanText(4, 300)).min(1).max(6),
  confusables: z.array(cleanText(2, 180)).min(1).max(6),
  confusableDifferences: z.array(cleanText(6, 400)).min(1).max(6),
  exercises: z.array(questionSchema).min(1).max(5),
}).strict();

export const aiGrammarResponseSchema = z.object({
  items: z.array(aiGrammarItemSchema).min(1).max(3),
}).strict();

export const aiComparisonItemSchema = z.object({
  semantic: cleanText(2, 80),
  japanese: cleanText(2, 160),
  english: cleanText(2, 160),
  samePoints: cleanText(8, 500),
  difference: cleanText(12, 800),
  nonInterchangeable: z.array(cleanText(5, 260)).min(1).max(5),
  japaneseExample: cleanText(4, 300),
  englishExample: cleanText(4, 300),
  translationZh: cleanText(2, 200),
  pitfalls: z.array(cleanText(5, 260)).min(1).max(6),
  exercise: questionSchema,
  level: cleanText(1, 60),
}).strict();

export const aiComparisonResponseSchema = z.object({
  items: z.array(aiComparisonItemSchema).min(1).max(3),
}).strict();

export const aiQuizResponseSchema = z.object({
  items: z.array(questionSchema).min(1).max(30),
}).strict();

export const aiExplanationResponseSchema = z.object({
  whyCorrect: cleanText(6, 500),
  whyUserChoiceWrong: cleanText(6, 500),
  keyPoint: cleanText(4, 300),
  languageDifference: cleanText(2, 400),
  example: cleanText(4, 300),
  preventionTip: cleanText(4, 300),
}).strict();

export const qualityReviewResponseSchema = z.object({
  status: z.enum(["pass", "needsRepair", "reject"]),
  issues: z.array(cleanText(2, 300)).max(10),
  repairSuggestions: z.array(cleanText(2, 300)).max(10),
}).strict();

const qualitySchema = z.enum(["fast", "quality"]);

export const existingWordSummarySchema = z.object({
  japanese: cleanText(1, 60),
  reading: z.string().trim().max(80),
  english: cleanText(1, 80),
  meaningZh: cleanText(1, 60),
}).strict();

export const wordGenerationInputSchema = z.object({
  count: z.union([z.literal(1), z.literal(5), z.literal(10)]),
  japaneseLevel: z.enum(["N3", "N2", "N1"]),
  englishLevel: z.enum(["高中基础", "四级", "六级", "TOEIC 过渡"]),
  frequency: z.enum(["高频", "常用", "普通"]),
  purpose: z.enum(["日常", "考试", "综合"]),
  quality: qualitySchema,
  qualityReview: z.boolean(),
  existingWords: z.array(existingWordSummarySchema).max(500),
}).strict();

export const grammarGenerationInputSchema = z.object({
  count: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  language: z.enum(["japanese", "english", "comparison"]),
  level: cleanText(1, 40),
  topic: z.string().trim().max(80).optional(),
  quality: qualitySchema,
  qualityReview: z.boolean(),
  existingTitles: z.array(cleanText(1, 120)).max(200),
}).strict();

export const aiSourceSummarySchema = z.object({
  source: z.enum(["word", "grammar", "comparison"]),
  sourceId: cleanText(1, 120),
  language: z.enum(["japanese", "english", "mixed"]),
  difficulty: cleanText(1, 60),
  title: cleanText(1, 160),
  summary: cleanText(2, 700),
}).strict();

export const quizGenerationInputSchema = z.object({
  count: z.number().int().min(1).max(30),
  mode: z.enum(["japanese", "english", "mixed"]),
  sourceFilter: z.enum(["all-learned", "today", "recent-7", "mistakes", "favorites", "due", "specified"]),
  quality: qualitySchema,
  sources: z.array(aiSourceSummarySchema).min(1).max(100),
}).strict();

export const explanationGenerationInputSchema = z.object({
  question: z.object({
    id: cleanText(1, 160),
    source: z.enum(["word", "grammar", "comparison"]),
    sourceId: cleanText(1, 120),
    prompt: cleanText(2, 500),
    context: z.string().trim().max(500).optional(),
    options: z.tuple([
      cleanText(1, 220),
      cleanText(1, 220),
      cleanText(1, 220),
      cleanText(1, 220),
    ]),
    correctIndex: z.number().int().min(0).max(3),
    explanation: z.string().trim().max(700),
    language: z.enum(["japanese", "english", "mixed"]).optional(),
    difficulty: z.string().trim().max(60).optional(),
    category: z.string().trim().max(80).optional(),
  }).strict(),
  selectedIndex: z.number().int().min(0).max(3),
  variant: z.enum(["simple", "detailed"]),
  relatedSummary: z.string().trim().max(1000).optional(),
  force: z.boolean().optional(),
}).strict();

export type AIWordWireItem = z.infer<typeof aiWordItemSchema>;
export type AIGrammarWireItem = z.infer<typeof aiGrammarItemSchema>;
export type AIComparisonWireItem = z.infer<typeof aiComparisonItemSchema>;
export type AIQuizWireItem = z.infer<typeof questionSchema>;
