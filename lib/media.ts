import { execute, queryOne } from "./db";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;

export type StoredImage = { id: number; filename: string; mime: string; size: number };

/**
 * Stores an uploaded image from a multipart form inside the app database and returns
 * its id. Nothing is fetched from a URL: the file comes straight from the device.
 * Returns null when no file was chosen, plus a readable reason when the file is
 * rejected so the form can explain what went wrong.
 */
export async function storeImage(
  entry: FormDataEntryValue | null,
): Promise<{ imageId: number | null; error: string | null }> {
  if (!entry || typeof entry === "string" || entry.size === 0) {
    return { imageId: null, error: null };
  }
  if (!IMAGE_TYPES.includes(entry.type as (typeof IMAGE_TYPES)[number])) {
    return { imageId: null, error: "Unsupported image type. Use JPG, PNG, WebP or GIF." };
  }
  if (entry.size > MAX_IMAGE_BYTES) {
    return { imageId: null, error: "Image is larger than 5 MB. Please choose a smaller file." };
  }
  const bytes = new Uint8Array(await entry.arrayBuffer());
  if (bytes.byteLength === 0) return { imageId: null, error: null };
  const info = await execute(
    "INSERT INTO media (filename, mime, size, data, created_at) VALUES (?, ?, ?, ?, ?)",
    entry.name || "upload",
    entry.type,
    bytes.byteLength,
    bytes,
    new Date().toISOString(),
  );
  return { imageId: Number(info.lastInsertRowid), error: null };
}

export async function readImage(imageId: number): Promise<{ mime: string; data: Uint8Array } | undefined> {
  const row = await queryOne<{ mime: string; data: unknown }>("SELECT mime, data FROM media WHERE id = ?", imageId);
  if (!row) return undefined;
  const data = row.data;
  return {
    mime: row.mime,
    data: data instanceof Uint8Array ? data : new Uint8Array(),
  };
}

export async function deleteImage(imageId: number | null | undefined) {
  if (!imageId) return;
  await execute("DELETE FROM media WHERE id = ?", imageId);
}

export function imageUrl(imageId: number | null | undefined): string | null {
  return imageId ? `/media/${imageId}` : null;
}
