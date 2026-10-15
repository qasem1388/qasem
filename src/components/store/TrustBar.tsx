import { CashIcon, ReturnIcon, ShieldIcon, TruckIcon } from "../icons";

const ITEMS = [
  { icon: TruckIcon, title: "توصيل 2-5 أيام عمل", text: "لجميع مدن المملكة مع سمسا وأرامكس" },
  { icon: CashIcon, title: "الدفع عند الاستلام", text: "أو قسّمها على 4 مع تمارا وتابي" },
  { icon: ShieldIcon, title: "دفع آمن 100%", text: "مدى، فيزا، Apple Pay عبر ميسر" },
  { icon: ReturnIcon, title: "استرجاع سهل", text: "خلال 7 أيام من الاستلام" },
];

export function TrustBar() {
  return (
    <section className="container mt-8">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, text }) => (
          <div key={title} className="flex items-center gap-3 rounded-2xl bg-neutral-50 p-4">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-white text-brand-700 shadow-sm"><Icon className="h-6 w-6" /></span>
            <div>
              <p className="text-sm font-extrabold">{title}</p>
              <p className="text-xs text-neutral-500">{text}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
