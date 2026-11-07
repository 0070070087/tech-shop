import { supabase } from "@/lib/supabase";
import AuthNav from "@/components/AuthNav";
import CartLink from "@/components/CartLink";
import AddToCartButton from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { data: products, error } = await supabase
    .from("products")
    .select("*")
    .order("id");

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <header className="bg-gray-900 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <h1 className="text-xl font-bold">NOVA&amp;YOU</h1>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#">Products</a>
            <AuthNav />
            <CartLink />
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <h2 className="mb-6 text-2xl font-semibold">Our Products</h2>

        {error && (
          <p className="rounded bg-red-100 p-3 text-red-700">
            Could not load products: {error.message}
          </p>
        )}

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products?.map((product) => (
            <div key={product.id} className="rounded-xl bg-white p-4 shadow">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="mb-4 h-32 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="mb-4 flex h-32 items-center justify-center rounded-lg bg-gray-200 text-gray-500">
                  Photo
                </div>
              )}
              <h3 className="font-semibold">{product.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{product.description}</p>
              <p className="mt-1 text-xs text-gray-500">
                {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
              </p>
              <div className="mt-4 flex items-center justify-between">
                <span className="font-bold">€{Number(product.price).toFixed(2)}</span>
                <AddToCartButton
                  id={product.id}
                  name={product.name}
                  price={Number(product.price)}
                  stock={product.stock}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
