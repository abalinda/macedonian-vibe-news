'use server';

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { isCategory } from "@/lib/categories";
import { getJars, reseedJars } from "@/lib/personalization-db";
import type { Jar } from "@/lib/personalization";

export type PreferencesState = { hasPrefs: boolean; jars: Jar[] };

export async function getPreferences(): Promise<PreferencesState | null> {
  const { userId } = await auth();
  if (!userId) return null;
  try {
    const jars = await getJars(userId);
    return { hasPrefs: jars.length > 0, jars };
  } catch (error) {
    console.error("getPreferences failed:", error);
    return null;
  }
}

// Wizard save. Reseeds all six jars — this is also the learning reset.
export async function savePreferences(picked: string[]): Promise<{ ok: boolean; error?: string }> {
  const { userId } = await auth();
  if (!userId) return { ok: false, error: "unauthenticated" };

  const unique = Array.from(new Set(picked));
  if (unique.length === 0) return { ok: false, error: "empty" };
  if (!unique.every(isCategory)) return { ok: false, error: "invalid-category" };

  try {
    await reseedJars(userId, unique);
    revalidatePath("/za-tebe");
    revalidatePath("/profil");
    return { ok: true };
  } catch (error) {
    console.error("savePreferences failed:", error);
    return { ok: false, error: "db" };
  }
}
