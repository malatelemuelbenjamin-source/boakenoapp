import Link from "next/link";
import { query } from "@/lib/db";
import type { NewsPost } from "@/lib/types";
import { NEWS_CATEGORIES } from "@/lib/boac";
import NewsCard from "@/components/NewsCard";
import Reveal from "@/components/Reveal";
import Parallax from "@/components/Parallax";
import { Empty } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { imageUrl } from "@/lib/media";

export const metadata = {
  title: "Boac News Directory · MyBoakenoApp",
  description:
    "Updates published by the Boac tourism desk, plus reference briefs on the town's heritage, culture and community sourced from provincial and national records.",
};

function matches(post: NewsPost, term: string, category: string) {
  if (category && post.category !== category) return false;
  if (!term) return true;
  return [post.title, post.summary, post.body, post.category, post.barangay ?? ""]
    .join(" ")
    .toLowerCase()
    .includes(term);
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q = "", category = "" } = await searchParams;
  const term = q.trim().toLowerCase();

  const all = await query<NewsPost>(
    `SELECT * FROM news WHERE status = 'published'
      ORDER BY featured DESC, COALESCE(published_at, created_at) DESC, id DESC`,
  );
  const stories = all.filter((post) => post.kind === "news");
  const briefs = all.filter((post) => post.kind === "reference");
  const filteredStories = stories.filter((post) => matches(post, term, category));
  const filteredBriefs = briefs.filter((post) => matches(post, term, category));
  const featured = !term && !category ? filteredStories[0] ?? filteredBriefs[0] ?? null : null;
  const latest = stories[0] ?? briefs[0] ?? null;
  const ticker = [...stories, ...briefs].slice(0, 6);
  const categories = NEWS_CATEGORIES.filter((name) => all.some((post) => post.category === name));

  const queryString = (nextCategory: string) => {
    const params = new URLSearchParams();
    if (term) params.set("q", q.trim());
    if (nextCategory) params.set("category", nextCategory);
    const value = params.toString();
    return value ? `/news?${value}` : "/news";
  };

  return (
    <div className="space-y-6">
      <section className="hero-brand relative overflow-hidden rounded-[28px] px-5 py-7 text-white shadow-card md:px-8 md:py-9">
        <Parallax className="pointer-events-none absolute inset-0 hidden md:block" strength={16}>
          <div className="absolute -right-20 -top-24 h-60 w-60 rounded-full bg-gold-300/25 blur-2xl animate-drift" />
          <div className="absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-brand-300/30 blur-2xl animate-drift" />
          <span className="absolute right-8 top-8 text-5xl opacity-25 animate-floaty" aria-hidden="true">
            📰
          </span>
          <span
            className="absolute bottom-10 right-28 text-4xl opacity-20 animate-floaty"
            style={{ animationDelay: "1.6s" }}
            aria-hidden="true"
          >
            🗞️
          </span>
        </Parallax>

        <div className="relative">
          <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold-200">Boac news directory</p>
          <h1 className="text-shine mt-2 max-w-2xl font-display text-[30px] leading-[1.12] md:text-[40px]">
            What&apos;s happening in Boac
          </h1>
          <p className="mt-2 max-w-xl text-sm text-moss-100 md:text-base">
            Updates published by the Boac tourism desk, plus reference briefs on the town&apos;s heritage, culture and
            community from provincial and national sources.
          </p>
          <dl className="mt-5 grid max-w-lg grid-cols-3 gap-3 text-center">
            {[
              { label: "Desk updates", value: stories.length },
              { label: "Reference briefs", value: briefs.length },
              { label: "Topics", value: categories.length },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur">
                <dt className="text-[10px] uppercase tracking-wider text-moss-200">{stat.label}</dt>
                <dd className="font-display text-xl font-semibold text-white">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {ticker.length > 0 ? (
        <div className="relative overflow-hidden rounded-2xl border border-white/70 bg-white/85 py-2.5 backdrop-blur">
          <span className="absolute left-0 top-0 z-10 flex h-full items-center gap-1.5 bg-brand-700 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-gold-300" /> Latest
          </span>
          <div className="flex w-max gap-8 pl-24 pr-8 animate-[ticker_38s_linear_infinite] hover:[animation-play-state:paused]">
            {[...ticker, ...ticker].map((post, index) => (
              <Link
                key={`${post.slug}-${index}`}
                href={`/news/${post.slug}`}
                className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-moss-700 hover:text-brand-700"
              >
                <span className="text-brand-500">◆</span>
                {post.title}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="card space-y-3 p-4">
        <form action="/news" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search Boac news, places and topics"
            aria-label="Search the news directory"
            className="input"
          />
          {category ? <input type="hidden" name="category" value={category} /> : null}
          <button type="submit" className="btn-primary shrink-0">
            Search
          </button>
        </form>
        <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
          <Link href={queryString("")} className={`tab shrink-0 ${category ? "bg-white" : "tab-active"}`}>
            All topics
          </Link>
          {categories.map((name) => (
            <Link
              key={name}
              href={queryString(name)}
              className={`tab shrink-0 ${category === name ? "tab-active" : "bg-white"}`}
            >
              {name}
            </Link>
          ))}
        </div>
        {term || category ? (
          <p className="text-xs text-moss-500">
            Showing {filteredStories.length + filteredBriefs.length} of {all.length} entries
            {category ? ` in ${category}` : ""}
            {term ? ` for “${q.trim()}”` : ""}.{" "}
            <Link href="/news" className="font-semibold text-brand-700 underline">
              Clear filters
            </Link>
          </p>
        ) : latest ? (
          <p className="text-xs text-moss-500">
            Last updated {shortDate(latest.published_at ?? latest.created_at)} ·{" "}
            <Link href="/panels/tourism?tab=news" className="font-semibold text-brand-700 underline">
              tourism desk tools
            </Link>
          </p>
        ) : null}
      </div>

      {featured ? (
        <Reveal>
          <article className="card group overflow-hidden md:grid md:grid-cols-[0.9fr_1.1fr]">
            <Link
              href={`/news/${featured.slug}`}
              className={`relative flex min-h-[190px] items-center justify-center overflow-hidden bg-gradient-to-br ${featured.accent}`}
            >
              <span className="absolute -left-6 -top-8 h-32 w-32 rounded-full bg-white/15 blur-xl animate-drift" />
              {imageUrl(featured.image_id) ? (
                <img
                  src={imageUrl(featured.image_id) ?? undefined}
                  alt={featured.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              ) : (
                <span className="text-[76px] drop-shadow transition duration-700 group-hover:scale-110" aria-hidden="true">
                  {featured.emoji}
                </span>
              )}
              <span className="chip absolute left-4 top-4 bg-white/90 text-brand-800">
                {featured.kind === "reference" ? "Featured reference" : "Featured update"}
              </span>
            </Link>
            <div className="p-5">
              <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
                <span>{featured.category}</span>
                {featured.barangay ? <span className="text-moss-400">· {featured.barangay}</span> : null}
                {featured.published_at ? <span className="text-moss-400">· {shortDate(featured.published_at)}</span> : null}
              </p>
              <h2 className="mt-2 font-display text-2xl font-semibold leading-tight text-moss-950 md:text-[26px]">
                {featured.title}
              </h2>
              <p className="mt-2 text-sm text-moss-600">{featured.summary}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <Link href={`/news/${featured.slug}`} className="btn-primary">
                  Read the story <span aria-hidden="true">→</span>
                </Link>
                {featured.source_name ? (
                  <span className="text-[11px] font-semibold text-moss-500">Source: {featured.source_name}</span>
                ) : null}
              </div>
            </div>
          </article>
        </Reveal>
      ) : null}

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-moss-900">From the tourism desk</h2>
            <p className="mt-0.5 text-sm text-moss-600">Announcements, advisories and updates published for Boac</p>
          </div>
          <Link href="/panels/tourism?tab=news" className="shrink-0 text-sm font-semibold text-moss-700 hover:text-moss-900">
            Publish →
          </Link>
        </div>

        {filteredStories.length === 0 ? (
          <Empty
            emoji="🗞️"
            title={stories.length === 0 ? "No desk updates posted yet" : "No updates match your search"}
            body={
              stories.length === 0
                ? "The tourism desk publishes Boac announcements, advisories and community updates here. Nothing is written for you — every post comes from the office."
                : "Try a different topic or clear the search to see everything in the directory."
            }
            action={{ href: "/panels/tourism?tab=news", label: "Open the news desk" }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredStories.map((post, index) => (
              <Reveal key={post.id} delay={index * 70}>
                <NewsCard post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-xl font-semibold tracking-tight text-moss-900">Boac reference briefs</h2>
            <p className="mt-0.5 text-sm text-moss-600">
              Historical and civic background from provincial and national records — reference reading, not current
              news.
            </p>
          </div>
          <Link href="/explore" className="shrink-0 text-sm font-semibold text-moss-700 hover:text-moss-900">
            Explore places →
          </Link>
        </div>

        {filteredBriefs.length === 0 ? (
          <Empty
            emoji="📚"
            title="No briefs match your search"
            body="Clear the filters to browse the Boac reference shelf."
            action={{ href: "/news", label: "Show everything" }}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBriefs.map((post, index) => (
              <Reveal key={post.id} delay={index * 60}>
                <NewsCard post={post} />
              </Reveal>
            ))}
          </div>
        )}
      </section>

      <Reveal>
        <section className="rounded-3xl border border-moss-200 bg-white/90 p-5 shadow-card">
          <h2 className="font-display text-lg font-semibold text-moss-900">Publishing from the tourism desk</h2>
          <p className="mt-1 max-w-2xl text-sm text-moss-700">
            Tourism officers and administrators post Boac announcements, advisories and community updates through the
            panel. Published stories appear here immediately and notify registered residents.
          </p>
          <Link href="/panels/tourism?tab=news" className="btn-primary mt-3">
            Open the news desk
          </Link>
        </section>
      </Reveal>
    </div>
  );
}
