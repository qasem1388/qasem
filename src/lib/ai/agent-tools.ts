import { z } from "zod";
import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "../db";
import { parseJson, round2, slugify } from "../format";
import { ORDER_STATUSES, setOrderStatus, shipOrder } from "../orders";
import { DEFAULT_SETTINGS, getSettings, updateSettings } from "../settings";
import { deleteProduct } from "../products";
import { generateProductCopy } from "./titles";

/**
 * أدوات الوكيل الذكي للوحة التحكم: كل أداة تملك مخطط Zod للتحقق من المدخلات
 * ويُشتق منه JSON Schema الذي يُرسل إلى Claude.
 */

type ToolDef<S extends z.ZodType> = {
  description: string;
  schema: S;
  run: (input: z.infer<S>) => Promise<unknown>;
};

function tool<S extends z.ZodType>(def: ToolDef<S>) {
  return def;
}

async function findCategoryId(slugOrName?: string) {
  if (!slugOrName) return undefined;
  const c = await prisma.category.findFirst({ where: { OR: [{ slug: slugOrName }, { name: slugOrName }] } });
  if (!c) throw new Error(`التصنيف "${slugOrName}" غير موجود`);
  return c.id;
}

function since(days: number) {
  return new Date(Date.now() - days * 86400000);
}

const PAID = { status: { notIn: ["cancelled", "refunded", "pending"] } };

