/** Present only explicitly supplied, valid catalog metadata; never infer reviews. */
export function getSuppliedProductRating(metadata?: Record<string, unknown>) {
  const rating = metadata?.rating;
  const reviewCount = metadata?.review_count;
  if (
    typeof rating !== "number" ||
    !Number.isFinite(rating) ||
    rating < 0 ||
    rating > 5 ||
    typeof reviewCount !== "number" ||
    !Number.isSafeInteger(reviewCount) ||
    reviewCount <= 0
  )
    return null;
  return { rating, reviewCount };
}
