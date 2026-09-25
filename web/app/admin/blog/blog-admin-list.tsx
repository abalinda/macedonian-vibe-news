'use client'

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { BlogDraft } from "@/lib/blog-admin";
import { RayBurst } from "../../_components/ray-burst";

type PostRow = { id: number; title: string; publishedAt: string | null; imageUrl: string };

const fmt = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("mk-MK", { day: "numeric", month: "short", year: "numeric" }) : "";

const rowBtn =
  "inline-flex h-10 items-center rounded-full border border-line px-3 text-[10px] font-bold uppercase tracking-[0.2em] transition-colors";

export function BlogAdminList() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<BlogDraft[] | null>(null);
  const [posts, setPosts] = useState<PostRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/blog/drafts", { cache: "no-store" });
    if (!res.ok) {
      setError("Не можевме да ги вчитаме објавите.");
      return;
    }
    const data = await res.json();
    setDrafts(data.drafts);
    setPosts(data.posts);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const openDraft = async (postId?: number) => {
    setBusy(postId ? `edit-${postId}` : "new");
    const res = await fetch("/api/blog/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(postId ? { postId } : {}),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) router.push(`/admin/blog/${data.id}`);
    else {
      setBusy(null);
      setError(data.error || "Настана грешка.");
    }
  };

  const remove = async (url: string, question: string, key: string) => {
    if (!window.confirm(question)) return;
    setBusy(key);
    const res = await fetch(url, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) setError("Бришењето не успеа.");
    await load();
  };

  return (
    <div className="space-y-10">
      <button
        type="button"
        onClick={() => openDraft()}
        disabled={busy === "new"}
        className="flex w-full items-center justify-between border border-line bg-accent px-4 py-4 text-[11px] font-bold uppercase tracking-[0.3em] text-black shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[10px_10px_0_var(--shadow)] disabled:opacity-60"
      >
        <span>{busy === "new" ? "Се отвора…" : "Нова објава"}</span>
        <span className="font-mono">+</span>
      </button>

      {error ? (
        <p role="alert" className="rounded-xl border border-line border-l-4 bg-surface px-4 py-3 text-sm">{error}</p>
      ) : null}

      <section>
        <h2 className="mb-4 flex items-center gap-2 border-b-4 border-line pb-2 font-sans text-xs font-black uppercase tracking-widest">
          <RayBurst className="h-3.5 w-3.5 shrink-0 text-accent" /> Нацрти
        </h2>
        {drafts === null ? (
          <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">Се вчитува…</p>
        ) : drafts.length === 0 ? (
          <p className="text-sm text-muted">Нема отворени нацрти.</p>
        ) : (
          <ul className="divide-y divide-line-soft">
            {drafts.map((d) => (
              <li key={d.id} className="flex items-center gap-3 py-3">
                <Link href={`/admin/blog/${d.id}`} className="group min-w-0 flex-1">
                  <p className="truncate font-serif text-lg font-bold group-hover:underline decoration-2 underline-offset-4">
                    {d.title || "Без наслов"}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
                    {d.postId ? "Измена на објавена · " : ""}
                    {fmt(d.updatedAt)}
                    {d.reviewStatus === "done" ? " · предлог чека" : d.reviewStatus === "pending" || d.reviewStatus === "running" ? " · се прегледува" : ""}
                  </p>
                </Link>
                <button
                  type="button"
                  disabled={busy === `draft-${d.id}`}
                  onClick={() => remove(`/api/blog/drafts/${d.id}`, "Да се отфрли нацртот? Објавената верзија (ако има) останува.", `draft-${d.id}`)}
                  className={`${rowBtn} hover:bg-ink hover:text-paper`}
                >
                  Отфрли
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 border-b-4 border-line pb-2 font-sans text-xs font-black uppercase tracking-widest">
          <RayBurst className="h-3.5 w-3.5 shrink-0 text-accent" /> Објавени
        </h2>
        <ul className="divide-y divide-line-soft">
          {posts.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3">
              <Link href={`/blog/${p.id}`} className="group min-w-0 flex-1 basis-56">
                <p className="line-clamp-2 font-serif text-lg font-bold leading-snug group-hover:underline decoration-2 underline-offset-4">{p.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">{fmt(p.publishedAt)}</p>
              </Link>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={busy === `edit-${p.id}`}
                  onClick={() => openDraft(p.id)}
                  className={`${rowBtn} bg-surface hover:bg-accent hover:text-black`}
                >
                  {busy === `edit-${p.id}` ? "…" : "Уреди"}
                </button>
                <button
                  type="button"
                  disabled={busy === `post-${p.id}`}
                  onClick={() => remove(`/api/blog/posts/${p.id}`, `Трајно да се избрише „${p.title}“? Ова не може да се врати.`, `post-${p.id}`)}
                  className={`${rowBtn} hover:bg-ink hover:text-paper`}
                >
                  Избриши
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
