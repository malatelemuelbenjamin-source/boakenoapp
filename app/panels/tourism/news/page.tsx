import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import type { Announcement, Destination, NewsPost, Officer, Schedule, Venue } from "@/lib/types";
import { BARANGAYS, DESTINATION_CATEGORIES, MUNICIPALITY, NEWS_CATEGORIES } from "@/lib/boac";
import {
  submitDestination,
  reviewDestination,
  toggleFeatured,
  updateVenueStatus,
  addSchedule,
  deleteSchedule,
  reviewOfficer,
  addOfficer,
  addVenue,
  addAnnouncement,
  deleteAnnouncement,
  publishNews,
  deleteNews,
  toggleNewsFeatured,
} from "@/app/actions/tourism";
import { StatusPill, Alert } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import MapView from "@/components/MapView";
import ImagePicker from "@/components/ImagePicker";
import { imageUrl } from "@/lib/media";

export default async function TourismPanelPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; saved?: string; error?: string }>;
}) {
  const user = await requireStaff(["tourism", "admin"], "/panels/tourism");
  const { tab, saved, error } = await searchParams;
  const activeTab = ["places", "park", "officers", "bulletin", "news", "monitor"].includes(tab ?? "")
    ? (tab as string)
    : "places";

  const destinations = await query<Destination>("SELECT * FROM destinations ORDER BY status, created_at DESC");
  const announcements = await query<Announcement>("SELECT * FROM announcements ORDER BY created_at DESC");
  const newsPosts = await query<NewsPost>(
    `SELECT * FROM news ORDER BY CASE kind WHEN 'news' THEN 0 ELSE 1 END, COALESCE(published_at, created_at) DESC`,
  );
  const venues = await query<Venue>("SELECT * FROM park_venues ORDER BY id");
  const schedules = await query<Schedule>("SELECT * FROM park_schedules ORDER BY venue_id, start_time");
  const officers = await query<Officer>("SELECT * FROM officers ORDER BY CASE status WHEN 'pending' THEN 0 ELSE 1 END, created_at DESC");
  const incidents = await query<{ id: number; code: string; type: string; severity: string; status: string; created_at: string }>(
    "SELECT id, code, type, severity, status, created_at FROM incidents ORDER BY created_at DESC LIMIT 6",
  );
  const counts = await queryOne<{ published: number; pending: number; officers: number; venues: number }>(
    `SELECT (SELECT COUNT(*) FROM destinations WHERE status = 'published') published,
            (SELECT COUNT(*) FROM destinations WHERE status = 'pending') pending,
            (SELECT COUNT(*) FROM officers WHERE status = 'pending') officers,
            (SELECT COUNT(*) FROM park_venues) venues`,
  );

  return (
    <div className="space-y-5">
      <header className="rounded-[28px] bg-gradient-to-br from-gold-400 via-gold-600 to-moss-800 p-5 text-white shadow-card">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/80">Tourism administration panel</p>
        <h1 className="mt-1 font-display text-2xl font-semibold">Boac tourism desk</h1>
        <p className="text-xs text-white/85">Signed in as {user.name} · {user.role === "admin" ? "LGU administrator" : "Tourism officer"}</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            { label: "Published places", value: counts?.published ?? 0 },
            { label: "Pending review", value: counts?.pending ?? 0 },
            { label: "Officers pending", value: counts?.officers ?? 0 },
            { label: "Park facilities", value: counts?.venues ?? 0 },
            { label: "News posts", value: newsPosts.filter((post) => post.kind === "news").length },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/20 px-3 py-2 backdrop-blur">
              <dt className="text-[10px] uppercase tracking-wide text-white/80">{stat.label}</dt>
              <dd className="font-display text-lg font-semibold">{stat.value}</dd>
            </div>
          ))}
        </dl>
      </header>

      {saved ? <Alert tone="success">Changes saved and published to the app.</Alert> : null}
      {error === "fields" ? <Alert tone="error">Please complete the required fields.</Alert> : null}
      {error === "image" ? (
        <Alert tone="error">That image could not be used. Choose a JPG, PNG, WebP or GIF under 5 MB.</Alert>
      ) : null}

      <div className="flex gap-1.5 overflow-x-auto">
        {[
          { key: "places", label: `Destinations (${destinations.length})` },
          { key: "park", label: `Park & schedules` },
          { key: "officers", label: `Officers (${officers.filter((o) => o.status === "pending").length} pending)` },
          { key: "bulletin", label: `Bulletin (${announcements.length})` },
          { key: "news", label: `News (${newsPosts.filter((post) => post.kind === "news").length})` },
          { key: "monitor", label: "Monitor" },
        ].map((item) => (
          <Link key={item.key} href={`/panels/tourism?tab=${item.key}`} className={`tab shrink-0 ${activeTab === item.key ? "tab-active" : "bg-white"}`}>
            {item.label}
          </Link>
        ))}
      </div>

      {activeTab === "places" ? (
        <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-2.5">
            {destinations.map((destination) => (
              <article key={destination.id} className="card p-3.5">
                <div className="flex items-start gap-3">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${destination.accent} text-xl`}>
                    {destination.emoji}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="text-sm font-semibold text-moss-900">{destination.name}</p>
                      <StatusPill status={destination.status} />
                      {destination.featured ? <span className="chip bg-gold-100 text-gold-800">Featured</span> : null}
                    </div>
                    <p className="text-xs text-moss-500">
                      {destination.category} · {destination.barangay}
                    </p>
                    <p className="mt-1 line-clamp-2 text-xs text-moss-600">{destination.description}</p>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <form action={reviewDestination} className="flex items-center gap-1.5">
                    <input type="hidden" name="destinationId" value={destination.id} />
                    <select name="review" defaultValue={destination.status === "published" ? "publish" : "pending"} className="input w-auto py-1 text-xs">
                      <option value="publish">Published</option>
                      <option value="pending">Pending</option>
                      <option value="reject">Rejected</option>
                    </select>
                    <SubmitButton className="btn-ghost py-1 text-xs" pendingLabel="Saving…">
                      Apply
                    </SubmitButton>
                  </form>
                  <form action={toggleFeatured}>
                    <input type="hidden" name="destinationId" value={destination.id} />
                    <button type="submit" className="btn-sm border border-moss-200 px-2.5 py-1.5 text-moss-700 hover:bg-moss-50">
                      {destination.featured ? "Unfeature" : "Feature"}
                    </button>
                  </form>
                  {destination.status === "published" ? (
                    <Link href={`/explore/${destination.slug}`} className="text-xs font-semibold text-moss-700 underline">
                      View live
                    </Link>
                  ) : null}
                </div>
              </article>
            ))}
          </div>

          <form action={submitDestination} className="card h-fit space-y-3 p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Add a destination</h2>
            <p className="text-xs text-moss-500">New places start as pending until an administrator publishes them.</p>
            <div>
              <label className="label" htmlFor="dest-name">
                Name
              </label>
              <input id="dest-name" name="name" required className="input" placeholder="Battle of Paye Marker" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="dest-category">
                  Category
                </label>
                <select id="dest-category" name="category" className="input">
                  {DESTINATION_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="dest-barangay">
                  Barangay
                </label>
                <select id="dest-barangay" name="barangay" className="input">
                  {BARANGAYS.map((barangay) => (
                    <option key={barangay} value={barangay}>
                      {barangay}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="label" htmlFor="dest-description">
                Description
              </label>
              <textarea
                id="dest-description"
                name="description"
                rows={3}
                required
                className="input resize-none"
                placeholder="What makes this place worth visiting?"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="dest-hours">
                  Hours
                </label>
                <input id="dest-hours" name="hours" className="input" placeholder="Open daily" />
              </div>
              <div>
                <label className="label" htmlFor="dest-fee">
                  Fee
                </label>
                <input id="dest-fee" name="fee" className="input" placeholder="Free" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-2">
                <span className="label">Pin location (optional)</span>
                <MapView points={[]} center={MUNICIPALITY.center} zoom={12} height={180} pickable />
              </div>
              <div>
                <label className="label" htmlFor="dest-emoji">
                  Emoji
                </label>
                <input id="dest-emoji" name="emoji" maxLength={4} defaultValue="📍" className="input" />
                <label className="label mt-2" htmlFor="dest-duration">
                  Visit length
                </label>
                <input id="dest-duration" name="duration" className="input" placeholder="1–2 hours" />
              </div>
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Submitting…">
              Submit for review
            </SubmitButton>
          </form>
        </section>
      ) : null}

      {activeTab === "park" ? (
        <section className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {venues.map((venue) => (
              <div key={venue.id} className="card p-4">
                <div className="flex items-start gap-2">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-moss-50 text-lg">{venue.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-moss-900">{venue.name}</p>
                    <p className="text-xs text-moss-500">{venue.hours}</p>
                  </div>
                  <StatusPill status={venue.status} />
                </div>
                <form action={updateVenueStatus} className="mt-3 flex items-end gap-2">
                  <input type="hidden" name="venueId" value={venue.id} />
                  <div className="flex-1">
                    <label className="label" htmlFor={`venue-status-${venue.id}`}>
                      Status
                    </label>
                    <select id={`venue-status-${venue.id}`} name="status" defaultValue={venue.status} className="input py-1.5">
                      <option value="open">Open</option>
                      <option value="closed">Closed</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <SubmitButton className="btn-primary py-2" pendingLabel="Saving…">
                    Update
                  </SubmitButton>
                </form>
              </div>
            ))}
          </div>

          <form action={addVenue} className="card grid gap-3 p-4 sm:grid-cols-2">
            <h2 className="font-display text-lg font-semibold text-moss-900 sm:col-span-2">Add a facility</h2>
            <div>
              <label className="label" htmlFor="venue-name">
                Facility name
              </label>
              <input id="venue-name" name="name" required className="input" placeholder="e.g. Boac town plaza playground" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="venue-hours">
                  Hours
                </label>
                <input id="venue-hours" name="hours" className="input" placeholder="6:00 AM – 8:00 PM" />
              </div>
              <div>
                <label className="label" htmlFor="venue-emoji">
                  Emoji
                </label>
                <input id="venue-emoji" name="emoji" maxLength={4} defaultValue="🏞️" className="input" />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="label" htmlFor="venue-description">
                Description
              </label>
              <textarea id="venue-description" name="description" rows={2} className="input resize-none" />
            </div>
            <div>
              <label className="label" htmlFor="venue-status">
                Status
              </label>
              <select id="venue-status" name="status" className="input">
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="venue-capacity">
                Capacity (optional)
              </label>
              <input id="venue-capacity" name="capacity" type="number" min="0" className="input" />
            </div>
            <div className="sm:col-span-2">
              <SubmitButton className="btn-primary w-full" pendingLabel="Adding…">
                Add facility
              </SubmitButton>
            </div>
          </form>

          {venues.length === 0 ? (
            <p className="card p-5 text-sm text-moss-600">
              No facilities posted yet. Add the plaza, park or sports facility your office manages.
            </p>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="card p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">Schedules</h2>
              <ul className="mt-2 space-y-2">
                {schedules.map((row) => {
                  const venue = venues.find((v) => v.id === row.venue_id);
                  return (
                    <li key={row.id} className="flex flex-wrap items-center gap-2 rounded-2xl bg-moss-50 px-3 py-2 text-sm">
                      <span className="text-xs font-semibold text-moss-500">{venue?.emoji}</span>
                      <span className="font-semibold text-moss-900">{row.title}</span>
                      <span className="chip bg-white text-moss-700">{row.days}</span>
                      <span className="chip bg-white text-moss-700">
                        {row.start_time}–{row.end_time}
                      </span>
                      <span className="w-full text-xs text-moss-500">{row.note}</span>
                      <form action={deleteSchedule} className="ml-auto">
                        <input type="hidden" name="scheduleId" value={row.id} />
                        <button type="submit" className="text-xs font-semibold text-rose-600 hover:underline">
                          Delete
                        </button>
                      </form>
                    </li>
                  );
                })}
              </ul>
            </div>

            <form action={addSchedule} className="card space-y-3 p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">Add a schedule</h2>
              <div>
                <label className="label" htmlFor="schedule-venue">
                  Facility
                </label>
                <select id="schedule-venue" name="venueId" className="input">
                  {venues.map((venue) => (
                    <option key={venue.id} value={venue.id}>
                      {venue.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="schedule-title">
                  Title
                </label>
                <input id="schedule-title" name="title" required className="input" placeholder="Train rides" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="label" htmlFor="schedule-days">
                    Days
                  </label>
                  <input id="schedule-days" name="days" className="input" placeholder="Daily" />
                </div>
                <div>
                  <label className="label" htmlFor="schedule-start">
                    Start
                  </label>
                  <input id="schedule-start" name="start" className="input" placeholder="8:00 AM" />
                </div>
                <div>
                  <label className="label" htmlFor="schedule-end">
                    End
                  </label>
                  <input id="schedule-end" name="end" className="input" placeholder="5:30 PM" />
                </div>
              </div>
              <div>
                <label className="label" htmlFor="schedule-note">
                  Note
                </label>
                <input id="schedule-note" name="note" className="input" placeholder="₱20 per rider" />
              </div>
              {venues.length === 0 ? (
                <p className="rounded-2xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                  Add a facility first — every schedule belongs to one.
                </p>
              ) : (
                <SubmitButton className="btn-primary w-full" pendingLabel="Posting…">
                  Post schedule
                </SubmitButton>
              )}
              <p className="text-[11px] text-moss-500">Posting a schedule notifies every registered user.</p>
            </form>
          </div>
        </section>
      ) : null}

      {activeTab === "officers" ? (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2.5">
            {officers.map((officer) => (
              <article key={officer.id} className="card flex flex-wrap items-center gap-3 p-3.5">
                <span className="grid h-10 w-10 place-items-center rounded-2xl bg-moss-50 text-lg">🪪</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-moss-900">{officer.full_name}</p>
                  <p className="text-xs text-moss-500">
                    {officer.barangay} · Badge {officer.badge_no}
                  </p>
                </div>
                <StatusPill status={officer.status} />
                <form action={reviewOfficer} className="flex items-center gap-1.5">
                  <input type="hidden" name="officerId" value={officer.id} />
                  <select name="review" defaultValue={officer.status === "verified" ? "verify" : "pending"} className="input w-auto py-1 text-xs">
                    <option value="verify">Verified</option>
                    <option value="pending">Pending</option>
                    <option value="reject">Rejected</option>
                  </select>
                  <SubmitButton className="btn-ghost py-1 text-xs" pendingLabel="Saving…">
                    Apply
                  </SubmitButton>
                </form>
              </article>
            ))}
            {officers.length === 0 ? (
              <p className="card p-5 text-sm text-moss-600">
                No tourism officers registered yet. Register the first officer with the form.
              </p>
            ) : null}
          </div>

          <form action={addOfficer} className="card h-fit space-y-3 p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Register a tourism officer</h2>
            <div>
              <label className="label" htmlFor="officer-name">
                Full name
              </label>
              <input id="officer-name" name="fullName" required className="input" placeholder="Marlon Desquitado" />
            </div>
            <div>
              <label className="label" htmlFor="officer-badge">
                Badge number
              </label>
              <input id="officer-badge" name="badgeNo" required className="input" placeholder="TO-2026-021" />
            </div>
            <div>
              <label className="label" htmlFor="officer-barangay">
                Barangay assignment
              </label>
              <select id="officer-barangay" name="barangay" className="input">
                {BARANGAYS.map((barangay) => (
                  <option key={barangay} value={barangay}>
                    {barangay}
                  </option>
                ))}
              </select>
            </div>
            <SubmitButton className="btn-primary w-full" pendingLabel="Registering…">
              Register officer
            </SubmitButton>
            <p className="text-[11px] text-moss-500">
              The roster keeps the office&apos;s field staff on record. Panel access is controlled by account role, so only
              give tourism or admin accounts to staff who should publish.
            </p>
          </form>
        </section>
      ) : null}

      {activeTab === "news" ? (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2.5">
            {newsPosts.length === 0 ? (
              <p className="card p-5 text-sm text-moss-600">
                No news posted yet. Published stories appear in the Boac news directory and notify registered residents.
              </p>
            ) : (
              newsPosts.map((post) => (
                <article key={post.id} className="card p-4">
                  <div className="flex items-start gap-3">
                    {imageUrl(post.image_id) ? (
                      <img
                        src={imageUrl(post.image_id) ?? undefined}
                        alt=""
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-moss-50 text-xl">
                        {post.emoji}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
                        <span>{post.category}</span>
                        <span className="chip bg-moss-50 text-moss-700">
                          {post.kind === "reference" ? "Reference" : "Desk update"}
                        </span>
                        {post.status === "draft" ? <span className="chip bg-amber-100 text-amber-900">Draft</span> : null}
                        {post.featured ? <span className="chip bg-gold-100 text-gold-800">Featured</span> : null}
                        {post.published_at ? (
                          <span className="text-moss-400">
                            · {new Date(post.published_at).toLocaleDateString("en-PH")}
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-1.5 font-display text-base font-semibold text-moss-900">{post.title}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-moss-600">{post.summary}</p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {post.kind === "news" ? (
                      <form action={toggleNewsFeatured}>
                        <input type="hidden" name="newsId" value={post.id} />
                        <button type="submit" className="text-[11px] font-semibold text-moss-700 underline hover:text-moss-900">
                          {post.featured ? "Unfeature" : "Feature"}
                        </button>
                      </form>
                    ) : null}
                    <Link href={`/panels/tourism/news/${post.id}`} className="text-[11px] font-semibold text-brand-700 underline hover:text-brand-900">
                      Open &amp; edit
                    </Link>
                    <Link href={`/news/${post.slug}`} className="text-[11px] font-semibold text-moss-700 underline hover:text-moss-900">
                      View live
                    </Link>
                    <form action={deleteNews} className="ml-auto">
                      <input type="hidden" name="newsId" value={post.id} />
                      <button type="submit" className="text-[11px] font-semibold text-rose-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>

          <form action={publishNews} className="card h-fit space-y-3 p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Publish a news update</h2>
            <p className="text-xs text-moss-500">
              Posts go live in the news directory immediately and notify every registered resident.
            </p>
            <div>
              <label className="label" htmlFor="news-title">
                Headline
              </label>
              <input id="news-title" name="title" required className="input" placeholder="Boac plaza reopening schedule" />
            </div>
            <div>
              <label className="label" htmlFor="news-summary">
                Summary
              </label>
              <input id="news-summary" name="summary" required className="input" placeholder="One sentence for the card and search results" />
            </div>
            <div>
              <label className="label" htmlFor="news-body">
                Full story
              </label>
              <textarea id="news-body" name="body" rows={5} required className="input resize-none" placeholder="Write the update. Separate paragraphs with a blank line." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="news-category">
                  Category
                </label>
                <select id="news-category" name="category" className="input">
                  {NEWS_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="news-barangay">
                  Barangay (optional)
                </label>
                <select id="news-barangay" name="barangay" className="input">
                  <option value="">Town-wide</option>
                  {BARANGAYS.map((barangay) => (
                    <option key={barangay} value={barangay}>
                      {barangay}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="news-source-name">
                  Source name (optional)
                </label>
                <input id="news-source-name" name="sourceName" className="input" placeholder="Boac tourism desk" />
              </div>
              <div>
                <label className="label" htmlFor="news-source-url">
                  Source link (optional)
                </label>
                <input id="news-source-url" name="sourceUrl" type="url" className="input" placeholder="https://…" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label" htmlFor="news-emoji">
                  Emoji
                </label>
                <input id="news-emoji" name="emoji" maxLength={4} defaultValue="📰" className="input" />
              </div>
              <label className="flex items-end gap-2 pb-2 text-sm text-moss-800">
                <input type="checkbox" name="featured" className="accent-brand-600" /> Feature on the directory
              </label>
            </div>
            <ImagePicker />
            <SubmitButton className="btn-primary w-full" pendingLabel="Publishing…">
              Publish update
            </SubmitButton>
            <p className="text-[11px] text-moss-500">
              Photos are uploaded from this device and stored with the post — no links needed.
            </p>
          </form>
        </section>
      ) : null}

      {activeTab === "monitor" ? (
        <section className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Published news", value: newsPosts.filter((post) => post.status === "published" && post.kind === "news").length },
              { label: "News drafts", value: newsPosts.filter((post) => post.status === "draft").length },
              { label: "Announcements", value: announcements.length },
              { label: "Places pending", value: destinations.filter((place) => place.status === "pending").length },
            ].map((stat) => (
              <div key={stat.label} className="card p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-moss-500">{stat.label}</p>
                <p className="font-display text-2xl font-semibold text-moss-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">News posts</h2>
              <p className="text-xs text-moss-500">Every post, including drafts, with its status.</p>
              <ul className="mt-3 space-y-2">
                {newsPosts.map((post) => (
                  <li key={post.id} className="flex items-center gap-2 rounded-2xl bg-moss-50/70 p-2">
                    {imageUrl(post.image_id) ? (
                      <img src={imageUrl(post.image_id) ?? undefined} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-lg">{post.emoji}</span>
                    )}
                    <span className="min-w-0 flex-1">
                      <Link href={`/panels/tourism/news/${post.id}`} className="block truncate text-sm font-semibold text-moss-900 hover:text-brand-800">
                        {post.title}
                      </Link>
                      <span className="block truncate text-[11px] text-moss-500">
                        {post.category} · {post.kind === "reference" ? "Reference" : "Desk update"}
                      </span>
                    </span>
                    <StatusPill status={post.status} />
                  </li>
                ))}
                {newsPosts.length === 0 ? <li className="text-sm text-moss-500">No posts yet.</li> : null}
              </ul>
            </div>

            <div className="card p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">Announcements</h2>
              <p className="text-xs text-moss-500">Bulletin items shown on the home page.</p>
              <ul className="mt-3 space-y-2">
                {announcements.map((item) => (
                  <li key={item.id} className="flex items-center gap-2 rounded-2xl bg-moss-50/70 p-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-lg">📌</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-moss-900">{item.title}</span>
                      <span className="block text-[11px] text-moss-500">
                        {item.category} · {new Date(item.created_at).toLocaleDateString("en-PH")}
                      </span>
                    </span>
                    {item.pinned ? <span className="chip bg-gold-100 text-gold-800">Pinned</span> : null}
                  </li>
                ))}
                {announcements.length === 0 ? <li className="text-sm text-moss-500">No announcements yet.</li> : null}
              </ul>
            </div>

            <div className="card p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">Places awaiting review</h2>
              <ul className="mt-3 space-y-2">
                {destinations.filter((place) => place.status === "pending").map((place) => (
                  <li key={place.id} className="flex items-center gap-2 rounded-2xl bg-moss-50/70 p-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-lg">{place.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-moss-900">{place.name}</span>
                      <span className="block text-[11px] text-moss-500">{place.category} · {place.barangay}</span>
                    </span>
                    <Link href="/panels/tourism?tab=places" className="text-[11px] font-semibold text-brand-700 underline">
                      Review
                    </Link>
                  </li>
                ))}
                {destinations.filter((place) => place.status === "pending").length === 0 ? (
                  <li className="text-sm text-moss-500">Nothing waiting for review.</li>
                ) : null}
              </ul>
            </div>

            <div className="card p-4">
              <h2 className="font-display text-lg font-semibold text-moss-900">Incident board</h2>
              <ul className="mt-3 space-y-2">
                {incidents.map((incident) => (
                  <li key={incident.id} className="flex items-center gap-2 rounded-2xl bg-moss-50/70 p-2">
                    <span className="grid h-10 w-10 place-items-center rounded-lg bg-white text-lg">🚨</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-moss-900">{incident.type}</span>
                      <span className="block text-[11px] text-moss-500">
                        {incident.code} · {new Date(incident.created_at).toLocaleDateString("en-PH")}
                      </span>
                    </span>
                    <StatusPill status={incident.status} />
                  </li>
                ))}
                {incidents.length === 0 ? (
                  <li className="text-sm text-moss-500">No incident reports on the board.</li>
                ) : null}
              </ul>
              <Link href="/panels/mdrrmo" className="btn-ghost mt-3 w-full">
                Open the MDRRMO desk
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      {activeTab === "bulletin" ? (
        <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
          <div className="space-y-2.5">
            {announcements.length === 0 ? (
              <p className="card p-5 text-sm text-moss-600">
                No announcements yet. Anything you post here appears on the home page bulletin.
              </p>
            ) : (
              announcements.map((item) => (
                <article key={item.id} className="card p-4">
                  <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
                    {item.pinned ? <span className="chip bg-gold-100 text-gold-800">Pinned</span> : null}
                    <span>{item.category}</span>
                    <span className="text-moss-400">· {new Date(item.created_at).toLocaleDateString("en-PH")}</span>
                    <form action={deleteAnnouncement} className="ml-auto">
                      <input type="hidden" name="announcementId" value={item.id} />
                      <button type="submit" className="text-[11px] font-semibold text-rose-600 hover:underline">
                        Delete
                      </button>
                    </form>
                  </div>
                  <h3 className="mt-1.5 font-display text-base font-semibold text-moss-900">{item.title}</h3>
                  <p className="mt-1 text-sm text-moss-600">{item.body}</p>
                </article>
              ))
            )}
          </div>

          <form action={addAnnouncement} className="card h-fit space-y-3 p-4">
            <h2 className="font-display text-lg font-semibold text-moss-900">Post an announcement</h2>
            <div>
              <label className="label" htmlFor="announcement-title">
                Title
              </label>
              <input id="announcement-title" name="title" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="announcement-body">
                Details
              </label>
              <textarea id="announcement-body" name="body" rows={4} required className="input resize-none" />
            </div>
            <div>
              <label className="label" htmlFor="announcement-category">
                Category
              </label>
              <select id="announcement-category" name="category" className="input">
                <option value="Announcement">Announcement</option>
                <option value="Tourism">Tourism</option>
                <option value="Advisory">Advisory</option>
                <option value="Community">Community</option>
                <option value="LGU">LGU</option>
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm text-moss-800">
              <input type="checkbox" name="pinned" className="accent-brand-600" /> Pin to the top
            </label>
            <SubmitButton className="btn-primary w-full" pendingLabel="Posting…">
              Publish announcement
            </SubmitButton>
          </form>
        </section>
      ) : null}
    </div>
  );
}
