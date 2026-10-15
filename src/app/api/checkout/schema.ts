import { z } from "zod";

export const linesSchema = z
  .array(z.object({ productId: z.string().min(1), variantId: z.string().nullable().optional(), quantity: z.number().int().min(1).max(20) }))
  .min(1)
  .max(50);

export const quoteSchema = z.object({
  lines: linesSchema,
  couponCode: z.string().max(40).optional(),
  shippingCompany: z.enum(["smsa", "aramex"]),
  paymentMethod: z.enum(["moyasar", "tamara", "tabby", "cod"]),
});

export const checkoutSchema = quoteSchema.extend({
  customer: z.object({
    name: z.string().trim().min(3, "الاسم مطلوب").max(80),
    phone: z.string().trim().min(9).max(20),
    email: z.union([z.literal(""), z.email("البريد غير صحيح")]).default(""),
    city: z.string().trim().min(2, "المدينة مطلوبة").max(60),
    district: z.string().trim().min(2, "الحي مطلوب").max(80),
    address: z.string().trim().min(5, "العنوان مطلوب").max(200),
    postalCode: z.string().trim().max(10).default(""),
    notes: z.string().trim().max(500).default(""),
  }),
});
