import { runJsonPrompt } from "./cursor";
import { chunkTranscript, formatTranscriptWithTimestamps, shouldChunk } from "./chunking";
import type {
  ActionItem,
  ChapterItem,
  Flashcard,
  MindMapNode,
  QuizQuestion,
  QuoteItem,
  SummarySection,
  TranscriptSegment,
  VideoMeta,
} from "./types";

interface SectionInput {
  meta: VideoMeta;
  transcript: TranscriptSegment[];
  outputLanguage: string;
}

function header(meta: VideoMeta, outputLanguage: string): string {
  return [
    `Video title: ${meta.title}`,
    `Channel: ${meta.author}`,
    `Output language: ${outputLanguage}`,
  ].join("\n");
}

function bodyText(segments: TranscriptSegment[]): string {
  return formatTranscriptWithTimestamps(segments);
}

const ROLE = "You are an expert note-taker, study coach, and editor. You turn long video transcripts into clear, accurate, and useful study artifacts. Be faithful to the source — never invent facts not present in the transcript.";

/* ---------------------------------------------------------------- SUMMARY */

export async function generateSummary(input: SectionInput): Promise<SummarySection> {
  if (!shouldChunk(input.transcript)) {
    return runJsonPrompt<SummarySection>({
      system: ROLE,
      schemaHint: "{ tldr: string; detailed: string; bullets: string[] }",
      user: [
        header(input.meta, input.outputLanguage),
        "",
        "Task: Produce a summary of this transcript with three parts.",
        "Schema:",
        "{",
        '  "tldr": "2-3 sentence elevator summary",',
        '  "detailed": "structured markdown summary (see formatting rules below)",',
        '  "bullets": ["key point 1", "key point 2", ...]  // 5-8 punchy bullets',
        "}",
        "",
        "FORMATTING RULES for `detailed` (CRITICAL):",
        "- Use 3-5 short markdown subheadings (level 3, e.g. `### What it is`, `### How it works`, `### Why it matters`).",
        "- Under EACH subheading, write 2-3 short sentences (one paragraph, max ~60 words).",
        "- Separate paragraphs with a blank line. Never produce a single wall of text.",
        "- Avoid bullets in this field (bullets go in the separate `bullets` field).",
        "- Keep tone clear, factual, and skimmable.",
        "",
        "TRANSCRIPT:",
        bodyText(input.transcript),
      ].join("\n"),
    });
  }

  // Map-reduce
  const chunks = chunkTranscript(input.transcript);
  const partials = await Promise.all(
    chunks.map((c) =>
      runJsonPrompt<{ partial: string; bullets: string[] }>({
        system: ROLE,
        schemaHint: '{ partial: string; bullets: string[] }',
        user: [
          header(input.meta, input.outputLanguage),
          `Chunk ${c.index + 1} of ${chunks.length}.`,
          "Summarize this CHUNK only. 4-6 sentences + 3-5 bullets of key facts.",
          'Schema: { "partial": "...", "bullets": ["..."] }',
          "",
          "TRANSCRIPT CHUNK:",
          c.text,
        ].join("\n"),
      }),
    ),
  );

  return runJsonPrompt<SummarySection>({
    system: ROLE,
    schemaHint: "{ tldr; detailed; bullets[] }",
    user: [
      header(input.meta, input.outputLanguage),
      "Below are partial summaries from successive chunks of one video. Merge them into a single coherent summary.",
      "Schema: { tldr: string, detailed: string (markdown), bullets: string[] (5-8 items) }",
      "",
      "FORMATTING RULES for `detailed` (CRITICAL):",
      "- Use 3-5 short markdown subheadings (level 3, e.g. `### What it is`, `### How it works`, `### Why it matters`).",
      "- Under EACH subheading, write 2-3 short sentences (one paragraph, max ~60 words).",
      "- Separate paragraphs with a blank line. Never produce a single wall of text.",
      "- No bullets in this field.",
      "",
      "PARTIALS:",
      partials.map((p, i) => `--- Chunk ${i + 1} ---\n${p.partial}\nBullets:\n- ${p.bullets.join("\n- ")}`).join("\n\n"),
    ].join("\n"),
  });
}

/* --------------------------------------------------------------- CHAPTERS */

