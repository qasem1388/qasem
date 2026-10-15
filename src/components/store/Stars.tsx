import { StarIcon } from "../icons";

export function Stars({ value, size = "h-4 w-4" }: { value: number; size?: string }) {
  return (
    <span className="inline-flex text-gold-500" aria-label={`التقييم ${value.toFixed(1)} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <StarIcon key={i} className={size} filled={value >= i - 0.25} />
      ))}
    </span>
  );
}
