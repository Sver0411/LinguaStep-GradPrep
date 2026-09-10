import type { EnglishExamLevel, ExamSection } from "./exam-questions";
import compactRows from "./exam-practice-en.generated.json";

/**
 * English multiple-choice items from the public "Chinese middle school English
 * exam questions" dataset (dry-melon, Hugging Face, CC BY 4.0). Each item
 * carries four options, the correct answer and often an explanation. Grade 7-8
 * items map to CET-4 and grade 9 items to CET-6, which matches their relative
 * difficulty; there is no TOEIC material in this source.
 */
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
