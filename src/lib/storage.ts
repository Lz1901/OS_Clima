import { supabase } from "@/integrations/supabase/client";

/**
 * Accepts either a storage path (e.g. "{company_id}/{pmoc_id}.pdf") or a
 * legacy public URL ("/storage/v1/object/public/{bucket}/{path}") and
 * returns just the path inside the bucket.
 */
export function extractStoragePath(bucket: string, urlOrPath: string): string {
  if (!urlOrPath) return urlOrPath;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const i = urlOrPath.indexOf(marker);
  if (i >= 0) return urlOrPath.slice(i + marker.length).split("?")[0];
  const marker2 = `/storage/v1/object/sign/${bucket}/`;
  const j = urlOrPath.indexOf(marker2);
  if (j >= 0) return urlOrPath.slice(j + marker2.length).split("?")[0];
  // Already a path
  return urlOrPath.replace(/^\/+/, "");
}

/** Creates a short-lived signed URL for a private bucket file. */
export async function getSignedUrl(
  bucket: string,
  urlOrPath: string | null | undefined,
  expiresIn = 3600,
): Promise<string | null> {
  if (!urlOrPath) return null;
  const path = extractStoragePath(bucket, urlOrPath);
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) {
    console.error("[storage] sign error", { bucket, path, error: error.message });
    return null;
  }
  return data.signedUrl;
}
