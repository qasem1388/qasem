import { prisma } from "./db";

/** حذف منتج. المنتجات المرتبطة بطلبات سابقة تُخفى بدل الحذف للحفاظ على سجل الطلبات */
export async function deleteProduct(id: string): Promise<{ archived: boolean }> {
  const hasOrders = await prisma.orderItem.count({ where: { productId: id } });
  if (hasOrders) await prisma.product.update({ where: { id }, data: { active: false } });
  else await prisma.product.delete({ where: { id } });
  return { archived: hasOrders > 0 };
}
