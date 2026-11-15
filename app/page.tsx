import Link from "next/link";
import { canManageTourism, getCurrentUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { EMERGENCY_CONTACTS, MUNICIPALITY } from "@/lib/boac";
import type { Announcement, Destination, NewsPost, Shop, Venue } from "@/lib/types";
import DestinationCard from "@/components/DestinationCard";
import ShopCard from "@/components/ShopCard";
import NewsCard from "@/components/NewsCard";
import FeatureTour from "@/components/FeatureTour";
import Reveal from "@/components/Reveal";
import CountUp from "@/components/CountUp";
import Parallax from "@/components/Parallax";
import { SectionHead, StatusPill, Progress, Empty } from "@/components/ui";
import { timeAgo } from "@/lib/format";

const FACTS = [
  "Boac is the capital of Marinduque",
  "61 barangays · 54,365 residents (2024 census)",
  "Home of the Moriones Festival every Holy Week",
  "Boac Cathedral dedicated 1792",
  "Biglang Awa Bridge — 186 m, the province's longest",
  "Nicknamed Montserrat de Marinduque · Ang Bayang Biak",
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const featured = await query<Destination>(
    "SELECT * FROM destinations WHERE status = 'published' ORDER BY featured DESC, name LIMIT 6",
  );
  const shops = await query<Shop>("SELECT * FROM shops WHERE is_open = 1 ORDER BY created_at DESC LIMIT 3");
  const venues = await query<Venue>("SELECT * FROM park_venues ORDER BY id");
  const news = await query<Announcement>("SELECT * FROM announcements ORDER BY pinned DESC, created_at DESC LIMIT 4");
  const stories = await query<NewsPost>(
    `SELECT * FROM news WHERE status = 'published'
      ORDER BY featured DESC, COALESCE(published_at, created_at) DESC LIMIT 3`,
  );
  const counts = await queryOne<{ places: number; shops: number; products: number }>(
    `SELECT (SELECT COUNT(*) FROM destinations WHERE status='published') places,
            (SELECT COUNT(*) FROM shops) shops,
            (SELECT COUNT(*) FROM products WHERE is_active=1) products`,
  );

  let activeOrders = 0;
  let bucket = { planned: 0, visited: 0 };
  if (user) {
    activeOrders =
      (await queryOne<{ c: number }>(
        "SELECT COUNT(*) c FROM orders WHERE user_id = ? AND status NOT IN ('completed','cancelled')",
        user.id,
      ))?.c ?? 0;
    const b = await queryOne<{ planned: number; visited: number }>(
      "SELECT SUM(status='planned') planned, SUM(status='visited') visited FROM bucket_list WHERE user_id = ?",
      user.id,
    );
    bucket = { planned: b?.planned ?? 0, visited: b?.visited ?? 0 };
  }

  const openVenues = venues.filter((v) => v.status === "open").length;

  return (
    <div className="space-y-9">
      <section className="hero-brand relative overflow-hidden rounded-[28px] px-5 py-6 text-white shadow-card md:px-8 md:py-9">
        <Parallax className="pointer-events-none absolute inset-0 hidden md:block" strength={18}>
          <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-gold-300/25 blur-2xl animate-drift" />
          <div className="absolute -bottom-24 left-1/3 h-56 w-56 rounded-full bg-brand-300/30 blur-2xl animate-drift" />
          <span className="absolute right-5 top-5 text-5xl opacity-25 animate-floaty" aria-hidden="true">
            ⛪
          </span>
          <span
            className="absolute right-24 top-28 text-4xl opacity-20 animate-floaty"
            style={{ animationDelay: "1.4s" }}
            aria-hidden="true"
          >
            🏛️
          </span>
          <span
            className="absolute bottom-8 right-12 text-3xl opacity-20 animate-floaty"
            style={{ animationDelay: "2.3s" }}
            aria-hidden="true"
          >
            🌉
          </span>
        </Parallax>
        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-200">{MUNICIPALITY.tagline}</p>
          <h1 className="text-shine mt-2 max-w-xl font-display text-[30px] leading-[1.12] md:text-[40px]">
            {user ? `Maayong adlaw, ${user.name.split(" ")[0]}.` : "Your Boac, in one app."}
          </h1>
          <p className="mt-2 max-w-xl text-sm text-moss-100 md:text-base">
            Explore Boac&apos;s heritage sites, order from local sellers, follow every delivery, and reach MDRRMO and
            tourism services — all in one place.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/explore" className="btn-gold">
              Explore Boac
            </Link>
            <Link href="/market" className="btn border border-white/25 bg-white/10 text-white hover:bg-white/20">
              Shop local
            </Link>
            {!user ? (
              <Link href="/login" className="btn border border-white/25 bg-transparent text-white hover:bg-white/10">
                Sign in
              </Link>
            ) : null}
          </div>
          <dl className="mt-6 grid max-w-lg grid-cols-3 gap-3 text-center">
            {[
              { label: "Barangays", value: MUNICIPALITY.barangayCount },
              { label: "Places to see", value: counts?.places ?? 0 },
              { label: "Boac sellers", value: counts?.shops ?? 0 },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur">
                <dt className="text-[10px] uppercase tracking-wider text-moss-200">{stat.label}</dt>
                <dd className="font-display text-xl font-semibold text-white">
                  <CountUp value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/80 py-2.5 backdrop-blur">
        <div className="flex w-max gap-8 pr-8 animate-[ticker_36s_linear_infinite]">
          {[...FACTS, ...FACTS].map((fact, index) => (
            <span key={`${fact}-${index}`} className="whitespace-nowrap text-xs font-semibold text-moss-700">
              <span className="mr-2 text-brand-500">◆</span>
              {fact}
            </span>
          ))}
        </div>
      </div>

      <Reveal>
        <section className="grid gap-2.5 sm:grid-cols-3">
          <div className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-700">Today in Boac</p>
            <p className="mt-1 font-display text-lg font-semibold text-moss-900">
              {new Intl.DateTimeFormat("en-PH", { weekday: "long", month: "long", day: "numeric" }).format(new Date())}
            </p>
            <p className="mt-0.5 text-xs text-moss-600">Capital town of Marinduque · 61 barangays</p>
          </div>
          <Link href="/park" className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-700">Plaza &amp; parks</p>
            <p className="mt-1 font-display text-lg font-semibold text-moss-900">
              {venues.length > 0 ? `${openVenues} of ${venues.length} open` : "Status not posted"}
            </p>
            <p className="mt-0.5 text-xs text-moss-600">
              {venues.length > 0 ? "Live hours and facilities from the tourism office" : "The tourism office will post updates here"}
            </p>
          </Link>
          <Link href={stories[0] ? `/news/${stories[0].slug}` : "/news"} className="card p-4">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold-700">Latest update</p>
            <p className="mt-1 line-clamp-2 font-display text-base font-semibold leading-snug text-moss-900">
              {stories[0]?.title ?? "The news desk is ready"}
            </p>
            <p className="mt-0.5 text-xs text-moss-600">
              {stories[0]
                ? stories[0].published_at
                  ? timeAgo(stories[0].published_at)
                  : "Reference brief"
                : "Open the directory for Boac reference briefs"}
            </p>
          </Link>
        </section>
      </Reveal>

      <Reveal>
        <FeatureTour />
      </Reveal>

      {activeOrders > 0 ? (
        <Link
          href="/orders"
          className="flex items-center gap-3 rounded-3xl border border-gold-200 bg-gold-50 px-4 py-3 text-sm text-gold-900 shadow-sm"
        >
          <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-lg">🛵</span>
          <span className="flex-1">
            <strong className="block font-semibold">
              {activeOrders} order{activeOrders > 1 ? "s" : ""} in progress
            </strong>
            <span className="text-xs text-gold-800">Track the rider and see your receipt.</span>
          </span>
          <span className="font-semibold">Track →</span>
        </Link>
      ) : null}

      <Reveal>
        <section>
          <SectionHead title="What do you need today?" subtitle="Boac services, one tap away" />
          <div className="grid grid-cols-3 gap-2.5 md:grid-cols-6">
            {[
              { href: "/explore", emoji: "🧭", label: "Explore" },
              { href: "/news", emoji: "📰", label: "News" },
              { href: "/market", emoji: "🛒", label: "Market" },
              { href: "/bucket-list", emoji: "📌", label: "Bucket list" },
              { href: "/park", emoji: "🏞️", label: "Park status" },
              { href: "/emergency", emoji: "🚨", label: "Emergency" },
              { href: "/notifications", emoji: "🔔", label: "Alerts" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="card group flex flex-col items-center gap-1.5 px-2 py-3.5 text-center transition hover:-translate-y-0.5"
              >
                <span className="text-2xl transition duration-300 group-hover:-rotate-6 group-hover:scale-110" aria-hidden="true">
                  {item.emoji}
                </span>
                <span className="text-[11px] font-semibold leading-tight text-moss-800">{item.label}</span>
              </Link>
            ))}
          </div>
        </section>
      </Reveal>

      {user ? (
        <Reveal>
          <section className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="flex-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-moss-500">Your Boac bucket list</p>
              <p className="mt-1 font-display text-lg text-moss-900">
                {bucket.visited} visited · {bucket.planned} planned
              </p>
              <div className="mt-2">
                <Progress value={bucket.visited} max={Math.max(bucket.visited + bucket.planned, 1)} />
              </div>
            </div>
            <Link href="/bucket-list" className="btn-ghost self-start sm:self-auto">
              Open bucket list
            </Link>
          </section>
        </Reveal>
      ) : null}

      <Reveal>
        <section>
          <SectionHead
            title="Park & plaza status"
            subtitle={
              venues.length > 0 ? `${openVenues} of ${venues.length} facilities open` : "Posted by the tourism office"
            }
            href="/park"
            linkLabel="Schedules"
          />
          {venues.length === 0 ? (
            <div className="card flex flex-wrap items-center gap-3 p-4">
              <span className="grid h-11 w-11 place-items-center rounded-2xl bg-moss-50 text-xl">🏞️</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-moss-900">No facility updates posted yet</p>
                <p className="text-xs text-moss-600">
                  The tourism office has not published park or plaza status. Updates appear here once posted.
                </p>
              </div>
              <Link href="/park" className="btn-ghost self-start sm:self-auto">
                Open park page
              </Link>
            </div>
          ) : (
            <div className="grid gap-2.5 sm:grid-cols-3">
              {venues.slice(0, 3).map((venue) => (
                <div key={venue.id} className="card flex items-start gap-3 p-3.5">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-moss-50 text-xl">{venue.emoji}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-moss-900">{venue.name}</p>
                    <p className="mt-0.5 text-xs text-moss-500">{venue.hours}</p>
                    <div className="mt-1.5">
                      <StatusPill status={venue.status} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section>
          <SectionHead title="Places to see in Boac" subtitle="Reference content from provincial and national sources" href="/explore" />
          <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
            {featured.map((destination) => (
              <DestinationCard key={destination.id} destination={destination} compact />
            ))}
          </div>
        </section>
      </Reveal>

      <Reveal>
        <section>
          <SectionHead title="Boac sellers on MyBoakeno" subtitle="No middlemen, no commissions" href="/market" />
          {shops.length === 0 ? (
            <Empty
              emoji="🏪"
              title="No shops have opened yet"
              body="Every shop here is created by a real Boac seller. Be the first — opening a shop is free and products appear immediately."
              action={{ href: user ? "/seller" : "/login?next=/seller", label: "Open your shop" }}
            />
          ) : (
            <div className="grid gap-2.5 md:grid-cols-3">
              {shops.map((shop) => (
                <ShopCard key={shop.id} shop={shop} />
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <Reveal>
        <section>
          <SectionHead
            title="Boac news directory"
            subtitle="Updates from the tourism desk and reference briefs"
            href="/news"
            linkLabel="Open directory"
          />
          {stories.length === 0 ? (
            <Empty
              emoji="📰"
              title="The directory is ready for its first story"
              body="Tourism officers publish Boac updates here, alongside reference briefs on the town's heritage and community."
              action={{ href: "/news", label: "Visit the news directory" }}
            />
          ) : (
            <div className="grid gap-2.5 md:grid-cols-3">
              {stories.map((story, index) => (
                <Reveal key={story.id} delay={index * 80}>
                  <NewsCard post={story} />
                </Reveal>
              ))}
            </div>
          )}
        </section>
      </Reveal>

      <div className="grid gap-6 md:grid-cols-2">
        <Reveal>
          <section>
            <SectionHead title="Barangay bulletin" subtitle="Official announcements" />
            {news.length === 0 ? (
              <div className="card p-5">
                <p className="text-sm font-semibold text-moss-900">No announcements posted</p>
                <p className="mt-1 text-sm text-moss-600">
                  Municipal announcements will appear here once the tourism or administrator account publishes them.
                </p>
                {canManageTourism(user?.role) ? (
                  <Link href="/panels/tourism?tab=bulletin" className="btn-ghost mt-3">
                    Post an announcement (staff)
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className="space-y-2.5">
                {news.map((item) => (
                  <article key={item.id} className="card p-4">
                    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
                      {item.pinned ? <span className="chip bg-gold-100 text-gold-800">Pinned</span> : null}
                      <span>{item.category}</span>
                      <span className="text-moss-400">· {timeAgo(item.created_at)}</span>
                    </div>
                    <h3 className="mt-1.5 font-display text-base font-semibold text-moss-900">{item.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm text-moss-600">{item.body}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </Reveal>

        <Reveal delay={120}>
          <section>
            <SectionHead title="Emergency hotlines" subtitle="Boac and provincial responders" href="/emergency" linkLabel="All contacts" />
            <div className="card divide-y divide-moss-100">
              {EMERGENCY_CONTACTS.slice(0, 4).map((contact) => (
                <div key={contact.name} className="flex items-center gap-3 p-3.5">
                  <span className="grid h-10 w-10 place-items-center rounded-2xl bg-rose-50 text-lg">{contact.emoji}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-moss-900">{contact.name}</p>
                    <p className="text-xs text-moss-500">{contact.detail}</p>
                  </div>
                  <a href={`tel:${contact.number.replace(/[^0-9+]/g, "")}`} className="btn-sm shrink-0 border border-moss-200 px-3 py-2 text-moss-800">
                    {contact.number}
                  </a>
                </div>
              ))}
            </div>
            <Link href="/emergency#report" className="btn-primary mt-3 w-full">
              Report an incident to MDRRMO
            </Link>
          </section>
        </Reveal>
      </div>

      <Reveal>
        <section className="rounded-3xl border border-moss-200 bg-white/90 p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold text-moss-900">Selling in Boac?</h2>
          <p className="mt-1 max-w-xl text-sm text-moss-700">
            Open your online shop for free — no commissions, no listing fees. Manage products, set up to 20 delivery
            rates, and accept GCash, Maya or cash on delivery.
          </p>
          <Link href={user ? "/seller" : "/login?next=/seller"} className="btn-primary mt-3">
            {user ? "Open seller hub" : "Start selling"}
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
