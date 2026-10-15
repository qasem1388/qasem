export function AnnouncementBar({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="overflow-hidden bg-ink py-2 text-center text-xs font-bold text-white sm:text-sm">
      <div className="container">{text}</div>
    </div>
  );
}
