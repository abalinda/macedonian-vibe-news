import Link from "next/link";

export type VibeShare = { category: string; label: string; share: number; picked: boolean };

// «Твојот вајб»: the user's live category weights as bars. The percentages
// are computed by profileShares() from the SAME jars that rank the feed, so
// what this shows is exactly why the feed looks the way it does.
export function VibeProfile({
  shares,
  showChangeButton = true,
}: {
  shares: VibeShare[];
  showChangeButton?: boolean;
}) {
  const sorted = [...shares].sort((a, b) => b.share - a.share);
  return (
    <section className="border border-line bg-surface rounded-xl shadow-[6px_6px_0_var(--shadow)] p-5 md:p-6">
      <div className="flex items-center justify-between gap-4 mb-4">
        <h2 className="font-serif text-2xl font-black text-ink">Твојот вајб</h2>
        {showChangeButton && (
          <Link
            href="/za-tebe?izberi=1"
            className="inline-flex items-center gap-2 border border-line bg-accent text-black px-3 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.25em] shadow-[4px_4px_0_var(--shadow)] transition-all hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--shadow)]"
          >
            Смени ги вибрациите
          </Link>
        )}
      </div>
      <div className="flex flex-col gap-3">
        {sorted.map((item) => {
          const percent = Math.round(item.share * 100);
          return (
            <div key={item.category} className="flex items-center gap-3">
              <span className="w-28 md:w-36 shrink-0 text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-neutral-600">
                {item.label}
                {item.picked ? <span aria-hidden> ★</span> : null}
              </span>
              <div className="flex-1 h-4 border border-line bg-surface-2 rounded-sm overflow-hidden">
                <div
                  className="h-full bg-accent border-r border-line"
                  style={{ width: `${Math.max(percent, 2)}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right text-[11px] font-mono text-neutral-600">
                {percent}%
              </span>
            </div>
          );
        })}
      </div>
      <p className="mt-4 text-[11px] font-mono uppercase tracking-[0.2em] text-muted">
        ★ = твој избор · остатокот го учиме од твоите кликови
      </p>
    </section>
  );
}
