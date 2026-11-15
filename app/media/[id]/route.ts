import { queryOne } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numeric = Number(id);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return new Response("Not found", { status: 404 });
  }
  const row = await queryOne<{ data: Uint8Array; mime: string }>("SELECT data, mime FROM media WHERE id = ?", numeric);
  if (!row) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      "content-type": row.mime,
      "content-length": String(row.data.byteLength ?? row.data.length),
      "cache-control": "public, max-age=31536000, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
