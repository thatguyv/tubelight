# Tubelight — AI YouTube Notes Generator

Turn any YouTube video into **summaries, chapters, flashcards, action items, quizzes, mind maps, quotes**, and an interactive **chat-with-video** — all running on your own [Cursor](https://cursor.com) subscription. **No paid APIs required.**

- Free YouTube transcript scraping (`youtube-transcript-plus`)
- LLM inference via the [Cursor SDK](https://cursor.com/docs/sdk/typescript) using your existing Cursor key
- Local-only storage (IndexedDB) — your data never leaves your machine
- Shareable links via URL-fragment compression — no database, no accounts
- Modern UI (Next.js 16, Tailwind v4, Radix, Framer Motion)

---

## Features

| Section | What you get |
| --- | --- |
| **Summary** | TL;DR + key bullets + detailed markdown |
| **Chapters** | AI-derived sections with clickable timestamps, synced to the player |
| **Flashcards** | Anki-style flip cards with shuffle + Anki CSV export |
| **Action Items** | Concrete next steps with priority tags + checkable list |
| **Quiz** | Interactive MCQ with instant scoring + explanations |
| **Mind Map** | Collapsible hierarchical outline |
| **Quotes** | Notable verbatim lines, click to seek the video |
| **Chat with Video** | Streaming Q&A grounded on the transcript, with clickable `[MM:SS]` timestamps |

Plus: dark/light theme, multilingual captions + output language, browser print-to-PDF, Markdown / JSON / Anki CSV export, local history, shareable URLs.

---

## Setup

### 1. Get a Cursor API key (free with any Cursor plan)

1. Visit <https://cursor.com/dashboard/integrations#user-api-keys>
2. Click **Create new API key** (or copy an existing one)

### 2. Install & configure

```bash
git clone <this-repo>
cd youtube-notes
npm install
cp .env.local.example .env.local
# open .env.local and paste your Cursor key:
#   CURSOR_API_KEY=key_xxx...
```

Optional: change the model in `.env.local`:

```env
CURSOR_API_KEY=key_xxx...
CURSOR_MODEL=composer-2.5   # default; any model id from your Cursor account works
```

### 3. Run

```bash
npm run dev          # http://localhost:3000
```

Production build:

```bash
npm run build && npm start
```

---

## Deploy to Vercel (free tier)

1. Push this repo to GitHub.
2. Import the repo at <https://vercel.com/new>.
3. In **Settings → Environment Variables**, add `CURSOR_API_KEY` (and optionally `CURSOR_MODEL`).
4. Deploy. The default Vercel project settings work without changes.

> Note: `/api/generate` may run for up to 5 minutes for long videos. The route declares `maxDuration = 300` (Vercel Pro). On the free Hobby tier, very long videos may time out — consider running locally.

---

## How it works

```
User pastes URL  →  /api/transcript                   →  youtube-transcript-plus (Innertube)
                 →  /api/generate (NDJSON stream)     →  @cursor/sdk Agent.prompt (per section)
                 →  Tabs render as each section lands →  Saved to IndexedDB
                 →  Optional /share#data=<lz-string>  →  Read-only shareable view
```

### Project layout

```
app/
  api/transcript/route.ts     # POST { url, lang? } -> meta + segments
  api/generate/route.ts       # POST -> NDJSON stream of section results
  api/chat/route.ts           # POST -> streaming chat reply
  page.tsx                    # Landing
  notes/[id]/page.tsx         # Results
  share/page.tsx              # Read-only shared view
components/
  ui/                         # Radix-based primitives (Button, Tabs, Dialog, etc.)
  tabs/                       # One component per output section
  notes-view.tsx              # Split layout: player + transcript + tabs
  url-input.tsx               # Hero input, language picker, progress
lib/
  youtube-id.ts               # Pure URL → videoId helpers (client + server)
  youtube.ts                  # Server-only: oEmbed + transcript fetching
  cursor.ts                   # @cursor/sdk wrapper (runJsonPrompt, streamText)
  prompts.ts                  # One generator function per section
  chunking.ts                 # Map-reduce for long transcripts (>~12k tokens)
  history.ts                  # IndexedDB persistence
  share.ts                    # lz-string URL fragment encode/decode
  exporters.ts                # Markdown, JSON, Anki CSV
store/notes.ts                # Zustand client store
```

### Long videos

Transcripts above ~12k estimated tokens are split into overlapping ~5.5k-token chunks. The summary section uses **map-reduce**: each chunk produces a partial summary, then a final reduce call merges them. All chunks preserve `[MM:SS]` timestamps so chapters and quotes stay accurate.

### Why URL-fragment sharing?

The full notes payload is compressed with [`lz-string`](https://pieroxy.net/blog/pages/lz-string/index.html) and stuffed into the `#data=...` fragment of the share URL. The fragment never hits the server, so there's no database to host and no privacy compromise.

---

## Limitations

- **YouTube can block transcript scraping**: `youtube-transcript-plus` uses an unofficial Innertube endpoint that may rate-limit you. The library supports custom `fetch`/proxy if you hit issues.
- **No captions = no notes**: videos without subtitles (manual or auto) cannot be processed. The UI surfaces a clear error.
- **Cursor SDK pricing**: usage is metered against your Cursor plan's request pool. Generating all 7 sections for a 30-minute video typically uses ~8–12 requests.

---

## Tech stack

- [Next.js 16](https://nextjs.org) + React 19 + TypeScript (Turbopack)
- [Tailwind CSS v4](https://tailwindcss.com) + `@tailwindcss/typography`
- [Radix UI](https://www.radix-ui.com) primitives + [lucide-react](https://lucide.dev) icons
- [Framer Motion](https://www.framer.com/motion/) for micro-interactions
- [`@cursor/sdk`](https://www.npmjs.com/package/@cursor/sdk) — LLM inference
- [`youtube-transcript-plus`](https://www.npmjs.com/package/youtube-transcript-plus) — transcripts
- [`idb-keyval`](https://www.npmjs.com/package/idb-keyval) — local history
- [`lz-string`](https://www.npmjs.com/package/lz-string) — share URL compression
- [`zustand`](https://www.npmjs.com/package/zustand) — client state
- [`sonner`](https://sonner.emilkowal.ski) — toasts
- [`next-themes`](https://github.com/pacocoursey/next-themes) — dark mode

---

## License

MIT
