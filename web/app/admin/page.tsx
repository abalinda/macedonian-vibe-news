import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { NavBar, CategoryNav } from "../_components/navigation";
import { isAdminEmail } from "@/lib/admins";
import { AdminHeroManager } from "./admin-hero-manager";

export const metadata = {
  title: "Admin | Vibes",
  description: "Управувај со hero приказните и рачни override-и.",
};

export default async function AdminPage() {
  const headerList = await headers();
  const host = headerList.get("host") || "";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");

  if (!isLocal) {
    const user = await currentUser();
    const email =
      user?.primaryEmailAddress?.emailAddress ||
      user?.emailAddresses?.[0]?.emailAddress ||
      null;

    if (!email || !isAdminEmail(email)) {
      redirect("/");
    }
  }

  return (
    <main className="min-h-screen bg-[#FDFBF7] text-neutral-900">
      <NavBar />
      <CategoryNav activeCategory={null} />

      <div className="max-w-5xl mx-auto px-4 md:px-8 pt-10 pb-16 space-y-8">
        <header className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-[#002CFF]">
            Админ панел
          </p>
          <h1 className="font-serif text-4xl font-black leading-tight">
            Hero контролна табла
          </h1>
          <p className="text-base font-serif text-neutral-700 leading-relaxed">
            Видливи се тековните hero приказни, нивната возраст и заклучен статус. Ако не се поминати 4 часа, ќе добиеш предупредување пред да препишеш.
          </p>
        </header>

        <AdminHeroManager isLocal={isLocal} />
      </div>
    </main>
  );
}
