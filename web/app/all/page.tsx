import { supabaseServer } from "@/lib/supabase-server";
import { CategoryNav, NavBar } from "../_components/navigation";

export const revalidate = 60;

const CATEGORY_LABELS: Record<string, string> = {
  Tech: "Технологија",
  Culture: "Култура",
  Lifestyle: "Животен стил",
  Business: "Бизнис",
  Sports: "Спорт",
};

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

const getTeaserText = (post: any) => {
  const rawTeaser = post?.teaser?.trim();
  if (rawTeaser) return rawTeaser.toUpperCase();

  const summaryFallback = post?.summary ? stripHtml(post.summary).substring(0, 140).trim() : "";
  return summaryFallback ? summaryFallback.toUpperCase() : "";
};

const formatDate = (value?: string | null) => {
  if (!value) return "Неодамна додадено";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "Неодамна додадено";
  return parsed.toLocaleDateString('mk-MK', { day: "2-digit", month: "short", year: "numeric" });
};

const StoryRow = ({ post, index }: { post: any; index: number }) => {
  const teaserText = getTeaserText(post);
  const categoryLabel = CATEGORY_LABELS[post?.category] ?? post?.category ?? "Сите";

  return (
    <a href={post.link} target="_blank" className="group block px-4 py-5 md:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-6">
        <div className="flex items-center gap-3 sm:w-32">
          <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-neutral-400">
            #{String(index + 1).padStart(2, "0")}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600">
            {post.source}
          </span>
        </div>

        <div className="flex-1">
          <div className="flex items-start gap-3 justify-between">
            <h3 className="font-serif text-xl md:text-2xl font-bold leading-snug group-hover:text-neutral-600 transition-colors">
              {post.title}
            </h3>
            <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-full px-2 py-1 flex-shrink-0">
              {categoryLabel}
            </span>
          </div>

          <p className="text-sm text-neutral-700 font-mono uppercase tracking-[0.25em] line-clamp-2 mt-2">
            {teaserText}
          </p>

          <div className="mt-3 flex items-center gap-3 text-[11px] text-neutral-500">
            <span className="h-[1px] w-10 bg-neutral-300" />
            <span className="font-mono">{formatDate(post?.published_at)}</span>
            <span className="font-mono text-neutral-400 group-hover:text-neutral-700 transition-colors">
              Прочитај го написот →
            </span>
          </div>
        </div>
      </div>
    </a>
  );
};

const EmptyState = () => (
  <div className="py-16 px-6 text-center border border-dashed border-neutral-300 bg-white/60">
    <h2 className="font-serif text-3xl font-bold mb-2 text-neutral-800">Сè уште нема приказни</h2>
    <p className="text-neutral-600 font-sans">
      Следете нè тука додека ги собираме сите наслови од сите категории.
    </p>
  </div>
);

export default async function AllStoriesPage() {
  const { data: posts } = await supabaseServer
    .from('posts')
    .select('*')
    .order('published_at', { ascending: false })
    .limit(80);

  const allPosts = posts || [];
  const storiesLabel = allPosts.length === 1 ? "приказна" : "приказни";

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <NavBar />
      <CategoryNav activeCategory={null} isAllPage />

      <div className="max-w-[1200px] mx-auto px-4 md:px-8 pt-10">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between mb-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-neutral-500">Сите приказни</p>
            <h1 className="font-serif text-4xl md:text-5xl font-black leading-tight">
              Сите приказни во еден простор
            </h1>
          </div>
          <div className="text-xs font-mono uppercase tracking-[0.3em] text-neutral-600">
            {allPosts.length} {storiesLabel}
          </div>
        </div>

        {allPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bg-white/70 border border-neutral-200 shadow-[6px_6px_0_#000] rounded-sm">
            <div className="divide-y divide-neutral-200">
              {allPosts.map((post, index) => (
                <StoryRow key={post.id ?? `${post.source}-${index}`} post={post} index={index} />
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
