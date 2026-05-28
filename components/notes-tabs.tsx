"use client";

import {
  FileText,
  ListTree,
  Layers,
  ListChecks,
  HelpCircle,
  Network,
  Quote,
  MessageSquare,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SummaryTab } from "@/components/tabs/summary-tab";
import { ChaptersTab } from "@/components/tabs/chapters-tab";
import { FlashcardsTab } from "@/components/tabs/flashcards-tab";
import { ActionsTab } from "@/components/tabs/actions-tab";
import { QuizTab } from "@/components/tabs/quiz-tab";
import { MindMapTab } from "@/components/tabs/mindmap-tab";
import { QuotesTab } from "@/components/tabs/quotes-tab";
import { ChatTab } from "@/components/tabs/chat-tab";

export function NotesTabs({ defaultValue = "summary" }: { defaultValue?: string }) {
  return (
    <Tabs defaultValue={defaultValue} className="w-full">
      <TabsList className="w-full">
        <TabsTrigger value="summary">
          <FileText /> <span className="hidden sm:inline">Summary</span>
        </TabsTrigger>
        <TabsTrigger value="chapters">
          <ListTree /> <span className="hidden sm:inline">Chapters</span>
        </TabsTrigger>
        <TabsTrigger value="flashcards">
          <Layers /> <span className="hidden sm:inline">Cards</span>
        </TabsTrigger>
        <TabsTrigger value="actions">
          <ListChecks /> <span className="hidden sm:inline">Actions</span>
        </TabsTrigger>
        <TabsTrigger value="quiz">
          <HelpCircle /> <span className="hidden sm:inline">Quiz</span>
        </TabsTrigger>
        <TabsTrigger value="mindmap">
          <Network /> <span className="hidden sm:inline">Map</span>
        </TabsTrigger>
        <TabsTrigger value="quotes">
          <Quote /> <span className="hidden sm:inline">Quotes</span>
        </TabsTrigger>
        <TabsTrigger value="chat">
          <MessageSquare /> <span className="hidden sm:inline">Chat</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="summary">
        <SummaryTab />
      </TabsContent>
      <TabsContent value="chapters">
        <ChaptersTab />
      </TabsContent>
      <TabsContent value="flashcards">
        <FlashcardsTab />
      </TabsContent>
      <TabsContent value="actions">
        <ActionsTab />
      </TabsContent>
      <TabsContent value="quiz">
        <QuizTab />
      </TabsContent>
      <TabsContent value="mindmap">
        <MindMapTab />
      </TabsContent>
      <TabsContent value="quotes">
        <QuotesTab />
      </TabsContent>
      <TabsContent value="chat">
        <ChatTab />
      </TabsContent>
    </Tabs>
  );
}
