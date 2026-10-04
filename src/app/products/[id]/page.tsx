import type { Metadata } from "next";
import ProductDetailPage from "@/components/product-detail-page";
import { getProductById } from "@/lib/medusa-api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  try {
    const { id } = await params;
    const { product } = await getProductById(id);
    return {
      title: product.title,
      description: `Shop ${product.title} at Azani Kids. See photographs, available sizes and colours, and delivery options.`,
    };
  } catch {
    return { title: "Clothing item", description: "Explore clothing for kids aged 2–12 at Azani." };
  }
}

export default ProductDetailPage;
