import { CategoryNav, NavBar } from "../../_components/navigation";
import { BlogComposer } from "./composer";
import { currentUser } from "@clerk/nextjs/server";
import { isAdminEmail } from "@/lib/admins";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Нова блог објава | VIBES",
  description: "Креирај нова блог објава за Vibes.",
};

export default async function NewBlogPage() {
  const user = await currentUser();
  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    null;

  if (!email || !isAdminEmail(email)) {
    redirect("/");
  }

  const defaultAuthor =
    user?.fullName || user?.username || user?.firstName || email;

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900 pb-20">
      <NavBar />
      <CategoryNav activeCategory="Blog" />

      <div className="max-w-4xl mx-auto px-4 md:px-8 pt-10">
        <header className="mb-8 space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-link">
            Админ панел
          </p>
          <h1 className="font-serif text-4xl font-black leading-tight">
            Нова блог објава
          </h1>
          <p className="font-serif text-base text-neutral-700 leading-relaxed">
            Креирај блог содржина директно од Vibes фронтпејџ. Содржината ќе се
            зачува веднаш во базата.
          </p>
        </header>

        <BlogComposer defaultAuthor={defaultAuthor || ""} />
      </div>
    </main>
  );
}
