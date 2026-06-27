/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isAdminEmail } from "@/lib/admins";

type SlotPost = {
  id: number;
  title: string;
  source?: string | null;
  category?: string | null;
  teaser?: string | null;
  published_at?: string | null;
};

type FeaturedSlot = {
  slotId: string;
  label: string;
  postId: number | null;
  lockedUntil: string | null;
  updatedAt: string | null;
  manualOverride: boolean;
  adminChoice: boolean;
  post: SlotPost | null;
};

type AdminHeroManagerProps = {
  isLocal: boolean;
};

const formatDuration = (isoDate?: string | null) => {
  if (!isoDate) return "непознато време";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.valueOf())) return "непознато време";
  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  if (hours <= 0) return `${minutes} мин`;
  if (hours < 24) return `${hours}ч ${minutes}м`;
  const days = Math.floor(hours / 24);
  return `${days}д ${hours % 24}ч`;
};

const formatLockCountdown = (isoDate?: string | null) => {
  if (!isoDate) return null;
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.valueOf())) return null;
  const diffMs = parsed.getTime() - Date.now();
  if (diffMs <= 0) return null;
  const mins = Math.ceil(diffMs / 60000);
  const hours = Math.floor(mins / 60);
  const rem = mins % 60;
  return hours > 0 ? `${hours}ч ${rem}м` : `${rem}м`;
};

export const AdminHeroManager = ({ isLocal }: AdminHeroManagerProps) => {
  const { user, isLoaded } = useUser();
  const [slots, setSlots] = useState<FeaturedSlot[]>([]);
  const [posts, setPosts] = useState<SlotPost[]>([]);
  const [selected, setSelected] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlot, setSavingSlot] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";
  const isAdmin = isAdminEmail(email) || isLocal;

  const fetchData = async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/featured-slots?withPosts=1");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Неуспешно вчитување на hero слотовите.");
      }

      const data = await res.json();
      const fetchedSlots: FeaturedSlot[] = (data.slots || []).map((slot: any) => ({
        slotId: slot.slotId,
        label: slot.label,
        postId: slot.postId ?? null,
        lockedUntil: slot.lockedUntil ?? null,
        updatedAt: slot.updatedAt ?? null,
        manualOverride: Boolean(slot.manualOverride),
        adminChoice: Boolean(slot.adminChoice),
        post: slot.post || null,
      }));

      const fetchedPosts: SlotPost[] = (data.recentPosts || []).map((p: any) => ({
        id: p.id,
        title: p.title,
        source: p.source,
        category: p.category,
        teaser: p.teaser,
        published_at: p.published_at,
      }));

      setSlots(fetchedSlots);

      const uniquePosts = new Map<number, SlotPost>();
      fetchedPosts.forEach((p) => uniquePosts.set(p.id, p));
      fetchedSlots.forEach((slot) => {
        if (slot.post?.id) uniquePosts.set(slot.post.id, slot.post);
      });
      setPosts(Array.from(uniquePosts.values()));

      const defaults: Record<string, number> = {};
      fetchedSlots.forEach((slot) => {
        if (slot.postId) defaults[slot.slotId] = slot.postId;
      });
      setSelected(defaults);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Грешка при читање.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isAdmin]);

  const handleOverride = async (slotId: string, forceOverride = false) => {
    const postId = selected[slotId];
    if (!postId) return;
    const slot = slots.find((s) => s.slotId === slotId);
    const lockCountdown = formatLockCountdown(slot?.lockedUntil);

    if (lockCountdown && !forceOverride) {
      const confirmChange = window.confirm(
        `Овој hero слот е заклучен уште ${lockCountdown}. Минимум 1 час е препорачано. Продолжи?`,
      );
      if (!confirmChange) return;
      forceOverride = true;
    }

    setSavingSlot(slotId);
    setStatus(null);
    setError(null);
    try {
      const res = await fetch("/api/featured-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, postId, force: forceOverride || Boolean(lockCountdown) || isLocal }),
      });

      if (res.status === 409 && !forceOverride) {
        const confirmChange = window.confirm(
          "Slot е уште заклучен под 4ч. Потврди за рачно препишување?",
        );
        if (!confirmChange) return;
        return handleOverride(slotId, true);
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Неуспешно рачно поставување.");
      }

      const data = await res.json();
      if (data.slot) {
        setSlots((prev) => prev.map((s) => (s.slotId === slotId ? data.slot : s)));
      }
      setStatus("🚀 Hero приказната е рачно поставена (заклучена 4ч).");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Неуспешно препишување.";
      setError(message);
    } finally {
      setSavingSlot(null);
    }
  };

  const orderedSlots = useMemo(() => slots, [slots]);

  if (!isAdmin && isLoaded) {
    return <p className="text-sm text-neutral-700">Немаш пристап до админ панелот.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-link">
            Hero контролa
          </p>
          <p className="text-sm text-neutral-700">
            Преглед и рачно поставување на hero приказни. Препорачан минимум: 4 часа.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          className="self-start rounded-full border border-black bg-white px-4 py-2 text-[11px] font-bold uppercase tracking-[0.25em] transition-all hover:bg-black hover:text-white"
        >
          Освежи
        </button>
      </div>

      {loading && <p className="text-sm text-neutral-600">Се вчитува...</p>}
      {error && <p className="text-sm text-red-700 font-semibold">⚠️ {error}</p>}
      {status && <p className="text-sm text-green-700 font-semibold">{status}</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {orderedSlots.map((slot) => {
          const lockCountdown = formatLockCountdown(slot.lockedUntil);
          const sinceText = formatDuration(slot.updatedAt);
          const isLocked = Boolean(lockCountdown);

          const selectValue =
            selected[slot.slotId] ??
            slot.postId ??
            (posts.length > 0 ? posts[0].id : undefined) ??
            "";

          const options = [...posts];
          if (slot.post && !options.find((p) => p.id === slot.post?.id)) {
            options.unshift(slot.post);
          }

          return (
            <div
              key={slot.slotId}
              className="rounded-2xl border border-black bg-white/90 p-4 shadow-[6px_6px_0_var(--shadow)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-neutral-700">
                    {slot.label} ({slot.slotId})
                  </p>
                  <h3 className="font-serif text-xl font-black leading-tight">
                    {slot.post?.title || "Нема актуелна приказна"}
                  </h3>
                  <p className="text-xs text-neutral-600">
                    Сетирано пред {sinceText} · {slot.adminChoice ? "Админ избор" : "Авто"}
                  </p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] ${
                    isLocked ? "bg-accent text-black" : "bg-green-600 text-white"
                  }`}
                >
                  {isLocked ? `Заклучен ${lockCountdown}` : "Отклучен"}
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-[0.25em] text-neutral-700">
                  Одбери приказна
                </label>
                <select
                  value={selectValue}
                  onChange={(e) =>
                    setSelected((prev) => ({ ...prev, [slot.slotId]: Number(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-black bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                >
                  {options.map((post) => (
                    <option key={post.id} value={post.id}>
                      {post.title} {post.source ? `• ${post.source}` : ""}{" "}
                      {post.category ? `(${post.category})` : ""}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => handleOverride(slot.slotId)}
                  disabled={!selectValue || savingSlot === slot.slotId}
                  className="w-full rounded-lg border border-black bg-black px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] text-white transition-all hover:shadow-[4px_4px_0_var(--shadow)] disabled:opacity-50"
                >
                  {savingSlot === slot.slotId ? "Се снима..." : "Постави hero"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
