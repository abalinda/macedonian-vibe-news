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

// ---- Paste cleanup (browser-only: uses DOMParser) ----
// Word / Google Docs / web pages paste with inline fonts, colors and classes that break
// .blog-body (and dark mode). Keep only the structure the reader styles; unwrap the rest.
const KEEP_TAGS = new Set(["p", "h2", "h3", "strong", "em", "u", "a", "ul", "ol", "li", "blockquote", "hr", "br", "img", "figure"]);
const RENAME_TAGS: Record<string, string> = { b: "strong", i: "em", h1: "h2", h4: "h3", h5: "h3", h6: "h3" };
const DROP_TAGS = new Set(["script", "style", "meta", "link", "title", "head", "iframe", "object", "embed", "svg", "noscript", "template"]);
const BLOCK_TAGS = new Set(["p", "h2", "h3", "ul", "ol", "li", "blockquote", "hr", "figure", "div", "table"]);

export function cleanPastedHtml(html: string): string {
  const src = new DOMParser().parseFromString(html, "text/html");
  const out = document.implementation.createHTMLDocument("");

  const clean = (node: Node): Node[] => {
    if (node.nodeType === Node.TEXT_NODE) return [out.createTextNode(node.textContent || "")];
    if (node.nodeType !== Node.ELEMENT_NODE) return [];
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    if (DROP_TAGS.has(tag)) return [];

    const children = Array.from(el.childNodes).flatMap(clean);
    const style = (el.getAttribute("style") || "").toLowerCase();
    let name: string | null = RENAME_TAGS[tag] ?? (KEEP_TAGS.has(tag) ? tag : null);

    // Google Docs wraps whole pastes in <b style="font-weight:normal">; Word bolds via spans.
    if (name === "strong" && /font-weight:\s*(normal|400)/.test(style)) name = null;
    if (!name && tag === "span" && /font-weight:\s*(bold|[6-9]00)/.test(style)) name = "strong";
    if (!name && tag === "span" && /font-style:\s*italic/.test(style)) name = "em";
    // A div of inline content is a paragraph; a div of blocks just unwraps.
    if (tag === "div" && !Array.from(el.children).some((c) => BLOCK_TAGS.has(c.tagName.toLowerCase()))) name = "p";

    if (!name) return children;
    const next = out.createElement(name);
    if (name === "a") {
      const href = el.getAttribute("href") || "";
      if (!/^(https?:|mailto:)/i.test(href)) return children;
      next.setAttribute("href", href);
    }
    if (name === "img") {
      const srcUrl = el.getAttribute("src") || "";
      if (!/^https:\/\//i.test(srcUrl)) return [];
      next.setAttribute("src", srcUrl);
      next.setAttribute("alt", el.getAttribute("alt") || "");
      return [next];
    }
    children.forEach((c) => next.appendChild(c));
    // Word's spacer paragraphs (<p>&nbsp;</p>) and other empty blocks.
    if (["p", "h2", "h3", "li", "blockquote", "strong", "em", "u"].includes(name) && !next.textContent?.trim() && !next.querySelector("img")) {
      return [];
    }
    return [next];
  };

  const wrap = out.createElement("div");
  Array.from(src.body.childNodes).flatMap(clean).forEach((n) => wrap.appendChild(n));
  return wrap.innerHTML.replace(/ /g, " ");
}

export const plainTextToHtml = (text: string) =>
  text
    .replace(/\r\n/g, "\n")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`)
    .join("");
