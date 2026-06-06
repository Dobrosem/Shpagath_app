export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  let hasValidUrl = false;

  if (url) {
    try {
      const parsedUrl = new URL(url);
      hasValidUrl = parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    } catch {
      hasValidUrl = false;
    }
  }

  return {
    url,
    anonKey,
    serviceRoleKey,
    isConfigured: Boolean(hasValidUrl && anonKey),
  };
}
