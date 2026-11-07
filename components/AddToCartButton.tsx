"use client";

import { useState } from "react";
import { addToCart } from "@/lib/cart";

export default function AddToCartButton({
  id,
  name,
  price,
  stock,
}: {
  id: number;
  name: string;
  price: number;
  stock: number;
}) {
  const [added, setAdded] = useState(false);

  return (
    <button
      disabled={stock === 0}
      onClick={() => {
        addToCart({ id, name, price });
        setAdded(true);
        setTimeout(() => setAdded(false), 1200);
      }}
      className="rounded-lg bg-gray-900 px-3 py-1 text-sm text-white hover:bg-gray-700 disabled:opacity-40"
    >
      {added ? "Added ✓" : "Add to cart"}
    </button>
  );
}
