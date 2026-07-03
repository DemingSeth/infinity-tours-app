import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Public auth routes — reachable signed in OR out. Handled before any gating so
  // they are provably never redirected for being authenticated. The sole
  // exception is /login, which bounces an already-authenticated user into the
  // app. /forgot-password and /reset-password are NEVER redirected: a password
  // recovery session is an authenticated session, so it MUST be allowed to stay
  // on /reset-password to complete the new-password form.
  const PUBLIC_AUTH_ROUTES = ["/login", "/forgot-password", "/reset-password"];
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.includes(pathname);

  if (isPublicAuthRoute) {
    if (pathname === "/login" && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // /forgot-password and /reset-password (and signed-out /login) fall through
    // untouched, regardless of session state.
    return supabaseResponse;
  }

  // App routes: signed-out users can't reach the dashboard; send them to sign in.
  const isDashboard = pathname.startsWith("/dashboard") ||
    (pathname.startsWith("/tour/") && !pathname.includes("/view"));

  if (isDashboard && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
