/**
 * Learning data layer.
 *
 * Layered so each file has one reason to change:
 *   types.ts            the shape of everything this module exposes
 *   snapshot-utils.ts   pure functions (merge / trim / plan generation)
 *   use-snapshot-store.ts  persistence: open, lock, patch, broadcast, backup
 *   actions/*           one hook per group of user actions
 *   context.ts          the React context and its consumer hook
 *   LearningProvider.tsx   composition only
 */
export { LearningProvider } from "./LearningProvider";
export { useLearning, mistakeCategory } from "./context";
export type {
  AIClearScope,
  BackupImportResult,
  BackupPayload,
  LearningContextValue,
  ResetScope,
} from "./types";
export type { AIArtifactBatch } from "@/lib/ai/client/artifact-library";
