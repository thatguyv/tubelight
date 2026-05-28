import {
  generateActions,
  generateChapters,
  generateFlashcards,
  generateMindMap,
  generateQuiz,
  generateQuotes,
  generateSummary,
} from "@/lib/prompts";
import type { SectionEvent, SectionId, TranscriptSegment, VideoMeta } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const ALL_SECTIONS: SectionId[] = [
  "summary",
  "chapters",
  "flashcards",
  "actions",
  "quiz",
  "mindmap",
  "quotes",
];

// Schedule heavier / slower sections FIRST so they don't sit waiting
// for short ones to free up a worker slot near the function's time budget.
const SCHEDULE_ORDER: SectionId[] = [
  "mindmap",   // heaviest with thinking:high
  "summary",
  "quiz",
  "chapters",
  "flashcards",
  "actions",
  "quotes",
];

const SECTION_TIMEOUT_MS = 50_000; // hard cap per section so one slow call can't kill the stream

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(
      () => reject(new Error(`${label} timed out after ${Math.round(ms / 1000)}s`)),
      ms,
    );
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

interface GenerateBody {
  meta: VideoMeta;
  transcript: TranscriptSegment[];
  sections?: SectionId[];
  outputLanguage?: string;
}

export async function POST(req: Request) {
  let body: GenerateBody;
  try {
    body = (await req.json()) as GenerateBody;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  if (!body?.meta?.videoId || !Array.isArray(body.transcript) || body.transcript.length === 0) {
    return new Response(
      JSON.stringify({ error: "Missing meta or transcript in request body" }),
      { status: 400, headers: { "content-type": "application/json" } },
    );
  }

  const requested = (body.sections && body.sections.length > 0 ? body.sections : ALL_SECTIONS).filter((s) =>
    ALL_SECTIONS.includes(s),
  );
  // Reorder requested sections into our optimal schedule order
  const sections = SCHEDULE_ORDER.filter((s) => requested.includes(s));
  const outputLanguage = body.outputLanguage || "English";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (ev: SectionEvent) => {
        controller.enqueue(encoder.encode(JSON.stringify(ev) + "\n"));
      };

      const input = { meta: body.meta, transcript: body.transcript, outputLanguage };

      send({ type: "status", message: `Generating ${sections.length} sections...`, progress: 0 });

      const tasks: Array<{ id: SectionId; run: () => Promise<unknown> }> = sections.map((id) => ({
        id,
        run: () => withTimeout(runSection(id, input), SECTION_TIMEOUT_MS, id),
      }));

      const CONCURRENCY = 3;
      let done = 0;
      let cursor = 0;
      const worker = async () => {
        while (cursor < tasks.length) {
          const i = cursor++;
          const t = tasks[i];
          try {
            const data = await t.run();
            done += 1;
            send({
              type: "section",
              id: t.id,
              data,
              progress: Math.round((done / tasks.length) * 100),
            });
          } catch (err) {
            done += 1;
            const message = err instanceof Error ? err.message : "Unknown error";
            send({
              type: "error",
              id: t.id,
              message,
              progress: Math.round((done / tasks.length) * 100),
            });
          }
        }
      };

      await Promise.all(
        Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, worker),
      );
      send({ type: "done", progress: 100 });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}

async function runSection(
  id: SectionId,
  input: { meta: VideoMeta; transcript: TranscriptSegment[]; outputLanguage: string },
): Promise<unknown> {
  switch (id) {
    case "summary":
      return generateSummary(input);
    case "chapters":
      return generateChapters(input);
    case "flashcards":
      return generateFlashcards(input);
    case "actions":
      return generateActions(input);
    case "quiz":
      return generateQuiz(input);
    case "mindmap":
      return generateMindMap(input);
    case "quotes":
      return generateQuotes(input);
  }
}
