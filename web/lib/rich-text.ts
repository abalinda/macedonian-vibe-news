export const stripHtml = (value: string) =>
  value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();

// Remove obviously dangerous markup while preserving author formatting (bold, lists, paragraphs).
export const sanitizeRichText = (value: string) => {
  if (!value) return "";

  const withoutDangerousTags = value
    .replace(/<\s*script[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi, "")
    .replace(/<\s*style[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi, "")
    .replace(/<\s*iframe[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi, "")
    .replace(/<\s*object[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi, "")
    .replace(/<\s*embed[^>]*>[\s\S]*?<\s*\/\s*embed\s*>/gi, "");

  const withoutHandlers = withoutDangerousTags.replace(/\s+on\w+="[^"]*"/gi, "");
  const withoutJavascriptUrls = withoutHandlers.replace(
    /\s+(href|src)\s*=\s*"(javascript:[^"]*)"/gi,
    ""
  ).replace(/\s+(href|src)\s*=\s*'(javascript:[^']*)'/gi, "");

  return withoutJavascriptUrls.trim();
};

export const toParagraphHtml = (text: string) => {
  const safeText = text.replace(/\r\n/g, "\n").trim();
  if (!safeText) return "";

  const escapeHtml = (input: string) =>
    input
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  return safeText
    .split(/\n/)
    .map((line) => `<p>${escapeHtml(line.trim()) || "<br>"}</p>`)
    .join("");
};
