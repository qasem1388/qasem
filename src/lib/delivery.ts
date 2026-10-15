// التوصيل من 2 إلى 5 أيام عمل لجميع مدن المملكة (الجمعة والسبت عطلة)
const WEEKEND = new Set([5, 6]);

export function addBusinessDays(start: Date, days: number): Date {
  const d = new Date(start);
  let added = 0;
  while (added < days) {
    d.setDate(d.getDate() + 1);
    if (!WEEKEND.has(d.getDay())) added++;
  }
  return d;
}

export function deliveryWindow(from = new Date(), minDays = 2, maxDays = 5) {
  return { from: addBusinessDays(from, minDays), to: addBusinessDays(from, maxDays) };
}
