import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { DeliveryRate, Order, OrderItem, Product, Shop } from "@/lib/types";
import { BARANGAYS, ORDER_LABELS, SHOP_CATEGORIES, PAYMENT_LABELS } from "@/lib/boac";
import { createShop, updateShop, addProduct, updateProduct, deleteProduct, addDeliveryRate, deleteDeliveryRate, updateOrderStatus, markOrderPaid } from "@/app/actions/seller";
import { StatusPill, Alert, Empty } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import ImagePicker from "@/components/ImagePicker";
import { peso, dateTime, timeAgo } from "@/lib/format";

const NEXT_STATUS: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "out_for_delivery", "cancelled"],
  ready: ["completed"],
  out_for_delivery: ["completed"],
};

export default async function SellerPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string; welcome?: string; created?: string }>;
}) {
  const user = await requireUser("/seller");
  const { tab, saved, error, welcome, created } = await searchParams;
  const shop = await queryOne<Shop>("SELECT * FROM shops WHERE owner_id = ?", user.id);

  if (!shop) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <header>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">Seller hub</p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-moss-900">Open your Boac shop</h1>
          <p className="mt-1 text-sm text-moss-600">
            Free to join — no commissions and no listing fees. Set your own delivery rates and get paid through GCash,
            Maya or cash on delivery.
          </p>
        </header>
        {welcome ? <Alert tone="success">Welcome! One more step: create your shop below.</Alert> : null}
        {error === "name" ? <Alert tone="error">Please enter a shop name.</Alert> : null}
        <form action={createShop} className="card space-y-3 p-5">
          <div>
            <label className="label" htmlFor="name">
              Shop name
            </label>
            <input id="name" name="name" required className="input" placeholder="Your shop name" />
          </div>
          <div>
            <label className="label" htmlFor="tagline">
              Tagline
            </label>
            <input id="tagline" name="tagline" className="input" placeholder="Lutong bahay Boac recipes, made fresh daily" />
          </div>
          <div>
            <label className="label" htmlFor="description">
              About your shop
            </label>
            <textarea id="description" name="description" rows={3} className="input resize-none" placeholder="Tell customers what you make and how you work." />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <select id="category" name="category" className="input">
                {SHOP_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="barangay">
                Barangay
              </label>
              <select id="barangay" name="barangay" className="input" defaultValue={user.barangay ?? "Tampus (Poblacion)"}>
                {BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="label" htmlFor="emoji">
              Shop emoji
            </label>
            <input id="emoji" name="emoji" className="input" defaultValue="🏪" maxLength={4} />
          </div>
          <SubmitButton className="btn-primary w-full" pendingLabel="Creating shop…">
            Create my shop
          </SubmitButton>
        </form>
      </div>
    );
  }

  const activeTab = ["orders", "products", "settings"].includes(tab ?? "") ? (tab as string) : "orders";
  const products = await query<Product>("SELECT * FROM products WHERE shop_id = ? ORDER BY id", shop.id);
  const rates = await query<DeliveryRate>("SELECT * FROM delivery_rates WHERE shop_id = ? ORDER BY fee", shop.id);
  const orders = await query<Order & { buyer_name: string; buyer_phone: string | null }>(
    `SELECT o.*, u.name buyer_name, u.phone buyer_phone
       FROM orders o JOIN users u ON u.id = o.user_id
      WHERE o.shop_id = ? ORDER BY o.placed_at DESC LIMIT 40`,
    shop.id,
  );
  const stats = await queryOne<{ revenue: number; active: number; items: number; low: number }>(
    `SELECT (SELECT COALESCE(SUM(total),0) FROM orders WHERE shop_id = ? AND status = 'completed') revenue,
            (SELECT COUNT(*) FROM orders WHERE shop_id = ? AND status NOT IN ('completed','cancelled')) active,
            (SELECT COUNT(*) FROM products WHERE shop_id = ?) items,
            (SELECT COUNT(*) FROM products WHERE shop_id = ? AND stock <= 3) low`,
    shop.id,
    shop.id,
    shop.id,
    shop.id,
  );
  // One query for every order's lines keeps the render synchronous.
  const orderIds = orders.map((order) => order.id);
  const orderItems = orderIds.length
    ? await query<OrderItem>(
        `SELECT * FROM order_items WHERE order_id IN (${orderIds.map(() => "?").join(", ")}) ORDER BY id`,
        ...orderIds,
      )
    : [];
  const itemsByOrder = new Map<number, OrderItem[]>();
  for (const item of orderItems) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  const tabs = [
    { key: "orders", label: `Orders (${stats?.active ?? 0} active)` },
    { key: "products", label: `Products (${products.length})` },
    { key: "settings", label: "Shop settings" },
  ];

  return (
    <div className="space-y-5">
      <header className={`rounded-[28px] bg-gradient-to-br ${shop.accent} p-5 text-white shadow-card`}>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/20 text-2xl">{shop.emoji}</span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/70">Seller hub</p>
            <h1 className="font-display text-2xl font-semibold leading-tight">{shop.name}</h1>
            <p className="text-xs text-white/80">
              {shop.barangay} · {shop.category} · {shop.is_open ? "Open for orders" : "Currently closed"}
            </p>
          </div>
          <Link href={`/market/${shop.slug}`} className="btn bg-white text-moss-900 hover:bg-white/90">
            View public page
          </Link>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { label: "Completed sales", value: peso(stats?.revenue ?? 0) },
            { label: "Active orders", value: stats?.active ?? 0 },
            { label: "Products", value: stats?.items ?? 0 },
            { label: "Low stock", value: stats?.low ?? 0 },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/15 px-3 py-2">
              <dt className="text-[10px] uppercase tracking-wide text-white/70">{stat.label}</dt>
              <dd className="font-display text-lg font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {saved ? <Alert tone="success">Saved. Your changes are live.</Alert> : null}
      {created ? <Alert tone="success">Shop created. Add your first products below.</Alert> : null}
      {error === "rates" ? <Alert tone="error">You have reached the maximum of 20 delivery rates.</Alert> : null}
      {error === "transition" ? <Alert tone="error">That status change is not allowed from the current state.</Alert> : null}
      {error === "fields" ? <Alert tone="error">Please complete the required fields.</Alert> : null}
      {error === "image" ? (
        <Alert tone="error">That photo could not be used. Choose a JPG, PNG, WebP or GIF under 5 MB.</Alert>
      ) : null}
      {saved === "payment" ? <Alert tone="success">Payment confirmed and the customer has been notified.</Alert> : null}

      <div className="flex gap-1.5 overflow-x-auto">
        {tabs.map((item) => (
          <Link key={item.key} href={`/seller?tab=${item.key}`} className={`tab shrink-0 ${activeTab === item.key ? "tab-active" : "bg-white"}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "orders" ? (
        <section className="space-y-3">
          {orders.length === 0 ? (
            <Empty emoji="🧾" title="No orders yet" body="When a customer orders, it will appear here with their delivery details." />
          ) : (
            orders.map((order) => {
              const items = itemsByOrder.get(order.id) ?? [];
              const next = (NEXT_STATUS[order.status] ?? []).filter((status) =>
                order.mode === "pickup" ? status !== "out_for_delivery" : status !== "ready",
              );
              return (
                <article key={order.id} className="card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-moss-500">{order.code}</span>
                        <StatusPill status={order.status} />
                        <span className="chip bg-moss-50 text-moss-700">{order.mode === "pickup" ? "Pick-up" : "Delivery"}</span>
                        <span className="chip bg-gold-50 text-gold-800">{PAYMENT_LABELS[order.payment_method] ?? order.payment_method}</span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-moss-900">
                        {order.buyer_name} {order.buyer_phone ? <span className="font-normal text-moss-500">· {order.buyer_phone}</span> : null}
                      </p>
                      <p className="text-xs text-moss-500">{dateTime(order.placed_at)} · {timeAgo(order.placed_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl font-semibold text-moss-900">{peso(order.total)}</p>
                      <p className="text-[11px] text-moss-500">
                        {order.payment_status === "paid" ? "Paid" : "Unpaid"} · fee {peso(order.delivery_fee)}
                      </p>
                    </div>
                  </div>

                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {items.map((item) => (
                      <li key={item.id} className="chip bg-moss-50 text-moss-700">
                        {item.emoji} {item.qty}× {item.name}
                      </li>
                    ))}
                  </ul>

                  <p className="mt-2 text-xs text-moss-600">
                    {order.mode === "pickup" ? "Pick-up order" : "Deliver to"}: {order.address_text}
                  </p>
                  {order.note ? <p className="mt-1 rounded-xl bg-gold-50 px-2.5 py-1.5 text-xs text-gold-900">Note: {order.note}</p> : null}

                  {order.payment_status !== "paid" && order.payment_method !== "cod" ? (
                    <form action={markOrderPaid} className="mt-2">
                      <input type="hidden" name="orderId" value={order.id} />
                      <SubmitButton className="btn-sm border border-emerald-200 px-3 py-1.5 text-emerald-800 hover:bg-emerald-50" pendingLabel="Saving…">
                        Mark payment received
                      </SubmitButton>
                    </form>
                  ) : null}

                  {next.length > 0 ? (
                    <form action={updateOrderStatus} className="mt-3 flex flex-wrap items-end gap-2 border-t border-moss-100 pt-3">
                      <input type="hidden" name="orderId" value={order.id} />
                      <div>
                        <label className="label" htmlFor={`status-${order.id}`}>
                          Next status
                        </label>
                        <select id={`status-${order.id}`} name="status" className="input py-1.5">
                          {next.map((status) => (
                            <option key={status} value={status}>
                              {ORDER_LABELS[status] ?? status}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="min-w-[180px] flex-1">
                        <label className="label" htmlFor={`note-${order.id}`}>
                          Note to customer (optional)
                        </label>
                        <input id={`note-${order.id}`} name="note" className="input py-1.5" placeholder="Rider on the way, 15 mins" />
                      </div>
                      <SubmitButton className="btn-primary py-2" pendingLabel="Updating…">
                        Update order
                      </SubmitButton>
                    </form>
                  ) : (
                    <p className="mt-3 border-t border-moss-100 pt-2 text-xs text-moss-500">No further action needed.</p>
                  )}
                </article>
              );
            })
          )}
        </section>
      ) : null}

      {activeTab === "products" ? (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2.5">
            {products.map((product) => (
              <article key={product.id} className="card p-3.5">
                <div className="flex items-start gap-3">
                  {product.image_id ? (
                    <img src={`/media/${product.image_id}`} alt={product.name} className="h-12 w-12 shrink-0 rounded-2xl object-cover" />
                  ) : (
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-moss-50 text-xl">{product.emoji}</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-moss-900">{product.name}</p>
                    <p className="text-xs text-moss-500">{product.unit} · {peso(product.price)} · {product.stock} in stock</p>
                  </div>
                  <span className={`chip ${product.is_active ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                    {product.is_active ? "Active" : "Hidden"}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <form action={updateProduct} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="productId" value={product.id} />
                    <div>
                      <label className="label" htmlFor={`price-${product.id}`}>
                        Price (₱)
                      </label>
                      <input
                        id={`price-${product.id}`}
                        name="price"
                        type="number"
                        step="0.01"
                        min="1"
                        defaultValue={(product.price / 100).toFixed(2)}
                        className="input w-24 py-1.5"
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor={`stock-${product.id}`}>
                        Stock
                      </label>
                      <input
                        id={`stock-${product.id}`}
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue={product.stock}
                        className="input w-20 py-1.5"
                      />
                    </div>
                    <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-moss-700">
                      <input type="checkbox" name="isActive" defaultChecked={product.is_active === 1} className="accent-moss-700" />
                      Visible
                    </label>
                    <ImagePicker
                      name="image"
                      label="Photo"
                      compact
                      existingUrl={product.image_id ? `/media/${product.image_id}` : null}
                    />
                    {product.image_id ? (
                      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-rose-700">
                        <input type="checkbox" name="removeImage" className="accent-rose-600" />
                        Remove photo
                      </label>
                    ) : null}
                    <SubmitButton className="btn-ghost py-1.5" pendingLabel="Saving…">
                      Save
                    </SubmitButton>
                  </form>
                  <form action={deleteProduct}>
                    <input type="hidden" name="productId" value={product.id} />
                    <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                      Delete
                    </button>
                  </form>
                </div>
              </article>
            ))}
            {products.length === 0 ? (
              <Empty emoji="🛍️" title="No products yet" body="Add your first product using the form — it will appear in the market immediately." />
            ) : null}
          </div>

          <form action={addProduct} className="card h-fit space-y-3 p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Add a product</h2>
            <div>
              <label className="label" htmlFor="product-name">
                Product name
              </label>
              <input id="product-name" name="name" required className="input" placeholder="Bibingkang Boac" />
            </div>
            <div>
              <label className="label" htmlFor="product-desc">
                Description
              </label>
              <textarea id="product-desc" name="description" rows={2} className="input resize-none" placeholder="Clay-pot baked rice cake with salted egg. 8 slices." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="product-price">
                  Price (₱)
                </label>
                <input id="product-price" name="price" type="number" step="0.01" min="1" required className="input" placeholder="85.00" />
              </div>
              <div>
                <label className="label" htmlFor="product-unit">
                  Unit
                </label>
                <input id="product-unit" name="unit" className="input" placeholder="8 pcs" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="product-stock">
                  Stock
                </label>
                <input id="product-stock" name="stock" type="number" min="0" defaultValue={20} className="input" />
              </div>
              <div>
                <label className="label" htmlFor="product-emoji">
                  Emoji
                </label>
                <input id="product-emoji" name="emoji" maxLength={4} defaultValue="🛍️" className="input" />
              </div>
            </div>
            <ImagePicker label="Product photo (optional)" />
            <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
              Add product
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {activeTab === "settings" ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <form action={updateShop} className="card space-y-3 p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Shop profile</h2>
            <div>
              <label className="label" htmlFor="shop-tagline">
                Tagline
              </label>
              <input id="shop-tagline" name="tagline" defaultValue={shop.tagline ?? ""} className="input" maxLength={140} />
            </div>
            <div>
              <label className="label" htmlFor="shop-description">
                Description
              </label>
              <textarea id="shop-description" name="description" rows={5} defaultValue={shop.description ?? ""} className="input resize-none" maxLength={800} />
            </div>
            <label className="flex items-center gap-2 text-sm text-moss-800">
              <input type="checkbox" name="isOpen" defaultChecked={shop.is_open === 1} className="accent-moss-700" />
              Accepting orders (shop is open)
            </label>
            <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">
              Save shop profile
            </SubmitButton>
          </form>

          <div className="space-y-4">
            <div className="card p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold text-moss-900">Delivery rates</h2>
                <span className="chip bg-moss-50 text-moss-700">{rates.length}/20</span>
              </div>
              <ul className="mt-2 space-y-2">
                {rates.map((rate) => (
                  <li key={rate.id} className="flex items-center justify-between rounded-2xl bg-moss-50 px-3 py-2 text-sm">
                    <span>
                      <strong className="block font-semibold text-moss-900">{rate.label}</strong>
                      <span className="text-xs text-moss-500">{rate.eta}</span>
                    </span>
                    <span className="flex items-center gap-2">
                      <span className="font-semibold text-moss-900">{peso(rate.fee)}</span>
                      <form action={deleteDeliveryRate}>
                        <input type="hidden" name="rateId" value={rate.id} />
                        <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                          Remove
                        </button>
                      </form>
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <form action={addDeliveryRate} className="card space-y-3 p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">Add a delivery rate</h2>
              <div>
                <label className="label" htmlFor="rate-label">
                  Label
                </label>
                <input id="rate-label" name="label" required className="input" placeholder="Poblacion delivery" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label" htmlFor="rate-fee">
                    Fee (₱)
                  </label>
                  <input id="rate-fee" name="fee" type="number" step="0.01" min="0" required className="input" placeholder="20.00" />
                </div>
                <div>
                  <label className="label" htmlFor="rate-eta">
                    ETA
                  </label>
                  <input id="rate-eta" name="eta" className="input" placeholder="20–30 mins" />
                </div>
              </div>
              <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
                Add rate
              </SubmitButton>
            </form>
          </div>
        </section>
      ) : null}
    </div>
  );
}
