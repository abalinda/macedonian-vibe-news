'use client'

import { useEffect, useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { isAdminEmail } from "@/lib/admins";

type PostOption = {
  id: number;
  title: string;
  source?: string | null;
  category?: string | null;
};

type AdminHeroOverrideProps = {
  slotId: string;
  currentHeroId: number | null;
  lockedUntil?: string | null;
  updatedAt?: string | null;
  adminChoice?: boolean | number | null;
  posts: PostOption[];
};

const formatDuration = (isoDate?: string | null) => {
  if (!isoDate) return "време непознато";
  const parsed = new Date(isoDate);
  if (Number.isNaN(parsed.valueOf())) return "време непознато";

  const diffMs = Date.now() - parsed.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;

  if (hours <= 0) return `${minutes} мин.`;
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
  const minutes = Math.ceil(diffMs / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `${hours}ч ${mins}м` : `${mins}м`;
};

export const AdminHeroOverride = ({
  slotId,
  currentHeroId,
  lockedUntil,
  updatedAt,
  adminChoice,
  posts,
}: AdminHeroOverrideProps) => {
  const { user, isLoaded } = useUser();
  const [isLocal, setIsLocal] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(currentHeroId ?? null);
  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    setIsLocal(host === "localhost" || host === "127.0.0.1");
  }, []);

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const isAdmin = isAdminEmail(email) || isLocal;
  const sortedPosts = useMemo(() => {
    const unique = new Map<number, PostOption>();
    posts.forEach((p) => {
      if (!p?.id) return;
      unique.set(p.id, p);
    });
    return Array.from(unique.values());
  }, [posts]);

  useEffect(() => {
    if (currentHeroId && !selectedId) {
      setSelectedId(currentHeroId);
    }
  }, [currentHeroId, selectedId]);

  useEffect(() => {
    if (!selectedId && sortedPosts.length > 0) {
      setSelectedId(sortedPosts[0].id);
    }
  }, [selectedId, sortedPosts]);

  if (!isLoaded) return null;
  if (!isAdmin || sortedPosts.length === 0) return null;

  const lockCountdown = formatLockCountdown(lockedUntil);
  const isLocked = Boolean(lockCountdown);
  const sinceText = formatDuration(updatedAt);

  const handleOverride = async (force = false) => {
    if (!selectedId) return;
    setStatus(null);

    if (isLocked && !force) {
      const confirmed = window.confirm(
        `Hero слотот е заклучен уште ${lockCountdown}. Минимумот е 4 часа, но можеш да препишеш. Продолжи?`,
      );
      if (!confirmed) return;
      return handleOverride(true);
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/featured-slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slotId, postId: selectedId, force: force || isLocked }),
      });

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        const msg =
          data?.lockedUntil && !force
            ? `Hero слотот е уште заклучен. Препиши?`
            : "Неуспешно препишување. Обиди се повторно.";
        const confirmed = window.confirm(msg);
        if (confirmed) {
          return handleOverride(true);
        }
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error || "Неуспешно препишување.");
      }

      const data = await res.json();
      setStatus("🚀 Hero приказната е рачно поставена (заклучена 4ч).");
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Неуспешно препишување.";
      setStatus(`⚠️ ${message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="mt-4 mb-8 rounded-2xl border border-black bg-white/90 shadow-[6px_6px_0_#0000000a] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#002CFF]">
            Админ: Hero override ({slotId})
          </p>
          <p className="text-sm text-neutral-800">
            {adminChoice ? "Рачен избор" : "Автоматски избор"} · сетирано пред {sinceText}
          </p>
          {isLocked ? (
            <p className="text-xs font-semibold text-amber-700">
              Заклучено уште {lockCountdown} (мин. 4h)
            </p>
          ) : (
            <p className="text-xs font-semibold text-green-700">Слотот е отклучен</p>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="w-full sm:w-64 border border-black px-3 py-2 text-sm bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            {sortedPosts.map((post) => (
              <option key={post.id} value={post.id}>
                {post.title} {post.source ? `• ${post.source}` : ""} {post.category ? `(${post.category})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => handleOverride()}
            disabled={!selectedId || isSaving}
            className="whitespace-nowrap border border-black bg-black text-white px-4 py-2 text-xs font-bold uppercase tracking-[0.3em] rounded-lg transition-all hover:shadow-[4px_4px_0_#00000010] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? "Се снима..." : "Препиши hero"}
          </button>
        </div>
      </div>
      {status && <p className="mt-2 text-xs text-neutral-700">{status}</p>}
    </div>
  );
};
