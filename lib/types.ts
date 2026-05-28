export interface VideoMeta {
  videoId: string;
  title: string;
  author: string;
  authorUrl?: string;
  thumbnailUrl: string;
  durationSec?: number;
  url: string;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResult {
  segments: TranscriptSegment[];
  language: string;
  fullText: string;
  totalDurationSec: number;
}

export interface SummarySection {
  tldr: string;
  detailed: string;
  bullets: string[];
}

export interface ChapterItem {
  start: number;
  end: number;
  title: string;
  bullets: string[];
}

export interface Flashcard {
  q: string;
  a: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface ActionItem {
  text: string;
  priority: "high" | "medium" | "low";
  category?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface MindMapNode {
  label: string;
  children?: MindMapNode[];
}

export interface QuoteItem {
  text: string;
  start: number;
  speaker?: string;
  context?: string;
  /** Translation of `text` into the output language, when different from the video language. */
  translation?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export type SectionId =
  | "summary"
  | "chapters"
  | "flashcards"
  | "actions"
  | "quiz"
  | "mindmap"
  | "quotes";

export interface NotesPayload {
  meta: VideoMeta;
  language: string;
  outputLanguage: string;
  createdAt: number;
  transcript: TranscriptSegment[];
  summary?: SummarySection;
  chapters?: ChapterItem[];
  flashcards?: Flashcard[];
  actions?: ActionItem[];
  quiz?: QuizQuestion[];
  mindmap?: MindMapNode;
  quotes?: QuoteItem[];
  chatMessages?: ChatMessage[];
}

export interface SectionEvent {
  type: "section" | "status" | "error" | "done";
  id?: SectionId;
  data?: unknown;
  message?: string;
  progress?: number;
}
