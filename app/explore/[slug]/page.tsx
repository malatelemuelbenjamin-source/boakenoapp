import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { BucketRow, Destination } from "@/lib/types";
import MapView from "@/components/MapView";
import DestinationCard from "@/components/DestinationCard";
import { CategoryPill, SectionHead } from "@/components/ui";
import { addToBucket, setBucketStatus, removeFromBucket } from "@/app/actions/tourism";

export default async function DestinationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const destination = await queryOne<Destination>(
    "SELECT * FROM destinations WHERE slug = ? AND status = 'published'",
    slug,
  );
  if (!destination) notFound();

  const user = await getCurrentUser();
  const saved = user
    ? await queryOne<BucketRow>("SELECT * FROM bucket_list WHERE user_id = ? AND destination_id = ?", user.id, destination.id)
    : undefined;

  const nearby = await query<Destination>(
    `SELECT * FROM destinations WHERE status = 'published' AND id != ?
     ORDER BY CASE WHEN category = ? THEN 0 ELSE 1 END, name LIMIT 3`,
    destination.id,
    destination.category,
  );

  const facts = [
    { label: "Barangay", value: destination.barangay, emoji: "📍" },
    { label: "Opening hours", value: destination.hours, emoji: "🕒" },
    { label: "Entrance / fee", value: destination.fee, emoji: "🎟️" },
    { label: "Suggested visit", value: destination.duration, emoji: "⏱️" },
  ].filter((fact) => Boolean(fact.value));

  const hasPin = destination.lat !== null && destination.lng !== null;

  return (
    <div className="space-y-6">
      <Link href="/explore" className="text-sm font-semibold text-moss-700 hover:text-moss-900">
        ← Back to explore
      </Link>

      <section className={`relative overflow-hidden rounded-[28px] bg-gradient-to-br ${destination.accent} p-6 text-white shadow-card`}>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15 blur-2xl animate-drift" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2">
            <CategoryPill category={destination.category} />
            <span className="chip bg-white/20 text-white">{destination.barangay}</span>
          </div>
          <span className="mt-4 block text-5xl animate-bob" aria-hidden="true">
            {destination.emoji}
          </span>
          <h1 className="mt-2 max-w-2xl font-display text-3xl font-semibold leading-tight md:text-4xl">
            {destination.name}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-white/90">{destination.description}</p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Know before you go</h2>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {facts.map((row) => (
                <div key={row.label} className="rounded-2xl bg-moss-50 p-3">
                  <dt className="text-[10px] font-semibold uppercase tracking-wide text-moss-500">{row.label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-moss-900">
                    <span className="mr-1" aria-hidden="true">
                      {row.emoji}
                    </span>
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
            {!destination.hours && !destination.fee ? (
              <p className="mt-3 rounded-2xl bg-gold-50 px-3 py-2 text-xs text-gold-900">
                Hours and fees for this place are not published in our sources. Confirm with the Boac tourism office before
                travelling.
              </p>
            ) : null}
            {hasPin ? (
              <a
                href={`https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}`}
                target="_blank"
                rel="noreferrer"
                className="btn-ghost mt-3 w-full"
              >
                Get directions
              </a>
            ) : (
              <p className="mt-3 rounded-2xl bg-moss-50 px-3 py-2 text-xs text-moss-600">
                No verified map pin has been published for this place yet.
              </p>
            )}
          </div>

          {hasPin ? (
            <div className="card overflow-hidden p-2">
              <MapView
                points={[
                  {
                    id: destination.id,
                    lat: destination.lat as number,
                    lng: destination.lng as number,
                    title: destination.name,
                    subtitle: destination.barangay,
                    emoji: destination.emoji,
                  },
                ]}
                center={{ lat: destination.lat as number, lng: destination.lng as number }}
                zoom={15}
                height={280}
              />
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Your bucket list</h2>
            {!user ? (
              <>
                <p className="mt-1 text-sm text-moss-600">Sign in to plan trips and mark the places you have conquered.</p>
                <Link href={`/login?next=/explore/${destination.slug}`} className="btn-primary mt-3 w-full">
                  Sign in to save
                </Link>
              </>
            ) : !saved ? (
              <>
                <p className="mt-1 text-sm text-moss-600">Add this place and tick it off once you have been there.</p>
                <form action={addToBucket} className="mt-3">
                  <input type="hidden" name="destinationId" value={destination.id} />
                  <input type="hidden" name="slug" value={destination.slug} />
                  <button type="submit" className="btn-primary w-full">
                    + Add to bucket list
                  </button>
                </form>
              </>
            ) : (
              <>
                <p className="mt-1 text-sm text-moss-600">
                  Status:{" "}
                  <strong className="text-moss-900">{saved.status === "visited" ? "Conquered ✓" : "Planned"}</strong>
                </p>
                <div className="mt-3 space-y-2">
                  <form action={setBucketStatus}>
                    <input type="hidden" name="bucketId" value={saved.id} />
                    <input type="hidden" name="status" value={saved.status === "visited" ? "planned" : "visited"} />
                    <button type="submit" className={saved.status === "visited" ? "btn-ghost w-full" : "btn-gold w-full"}>
                      {saved.status === "visited" ? "Move back to planned" : "Mark as visited ✓"}
                    </button>
                  </form>
                  <form action={removeFromBucket}>
                    <input type="hidden" name="bucketId" value={saved.id} />
                    <button type="submit" className="btn-sm w-full py-2 text-rose-700 hover:bg-rose-50">
                      Remove from bucket list
                    </button>
                  </form>
                  <Link href="/bucket-list" className="btn-ghost w-full">
                    Open bucket list
                  </Link>
                </div>
              </>
            )}
          </div>

          <div className="card p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Practical notes</h2>
            <ul className="mt-2 space-y-2 text-sm text-moss-700">
              <li>🛺 Tricycles from the Boac public market reach most poblacion sites.</li>
              <li>🌧️ Afternoon rain is common from June to October.</li>
              <li>🤝 Ask the municipal tourism office for a local guide before visiting far barangays.</li>
            </ul>
          </div>
        </aside>
      </div>

      <section>
        <SectionHead title="Nearby places" subtitle="More of Boac" href="/explore" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {nearby.map((place) => (
            <DestinationCard key={place.id} destination={place} />
          ))}
        </div>
      </section>
    </div>
  );
}
