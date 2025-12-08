'use client'

import { useEffect, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/clerk-react";
import { usePathname, useSearchParams } from "next/navigation";
import { isAdminEmail } from "@/lib/admins";

export const AdminBlogCTA = () => {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isLocal, setIsLocal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const host = window.location.hostname;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsLocal(host === "localhost");
  }, []);

  const email =
    user?.primaryEmailAddress?.emailAddress ||
    user?.emailAddresses?.[0]?.emailAddress ||
    "";

  const isBlogCategory =
    pathname === "/" && searchParams.get("category") === "Blog";

  if (!isBlogCategory) return null;
  if (!isLocal && !isAdminEmail(email)) return null;
  if (!isLoaded) return null;

  return (
    <div className="max-w-[1400px] mx-auto px-4 md:px-8 mt-4">
      <Link
        href="/blog/new"
        className="inline-flex items-center gap-2 border border-black px-4 py-2 text-[11px] font-bold uppercase tracking-[0.3em] bg-white hover:bg-black hover:text-white transition-all shadow-[6px_6px_0_#0000000f]"
      >
        + Додај блог објава
      </Link>
    </div>
  );
};
