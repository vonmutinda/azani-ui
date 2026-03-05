"use client";

import Link from "next/link";
import { Heart } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getCustomer } from "@/lib/medusa-api";

export default function WishlistPage() {
  const { data: customer, isLoading } = useQuery({
    queryKey: ["customer"],
    queryFn: getCustomer,
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-muted">
        Loading...
      </div>
    );
  }

  if (customer) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
        <Heart className="mx-auto h-16 w-16 text-muted-light" />
        <h1 className="mt-4 text-2xl font-bold text-foreground">Wishlist</h1>
        <p className="mt-2 text-sm text-muted">
          Your wishlist is empty. Browse our products and save your favorites!
        </p>
        <Link
          href="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
        >
          Browse Products
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6 lg:px-8">
      <Heart className="mx-auto h-16 w-16 text-muted-light" />
      <h1 className="mt-4 text-2xl font-bold text-foreground">Wishlist</h1>
      <p className="mt-2 text-sm text-muted">
        Sign in to save items to your wishlist. Wishlist functionality requires a customer account.
      </p>
      <Link
        href="/account/login"
        className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition hover:bg-primary-hover"
      >
        Sign In
      </Link>
    </div>
  );
}
