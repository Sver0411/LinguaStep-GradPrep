import type { EnglishExamLevel, ExamSection } from "./exam-questions";
import compactRows from "./exam-practice-en.generated.json";

/** Middle-school exercises are foundation practice, never CET exam questions. */
export interface ExternalEnglishQuestion {
  level: EnglishExamLevel;
  section: ExamSection;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

type Row = [string, string, string, string, string, string, string, number, string];

export const EXTERNAL_ENGLISH_QUESTIONS: ExternalEnglishQuestion[] = (compactRows as Row[]).map((row) => ({
  level: row[0] as EnglishExamLevel,
  section: row[1] as ExamSection,
  prompt: row[2],
  options: [row[3], row[4], row[5], row[6]],
  correctIndex: row[7],
  explanation: row[8],
}));
