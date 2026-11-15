"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { getCurrentUser, requireStaff, requireUser } from "@/lib/auth";
import { deleteImage, storeImage } from "@/lib/media";
import {
  ANNOUNCEMENT_CATEGORIES,
  BARANGAYS,
  DESTINATION_CATEGORIES,
  NEWS_CATEGORIES,
  VENUE_STATUSES,
  pickOption,
} from "@/lib/boac";

function barangayOrNull(value: FormDataEntryValue | null): string | null {
  const candidate = String(value ?? "").trim();
  return BARANGAYS.includes(candidate) ? candidate : null;
}
import type { NewsPost } from "@/lib/types";

async function slugify(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60) || "destination";
  let slug = base;
  let n = 2;
  while (n < 1000 && (await queryOne("SELECT id FROM destinations WHERE slug = ?", slug))) slug = `${base}-${n++}`;
  return slug;
}

export async function addToBucket(formData: FormData) {
  const user = await getCurrentUser();
  const destinationId = Number(formData.get("destinationId"));
  if (!user) redirect(`/login?next=${encodeURIComponent(`/explore/${formData.get("slug") ?? ""}`)}`);
  await execute(
    `INSERT INTO bucket_list (user_id, destination_id, status, created_at) VALUES (?, ?, 'planned', ?)
     ON CONFLICT(user_id, destination_id) DO NOTHING`,
    user.id,
    destinationId,
    new Date().toISOString(),
  );
  revalidatePath("/bucket-list");
  revalidatePath("/explore");
}

export async function setBucketStatus(formData: FormData) {
  const user = await requireUser("/bucket-list");
  const id = Number(formData.get("bucketId"));
  const status = String(formData.get("status")) === "visited" ? "visited" : "planned";
  await execute(
    "UPDATE bucket_list SET status = ?, visited_at = ? WHERE id = ? AND user_id = ?",
    status,
    status === "visited" ? new Date().toISOString() : null,
    id,
    user.id,
  );
  revalidatePath("/bucket-list");
  revalidatePath("/");
}

export async function removeFromBucket(formData: FormData) {
  const user = await requireUser("/bucket-list");
  await execute("DELETE FROM bucket_list WHERE id = ? AND user_id = ?", Number(formData.get("bucketId")), user.id);
  revalidatePath("/bucket-list");
  revalidatePath("/");
}

export async function submitDestination(formData: FormData) {
  const user = await requireUser("/panels/tourism");
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  if (!name || !description) redirect("/panels/tourism?tab=places&error=fields");
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));
  await execute(
    `INSERT INTO destinations (slug, name, category, barangay, description, lat, lng, hours, fee, duration, rating, emoji, accent, featured, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, 'from-moss-500 to-moss-800', 0, 'pending', ?)`,
    await slugify(name),
    name,
    pickOption(DESTINATION_CATEGORIES, formData.get("category"), "Heritage"),
    pickOption(BARANGAYS, formData.get("barangay"), "Tampus (Poblacion)"),
    description,
    Number.isFinite(lat) && lat !== 0 ? lat : null,
    Number.isFinite(lng) && lng !== 0 ? lng : null,
    String(formData.get("hours") ?? "").trim() || null,
    String(formData.get("fee") ?? "").trim() || null,
    String(formData.get("duration") ?? "").trim() || null,
    String(formData.get("emoji") ?? "📍").slice(0, 4) || "📍",
    new Date().toISOString(),
  );
  await execute(
    "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
    user.id,
    "Destination submitted",
    `${name} is now pending review. It will appear in Explore once an administrator publishes it.`,
    "tourism",
    "/panels/tourism?tab=places",
    new Date().toISOString(),
  );
  revalidatePath("/panels/tourism");
  revalidatePath("/explore");
  redirect("/panels/tourism?tab=places&saved=place");
}

export async function reviewDestination(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const id = Number(formData.get("destinationId"));
  const action = String(formData.get("review"));
  if (!["publish", "reject", "pending"].includes(action)) redirect("/panels/tourism?tab=places");
  const status = action === "publish" ? "published" : action === "reject" ? "rejected" : "pending";
  await execute("UPDATE destinations SET status = ? WHERE id = ?", status, id);
  revalidatePath("/panels/tourism");
  revalidatePath("/explore");
  redirect("/panels/tourism?tab=places&saved=review");
}

export async function toggleFeatured(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const id = Number(formData.get("destinationId"));
  await execute("UPDATE destinations SET featured = 1 - featured WHERE id = ?", id);
  revalidatePath("/panels/tourism");
  revalidatePath("/");
  redirect("/panels/tourism?tab=places");
}

