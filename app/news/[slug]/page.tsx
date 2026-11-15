import Link from "next/link";
import { notFound } from "next/navigation";
import { query, queryOne } from "@/lib/db";
import type { NewsPost } from "@/lib/types";
import NewsCard from "@/components/NewsCard";
import Reveal from "@/components/Reveal";
import { CategoryPill } from "@/components/ui";
import { shortDate } from "@/lib/format";
import { imageUrl } from "@/lib/media";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await queryOne<{ title: string; summary: string }>(
    "SELECT title, summary FROM news WHERE slug = ? AND status = 'published'",
    slug,
  );
  return {
    title: post ? `${post.title} · MyBoakenoApp` : "Boac news · MyBoakenoApp",
    description: post?.summary,
  };
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await queryOne<NewsPost>("SELECT * FROM news WHERE slug = ? AND status = 'published'", slug);
  if (!post) notFound();

  const related = await query<NewsPost>(
    `SELECT * FROM news WHERE status = 'published' AND slug != ?
      ORDER BY (category = ?) DESC, COALESCE(published_at, created_at) DESC LIMIT 3`,
    post.slug,
    post.category,
  );
  const paragraphs = post.body
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  const isReference = post.kind === "reference";

  return (
    <div className="space-y-5">
      <Link href="/news" className="text-sm font-semibold text-moss-700 hover:text-moss-900">
        ← News directory
      </Link>

      <article className="card overflow-hidden">
        <div className={`relative flex h-40 items-center justify-center overflow-hidden bg-gradient-to-br ${post.accent}`}>
          <span className="absolute -left-10 -top-12 h-44 w-44 rounded-full bg-white/20 blur-2xl animate-drift" />
          <span
            className="absolute -bottom-14 right-6 h-48 w-48 rounded-full bg-black/10 blur-2xl animate-drift"
            style={{ animationDelay: "1.2s" }}
          />
          {imageUrl(post.image_id) ? (
            <img
              src={imageUrl(post.image_id) ?? undefined}
              alt={post.title}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <span className="text-[84px] drop-shadow animate-floaty" aria-hidden="true">
              {post.emoji}
            </span>
          )}
          <span className="absolute left-4 top-4 flex flex-wrap gap-1.5">
            <CategoryPill category={post.category} />
            {isReference ? <span className="chip bg-white/80 text-moss-700">Reference brief</span> : null}
          </span>
        </div>

        <div className="p-5 md:p-7">
          <p className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gold-700">
            {post.published_at ? <span>{shortDate(post.published_at)}</span> : <span>Boac reference</span>}
            {post.barangay ? <span className="text-moss-400">· {post.barangay}</span> : null}
            {post.source_name ? <span className="text-moss-400">· {post.source_name}</span> : null}
          </p>
          <h1 className="mt-2 max-w-3xl font-display text-[28px] leading-[1.15] text-moss-950 md:text-[36px]">
            {post.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base font-medium text-moss-700">{post.summary}</p>

          <div className="mt-5 space-y-4">
            {paragraphs.map((paragraph, index) => (
              <Reveal key={index} delay={index * 90}>
                <p className="max-w-2xl text-[15px] leading-7 text-moss-800">{paragraph}</p>
              </Reveal>
            ))}
          </div>

          <div className="mt-6 rounded-2xl border border-moss-200 bg-moss-50/70 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-moss-500">Source &amp; status</p>
            <p className="mt-1 text-sm text-moss-800">
              {isReference
                ? "Reference brief drawn from published provincial and national records. It is background reading, not a news report."
                : "Published for Boac by the tourism desk. Details can change — confirm with the office before travelling or making plans."}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm font-semibold">
              {post.source_name ? <span className="text-moss-700">{post.source_name}</span> : null}
              {post.source_url ? (
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-brand-700 underline decoration-brand-300 underline-offset-2 hover:text-brand-900"
                >
                  Visit source ↗
                </a>
              ) : null}
              <Link href="/panels/tourism?tab=news" className="text-moss-600 underline hover:text-moss-900">
                Tourism desk
              </Link>
            </div>
          </div>
        </div>
      </article>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold tracking-tight text-moss-900">More from the directory</h2>
          <Link href="/news" className="text-sm font-semibold text-moss-700 hover:text-moss-900">
            All stories →
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((item, index) => (
            <Reveal key={item.id} delay={index * 70}>
              <NewsCard post={item} />
            </Reveal>
          ))}
        </div>
      </section>
    </div>
  );
}
