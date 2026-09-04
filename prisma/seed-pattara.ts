/**
 * Creates the งานภัทร office account and a starter shelf.
 *
 * Run once:  npx tsx prisma/seed-pattara.ts
 *
 * Safe to run twice — everything is upserted by a natural key, so a second run
 * updates rather than duplicates. No FundEntry is written: the fund's spending
 * total should only ever reflect real purchases, so it stays at zero until
 * somebody records one through /pattara/fund.
 */

import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcryptjs from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const OFFICE_EMAIL = "pattara@psu.ac.th";
const OFFICE_PASSWORD = "pattara";

const STARTER_ITEMS = [
  {
    assetTag: "PSU-CAL-001",
    title: "เครื่องคิดเลขวิทยาศาสตร์ Casio fx-991EX",
    description: "เครื่องคิดเลขวิทยาศาสตร์สำหรับวิชาคำนวณ ใช้ได้ในห้องสอบ กรุณาคืนพร้อมฝาครอบ",
    category: "STUDY_SUPPLIES" as const,
    condition: "GOOD" as const,
    maxLendingDays: 14,
    purchasePrice: 950,
  },
  {
    assetTag: "PSU-LAB-004",
    title: "เสื้อกาวน์แล็บ ไซส์ M",
    description: "เสื้อกาวน์สำหรับวิชาปฏิบัติการเคมีและชีววิทยา ซักสะอาดแล้ว",
    category: "LAB_EQUIPMENT" as const,
    condition: "LIKE_NEW" as const,
    maxLendingDays: 14,
    purchasePrice: 420,
  },
  {
    assetTag: "PSU-PRJ-002",
    title: "โปรเจกเตอร์พกพา Epson EF-12",
    description: "สำหรับนำเสนองานกลุ่มหรือกิจกรรมชมรม มีสาย HDMI และสายไฟให้ครบชุด",
    category: "ELECTRONICS" as const,
    condition: "GOOD" as const,
    maxLendingDays: 7,
    purchasePrice: 12900,
  },
  {
    assetTag: "PSU-SPT-011",
    title: "ไม้แบดมินตัน Yonex (คู่)",
    description: "ไม้แบดมินตัน 2 อัน พร้อมกระเป๋า ลูกขนไก่ไม่รวมในชุดยืม",
    category: "SPORTS" as const,
    condition: "FAIR" as const,
    maxLendingDays: 7,
    purchasePrice: 1600,
  },
];

async function main() {
  const hash = await bcryptjs.hash(OFFICE_PASSWORD, 10);

  const office = await prisma.user.upsert({
    where: { email: OFFICE_EMAIL },
    update: {
      role:              "PATTARA",
      officeName:        "งานภัทร มหาวิทยาลัยสงขลานครินทร์",
      officeDescription:
        "หน่วยงานสวัสดิการนักศึกษา ให้ยืมอุปกรณ์การเรียนและอุปกรณ์กิจกรรมโดยไม่มีค่าใช้จ่าย " +
        "อุปกรณ์ทั้งหมดจัดซื้อจากค่าธรรมเนียมที่ PSU Store เก็บได้จากการซื้อขายและการเช่าในระบบ",
      officeLocation:    "อาคารกิจการนักศึกษา ชั้น 1 ห้อง 105",
      officeHours:       "จันทร์–ศุกร์ 08:30–16:30 (พักเที่ยง 12:00–13:00)",
    },
    create: {
      email:             OFFICE_EMAIL,
      name:              "งานภัทร",
      password:          hash,
      role:              "PATTARA",
      verificationStatus: "APPROVED",
      officeName:        "งานภัทร มหาวิทยาลัยสงขลานครินทร์",
      officeDescription:
        "หน่วยงานสวัสดิการนักศึกษา ให้ยืมอุปกรณ์การเรียนและอุปกรณ์กิจกรรมโดยไม่มีค่าใช้จ่าย " +
        "อุปกรณ์ทั้งหมดจัดซื้อจากค่าธรรมเนียมที่ PSU Store เก็บได้จากการซื้อขายและการเช่าในระบบ",
      officeLocation:    "อาคารกิจการนักศึกษา ชั้น 1 ห้อง 105",
      officeHours:       "จันทร์–ศุกร์ 08:30–16:30 (พักเที่ยง 12:00–13:00)",
    },
    select: { id: true, email: true },
  });

  console.log(`office account: ${office.email} (${office.id})`);

  for (const item of STARTER_ITEMS) {
    const existing = await prisma.lendingItem.findUnique({
      where: { assetTag: item.assetTag }, select: { id: true },
    });

    if (existing) {
      await prisma.lendingItem.update({
        where: { id: existing.id },
        data: { ...item, ownerId: office.id, meetupLocations: ["อาคารกิจการนักศึกษา ชั้น 1 ห้อง 105"] },
      });
      console.log(`  updated  ${item.assetTag}  ${item.title}`);
    } else {
      await prisma.lendingItem.create({
        data: {
          ...item,
          ownerId: office.id,
          status: "AVAILABLE",
          minLendingDays: 1,
          isRenewable: true,
          maxRenewals: 1,
          images: [],
          tags: [],
          meetupLocations: ["อาคารกิจการนักศึกษา ชั้น 1 ห้อง 105"],
          purchasedAt: new Date(),
        },
      });
      console.log(`  created  ${item.assetTag}  ${item.title}`);
    }
  }

  const total = await prisma.lendingItem.count({ where: { ownerId: office.id } });
  console.log(`\nshelf now holds ${total} items`);
  console.log(`sign in as ${OFFICE_EMAIL} / ${OFFICE_PASSWORD}`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => { console.error(e); process.exit(1); });
