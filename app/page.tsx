import { SiteHeader } from "@/components/site-header";
import { UrlInput } from "@/components/url-input";
import { HistoryList } from "@/components/history-list";
import { SampleChip } from "@/components/sample-chip";
import {
  FileText,
  ListTree,
  Layers,
  ListChecks,
  HelpCircle,
  Network,
  Quote,
  MessageSquare,
  Sparkles,
  Languages,
  Share2,
  Zap,
} from "lucide-react";

const FEATURES = [
  { icon: FileText, title: "Summary", desc: "TL;DR + a detailed recap." },
  { icon: ListTree, title: "Chapters", desc: "Auto-segmented topics with timestamps." },
  { icon: Layers, title: "Flashcards", desc: "Anki-style cards to memorize key facts." },
  { icon: ListChecks, title: "Action Items", desc: "Concrete next steps to take." },
  { icon: HelpCircle, title: "Quiz", desc: "MCQ test with instant feedback." },
  { icon: Network, title: "Mind Map", desc: "Hierarchical view of all ideas." },
  { icon: Quote, title: "Quotes", desc: "Notable lines, clickable to seek." },
  { icon: MessageSquare, title: "Chat with Video", desc: "Ask follow-up questions." },
];

const PILLS = [
  { icon: Zap, label: "Generated in seconds" },
  { icon: Languages, label: "Multilingual transcripts & output" },
  { icon: Share2, label: "Shareable links, no account needed" },
  { icon: Sparkles, label: "8 study formats from one video" },
];

const SAMPLES = [
  { label: "Steve Jobs — Stanford Commencement", url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc" },
  { label: "Andrej Karpathy — Intro to LLMs", url: "https://www.youtube.com/watch?v=zjkBMFhNj_g" },
  { label: "Veritasium — The Halting Problem", url: "https://www.youtube.com/watch?v=92WHN-pAFCs" },
];

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ url?: string }>;
}) {
  const { url } = await searchParams;
  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />

      <main className="relative flex-1">
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg" />

        <section className="mx-auto w-full max-w-3xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
          <div className="mb-6 flex items-center justify-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs text-muted-foreground shadow-sm">
              <Sparkles className="size-3.5 text-brand" />
              Free · No sign-up · Built for learners
            </div>
          </div>
          <h1 className="text-balance text-center text-4xl font-semibold tracking-tight sm:text-6xl">
            Turn any YouTube video into <span className="brand-text">study-ready notes</span>
          </h1>
          <p className="mt-4 text-center text-base text-muted-foreground sm:text-lg">
            Summaries, chapters, flashcards, action items, quizzes, mind maps, quotes — and a
            chat that knows the whole video. Generated in seconds.
          </p>

          <div className="mt-10">
            <UrlInput initialUrl={url ?? ""} />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="mr-1">Try:</span>
            {SAMPLES.map((s) => (
              <SampleChip key={s.url} url={s.url} label={s.label} />
            ))}
          </div>

          <div className="mt-12 grid gap-3 sm:grid-cols-2">
            {PILLS.map((p) => (
              <div
                key={p.label}
                className="flex items-center gap-3 rounded-xl border bg-card/50 px-4 py-3 text-sm"
              >
                <span className="grid size-8 place-items-center rounded-lg bg-brand/15 text-brand">
                  <p.icon className="size-4" />
                </span>
                <span className="text-muted-foreground">{p.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
          <h2 className="mb-6 text-center text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Everything you get
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-4 transition hover:border-brand/40 hover:shadow-md"
              >
                <span className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-brand/15 text-brand transition group-hover:bg-brand group-hover:text-brand-foreground">
                  <f.icon className="size-4" />
                </span>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6">
          <h2 className="mb-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            Recent
          </h2>
          <HistoryList />
        </section>
      </main>

      <footer className="border-t no-print">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:px-6">
          <p>© {new Date().getFullYear()} Tubelight. Turn watching into learning.</p>
          <p>Made for curious minds.</p>
        </div>
      </footer>
    </div>
  );
}
