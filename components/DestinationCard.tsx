import Link from "next/link";
import type { Destination } from "@/lib/types";
import { CategoryPill } from "./ui";

export default function DestinationCard({
  destination,
  compact = false,
  footer,
}: {
  destination: Destination;
  compact?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <article className={`card overflow-hidden ${compact ? "w-[260px] shrink-0" : ""}`}>
      <Link href={`/explore/${destination.slug}`} className="block">
        <div className={`relative flex h-[132px] items-center justify-center bg-gradient-to-br ${destination.accent}`}>
          <span className="text-[54px] drop-shadow-sm transition duration-500 group-hover:scale-110" aria-hidden="true">
            {destination.emoji}
          </span>
          <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2 py-0.5">
            <CategoryPill category={destination.category} />
          </span>
        </div>
        <div className="p-4">
          <h3 className="font-display text-lg font-semibold leading-tight text-moss-900">{destination.name}</h3>
          <p className="mt-0.5 text-xs text-moss-500">{destination.barangay}</p>
          {!compact ? (
            <p className="mt-2 line-clamp-2 text-sm text-moss-700">{destination.description}</p>
          ) : null}
          {destination.hours || destination.fee ? (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-moss-600">
              {destination.hours ? <span className="chip bg-moss-50 text-moss-700">🕒 {destination.hours}</span> : null}
              {destination.fee ? <span className="chip bg-gold-50 text-gold-800">🎟️ {destination.fee}</span> : null}
            </div>
          ) : null}
          {!destination.lat || !destination.lng ? (
            <p className="mt-2 text-[11px] text-moss-500">Location pin not published — confirm with the Boac tourism office.</p>
          ) : null}
        </div>
      </Link>
      {footer ? <div className="border-t border-moss-100 px-4 py-3">{footer}</div> : null}
    </article>
  );
}

export function DestinationRow({ destination }: { destination: Destination }) {
  return (
    <Link href={`/explore/${destination.slug}`} className="flex items-center gap-3 rounded-2xl p-2 transition hover:bg-brand-50">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${destination.accent} text-xl`}>
        {destination.emoji}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-moss-900">{destination.name}</span>
        <span className="block truncate text-xs text-moss-500">
          {destination.category} · {destination.barangay}
        </span>
      </span>
    </Link>
  );
}
