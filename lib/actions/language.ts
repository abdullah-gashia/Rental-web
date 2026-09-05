"use server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Remember the language on the account as well as in the cookie.
 *
 * The cookie is what a server render reads, and it lives in one browser. The
 * account is what the settings page shows. If the header switch wrote only the
 * cookie, the two would disagree: the page would be in English and the
 * settings radio would still say Thai, which is exactly the sort of thing that
 * makes a setting look broken.
 *
 * Nothing here is required for the switch to work, so a signed-out reader or a
 * database that is briefly unhappy just means the choice stays in the cookie.
 */
export async function rememberLanguage(locale: "th" | "en"): Promise<void> {
  try {
    const session = await auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return;

    await prisma.userPreferences.upsert({
      where:  { userId },
      create: { userId, language: locale },
      update: { language: locale },
    });
  } catch {
    // The cookie already carries the choice; this is only the durable copy.
  }
}
