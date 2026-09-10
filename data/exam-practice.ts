import type { JapaneseExamLevel, ExamSection } from "./exam-questions";
import compactRows from "./exam-practice.generated.json";

/**
 * JLPT-style practice items imported from the public exercise bank at
 * japanesetest4you.com (grammar and vocabulary drills, each with its own
 * answer key). They are practice material rather than official past papers,
 * and the UI labels them accordingly.
 */
export interface ExternalQuestion {
  level: JapaneseExamLevel;
  section: ExamSection;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
}

type Row = [string, string, string, string, string, string, string, number];

export const EXTERNAL_QUESTIONS: ExternalQuestion[] = (compactRows as Row[]).map((row) => ({
  level: row[0] as JapaneseExamLevel,
  section: row[1] as ExamSection,
  prompt: row[2],
  options: [row[3], row[4], row[5], row[6]],
  correctIndex: row[7],
}));
