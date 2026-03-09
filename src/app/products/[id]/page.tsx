"use client";

import { useParams, useRouter } from "next/navigation";
import { ProductDetail } from "@/components/product-detail";

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProductDetail
        productId={id}
        onBack={() => {
          if (window.history.length > 1) {
            router.back();
            return;
          }
          router.push("/products");
        }}
      />
    </div>
  );
}
