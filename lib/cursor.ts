import { Agent } from "@cursor/sdk";
import os from "node:os";
import fs from "node:fs";
import path from "node:path";

const MODEL_ID = process.env.CURSOR_MODEL || "composer-2.5";

/**
 * On Vercel (and other cloud Lambdas) the home directory exists but
 * ~/.cursor/projects/ does not, so the SDK's mkdir call fails with ENOENT.
 * Redirecting HOME to /tmp (the only writable directory) lets the SDK
 * create its store under /tmp/.cursor/... without any issues.
 */
function ensureWritableHome() {
  const home = os.homedir();
  const cursorDir = path.join(home, ".cursor", "projects");
  try {
    fs.mkdirSync(cursorDir, { recursive: true });
  } catch {
    // Home dir not writable — redirect to /tmp
    process.env.HOME = "/tmp";
    fs.mkdirSync(path.join("/tmp", ".cursor", "projects"), { recursive: true });
  }
}

export interface RunOptions {
  /** Free-form system instructions (sets the role). */
  system: string;
  /** The user prompt body. */
  user: string;
  /** Optional fence label for the JSON, used in repair retries. */
  schemaHint?: string;
}

function requireKey(): string {
  const key = process.env.CURSOR_API_KEY;
  if (!key) {
    throw new Error(
      "CURSOR_API_KEY is not set. Get a key from https://cursor.com/dashboard/integrations and add it to .env.local",
    );
  }
  return key;
}

async function runPrompt(message: string): Promise<string> {
  ensureWritableHome();
  const apiKey = requireKey();
  const result = await Agent.prompt(message, {
    apiKey,
    model: { id: MODEL_ID },
    local: { cwd: os.tmpdir() },
  });
  return result.result ?? "";
}

/**
 * Run a prompt and parse a JSON object from the response.
 * If the first parse fails, makes a single "fix this JSON" retry.
 */
export async function runJsonPrompt<T>(opts: RunOptions): Promise<T> {
  const fullPrompt = [
    opts.system,
    "",
    opts.user,
    "",
    "Respond with ONLY valid minified JSON matching the schema described above.",
    "Do NOT wrap it in markdown code fences. Do NOT add any prose before or after.",
  ].join("\n");

  const raw = await runPrompt(fullPrompt);
  const first = tryParse<T>(raw);
  if (first.ok) return first.value;

  const repaired = await runPrompt(
    [
      "The following text was supposed to be valid JSON" +
        (opts.schemaHint ? ` matching ${opts.schemaHint}` : "") +
        " but it isn't. Return ONLY the corrected JSON, with no prose or fences:",
      "",
      raw,
    ].join("\n"),
  );
  const second = tryParse<T>(repaired);
  if (second.ok) return second.value;

  throw new Error(
    `Model did not return valid JSON. First chars: ${raw.slice(0, 200)}`,
  );
}

/** Stream raw text tokens from the SDK for a single prompt. */
export async function* streamText(message: string): AsyncGenerator<string> {
  ensureWritableHome();
  const apiKey = requireKey();
  const agent = await Agent.create({
    apiKey,
    model: { id: MODEL_ID },
    local: { cwd: os.tmpdir() },
  });
  try {
    const run = await agent.send(message);
    for await (const event of run.stream()) {
      const e = event as {
        type?: string;
        text?: string;
        message?: { content?: Array<{ type?: string; text?: string }> };
      };
      if (e.type === "assistant" && e.message?.content) {
        for (const block of e.message.content) {
          if (block.type === "text" && block.text) yield block.text;
        }
      } else if (e.type === "text" && e.text) {
        yield e.text;
      }
    }
  } finally {
    await agent.close?.();
  }
}

function tryParse<T>(raw: string): { ok: true; value: T } | { ok: false } {
  const cleaned = stripFences(raw).trim();
  if (!cleaned) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(cleaned) as T };
  } catch {
    // Try to find the first {...} block
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return { ok: true, value: JSON.parse(match[0]) as T };
      } catch {
        return { ok: false };
      }
    }
    return { ok: false };
  }
}

function stripFences(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
}
