const BADGES = [
  { label: "mada", cls: "bg-white text-[#1f3f73] border" },
  { label: "VISA", cls: "bg-[#1a1f71] text-white" },
  { label: "Mastercard", cls: "bg-[#eb001b] text-white" },
  { label: "Apple Pay", cls: "bg-black text-white" },
  { label: "STC pay", cls: "bg-[#4f008c] text-white" },
  { label: "tamara", cls: "bg-[#ffd3c2] text-[#1d1d1b]" },
  { label: "tabby", cls: "bg-[#3effc0] text-black" },
  { label: "الدفع عند الاستلام", cls: "bg-neutral-800 text-white" },
];

export function PaymentBadges({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {BADGES.map((b) => (
        <span key={b.label} className={`rounded-md px-2 ${compact ? "py-0.5 text-[10px]" : "py-1 text-[11px]"} font-extrabold ${b.cls}`} dir="ltr">
          {b.label}
        </span>
      ))}
    </div>
  );
}
