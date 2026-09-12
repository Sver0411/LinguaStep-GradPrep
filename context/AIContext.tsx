"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AIAPIClient } from "@/lib/ai/client/ai-api-client";
import {
  filterGrammarPayloadAgainstLibrary,
  filterWordPayloadAgainstLibrary,
} from "@/lib/ai/client/library-dedup";
import {
  AISettingsRepository,
  clearAISecret,
  clearAllAISecrets,
  getAISecret,
  maskedSecret,
  setAISecret,
} from "@/lib/ai/client/ai-settings";
import { AIError, normalizeAIError } from "@/lib/ai/errors/ai-error";
import {
  grammarGenerationPrompt,
  mistakeExplanationPrompt,
  quizGenerationPrompt,
  wordGenerationPrompt,
} from "@/lib/ai/prompts/templates";
import type {
  AIGenerationPayload,
  AIHealthResponse,
  AITransientResult,
  ExplanationGenerationInput,
  GrammarGenerationInput,
  QuizGenerationInput,
  WordGenerationInput,
} from "@/lib/ai/types/ai.types";
import { contentHash } from "@/lib/ai/validation/content-validator";
import { DEFAULT_AI_SETTINGS } from "@/lib/constants";
import { dateKey, getWordModeState } from "@/lib/learning";
import { isReviewDue } from "@/lib/spaced-repetition";
import type {
  AIGenerationKind,
  AIGenerationRecord,
  AISecretPersistence,
  AISettings,
  AISavedCollection,
  AIUsageRecord,
  TestMode,
  TestSourceFilter,
} from "@/lib/models";
import { useLearning } from "@/context/learning";

type BusyOperation = "connection" | "words" | "grammar" | "quiz" | "explanation" | null;

interface QuizRequestOptions {
  count: number;
  mode: TestMode;
  sourceFilter: TestSourceFilter | "specified";
  quality: "fast" | "quality";
  specifiedIds?: string[];
}

interface AIUsageSummary {
  todayRequests: number;
  monthRequests: number;
  todayTokens: number;
  monthTokens: number;
  successRate: number;
  averageDurationMs: number;
  lastError?: string;
}

interface AIContextValue {
  settings: AISettings;
  /** Internal revision used to refresh masked secret status after a clear. */
  secretRevision: number;
  health: AIHealthResponse | null;
  online: boolean;
  busyOperation: BusyOperation;
  error: AIError | null;
  transientResult: AITransientResult | null;
  usageSummary: AIUsageSummary;
  updateSettings: (patch: Partial<AISettings>) => void;
  setSecret: (kind: "apiKey" | "proxyToken", value: string, persistence: AISecretPersistence) => void;
  clearSecret: (kind: "apiKey" | "proxyToken") => void;
  getSecretStatus: (kind: "apiKey" | "proxyToken") => { configured: boolean; masked: string };
  testConnection: () => Promise<void>;
  generateWords: (input: Omit<WordGenerationInput, "existingWords">) => Promise<AIGenerationPayload | null>;
  generateGrammar: (input: Omit<GrammarGenerationInput, "existingTitles">) => Promise<AIGenerationPayload | null>;
  generateQuiz: (input: QuizRequestOptions) => Promise<AIGenerationPayload | null>;
  explainMistake: (input: ExplanationGenerationInput) => Promise<AIGenerationPayload | null>;
  saveTransient: () => Promise<void>;
  saveQuizCollection: (title: string) => Promise<AISavedCollection | null>;
  undoLastSave: () => Promise<void>;
  cancel: () => void;
  resetAISettings: () => void;
  clearAllSecrets: () => void;
}

const AIContext = createContext<AIContextValue | null>(null);

