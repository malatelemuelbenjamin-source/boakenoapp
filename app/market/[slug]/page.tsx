import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import type { DeliveryRate, Product, Shop } from "@/lib/types";
import { CategoryPill } from "@/components/ui";
import { peso } from "@/lib/format";
import { addToCart } from "@/app/actions/orders";
import { getCurrentUser } from "@/lib/auth";

export default async function ShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shop = await queryOne<Shop>("SELECT * FROM shops WHERE slug = ?", slug);
  if (!shop) notFound();
  const products = await query<Product>(
    "SELECT * FROM products WHERE shop_id = ? AND is_active = 1 ORDER BY id",
    shop.id,
  );
  const rates = await query<DeliveryRate>("SELECT * FROM delivery_rates WHERE shop_id = ? ORDER BY fee", shop.id);
  const user = await getCurrentUser();
  const cartCount =
    (user
      ? (await queryOne<{ c: number }>(
          `SELECT COALESCE(SUM(c.qty),0) c FROM cart_items c JOIN products p ON p.id = c.product_id WHERE c.user_id = ? AND p.shop_id = ?`,
          user.id,
          shop.id,
        ))?.c
      : 0) ?? 0;

  return (
    <div className="space-y-5">
      <Link href="/market" className="text-sm font-semibold text-moss-700 hover:text-moss-900">
        ← All shops
      </Link>

      <header className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${shop.accent} p-6 text-white shadow-card`}>
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center">
          <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/20 text-4xl backdrop-blur">{shop.emoji}</span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryPill category={shop.category} />
              <span className={`chip ${shop.is_open ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {shop.is_open ? "Open now" : "Closed"}
              </span>
              {shop.orders_count > 0 ? (
                <span className="chip bg-white/20 text-white">{shop.orders_count} orders served</span>
              ) : (
                <span className="chip bg-white/20 text-white">New on MyBoakeno</span>
              )}
            </div>
            <h1 className="mt-2 font-display text-3xl font-semibold leading-tight">{shop.name}</h1>
            <p className="mt-1 max-w-2xl text-sm text-white/90">{shop.tagline}</p>
            <p className="mt-1 text-xs text-white/80">📍 {shop.barangay}, Boac · {products.length} products</p>
          </div>
          {cartCount > 0 ? (
            <Link href="/cart" className="btn shrink-0 bg-white text-moss-900 hover:bg-white/90">
              View cart ({cartCount})
            </Link>
          ) : null}
        </div>
      </header>

      {!shop.is_open ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong className="font-semibold">This shop has paused orders.</strong> You can still browse the menu — add
          items once the seller reopens.
        </div>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <section>
          <h2 className="mb-3 font-display text-xl font-semibold text-moss-900">Products</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {products.map((product) => (
              <article key={product.id} className="card flex flex-col p-3.5">
                {product.image_id ? (
                  <img
                    src={`/media/${product.image_id}`}
                    alt={product.name}
                    className="mb-3 h-36 w-full rounded-2xl object-cover"
                  />
                ) : null}
                <div className="flex items-start gap-3">
                  <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-moss-50 text-2xl">
                    {product.image_id ? "🖼️" : product.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold leading-tight text-moss-900">{product.name}</h3>
                    <p className="mt-0.5 line-clamp-2 text-xs text-moss-600">{product.description}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-end justify-between">
                  <div>
                    <p className="font-display text-lg font-semibold text-moss-900">{peso(product.price)}</p>
                    <p className="text-[11px] text-moss-500">per {product.unit}</p>
                  </div>
                  <span className={`chip ${product.stock > 0 ? "bg-moss-50 text-moss-700" : "bg-rose-50 text-rose-700"}`}>
                    {product.stock > 0 ? `${product.stock} left` : "Sold out"}
                  </span>
                </div>
                <form action={addToCart} className="mt-3 flex items-center gap-2">
                  <input type="hidden" name="productId" value={product.id} />
                  <input type="hidden" name="next" value={`/market/${shop.slug}`} />
                  <input
                    type="number"
                    name="qty"
                    min={1}
                    max={Math.max(product.stock, 1)}
                    defaultValue={1}
                    className="input w-20 py-1.5 text-center"
                    aria-label={`Quantity for ${product.name}`}
                    disabled={product.stock < 1 || !shop.is_open}
                  />
                  <button
                    type="submit"
                    className="btn-primary flex-1 py-2"
                    disabled={product.stock < 1 || !shop.is_open}
                  >
                    {product.stock < 1 ? "Sold out" : shop.is_open ? "Add to cart" : "Shop closed"}
                  </button>
                </form>
              </article>
            ))}
            {products.length === 0 ? (
              <p className="card p-6 text-sm text-moss-600">This shop has not listed any products yet.</p>
            ) : null}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">About this shop</h2>
            <p className="mt-1.5 text-sm text-moss-700">{shop.description}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-moss-500">Barangay</dt>
                <dd className="font-semibold text-moss-900">{shop.barangay}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-moss-500">Category</dt>
                <dd className="font-semibold text-moss-900">{shop.category}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-moss-500">Fulfilment</dt>
                <dd className="font-semibold text-moss-900">Delivery &amp; pick-up</dd>
              </div>
            </dl>
          </div>

          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Delivery rates</h2>
            <ul className="mt-2 space-y-2">
              {rates.map((rate) => (
                <li key={rate.id} className="flex items-center justify-between rounded-2xl bg-moss-50 px-3 py-2 text-sm">
                  <span>
                    <strong className="block font-semibold text-moss-900">{rate.label}</strong>
                    <span className="text-xs text-moss-500">{rate.eta}</span>
                  </span>
                  <span className="font-semibold text-moss-900">{peso(rate.fee)}</span>
                </li>
              ))}
              <li className="flex items-center justify-between rounded-2xl bg-gold-50 px-3 py-2 text-sm">
                <span className="font-semibold text-gold-900">Pick-up at shop</span>
                <span className="font-semibold text-gold-900">Free</span>
              </li>
            </ul>
          </div>

          <div className="card bg-moss-900 p-4 text-white">
            <h2 className="font-display text-lg font-semibold">Pay your way</h2>
            <p className="mt-1 text-sm text-moss-100">
              GCash and Maya transfers go directly to the seller, who confirms receipt. Cash is settled with the rider at
              hand-over.
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold">
              <span className="chip bg-white/15 text-white">GCash QR</span>
              <span className="chip bg-white/15 text-white">Maya</span>
              <span className="chip bg-white/15 text-white">Cash on delivery</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
