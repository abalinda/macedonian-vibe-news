/* eslint-disable @typescript-eslint/no-explicit-any */
import { Suspense } from "react";
import { auth } from "@clerk/nextjs/server";
import { SignInButton, UserProfile } from "@clerk/nextjs";
import { turso } from "@/lib/turso";
import { profileShares } from "@/lib/personalization";
import { getJars, ensurePersonalizationTables } from "@/lib/personalization-db";
import { getSavedPosts } from "@/app/actions/bookmarks";
import { CATEGORY_LABELS } from "@/lib/categories";
import { CategoryNav, NavBar } from "../_components/navigation";
import { VibeProfile } from "../_components/vibe-profile";
import { ArticleLink } from "../_components/article-link";
import { SavedList } from "./saved-list";

// Per-user page: never cached/ISR (Global Constraints). Private — shows the
// signed-in user their own data only.
export const dynamic = "force-dynamic";

const NavFallback = () => (
  <div className="sticky top-0 z-40 border-b border-line bg-paper py-3 px-4 md:px-8">
    <div className="w-full max-w-[1400px] mx-auto h-11" />
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="font-serif text-2xl font-black text-ink mb-4">{children}</h2>
);

const SectionError = ({ label }: { label: string }) => (
  <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-8 text-center">
    {label} не може да се вчита во моментот. Пробај повторно подоцна.
  </p>
);

async function getHistory(userId: string) {
  await ensurePersonalizationTables();
  const result = await turso.execute({
    sql: `SELECT p.*, c.clicked_at
          FROM user_clicks c
          JOIN posts p ON p.id = c.post_id
          WHERE c.user_id = ?
          ORDER BY c.clicked_at DESC
          LIMIT 20`,
    args: [userId],
  });
  return JSON.parse(JSON.stringify(result.rows)) as any[];
}

export default async function ProfilePage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <main className="min-h-screen bg-paper text-ink pb-20">
        <Suspense fallback={<NavFallback />}>
          <NavBar />
        </Suspense>
        <CategoryNav activeCategory={null} />
        <div className="max-w-xl mx-auto px-5 pt-16 text-center border-2 border-dashed border-line-soft rounded-xl bg-surface-2 py-16 mt-8">
          <h1 className="font-serif text-3xl font-black text-ink mb-3">Профил</h1>
          <p className="text-sm text-neutral-600 mb-6">Најави се за да го видиш твојот профил.</p>
          <SignInButton mode="modal">
            <button className="inline-flex items-center gap-3 border border-line bg-accent text-black px-6 py-3 text-[11px] font-black uppercase tracking-[0.3em] shadow-[6px_6px_0_var(--shadow)] transition-all hover:-translate-y-0.5">
              Најава <span aria-hidden>→</span>
            </button>
          </SignInButton>
        </div>
      </main>
    );
  }

  // Each section degrades independently (spec §9.3).
  const [jars, history, saved] = await Promise.all([
    getJars(userId).catch((err) => { console.error("profil jars:", err); return null; }),
    getHistory(userId).catch((err) => { console.error("profil history:", err); return null; }),
    getSavedPosts().catch((err) => { console.error("profil saved:", err); return null; }),
  ]);

  const nowIso = new Date().toISOString();

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <Suspense fallback={<NavFallback />}>
        <NavBar />
      </Suspense>
      <CategoryNav activeCategory={null} />

      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-8 flex flex-col gap-10">
        <header className="pb-6 border-b border-line">
          <h1 className="text-center font-serif text-4xl md:text-5xl font-black leading-tight">Профил</h1>
        </header>

        <section>
          <SectionTitle>Твојот вајб</SectionTitle>
          {jars === null ? (
            <SectionError label="«Твојот вајб»" />
          ) : jars.length === 0 ? (
            <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-8 text-center">
              Уште ги немаш избрано вибрациите — почни на страницата «За тебе».
            </p>
          ) : (
            <VibeProfile shares={profileShares(jars, nowIso)} />
          )}
        </section>

        <section>
          <SectionTitle>Прочитано</SectionTitle>
          {history === null ? (
            <SectionError label="Историјата" />
          ) : history.length === 0 ? (
            <p className="text-sm text-neutral-500 border-2 border-dashed border-line-soft rounded-lg bg-surface-2 px-6 py-8 text-center">
              Уште нема прочитани написи.
            </p>
          ) : (
            <ul className="flex flex-col divide-y divide-line-soft border border-line rounded-xl bg-surface shadow-[6px_6px_0_var(--shadow)]">
              {history.map((post: any) => (
                <li key={`${post.id}-${post.clicked_at}`} className="p-4">
                  <ArticleLink post={post} feed="profile" className="group block">
                    <span className="block truncate font-serif text-base font-bold text-ink group-hover:underline">
                      {post.title}
                    </span>
                  </ArticleLink>
                  <span className="mt-1 block text-[10px] font-mono uppercase tracking-[0.2em] text-muted">
                    {(post.category && (CATEGORY_LABELS as Record<string, string>)[post.category]) ?? post.category ?? "Вести"}
                    {post.source ? ` · ${post.source}` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <SectionTitle>Зачувано</SectionTitle>
          {saved === null ? <SectionError label="Зачуваното" /> : <SavedList initial={saved} />}
        </section>

        <section>
          <SectionTitle>Сметка</SectionTitle>
          <div className="border border-line rounded-xl bg-surface shadow-[6px_6px_0_var(--shadow)] p-2 md:p-4 overflow-x-auto">
            <UserProfile
              routing="hash"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  cardBox: "w-full shadow-none border-0",
                },
              }}
            />
          </div>
        </section>
      </div>
    </main>
  );
}
