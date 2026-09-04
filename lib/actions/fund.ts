"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireOffice } from "@/lib/permissions";
import type { EscrowStatus } from "@prisma/client";

/**
 * The งานภัทร welfare fund.
 *
 * Income is derived, not stored. Summing platformFee across completed orders
 * means the figure is always the truth and no history had to be back-filled
 * when the fund was introduced. Only money leaving the fund — equipment, a
 * repair, a correction — gets a row, because that is the part nothing else in
 * the database knows about.
 */

export type ActionResult =
  | { success: true;  message: string; id?: string }
  | { success: false; error: string };

/** Marketplace orders where the platform fee was actually earned. */
const EARNED_ESCROW: EscrowStatus[] = [
  "COMPLETED", "MEETUP_COMPLETED", "MEETUP_CASH_COMPLETED", "COD_DELIVERED",
];

export interface FundSummary {
  /** All platform fees ever earned — the fund's entire income. */
  incomeTotal:    number;
  incomeFromSales:   number;
  incomeFromRentals: number;
  /** Money spent out of the fund. */
  spentTotal:     number;
  /** Donations and positive adjustments. */
  otherIn:        number;
  balance:        number;
  /** What the money turned into. */
  itemsBought:    number;
  itemsTotal:     number;
  timesLent:      number;
}

export async function getFundSummary(): Promise<FundSummary> {
  const [sales, rentals, out, extraIn, itemsBought, itemsTotal, timesLent] = await Promise.all([
    prisma.escrowOrder.aggregate({
      where: { status: { in: EARNED_ESCROW } },
      _sum:  { platformFee: true },
    }),
    prisma.rentalOrder.aggregate({
      where: { status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] } },
      _sum:  { platformFee: true },
    }),
    prisma.fundEntry.aggregate({ where: { kind: "OUT" }, _sum: { amount: true } }),
    prisma.fundEntry.aggregate({ where: { kind: "IN"  }, _sum: { amount: true } }),
    prisma.lendingItem.count({ where: { fundEntryId: { not: null } } }),
    prisma.lendingItem.count(),
    prisma.lendingOrder.count({
      where: { status: { in: ["COMPLETED", "COMPLETED_WITH_DEDUCTION"] } },
    }),
  ]);

  const incomeFromSales   = sales._sum.platformFee   ?? 0;
  const incomeFromRentals = rentals._sum.platformFee ?? 0;
  const incomeTotal = incomeFromSales + incomeFromRentals;
  const spentTotal  = out._sum.amount     ?? 0;
  const otherIn     = extraIn._sum.amount ?? 0;

  return {
    incomeTotal, incomeFromSales, incomeFromRentals,
    spentTotal, otherIn,
    balance: incomeTotal + otherIn - spentTotal,
    itemsBought, itemsTotal, timesLent,
  };
}

/** The public version — three numbers, nothing that identifies anybody. */
export async function getPublicFundStats() {
  const s = await getFundSummary();
  return {
    raised:      s.incomeTotal + s.otherIn,
    itemsTotal:  s.itemsTotal,
    timesLent:   s.timesLent,
  };
}

export async function getFundEntries() {
  await requireOffice();

  const entries = await prisma.fundEntry.findMany({
    orderBy: { occurredAt: "desc" },
    take: 100,
    include: {
      recordedBy: { select: { name: true } },
      items:      { select: { id: true, title: true } },
    },
  });

  return entries.map((e) => ({
    id:         e.id,
    kind:       e.kind,
    source:     e.source,
    amount:     e.amount,
    note:       e.note,
    receiptUrl: e.receiptUrl,
    occurredAt: e.occurredAt.toISOString(),
    recordedBy: e.recordedBy.name,
    items:      e.items,
  }));
}

const EntrySchema = z.object({
  kind:       z.enum(["IN", "OUT"]),
  source:     z.enum(["PURCHASE", "MAINTENANCE", "DONATION", "ADJUSTMENT"]),
  amount:     z.number().positive("จำนวนเงินต้องมากกว่า 0"),
  note:       z.string().trim().min(2, "กรุณาระบุรายละเอียด").max(500),
  receiptUrl: z.string().trim().optional().or(z.literal("")),
  occurredAt: z.string().optional(),
});

export type FundEntryInput = z.infer<typeof EntrySchema>;

export async function recordFundEntry(input: FundEntryInput): Promise<ActionResult> {
  try {
    const staff  = await requireOffice();
    const parsed = EntrySchema.parse(input);

    // Spending more than the fund holds is almost always a typo, and letting it
    // through means the balance on the public page goes negative.
    if (parsed.kind === "OUT") {
      const { balance } = await getFundSummary();
      if (parsed.amount > balance) {
        return {
          success: false,
          error: `กองทุนคงเหลือ ฿${balance.toLocaleString("th-TH", { maximumFractionDigits: 2 })} ไม่พอสำหรับรายการนี้`,
        };
      }
    }

    const entry = await prisma.fundEntry.create({
      data: {
        kind:         parsed.kind,
        source:       parsed.source,
        amount:       parsed.amount,
        note:         parsed.note,
        receiptUrl:   parsed.receiptUrl || null,
        occurredAt:   parsed.occurredAt ? new Date(parsed.occurredAt) : new Date(),
        recordedById: staff.id,
      },
      select: { id: true },
    });

    revalidatePath("/pattara/fund");
    revalidatePath("/admin/fund");
    revalidatePath("/borrow");
    return { success: true, message: "บันทึกรายการกองทุนแล้ว", id: entry.id };
  } catch (e) {
    if (e instanceof z.ZodError) return { success: false, error: e.issues[0].message };
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

export async function deleteFundEntry(id: string): Promise<ActionResult> {
  try {
    await requireOffice();

    const linked = await prisma.lendingItem.count({ where: { fundEntryId: id } });
    if (linked > 0) {
      return {
        success: false,
        error: "รายการนี้ผูกกับอุปกรณ์ในคลังอยู่ ต้องปลดการเชื่อมโยงก่อน",
      };
    }

    await prisma.fundEntry.delete({ where: { id } });
    revalidatePath("/pattara/fund");
    revalidatePath("/admin/fund");
    return { success: true, message: "ลบรายการแล้ว" };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "เกิดข้อผิดพลาด" };
  }
}

/** Purchase records an item can be attached to, newest first. */
export async function getPurchaseOptions() {
  await requireOffice();

  const entries = await prisma.fundEntry.findMany({
    where: { kind: "OUT", source: "PURCHASE" },
    orderBy: { occurredAt: "desc" },
    take: 40,
    select: { id: true, note: true, amount: true, occurredAt: true },
  });

  return entries.map((e) => ({
    id: e.id,
    label: `${e.note} · ฿${e.amount.toLocaleString("th-TH")} · ${e.occurredAt.toLocaleDateString("th-TH")}`,
  }));
}
