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

  // Public auth routes, reachable signed in OR out. Handled before any gating so
  // they are provably never redirected for being authenticated. The sole
  // exception is /login, which bounces an already-authenticated user into the
  // app. /forgot-password and /reset-password are NEVER redirected: a password
  // recovery session is an authenticated session, so it MUST be allowed to stay
  // on /reset-password to complete the new-password form. /accept-invite works
  // the same way: verifying the invite token establishes a session on that page,
  // and the invited user has to stay there to choose a password.
  const PUBLIC_AUTH_ROUTES = [
    "/login",
    "/forgot-password",
    "/reset-password",
    "/accept-invite",
  ];
  const isPublicAuthRoute = PUBLIC_AUTH_ROUTES.includes(pathname);

  if (isPublicAuthRoute) {
    if (pathname === "/login" && user) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    // /forgot-password, /reset-password, /accept-invite (and signed-out /login)
    // fall through untouched, regardless of session state.
    return supabaseResponse;
  }

  // The sign-out route handler must stay reachable while a session still exists,
  // and stay harmless once it does not. It is the only way the dashboard layout
  // can actually end a session, so gating it would turn "no access" into a
  // redirect loop.
  if (pathname === "/auth/signout") return supabaseResponse;

  // Guest routes: the shared itinerary view, plus the endpoint it posts an
  // access code to. Participants reach these with no account at all, so they
  // must stay open. Both are protected server-side instead: the view reads a
  // curated payload through a SECURITY DEFINER RPC, and the endpoint validates
  // the access code before issuing its signed cookie. Note /tour/<id>/print is
  // deliberately NOT here, it is a host tool and requires a session.
  if (isGuestRoute(pathname)) return supabaseResponse;

  // Next.js dev-only endpoints (/__nextjs_*). No such route exists in a
  // production build, but redirecting them while signed out would break the dev
  // error overlay, so they are left alone.
  if (pathname.startsWith("/__")) return supabaseResponse;

  // Everything else is an authenticated app route: /dashboard, /overview,
  // /account, /quote-builder, /admin, /tour/<id>, /tour/<id>/print, / (which
  // redirects into the app), and any route added later. Deny by default so a
  // new page is gated the moment it exists rather than the moment someone
  // remembers to list it here. Signed-out visitors go to sign in.
  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

// Matches /tour/<id>/view (with or without a trailing slash) and the access-code
// endpoint. Anchored so nothing else under /tour/ slips through.
function isGuestRoute(pathname: string): boolean {
  if (pathname === "/api/tour-session") return true;
  return /^\/tour\/[^/]+\/view\/?$/.test(pathname);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
