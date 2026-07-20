import { DEFAULT_SETTINGS } from "../constants";
import type { AppSettings } from "../models";

export const SETTINGS_STORAGE_KEY = "lingua-step:settings";

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

  return {
    theme,
    displayDensity,
    revealMode,
    dailyNewWords: positiveInteger(
      value.dailyNewWords,
      fallback.dailyNewWords,
    ),
    studyRoundSize: positiveInteger(
      value.studyRoundSize,
      fallback.studyRoundSize,
    ),
    grammarExerciseCount: positiveInteger(
      value.grammarExerciseCount,
      fallback.grammarExerciseCount,
    ),
    animations:
      typeof value.animations === "boolean"
        ? value.animations
        : fallback.animations,
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
      this.memorySettings = normalizeSettings(parsed);
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
        storage.setItem(this.storageKey, JSON.stringify(this.memorySettings));
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