export const TOOLS = {
  get_dashboard_stats: tool({
    description: "ملخص أداء المتجر: المبيعات، عدد الطلبات، متوسط السلة، الطلبات حسب الحالة وطرق الدفع، المنتجات منخفضة المخزون، الأكثر مبيعاً.",
    schema: z.object({ period_days: z.number().int().min(1).max(365).default(30) }),
    run: async ({ period_days }) => {
      const from = since(period_days);
      const [orders, byStatus, byPayment, lowStock, top, customers, pendingReviews] = await Promise.all([
        prisma.order.aggregate({ where: { createdAt: { gte: from }, ...PAID }, _sum: { total: true }, _count: true }),
        prisma.order.groupBy({ by: ["status"], where: { createdAt: { gte: from } }, _count: true }),
        prisma.order.groupBy({ by: ["paymentMethod"], where: { createdAt: { gte: from }, ...PAID }, _count: true, _sum: { total: true } }),
        prisma.product.findMany({ where: { active: true, stock: { lte: 5 } }, select: { id: true, name: true, stock: true }, take: 20 }),
        prisma.product.findMany({ orderBy: { salesCount: "desc" }, take: 5, select: { name: true, salesCount: true, price: true } }),
        prisma.customer.count({ where: { createdAt: { gte: from } } }),
        prisma.review.count({ where: { approved: false } }),
      ]);
      const revenue = orders._sum.total ?? 0;
      return {
        period_days,
        revenue_sar: round2(revenue),
        paid_orders: orders._count,
        average_order_value: orders._count ? round2(revenue / orders._count) : 0,
        new_customers: customers,
        orders_by_status: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
        by_payment_method: byPayment.map((p) => ({ method: p.paymentMethod, orders: p._count, total: round2(p._sum.total ?? 0) })),
        low_stock: lowStock,
        top_products: top,
        pending_reviews: pendingReviews,
      };
    },
  }),

  sales_report: tool({
    description: "تقرير مبيعات يومي لعدد أيام محدد (إيراد وعدد طلبات لكل يوم).",
    schema: z.object({ days: z.number().int().min(1).max(90).default(14) }),
    run: async ({ days }) => {
      const orders = await prisma.order.findMany({ where: { createdAt: { gte: since(days) }, ...PAID }, select: { total: true, createdAt: true } });
      const map = new Map<string, { revenue: number; orders: number }>();
      for (const o of orders) {
        const k = o.createdAt.toISOString().slice(0, 10);
        const e = map.get(k) ?? { revenue: 0, orders: 0 };
        e.revenue = round2(e.revenue + o.total);
        e.orders++;
        map.set(k, e);
      }
      return [...map.entries()].sort().map(([date, v]) => ({ date, ...v }));
    },
  }),

  search_products: tool({
    description: "البحث في المنتجات بالاسم أو التصنيف أو المخزون المنخفض. يعيد المعرّف والسعر والمخزون والحالة.",
    schema: z.object({
      query: z.string().optional(),
      category: z.string().optional().describe("slug أو اسم التصنيف"),
      max_stock: z.number().int().optional().describe("لإظهار المنتجات التي مخزونها أقل أو يساوي هذا الرقم"),
      include_inactive: z.boolean().default(true),
      limit: z.number().int().min(1).max(100).default(25),
    }),
    run: async (i) => {
      const categoryId = await findCategoryId(i.category);
      const rows = await prisma.product.findMany({
        where: {
          ...(i.query ? { OR: [{ name: { contains: i.query } }, { sku: { contains: i.query } }, { tags: { contains: i.query } }] } : {}),
          ...(categoryId ? { categoryId } : {}),
          ...(i.max_stock !== undefined ? { stock: { lte: i.max_stock } } : {}),
          ...(i.include_inactive ? {} : { active: true }),
        },
        take: i.limit,
        orderBy: { createdAt: "desc" },
        select: { id: true, slug: true, name: true, price: true, compareAtPrice: true, stock: true, active: true, featured: true, salesCount: true, category: { select: { name: true } } },
      });
      return rows;
    },
  }),

  get_product: tool({
    description: "تفاصيل منتج كاملة بما فيها العناوين المتعددة والمتغيرات (الألوان) والصور.",
    schema: z.object({ id_or_slug: z.string() }),
    run: async ({ id_or_slug }) => {
      const p = await prisma.product.findFirst({
        where: { OR: [{ id: id_or_slug }, { slug: id_or_slug }] },
        include: { variants: true, category: { select: { name: true, slug: true } } },
      });
      if (!p) throw new Error("المنتج غير موجود");
      return { ...p, titles: parseJson(p.titlesJson, {}), images: parseJson(p.imagesJson, []), titlesJson: undefined, imagesJson: undefined };
    },
  }),

  create_product: tool({
    description: "إنشاء منتج جديد. يمكن توليد العناوين والوصف وبيانات السيو تلقائياً بالذكاء الاصطناعي عبر generate_copy.",
    schema: z.object({
      name: z.string().min(2),
      price: z.number().positive(),
      compare_at_price: z.number().positive().optional(),
      stock: z.number().int().min(0).default(0),
      category: z.string().optional(),
      description: z.string().optional(),
      short_description: z.string().optional(),
      brand: z.string().optional(),
      image_urls: z.array(z.string()).optional(),
      colors: z.array(z.object({ name: z.string(), hex: z.string().default("#000000"), stock: z.number().int().min(0).default(0), price: z.number().positive().optional() })).optional(),
      featured: z.boolean().default(false),
      active: z.boolean().default(true),
      generate_copy: z.boolean().default(true),
    }),
    run: async (i) => {
      const categoryId = await findCategoryId(i.category);
      const copy = i.generate_copy
        ? await generateProductCopy({ name: i.name, category: i.category, price: i.price, details: i.description, colors: i.colors?.map((c) => c.name) })
        : null;
      let slug = slugify(copy?.slug || i.name) || `p-${Date.now()}`;
      if (await prisma.product.findUnique({ where: { slug } })) slug = `${slug}-${Date.now().toString(36)}`;
      const stock = i.colors?.length ? i.colors.reduce((s, c) => s + c.stock, 0) : i.stock;
      const p = await prisma.product.create({
        data: {
          name: i.name,
          slug,
          price: i.price,
          compareAtPrice: i.compare_at_price,
          stock,
          categoryId,
          brand: i.brand ?? "",
          featured: i.featured,
          active: i.active,
          imagesJson: JSON.stringify(i.image_urls ?? []),
          shortDescription: i.short_description ?? copy?.shortDescription ?? "",
          description: i.description && !copy ? i.description : copy?.description ?? i.description ?? "",
          titlesJson: JSON.stringify(copy?.titles ?? {}),
          seoTitle: copy?.seoTitle ?? "",
          seoDescription: copy?.seoDescription ?? "",
          keywords: copy?.keywords.join("، ") ?? "",
          variants: i.colors?.length
            ? { create: i.colors.map((c, idx) => ({ colorName: c.name, colorHex: c.hex, stock: c.stock, price: c.price, sortOrder: idx })) }
            : undefined,
        },
      });
      return { id: p.id, slug: p.slug, url: `/product/${encodeURIComponent(p.slug)}`, titles: copy?.titles };
    },
  }),

  update_product: tool({
    description: "تعديل بيانات منتج (السعر، السعر قبل الخصم، المخزون، التفعيل، التمييز، الوصف، السيو، التصنيف...). أرسل فقط الحقول المراد تغييرها.",
    schema: z.object({
      id: z.string(),
      name: z.string().optional(),
      price: z.number().positive().optional(),
      compare_at_price: z.number().positive().nullable().optional(),
      stock: z.number().int().min(0).optional(),
      active: z.boolean().optional(),
      featured: z.boolean().optional(),
      best_seller: z.boolean().optional(),
      is_new: z.boolean().optional(),
      description: z.string().optional(),
      short_description: z.string().optional(),
      seo_title: z.string().optional(),
      seo_description: z.string().optional(),
      keywords: z.string().optional(),
      category: z.string().optional(),
      image_urls: z.array(z.string()).optional(),
    }),
    run: async (i) => {
      const p = await prisma.product.update({
        where: { id: i.id },
        data: {
          name: i.name,
          price: i.price,
          compareAtPrice: i.compare_at_price,
          stock: i.stock,
          active: i.active,
          featured: i.featured,
          bestSeller: i.best_seller,
          isNew: i.is_new,
          description: i.description,
          shortDescription: i.short_description,
          seoTitle: i.seo_title,
          seoDescription: i.seo_description,
          keywords: i.keywords,
          categoryId: i.category ? await findCategoryId(i.category) : undefined,
          imagesJson: i.image_urls ? JSON.stringify(i.image_urls) : undefined,
        },
        select: { id: true, name: true, price: true, compareAtPrice: true, stock: true, active: true, featured: true },
      });
      return p;
    },
  }),

  delete_products: tool({
    description: "حذف منتج أو أكثر بالمعرّف. المنتجات المرتبطة بطلبات سابقة تُخفى بدل حذفها. اطلب تأكيد المالك قبل الحذف ما لم يطلبه صراحةً.",
    schema: z.object({ ids: z.array(z.string()).min(1).max(100) }),
    run: async ({ ids }) => {
      const results = [];
      for (const id of ids) {
        const p = await prisma.product.findUnique({ where: { id }, select: { name: true } });
        if (!p) {
          results.push({ id, result: "غير موجود" });
          continue;
        }
        const { archived } = await deleteProduct(id);
        results.push({ id, name: p.name, result: archived ? "أُخفي (له طلبات سابقة)" : "حُذف" });
      }
      return results;
    },
  }),

  bulk_update_prices: tool({
    description: "تغيير أسعار مجموعة منتجات بنسبة مئوية (موجبة للزيادة، سالبة للتخفيض). عند التخفيض يمكن حفظ السعر القديم كسعر قبل الخصم لإظهار شارة التخفيض.",
    schema: z.object({
      product_ids: z.array(z.string()).optional(),
      category: z.string().optional(),
      percent_change: z.number().min(-90).max(300),
      keep_old_as_compare_at: z.boolean().default(true),
    }),
    run: async (i) => {
      if (!i.product_ids?.length && !i.category) throw new Error("حدد المنتجات أو التصنيف");
      const categoryId = await findCategoryId(i.category);
      const products = await prisma.product.findMany({
        where: i.product_ids?.length ? { id: { in: i.product_ids } } : { categoryId },
        select: { id: true, name: true, price: true, compareAtPrice: true },
      });
      const changes = [];
      for (const p of products) {
        const price = round2(p.price * (1 + i.percent_change / 100));
        const compareAtPrice = i.percent_change < 0 && i.keep_old_as_compare_at ? p.compareAtPrice ?? p.price : i.percent_change > 0 ? null : p.compareAtPrice;
        await prisma.product.update({ where: { id: p.id }, data: { price, compareAtPrice } });
        changes.push({ name: p.name, old: p.price, new: price });
      }
      return { updated: changes.length, changes };
    },
  }),

  regenerate_product_copy: tool({
    description: "توليد 8 عناوين مختلفة جذرياً + وصف تسويقي + بيانات سيو لمنتج موجود بالذكاء الاصطناعي. apply=true لحفظها مباشرة.",
    schema: z.object({ id: z.string(), extra_details: z.string().optional(), apply: z.boolean().default(true) }),
    run: async ({ id, extra_details, apply }) => {
      const p = await prisma.product.findUnique({ where: { id }, include: { category: true, variants: true } });
      if (!p) throw new Error("المنتج غير موجود");
      const copy = await generateProductCopy({
        name: p.name,
        category: p.category?.name,
        price: p.price,
        colors: p.variants.map((v) => v.colorName),
        details: [p.description, extra_details].filter(Boolean).join("\n"),
      });
      if (apply) {
        await prisma.product.update({
          where: { id },
          data: {
            titlesJson: JSON.stringify(copy.titles),
            shortDescription: copy.shortDescription,
            description: copy.description,
            seoTitle: copy.seoTitle,
            seoDescription: copy.seoDescription,
            keywords: copy.keywords.join("، "),
          },
        });
      }
      return { applied: apply, ...copy };
    },
  }),

  manage_variant: tool({
    description: "إضافة أو تعديل أو حذف لون/متغير لمنتج. المخزون الكلي للمنتج يُحدَّث تلقائياً كمجموع مخزون المتغيرات.",
    schema: z.object({
      product_id: z.string(),
      action: z.enum(["add", "update", "delete"]),
      variant_id: z.string().optional(),
      color_name: z.string().optional(),
      color_hex: z.string().optional(),
      size: z.string().optional(),
      stock: z.number().int().min(0).optional(),
      price: z.number().positive().nullable().optional(),
    }),
    run: async (i) => {
      if (i.action === "add") {
        if (!i.color_name) throw new Error("اسم اللون مطلوب");
        await prisma.productVariant.create({
          data: { productId: i.product_id, colorName: i.color_name, colorHex: i.color_hex ?? "#000000", size: i.size ?? "", stock: i.stock ?? 0, price: i.price ?? null },
        });
      } else {
        if (!i.variant_id) throw new Error("variant_id مطلوب");
        if (i.action === "delete") await prisma.productVariant.delete({ where: { id: i.variant_id } });
        else
          await prisma.productVariant.update({
            where: { id: i.variant_id },
            data: { colorName: i.color_name, colorHex: i.color_hex, size: i.size, stock: i.stock, price: i.price },
          });
      }
      const variants = await prisma.productVariant.findMany({ where: { productId: i.product_id } });
      if (variants.length) await prisma.product.update({ where: { id: i.product_id }, data: { stock: variants.reduce((s, v) => s + v.stock, 0) } });
      return variants.map((v) => ({ id: v.id, color: v.colorName, hex: v.colorHex, size: v.size, stock: v.stock, price: v.price }));
    },
  }),

  list_orders: tool({
    description: "عرض الطلبات مع إمكانية التصفية بالحالة أو طريقة الدفع أو البحث بالاسم/الجوال/المدينة.",
    schema: z.object({
      status: z.enum(Object.keys(ORDER_STATUSES) as [string, ...string[]]).optional(),
      payment_method: z.enum(["moyasar", "tamara", "tabby", "cod"]).optional(),
      search: z.string().optional(),
      limit: z.number().int().min(1).max(100).default(20),
    }),
    run: async (i) =>
      prisma.order.findMany({
        where: {
          status: i.status,
          paymentMethod: i.payment_method,
          ...(i.search ? { OR: [{ name: { contains: i.search } }, { phone: { contains: i.search } }, { city: { contains: i.search } }] } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: i.limit,
        select: { number: true, name: true, phone: true, city: true, total: true, status: true, paymentMethod: true, paymentStatus: true, shippingCompany: true, trackingNumber: true, createdAt: true },
      }),
  }),

  get_order: tool({
    description: "تفاصيل طلب برقمه: المنتجات، العنوان، الدفع، الشحن، وسجل الحالات.",
    schema: z.object({ number: z.number().int() }),
    run: async ({ number }) => {
      const o = await prisma.order.findUnique({ where: { number }, include: { items: true } });
      if (!o) throw new Error("الطلب غير موجود");
      return { ...o, history: parseJson(o.history, []) };
    },
  }),

  update_order_status: tool({
    description: `تغيير حالة طلب. الحالات: ${Object.entries(ORDER_STATUSES).map(([k, v]) => `${k}=${v}`).join("، ")}. الإلغاء يعيد المخزون.`,
    schema: z.object({ number: z.number().int(), status: z.enum(Object.keys(ORDER_STATUSES) as [string, ...string[]]), note: z.string().optional() }),
    run: async ({ number, status, note }) => {
      const o = await prisma.order.findUnique({ where: { number } });
      if (!o) throw new Error("الطلب غير موجود");
      const u = await setOrderStatus(o.id, status, note);
      return { number: u.number, status: u.status };
    },
  }),

  create_shipment: tool({
    description: "إصدار بوليصة شحن للطلب مع سمسا أو أرامكس وتحويله لحالة (تم الشحن). يحصّل مبالغ تمارا/تابي تلقائياً عند الشحن.",
    schema: z.object({ number: z.number().int(), company: z.enum(["smsa", "aramex"]).optional() }),
    run: async ({ number, company }) => {
      const o = await prisma.order.findUnique({ where: { number } });
      if (!o) throw new Error("الطلب غير موجود");
      const u = await shipOrder(o.id, company);
      return { number: u.number, company: u.shippingCompany, tracking: u.trackingNumber, status: u.status };
    },
  }),

  list_customers: tool({
    description: "عرض العملاء مع عدد طلباتهم وإجمالي مشترياتهم.",
    schema: z.object({ search: z.string().optional(), limit: z.number().int().min(1).max(100).default(20) }),
    run: async ({ search, limit }) => {
      const rows = await prisma.customer.findMany({
        where: search ? { OR: [{ name: { contains: search } }, { phone: { contains: search } }, { city: { contains: search } }] } : {},
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { orders: { select: { total: true, status: true } } },
      });
      return rows.map((c) => ({
        name: c.name,
        phone: c.phone,
        city: c.city,
        orders: c.orders.length,
        total_spent: round2(c.orders.filter((o) => !["cancelled", "refunded", "pending"].includes(o.status)).reduce((s, o) => s + o.total, 0)),
      }));
    },
  }),

  create_coupon: tool({
    description: "إنشاء كوبون خصم: percent (نسبة)، fixed (مبلغ ثابت)، free_shipping (شحن مجاني).",
    schema: z.object({
      code: z.string().min(3).max(30),
      type: z.enum(["percent", "fixed", "free_shipping"]),
      value: z.number().min(0).default(0),
      min_order: z.number().min(0).default(0),
      max_uses: z.number().int().min(0).default(0).describe("0 = غير محدود"),
      expires_in_days: z.number().int().min(1).optional(),
    }),
    run: async (i) =>
      prisma.coupon.create({
        data: {
          code: i.code.trim().toUpperCase(),
          type: i.type,
          value: i.value,
          minOrder: i.min_order,
          maxUses: i.max_uses,
          expiresAt: i.expires_in_days ? new Date(Date.now() + i.expires_in_days * 86400000) : null,
        },
      }),
  }),

  list_coupons: tool({
    description: "عرض كل كوبونات الخصم وحالة استخدامها.",
    schema: z.object({}),
    run: async () => prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  }),

  update_coupon: tool({
    description: "تعديل أو إيقاف كوبون.",
    schema: z.object({ code: z.string(), active: z.boolean().optional(), value: z.number().optional(), min_order: z.number().optional(), max_uses: z.number().int().optional() }),
    run: async (i) =>
      prisma.coupon.update({ where: { code: i.code.toUpperCase() }, data: { active: i.active, value: i.value, minOrder: i.min_order, maxUses: i.max_uses } }),
  }),

  list_categories: tool({
    description: "عرض التصنيفات مع عدد المنتجات في كل تصنيف.",
    schema: z.object({}),
    run: async () =>
      (await prisma.category.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { products: true } } } })).map((c) => ({
        id: c.id,
        slug: c.slug,
        name: c.name,
        active: c.active,
        products: c._count.products,
      })),
  }),

  upsert_category: tool({
    description: "إنشاء تصنيف جديد أو تعديل تصنيف موجود (عند تمرير id).",
    schema: z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().optional(),
      image: z.string().optional(),
      banner_image: z.string().optional(),
      sort_order: z.number().int().optional(),
      active: z.boolean().optional(),
      seo_title: z.string().optional(),
      seo_description: z.string().optional(),
    }),
    run: async (i) => {
      const data = {
        name: i.name,
        slug: i.slug ? slugify(i.slug) : undefined,
        description: i.description,
        image: i.image,
        bannerImage: i.banner_image,
        sortOrder: i.sort_order,
        active: i.active,
        seoTitle: i.seo_title,
        seoDescription: i.seo_description,
      };
      if (i.id) return prisma.category.update({ where: { id: i.id }, data });
      if (!i.name) throw new Error("اسم التصنيف مطلوب");
      return prisma.category.create({ data: { ...data, name: i.name, slug: slugify(i.slug || i.name) } });
    },
  }),

  list_banners: tool({
    description: "عرض السلايدرات والبنرات (hero = السلايدر الرئيسي، category = بنرات التصنيفات، promo = بنرات العروض).",
    schema: z.object({}),
    run: async () => prisma.banner.findMany({ orderBy: [{ position: "asc" }, { sortOrder: "asc" }] }),
  }),

  upsert_banner: tool({
    description: "إنشاء أو تعديل سلايدر/بنر. للتعديل مرّر id.",
    schema: z.object({
      id: z.string().optional(),
      position: z.enum(["hero", "category", "promo"]).optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      image: z.string().optional(),
      link: z.string().optional(),
      button_text: z.string().optional(),
      sort_order: z.number().int().optional(),
      active: z.boolean().optional(),
    }),
    run: async (i) => {
      const data = { position: i.position, title: i.title, subtitle: i.subtitle, image: i.image, link: i.link, buttonText: i.button_text, sortOrder: i.sort_order, active: i.active };
      if (i.id) return prisma.banner.update({ where: { id: i.id }, data });
      if (!i.title || !i.image) throw new Error("العنوان والصورة مطلوبان");
      return prisma.banner.create({ data: { ...data, title: i.title, image: i.image } });
    },
  }),

  get_settings: tool({
    description: "قراءة إعدادات المتجر (الاسم، واتساب، أسعار الشحن، رسوم الدفع عند الاستلام، حد الشحن المجاني، شريط الإعلان، تفعيل طرق الدفع، البكسلات...).",
    schema: z.object({}),
    run: async () => getSettings(),
  }),

  update_settings: tool({
    description: `تعديل إعدادات المتجر. المفاتيح المتاحة: ${Object.keys(DEFAULT_SETTINGS).join(", ")}. كل القيم نصية (مثلاً "true"/"false" أو "25").`,
    schema: z.object({ settings: z.record(z.string(), z.string()) }),
    run: async ({ settings }) => {
      const unknown = Object.keys(settings).filter((k) => !(k in DEFAULT_SETTINGS));
      if (unknown.length) throw new Error(`مفاتيح غير معروفة: ${unknown.join(", ")}`);
      return updateSettings(settings);
    },
  }),

  list_reviews: tool({
    description: "عرض تقييمات العملاء (المعلّقة بانتظار الموافقة افتراضياً).",
    schema: z.object({ pending_only: z.boolean().default(true), limit: z.number().int().max(100).default(30) }),
    run: async ({ pending_only, limit }) =>
      prisma.review.findMany({
        where: pending_only ? { approved: false } : {},
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { product: { select: { name: true } } },
      }),
  }),

  moderate_review: tool({
    description: "اعتماد تقييم أو حذفه. يُعاد حساب متوسط تقييم المنتج تلقائياً.",
    schema: z.object({ id: z.string(), action: z.enum(["approve", "delete"]) }),
    run: async ({ id, action }) => {
      const r = action === "approve" ? await prisma.review.update({ where: { id }, data: { approved: true } }) : await prisma.review.delete({ where: { id } });
      const agg = await prisma.review.aggregate({ where: { productId: r.productId, approved: true }, _avg: { rating: true }, _count: true });
      await prisma.product.update({ where: { id: r.productId }, data: { ratingAvg: round2(agg._avg.rating ?? 0), ratingCount: agg._count } });
      return { ok: true, action };
    },
  }),

  list_subscribers: tool({
    description: "عدد مشتركي النشرة البريدية وآخر المشتركين.",
    schema: z.object({ limit: z.number().int().max(200).default(20) }),
    run: async ({ limit }) => ({
      total: await prisma.subscriber.count(),
      latest: await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: limit }),
    }),
  }),
} as const;

