"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  useEffect(() => {
    // Order detail is displayed inline on the account page.
    // Redirect there so the user sees it in context.
    router.replace(`/account?order=${id}`);
  }, [id, router]);

  return (
    <div className="text-muted mx-auto max-w-2xl px-4 py-10 text-center sm:px-6 lg:px-8">
      Loading...
    </div>
  );
}
