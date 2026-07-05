'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { CATEGORIES, CATEGORY_LABELS } from "@/lib/categories";
import { savePreferences } from "@/app/actions/preferences";

// The one-time (re-triggerable) preference picker. Saving RESEEDS all jars —
// re-running the wizard is also the "reset the learning" mechanism.
export function VibeWizard({
  initialPicked,
  isRepick,
}: {
  initialPicked: string[];
  isRepick: boolean;
}) {
  const router = useRouter();
  const [picked, setPicked] = useState<string[]>(initialPicked);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (category: string) =>
    setPicked((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );

  const save = async () => {
    if (picked.length === 0 || saving) return;
    setSaving(true);
    setError(null);
    const result = await savePreferences(picked);
    if (result.ok) {
      posthog.capture("vibe_prefs_saved", { picked, is_repick: isRepick });
      router.push("/tvoi-vesti");
      router.refresh();
    } else {
      setError("Нешто тргна наопаку. Пробај повторно.");
      setSaving(false);
    }
  };

  return (
    <section className="max-w-2xl mx-auto border border-line bg-surface rounded-xl shadow-[8px_8px_0_var(--shadow)] p-6 md:p-10">
      <h1 className="font-serif text-3xl md:text-4xl font-black text-ink mb-2">
        Избери ги твоите вибрации
      </h1>
      <p className="text-sm text-neutral-600 mb-1">
        Одбери барем една категорија — остатокот го учиме од тебе.
      </p>
      {isRepick && (
        <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-muted mb-4">
          Зачувувањето ги ресетира научените вибрации.
        </p>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 my-6">
        {CATEGORIES.map((category) => {
          const isPicked = picked.includes(category);
          return (
            <button
              key={category}
              type="button"
              onClick={() => toggle(category)}
              aria-pressed={isPicked}
              className={`border border-line rounded-lg px-4 py-5 text-left transition-all ${
                isPicked
                  ? "bg-accent text-black shadow-[6px_6px_0_var(--shadow)] -translate-y-0.5"
                  : "bg-surface-2 text-ink hover:-translate-y-0.5 hover:shadow-[4px_4px_0_var(--shadow)]"
              }`}
            >
              <span className="block font-serif text-lg font-black leading-tight">
                {CATEGORY_LABELS[category]}
              </span>
              <span className="mt-1 block text-[10px] font-mono font-bold uppercase tracking-[0.25em]">
                {isPicked ? "✓ Избрано" : "Избери"}
              </span>
            </button>
          );
        })}
      </div>

      {error && <p className="text-sm font-bold text-alert mb-3">{error}</p>}

      <button
        type="button"
        onClick={save}
        disabled={picked.length === 0 || saving}
        className="w-full flex items-center justify-between border border-line bg-ink text-paper px-5 py-4 text-[12px] font-black uppercase tracking-[0.3em] transition-all enabled:hover:bg-accent enabled:hover:text-black enabled:hover:shadow-[6px_6px_0_var(--shadow)] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <span>{saving ? "Зачувуваме..." : "Зачувај"}</span>
        <span aria-hidden>→</span>
      </button>
    </section>
  );
}
