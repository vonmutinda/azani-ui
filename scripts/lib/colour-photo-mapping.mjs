/**
 * @param {{handle: string, photos: {id: number, colour: string}[]}} product
 * @param {{url: string}[]} images
 * @returns {Record<string, string[]>}
 */
export function buildColourPhotoMap(product, images) {
  const groups = new Map();
  for (const photo of product.photos) {
    const prefix = `${product.handle}-${photo.id}-`;
    const matches = images.filter((image) =>
      decodeURIComponent(new URL(image.url).pathname).split("/").pop()?.startsWith(prefix),
    );
    if (matches.length !== 1)
      throw new Error(`Expected one gallery URL for photo ${photo.id} in ${product.handle}.`);
    const urls = groups.get(photo.colour) ?? [];
    urls.push(matches[0].url);
    groups.set(photo.colour, urls);
  }
  return Object.fromEntries(groups);
}

/**
 * @param {unknown} stored
 * @param {Record<string, string[]> | undefined} expected
 */
export function colourPhotoMapsEqual(stored, expected) {
  if (!stored || typeof stored !== "object" || Array.isArray(stored) || !expected) return false;
  const entries = /** @type {Record<string, unknown>} */ (stored);
  const colours = Object.keys(expected);
  return (
    Object.keys(entries).length === colours.length &&
    colours.every((colour) => {
      const urls = entries[colour];
      return (
        Array.isArray(urls) &&
        urls.length === expected[colour].length &&
        urls.every((url, index) => url === expected[colour][index])
      );
    })
  );
}
