'use server';

import { turso } from "@/lib/turso";
import { buildSearchVariants } from "@/lib/transliterate";

const WEIGHTS = {
  title: 100,
  teaser: 20,
  source: 5,
  summary: 1
};

const MIN_SEARCH_LENGTH = 2;

export type SearchResult = {
  id: number;
  title: string;
  category: string | null;
  source: string | null;
  published_at: string | null;
  scraped_at: string | null;
  teaser: string | null;
  summary: string | null;
  image_url: string | null;
  link: string | null;
  relevance: number;
};

export type SearchRequest = {
  query: string;
  limit?: number;
  category?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

export async function searchPosts(input: SearchRequest): Promise<SearchResult[]> {
  const {
    query,
    limit = 20,
    category = null,
    fromDate = null,
    toDate = null,
  } = input;

  const normalizedQuery = (query ?? "").trim();
  if (normalizedQuery.length < MIN_SEARCH_LENGTH) return [];

  const variants = buildSearchVariants(normalizedQuery);
  if (variants.length === 0) return [];

  const args: (string | number)[] = [];
  const whereConditions: string[] = [];
  const scoreCases: string[] = [];

  // --- CHANGED LOGIC HERE ---
  // We removed LOWER(). We now rely on the variants having the correct casing.
  // SQLite LIKE is case-sensitive for Unicode, so 'Македонија' matches 'Македонија'
  
  variants.forEach((variant) => {
    const pattern = `%${variant}%`;
    
    // RELEVANCE SCORE
    // We check exact case matches against the DB
    scoreCases.push(`(CASE WHEN title LIKE ? THEN ${WEIGHTS.title} ELSE 0 END)`);
    args.push(pattern);
    
    scoreCases.push(`(CASE WHEN teaser LIKE ? THEN ${WEIGHTS.teaser} ELSE 0 END)`);
    args.push(pattern);
    
    scoreCases.push(`(CASE WHEN source LIKE ? THEN ${WEIGHTS.source} ELSE 0 END)`);
    args.push(pattern);

    scoreCases.push(`(CASE WHEN summary LIKE ? THEN ${WEIGHTS.summary} ELSE 0 END)`);
    args.push(pattern);
  });

  const relevanceClause = `(${scoreCases.join(" + ")}) as relevance`;

  // FILTERING
  const orConditions: string[] = [];
  variants.forEach((variant) => {
    const pattern = `%${variant}%`;
    
    // Check main fields without LOWER()
    orConditions.push(`title LIKE ?`);
    args.push(pattern);
    orConditions.push(`teaser LIKE ?`);
    args.push(pattern);
    orConditions.push(`summary LIKE ?`);
    args.push(pattern);
    orConditions.push(`source LIKE ?`);
    args.push(pattern);
  });
  
  whereConditions.push(`(${orConditions.join(" OR ")})`);

  if (category) {
    whereConditions.push("category = ?");
    args.push(category);
  }
  if (fromDate) {
    whereConditions.push("date(published_at) >= ?");
    args.push(fromDate);
  }
  if (toDate) {
    whereConditions.push("date(published_at) <= ?");
    args.push(toDate);
  }

  const sql = `
    SELECT 
      id, title, category, source, published_at, scraped_at, 
      teaser, summary, image_url, link,
      ${relevanceClause}
    FROM posts
    WHERE ${whereConditions.join(" AND ")}
    ORDER BY relevance DESC, COALESCE(published_at, scraped_at) DESC
    LIMIT ?
  `;
  
  args.push(limit);

  try {
    const result = await turso.execute({ sql, args });
    
    return result.rows.map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: Number(r.id),
        title: String(r.title ?? ""),
        category: (r.category as string | null) ?? null,
        source: (r.source as string | null) ?? null,
        published_at: (r.published_at as string | null) ?? null,
        scraped_at: (r.scraped_at as string | null) ?? null,
        teaser: (r.teaser as string | null) ?? null,
        summary: (r.summary as string | null) ?? null,
        image_url: (r.image_url as string | null) ?? null,
        link: (r.link as string | null) ?? null,
        relevance: Number(r.relevance ?? 0),
      };
    });
  } catch (error) {
    console.error("Search action failed:", error);
    return [];
  }
}