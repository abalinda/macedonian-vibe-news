'use client'

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogDraft, BlogReview } from "@/lib/blog-admin";
import { cleanPastedHtml, plainTextToHtml, sanitizeRichText } from "@/lib/rich-text";

type Fields = { title: string; teaser: string; author: string; coverUrl: string; contentHtml: string };
type SaveState = "saved" | "saving" | "unsaved" | "error";
type Tab = "edit" | "preview" | "review";

const REVIEW_TIMEOUT_MS = 6 * 60 * 1000;
const escapeAttr = (v: string) => v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Shrink phone photos before upload: longest side 2000px, WebP (JPEG where the browser
// can't encode WebP, e.g. older Safari). GIFs pass through untouched to keep animation.
async function prepareImage(file: File): Promise<Blob> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const encode = (type: string) => new Promise<Blob | null>((res) => canvas.toBlob(res, type, 0.85));
    const webp = await encode("image/webp");
    const out = webp?.type === "image/webp" ? webp : await encode("image/jpeg");
    return out && out.size < file.size ? out : file;
  } catch {
    return file;
  }
}

async function uploadImage(file: File): Promise<string> {
  const blob = await prepareImage(file);
  const ext = blob.type.split("/")[1] || "jpg";
  const body = new FormData();
  body.append("file", new File([blob], `upload.${ext}`, { type: blob.type }));
  const res = await fetch("/api/blog/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "Прикачувањето не успеа.");
  return data.url;
}

const toolBtn =
  "inline-flex h-10 min-w-10 items-center justify-center rounded-md px-2 text-sm font-bold text-ink transition-colors hover:bg-accent hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--ink)]";
const labelCls = "block text-[11px] font-mono font-bold uppercase tracking-[0.2em] text-muted mb-1.5";
const inputCls =
  "w-full rounded-xl border border-line-soft bg-surface px-3 py-2.5 text-base text-ink focus:border-line focus:outline-none focus:ring-2 focus:ring-accent/60";

export function BlogEditor({ initial }: { initial: BlogDraft }) {
  const router = useRouter();
  const [fields, setFields] = useState<Fields>({
    title: initial.title,
    teaser: initial.teaser,
    author: initial.author,
    coverUrl: initial.coverUrl,
    contentHtml: initial.contentHtml,
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [tab, setTab] = useState<Tab>(initial.reviewStatus === "done" ? "review" : "edit");
  const [reviewStatus, setReviewStatus] = useState(initial.reviewStatus);
  const [review, setReview] = useState<BlogReview | null>(initial.review);
  const [reviewError, setReviewError] = useState<string | null>(initial.reviewError);
  const [undo, setUndo] = useState<Fields | null>(null);
  const [busy, setBusy] = useState<null | "cover" | "image" | "publish">(null);
  const [error, setError] = useState<string | null>(null);

  const editorRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<Range | null>(null);
  const fieldsRef = useRef(fields);
  const dirtyRef = useRef(false);
  const saveChain = useRef<Promise<void>>(Promise.resolve());
  const imageInputRef = useRef<HTMLInputElement>(null);
  const reviewStartedRef = useRef<number>(
    initial.reviewRequestedAt ? new Date(initial.reviewRequestedAt).getTime() : Date.now()
  );

  // ---- Saving ----
  const save = useCallback((extra: Record<string, unknown> = {}) => {
    const run = async () => {
      const wasDirty = dirtyRef.current;
      if (!wasDirty && !Object.keys(extra).length) return;
      dirtyRef.current = false;
      setSaveState("saving");
      try {
        const res = await fetch(`/api/blog/drafts/${initial.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...fieldsRef.current, ...extra }),
        });
        if (!res.ok) throw new Error();
        setSaveState(dirtyRef.current ? "unsaved" : "saved");
      } catch {
        dirtyRef.current = dirtyRef.current || wasDirty;
        setSaveState("error");
      }
    };
    saveChain.current = saveChain.current.then(run);
    return saveChain.current;
  }, [initial.id]);

  const update = (patch: Partial<Fields>) => {
    setFields((prev) => {
      const next = { ...prev, ...patch };
      fieldsRef.current = next;
      return next;
    });
    dirtyRef.current = true;
    setSaveState("unsaved");
  };

  // Debounced autosave.
  useEffect(() => {
    if (saveState !== "unsaved") return;
    const t = setTimeout(() => void save(), 1500);
    return () => clearTimeout(t);
  }, [fields, saveState, save]);

  // Phones kill background tabs: flush on hide, and warn on close with unsaved edits.
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState !== "hidden" || !dirtyRef.current) return;
      dirtyRef.current = false;
      fetch(`/api/blog/drafts/${initial.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fieldsRef.current),
        keepalive: true,
      }).catch(() => undefined);
    };
    const onUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [initial.id]);

  // ---- contentEditable plumbing ----
  // Push programmatic changes (accept suggestion / undo) into the DOM without fighting typing.
  useEffect(() => {
    const el = editorRef.current;
    if (el && el.innerHTML !== fields.contentHtml) el.innerHTML = fields.contentHtml;
  }, [fields.contentHtml]);

  // Remember the caret so toolbar taps (which can blur on mobile) act on the right spot.
  useEffect(() => {
    const onSel = () => {
      const sel = document.getSelection();
      if (sel?.rangeCount && editorRef.current?.contains(sel.anchorNode)) rangeRef.current = sel.getRangeAt(0).cloneRange();
    };
    document.addEventListener("selectionchange", onSel);
    return () => document.removeEventListener("selectionchange", onSel);
  }, []);

  // execCommand re-adds inline styles / <span>s when merging (Chrome "style preservation"),
  // which would pin fonts & colors and break dark mode. Strip them on every sync.
  const syncContent = () => {
    const el = editorRef.current;
    if (!el) return;
    el.querySelectorAll("[style]").forEach((n) => n.removeAttribute("style"));
    el.querySelectorAll("span, font").forEach((n) => n.replaceWith(...Array.from(n.childNodes)));
    update({ contentHtml: el.innerHTML });
  };

  const restoreRange = () => {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const sel = document.getSelection();
    if (rangeRef.current && sel) {
      sel.removeAllRanges();
      sel.addRange(rangeRef.current);
    }
  };

  const exec = (command: string, value?: string) => {
    restoreRange();
    document.execCommand(command, false, value);
    syncContent();
  };

  const toggleBlock = (tag: "h2" | "h3" | "blockquote") => {
    restoreRange();
    const current = String(document.queryCommandValue("formatBlock") || "").toLowerCase();
    document.execCommand("formatBlock", false, current === tag ? "<p>" : `<${tag}>`);
    syncContent();
  };

  const insertLink = () => {
    const saved = rangeRef.current?.cloneRange() ?? null;
    const url = window.prompt("Линк (https://…)", "https://");
    if (!url || !/^https?:\/\/\S+\.\S+/i.test(url.trim())) return;
    rangeRef.current = saved;
    const href = url.trim();
    if (saved && !saved.collapsed) exec("createLink", href);
    else exec("insertHTML", `<a href="${escapeAttr(href)}">${escapeAttr(new URL(href).hostname)}</a>`);
  };

  const onPaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");
    const clean = html ? cleanPastedHtml(html) : plainTextToHtml(text);
    if (clean) document.execCommand("insertHTML", false, clean);
    syncContent();
  };

  const onPickImage = async (file: File | undefined, target: "cover" | "image") => {
    if (!file) return;
    const saved = rangeRef.current?.cloneRange() ?? null;
    setBusy(target);
    setError(null);
    try {
      const url = await uploadImage(file);
      if (target === "cover") update({ coverUrl: url });
      else {
        rangeRef.current = saved;
        exec("insertHTML", `<figure><img src="${escapeAttr(url)}" alt=""></figure><p><br></p>`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Прикачувањето не успеа.");
    } finally {
      setBusy(null);
    }
  };

  // ---- Review ----
  const reviewing = reviewStatus === "pending" || reviewStatus === "running";

  useEffect(() => {
    if (!reviewing) return;
    const t = setInterval(async () => {
      if (Date.now() - reviewStartedRef.current > REVIEW_TIMEOUT_MS) {
        setReviewStatus("failed");
        setReviewError("Прегледот не одговори на време.");
        return;
      }
      const res = await fetch(`/api/blog/drafts/${initial.id}`, { cache: "no-store" }).catch(() => null);
      const data: BlogDraft | null = res?.ok ? await res.json() : null;
      if (!data) return;
      setReviewStatus(data.reviewStatus);
      setReviewError(data.reviewError);
      if (data.reviewStatus === "done" && data.review) {
        setReview(data.review);
        setTab("review");
      }
    }, 4000);
    return () => clearInterval(t);
  }, [reviewing, initial.id]);

  const requestReview = async () => {
    setError(null);
    await save();
    const res = await fetch(`/api/blog/drafts/${initial.id}/review`, { method: "POST" });
    if (!res.ok) {
      setError("Не можевме да побараме преглед.");
      return;
    }
    reviewStartedRef.current = Date.now();
    setReview(null);
    setReviewError(null);
    setReviewStatus("pending");
  };

  const acceptReview = () => {
    if (!review) return;
    setUndo(fieldsRef.current);
    update({
      title: review.title || fieldsRef.current.title,
      teaser: review.teaser || fieldsRef.current.teaser,
      contentHtml: sanitizeRichText(review.content_html),
    });
    setReview(null);
    setReviewStatus("none");
    setTab("edit");
    void save({ clearReview: true });
  };

  const dismissReview = () => {
    setReview(null);
    setReviewStatus("none");
    setTab("edit");
    void save({ clearReview: true });
  };

  // ---- Publish ----
  const publish = async () => {
    setError(null);
    if (!fields.title.trim() || !editorRef.current?.textContent?.trim()) {
      setError("Наслов и содржина се задолжителни.");
      return;
    }
    setBusy("publish");
    await save();
    const res = await fetch(`/api/blog/drafts/${initial.id}/publish`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.postId) {
      setBusy(null);
      setError(data.error || "Објавувањето не успеа.");
      return;
    }
    dirtyRef.current = false;
    router.push(`/blog/${data.postId}`);
  };

  const saveLabel = { saved: "Зачувано ✓", saving: "Се зачувува…", unsaved: "Незачувано", error: "Грешка при зачувување" }[saveState];
  const isEdit = initial.postId != null;

  return (
    <main className="min-h-screen bg-paper text-ink pb-24">
      {/* Action bar */}
      <header className="sticky top-0 z-50 h-14 border-b border-line bg-paper">
        <div className="mx-auto flex h-full max-w-3xl items-center gap-2 px-4">
          <Link href="/admin/blog" aria-label="Назад кон објавите" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface hover:bg-accent hover:text-black">
            <span aria-hidden>←</span>
          </Link>
          <span className={`min-w-0 flex-1 truncate font-mono text-[10px] uppercase tracking-[0.15em] ${saveState === "error" ? "text-ink font-bold" : "text-muted"}`} aria-live="polite">
            {saveLabel}
          </span>
          <button
            type="button"
            onClick={requestReview}
            disabled={reviewing || busy === "publish"}
            className="h-10 shrink-0 rounded-xl border border-line/50 bg-surface px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-ink transition-all hover:border-line hover:bg-accent hover:text-black disabled:opacity-50"
          >
            {reviewing ? "Се прегледува…" : "Прегледај"}
          </button>
          <button
            type="button"
            onClick={publish}
            disabled={busy === "publish"}
            className="h-10 shrink-0 rounded-xl border border-line bg-ink px-3 text-[11px] font-bold uppercase tracking-[0.15em] text-paper transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow-strong)] disabled:opacity-50"
          >
            {busy === "publish" ? "…" : isEdit ? "Зачувај" : "Објави"}
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-5 px-4 py-6">
        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-link">
          {isEdit ? "Уредување на објавена статија" : "Нова блог објава"}
        </p>

        {error ? (
          <p role="alert" className="rounded-xl border border-line border-l-4 border-l-line bg-surface px-4 py-3 text-sm">
            {error}
          </p>
        ) : null}

        {undo ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-[4px_4px_0_var(--shadow)]">
            <span>Предлогот е применет.</span>
            <button type="button" className="font-bold uppercase tracking-[0.15em] text-[11px] underline" onClick={() => { update(undo); setUndo(null); }}>
              Врати ја мојата верзија
            </button>
          </div>
        ) : null}

        <label className="block">
          <span className={labelCls}>Наслов *</span>
          <textarea
            rows={2}
            value={fields.title}
            onChange={(e) => update({ title: e.target.value })}
            placeholder="Наслов на објавата"
            className={`${inputCls} resize-none font-serif text-2xl font-black leading-tight`}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className={labelCls}>Автор</span>
            <input value={fields.author} onChange={(e) => update({ author: e.target.value })} className={inputCls} placeholder="Име и презиме" />
          </label>
          <div>
            <span className={labelCls}>Насловна слика</span>
            <label className={`flex h-[46px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-line bg-surface text-[11px] font-bold uppercase tracking-[0.2em] hover:bg-accent hover:text-black ${busy === "cover" ? "opacity-50" : ""}`}>
              {busy === "cover" ? "Се прикачува…" : fields.coverUrl ? "Замени слика" : "+ Прикачи слика"}
              <input type="file" accept="image/*" className="sr-only" disabled={busy === "cover"} onChange={(e) => { void onPickImage(e.target.files?.[0], "cover"); e.target.value = ""; }} />
            </label>
          </div>
        </div>

        {fields.coverUrl ? (
          <div className="relative aspect-video overflow-hidden rounded-[18px] border border-line bg-surface-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fields.coverUrl} alt="Насловна слика" className="h-full w-full object-cover" referrerPolicy="no-referrer" decoding="async" />
            <button type="button" aria-label="Отстрани насловна слика" onClick={() => update({ coverUrl: "" })} className="absolute right-3 top-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink hover:bg-accent hover:text-black">
              ×
            </button>
          </div>
        ) : null}

        <label className="block">
          <span className={labelCls}>Тизер</span>
          <textarea rows={3} value={fields.teaser} onChange={(e) => update({ teaser: e.target.value })} className={`${inputCls} resize-y`} placeholder="1–2 реченици за листата на вести." />
        </label>

        {/* Tabs */}
        <div role="tablist" className="flex gap-1 border-b-4 border-line">
          {([
            ["edit", "Уреди"],
            ["preview", "Преглед"],
            ...(review ? [["review", "Предлог"] as const] : []),
          ] as const).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`inline-flex h-10 items-center gap-1.5 rounded-t-md px-4 text-[11px] font-black uppercase tracking-widest ${tab === key ? "bg-ink text-paper" : "text-ink hover:bg-surface-2"}`}
            >
              {label}
              {key === "review" ? <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> : null}
            </button>
          ))}
        </div>

        {reviewing ? (
          <p className="rounded-xl border border-line-soft bg-surface px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted motion-safe:animate-pulse">
            Claude го чита текстот… обично 1–2 минути.
          </p>
        ) : null}
        {reviewStatus === "failed" ? (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-line border-l-4 border-l-line bg-surface px-4 py-3 text-sm">
            <span>Прегледот не успеа{reviewError ? `: ${reviewError}` : "."}</span>
            <button type="button" onClick={requestReview} className="shrink-0 text-[11px] font-bold uppercase tracking-[0.15em] underline">
              Обиди се пак
            </button>
          </div>
        ) : null}

        {/* Editor stays mounted (hidden) so the caret/DOM survive tab switches. */}
        <div className={tab === "edit" ? "" : "hidden"}>
          <div className="rounded-2xl border border-line bg-surface shadow-[6px_6px_0_var(--shadow)]">
            <div role="toolbar" aria-label="Форматирање" className="sticky top-14 z-40 flex flex-wrap items-center gap-0.5 rounded-t-2xl border-b border-line-soft bg-surface px-1.5 py-1" onMouseDown={(e) => e.preventDefault()}>
              <button type="button" className={toolBtn} aria-label="Задебелено" onClick={() => exec("bold")}>B</button>
              <button type="button" className={`${toolBtn} italic font-serif`} aria-label="Курзив" onClick={() => exec("italic")}>I</button>
              <button type="button" className={toolBtn} aria-label="Поднаслов" onClick={() => toggleBlock("h2")}>H2</button>
              <button type="button" className={toolBtn} aria-label="Мал поднаслов" onClick={() => toggleBlock("h3")}>H3</button>
              <button type="button" className={`${toolBtn} font-serif text-lg`} aria-label="Цитат" onClick={() => toggleBlock("blockquote")}>„“</button>
              <button type="button" className={toolBtn} aria-label="Листа" onClick={() => exec("insertUnorderedList")}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" /></svg>
              </button>
              <button type="button" className={toolBtn} aria-label="Линк" onClick={insertLink}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>
              </button>
              <button type="button" className={toolBtn} aria-label="Внеси слика" disabled={busy === "image"} onClick={() => imageInputRef.current?.click()}>
                {busy === "image" ? "…" : (
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><rect x="3" y="5" width="18" height="14" rx="1" /><circle cx="8.5" cy="10" r="1.5" /><path d="m21 16-5-5-8 8" /></svg>
                )}
              </button>
              <button type="button" className={toolBtn} aria-label="Разделник" onClick={() => exec("insertHorizontalRule")}>—</button>
              <input ref={imageInputRef} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => { void onPickImage(e.target.files?.[0], "image"); e.target.value = ""; }} />
            </div>
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              role="textbox"
              aria-multiline="true"
              aria-label="Содржина"
              data-placeholder="Почни да пишуваш или залепи текст…"
              onInput={syncContent}
              onPaste={onPaste}
              className="blog-body min-h-[50vh] px-4 py-4 focus:outline-none empty:before:text-muted empty:before:content-[attr(data-placeholder)] md:px-6"
            />
          </div>
        </div>

        {tab === "preview" ? (
          <article className="rounded-2xl border border-line-soft bg-surface p-5 shadow-[6px_6px_0_var(--shadow)] md:p-8">
            <h1 className="mb-3 font-serif text-3xl font-black leading-tight">{fields.title || "Без наслов"}</h1>
            {fields.teaser ? <p className="mb-6 font-mono text-xs uppercase tracking-[0.12em] text-muted">{fields.teaser}</p> : null}
            <div className="blog-body" dangerouslySetInnerHTML={{ __html: sanitizeRichText(fields.contentHtml) }} />
          </article>
        ) : null}

        {tab === "review" && review ? (
          <section className="space-y-4">
            {review.notes.length ? (
              <div className="rounded-xl border border-line border-l-4 border-l-accent bg-surface px-4 py-3">
                <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Белешки од Claude</p>
                <ul className="list-disc space-y-1 pl-5 text-sm">
                  {review.notes.map((n, i) => <li key={i}>{n}</li>)}
                </ul>
              </div>
            ) : null}
            <article className="rounded-2xl border border-line-soft bg-surface p-5 shadow-[6px_6px_0_var(--shadow)] md:p-8">
              <h1 className="mb-3 font-serif text-3xl font-black leading-tight">{review.title || fields.title}</h1>
              {review.teaser ? <p className="mb-6 font-mono text-xs uppercase tracking-[0.12em] text-muted">{review.teaser}</p> : null}
              <div className="blog-body" dangerouslySetInnerHTML={{ __html: sanitizeRichText(review.content_html) }} />
            </article>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button type="button" onClick={acceptReview} className="flex-1 border border-line bg-accent px-4 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-black shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--shadow)]">
                Прифати предлог
              </button>
              <button type="button" onClick={dismissReview} className="flex-1 rounded-xl border border-line/50 bg-surface px-4 py-3 text-[11px] font-bold uppercase tracking-[0.25em] text-ink hover:border-line hover:bg-surface-2">
                Задржи ја мојата
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
