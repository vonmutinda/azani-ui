import Link from "next/link";
import { MedusaProduct } from "@/types/medusa";

export function ClothingFit({ product }: { product: MedusaProduct }) {
  const raw = product.metadata?.clothing;
  const details = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const sizeOption = product.options?.find((option) => option.title.toLowerCase() === "size");
  const seen = new Set<string>();
  const rows = (product.variants ?? []).flatMap((variant) => {
    const size =
      variant.options?.find((option) => option.option_id === sizeOption?.id)?.value ??
      variant.title;
    const fit = variant.metadata?.clothing;
    const age =
      typeof fit?.age_min === "number" && typeof fit.age_max === "number"
        ? fit.age_min === fit.age_max
          ? `${fit.age_min} years`
          : `${fit.age_min}–${fit.age_max} years`
        : null;
    const height =
      typeof fit?.height_min_cm === "number" && typeof fit.height_max_cm === "number"
        ? `${fit.height_min_cm}–${fit.height_max_cm} cm`
        : null;
    const key = JSON.stringify([size, age, height]);
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ key, size, age, height }];
  });
  for (const value of sizeOption?.values ?? []) {
    if (!rows.some((row) => row.size === value.value)) {
      rows.push({ key: value.id, size: value.value, age: null, height: null });
    }
  }
  const measuredRows = rows.filter((row) => row.height);
  const unmeasuredRows = rows.filter((row) => !row.height);
  const suppliedDetails = ["material", "fit", "care"].filter(
    (key) => typeof details[key] === "string" && (details[key] as string).trim(),
  );

  return (
    <div className="space-y-3 text-sm">
      {suppliedDetails.length > 0 && (
        <dl className="text-muted space-y-1.5">
          {suppliedDetails.map((key) => (
            <div key={key} className="flex gap-2">
              <dt className="text-foreground font-semibold capitalize">{key}:</dt>
              <dd>{details[key] as string}</dd>
            </div>
          ))}
        </dl>
      )}
      <details className="border-border rounded-xl border px-4">
        <summary className="min-h-11 cursor-pointer content-center py-3 font-semibold">
          Size & fit guide
        </summary>
        <div className="space-y-3 pb-4">
          <p className="text-muted">
            Age is a guide, not a guarantee of fit. Supplier size labels are shown below.
          </p>
          {measuredRows.length > 0 && (
            <>
              <p className="text-muted">
                Compare the supplier’s height guidance before choosing. These measurements describe
                the child’s height, not the garment.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr>
                      <th scope="col" className="py-2 pr-3">
                        Size
                      </th>
                      <th scope="col" className="pr-3">
                        Age guide
                      </th>
                      <th scope="col">Child height</th>
                    </tr>
                  </thead>
                  <tbody>
                    {measuredRows.map((row) => (
                      <tr key={row.key} className="border-border border-t">
                        <th scope="row" className="py-2 pr-3 font-medium">
                          {row.size}
                        </th>
                        <td className="pr-3">{row.age ?? "—"}</td>
                        <td>{row.height}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          {unmeasuredRows.length > 0 && (
            <ul aria-label="Supplier size guidance" className="space-y-1.5">
              {unmeasuredRows.map((row) => (
                <li key={row.key} className="flex flex-wrap gap-x-2">
                  <span className="font-medium">{row.size}</span>
                  {row.age && <span className="text-muted">Age guide: {row.age}</span>}
                </li>
              ))}
            </ul>
          )}
          {(unmeasuredRows.length > 0 || rows.length === 0) && (
            <p className="text-muted">
              {measuredRows.length > 0
                ? "Measurements have not been supplied for every size. "
                : "Measurements have not been supplied for this item. "}
              <Link href="/contact" className="text-foreground underline underline-offset-2">
                Contact us for sizing help
              </Link>{" "}
              before choosing.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}
