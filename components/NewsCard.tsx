import Link from "next/link";
import type { NewsPost } from "@/lib/types";
import { shortDate } from "@/lib/format";
import { imageUrl } from "@/lib/media";

export default function NewsCard({ post }: { post: NewsPost }) {
  const cover = imageUrl(post.image_id);
  return (
    <Link
      href={`/news/${post.slug}`}
      className="card group flex h-full flex-col overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
    >
      <div className={`relative flex h-36 items-center justify-center overflow-hidden bg-gradient-to-br ${post.accent}`}>
        {cover ? (
          <>
            <img
              src={cover}
              alt={post.title}
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-black/5" />
          </>
        ) : (
          <span
            className="text-[42px] drop-shadow-sm transition duration-500 ease-out group-hover:-translate-y-1 group-hover:scale-110"
            aria-hidden="true"
          >
            {post.emoji}
          </span>
        )}
        <span className="chip absolute left-3 top-3 z-10 bg-white/90 text-moss-800">{post.category}</span>
        {post.kind === "reference" ? (
          <span className="chip absolute right-3 top-3 z-10 bg-white/75 text-moss-700">Reference</span>
        ) : null}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-base font-semibold leading-snug text-moss-900 transition group-hover:text-brand-800">
          {post.title}
        </h3>
        <p className="mt-1.5 line-clamp-3 flex-1 text-sm text-moss-600">{post.summary}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] font-semibold text-moss-500">
          <span className="truncate">
            {post.published_at ? shortDate(post.published_at) : post.source_name ?? "Boac tourism desk"}
          </span>
          <span className="shrink-0 text-brand-700 transition group-hover:translate-x-0.5">Read →</span>
        </div>
      </div>
    </Link>
  );
}
