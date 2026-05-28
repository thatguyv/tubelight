import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tubelight — AI YouTube Notes Generator",
  description:
    "Turn any YouTube video into summaries, chapters, flashcards, action items, quizzes, mind maps, and an interactive chat. Free and built for learners.",
  applicationName: "Tubelight",
  authors: [{ name: "Tubelight" }],
  keywords: [
    "YouTube",
    "AI notes",
    "video summary",
    "flashcards",
    "study tool",
    "quiz generator",
    "mind map",
  ],
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-background text-foreground antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delayDuration={150}>
            {children}
            <Toaster
              richColors
              closeButton
              position="bottom-right"
              theme="system"
            />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