function combineSavedPayloads(
  payloads: AIGenerationPayload[],
  requestedCount: number,
): AIGenerationPayload {
  const first = payloads[0];
  const last = payloads[payloads.length - 1];
  const words = payloads.flatMap((payload) => payload.words ?? []);
  const grammar = payloads.flatMap((payload) => payload.grammar ?? []);
  const comparisons = payloads.flatMap((payload) => payload.comparisons ?? []);
  const rejectedReasons = payloads.flatMap((payload) => payload.rejectedReasons ?? []);
  const acceptedCount = words.length + grammar.length + comparisons.length;
  if (acceptedCount < requestedCount) {
    rejectedReasons.push(`已自动跳过重复或不合格内容；本次最终补足 ${acceptedCount}/${requestedCount} 项。`);
  }
  const contentIds = [
    ...words.map((item) => item.id),
    ...grammar.map((item) => item.id),
    ...comparisons.map((item) => item.id),
  ];
  const previewLabels = [
    ...words.map((item) => `${item.japanese.term} / ${item.english.term}`),
    ...grammar.map((item) => item.title),
    ...comparisons.map((item) => item.semantic),
  ];
  return {
    ...last,
    generation: {
      ...last.generation,
      createdAt: first.generation.createdAt,
      status: acceptedCount >= requestedCount ? "succeeded" : "partial",
      saveMode: "saved",
      validationStatus: payloads.some((payload) => payload.generation.validationStatus === "repaired") ? "repaired" : "passed",
      requestedCount,
      acceptedCount,
      rejectedCount: Math.max(rejectedReasons.length, requestedCount - acceptedCount),
      contentIds,
      previewLabels,
      parameters: { ...first.generation.parameters, count: requestedCount },
    },
    words: words.length > 0 ? words : undefined,
    grammar: grammar.length > 0 ? grammar : undefined,
    comparisons: comparisons.length > 0 ? comparisons : undefined,
    rejectedReasons,
  };
}

function operationPrompt(kind: AIGenerationKind): { name: string; version: string } {
  if (kind === "words") return wordGenerationPrompt;
  if (kind === "grammar") return grammarGenerationPrompt;
  if (kind === "quiz") return quizGenerationPrompt;
  return mistakeExplanationPrompt;
}

