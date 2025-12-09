'use client'

import type { FormEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { normalizeImageUrl } from "@/lib/images";
import { sanitizeRichText, stripHtml } from "@/lib/rich-text";

type BlogComposerProps = {
  defaultAuthor: string;
};

const RichTextEditor = ({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const exec = (command: string) => {
    document.execCommand(command);
    editorRef.current?.focus();
  };

  return (
    <div className="border border-neutral-200 rounded-xl bg-white overflow-hidden shadow-sm">
      <div className="flex flex-wrap items-center gap-2 border-b border-neutral-200 bg-[#F8F6F0] px-3 py-2 text-xs font-mono uppercase tracking-[0.25em] text-neutral-600">
        <button
          type="button"
          onClick={() => exec("bold")}
          className="px-2 py-1 rounded border border-transparent hover:border-neutral-300 hover:bg-white"
        >
          Bold
        </button>
        <button
          type="button"
          onClick={() => exec("italic")}
          className="px-2 py-1 rounded border border-transparent hover:border-neutral-300 hover:bg-white"
        >
          Italic
        </button>
        <button
          type="button"
          onClick={() => exec("underline")}
          className="px-2 py-1 rounded border border-transparent hover:border-neutral-300 hover:bg-white"
        >
          Underline
        </button>
        <button
          type="button"
          onClick={() => exec("insertUnorderedList")}
          className="px-2 py-1 rounded border border-transparent hover:border-neutral-300 hover:bg-white"
        >
          Bullets
        </button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="min-h-[260px] max-h-[520px] overflow-y-auto px-4 py-3 font-serif leading-relaxed focus:outline-none"
        data-placeholder="Почнете да пишувате..."
        onInput={(e) => onChange((e.target as HTMLDivElement).innerHTML)}
      />
    </div>
  );
};

export const BlogComposer = ({ defaultAuthor }: BlogComposerProps) => {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [teaser, setTeaser] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [author, setAuthor] = useState(defaultAuthor);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [imagePreviewError, setImagePreviewError] = useState(false);
  const normalizedCoverUrl = useMemo(() => normalizeImageUrl(imageUrl), [imageUrl]);
  const previewHtml = useMemo(() => sanitizeRichText(content), [content]);

  useEffect(() => {
    setImagePreviewError(false);
  }, [normalizedCoverUrl]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const cleanContent = sanitizeRichText(content);

    if (!title.trim() || !stripHtml(cleanContent)) {
      setError("Наслов и содржина се задолжителни.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/blog/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          teaser: teaser.trim(),
          content: cleanContent,
          imageUrl: normalizedCoverUrl || null,
          author: author.trim() || "Blog",
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const details = data?.details ? ` ${data.details}` : "";
        throw new Error(data?.error ? `${data.error}${details}` : "Неуспешно зачувување.");
      }

      if (data?.id) {
        setSuccess("Успешно креирана објава.");
        router.push(`/blog/${data.id}`);
      } else {
        setSuccess("Успешно креирана објава.");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Настана грешка. Обидете се повторно.";
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-600">
            Наслов *
          </span>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:border-black focus:outline-none"
            placeholder="На пример: Што ново во македонската тех сцена"
            required
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-600">
            Автор
          </span>
          <input
            type="text"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:border-black focus:outline-none"
            placeholder="Име и презиме"
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-600">
            Краток тизер / вовед
          </span>
          <textarea
            value={teaser}
            onChange={(e) => setTeaser(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:border-black focus:outline-none min-h-[80px]"
            placeholder="2-3 реченици за читачите и за листата на вести."
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-600">
            Слика (URL)
          </span>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full border border-neutral-300 rounded-lg px-3 py-2 bg-white shadow-sm focus:border-black focus:outline-none"
            placeholder="https://..."
          />
          {imageUrl ? (
            <div className="space-y-2">
              <div className="w-full aspect-[16/9] rounded-xl border border-neutral-200 bg-neutral-100 overflow-hidden shadow-sm">
                {imagePreviewError ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-[12px] text-neutral-500">
                    Не можеме да ја прикажеме сликата. Проверете дали линкот е јавно достапен.
                  </div>
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={normalizedCoverUrl}
                    alt="Преглед на насловна слика"
                    className="h-full w-full object-cover"
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    onError={() => setImagePreviewError(true)}
                    onLoad={() => setImagePreviewError(false)}
                  />
                )}
              </div>
              <p className="text-[11px] text-neutral-500 break-all">{normalizedCoverUrl}</p>
            </div>
          ) : (
            <p className="text-[11px] text-neutral-500">
              Повеќето формати се прифаќаат (директен линк, Google Drive/Dropbox share линк). Го нормализираме
              автоматски за читачите.
            </p>
          )}
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-600">
            Содржина *
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
            Rich text поле
          </span>
        </div>
        <RichTextEditor value={content} onChange={setContent} />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-600">
            Преглед за читачи
          </span>
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-400">
            Како ќе изгледа на страницата
          </span>
        </div>
        <div className="bg-white border border-neutral-200 rounded-2xl shadow-sm p-4">
          {previewHtml ? (
            <div
              className="blog-body text-base text-neutral-900"
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          ) : (
            <p className="text-sm text-neutral-500">Содржината ќе се појави тука.</p>
          )}
        </div>
      </div>

      {error ? (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </div>
      ) : null}
      {success ? (
        <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          {success}
        </div>
      ) : null}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 border border-black bg-black text-white px-5 py-3 text-[11px] font-bold uppercase tracking-[0.3em] rounded-lg transition-all hover:shadow-[6px_6px_0_#00000010] disabled:opacity-60"
        >
          {saving ? "Се зачувува..." : "Објави"}
        </button>
        <p className="text-[10px] font-mono uppercase tracking-[0.25em] text-neutral-500">
          Објавата ќе биде видлива веднаш.
        </p>
      </div>
    </form>
  );
};
