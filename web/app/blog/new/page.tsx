import { redirect } from "next/navigation";

// The composer moved to the drafts-based admin editor.
export default function NewBlogPage() {
  redirect("/admin/blog");
}
