"use client";

import { Download, FileText, FileJson, FileSpreadsheet, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { exportAnkiCsv, exportJson, exportMarkdown } from "@/lib/exporters";
import type { NotesPayload } from "@/lib/types";

interface Props {
  payload: NotesPayload | null;
}

export function ExportMenu({ payload }: Props) {
  const disabled = !payload;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Download /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel>Download notes as</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => payload && exportMarkdown(payload)}>
          <FileText /> Markdown (.md)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => payload && exportJson(payload)}>
          <FileJson /> JSON (.json)
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => {
            if (!payload) return;
            const ok = exportAnkiCsv(payload);
            if (!ok) toast.error("No flashcards to export");
          }}
        >
          <FileSpreadsheet /> Anki CSV
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.print()}>
          <Printer /> Print / PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
