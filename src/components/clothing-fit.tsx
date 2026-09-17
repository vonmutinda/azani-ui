import { MedusaProduct, MedusaProductVariant } from "@/types/medusa";

export function ClothingFit({ product }: { product: MedusaProduct }) {
  const raw = product.metadata?.clothing;
  const details = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const rows = (product.variants ?? []).filter(
    (
      variant,
    ): variant is MedusaProductVariant & {
      metadata: {
        clothing: {
          age_min: number;
          age_max: number;
          height_min_cm?: number;
          height_max_cm?: number;
        };
      };
    } => {
      const fit = variant.metadata?.clothing;
      return typeof fit?.age_min === "number" && typeof fit?.age_max === "number";
    },
  );
  const seen = new Set<string>();
  return (
    <details className="border-border/50 rounded-xl border p-4 text-sm">
      <summary className="cursor-pointer font-semibold">Size & fit guide</summary>
      <p className="text-muted mt-3">
        Age is a guide, not a guarantee of fit. Compare the supplier’s size and height guidance
        before choosing. Measurements below describe the child’s height, not the garment.
      </p>
      {rows.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr>
                <th className="py-2">Size</th>
                <th>Age guide</th>
                <th>Child height</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((variant) => {
                const sizeOption = product.options?.find(
                  (option) => option.title.toLowerCase() === "size",
                );
                const size =
                  variant.options?.find((option) => option.option_id === sizeOption?.id)?.value ??
                  variant.title;
                const fit = variant.metadata.clothing;
                const key = JSON.stringify([size, fit]);
                if (seen.has(key)) return null;
                seen.add(key);
                return (
                  <tr key={key} className="border-t">
                    <td className="py-2">{size}</td>
                    <td>
                      {fit.age_min}–{fit.age_max} years
                    </td>
                    <td>
                      {typeof fit.height_min_cm === "number" &&
                      typeof fit.height_max_cm === "number"
                        ? `${fit.height_min_cm}–${fit.height_max_cm} cm`
                        : "Not supplied"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {rows.length === 0 && (
        <p className="text-muted mt-2">
          Supplier measurements have not been supplied. Contact us for sizing help.
        </p>
      )}
      <dl className="mt-3 space-y-2">
        {["material", "fit", "care"].map((key) =>
          typeof details[key] === "string" && details[key] ? (
            <div key={key}>
              <dt className="font-semibold capitalize">{key}</dt>
              <dd>{details[key] as string}</dd>
            </div>
          ) : null,
        )}
      </dl>
    </details>
  );
}
