import { redirect } from "next/navigation";
import { CategoryNav, NavBar } from "../../_components/navigation";
import { getAdmin } from "@/lib/blog-admin";
import { BlogAdminList } from "./blog-admin-list";

export const dynamic = "force-dynamic";
export const metadata = { title: "Блог објави | VIBES", robots: { index: false } };

export default async function BlogAdminPage() {
  if (!(await getAdmin())) redirect("/");

  return (
    <main className="min-h-screen bg-paper text-ink pb-20">
      <NavBar />
      <CategoryNav activeCategory="Blog" />
      <div className="mx-auto max-w-3xl space-y-8 px-4 pt-8 md:px-8">
        <header className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-link">Админ панел</p>
          <h1 className="font-serif text-4xl font-black leading-tight">Блог објави</h1>
        </header>
        <BlogAdminList />
      </div>
    </main>
  );
}
