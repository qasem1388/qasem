import { WhatsAppIcon } from "../icons";

export function WhatsAppButton({ number, message = "السلام عليكم، عندي استفسار عن منتج" }: { number: string; message?: string }) {
  return (
    <a
      href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
      target="_blank"
      rel="noopener"
      aria-label="تواصل معنا عبر واتساب"
      className="fixed bottom-24 end-4 z-30 grid h-14 w-14 place-items-center rounded-full bg-[#25d366] text-white shadow-lg shadow-black/20 transition hover:scale-105 md:bottom-6"
    >
      <WhatsAppIcon className="h-8 w-8" />
      <span className="absolute -top-1 -end-1 h-3.5 w-3.5 animate-ping rounded-full bg-[#25d366]" />
    </a>
  );
}
