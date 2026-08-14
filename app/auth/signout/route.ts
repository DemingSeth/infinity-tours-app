import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Server-side sign-out with a reason carried through to the login screen.
//
// This exists because a Server Component cannot clear cookies: lib/supabase/server
// swallows the write when there is no writable cookie store, so calling signOut()
// from app/(dashboard)/layout.tsx would leave the session cookie in place and the
// user would bounce between /login and /dashboard forever. A Route Handler CAN
// write cookies, so the layout redirects here instead and lands the visitor on
// /login genuinely signed out.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const reason = request.nextUrl.searchParams.get("reason");

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (reason === "deactivated") url.searchParams.set("deactivated", "1");
  else if (reason === "noaccess") url.searchParams.set("noaccess", "1");

  const response = NextResponse.redirect(url);

  // Belt and braces. signOut() already expires the auth cookies through the
  // cookie store, but a stale session cookie here means an unbreakable redirect
  // loop, so clear them on the redirect response as well. @supabase/ssr names
  // them sb-<project-ref>-auth-token and may split them into .0 / .1 chunks.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith("sb-") && cookie.name.includes("auth-token")) {
      response.cookies.delete(cookie.name);
    }
  }

  return response;
}
