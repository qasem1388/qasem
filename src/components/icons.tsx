type P = { className?: string };
const base = (d: React.ReactNode, className?: string) => (
  <svg className={className || "h-5 w-5"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

export const CartIcon = ({ className }: P) => base(<><path d="M6 6h15l-1.5 9h-12z" /><path d="M6 6 5 3H2" /><circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" /></>, className);
export const HeartIcon = ({ className }: P) => base(<path d="M12 20s-7-4.4-9-9.2C1.6 7.3 4 4 7.3 4c2 0 3.4 1.1 4.7 2.8C13.3 5.1 14.7 4 16.7 4 20 4 22.4 7.3 21 10.8 19 15.6 12 20 12 20z" />, className);
export const SearchIcon = ({ className }: P) => base(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>, className);
export const MenuIcon = ({ className }: P) => base(<path d="M4 7h16M4 12h16M4 17h16" />, className);
export const CloseIcon = ({ className }: P) => base(<path d="M6 6l12 12M18 6 6 18" />, className);
export const TruckIcon = ({ className }: P) => base(<><path d="M3 6h11v9H3z" /><path d="M14 9h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>, className);
export const ShieldIcon = ({ className }: P) => base(<><path d="M12 3 4 6v6c0 4.5 3.4 8 8 9 4.6-1 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></>, className);
export const CashIcon = ({ className }: P) => base(<><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /></>, className);
export const ReturnIcon = ({ className }: P) => base(<><path d="M4 10h11a5 5 0 0 1 0 10h-3" /><path d="M8 6 4 10l4 4" /></>, className);
export const StarIcon = ({ className, filled = true }: P & { filled?: boolean }) => (
  <svg className={className ?? "h-4 w-4"} viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
    <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />
  </svg>
);
export const ChevronIcon = ({ className }: P) => base(<path d="m15 6-6 6 6 6" />, className);
export const ChevronLeftIcon = ({ className }: P) => base(<path d="m9 6 6 6-6 6" />, className);
export const PlusIcon = ({ className }: P) => base(<path d="M12 5v14M5 12h14" />, className);
export const MinusIcon = ({ className }: P) => base(<path d="M5 12h14" />, className);
export const TrashIcon = ({ className }: P) => base(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" /></>, className);
export const UserIcon = ({ className }: P) => base(<><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></>, className);
export const ClockIcon = ({ className }: P) => base(<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>, className);
export const SparkIcon = ({ className }: P) => base(<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M6 18l2.5-2.5M15.5 8.5 18 6" />, className);
export const WhatsAppIcon = ({ className }: P) => (
  <svg className={className ?? "h-6 w-6"} viewBox="0 0 32 32" fill="currentColor" aria-hidden="true">
    <path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.6c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.6 10.6 0 1 1 16 26.6zm5.8-7.9c-.3-.2-1.9-.9-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.7 8.7 0 0 1-4.3-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.6l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.6.1-.9.4-.3.3-1.2 1.1-1.2 2.8 0 1.6 1.2 3.2 1.4 3.4.2.2 2.4 3.6 5.7 5 2.1.9 2.9 1 4 .8.6-.1 1.9-.8 2.2-1.5.3-.8.3-1.4.2-1.5-.1-.2-.3-.3-.6-.4z" />
  </svg>
);