export function AIProvider({ children }: { children: ReactNode }) {
  const {
    snapshot,
    allWords,
    allGrammar,
    allComparisons,
    saveAIArtifacts,
    undoAIGeneration,
  } = useLearning();
  const repositoryRef = useRef<AISettingsRepository | null>(null);
  const clientRef = useRef(new AIAPIClient());
  const abortRef = useRef<AbortController | null>(null);
  const operationRef = useRef<BusyOperation>(null);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_AI_SETTINGS);
  const [health, setHealth] = useState<AIHealthResponse | null>(null);
  const [online, setOnline] = useState(true);
  const [busyOperation, setBusyOperation] = useState<BusyOperation>(null);
  const [error, setError] = useState<AIError | null>(null);
  const [transientResult, setTransientResult] = useState<AITransientResult | null>(null);
  const [lastSavedGenerationIds, setLastSavedGenerationIds] = useState<string[]>([]);
  const [secretRevision, setSecretRevision] = useState(0);

  useEffect(() => {
    const repository = new AISettingsRepository();
    repositoryRef.current = repository;
    const storedSettings = repository.get();
    const updateNetwork = () => setOnline(navigator.onLine);
    const initialTimer = window.setTimeout(() => {
      setSettings(storedSettings);
      updateNetwork();
    }, 0);
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    const controller = new AbortController();
    void clientRef.current.health(controller.signal).then(setHealth).catch(() => setHealth(null));
    return () => {
      controller.abort();
      window.clearTimeout(initialTimer);
      abortRef.current?.abort();
      window.removeEventListener("online", updateNetwork);
      window.removeEventListener("offline", updateNetwork);
    };
  }, []);

  const updateSettings = useCallback((patch: Partial<AISettings>) => {
    setSettings((current) => {
      const next = { ...current, ...patch };
      repositoryRef.current?.save(next);
      return next;
    });
  }, []);

  const setSecret = useCallback(
    (kind: "apiKey" | "proxyToken", value: string, persistence: AISecretPersistence) => {
      setAISecret(kind, value, persistence);
      setSecretRevision((current) => current + 1);
      updateSettings(kind === "apiKey" ? { apiKeyPersistence: persistence } : { proxyTokenPersistence: persistence });
    },
    [updateSettings],
  );

  const clearSecretValue = useCallback((kind: "apiKey" | "proxyToken") => {
    clearAISecret(kind);
    setSecretRevision((current) => current + 1);
  }, []);

  const clearAllSecretValues = useCallback(() => {
    clearAllAISecrets();
    setSecretRevision((current) => current + 1);
  }, []);

  const run = useCallback(
    async <T,>(operation: Exclude<BusyOperation, null>, kind: AIGenerationKind | null, task: (signal: AbortSignal) => Promise<T>): Promise<T | null> => {
      if (operationRef.current) return null;
      const today = dateKey(new Date());
      const usedToday = snapshot.aiUsage.filter((item) => dateKey(new Date(item.completedAt)) === today).length;
      if (kind && usedToday >= settings.dailyRequestSoftLimit) {
        const limitError = new AIError("DAILY_LIMIT_REACHED", { status: 429 });
        setError(limitError);
        return null;
      }
      const controller = new AbortController();
      abortRef.current = controller;
      operationRef.current = operation;
      setBusyOperation(operation);
      setError(null);
      const startedAt = new Date();
      try {
        return await task(controller.signal);
      } catch (caught) {
        const normalized = normalizeAIError(caught);
        setError(normalized);
        if (kind) {
          const prompt = operationPrompt(kind);
          const now = new Date().toISOString();
          const requestId = `client-${crypto.randomUUID()}`;
          const usageId = `ai-usage-${crypto.randomUUID()}`;
          const failed: AIGenerationRecord = {
            id: `ai-generation-${crypto.randomUUID()}`,
            requestId,
            kind,
            createdAt: now,
            completedAt: now,
            provider: "deepseek",
            model: settings.defaultQuality === "quality" ? health?.qualityModel ?? "deepseek-v4-pro" : health?.fastModel ?? "deepseek-v4-flash",
            promptName: prompt.name,
            promptVersion: prompt.version,
            status: normalized.code === "REQUEST_CANCELLED" ? "cancelled" : "failed",
            saveMode: "temporary",
            validationStatus: "rejected",
            requestedCount: 0,
            acceptedCount: 0,
            rejectedCount: 0,
            contentIds: [],
            previewLabels: [],
            errorCode: normalized.code,
            errorMessage: normalized.message,
            usageId,
          };
          const failedUsage: AIUsageRecord = {
            id: usageId,
            requestId,
            operation: kind,
            model: failed.model,
            promptName: prompt.name,
            promptVersion: prompt.version,
            startedAt: startedAt.toISOString(),
            completedAt: now,
            durationMs: Date.now() - startedAt.getTime(),
            success: false,
            retryCount: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            cacheHitTokens: 0,
            errorCode: normalized.code,
          };
          await saveAIArtifacts({ generations: [failed], usage: [failedUsage] });
        }
        return null;
      } finally {
        abortRef.current = null;
        operationRef.current = null;
        setBusyOperation(null);
      }
    },
    [health, saveAIArtifacts, settings.dailyRequestSoftLimit, settings.defaultQuality, snapshot.aiUsage],
  );

  const persistPayloadBatch = useCallback(
    async (payloads: AIGenerationPayload[], saveContent: boolean) => {
      const persisted = payloads.map((payload) => ({
        ...payload,
        generation: { ...payload.generation, saveMode: saveContent ? "saved" as const : "temporary" as const },
      }));
      await saveAIArtifacts({
        words: saveContent ? persisted.flatMap((payload) => payload.words ?? []) : undefined,
        grammar: saveContent ? persisted.flatMap((payload) => payload.grammar ?? []) : undefined,
        comparisons: saveContent ? persisted.flatMap((payload) => payload.comparisons ?? []) : undefined,
        generations: persisted.map((payload) => payload.generation),
        usage: persisted.map((payload) => payload.usage),
        explanations: persisted.flatMap((payload) => payload.explanation ? [payload.explanation] : []),
      });
      return persisted;
    },
    [saveAIArtifacts],
  );

  const persistPayload = useCallback(
    async (payload: AIGenerationPayload, saveContent: boolean) =>
      (await persistPayloadBatch([payload], saveContent))[0],
    [persistPayloadBatch],
  );

  const testConnection = useCallback(async () => {
    await run("connection", null, async (signal) => {
      await clientRef.current.testConnection(settings, signal);
      setHealth(await clientRef.current.health(signal));
    });
  }, [run, settings]);

  const generateWords = useCallback(
    async (input: Omit<WordGenerationInput, "existingWords">) => run("words", "words", async (signal) => {
      const existingWords = allWords.map((word) => ({
          japanese: word.japanese.term,
          reading: word.japanese.reading ?? "",
          english: word.english.term,
          meaningZh: word.meaningZh,
        }));
      const payloads: AIGenerationPayload[] = [];
      const addedWords = [] as NonNullable<AIGenerationPayload["words"]>;
      let attempts = 0;
      while (addedWords.length < input.count && attempts < 8) {
        const remaining = input.count - addedWords.length;
        const count: WordGenerationInput["count"] = attempts === 0
          ? input.count
          : remaining >= 5 ? 5 : 1;
        attempts += 1;
        try {
          const payload = await clientRef.current.generateWords({
            ...input,
            count,
            existingWords: [
              ...existingWords,
              ...addedWords.map((word) => ({
                japanese: word.japanese.term,
                reading: word.japanese.reading ?? "",
                english: word.english.term,
                meaningZh: word.meaningZh,
              })),
            ].slice(-500),
          }, settings, signal);
          const deduplicated = filterWordPayloadAgainstLibrary(payload, [...allWords, ...addedWords]);
          payloads.push(deduplicated);
          addedWords.push(...(deduplicated.words ?? []).slice(0, remaining));
        } catch (caught) {
          const normalized = normalizeAIError(caught);
          if (normalized.code !== "CONTENT_VALIDATION_FAILED" || signal.aborted) throw caught;
        }
      }
      if (payloads.length === 0 || addedWords.length === 0) {
        throw new AIError("CONTENT_VALIDATION_FAILED");
      }
      const persistedPayloads = await persistPayloadBatch(payloads, true);
      const combined = combineSavedPayloads(persistedPayloads, input.count);
      setLastSavedGenerationIds(persistedPayloads.map((payload) => payload.generation.id));
      setTransientResult({ kind: "words", payload: combined, saved: true });
      return combined;
    }),
    [allWords, persistPayloadBatch, run, settings],
  );

  const generateGrammar = useCallback(
    async (input: Omit<GrammarGenerationInput, "existingTitles">) => run("grammar", "grammar", async (signal) => {
      const existingTitles = [
        ...allGrammar.map((item) => item.title),
        ...allComparisons.map((item) => item.semantic),
      ];
      const payloads: AIGenerationPayload[] = [];
      const addedTitles: string[] = [];
      let attempts = 0;
      const maxAttempts = Math.max(6, Math.ceil(input.count / 3) * 3);
      while (addedTitles.length < input.count && attempts < maxAttempts) {
        const remaining = input.count - addedTitles.length;
        const count = Math.min(3, remaining);
        attempts += 1;
        try {
          const payload = await clientRef.current.generateGrammar({
            ...input,
            count,
            existingTitles: [...existingTitles, ...addedTitles].slice(-200),
          }, settings, signal);
          const deduplicated = filterGrammarPayloadAgainstLibrary(
            payload,
            [...allGrammar, ...payloads.flatMap((item) => item.grammar ?? [])],
            [...allComparisons, ...payloads.flatMap((item) => item.comparisons ?? [])],
          );
          payloads.push(deduplicated);
          addedTitles.push(
            ...(deduplicated.grammar ?? []).map((item) => item.title),
            ...(deduplicated.comparisons ?? []).map((item) => item.semantic),
          );
        } catch (caught) {
          const normalized = normalizeAIError(caught);
          if (normalized.code !== "CONTENT_VALIDATION_FAILED" || signal.aborted) throw caught;
        }
      }
      if (payloads.length === 0 || addedTitles.length === 0) {
        throw new AIError("CONTENT_VALIDATION_FAILED");
      }
      const persistedPayloads = await persistPayloadBatch(payloads, true);
      const combined = combineSavedPayloads(persistedPayloads, input.count);
      setLastSavedGenerationIds(persistedPayloads.map((payload) => payload.generation.id));
      setTransientResult({ kind: "grammar", payload: combined, saved: true });
      return combined;
    }),
    [allComparisons, allGrammar, persistPayloadBatch, run, settings],
  );

  const quizSources = useCallback((input: QuizRequestOptions) => {
    const now = Date.now();
    const today = dateKey(new Date());
    const recentStart = new Date();
    recentStart.setDate(recentStart.getDate() - 6);
    const recentKey = dateKey(recentStart);
    const specified = new Set(input.specifiedIds ?? []);
    const favoriteIds = new Set(snapshot.favorites.map((item) => item.split(":").slice(1).join(":")));
    const mistakeIds = new Set(snapshot.mistakes.filter((item) => item.active).map((item) => item.contentRef.sourceId));
    const include = (id: string, lastStudiedAt: string, due: boolean) => {
      if (input.sourceFilter === "specified") return specified.has(id);
      if (input.sourceFilter === "favorites") return favoriteIds.has(id);
      if (input.sourceFilter === "mistakes") return mistakeIds.has(id);
      if (input.sourceFilter === "today") return dateKey(new Date(lastStudiedAt)) === today;
      if (input.sourceFilter === "recent-7") {
        const key = dateKey(new Date(lastStudiedAt));
        return key >= recentKey && key <= today;
      }
      if (input.sourceFilter === "due") return due;
      return true;
    };
    const wordProgress = new Map(snapshot.wordProgress.map((item) => [item.wordId, item]));
    const grammarProgress = new Map(snapshot.grammarProgress.map((item) => [item.grammarId, item]));
    const words = allWords.flatMap((word) => {
      if (input.sourceFilter === "comparisons") return [];
      const progress = wordProgress.get(word.id);
      if (!progress) return [];
      const states = input.mode === "mixed"
        ? Object.values(progress.modes)
        : [getWordModeState(progress, input.mode)];
      const due = states.some((state) => state && isReviewDue(state, now));
      if (!include(word.id, progress.lastStudiedAt, due)) return [];
      return [{
        source: "word" as const,
        sourceId: word.id,
        language: input.mode,
        difficulty: input.mode === "english" ? word.english.difficulty : word.japanese.difficulty,
        title: `${word.japanese.term} / ${word.english.term}`,
        summary: `${word.meaningZh}；日语 ${word.japanese.term}；英语 ${word.english.term}。${word.note}`,
      }];
    });
    const grammar = allGrammar.flatMap((point) => {
      if (input.sourceFilter === "comparisons") return [];
      if (input.mode !== "mixed" && point.language !== input.mode) return [];
      const progress = grammarProgress.get(point.id);
      if (!progress || !include(point.id, progress.lastStudiedAt, isReviewDue(progress.review, now))) return [];
      return [{
        source: "grammar" as const,
        sourceId: point.id,
        language: point.language,
        difficulty: point.level,
        title: point.title,
        summary: `${point.explanation} 结构：${point.structure}`,
      }];
    });
    const comparisons = allComparisons.flatMap((item) =>
      input.sourceFilter === "comparisons" ||
      (input.sourceFilter === "favorites" && favoriteIds.has(item.id)) ||
      (input.sourceFilter === "mistakes" && mistakeIds.has(item.id)) ||
      (input.sourceFilter === "specified" && specified.has(item.id))
        ? [{ source: "comparison" as const, sourceId: item.id, language: "mixed" as const, difficulty: item.level, title: item.semantic, summary: `${item.japanese} 对比 ${item.english}：${item.difference}` }]
        : [],
    );
    return [...words, ...grammar, ...comparisons].slice(0, 100);
  }, [allComparisons, allGrammar, allWords, snapshot.favorites, snapshot.grammarProgress, snapshot.mistakes, snapshot.wordProgress]);

  const generateQuiz = useCallback(
    async (input: QuizRequestOptions) => run("quiz", "quiz", async (signal) => {
      const sources = quizSources(input);
      if (sources.length === 0) throw new AIError("INVALID_REQUEST", { status: 400 });
      const payload = await clientRef.current.generateQuiz({
        count: Math.min(30, Math.max(1, input.count)),
        mode: input.mode,
        sourceFilter: input.sourceFilter,
        quality: input.quality,
        sources,
      } satisfies QuizGenerationInput, settings, signal);
      const persisted = await persistPayload(payload, false);
      setTransientResult({ kind: "quiz", payload: persisted, saved: false });
      return persisted;
    }),
    [persistPayload, quizSources, run, settings],
  );

  const explainMistake = useCallback(
    async (input: ExplanationGenerationInput) => {
      const expectedCacheKey = contentHash({
        question: input.question,
        selectedIndex: input.selectedIndex,
        promptVersion: mistakeExplanationPrompt.version,
        model: health?.qualityModel ?? "deepseek-v4-pro",
        variant: input.variant,
      });
      const cached = !input.force
        ? snapshot.aiExplanations.find((item) => item.cacheKey === expectedCacheKey)
        : undefined;
      if (cached) {
        setTransientResult({ kind: "explanation", content: cached.content, record: cached });
        setError(null);
        return null;
      }
      return run("explanation", "explanation", async (signal) => {
        const payload = await clientRef.current.explainMistake(input, settings, signal);
        await persistPayload(payload, false);
        if (payload.explanation) {
          setTransientResult({ kind: "explanation", content: payload.explanation.content, record: payload.explanation });
        }
        return payload;
      });
    },
    [health?.qualityModel, persistPayload, run, settings, snapshot.aiExplanations],
  );

  const saveTransient = useCallback(async () => {
    if (!transientResult || transientResult.kind === "explanation") return;
    const payload = transientResult.payload;
    const persisted = await persistPayload(payload, true);
    setLastSavedGenerationIds([persisted.generation.id]);
    setTransientResult({ ...transientResult, payload: persisted, saved: true });
  }, [persistPayload, transientResult]);

  const saveQuizCollection = useCallback(async (title: string) => {
    if (!transientResult || transientResult.kind !== "quiz" || !transientResult.payload.questions) return null;
    const collection: AISavedCollection = {
      id: `ai-collection-${crypto.randomUUID()}`,
      title: title.trim() || `AI 练习集 ${new Date().toLocaleDateString("zh-CN")}`,
      generationId: transientResult.payload.generation.id,
      createdAt: new Date().toISOString(),
      questions: transientResult.payload.questions,
    };
    await saveAIArtifacts({ collections: [collection] });
    setTransientResult({ ...transientResult, saved: true, collection });
    return collection;
  }, [saveAIArtifacts, transientResult]);

  const undoLastSave = useCallback(async () => {
    if (lastSavedGenerationIds.length === 0) return;
    for (const generationId of [...lastSavedGenerationIds].reverse()) {
      await undoAIGeneration(generationId);
    }
    setLastSavedGenerationIds([]);
    setTransientResult((current) => current && current.kind !== "explanation" ? { ...current, saved: false } : current);
  }, [lastSavedGenerationIds, undoAIGeneration]);

  const usageSummary = useMemo<AIUsageSummary>(() => {
    const today = dateKey(new Date());
    const month = today.slice(0, 7);
    const todayRows = snapshot.aiUsage.filter((item) => dateKey(new Date(item.completedAt)) === today);
    const monthRows = snapshot.aiUsage.filter((item) => dateKey(new Date(item.completedAt)).startsWith(month));
    const successful = snapshot.aiUsage.filter((item) => item.success);
    const lastFailure = [...snapshot.aiGenerations].reverse().find((item) => item.status === "failed");
    return {
      todayRequests: todayRows.length,
      monthRequests: monthRows.length,
      todayTokens: todayRows.reduce((sum, item) => sum + item.totalTokens, 0),
      monthTokens: monthRows.reduce((sum, item) => sum + item.totalTokens, 0),
      successRate: snapshot.aiGenerations.length > 0
        ? Math.round((snapshot.aiGenerations.filter((item) => item.status === "succeeded" || item.status === "partial").length / snapshot.aiGenerations.length) * 100)
        : 0,
      averageDurationMs: successful.length > 0
        ? Math.round(successful.reduce((sum, item) => sum + item.durationMs, 0) / successful.length)
        : 0,
      lastError: lastFailure?.errorMessage,
    };
  }, [snapshot.aiGenerations, snapshot.aiUsage]);

  const value = useMemo<AIContextValue>(() => ({
    settings,
    secretRevision,
    health,
    online,
    busyOperation,
    error,
    transientResult,
    usageSummary,
    updateSettings,
    setSecret,
    clearSecret: clearSecretValue,
    getSecretStatus: (kind) => ({ configured: Boolean(getAISecret(kind)), masked: maskedSecret(kind) }),
    testConnection,
    generateWords,
    generateGrammar,
    generateQuiz,
    explainMistake,
    saveTransient,
    saveQuizCollection,
    undoLastSave,
    cancel: () => abortRef.current?.abort(),
    resetAISettings: () => {
      const next = repositoryRef.current?.reset() ?? DEFAULT_AI_SETTINGS;
      setSettings(next);
    },
    clearAllSecrets: clearAllSecretValues,
  }), [
    settings, health, online, busyOperation, error, transientResult, usageSummary,
    updateSettings, setSecret, clearSecretValue, clearAllSecretValues, secretRevision, testConnection, generateWords, generateGrammar,
    generateQuiz, explainMistake, saveTransient, saveQuizCollection, undoLastSave,
  ]);

  return <AIContext.Provider value={value}>{children}</AIContext.Provider>;
}

export function useAI(): AIContextValue {
  const context = useContext(AIContext);
  if (!context) throw new Error("useAI must be used within AIProvider");
  return context;
}

export { clearAISecret };
