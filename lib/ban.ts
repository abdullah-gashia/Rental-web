/**
 * Whether a ban is still in force.
 *
 * `isBanned` on its own is not the answer once bans can expire: a three-day
 * ban set a month ago still has the flag set. Everything that gates on a ban
 * asks here instead, so a ban cannot quietly outlive its length in one place
 * while lifting correctly in another.
 */

export interface BanState {
  isBanned: boolean;
  banUntil?: Date | string | null;
}

export function isBanActive(user: BanState | null | undefined): boolean {
  if (!user?.isBanned) return false;
  if (!user.banUntil) return true;                 // until an admin lifts it
  return new Date(user.banUntil).getTime() > Date.now();
}

/** How long a ban runs. `null` days means it stands until lifted. */
export const BAN_DURATIONS = [
  { key: "3d",    days: 3,    label: "3 วัน" },
  { key: "1w",    days: 7,    label: "1 สัปดาห์" },
  { key: "1m",    days: 30,   label: "1 เดือน" },
  { key: "until", days: null, label: "จนกว่าจะปลด" },
] as const;

export type BanDurationKey = (typeof BAN_DURATIONS)[number]["key"];

export function banExpiryFor(key: BanDurationKey): Date | null {
  const found = BAN_DURATIONS.find((d) => d.key === key);
  if (!found || found.days === null) return null;
  return new Date(Date.now() + found.days * 24 * 60 * 60 * 1000);
}
