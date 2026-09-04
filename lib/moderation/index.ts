import { prisma } from "@/lib/prisma";
import { scoreListing, type ListingContent, type SafetyResult } from "./safety-score";

export { scoreListing };
export type { ModerationVerdict, SafetyResult } from "./safety-score";

/** Item status each verdict maps to. */
const VERDICT_STATUS = {
  AUTO_APPROVE:   "APPROVED",
  PENDING_REVIEW: "PENDING",
  AUTO_REJECT:    "REJECTED",
} as const;

/**
 * Scores a listing and writes the verdict onto it.
 *
 * Runs after the item row exists, so a scoring failure can never lose a
 * listing: the item simply stays PENDING and an admin sees it as before.
 *
 * Only the wording is judged — uploaded photographs are not inspected. A
 * listing can therefore be auto-approved on clean text while carrying an
 * unacceptable image, which is why admins keep the moderation queue and the
 * ability to take a published listing down.
 */
export async function moderateItem(itemId: string, content: ListingContent) {
  let result: SafetyResult;
  try {
    result = scoreListing(content);
  } catch (e) {
    console.warn("[moderation] scoring failed, leaving item pending:", e);
    return null;
  }

  const status = VERDICT_STATUS[result.verdict];
  const reason = result.reasons.join(" · ");

  try {
    await prisma.item.update({
      where: { id: itemId },
      data: {
        status,
        safetyScore:       result.score,
        moderationVerdict: result.verdict,
        moderationReason:  reason,
        moderatedAt:       new Date(),
        // Only an automatic rejection fills rejectReason; approving clears it.
        rejectReason: result.verdict === "AUTO_REJECT" ? reason : null,
      },
    });
  } catch (e) {
    console.warn("[moderation] could not store verdict:", e);
    return null;
  }

  // Tell the seller what happened — silence on an auto-rejection would just
  // look like the listing vanished.
  const item = await prisma.item.findUnique({
    where:  { id: itemId },
    select: { sellerId: true, title: true },
  });

  if (item) {
    if (result.verdict === "AUTO_APPROVE") {
      await prisma.notification.create({
        data: {
          userId:  item.sellerId,
          type:    "MODERATION",
          message: `ประกาศ "${item.title}" ผ่านการตรวจสอบอัตโนมัติและเผยแพร่แล้ว`,
          link:    "/dashboard/my-items",
        },
      });
    } else if (result.verdict === "AUTO_REJECT") {
      await prisma.notification.create({
        data: {
          userId:  item.sellerId,
          type:    "MODERATION",
          message: `ประกาศ "${item.title}" ถูกปฏิเสธโดยระบบตรวจสอบอัตโนมัติ: ${reason} — แก้ไขข้อความแล้วส่งใหม่ได้`,
          link:    "/dashboard/my-items",
        },
      });
    }
    // PENDING_REVIEW stays quiet: nothing has been decided yet.
  }

  return result;
}