export async function updateVenueStatus(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const id = Number(formData.get("venueId"));
  const status = String(formData.get("status"));
  if (!["open", "closed", "maintenance"].includes(status)) redirect("/panels/tourism?tab=park");
  await execute("UPDATE park_venues SET status = ?, updated_at = ? WHERE id = ?", status, new Date().toISOString(), id);
  revalidatePath("/panels/tourism");
  revalidatePath("/park");
  revalidatePath("/");
  redirect("/panels/tourism?tab=park&saved=venue");
}

export async function addSchedule(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const venueId = Number(formData.get("venueId"));
  const title = String(formData.get("title") ?? "").trim();
  const venue = await queryOne<{ id: number }>("SELECT id FROM park_venues WHERE id = ?", venueId);
  if (!title || !venue) redirect("/panels/tourism?tab=park&error=fields");
  await execute(
    "INSERT INTO park_schedules (venue_id, title, days, start_time, end_time, note) VALUES (?, ?, ?, ?, ?, ?)",
    venueId,
    title,
    String(formData.get("days") ?? "Daily"),
    String(formData.get("start") ?? "8:00 AM"),
    String(formData.get("end") ?? "5:00 PM"),
    String(formData.get("note") ?? "").trim() || null,
  );
  const users = await query<{ id: number }>("SELECT id FROM users");
  for (const u of users) {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      u.id,
      "New park schedule posted",
      `${title} · ${String(formData.get("days") ?? "Daily")} ${String(formData.get("start") ?? "")}–${String(formData.get("end") ?? "")}`,
      "park",
      "/park",
      new Date().toISOString(),
    );
  }
  revalidatePath("/panels/tourism");
  revalidatePath("/park");
  redirect("/panels/tourism?tab=park&saved=schedule");
}

export async function deleteSchedule(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  await execute("DELETE FROM park_schedules WHERE id = ?", Number(formData.get("scheduleId")));
  revalidatePath("/panels/tourism");
  revalidatePath("/park");
  redirect("/panels/tourism?tab=park&saved=schedule");
}

export async function reviewOfficer(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const id = Number(formData.get("officerId"));
  const action = String(formData.get("review"));
  if (!["verify", "reject", "pending"].includes(action)) redirect("/panels/tourism?tab=officers");
  const status = action === "verify" ? "verified" : action === "reject" ? "rejected" : "pending";
  await execute("UPDATE officers SET status = ? WHERE id = ?", status, id);
  revalidatePath("/panels/tourism");
  redirect("/panels/tourism?tab=officers&saved=officer");
}

export async function addVenue(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect("/panels/tourism?tab=park&error=fields");
  await execute(
    `INSERT INTO park_venues (name, description, status, hours, emoji, capacity, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    name,
    String(formData.get("description") ?? "").trim() || null,
    pickOption(VENUE_STATUSES, formData.get("status"), "open"),
    String(formData.get("hours") ?? "").trim() || "Hours not posted",
    String(formData.get("emoji") ?? "🏞️").slice(0, 4) || "🏞️",
    Math.max(0, Number(formData.get("capacity") ?? 0)),
    new Date().toISOString(),
  );
  revalidatePath("/panels/tourism");
  revalidatePath("/park");
  redirect("/panels/tourism?tab=park&saved=venue");
}

export async function addAnnouncement(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !body) redirect("/panels/tourism?tab=bulletin&error=fields");
  await execute(
    "INSERT INTO announcements (title, body, category, pinned, created_at) VALUES (?, ?, ?, ?, ?)",
    title,
    body,
    pickOption(ANNOUNCEMENT_CATEGORIES, formData.get("category"), "Announcement"),
    formData.get("pinned") === "on" ? 1 : 0,
    new Date().toISOString(),
  );
  revalidatePath("/panels/tourism");
  revalidatePath("/");
  redirect("/panels/tourism?tab=bulletin&saved=announcement");
}

export async function deleteAnnouncement(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  await execute("DELETE FROM announcements WHERE id = ?", Number(formData.get("announcementId")));
  revalidatePath("/panels/tourism");
  revalidatePath("/");
  redirect("/panels/tourism?tab=bulletin");
}

async function slugifyNews(title: string): Promise<string> {
  const base =
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 60) || "boac-news";
  let slug = base;
  let n = 2;
  while (n < 1000 && (await queryOne("SELECT id FROM news WHERE slug = ?", slug))) slug = `${base}-${n++}`;
  return slug;
}

export async function publishNews(formData: FormData) {
  const user = await requireStaff(["tourism", "admin"], "/panels/tourism?tab=news");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !summary || !body) redirect("/panels/tourism?tab=news&error=fields");
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const image = await storeImage(formData.get("image"));
  if (image.error) redirect("/panels/tourism?tab=news&error=image");
  const slug = await slugifyNews(title);
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO news (slug, title, summary, body, category, barangay, kind, source_name, source_url, emoji, accent, featured, status, author_id, image_id, published_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'news', ?, ?, ?, 'from-brand-600 to-brand-900', ?, 'published', ?, ?, ?, ?)`,
    slug,
    title,
    summary,
    body,
    pickOption(NEWS_CATEGORIES, formData.get("category"), "Community"),
    barangayOrNull(formData.get("barangay")),
    String(formData.get("sourceName") ?? "").trim() || "Boac tourism desk",
    /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null,
    String(formData.get("emoji") ?? "📰").slice(0, 4) || "📰",
    formData.get("featured") === "on" ? 1 : 0,
    user.id,
    image.imageId,
    now,
    now,
  );
  const readers = await query<{ id: number }>("SELECT id FROM users");
  for (const reader of readers) {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      reader.id,
      `Boac news: ${title}`,
      summary,
      "news",
      `/news/${slug}`,
      now,
    );
  }
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/panels/tourism");
  redirect(`/panels/tourism?tab=news&saved=news`);
}

