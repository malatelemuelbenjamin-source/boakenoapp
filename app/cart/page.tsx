import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { Address, DeliveryRate, Shop } from "@/lib/types";
import { getCart } from "@/lib/cart";
import { setCartQty, removeCartItem } from "@/app/actions/orders";
import CheckoutPanel from "@/components/CheckoutPanel";
import { Alert, Empty } from "@/components/ui";
import { peso } from "@/lib/format";

export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; switched?: string }>;
}) {
  const user = await requireUser("/cart");
  const { error, switched } = await searchParams;
  const lines = await getCart(user.id);

  if (lines.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-semibold text-moss-900">Your basket</h1>
        <Empty
          emoji="🧺"
          title="Your basket is empty"
          body="Browse the Boac marketplace and add products from a shop — one shop per order."
          action={{ href: "/market", label: "Go to the market" }}
        />
      </div>
    );
  }

  const shop = await queryOne<Shop>("SELECT * FROM shops WHERE id = ?", lines[0].shop_id);
  const addresses = await query<Address>(
    "SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, id",
    user.id,
  );
  const rates = await query<DeliveryRate>("SELECT * FROM delivery_rates WHERE shop_id = ? ORDER BY fee", lines[0].shop_id);

  const errorMessage =
    error === "address"
      ? "Please choose a delivery address."
      : error === "rate"
        ? "Please choose a delivery rate for this shop."
        : error === "stock"
          ? "Some items no longer have enough stock. Adjust the quantities in your basket and try again."
          : error === "closed"
            ? "This shop has paused orders for now. Try again once it reopens."
            : undefined;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-moss-900">Checkout</h1>
          <p className="text-sm text-moss-600">
            Ordering from{" "}
            <Link href={`/market/${shop?.slug}`} className="font-semibold text-moss-800 underline">
              {shop?.name}
            </Link>{" "}
            · {lines.reduce((n, l) => n + l.qty, 0)} items
          </p>
        </div>
        <Link href={`/market/${shop?.slug}`} className="btn-ghost">
          + Add more items
        </Link>
      </header>

      {switched ? (
        <Alert tone="info">
          Your basket held items from another shop, so it now contains only this shop&apos;s items — one shop per order.
        </Alert>
      ) : null}

      <section className="card divide-y divide-moss-100">
        {lines.map((line) => (
          <div key={line.id} className="flex flex-wrap items-center gap-3 p-3.5">
            {line.image_id ? (
              <img
                src={`/media/${line.image_id}`}
                alt={line.name}
                className="h-14 w-14 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-moss-50 text-2xl">{line.emoji}</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-moss-900">{line.name}</p>
              <p className="text-xs text-moss-500">
                {peso(line.price)} per {line.unit} · {line.stock} in stock
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <form action={setCartQty}>
                <input type="hidden" name="itemId" value={line.id} />
                <input type="hidden" name="qty" value={line.qty - 1} />
                <button type="submit" className="grid h-8 w-8 place-items-center rounded-full border border-moss-200 text-moss-700 hover:bg-moss-50" aria-label="Decrease quantity">
                  −
                </button>
              </form>
              <span className="w-7 text-center text-sm font-semibold text-moss-900">{line.qty}</span>
              <form action={setCartQty}>
                <input type="hidden" name="itemId" value={line.id} />
                <input type="hidden" name="qty" value={line.qty + 1} />
                <button type="submit" className="grid h-8 w-8 place-items-center rounded-full border border-moss-200 text-moss-700 hover:bg-moss-50" aria-label="Increase quantity">
                  +
                </button>
              </form>
            </div>
            <p className="w-20 text-right text-sm font-semibold text-moss-900">{peso(line.price * line.qty)}</p>
            <form action={removeCartItem}>
              <input type="hidden" name="itemId" value={line.id} />
              <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                Remove
              </button>
            </form>
          </div>
        ))}
      </section>

      <CheckoutPanel
        lines={lines.map((l) => ({ id: l.id, qty: l.qty, product_id: l.product_id, name: l.name, price: l.price, unit: l.unit, emoji: l.emoji, image_id: l.image_id }))}
        addresses={addresses.map((a) => ({ id: a.id, label: a.label, line: a.line, barangay: a.barangay, is_default: a.is_default }))}
        rates={rates.map((r) => ({ id: r.id, label: r.label, fee: r.fee, eta: r.eta }))}
        shopName={shop?.name ?? "the shop"}
        error={errorMessage}
      />
    </div>
  );
}
