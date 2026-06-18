import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };
const AUTH_TIMEOUT_MS = 1500;

function authTimeout<T>(promise: Promise<T>): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(`Timed out after ${AUTH_TIMEOUT_MS}ms`)), AUTH_TIMEOUT_MS);
    }),
  ]);
}

function reportAuthError(error: unknown) {
  if (!error || typeof error !== "object") {
    console.error("Supabase middleware auth error:", String(error ?? "Unknown error"));
    return;
  }
  const typedError = error as { message?: string; name?: string; status?: number | string };
  console.error("Supabase middleware auth error:", {
    name: typedError.name ?? null,
    status: typedError.status ?? null,
    message: typedError.message ?? "Unknown error",
  });
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth-token"));
}

function isRscRequest(request: NextRequest) {
  return request.nextUrl.searchParams.has("_rsc")
    || request.headers.get("rsc") === "1"
    || request.headers.get("next-router-prefetch") === "1";
}

export async function middleware(request: NextRequest) {
  const { url, anonKey, isConfigured } = getSupabaseEnv();
  const isLogin = request.nextUrl.pathname === "/login";
  const isPublicEpk = request.nextUrl.pathname.startsWith("/public/epk/");

  if (!isConfigured || !url || !anonKey) {
    if (isLogin || isPublicEpk) return NextResponse.next();
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("error", "supabase_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  if (isPublicEpk) return NextResponse.next();
  const hasAuthCookie = hasSupabaseAuthCookie(request);

  if (!hasAuthCookie && !isLogin) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  let response = NextResponse.next({ request });

  if (hasAuthCookie && !isLogin && isRscRequest(request)) {
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  let user = null;
  let authFailed = false;
  try {
    const result = await authTimeout(supabase.auth.getUser());
    user = result.data.user;
  } catch (error) {
    authFailed = true;
    reportAuthError(error);
  }

  if (!user && authFailed && hasAuthCookie && !isLogin) {
    return response;
  }

  if (!user && !isLogin && !isPublicEpk) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (user && isLogin) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
