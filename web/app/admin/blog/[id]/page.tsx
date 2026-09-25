import { notFound, redirect } from "next/navigation";
import { getAdmin, getDraft } from "@/lib/blog-admin";
import { BlogEditor } from "./editor";

export const dynamic = "force-dynamic";
export const metadata = { title: "Уредувач | VIBES", robots: { index: false } };

export default async function BlogDraftPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await getAdmin())) redirect("/");
  const draft = await getDraft(Number((await params).id));
  if (!draft) notFound();
  return <BlogEditor initial={draft} />;
}
