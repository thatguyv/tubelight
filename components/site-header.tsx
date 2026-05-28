"use client";

import Link from "next/link";
import { Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/70 backdrop-blur-md no-print">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="grid size-7 place-items-center rounded-lg brand-gradient text-white shadow">
            <Sparkles className="size-4" />
          </span>
          <span>
            Tube<span className="brand-text">light</span>
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/">
              <BookOpen className="size-4" /> New
            </Link>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
