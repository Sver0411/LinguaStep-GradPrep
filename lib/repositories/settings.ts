import { DEFAULT_SETTINGS } from "../constants";
import type { AppSettings } from "../models";

export const SETTINGS_STORAGE_KEY = "lingua-step:settings";
const SETTINGS_SCHEMA_VERSION = 4;

export interface SettingsRepository {
  get(): AppSettings;
  save(settings: AppSettings): AppSettings;
  update(patch: Partial<AppSettings>): AppSettings;
  reset(): AppSettings;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function positiveInteger(value: unknown, fallback: number): number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0
    ? value
    : fallback;
}

function normalizeSettings(
  value: unknown,
  fallback: AppSettings = DEFAULT_SETTINGS,
): AppSettings {
  if (!isRecord(value)) {
    return { ...fallback };
  }

  const theme =
    value.theme === "light" ||
    value.theme === "dark" ||
    value.theme === "system"
      ? value.theme
      : fallback.theme;
  const displayDensity =
    value.displayDensity === "compact" || value.displayDensity === "full"
      ? value.displayDensity
      : fallback.displayDensity;
  const revealMode =
    value.revealMode === "together" || value.revealMode === "step-by-step"
      ? value.revealMode
      : fallback.revealMode;
  const revealOrder =
    value.revealOrder === "japanese-first" ||
    value.revealOrder === "english-first" ||
    value.revealOrder === "random"
      ? value.revealOrder
      : fallback.revealOrder;
  const defaultStudyMode =
    value.defaultStudyMode === "combined" ||
    value.defaultStudyMode === "japanese" ||
    value.defaultStudyMode === "english"
      ? value.defaultStudyMode
      : fallback.defaultStudyMode;
  const weekendAdjustment =
    value.weekendAdjustment === "same" ||
    value.weekendAdjustment === "lighter" ||
    value.weekendAdjustment === "heavier"
      ? value.weekendAdjustment
      : fallback.weekendAdjustment;
  const fontSize =
    value.fontSize === "standard" || value.fontSize === "large"
      ? value.fontSize
      : fallback.fontSize;

  return {
    theme,
    focusModeEnabled:
      typeof value.focusModeEnabled === "boolean"
        ? value.focusModeEnabled
        : fallback.focusModeEnabled,
    displayDensity,
    revealMode,
    revealOrder,
    defaultStudyMode,
    dailyNewWords: positiveInteger(
      value.dailyNewWords,
      fallback.dailyNewWords,
    ),
    dailyReviewLimit: positiveInteger(
      value.dailyReviewLimit,
      fallback.dailyReviewLimit,
    ),
    dailyGrammarCount: positiveInteger(
      value.dailyGrammarCount,
      fallback.dailyGrammarCount,
    ),
    dailyTestQuestions: positiveInteger(
      value.dailyTestQuestions,
      fallback.dailyTestQuestions,
    ),
    studyRoundSize: positiveInteger(
      value.studyRoundSize,
      fallback.studyRoundSize,
    ),
    grammarExerciseCount: positiveInteger(
      value.grammarExerciseCount,
      fallback.grammarExerciseCount,
    ),
    prioritizeMistakes:
      typeof value.prioritizeMistakes === "boolean"
        ? value.prioritizeMistakes
        : fallback.prioritizeMistakes,
    autoFillPlan:
      typeof value.autoFillPlan === "boolean"
        ? value.autoFillPlan
        : fallback.autoFillPlan,
    weekendAdjustment,
    masteryStreak: positiveInteger(value.masteryStreak, fallback.masteryStreak),
    immediateTestFeedback:
      typeof value.immediateTestFeedback === "boolean"
        ? value.immediateTestFeedback
        : fallback.immediateTestFeedback,
    animations:
      typeof value.animations === "boolean"
        ? value.animations
        : fallback.animations,
    reduceMotion:
      typeof value.reduceMotion === "boolean"
        ? value.reduceMotion
        : fallback.reduceMotion,
    fontSize,
  };
}

/**
 * Synchronous settings repository backed by localStorage when available.
 * It retains an in-memory value for SSR and restrictive browser contexts.
 */
export class LocalStorageSettingsRepository implements SettingsRepository {
  private memorySettings: AppSettings = { ...DEFAULT_SETTINGS };

  constructor(
    private readonly storageKey: string = SETTINGS_STORAGE_KEY,
    private readonly storageOverride?: Storage | null,
  ) {}

  get(): AppSettings {
    const storage = this.resolveStorage();
    if (!storage) return { ...this.memorySettings };

    try {
      const serialized = storage.getItem(this.storageKey);
      if (serialized === null) return { ...this.memorySettings };

      const parsed: unknown = JSON.parse(serialized);
      const storedVersion = isRecord(parsed) && typeof parsed._settingsVersion === "number"
        ? parsed._settingsVersion
        : 0;
      const isLegacy = storedVersion < SETTINGS_SCHEMA_VERSION;
      const migrationInput = isRecord(parsed)
        ? {
            ...parsed,
            ...(storedVersion < 2 ? { revealMode: DEFAULT_SETTINGS.revealMode } : {}),
            ...(storedVersion < 3 ? { focusModeEnabled: DEFAULT_SETTINGS.focusModeEnabled } : {}),
            ...(storedVersion < 4 ? { immediateTestFeedback: DEFAULT_SETTINGS.immediateTestFeedback } : {}),
          }
        : parsed;
      this.memorySettings = normalizeSettings(migrationInput);
      if (isLegacy) {
        storage.setItem(
          this.storageKey,
          JSON.stringify({ ...this.memorySettings, _settingsVersion: SETTINGS_SCHEMA_VERSION }),
        );
      }
    } catch {
      this.memorySettings = { ...DEFAULT_SETTINGS };
    }

    return { ...this.memorySettings };
  }

  save(settings: AppSettings): AppSettings {
    this.memorySettings = normalizeSettings(settings);
    const storage = this.resolveStorage();

    if (storage) {
      try {
        storage.setItem(
          this.storageKey,
          JSON.stringify({ ...this.memorySettings, _settingsVersion: SETTINGS_SCHEMA_VERSION }),
        );
      } catch {
        // Memory state remains usable if storage is full or access is denied.
      }
    }

    return { ...this.memorySettings };
  }

  update(patch: Partial<AppSettings>): AppSettings {
    return this.save({ ...this.get(), ...patch });
  }

  reset(): AppSettings {
    this.memorySettings = { ...DEFAULT_SETTINGS };
    const storage = this.resolveStorage();

    if (storage) {
      try {
        storage.removeItem(this.storageKey);
      } catch {
        // The default in-memory settings are still returned.
      }
    }

    return { ...this.memorySettings };
  }

  private resolveStorage(): Storage | null {
    if (this.storageOverride !== undefined) {
      return this.storageOverride;
    }

    try {
      return typeof localStorage === "undefined" ? null : localStorage;
    } catch {
      return null;
    }
  }
}
