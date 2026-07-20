import type {
  AIComparisonWireItem,
  AIGrammarWireItem,
  AIQuizWireItem,
  AIWordWireItem,
} from "@/lib/ai/schemas/content-schemas";
import type { ExistingWordSummary } from "@/lib/ai/types/ai.types";

export interface ValidationIssue {
  index: number;
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  accepted: T[];
  rejected: Array<{ item: T; issues: ValidationIssue[] }>;
}

export function normalizeContent(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[\s\p{P}\p{S}]+/gu, "")
    .trim();
}

export function contentHash(value: unknown): string {
  const input = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function containsForbiddenFormatting(value: string): boolean {
  return value.includes("```") || /^here is|^以下是|^当然[，,:：]/i.test(value.trim());
}

function uniqueNormalized(values: readonly string[]): boolean {
  const normalized = values.map(normalizeContent);
  return normalized.every(Boolean) && new Set(normalized).size === normalized.length;
}

export function validateWords(
  items: readonly AIWordWireItem[],
  existing: readonly ExistingWordSummary[],
): ValidationResult<AIWordWireItem> {
  const japanese = new Set(existing.map((item) => normalizeContent(item.japanese)));
  const readings = new Set(existing.map((item) => normalizeContent(item.reading)));
  const english = new Set(existing.map((item) => normalizeContent(item.english)));
  const meanings = new Set(existing.map((item) => normalizeContent(item.meaningZh)));
  const batchHashes = new Set<string>();
  const accepted: AIWordWireItem[] = [];
  const rejected: ValidationResult<AIWordWireItem>["rejected"] = [];

  items.forEach((item, index) => {
    const issues: ValidationIssue[] = [];
    const japaneseKey = normalizeContent(item.japanese.term);
    const readingKey = normalizeContent(item.japanese.reading);
    const englishKey = normalizeContent(item.english.term);
    const meaningKey = normalizeContent(item.meaningZh);
    const hash = contentHash({ japaneseKey, readingKey, englishKey, meaningKey });
    if (!/[ぁ-ゖァ-ヺー]/u.test(item.japanese.reading)) {
      issues.push({ index, field: "japanese.reading", message: "假名字段格式不合理" });
    }
    if (!/[一-龯々ぁ-ゖァ-ヺ]/u.test(item.japanese.term)) {
      issues.push({ index, field: "japanese.term", message: "日语字段疑似写反" });
    }
    if (!/[A-Za-z]/.test(item.english.term) || /[ぁ-ゖァ-ヺ]/u.test(item.english.term)) {
      issues.push({ index, field: "english.term", message: "英语字段疑似写反" });
    }
    if (!/[\u3400-\u9fff]/u.test(item.meaningZh)) {
      issues.push({ index, field: "meaningZh", message: "中文释义格式不合理" });
    }
    if (normalizeContent(item.japanese.example) === japaneseKey) {
      issues.push({ index, field: "japanese.example", message: "日语例句不能等于单词" });
    }
    if (normalizeContent(item.english.example) === englishKey) {
      issues.push({ index, field: "english.example", message: "英语例句不能等于单词" });
    }
    if (normalizeContent(item.japanese.example) === normalizeContent(item.english.example)) {
      issues.push({ index, field: "examples", message: "日英例句不能完全相同" });
    }
    if ([item.note, item.meaningZh, item.japanese.example, item.english.example].some(containsForbiddenFormatting)) {
      issues.push({ index, field: "content", message: "内容含模型前缀或 Markdown" });
    }
    if (japanese.has(japaneseKey) || readings.has(readingKey) || english.has(englishKey) || meanings.has(meaningKey)) {
      issues.push({ index, field: "duplicate", message: "与现有词库重复" });
    }
    if (batchHashes.has(hash)) {
      issues.push({ index, field: "duplicate", message: "同批内容重复" });
    }
    if (issues.length > 0) {
      rejected.push({ item, issues });
    } else {
      accepted.push(item);
      batchHashes.add(hash);
      japanese.add(japaneseKey);
      readings.add(readingKey);
      english.add(englishKey);
      meanings.add(meaningKey);
    }
  });
  return { accepted, rejected };
}

export function validateGrammar(
  items: readonly AIGrammarWireItem[],
  existingTitles: readonly string[],
  expectedLanguage: "japanese" | "english",
  expectedLevel?: string,
): ValidationResult<AIGrammarWireItem> {
  const titles = new Set(existingTitles.map(normalizeContent));
  const accepted: AIGrammarWireItem[] = [];
  const rejected: ValidationResult<AIGrammarWireItem>["rejected"] = [];
  items.forEach((item, index) => {
    const issues: ValidationIssue[] = [];
    const title = normalizeContent(item.title);
    if (item.language !== expectedLanguage) {
      issues.push({ index, field: "language", message: "语言类型与请求不一致" });
    }
    const legalLevel = item.language === "japanese"
      ? /^(JLPT )?N[123]( 过渡)?$/.test(item.level)
      : /^(高中基础|四级|六级|CET-4|CET-6|TOEIC 过渡)$/.test(item.level);
    if (!legalLevel) {
      issues.push({ index, field: "level", message: "语法等级标签不合法" });
    }
    if (expectedLevel) {
      const canonicalLevel = (value: string) => normalizeContent(value)
        .replace("jlpt", "")
        .replace("cet-4", "四级")
        .replace("cet4", "四级")
        .replace("cet-6", "六级")
        .replace("cet6", "六级");
      const normalizedExpected = canonicalLevel(expectedLevel);
      const normalizedActual = canonicalLevel(item.level);
      const equivalent = normalizedActual.includes(normalizedExpected) || normalizedExpected.includes(normalizedActual);
      if (!equivalent) issues.push({ index, field: "level", message: "语法等级与请求不一致" });
    }
    if (titles.has(title)) {
      issues.push({ index, field: "title", message: "与现有语法标题重复" });
    }
    if (item.confusables.some((value) => normalizeContent(value) === title)) {
      issues.push({ index, field: "confusables", message: "易混淆语法不能是自身" });
    }
    if (item.exercises.some((question) => !uniqueNormalized(question.options))) {
      issues.push({ index, field: "exercises", message: "练习题选项必须唯一" });
    }
    if (containsForbiddenFormatting(item.explanation)) {
      issues.push({ index, field: "explanation", message: "讲解含模型前缀或 Markdown" });
    }
    if (issues.length > 0) rejected.push({ item, issues });
    else {
      accepted.push(item);
      titles.add(title);
    }
  });
  return { accepted, rejected };
}

export function validateComparisons(
  items: readonly AIComparisonWireItem[],
  existingTitles: readonly string[],
): ValidationResult<AIComparisonWireItem> {
  const titles = new Set(existingTitles.map(normalizeContent));
  const accepted: AIComparisonWireItem[] = [];
  const rejected: ValidationResult<AIComparisonWireItem>["rejected"] = [];
  items.forEach((item, index) => {
    const issues: ValidationIssue[] = [];
    const title = normalizeContent(item.semantic);
    if (titles.has(title)) {
      issues.push({ index, field: "semantic", message: "与现有对比语义重复" });
    }
    if (!/(N[123]|高中|四级|六级|CET|TOEIC)/i.test(item.level)) {
      issues.push({ index, field: "level", message: "对比难度标签不合法" });
    }
    if (/完全相同|逐字对应|一一对应/.test(item.samePoints + item.difference)) {
      issues.push({ index, field: "difference", message: "不能声称两种语言逐字对应" });
    }
    if (!uniqueNormalized(item.exercise.options)) {
      issues.push({ index, field: "exercise.options", message: "练习题选项必须唯一" });
    }
    if (issues.length > 0) rejected.push({ item, issues });
    else {
      accepted.push(item);
      titles.add(title);
    }
  });
  return { accepted, rejected };
}

export function validateQuiz(
  items: readonly AIQuizWireItem[],
  allowedSources: ReadonlyMap<string, { source: string; language: string }>,
  expectedMode: "japanese" | "english" | "mixed",
): ValidationResult<AIQuizWireItem> {
  const accepted: AIQuizWireItem[] = [];
  const rejected: ValidationResult<AIQuizWireItem>["rejected"] = [];
  const questionHashes = new Set<string>();
  items.forEach((item, index) => {
    const issues: ValidationIssue[] = [];
    const source = allowedSources.get(item.sourceId);
    if (!source || source.source !== item.source) {
      issues.push({ index, field: "sourceId", message: "题目引用的学习内容不存在" });
    }
    if (expectedMode !== "mixed" && item.language !== expectedMode) {
      issues.push({ index, field: "language", message: "题目语言模式不一致" });
    }
    if (!uniqueNormalized(item.options)) {
      issues.push({ index, field: "options", message: "四个选项必须唯一" });
    }
    const correct = item.options[item.correctIndex];
    if (!correct || normalizeContent(correct).length === 0) {
      issues.push({ index, field: "correctIndex", message: "正确答案索引无效" });
    }
    const hash = contentHash({ prompt: normalizeContent(item.prompt), options: item.options.map(normalizeContent) });
    if (questionHashes.has(hash)) {
      issues.push({ index, field: "prompt", message: "同批题目重复" });
    }
    if (issues.length > 0) rejected.push({ item, issues });
    else {
      accepted.push(item);
      questionHashes.add(hash);
    }
  });
  return { accepted, rejected };
}

export function flattenValidationIssues<T>(
  rejected: ValidationResult<T>["rejected"],
): string[] {
  return rejected.flatMap((entry) =>
    entry.issues.map((issue) => `第 ${issue.index + 1} 项 ${issue.field}：${issue.message}`),
  );
}
