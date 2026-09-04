import { GENERATED_PASSWORD_NOTICE } from "@/lib/utils/generate-password";

/**
 * Which preference switch governs each notification type.
 * SYSTEM has none — account and security notices always go out.
 */
const TYPE_PREFERENCE: Record<string, "notifyOrders" | "notifyMessages" | "notifyItemUpdates" | undefined> = {
  ORDER:      "notifyOrders",
  MESSAGE:    "notifyMessages",
  MODERATION: "notifyItemUpdates",
  SYSTEM:     undefined,
};

/** Only the preference fields this decision reads. */
export type NotifyPreferences = {
  emailNotifications: boolean;
  notifyOrders:       boolean;
  notifyMessages:     boolean;
  notifyItemUpdates:  boolean;
};

export type MailDecision =
  | { email: true }
  | { email: false; reason: "no-address" | "duplicate-credentials" | "opted-out" | "type-muted" };

/**
 * Decides whether one notification should also be delivered by e-mail.
 *
 * Pure and exported so the rules can be checked directly rather than inferred
 * from whether a message showed up in someone's inbox.
 */
export function decideNotificationEmail(input: {
  email: string | null | undefined;
  type: string;
  message: string;
  /** null when the user has no preferences row yet — defaults opt them in. */
  preferences: NotifyPreferences | null | undefined;
}): MailDecision {
  if (!input.email) return { email: false, reason: "no-address" };

  // The welcome mail already carries these credentials — don't send them twice.
  if (input.message.includes(GENERATED_PASSWORD_NOTICE)) {
    return { email: false, reason: "duplicate-credentials" };
  }

  const prefs = input.preferences;
  if (!prefs) return { email: true }; // no row yet = defaults = opted in

  if (!prefs.emailNotifications) return { email: false, reason: "opted-out" };

  const key = TYPE_PREFERENCE[input.type];
  if (key && prefs[key] === false) return { email: false, reason: "type-muted" };

  return { email: true };
}
