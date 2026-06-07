import { createClient } from "./supabase/server";

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;

function storageObjectPath(value: string, bucket: string) {
  if (!/^https?:\/\//i.test(value)) {
    return value.replace(/^\/+/, "").replace(new RegExp(`^${bucket}/`), "");
  }
  const url = new URL(value);
  const prefixes = [
    `/storage/v1/object/public/${bucket}/`,
    `/storage/v1/object/authenticated/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
  ];
  const prefix = prefixes.find((item) => url.pathname.startsWith(item));
  return prefix ? decodeURIComponent(url.pathname.slice(prefix.length)) : null;
}

export async function getStorageDisplayUrl(
  supabase: ServerSupabaseClient,
  bucket: string,
  value?: string | null,
) {
  const source = value?.trim();
  if (!source) return null;
  const objectPath = storageObjectPath(source, bucket);
  if (!objectPath) return source;
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(objectPath, 60 * 60);
  if (error) {
    console.error(`Supabase sign ${bucket} object error:`, error);
    return source;
  }
  return data.signedUrl;
}
