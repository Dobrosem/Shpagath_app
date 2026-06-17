import { createClient } from "./supabase/server";

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createClient>>>;
type StorageSource = {
  fallbackUrl: string | null;
  objectPath: string | null;
};

const SIGNED_URL_TIMEOUT_MS = 3000;
const PREVIEW_URL_TIMEOUT_MS = 1500;

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function describeError(error: unknown) {
  if (!error || typeof error !== "object") {
    return { message: String(error ?? "Unknown error"), status: null };
  }
  const typedError = error as { message?: string; name?: string; status?: number | string; code?: string };
  return {
    message: typedError.message ?? typedError.name ?? typedError.code ?? "Unknown error",
    status: typedError.status ?? typedError.code ?? null,
  };
}

function compactObjectPath(objectPath: string) {
  if (objectPath.length <= 96) return objectPath;
  return `${objectPath.slice(0, 48)}...${objectPath.slice(-32)}`;
}

function storageSource(value: string, bucket: string): StorageSource {
  if (!/^https?:\/\//i.test(value)) {
    if (/^(data:|blob:)/i.test(value) || value.startsWith("/")) {
      return { fallbackUrl: value, objectPath: null };
    }
    return {
      fallbackUrl: null,
      objectPath: value.replace(/^\/+/, "").replace(new RegExp(`^${escapeRegExp(bucket)}/`), ""),
    };
  }
  const url = new URL(value);
  const publicPrefix = `/storage/v1/object/public/${bucket}/`;
  const privatePrefixes = [
    `/storage/v1/object/authenticated/${bucket}/`,
    `/storage/v1/object/sign/${bucket}/`,
  ];
  if (url.pathname.startsWith(publicPrefix)) {
    return {
      fallbackUrl: value,
      objectPath: decodeURIComponent(url.pathname.slice(publicPrefix.length)),
    };
  }
  const privatePrefix = privatePrefixes.find((item) => url.pathname.startsWith(item));
  if (privatePrefix) {
    return {
      fallbackUrl: null,
      objectPath: decodeURIComponent(url.pathname.slice(privatePrefix.length)),
    };
  }
  return { fallbackUrl: value, objectPath: null };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function tryCreateSignedUrl(
  supabase: ServerSupabaseClient,
  bucket: string,
  objectPath: string,
  expiresIn = 60 * 60,
  timeoutMs = SIGNED_URL_TIMEOUT_MS,
) {
  try {
    const { data, error } = await withTimeout(
      supabase.storage.from(bucket).createSignedUrl(objectPath, expiresIn),
      timeoutMs,
    );
    if (error) {
      const details = describeError(error);
      console.error("Supabase signed URL error:", {
        bucket,
        object: compactObjectPath(objectPath),
        status: details.status,
        message: details.message,
      });
      return null;
    }
    return data?.signedUrl ?? null;
  } catch (error) {
    const details = describeError(error);
    console.error("Supabase signed URL error:", {
      bucket,
      object: compactObjectPath(objectPath),
      status: details.status,
      message: details.message,
    });
    return null;
  }
}

export async function getStorageDisplayUrl(
  supabase: ServerSupabaseClient,
  bucket: string,
  value?: string | null,
  timeoutMs = SIGNED_URL_TIMEOUT_MS,
) {
  const source = value?.trim();
  if (!source) return null;
  const { fallbackUrl, objectPath } = storageSource(source, bucket);
  if (!objectPath) return fallbackUrl;
  return await tryCreateSignedUrl(supabase, bucket, objectPath, 60 * 60, timeoutMs) ?? fallbackUrl;
}

export async function getStoragePreviewUrl(
  supabase: ServerSupabaseClient,
  bucket: string,
  value?: string | null,
) {
  return getStorageDisplayUrl(supabase, bucket, value, PREVIEW_URL_TIMEOUT_MS);
}
