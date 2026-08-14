// Poison pill. If this module is ever pulled into a client component, even
// transitively, the build fails here with a clear message instead of shipping a
// service role key to the browser. It must stay the first statement in the file.
import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Supabase client authenticated as service_role. It bypasses RLS and every
// column grant, so it is used for exactly two things the ordinary session client
// cannot do: the auth admin API (invite, delete) and writing tour_hosts.role /
// tour_hosts.is_active, neither of which is granted to authenticated.
//
// Everything else, including the role and active-flag changes an admin makes
// from the Team Access screen, goes through the SECURITY DEFINER RPCs on the
// user's own session so the database still sees who is asking.
export function createAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Written to be the first thing anyone reads when a deploy is missing the
  // variable, because that is exactly when it will be read. Never prefix the key
  // with NEXT_PUBLIC: that would inline it into browser JavaScript.
  if (!serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set on this deployment, so team invites cannot be sent. " +
        "Add it in the Vercel project settings (Supabase dashboard: Project Settings, API, service_role key) and redeploy."
    );
  }
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL is not set on this deployment, so team invites cannot be sent. " +
        "Add it in the Vercel project settings and redeploy."
    );
  }

  return createSupabaseClient(url, serviceKey, {
    // No session to persist or refresh: this client is created per request and
    // discarded, and it must never pick up cookies from the caller.
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