export type ToolName = keyof typeof TOOLS;

export const TOOL_LABELS: Record<ToolName, string> = {
  get_dashboard_stats: "قراءة إحصائيات المتجر",
  sales_report: "تقرير المبيعات",
  search_products: "البحث في المنتجات",
  get_product: "قراءة تفاصيل منتج",
  create_product: "إنشاء منتج",
  update_product: "تعديل منتج",
  delete_products: "حذف منتجات",
  bulk_update_prices: "تعديل أسعار جماعي",
  regenerate_product_copy: "توليد عناوين ووصف",
  manage_variant: "إدارة الألوان",
  list_orders: "عرض الطلبات",
  get_order: "تفاصيل طلب",
  update_order_status: "تحديث حالة طلب",
  create_shipment: "إصدار بوليصة شحن",
  list_customers: "عرض العملاء",
  create_coupon: "إنشاء كوبون",
  list_coupons: "عرض الكوبونات",
  update_coupon: "تعديل كوبون",
  list_categories: "عرض التصنيفات",
  upsert_category: "حفظ تصنيف",
  list_banners: "عرض البنرات",
  upsert_banner: "حفظ بنر",
  get_settings: "قراءة الإعدادات",
  update_settings: "تعديل الإعدادات",
  list_reviews: "عرض التقييمات",
  moderate_review: "إدارة تقييم",
  list_subscribers: "المشتركون",
};

export function toolDefinitions(): Anthropic.Beta.BetaTool[] {
  return (Object.entries(TOOLS) as [ToolName, ToolDef<z.ZodType>][]).map(([name, def]) => {
    const { $schema: _ignored, ...schema } = z.toJSONSchema(def.schema, { io: "input" }) as Record<string, unknown>;
    return { name, description: def.description, input_schema: schema as Anthropic.Beta.BetaTool.InputSchema };
  });
}

export async function runTool(name: string, rawInput: unknown): Promise<{ ok: boolean; content: string }> {
  const def = (TOOLS as Record<string, ToolDef<z.ZodType>>)[name];
  if (!def) return { ok: false, content: `أداة غير معروفة: ${name}` };
  const parsed = def.schema.safeParse(rawInput ?? {});
  if (!parsed.success) return { ok: false, content: `مدخلات غير صحيحة: ${parsed.error.message}` };
  try {
    const result = await def.run(parsed.data);
    return { ok: true, content: JSON.stringify(result ?? { ok: true }).slice(0, 60000) };
  } catch (err) {
    return { ok: false, content: err instanceof Error ? err.message : String(err) };
  }
}
