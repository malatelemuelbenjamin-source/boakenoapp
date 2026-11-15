import Link from "next/link";
import { query, queryOne } from "@/lib/db";
import { SHOP_CATEGORIES } from "@/lib/boac";
import type { Shop } from "@/lib/types";
import ShopCard from "@/components/ShopCard";
import { Empty, SectionHead } from "@/components/ui";

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ cat?: string; q?: string }> }) {
  const { cat, q } = await searchParams;
  const activeCat = cat && SHOP_CATEGORIES.includes(cat as (typeof SHOP_CATEGORIES)[number]) ? cat : null;
  const term = (q ?? "").trim();

  const shops = await query<Shop & { product_count: number }>(
    `SELECT s.*, (SELECT COUNT(*) FROM products p WHERE p.shop_id = s.id AND p.is_active = 1) product_count
       FROM shops s
      WHERE 1 = 1
        ${activeCat ? "AND s.category = ?" : ""}
        ${term ? "AND (lower(s.name) LIKE ? ESCAPE '\\' OR lower(COALESCE(s.tagline,'')) LIKE ? ESCAPE '\\' OR lower(s.category) LIKE ? ESCAPE '\\')" : ""}
      ORDER BY s.is_open DESC, s.created_at DESC`,
    ...(activeCat ? [activeCat] : []),
    ...(term
      ? Array(3).fill(`%${term.toLowerCase().replace(/[\\%_]/g, (character) => `\\${character}`)}%`)
      : []),
  );

  const totals = await queryOne<{ shops: number; products: number; barangays: number }>(
    `SELECT (SELECT COUNT(*) FROM shops) shops,
            (SELECT COUNT(*) FROM products WHERE is_active = 1) products,
            (SELECT COUNT(DISTINCT barangay) FROM shops) barangays`,
  );

  return (
    <div className="space-y-6">
      <header className="rounded-[28px] bg-gradient-to-br from-gold-300 via-gold-200 to-moss-100 p-6 shadow-card">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-800">Boac marketplace</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-moss-950">Buy straight from Boac sellers</h1>
        <p className="mt-1 max-w-2xl text-sm text-moss-800">
          No middlemen, no commissions. Order for delivery or pick-up, pay with GCash, Maya or cash on delivery, and track
          every step.
        </p>
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-moss-800">
          <span className="chip bg-white/70">{totals?.shops ?? 0} shops</span>
          <span className="chip bg-white/70">{totals?.products ?? 0} products</span>
          <span className="chip bg-white/70">{totals?.barangays ?? 0} barangays</span>
        </div>
      </header>

      <form className="flex flex-col gap-2 sm:flex-row">
        <input
          name="q"
          defaultValue={term}
          placeholder="Search shops, delicacies, crafts…"
          className="input"
          aria-label="Search the marketplace"
        />
        {activeCat ? <input type="hidden" name="cat" value={activeCat} /> : null}
        <button type="submit" className="btn-primary sm:w-36">
          Search
        </button>
      </form>

      <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto px-1">
        <Link href="/market" className={`chip shrink-0 ${!activeCat ? "bg-moss-900 text-white" : "bg-white text-moss-700"}`}>
          All shops
        </Link>
        {SHOP_CATEGORIES.map((category) => (
          <Link
            key={category}
            href={`/market?cat=${encodeURIComponent(category)}`}
            className={`chip shrink-0 ${activeCat === category ? "bg-moss-900 text-white" : "bg-white text-moss-700"}`}
          >
            {category}
          </Link>
        ))}
      </div>

      <section>
        <SectionHead
          title={term ? `Results for “${term}”` : activeCat ? `${activeCat} shops` : "All Boac shops"}
          subtitle={`${shops.length} shop${shops.length === 1 ? "" : "s"} · free to open, no listing fees`}
          href="/seller"
          linkLabel="Sell here"
        />
        {shops.length === 0 ? (
          <Empty emoji="🔍" title="No shops matched" body="Try a different keyword or browse all shops." action={{ href: "/market", label: "Clear filters" }} />
        ) : (
          <div className="grid gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {shops.map((shop) => (
              <div key={shop.id}>
                <ShopCard shop={shop} />
                <p className="mt-1 px-1 text-[11px] text-moss-500">{shop.product_count} products · {shop.orders_count} orders served</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-3xl border border-moss-200 bg-white p-5 shadow-card">
        <h2 className="font-display text-lg font-semibold text-moss-900">How ordering works</h2>
        <ol className="mt-3 grid gap-3 text-sm text-moss-700 sm:grid-cols-4">
          {[
            ["1", "Pick a shop", "Browse products from Boac sellers."],
            ["2", "Choose delivery or pick-up", "Pin your address on the map."],
            ["3", "Pay your way", "GCash, Maya or cash on delivery."],
            ["4", "Track to your door", "Live status and a downloadable receipt."],
          ].map(([step, title, body]) => (
            <li key={step} className="rounded-2xl bg-moss-50 p-3">
              <span className="grid h-7 w-7 place-items-center rounded-full bg-moss-800 text-xs font-bold text-white">{step}</span>
              <p className="mt-2 font-semibold text-moss-900">{title}</p>
              <p className="mt-0.5 text-xs text-moss-600">{body}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
