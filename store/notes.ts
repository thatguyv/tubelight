"use client";

import { create } from "zustand";
import type {
  ActionItem,
  ChapterItem,
  ChatMessage,
  Flashcard,
  MindMapNode,
  NotesPayload,
  QuizQuestion,
  QuoteItem,
  SectionId,
  SummarySection,
} from "@/lib/types";

interface SectionStatus {
  loading: boolean;
  error?: string;
}

interface NotesState {
  payload: NotesPayload | null;
  progress: number;
  status: string;
  isGenerating: boolean;
  sectionStatus: Record<SectionId, SectionStatus>;
  currentTimeSec: number;
  seekToken: number;
  seekTargetSec: number;
  pendingUrl: string | null;
  pendingUrlToken: number;
  setPayload: (p: NotesPayload | null) => void;
  patchPayload: (patch: Partial<NotesPayload>) => void;
  setSection: <K extends SectionId>(id: K, data: SectionData<K>) => void;
  setSectionError: (id: SectionId, message: string) => void;
  setSectionLoading: (id: SectionId, loading: boolean) => void;
  setProgress: (n: number) => void;
  setStatus: (s: string) => void;
  setGenerating: (b: boolean) => void;
  setCurrentTime: (sec: number) => void;
  seekTo: (sec: number) => void;
  requestUrl: (url: string) => void;
  clearPendingUrl: () => void;
  setChatMessages: (
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[]),
  ) => void;
  clearChat: () => void;
  reset: () => void;
}

type SectionData<K extends SectionId> = K extends "summary"
  ? SummarySection
  : K extends "chapters"
    ? ChapterItem[]
    : K extends "flashcards"
      ? Flashcard[]
      : K extends "actions"
        ? ActionItem[]
        : K extends "quiz"
          ? QuizQuestion[]
          : K extends "mindmap"
            ? MindMapNode
            : K extends "quotes"
              ? QuoteItem[]
              : never;

const emptyStatus = (): Record<SectionId, SectionStatus> => ({
  summary: { loading: false },
  chapters: { loading: false },
  flashcards: { loading: false },
  actions: { loading: false },
  quiz: { loading: false },
  mindmap: { loading: false },
  quotes: { loading: false },
});

const SECTION_KEY: Record<SectionId, keyof NotesPayload> = {
  summary: "summary",
  chapters: "chapters",
  flashcards: "flashcards",
  actions: "actions",
  quiz: "quiz",
  mindmap: "mindmap",
  quotes: "quotes",
};

export const useNotesStore = create<NotesState>((set) => ({
  payload: null,
  progress: 0,
  status: "",
  isGenerating: false,
  sectionStatus: emptyStatus(),
  currentTimeSec: 0,
  seekToken: 0,
  seekTargetSec: 0,
  pendingUrl: null,
  pendingUrlToken: 0,
  setPayload: (p) => set({ payload: p }),
  patchPayload: (patch) =>
    set((state) => ({
      payload: state.payload ? { ...state.payload, ...patch } : state.payload,
    })),
  setSection: (id, data) =>
    set((state) => {
      if (!state.payload) return state;
      const key = SECTION_KEY[id];
      return {
        payload: { ...state.payload, [key]: data } as NotesPayload,
        sectionStatus: { ...state.sectionStatus, [id]: { loading: false } },
      };
    }),
  setSectionError: (id, message) =>
    set((state) => ({
      sectionStatus: { ...state.sectionStatus, [id]: { loading: false, error: message } },
    })),
  setSectionLoading: (id, loading) =>
    set((state) => ({
      sectionStatus: {
        ...state.sectionStatus,
        [id]: { loading, error: loading ? undefined : state.sectionStatus[id].error },
      },
    })),
  setProgress: (n) => set({ progress: n }),
  setStatus: (s) => set({ status: s }),
  setGenerating: (b) => set({ isGenerating: b }),
  setCurrentTime: (sec) => set({ currentTimeSec: sec }),
  seekTo: (sec) => set((state) => ({ seekToken: state.seekToken + 1, seekTargetSec: sec })),
  requestUrl: (url) =>
    set((state) => ({ pendingUrl: url, pendingUrlToken: state.pendingUrlToken + 1 })),
  clearPendingUrl: () => set({ pendingUrl: null }),
  setChatMessages: (updater) =>
    set((state) => {
      if (!state.payload) return state;
      const prev = state.payload.chatMessages ?? [];
      const next = typeof updater === "function" ? updater(prev) : updater;
      return { payload: { ...state.payload, chatMessages: next } };
    }),
  clearChat: () =>
    set((state) =>
      state.payload ? { payload: { ...state.payload, chatMessages: [] } } : state,
    ),
  reset: () =>
    set({
      payload: null,
      progress: 0,
      status: "",
      isGenerating: false,
      sectionStatus: emptyStatus(),
      currentTimeSec: 0,
    }),
}));