export async function generateChapters(input: SectionInput): Promise<ChapterItem[]> {
  const result = await runJsonPrompt<{ chapters: ChapterItem[] }>({
    system: ROLE,
    schemaHint: '{ chapters: [{ start: number (seconds), end: number, title: string, bullets: string[] }] }',
    user: [
      header(input.meta, input.outputLanguage),
      "Task: Split the video into 4-10 coherent chapters based on topic shifts.",
      "Use the [MM:SS] timestamps in the transcript to set accurate start/end seconds (convert MM:SS -> total seconds).",
      "Each chapter: a 3-7 word title + 2-4 concise bullets of what is covered.",
      "Chapters MUST be in chronological order, non-overlapping, and cover the whole video.",
      'Schema: { "chapters": [{ "start": number, "end": number, "title": string, "bullets": string[] }] }',
      "",
      "TRANSCRIPT:",
      bodyText(input.transcript),
    ].join("\n"),
  });
  return result.chapters ?? [];
}

/* ------------------------------------------------------------- FLASHCARDS */

export async function generateFlashcards(input: SectionInput): Promise<Flashcard[]> {
  const result = await runJsonPrompt<{ flashcards: Flashcard[] }>({
    system: ROLE,
    schemaHint: '{ flashcards: [{ q: string; a: string; difficulty: "easy"|"medium"|"hard" }] }',
    user: [
      header(input.meta, input.outputLanguage),
      "Task: Generate 8-15 high-quality study flashcards covering the most important concepts from the video.",
      "",
      "QUESTION QUALITY RULES (CRITICAL — bad grammar fails the task):",
      "- Each question must be a grammatically complete, well-formed standalone sentence ending in a question mark.",
      "- Frame questions about CONCEPTS, not about the video itself. Do NOT write questions like 'What is X as one of the seven sins?' — instead write 'Why is gossip considered harmful when speaking?'",
      "- Never use 'the video', 'the speaker', or 'this talk' inside a question — the question should make sense to a reader who has never seen the video.",
      "- Questions should test understanding (what, why, how), not trivia about the video's structure (e.g. avoid 'How many sins did the speaker list?').",
      "- One distinct concept per card. No compound questions joined by 'and'.",
      "",
      "ANSWER QUALITY RULES:",
      "- 1-3 complete sentences in natural prose.",
      "- Self-contained — don't reference 'as mentioned above'.",
      "- Accurate to the transcript; do not invent facts.",
      "",
      "DIFFICULTY:",
      "- 'easy' = recall of a clear fact or definition.",
      "- 'medium' = explanation of how/why something works.",
      "- 'hard' = synthesis, comparison, or application.",
      "",
      'Schema: { "flashcards": [{ "q": string, "a": string, "difficulty": "easy"|"medium"|"hard" }] }',
      "",
      "TRANSCRIPT:",
      bodyText(input.transcript),
    ].join("\n"),
  });
  return result.flashcards ?? [];
}

/* ------------------------------------------------------------- ACTION ITEMS */

export async function generateActions(input: SectionInput): Promise<ActionItem[]> {
  const result = await runJsonPrompt<{ actions: ActionItem[] }>({
    system: ROLE,
    schemaHint: '{ actions: [{ text: string; priority: "high"|"medium"|"low"; category?: string }] }',
    user: [
      header(input.meta, input.outputLanguage),
      "Task: Extract actionable next steps a viewer could take after watching.",
      "If the video is purely informational, infer reasonable actions (e.g., 'Research X', 'Try Y in your project').",
      "Return 4-10 items, ordered by priority (high first).",
      'Schema: { "actions": [{ "text": string, "priority": "high"|"medium"|"low", "category": string }] }',
      "",
      "TRANSCRIPT:",
      bodyText(input.transcript),
    ].join("\n"),
  });
  return result.actions ?? [];
}

/* ---------------------------------------------------------------- QUIZ */

export async function generateQuiz(input: SectionInput): Promise<QuizQuestion[]> {
  const result = await runJsonPrompt<{ quiz: QuizQuestion[] }>({
    system: ROLE,
    schemaHint: '{ quiz: [{ question, options[4], correctIndex, explanation }] }',
    user: [
      header(input.meta, input.outputLanguage),
      "Task: Create a 6-question multiple-choice quiz testing comprehension.",
      "Rules:",
      "- Exactly 4 options per question.",
      "- correctIndex is 0-based.",
      "- Distractors should be plausible but clearly wrong.",
      "- Each explanation: 1-2 sentences citing the relevant transcript fact.",
      'Schema: { "quiz": [{ "question": string, "options": [string,string,string,string], "correctIndex": 0|1|2|3, "explanation": string }] }',
      "",
      "TRANSCRIPT:",
      bodyText(input.transcript),
    ].join("\n"),
  });
  return result.quiz ?? [];
}

