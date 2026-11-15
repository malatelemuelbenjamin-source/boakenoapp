import Link from "next/link";
import { query } from "@/lib/db";
import { DESTINATION_CATEGORIES, MUNICIPALITY } from "@/lib/boac";
import { getCurrentUser } from "@/lib/auth";
import type { Destination } from "@/lib/types";
import MapView from "@/components/MapView";
import DestinationCard, { DestinationRow } from "@/components/DestinationCard";
import { SectionHead } from "@/components/ui";
import { addToBucket } from "@/app/actions/tourism";

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const { cat } = await searchParams;
  const user = await getCurrentUser();
  const activeCat = cat && DESTINATION_CATEGORIES.includes(cat as (typeof DESTINATION_CATEGORIES)[number]) ? cat : null;

  const destinations = await query<Destination>(
    `SELECT * FROM destinations WHERE status = 'published' ${activeCat ? "AND category = ?" : ""}
     ORDER BY featured DESC, name`,
    ...(activeCat ? [activeCat] : []),
  );
  const all = await query<Destination>("SELECT * FROM destinations WHERE status = 'published'");
  const saved = user
    ? new Set(
        (await query<{ destination_id: number }>("SELECT destination_id FROM bucket_list WHERE user_id = ?", user.id)).map(
          (r) => r.destination_id,
        ),
      )
    : new Set<number>();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-700">Explore</p>
        <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-moss-900">Boac, mapped</h1>
        <p className="mt-1 max-w-2xl text-sm text-moss-600">
          Heritage churches, ancestral streets, the longest bridge in the province and the beaches south of the capital.
          Tap a pin for details, then save it to your bucket list.
        </p>
      </header>

      <section className="card overflow-hidden p-2">
        <MapView
          points={destinations
            .filter((d) => d.lat !== null && d.lng !== null)
            .map((d) => ({
              id: d.id,
              lat: d.lat as number,
              lng: d.lng as number,
              title: d.name,
              subtitle: `${d.category} · ${d.barangay}`,
              href: `/explore/${d.slug}`,
              emoji: d.emoji,
            }))}
          center={MUNICIPALITY.center}
          height={340}
        />
        <p className="px-2 pt-2 text-[11px] text-moss-500">
          Pins appear only for places with published coordinates. Others are listed below without a pin.
        </p>
        <div className="flex flex-wrap gap-1.5 px-2 py-2">
          <Link href="/explore" className={`chip ${!activeCat ? "bg-moss-900 text-white" : "bg-moss-50 text-moss-700"}`}>
            All {all.length}
          </Link>
          {DESTINATION_CATEGORIES.map((category) => {
            const count = all.filter((d) => d.category === category).length;
            if (count === 0) return null;
            return (
              <Link
                key={category}
                href={`/explore?cat=${encodeURIComponent(category)}`}
                className={`chip ${activeCat === category ? "bg-moss-900 text-white" : "bg-moss-50 text-moss-700"}`}
              >
                {category} {count}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        <SectionHead
          title={activeCat ? `${activeCat} places` : "All places"}
          subtitle={`${destinations.length} destination${destinations.length === 1 ? "" : "s"} in Boac`}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((destination) => (
            <DestinationCard
              key={destination.id}
              destination={destination}
              footer={
                saved.has(destination.id) ? (
                  <span className="flex items-center justify-between text-xs font-semibold text-moss-600">
                    Saved to bucket list
                    <Link href="/bucket-list" className="text-moss-800 underline">
                      View
                    </Link>
                  </span>
                ) : (
                  <form action={addToBucket} className="flex items-center justify-between gap-2">
                    <input type="hidden" name="destinationId" value={destination.id} />
                    <input type="hidden" name="slug" value={destination.slug} />
                    <span className="text-xs text-moss-500">Plan this trip</span>
                    <button type="submit" className="btn-sm border border-moss-200 px-3 py-1.5 text-moss-800 hover:bg-moss-50">
                      + Bucket list
                    </button>
                  </form>
                )
              }
            />
          ))}
        </div>
      </section>

      <section className="card p-4">
        <h2 className="font-display text-lg font-semibold text-moss-900">Quick picks</h2>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          {destinations.slice(0, 6).map((destination) => (
            <DestinationRow key={destination.id} destination={destination} />
          ))}
        </div>
      </section>
    </div>
  );
}
