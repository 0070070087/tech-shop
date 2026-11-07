"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCart } from "@/lib/cart";

export default function CartLink() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const update = () =>
      setCount(getCart().reduce((sum, i) => sum + i.quantity, 0));
    update();
    window.addEventListener("cart-changed", update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener("cart-changed", update);
      window.removeEventListener("storage", update);
    };
  }, []);

  return <Link href="/cart">Cart ({count})</Link>;
}