/* --------------------------------------------------------------- MIND MAP */

export async function generateMindMap(input: SectionInput): Promise<MindMapNode> {
  const result = await runJsonPrompt<{ mindmap: MindMapNode }>({
    system: ROLE,
    schemaHint: '{ mindmap: { label: string; children: [...] } } recursive',
    user: [
      header(input.meta, input.outputLanguage),
      "Task: Build a hierarchical mind map of the video's main ideas.",
      "",
      "STRUCTURE (strict):",
      "- Exactly 3 levels: root → 4-6 main branches → 2-4 leaves under each branch.",
      "- Root label = a short, descriptive topic (2-5 words).",
      "- Branch labels = key themes (2-5 words each).",
      "- Leaf labels = specific concepts/facts (2-7 words each).",
      "- Do NOT nest beyond 3 levels. Do NOT exceed 6 branches.",
      "",
      "QUALITY:",
      "- Labels are noun phrases, not sentences. No trailing periods.",
      "- Be specific, not generic (write 'Six vocal warm-ups' not 'Tips').",
      "- Output ONLY the JSON object — keep it under 2KB.",
      "",
      'Schema: { "mindmap": { "label": string, "children": [ { "label": string, "children": [ { "label": string } ] } ] } }',
      "",
      "TRANSCRIPT:",
      bodyText(input.transcript),
    ].join("\n"),
  });
  return result.mindmap ?? { label: input.meta.title, children: [] };
}

/* ----------------------------------------------------------------- QUOTES */

export async function generateQuotes(input: SectionInput): Promise<QuoteItem[]> {
  const needsTranslation =
    input.outputLanguage.toLowerCase() !== "english" &&
    input.outputLanguage.toLowerCase() !== "en";

  const result = await runJsonPrompt<{ quotes: QuoteItem[] }>({
    system: ROLE,
    schemaHint: '{ quotes: [{ text, start (sec), speaker?, context?, translation? }] }',
    user: [
      header(input.meta, input.outputLanguage),
      "Task: Extract 4-8 notable verbatim quotes. Quotes should be insightful, memorable, or surprising.",
      "Use the [MM:SS] timestamps to set start seconds accurately (convert to total seconds).",
      "Keep each quote to 1-2 sentences.",
      `'context' (1 sentence) must be written in ${input.outputLanguage}, describing what prompted the quote.`,
      ...(needsTranslation
        ? [
            `'translation': since the output language is ${input.outputLanguage}, provide a natural translation of the verbatim quote text in ${input.outputLanguage}. The original 'text' field must remain verbatim from the transcript.`,
          ]
        : []),
      needsTranslation
        ? 'Schema: { "quotes": [{ "text": string (verbatim), "translation": string (in output language), "start": number, "speaker": string, "context": string (in output language) }] }'
        : 'Schema: { "quotes": [{ "text": string, "start": number, "speaker": string, "context": string }] }',
      "",
      "TRANSCRIPT:",
      bodyText(input.transcript),
    ].join("\n"),
  });
  return result.quotes ?? [];
}

/* ----------------------------------------------------------------- CHAT */

export function buildChatSystemPrompt(
  meta: VideoMeta,
  segments: TranscriptSegment[],
  outputLanguage = "English",
): string {
  return [
    "You are a knowledgeable assistant answering questions about a specific YouTube video.",
    "ONLY use information present in the transcript below to answer. If the answer is not in the transcript, say so plainly.",
    "When relevant, cite timestamps in [MM:SS] format from the transcript.",
    "Keep answers concise (1-4 short paragraphs) unless asked for detail.",
    `IMPORTANT: Always respond in ${outputLanguage}, regardless of the language the user writes in.`,
    "",
    `Video: "${meta.title}" by ${meta.author}`,
    "",
    "TRANSCRIPT:",
    formatTranscriptWithTimestamps(segments),
  ].join("\n");
}
