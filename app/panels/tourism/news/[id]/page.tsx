import Link from "next/link";
import { notFound } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import type { NewsPost } from "@/lib/types";
import { BARANGAYS, NEWS_CATEGORIES } from "@/lib/boac";
import { deleteNews, updateNews } from "@/app/actions/tourism";
import { Alert, StatusPill } from "@/components/ui";
import SubmitButton from "@/components/SubmitButton";
import ImagePicker from "@/components/ImagePicker";
import { imageUrl } from "@/lib/media";
import { dateTime } from "@/lib/format";

export default async function ManageNewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string; error?: string }>;
}) {
  const user = await requireStaff(["tourism", "admin"], "/panels/tourism?tab=news");
  const { id } = await params;
  const { saved, error } = await searchParams;

  const post = await queryOne<NewsPost & { author_name: string | null }>(
    `SELECT n.*, u.name AS author_name
       FROM news n LEFT JOIN users u ON u.id = n.author_id
      WHERE n.id = ?`,
    Number(id),
  );
  if (!post) notFound();

  const cover = imageUrl(post.image_id);
  const paragraphs = post.body
    .split(/\r?\n\s*\r?\n/)
    .map((part) => part.trim())
    .filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/panels/tourism?tab=news" className="text-sm font-semibold text-moss-700 hover:text-moss-900">
          ← News desk
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs text-moss-500">
          <StatusPill status={post.status} />
          <span>{post.kind === "reference" ? "Reference brief" : "Desk update"}</span>
          <span>·</span>
          <span>{post.author_name ?? "Boac tourism desk"}</span>
        </div>
      </div>

      {saved ? <Alert tone="success">Post updated and republished.</Alert> : null}
      {error === "fields" ? <Alert tone="error">Headline, summary and full story are required.</Alert> : null}
      {error === "image" ? (
        <Alert tone="error">That image could not be used. Choose a JPG, PNG, WebP or GIF under 5 MB.</Alert>
      ) : null}

      <article className="card overflow-hidden">
        <div className={`relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br ${post.accent}`}>
          {cover ? (
            <img src={cover} alt={post.title} className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <span className="text-[84px] drop-shadow" aria-hidden="true">
              {post.emoji}
            </span>
          )}
        </div>
        <div className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gold-700">
            {post.category}
            {post.barangay ? ` · ${post.barangay}` : ""}
            {post.published_at ? ` · ${dateTime(post.published_at)}` : ""}
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-moss-950">{post.title}</h1>
          <p className="mt-2 text-sm font-medium text-moss-700">{post.summary}</p>
          <div className="mt-4 space-y-3 rounded-2xl bg-moss-50/70 p-4">
            {paragraphs.map((paragraph, index) => (
              <p key={index} className="text-sm leading-6 text-moss-800">
                {paragraph}
              </p>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-moss-600">
            <span className="font-semibold text-moss-800">Source: {post.source_name ?? "Boac tourism desk"}</span>
            {post.source_url ? (
              <a
                href={post.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="font-semibold text-brand-700 underline"
              >
                Source link ↗
              </a>
            ) : (
              <span>No external source link</span>
            )}
            <span>·</span>
            <span>Slug: /news/{post.slug}</span>
            {post.status === "published" ? (
              <Link href={`/news/${post.slug}`} className="font-semibold text-brand-700 underline">
                View live page
              </Link>
            ) : null}
          </div>
        </div>
      </article>

      <section className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <form action={updateNews} className="card space-y-3 p-4">
          <h2 className="font-display text-lg font-semibold text-moss-900">Edit this post</h2>
          <input type="hidden" name="newsId" value={post.id} />
          <div>
            <label className="label" htmlFor="edit-title">
              Headline
            </label>
            <input id="edit-title" name="title" required defaultValue={post.title} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="edit-summary">
              Summary
            </label>
            <input id="edit-summary" name="summary" required defaultValue={post.summary} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="edit-body">
              Full story
            </label>
            <textarea
              id="edit-body"
              name="body"
              rows={6}
              required
              defaultValue={post.body}
              className="input resize-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="edit-category">
                Category
              </label>
              <select id="edit-category" name="category" defaultValue={post.category} className="input">
                {NEWS_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="edit-barangay">
                Barangay
              </label>
              <select id="edit-barangay" name="barangay" defaultValue={post.barangay ?? ""} className="input">
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
              <label className="label" htmlFor="edit-source-name">
                Source name
              </label>
              <input id="edit-source-name" name="sourceName" defaultValue={post.source_name ?? ""} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="edit-source-url">
                Source link
              </label>
              <input
                id="edit-source-url"
                name="sourceUrl"
                type="url"
                defaultValue={post.source_url ?? ""}
                className="input"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="edit-emoji">
                Emoji fallback
              </label>
              <input id="edit-emoji" name="emoji" maxLength={4} defaultValue={post.emoji} className="input" />
            </div>
            <div>
              <label className="label" htmlFor="edit-status">
                Status
              </label>
              <select id="edit-status" name="status" defaultValue={post.status} className="input">
                <option value="published">Published</option>
                <option value="draft">Draft (hidden from the public)</option>
              </select>
            </div>
          </div>
          <ImagePicker existingUrl={cover} label={cover ? "Replace cover photo" : "Cover photo"} />
          {cover ? (
            <label className="flex items-center gap-2 text-sm text-moss-800">
              <input type="checkbox" name="removeImage" className="accent-brand-600" /> Remove the current photo
            </label>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-moss-800">
            <input type="checkbox" name="featured" defaultChecked={Boolean(post.featured)} className="accent-brand-600" />{" "}
            Feature on the directory
          </label>
          <SubmitButton className="btn-primary w-full" pendingLabel="Saving…">
            Save changes
          </SubmitButton>
        </form>

        <div className="space-y-3">
          <div className="card space-y-2 p-4 text-sm text-moss-700">
            <h2 className="font-display text-lg font-semibold text-moss-900">Post record</h2>
            <p>
              <span className="font-semibold text-moss-900">Author:</span> {post.author_name ?? "Boac tourism desk"}
            </p>
            <p>
              <span className="font-semibold text-moss-900">Created:</span> {dateTime(post.created_at)}
            </p>
            <p>
              <span className="font-semibold text-moss-900">Published:</span>{" "}
              {post.published_at ? dateTime(post.published_at) : "Not published"}
            </p>
            <p>
              <span className="font-semibold text-moss-900">Visibility:</span>{" "}
              {post.status === "published" ? "Public" : "Hidden from residents"}
            </p>
            <p>
              <span className="font-semibold text-moss-900">Cover photo:</span> {cover ? "Uploaded file" : "None"}
            </p>
            <p className="text-xs text-moss-500">
              Signed in as {user.name}. Administrators and tourism officers can review this record.
            </p>
          </div>

          <form action={deleteNews} className="card space-y-2 p-4">
            <h2 className="font-display text-base font-semibold text-moss-900">Delete this post</h2>
            <p className="text-xs text-moss-500">
              Removing a post also removes its uploaded photo. This cannot be undone.
            </p>
            <input type="hidden" name="newsId" value={post.id} />
            <button type="submit" className="btn-ghost w-full border-rose-200 text-rose-700 hover:bg-rose-50">
              Delete post
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