export async function updateNews(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism?tab=news");
  const id = Number(formData.get("newsId"));
  const post = await queryOne<NewsPost>("SELECT * FROM news WHERE id = ?", id);
  if (!post) redirect("/panels/tourism?tab=news&error=missing");

  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!title || !summary || !body) redirect(`/panels/tourism/news/${id}?error=fields`);

  const image = await storeImage(formData.get("image"));
  if (image.error) redirect(`/panels/tourism/news/${id}?error=image`);

  const oldImageId = post.image_id;
  let imageId = oldImageId;
  if (image.imageId) {
    imageId = image.imageId;
  } else if (formData.get("removeImage") === "on") {
    imageId = null;
  }

  const status = formData.get("status") === "draft" ? "draft" : "published";
  const category = pickOption(
    NEWS_CATEGORIES,
    formData.get("category"),
    (NEWS_CATEGORIES as readonly string[]).includes(post.category)
      ? (post.category as (typeof NEWS_CATEGORIES)[number])
      : "Community",
  );
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim();
  const now = new Date().toISOString();
  await execute(
    `UPDATE news SET title = ?, summary = ?, body = ?, category = ?, barangay = ?, source_name = ?, source_url = ?,
        emoji = ?, featured = ?, status = ?, image_id = ?, published_at = ? WHERE id = ?`,
    title,
    summary,
    body,
    category,
    barangayOrNull(formData.get("barangay")),
    String(formData.get("sourceName") ?? "").trim() || "Boac tourism desk",
    /^https?:\/\//i.test(sourceUrl) ? sourceUrl : null,
    String(formData.get("emoji") ?? "📰").slice(0, 4) || "📰",
    formData.get("featured") === "on" ? 1 : 0,
    status,
    imageId,
    status === "published" ? post.published_at ?? now : null,
    id,
  );
  // Only drop the previous file after the row no longer references it.
  if (oldImageId && oldImageId !== imageId) await deleteImage(oldImageId);
  revalidatePath("/news");
  revalidatePath(`/news/${post.slug}`);
  revalidatePath("/");
  revalidatePath("/panels/tourism");
  redirect(`/panels/tourism/news/${id}?saved=1`);
}

export async function deleteNews(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism?tab=news");
  const id = Number(formData.get("newsId"));
  const post = await queryOne<{ image_id: number | null }>("SELECT image_id FROM news WHERE id = ?", id);
  await execute("DELETE FROM news WHERE id = ?", id);
  await deleteImage(post?.image_id);
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/panels/tourism");
  redirect("/panels/tourism?tab=news&saved=news");
}

export async function toggleNewsFeatured(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism?tab=news");
  await execute("UPDATE news SET featured = 1 - featured WHERE id = ?", Number(formData.get("newsId")));
  revalidatePath("/news");
  revalidatePath("/");
  revalidatePath("/panels/tourism");
  redirect("/panels/tourism?tab=news");
}

export async function addOfficer(formData: FormData) {
  await requireStaff(["tourism", "admin"], "/panels/tourism");
  const name = String(formData.get("fullName") ?? "").trim();
  const badge = String(formData.get("badgeNo") ?? "").trim();
  if (!name || !badge) redirect("/panels/tourism?tab=officers&error=fields");
  await execute(
    "INSERT INTO officers (full_name, barangay, badge_no, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
    name,
    pickOption(BARANGAYS, formData.get("barangay"), "Tampus (Poblacion)"),
    badge,
    new Date().toISOString(),
  );
  revalidatePath("/panels/tourism");
  redirect("/panels/tourism?tab=officers&saved=officer");
}
