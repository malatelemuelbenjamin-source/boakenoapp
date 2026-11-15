"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { execute, query, queryOne } from "@/lib/db";
import { getCurrentUser, requireStaff } from "@/lib/auth";
import { BARANGAYS, INCIDENT_TYPES } from "@/lib/boac";

function incidentCode(): string {
  const stamp = Date.now().toString(36).toUpperCase().slice(-4);
  return `MDR-${stamp}${Math.random().toString(36).toUpperCase().slice(2, 4)}`;
}

export async function reportIncident(formData: FormData) {
  const user = await getCurrentUser();
  const type = INCIDENT_TYPES.includes(String(formData.get("type") ?? ""))
    ? String(formData.get("type"))
    : "Other";
  const barangay = String(formData.get("barangay") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reporterName = String(formData.get("reporterName") ?? "").trim() || user?.name || "Anonymous";
  const reporterPhone = String(formData.get("reporterPhone") ?? "").trim() || user?.phone || null;
  const severity = ["low", "moderate", "high", "critical"].includes(String(formData.get("severity")))
    ? String(formData.get("severity"))
    : "moderate";
  const lat = Number(formData.get("lat"));
  const lng = Number(formData.get("lng"));

  if (!BARANGAYS.includes(barangay) || !description) redirect("/emergency?error=fields");

  const code = incidentCode();
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO incidents (code, type, severity, description, barangay, reporter_name, reporter_phone, status, team, lat, lng, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'new', NULL, ?, ?, ?, ?)`,
    code,
    type,
    severity,
    description,
    barangay,
    reporterName,
    reporterPhone,
    Number.isFinite(lat) && lat !== 0 ? lat : null,
    Number.isFinite(lng) && lng !== 0 ? lng : null,
    now,
    now,
  );

  const staff = await query<{ id: number }>("SELECT id FROM users WHERE role IN ('mdrrmo','admin')");
  for (const s of staff) {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      s.id,
      `New incident ${code}`,
      `${severity.toUpperCase()} · ${type} in ${barangay}. ${description.slice(0, 120)}`,
      "incident",
      "/panels/mdrrmo",
      now,
    );
  }
  if (user) {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      user.id,
      `Incident ${code} received`,
      "MDRRMO Boac has been alerted. Keep your phone reachable — a dispatcher may call you.",
      "incident",
      "/emergency",
      now,
    );
  }
  revalidatePath("/panels/mdrrmo");
  revalidatePath("/emergency");
  redirect(`/emergency?reported=${code}`);
}

export async function updateIncident(formData: FormData) {
  await requireStaff(["mdrrmo", "admin"], "/panels/mdrrmo");
  const id = Number(formData.get("incidentId"));
  const status = String(formData.get("status") ?? "new");
  const team = String(formData.get("team") ?? "").trim() || null;
  if (!["new", "dispatched", "resolved", "closed"].includes(status)) redirect("/panels/mdrrmo");

  const incident = await queryOne<{ code: string; reporter_name: string }>(
    "SELECT code, reporter_name FROM incidents WHERE id = ?",
    id,
  );
  if (!incident) redirect("/panels/mdrrmo");
  const now = new Date().toISOString();
  await execute("UPDATE incidents SET status = ?, team = ?, updated_at = ? WHERE id = ?", status, team, now, id);

  const mdrrmo = await queryOne<{ id: number }>("SELECT id FROM users WHERE role = 'mdrrmo' LIMIT 1");
  if (mdrrmo) {
    await execute(
      "INSERT INTO notifications (user_id, title, body, kind, href, is_read, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)",
      mdrrmo.id,
      `${incident.code} → ${status}`,
      team ? `Assigned to ${team}.` : "Status updated by the duty desk.",
      "incident",
      "/panels/mdrrmo",
      now,
    );
  }
  revalidatePath("/panels/mdrrmo");
  redirect("/panels/mdrrmo?saved=1");
}
