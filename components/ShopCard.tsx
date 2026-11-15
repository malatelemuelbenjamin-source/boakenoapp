import Link from "next/link";
import type { Shop } from "@/lib/types";
import { CategoryPill } from "./ui";

export default function ShopCard({ shop }: { shop: Shop }) {
  return (
    <Link href={`/market/${shop.slug}`} className="card flex gap-3 p-3.5 transition hover:-translate-y-0.5">
      <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${shop.accent} text-2xl`}>
        {shop.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-2">
          <span className="block truncate font-display text-base font-semibold text-moss-900">{shop.name}</span>
          <span className={`chip shrink-0 ${shop.is_open ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
            {shop.is_open ? "Open" : "Closed"}
          </span>
        </span>
        <span className="mt-0.5 line-clamp-1 block text-xs text-moss-600">{shop.tagline}</span>
        <span className="mt-2 flex flex-wrap items-center gap-1.5">
          <CategoryPill category={shop.category} />
          <span className="chip bg-moss-50 text-moss-700">{shop.barangay}</span>
        </span>
      </span>
    </Link>
  );
}
