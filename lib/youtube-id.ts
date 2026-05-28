const ID_REGEX = /^[A-Za-z0-9_-]{11}$/;

export function parseVideoId(input: string): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (ID_REGEX.test(trimmed)) return trimmed;

  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && ID_REGEX.test(id) ? id : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      const v = url.searchParams.get("v");
      if (v && ID_REGEX.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const idx = parts.findIndex((p) => ["shorts", "embed", "live", "v"].includes(p));
      if (idx !== -1 && parts[idx + 1] && ID_REGEX.test(parts[idx + 1])) {
        return parts[idx + 1];
      }
    }
  } catch {
    return null;
  }
  return null;
}

export function canonicalUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

export function thumbnailUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
