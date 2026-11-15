import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { query } from "@/lib/db";
import type { Order } from "@/lib/types";
import { Empty, StatusPill } from "@/components/ui";
import { peso, dateTime } from "@/lib/format";

type Row = Order & { shop_name: string; shop_slug: string; shop_emoji: string; item_count: number };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireUser("/orders");
  const { filter } = await searchParams;
  const active = filter === "active" || filter === "past" ? filter : "all";

  const rows = await query<Row>(
    `SELECT o.*, s.name shop_name, s.slug shop_slug, s.emoji shop_emoji,
            (SELECT COALESCE(SUM(qty),0) FROM order_items i WHERE i.order_id = o.id) item_count
       FROM orders o JOIN shops s ON s.id = o.shop_id
      WHERE o.user_id = ?
        ${active === "active" ? "AND o.status NOT IN ('completed','cancelled')" : ""}
        ${active === "past" ? "AND o.status IN ('completed','cancelled')" : ""}
      ORDER BY o.placed_at DESC`,
    user.id,
  );

  return (
    <div className="space-y-5">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">Orders</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-moss-900">Your Boac orders</h1>
        <p className="mt-1 text-sm text-moss-600">Track every order from placed to completed, and download your receipts.</p>
      </header>

      <div className="flex gap-1.5">
        {[
          { key: "all", label: "All" },
          { key: "active", label: "Active" },
          { key: "past", label: "Completed" },
        ].map((tab) => (
          <Link key={tab.key} href={`/orders${tab.key === "all" ? "" : `?filter=${tab.key}`}`} className={`chip ${active === tab.key ? "bg-moss-900 text-white" : "bg-white text-moss-700"}`}>
            {tab.label}
          </Link>
        ))}
      </div>

      {rows.length === 0 ? (
        <Empty
          emoji="🧾"
          title="No orders here yet"
          body="Your Boac marketplace orders and receipts will appear on this page."
          action={{ href: "/market", label: "Browse the market" }}
        />
      ) : (
        <div className="space-y-2.5">
          {rows.map((order) => (
            <Link key={order.id} href={`/orders/${order.id}`} className="card flex flex-wrap items-center gap-3 p-3.5 transition hover:-translate-y-0.5">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-moss-50 text-xl">{order.shop_emoji}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-moss-500">{order.code}</span>
                  <StatusPill status={order.status} />
                  {order.mode === "pickup" ? <span className="chip bg-moss-50 text-moss-700">Pick-up</span> : null}
                </div>
                <p className="mt-0.5 truncate text-sm font-semibold text-moss-900">{order.shop_name}</p>
                <p className="text-xs text-moss-500">
                  {order.item_count} item{order.item_count === 1 ? "" : "s"} · {dateTime(order.placed_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-display text-lg font-semibold text-moss-900">{peso(order.total)}</p>
                <p className="text-[11px] text-moss-500">
                  {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method.toUpperCase()} ·{" "}
                  {order.payment_status === "paid" ? "paid" : "pending"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
