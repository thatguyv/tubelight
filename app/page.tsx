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
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const FEATURES = [
  { icon: FileText,      title: "Summary",        desc: "TL;DR + structured detailed recap." },
  { icon: ListTree,      title: "Chapters",       desc: "Auto-segmented topics, clickable timestamps." },
  { icon: Layers,        title: "Flashcards",     desc: "Flip-style cards to memorise key concepts." },
  { icon: ListChecks,    title: "Action Items",   desc: "Concrete next steps, grouped by category." },
  { icon: HelpCircle,    title: "Quiz",           desc: "Multiple-choice test with full explanations." },
  { icon: Network,       title: "Mind Map",       desc: "Interactive graphical tree of all ideas." },
  { icon: Quote,         title: "Quotes",         desc: "Notable lines with one-click seek." },
  { icon: MessageSquare, title: "Chat",           desc: "Ask any question about the video." },
];

const STATS = [
  { value: "8",       label: "study formats" },
  { value: "10+",    label: "output languages" },
  { value: "~30s",   label: "to generate" },
  { value: "Free",   label: "no account needed" },
];

const SAMPLES = [
  { label: "Steve Jobs — Stanford Commencement", url: "https://www.youtube.com/watch?v=UF8uR6Z6KLc" },
  { label: "Andrej Karpathy — Intro to LLMs",   url: "https://www.youtube.com/watch?v=zjkBMFhNj_g" },
  { label: "Veritasium — The Halting Problem",   url: "https://www.youtube.com/watch?v=92WHN-pAFCs" },
];

const HIGHLIGHTS = [
  "No sign-up required",
  "Works on any language video",
  "Shareable notes links",
  "Export to Markdown & PDF",
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

      <main className="relative flex-1 overflow-hidden">
        {/* ── Background decorations ── */}
        <div className="pointer-events-none absolute inset-0 -z-10 grid-bg opacity-60" />
        <div
          aria-hidden
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-brand/10 blur-[120px]"
        />

        {/* ─────────────── HERO ─────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pt-24">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-brand/20 bg-brand/5 px-4 py-1.5 text-xs font-medium text-brand shadow-sm">
            <Sparkles className="size-3.5" />
            Free · No sign-up · Instant study notes
          </div>

          {/* Headline */}
          <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Turn any YouTube video
            <br />
            into{" "}
            <span className="brand-text">study-ready notes</span>
          </h1>

          {/* Sub-headline */}
          <p className="mx-auto mt-6 max-w-xl text-balance text-base text-muted-foreground sm:text-lg">
            Paste a URL and get summaries, chapters, flashcards, quizzes, mind maps, and more — in under 30 seconds.
          </p>

          {/* Checklist */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {HIGHLIGHTS.map((h) => (
              <span key={h} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                <CheckCircle2 className="size-4 text-emerald-500" />
                {h}
              </span>
            ))}
          </div>

          {/* Input */}
          <div className="mx-auto mt-10 w-full max-w-2xl">
            <UrlInput initialUrl={url ?? ""} />
          </div>

          {/* Sample chips */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium">Try:</span>
            {SAMPLES.map((s) => (
              <SampleChip key={s.url} url={s.url} label={s.label} />
            ))}
          </div>
        </section>

        {/* ─────────────── STATS ─────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
          <div className="grid grid-cols-2 gap-4 rounded-2xl border bg-card/50 p-6 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-1 text-center">
                <span className="text-3xl font-bold tracking-tight brand-text">{s.value}</span>
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── FEATURES ─────────────── */}
        <section className="mx-auto w-full max-w-5xl px-4 pb-16 sm:px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">
              Everything you get
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              8 ways to learn from one video
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              All generated in a single pass — no extra clicks needed.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group relative overflow-hidden rounded-2xl border bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-lg hover:shadow-brand/5"
              >
                <div className="mb-3 inline-flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand transition-colors group-hover:bg-brand group-hover:text-brand-foreground">
                  <f.icon className="size-5" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
                <ArrowRight className="absolute bottom-4 right-4 size-4 translate-x-2 text-brand opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── HOW IT WORKS ─────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-brand">
              How it works
            </p>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Three steps. Zero friction.
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {[
              {
                step: "1",
                icon: Zap,
                title: "Paste a URL",
                desc: "Drop in any YouTube link. Pick your caption language and note language.",
              },
              {
                step: "2",
                icon: Sparkles,
                title: "AI generates notes",
                desc: "All 8 study formats are generated in parallel — typically under 30 seconds.",
              },
              {
                step: "3",
                icon: Share2,
                title: "Study or share",
                desc: "Review, export to Markdown/PDF, or copy a shareable link — no account needed.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border bg-card/60 p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-bold text-brand-foreground">
                    {item.step}
                  </span>
                  <item.icon className="size-4 text-brand" />
                </div>
                <h3 className="mb-2 font-semibold">{item.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ─────────────── MULTILINGUAL BADGE ─────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-16 sm:px-6">
          <div className="flex flex-col items-center gap-6 rounded-2xl border bg-gradient-to-br from-brand/10 via-transparent to-transparent p-8 text-center sm:flex-row sm:text-left">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-brand/15 text-brand">
              <Languages className="size-7" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Multilingual — any video, any language</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Watch a video in Spanish, get notes in English. Or vice versa. Choose the caption language and the output language independently.
              </p>
            </div>
          </div>
        </section>

        {/* ─────────────── RECENT HISTORY ─────────────── */}
        <section className="mx-auto w-full max-w-4xl px-4 pb-20 sm:px-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Recently generated
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
