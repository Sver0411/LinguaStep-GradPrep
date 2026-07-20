import { describe, expect, it } from "vitest";
import { parseAIConfig } from "../lib/ai/config/ai-config";
import { MockAIProvider } from "../lib/ai/provider/mock-provider";
import { AIContentService } from "../lib/ai/services/ai-content-service";
import { updateMistakeRecord, updateWordMastery } from "../lib/learning";
import { MemoryLearningRepository } from "../lib/repositories/memory";
import { providerResponse, validAIGrammar, validAIQuestion, validAIWord } from "./ai-fixtures";

describe("mocked phase-three AI workflow", () => {
  it("generates, validates, persists, studies, explains, reloads and removes AI content", async () => {
    let quizSourceId = "";
    const provider = new MockAIProvider((request) => {
      if (request.systemPrompt.includes("日英对应词卡")) {
        const labels = [
          ["改善", "改善する", "かいぜんする", "improve"],
          ["維持", "維持する", "いじする", "maintain"],
          ["達成", "達成する", "たっせいする", "achieve"],
          ["確認", "確認する", "かくにんする", "confirm"],
          ["提案", "提案する", "ていあんする", "propose"],
        ];
        return providerResponse({ items: labels.map(([meaningZh, term, reading, english], index) => ({
          ...validAIWord,
          meaningZh,
          japanese: { ...validAIWord.japanese, term, reading, romanization: `romanization ${index}`, example: `${term}ために、毎日少しずつ努力しています。` },
          english: { ...validAIWord.english, term: english, phonetic: `/word-${index}/`, example: `This example helps us ${english} the result.` },
        })) });
      }
      if (request.systemPrompt.includes("结构化日语或英语语法")) return providerResponse({ items: [validAIGrammar] });
      if (request.systemPrompt.includes("四选一测试")) return providerResponse({ items: [{ ...validAIQuestion, sourceId: quizSourceId }] });
      return providerResponse({
        whyCorrect: "正确选项符合句中 improve 的核心词义。",
        whyUserChoiceWrong: "错误选项表示取消，和服务变好的语境不符。",
        keyPoint: "improve 表示改善或提高。",
        languageDifference: "日语可按语境使用改善する或向上させる。",
        example: "Regular practice can improve your listening.",
        preventionTip: "先判断句子描述的是变好还是停止。",
      }, { model: "deepseek-v4-pro" });
    });
    const service = new AIContentService(provider, parseAIConfig({}));
    const repository = new MemoryLearningRepository();

    const words = await service.generateWords({ count: 5, japaneseLevel: "N2", englishLevel: "四级", frequency: "高频", purpose: "综合", quality: "fast", qualityReview: false, existingWords: [] }, "e2e-words");
    expect(words.words).toHaveLength(5);
    quizSourceId = words.words![0].id;
    const grammar = await service.generateGrammar({ count: 1, language: "japanese", level: "N2", quality: "fast", qualityReview: false, existingTitles: [] }, "e2e-grammar");
    expect(grammar.grammar).toHaveLength(1);
    const quiz = await service.generateQuiz({ count: 1, mode: "english", sourceFilter: "all-learned", quality: "fast", sources: [{ source: "word", sourceId: quizSourceId, language: "english", difficulty: "CET-4", title: "improve", summary: "improve 表示改善" }] }, "e2e-quiz");
    expect(quiz.questions).toHaveLength(1);

    const now = "2026-07-21T04:00:00.000Z";
    const question = quiz.questions![0];
    const wrongIndex = question.correctIndex === 0 ? 1 : 0;
    const mistake = updateMistakeRecord(undefined, question, wrongIndex, now)!;
    const explanation = await service.explainMistake({ question, selectedIndex: wrongIndex, variant: "detailed" }, "e2e-explanation");
    expect(explanation.explanation?.content.preventionTip).toContain("先判断");

    const snapshot = await repository.getSnapshot();
    await repository.saveSnapshot({
      ...snapshot,
      aiWords: words.words!,
      aiGrammar: grammar.grammar!,
      aiGenerations: [words.generation, grammar.generation, quiz.generation, explanation.generation],
      aiUsage: [words.usage, grammar.usage, quiz.usage, explanation.usage],
      aiExplanations: [explanation.explanation!],
      wordProgress: [updateWordMastery(undefined, quizSourceId, "known", now, "english")],
      mistakes: [mistake],
    });

    const reloaded = await repository.getSnapshot();
    expect(reloaded.aiWords).toHaveLength(5);
    expect(reloaded.aiGrammar).toHaveLength(1);
    expect(reloaded.aiExplanations).toHaveLength(1);
    expect(reloaded.wordProgress[0].wordId).toBe(quizSourceId);
    expect(reloaded.mistakes[0].active).toBe(true);

    await repository.saveSnapshot({
      ...reloaded,
      aiWords: reloaded.aiWords.filter((item) => item.id !== quizSourceId),
      wordProgress: reloaded.wordProgress.filter((item) => item.wordId !== quizSourceId),
      mistakes: reloaded.mistakes.filter((item) => item.contentRef.sourceId !== quizSourceId),
    });
    const afterDelete = await repository.getSnapshot();
    expect(afterDelete.aiWords.some((item) => item.id === quizSourceId)).toBe(false);
    expect(afterDelete.wordProgress).toHaveLength(0);
  });
});
