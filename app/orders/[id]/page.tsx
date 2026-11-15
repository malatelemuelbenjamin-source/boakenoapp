import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { Address, Order, OrderEvent, OrderItem, Shop } from "@/lib/types";
import { ORDER_LABELS, PAYMENT_LABELS } from "@/lib/boac";
import { StatusPill, Alert } from "@/components/ui";
import Celebrate from "@/components/Celebrate";
import { peso, dateTime } from "@/lib/format";
import { cancelOrder } from "@/app/actions/orders";

export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const user = await requireUser("/orders");
  const { id } = await params;
  const { placed } = await searchParams;
  const order = await queryOne<Order & { shop_name: string; shop_slug: string; shop_emoji: string; owner_id: number }>(
    `SELECT o.*, s.name shop_name, s.slug shop_slug, s.emoji shop_emoji, s.owner_id
       FROM orders o JOIN shops s ON s.id = o.shop_id
      WHERE o.id = ? AND o.user_id = ?`,
    Number(id),
    user.id,
  );
  if (!order) notFound();

  const shop = await queryOne<Shop>("SELECT * FROM shops WHERE id = ?", order.shop_id);
  const items = await query<OrderItem>("SELECT * FROM order_items WHERE order_id = ? ORDER BY id", order.id);
  const events = await query<OrderEvent>("SELECT * FROM order_events WHERE order_id = ? ORDER BY created_at", order.id);
  const address = order.address_id
    ? await queryOne<Address>("SELECT * FROM addresses WHERE id = ?", order.address_id)
    : null;

  const steps = ["placed", "confirmed", "preparing", order.mode === "pickup" ? "ready" : "out_for_delivery", "completed"];
  const cancelled = order.status === "cancelled";
  const currentIndex = steps.indexOf(order.status);

  return (
    <div className="space-y-4">
      <Link href="/orders" className="text-sm font-semibold text-moss-700 hover:text-moss-900">
        ← All orders
      </Link>

      {placed ? <Celebrate /> : null}

      {placed ? (
        <Alert tone="success">
          <strong className="font-semibold">Order placed!</strong> {shop?.name} has been notified. We will send you a
          notification as soon as they confirm.
        </Alert>
      ) : null}

      <header className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-wide text-moss-500">{order.code}</p>
            <h1 className="mt-1 font-display text-2xl font-semibold text-moss-900">{order.shop_name}</h1>
            <p className="mt-0.5 text-sm text-moss-600">
              Placed {dateTime(order.placed_at)} · {order.mode === "pickup" ? "Pick-up" : "Delivery"}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <StatusPill status={order.status} />
            <span className="font-display text-2xl font-semibold text-moss-900">{peso(order.total)}</span>
            <span className="text-[11px] text-moss-500">
              {PAYMENT_LABELS[order.payment_method] ?? order.payment_method} ·{" "}
              {order.payment_status === "paid" ? "Payment confirmed" : "Payment not yet confirmed"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href={`/orders/${order.id}/receipt`} target="_blank" rel="noreferrer" className="btn-ghost">
            View receipt
          </a>
          <a href={`/orders/${order.id}/receipt?download=1`} className="btn-ghost">
            ⬇ Download receipt
          </a>

        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section className="card p-5">
          <h2 className="font-display text-lg font-semibold text-moss-900">Tracking</h2>
          {cancelled ? (
            <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              This order was cancelled. Any online payment is refunded to the wallet used.
            </div>
          ) : (
            <ol className="mt-4 space-y-0">
              {steps.map((step, index) => {
                const done = index <= currentIndex;
                const event = [...events].reverse().find((e) => e.status === step);
                return (
                  <li key={step} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <span
                        className={`grid h-7 w-7 place-items-center rounded-full text-[11px] font-bold ${
                          done ? "bg-moss-700 text-white" : "border border-moss-200 bg-white text-moss-400"
                        }`}
                      >
                        {done ? "✓" : index + 1}
                      </span>
                      {index < steps.length - 1 ? (
                        <span className={`w-0.5 flex-1 ${index < currentIndex ? "bg-moss-600" : "bg-moss-100"}`} style={{ minHeight: 28 }} />
                      ) : null}
                    </div>
                    <div className={`pb-4 ${done ? "" : "opacity-60"}`}>
                      <p className="text-sm font-semibold text-moss-900">{ORDER_LABELS[step] ?? step}</p>
                      <p className="text-xs text-moss-500">
                        {event ? event.note ?? "" : step === "completed" ? "Waiting" : "Pending"}
                        {event ? ` · ${dateTime(event.created_at)}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}

          <details className="mt-2 rounded-2xl bg-moss-50 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-moss-800">Full activity log</summary>
            <ul className="mt-2 space-y-2">
              {events.map((event) => (
                <li key={event.id} className="text-xs text-moss-600">
                  <span className="font-semibold text-moss-900">{ORDER_LABELS[event.status] ?? event.status}</span> ·{" "}
                  {dateTime(event.created_at)}
                  {event.note ? <span className="block">{event.note}</span> : null}
                </li>
              ))}
            </ul>
          </details>

          {["placed", "confirmed"].includes(order.status) ? (
            <form action={cancelOrder} className="mt-4">
              <input type="hidden" name="orderId" value={order.id} />
              <button type="submit" className="btn-sm border border-rose-200 px-3 py-2 text-rose-700 hover:bg-rose-50">
                Cancel order
              </button>
            </form>
          ) : null}
        </section>

        <section className="space-y-4">
          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-moss-900">Items</h2>
            <ul className="mt-2 divide-y divide-moss-100">
              {items.map((item) => (
                <li key={item.id} className="flex items-center gap-2 py-2 text-sm">
                  <span className="text-lg">{item.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-moss-900">{item.name}</span>
                    <span className="text-xs text-moss-500">
                      {item.qty} × {peso(item.price)}
                    </span>
                  </span>
                  <span className="font-semibold text-moss-900">{peso(item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1.5 border-t border-moss-100 pt-3 text-sm">
              <div className="flex justify-between text-moss-600">
                <dt>Subtotal</dt>
                <dd>{peso(order.subtotal)}</dd>
              </div>
              <div className="flex justify-between text-moss-600">
                <dt>{order.mode === "pickup" ? "Pick-up" : "Delivery fee"}</dt>
                <dd>{order.delivery_fee ? peso(order.delivery_fee) : "Free"}</dd>
              </div>
              <div className="flex justify-between pt-1 font-display text-lg font-semibold text-moss-900">
                <dt>Total</dt>
                <dd>{peso(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="font-display text-lg font-semibold text-moss-900">
              {order.mode === "pickup" ? "Pick-up details" : "Delivery details"}
            </h2>
            <p className="mt-1 text-sm text-moss-700">{order.address_text}</p>
            {address ? (
              <p className="mt-1 text-xs text-moss-500">
                {address.notes ? `Note: ${address.notes}` : "No rider notes saved."}
              </p>
            ) : null}
            {order.note ? (
              <p className="mt-2 rounded-2xl bg-gold-50 p-2.5 text-xs text-gold-900">Your note: {order.note}</p>
            ) : null}
            {order.payment_status !== "paid" && order.payment_method !== "cod" ? (
              <p className="mt-2 rounded-2xl bg-gold-50 px-3 py-2 text-[11px] text-gold-900">
                Send your {PAYMENT_LABELS[order.payment_method] ?? order.payment_method} transfer to the seller. They will
                confirm receipt here.
              </p>
            ) : null}
            <Link href={`/market/${order.shop_slug}`} className="btn-ghost mt-3 w-full">
              Visit {order.shop_name}
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
