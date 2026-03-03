import { Star } from "lucide-react";

type Props = {
  rating: number;
  total?: number;
  size?: number;
};

export function StarRating({ rating, total, size = 14 }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            className={i <= Math.round(rating) ? "star-filled" : "star-empty"}
            style={{ width: size, height: size }}
            fill={i <= Math.round(rating) ? "currentColor" : "none"}
          />
        ))}
      </div>
      {total !== undefined && <span className="text-xs text-muted">({total})</span>}
    </div>
  );
}
