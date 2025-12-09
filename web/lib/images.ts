// Normalize cover image URLs so common share links and protocol-less inputs still render.
export const normalizeImageUrl = (value?: string | null) => {
  const raw = (value || "").trim();
  if (!raw) return "";

  if (/^(data:image|blob:)/i.test(raw)) return raw;

  const normalizedRaw = raw.startsWith("//") ? raw.slice(2) : raw;
  const withProtocol = /^https?:\/\//i.test(normalizedRaw)
    ? normalizedRaw
    : `https://${normalizedRaw}`;

  try {
    const url = new URL(withProtocol);

    // Handle common Google Drive share links.
    if (url.hostname.includes("drive.google.com")) {
      const idFromQuery = url.searchParams.get("id");
      const idFromPath = url.pathname.match(/\/d\/([^/]+)/)?.[1];
      const driveId = idFromQuery || idFromPath;
      if (driveId) {
        return `https://drive.google.com/uc?export=view&id=${driveId}`;
      }
    }

    // Handle Dropbox share links so the raw image renders.
    if (url.hostname.includes("dropbox.com")) {
      url.searchParams.delete("dl");
      url.searchParams.set("raw", "1");
      return url.toString();
    }

    return url.toString();
  } catch {
    // If URL parsing fails, fall back to the trimmed input.
    return raw;
  }
};
