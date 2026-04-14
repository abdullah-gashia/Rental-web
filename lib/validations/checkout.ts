import { z } from "zod/v4";

// ─── Shipping Address Schema ─────────────────────────────────────────────────

export const ShippingAddressSchema = z.object({
  recipientName: z.string().min(2, "กรุณากรอกชื่อผู้รับ").max(100),
  phone: z.string().regex(/^0\d{9}$/, "เบอร์โทรไม่ถูกต้อง"),
  addressLine1: z.string().min(5, "กรุณากรอกที่อยู่").max(200),
  addressLine2: z.string().max(200).optional(),
  district: z.string().min(1, "กรุณากรอกอำเภอ/เขต"),
  province: z.string().min(1, "กรุณาเลือกจังหวัด"),
  postalCode: z.string().regex(/^\d{5}$/, "รหัสไปรษณีย์ไม่ถูกต้อง"),
  note: z.string().max(500).optional(),
});

export type ShippingAddress = z.infer<typeof ShippingAddressSchema>;

// ─── Create Order Schema (Discriminated Union) ───────────────────────────────

const BaseOrderFields = {
  itemId: z.string().min(1, "ไม่พบสินค้า"),
  paymentMethod: z.enum(["ESCROW", "COD"]),
  codRiskAccepted: z.boolean().optional(),
  saveAddress: z.boolean().optional().default(false),
};

const ShippingOrderSchema = z.object({
  ...BaseOrderFields,
  deliveryMethod: z.literal("SHIPPING"),
  shippingAddress: ShippingAddressSchema,
  // Meetup fields not applicable
  meetupLocation: z.undefined().optional(),
  meetupDateTime: z.undefined().optional(),
  meetupNote: z.undefined().optional(),
});

const MeetupOrderSchema = z.object({
  ...BaseOrderFields,
  deliveryMethod: z.literal("MEETUP"),
  meetupLocation: z.string().min(3, "กรุณาระบุสถานที่นัดรับ").max(200),
  meetupDateTime: z.string().min(1, "กรุณาเลือกวันเวลานัดรับ"),
  meetupNote: z.string().max(500).optional(),
  // Shipping fields not applicable
  shippingAddress: z.undefined().optional(),
});

export const CreateOrderSchema = z.union([ShippingOrderSchema, MeetupOrderSchema]);

export type CreateOrderInput = z.infer<typeof CreateOrderSchema>;

// ─── Order Result Type ───────────────────────────────────────────────────────

export type OrderResult =
  | { success: true; orderId: string; message: string }
  | { success: false; error: string; details?: unknown };

// ─── Checkout Error ──────────────────────────────────────────────────────────

export class CheckoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutError";
  }
}
