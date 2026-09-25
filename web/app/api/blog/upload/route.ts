import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { forbidden, getAdmin } from "@/lib/blog-admin";

export const dynamic = "force-dynamic";

const PUBLIC_BASE = "https://img.vibes.mk"; // custom domain of the vibes-blog-images R2 bucket
const MAX_BYTES = 8 * 1024 * 1024;
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

type R2Put = { put(key: string, value: ArrayBuffer, opts?: unknown): Promise<unknown> };

// Admin image upload -> R2. Returns the public URL to store in cover_url / <img src>.
export async function POST(request: Request) {
  if (!(await getAdmin())) return forbidden();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Нема датотека." }, { status: 400 });

  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: "Дозволени се само JPG, PNG, WebP и GIF." }, { status: 415 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "Сликата е поголема од 8 MB." }, { status: 413 });

  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { BLOG_IMAGES?: R2Put }).BLOG_IMAGES;
  if (!bucket) return NextResponse.json({ error: "R2 не е конфигуриран." }, { status: 500 });

  const key = `blog/${crypto.randomUUID()}.${ext}`;
  await bucket.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
  });

  return NextResponse.json({ url: `${PUBLIC_BASE}/${key}` });
}
