import { buildChatSystemPrompt } from "@/lib/prompts";
import { streamText } from "@/lib/cursor";
import type { TranscriptSegment, VideoMeta } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface ChatBody {
  meta: VideoMeta;
  transcript: TranscriptSegment[];
  messages: { role: "user" | "assistant"; content: string }[];
  outputLanguage?: string;
}

export async function POST(req: Request) {
  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body?.meta || !Array.isArray(body.transcript) || !Array.isArray(body.messages)) {
    return new Response("Missing meta / transcript / messages", { status: 400 });
  }

  const systemPrompt = buildChatSystemPrompt(
    body.meta,
    body.transcript,
    body.outputLanguage ?? "English",
  );

  const convo = body.messages
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const fullPrompt = [
    systemPrompt,
    "",
    "Conversation so far:",
    convo,
    "",
    "Assistant:",
  ].join("\n");

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of streamText(fullPrompt)) {
          controller.enqueue(encoder.encode(chunk));
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Chat failed";
        controller.enqueue(encoder.encode(`\n\n[Error] ${message}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
