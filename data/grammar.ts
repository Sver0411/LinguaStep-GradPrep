import source from "./grammar-bluebook.generated.json";
import legacyEnglish from "./grammar-english.legacy.json";
import type { GrammarPoint, GrammarExample } from "@/lib/models";

const bookGrammar: GrammarPoint[] = source.map((lesson) => ({
  id:lesson.id, title:lesson.title, summary:lesson.explanations[0] ?? "", language:"japanese",
  level:`JLPT ${lesson.level}`, explanation:lesson.explanations.join("\n"), structure:lesson.title,
  connection:lesson.connections.join("\n"), nuance:lesson.notes.join("\n"), scenarios:[], examples:lesson.examples as GrammarExample[],
  comparison:{japanese:"",english:"",translationZh:""},commonErrors:lesson.notes,confusables:[],
  book:{sourceNote:lesson.sourceNote,sourceLink:lesson.sourceLink,order:lesson.order,connections:lesson.connections,explanations:lesson.explanations,notes:lesson.notes,images:lesson.images},
  exercises:lesson.recalls.map((recall) => ({
    id:`${lesson.id}-recall-${recall.sourceIndex}`,source:"grammar" as const,sourceId:lesson.id,
    prompt:recall.prompt,acceptedAnswers:[recall.answer],
    // These are internal result slots used by typed-answer history. They are
    // never presented as multiple-choice distractors or textbook questions.
    options:[recall.answer,"与原句不同","未作答","查看原句"],correctIndex:0,
    explanation:`${recall.sentence}\n${recall.translationZh}`,language:"japanese" as const,category:"textbook-recall",
  })),source:"curated",
}));
// Keep existing English lessons, rather than manufacture English textbook data.
export const GRAMMAR_POINTS: GrammarPoint[] = [...bookGrammar,...legacyEnglish as GrammarPoint[]];
