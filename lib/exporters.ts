import { formatTime } from "./utils";
import type { MindMapNode, NotesPayload } from "./types";

function downloadBlob(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function safeName(s: string): string {
  return s.replace(/[^\w\s.-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80) || "video";
}

export function exportMarkdown(payload: NotesPayload) {
  const md = renderMarkdown(payload);
  downloadBlob(`${safeName(payload.meta.title)}.md`, md, "text/markdown");
}

export function exportJson(payload: NotesPayload) {
  downloadBlob(
    `${safeName(payload.meta.title)}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

export function exportAnkiCsv(payload: NotesPayload) {
  const cards = payload.flashcards ?? [];
  if (cards.length === 0) return false;
  const csv = cards
    .map((c) => [csvCell(c.q), csvCell(c.a), csvCell(c.difficulty ?? "")].join(","))
    .join("\n");
  downloadBlob(`${safeName(payload.meta.title)}-anki.csv`, csv, "text/csv");
  return true;
}

function csvCell(s: string): string {
  const needsQuote = /[",\n]/.test(s);
  const escaped = s.replace(/"/g, '""');
  return needsQuote ? `"${escaped}"` : escaped;
}

export function renderMarkdown(p: NotesPayload): string {
  const out: string[] = [];
  out.push(`# ${p.meta.title}`);
  out.push("");
  out.push(`> By **${p.meta.author}** · [Watch on YouTube](${p.meta.url})`);
  out.push("");

  if (p.summary) {
    out.push("## TL;DR");
    out.push(p.summary.tldr);
    out.push("");
    if (p.summary.bullets?.length) {
      out.push("## Key Points");
      for (const b of p.summary.bullets) out.push(`- ${b}`);
      out.push("");
    }
    out.push("## Summary");
    out.push(p.summary.detailed);
    out.push("");
  }

  if (p.chapters?.length) {
    out.push("## Chapters");
    for (const c of p.chapters) {
      out.push(`### \`${formatTime(c.start)}\` — ${c.title}`);
      for (const b of c.bullets ?? []) out.push(`- ${b}`);
      out.push("");
    }
  }

  if (p.actions?.length) {
    out.push("## Action Items");
    for (const a of p.actions) {
      out.push(`- [${a.priority.toUpperCase()}] ${a.text}${a.category ? ` _(${a.category})_` : ""}`);
    }
    out.push("");
  }

  if (p.flashcards?.length) {
    out.push("## Flashcards");
    p.flashcards.forEach((c, i) => {
      out.push(`**${i + 1}. ${c.q}**`);
      out.push(c.a);
      out.push("");
    });
  }

  if (p.quiz?.length) {
    out.push("## Quiz");
    p.quiz.forEach((q, i) => {
      out.push(`**Q${i + 1}. ${q.question}**`);
      q.options.forEach((o, j) => {
        const marker = j === q.correctIndex ? "**(correct)**" : "";
        out.push(`- ${String.fromCharCode(65 + j)}. ${o} ${marker}`.trim());
      });
      out.push(`_Why:_ ${q.explanation}`);
      out.push("");
    });
  }

  if (p.mindmap) {
    out.push("## Mind Map");
    out.push(renderMindMap(p.mindmap, 0));
    out.push("");
  }

  if (p.quotes?.length) {
    out.push("## Quotes");
    for (const q of p.quotes) {
      out.push(`> "${q.text}"`);
      out.push(
        `> — ${q.speaker ?? "Speaker"} · \`${formatTime(q.start)}\`${q.context ? ` · ${q.context}` : ""}`,
      );
      out.push("");
    }
  }

  return out.join("\n");
}

function renderMindMap(node: MindMapNode, depth: number): string {
  const indent = "  ".repeat(depth);
  const lines = [`${indent}- ${node.label}`];
  for (const c of node.children ?? []) lines.push(renderMindMap(c, depth + 1));
  return lines.join("\n");
}
