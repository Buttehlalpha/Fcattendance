import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type FaceCheck = { match: boolean; score: number; reason: string };

async function compareFaces(enrolled: string, selfie: string): Promise<FaceCheck> {
  const key = process.env["LOVABLE_API_KEY"];
  if (!key) throw new Error("Face verification is unavailable right now.");

  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        {
          role: "system",
          content:
            "You are a face verification engine for a university attendance system. You receive two photos: IMAGE 1 is the student's enrolled reference face, IMAGE 2 is a live selfie taken at the lecture hall. Decide if they are the same person. Reply ONLY with compact JSON: {\"match\": boolean, \"score\": 0-100, \"reason\": \"short\"}. score = confidence that it is the same person. If IMAGE 2 contains no clearly visible human face, or shows a photo of a screen/printed photo, set match=false and explain briefly.",
        },
        {
          role: "user",
          content: [
            { type: "text", text: "IMAGE 1 — enrolled reference face:" },
            { type: "image_url", image_url: { url: enrolled } },
            { type: "text", text: "IMAGE 2 — live selfie now:" },
            { type: "image_url", image_url: { url: selfie } },
            { type: "text", text: "Return the JSON verdict." },
          ],
        },
      ],
    }),
  });

  if (r.status === 429) throw new Error("Face check is busy. Please try again in a moment.");
  if (r.status === 402) throw new Error("Face verification quota exhausted. Contact the administrator.");
  if (!r.ok) throw new Error("Face verification failed. Please try again.");

  const j = (await r.json()) as any;
  const raw: string = j?.choices?.[0]?.message?.content ?? "";
  const m = raw.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("Face verification was inconclusive. Try again in better lighting.");
  const parsed = JSON.parse(m[0]) as Partial<FaceCheck>;
  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score ?? 0))));
  return { match: Boolean(parsed.match) && score >= 70, score, reason: String(parsed.reason ?? "") };
}

/** Whether the signed-in user has enrolled a face photo. */
export const getFaceStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("face_enrollments")
      .select("user_id, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { enrolled: !!data, updatedAt: data?.updated_at ?? null };
  });

/** Store / replace the signed-in user's reference face photo (validated by AI first). */
export const enrollFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { image: string }) => {
    if (!input?.image?.startsWith("data:image/")) throw new Error("Invalid photo.");
    if (input.image.length > 3_000_000) throw new Error("Photo too large.");
    return input;
  })
  .handler(async ({ data, context }) => {
    // Sanity check: the photo must contain exactly one clear face (self-comparison)
    const check = await compareFaces(data.image, data.image);
    if (!check.match) {
      throw new Error("No clear face detected. Face the camera in good lighting and retake.");
    }
    const { error } = await context.supabase
      .from("face_enrollments")
      .upsert({ user_id: context.userId, image_base64: data.image }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/**
 * Verify the live selfie against the enrolled face, then record attendance.
 * Attendance is only written after the server-side face check passes.
 */
export const markAttendanceWithFace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (input: {
      token: string;
      selfie: string;
      deviceHash: string;
      lat: number | null;
      lon: number | null;
    }) => {
      if (!input?.token?.trim()) throw new Error("Missing code.");
      if (!input?.selfie?.startsWith("data:image/")) throw new Error("Missing selfie.");
      return input;
    },
  )
  .handler(async ({ data, context }) => {
    const { data: face } = await context.supabase
      .from("face_enrollments")
      .select("image_base64")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!face?.image_base64) {
      throw new Error("Enrol your face first, then sign in to the lecture.");
    }

    const check = await compareFaces(face.image_base64, data.selfie);
    if (!check.match) {
      throw new Error(
        `Face did not match your enrolled photo (${check.score}% confidence). ${check.reason}`.trim(),
      );
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: result, error } = await supabaseAdmin.rpc("mark_attendance_for", {
      _uid: context.userId,
      _token: data.token.trim(),
      _lat: data.lat as number,
      _lon: data.lon as number,
      _device_hash: data.deviceHash,
      _face_verified: true,
      _face_score: check.score,
    });
    if (error) throw new Error(error.message);

    const course = (result ?? {}) as { code?: string; title?: string };
    return { ...course, faceScore: check.score };
  });
