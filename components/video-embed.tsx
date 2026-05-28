"use client";

import * as React from "react";
import { useNotesStore } from "@/store/notes";

interface VideoEmbedProps {
  videoId: string;
}

type YTPlayer = {
  seekTo?: (sec: number, allow: boolean) => void;
  getCurrentTime?: () => number;
  playVideo?: () => void;
  destroy?: () => void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    options: {
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

export function VideoEmbed({ videoId }: VideoEmbedProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const readyRef = React.useRef(false);
  const pendingSeekRef = React.useRef<number | null>(null);
  const seekToken = useNotesStore((s) => s.seekToken);
  const seekTargetSec = useNotesStore((s) => s.seekTargetSec);
  const setCurrentTime = useNotesStore((s) => s.setCurrentTime);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let pendingPlayer: YTPlayer | null = null;
    readyRef.current = false;

    const initPlayer = () => {
      if (!iframeRef.current || !window.YT?.Player) return;
      pendingPlayer = new window.YT.Player(iframeRef.current, {
        events: {
          onReady: (e) => {
            const ready = e?.target ?? pendingPlayer;
            if (!ready) return;
            playerRef.current = ready;
            readyRef.current = true;

            if (pendingSeekRef.current != null && typeof ready.seekTo === "function") {
              try {
                ready.seekTo(pendingSeekRef.current, true);
                ready.playVideo?.();
              } catch {
                /* noop */
              }
              pendingSeekRef.current = null;
            }

            const tick = () => {
              const p = playerRef.current;
              if (!p || typeof p.getCurrentTime !== "function") return;
              try {
                const t = p.getCurrentTime();
                if (typeof t === "number" && Number.isFinite(t)) setCurrentTime(t);
              } catch {
                /* noop */
              }
            };
            intervalId = setInterval(tick, 500);
          },
        },
      });
    };

    if (window.YT?.Player) {
      initPlayer();
    } else {
      const existing = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]',
      );
      if (!existing) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        initPlayer();
      };
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* noop */
      }
      playerRef.current = null;
      readyRef.current = false;
      pendingPlayer = null;
    };
  }, [videoId, setCurrentTime]);

  React.useEffect(() => {
    if (seekToken === 0) return;
    const p = playerRef.current;
    if (readyRef.current && p && typeof p.seekTo === "function") {
      try {
        p.seekTo(seekTargetSec, true);
        p.playVideo?.();
        return;
      } catch {
        /* fall through to iframe src reset */
      }
    }
    pendingSeekRef.current = seekTargetSec;
    const f = iframeRef.current;
    if (f) {
      const t = Math.max(0, Math.floor(seekTargetSec));
      f.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1&autoplay=1&start=${t}`;
    }
  }, [seekToken, seekTargetSec, videoId]);

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border bg-black shadow-sm"
      style={{ aspectRatio: "16/9" }}
    >
      <iframe
        ref={iframeRef}
        id={`yt-${videoId}`}
        className="absolute inset-0 h-full w-full"
        src={`https://www.youtube.com/embed/${videoId}?enablejsapi=1`}
        title="YouTube video player"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </div>
  );
}
