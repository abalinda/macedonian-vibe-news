'use client'

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { isAdminEmail } from "@/lib/admins";

// Client-side so the reader page stays ISR-cached; the API re-checks admin on the server.
export function AdminEditButton({ postId }: { postId: number }) {
  const { user } = useUser();
  const router = useRouter();
  const [isLocal, setIsLocal] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLocal(["localhost", "127.0.0.1"].includes(window.location.hostname));
  }, []);

  const email = user?.primaryEmailAddress?.emailAddress || user?.emailAddresses?.[0]?.emailAddress;
  if (!isLocal && !isAdminEmail(email)) return null;

  const edit = async () => {
    setBusy(true);
    const res = await fetch("/api/blog/drafts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok && data.id) router.push(`/admin/blog/${data.id}`);
    else setBusy(false);
  };

  return (
    <button
      type="button"
      onClick={edit}
      disabled={busy}
      className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-4 text-[11px] font-bold uppercase tracking-[0.2em] text-ink transition-all hover:bg-accent hover:text-black hover:shadow-[4px_4px_0_var(--shadow)] disabled:opacity-60"
    >
      {busy ? "…" : "Уреди"}
    </button>
  );
}
