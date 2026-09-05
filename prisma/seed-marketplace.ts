/**
 * Puts the catalogue on the market, fifty listings per seller.
 *
 * Run:  npx tsx prisma/seed-marketplace.ts
 *
 * Keyed on title plus seller, so running it twice updates rather than
 * duplicates. There is no natural key on an Item the way an asset tag is a
 * natural key on a piece of equipment, and a title is what a person would
 * recognise as "the same listing".
 *
 * Everything lands APPROVED so the marketplace is populated straight away.
 * Nothing goes into the approval queue: post one through the UI when you want
 * something to review there.
 *
 * No photos — those get added by hand. Each row carries an emoji and the card
 * falls back to it, so the grid still reads properly meanwhile.
 */

import "dotenv/config";   // DATABASE_URL lives in .env, not the shell
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { CATALOGUE } from "./data/marketplace-catalogue";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

/** The ten seller accounts, in the order listings are dealt out to them. */
const SELLERS = [
  "supassara.w@psu.ac.th",
  "arthit.c@psu.ac.th",
  "jirapat.t@psu.ac.th",
  "chayanis.n@psu.ac.th",
  "nattapong.k@psu.ac.th",
  "somchai.p@psu.ac.th",
  "kanya.s@psu.ac.th",
  "phuwadol.m@psu.ac.th",
  "siriporn.v@psu.ac.th",
  "thanawat.r@psu.ac.th",
];

/** Somewhere on campus to hand the thing over. */
const PLACES = [
  "หอ 1", "หอ 2", "หอ 3", "หอ 4", "หอ 5", "หอ 6", "หอ 7", "หอ 8", "หอ 9",
  "CoC", "SC", "ENG", "PE", "โรงอาหาร 1", "โรงอาหาร 2",
  "หน้าหอสมุดกลาง", "ลานจอดรถตึก A", "อาคารกิจการนักศึกษา",
];

/** A colour for the card behind the emoji, so the grid is not all one shade. */
const COLORS = [
  "#dbeafe", "#e0e7ff", "#ede9fe", "#fce7f3", "#fee2e2", "#fff7ed",
  "#fef3c7", "#fef9c3", "#ecfdf5", "#d1fae5", "#f1f5f9", "#e8e5df",
];

async function main() {
  const sellers = await prisma.user.findMany({
    where: { email: { in: SELLERS } },
    select: { id: true, email: true },
  });

  const missing = SELLERS.filter((e) => !sellers.some((s) => s.email === e));
  if (missing.length) {
    throw new Error("no account for: " + missing.join(", "));
  }

  // Deal in the order given, not the order the database returned them.
  const ordered = SELLERS.map((email) => sellers.find((s) => s.email === email)!);

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  const catId = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  const unknown = [...new Set(CATALOGUE.map((r) => r[2]))].filter((s) => !catId[s]);
  if (unknown.length) {
    throw new Error("no category for: " + unknown.join(", "));
  }

  let created = 0;
  let updated = 0;

  for (let i = 0; i < CATALOGUE.length; i += 1) {
    const [title, price, catSlug, condition, emoji, description] = CATALOGUE[i];
    const seller = ordered[i % ordered.length];
    const isRental = catSlug === "rental";

    const shape = {
      title,
      description,
      price,
      emoji,
      color: COLORS[i % COLORS.length],
      condition,
      status: "APPROVED" as const,
      listingType: (isRental ? "RENT" : "SELL") as "RENT" | "SELL",
      location: PLACES[i % PLACES.length],
      // Cheap things are worth haggling over less often than expensive ones.
      negotiable: price >= 300,
      shippable: !isRental && price < 5000,
      allowShipping: !isRental && price < 5000,
      allowMeetup: true,
      allowCOD: !isRental,
      categoryId: catId[catSlug],
      sellerId: seller.id,

      // A rental row's price is per day; the deposit is ten days of it, which
      // is roughly what an owner would want held against the thing coming back.
      ...(isRental
        ? {
            rentalRateType: "DAILY" as const,
            rentalRate: price,
            dailyRate: price,
            securityDeposit: Math.round((price * 10) / 100) * 100,
            minRentalDays: 1,
            maxRentalDays: 30,
            lateFeePerDay: Math.round(price / 10),
            isRenewable: true,
            maxRenewals: 1,
          }
        : {}),
    };

    const existing = await prisma.item.findFirst({
      where: { title, sellerId: seller.id },
      select: { id: true },
    });

    if (existing) {
      await prisma.item.update({ where: { id: existing.id }, data: shape });
      updated += 1;
    } else {
      await prisma.item.create({ data: shape });
      created += 1;
    }
  }

  console.log(`${created} created, ${updated} updated\n`);

  const perSeller = await prisma.item.groupBy({
    by: ["sellerId"],
    _count: true,
  });
  const nameOf = Object.fromEntries(ordered.map((s) => [s.id, s.email]));
  console.log("listings per seller");
  for (const row of perSeller.sort((a, b) => (nameOf[a.sellerId] ?? "").localeCompare(nameOf[b.sellerId] ?? ""))) {
    console.log("  " + (nameOf[row.sellerId] ?? row.sellerId).padEnd(26) + row._count);
  }

  const perType = await prisma.item.groupBy({ by: ["listingType"], _count: true });
  console.log("\nby listing type");
  for (const row of perType) console.log("  " + row.listingType.padEnd(26) + row._count);

  console.log("\n" + (await prisma.item.count()) + " listings on the market, all APPROVED, no photos yet");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
