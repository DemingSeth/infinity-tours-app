# Auth email templates

Branded replacements for the five default Supabase auth emails. These files are
the source of truth; the Supabase dashboard holds a copy that has to be pasted in
by hand, because template bodies are not part of a migration.

## Where each file goes

Supabase dashboard, per project: **Authentication, Emails, Templates**. Each file
below maps to one tab. Paste the file contents into the message body and set the
subject line to match.

| File | Dashboard tab | Subject line |
| --- | --- | --- |
| `invite-user.html` | Invite user | You have been invited to Infinity Tours |
| `reset-password.html` | Reset Password | Reset your Infinity Tours password |
| `confirm-signup.html` | Confirm signup | Confirm your Infinity Tours email address |
| `magic-link.html` | Magic Link | Your Infinity Tours sign in link |
| `change-email-address.html` | Change Email Address | Confirm your new Infinity Tours email address |

Apply them to **both** projects: production (`abqiaxmnasjyqxmgzbqn`) and staging
(`gtmyomkpkznaisspgdso`). Nothing about the files is project specific, which is
the point of the next section.

## Everything is built from Site URL

Every link and every image in these templates is built from `{{ .SiteURL }}`,
including the logo. Site URL is set once per project under **Authentication, URL
Configuration**. Moving to Infinity's own domain is therefore a one setting
change per project, with no template edits and no redeploy.

Two things follow from that:

- Site URL must be the address the app is actually served from, with no trailing
  slash, or every link and the logo break together.
- The logo is served by the app itself, from `public/infinity-lockup-light.png`.
  It is not hosted anywhere else and needs no CDN.

While the app is on its Vercel address, Site URL is that address.

## Why two of these do not use ConfirmationURL

`invite-user.html` and `reset-password.html` build their links by hand:

```
{{ .SiteURL }}/accept-invite?token_hash={{ .TokenHash }}&type=invite
{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery
```

They must keep doing so. `{{ .ConfirmationURL }}` resolves to a PKCE code, and a
PKCE code only works in the same browser that started the flow, because half of
the exchange is sitting in that browser's storage. Invitations and password
resets are the two emails most likely to be opened somewhere else entirely: on a
phone, on a work machine, in a different browser. In those cases a PKCE link
fails with an invalid or expired message that is impossible for the recipient to
act on.

A token hash carries everything needed with it. The app calls `verifyOtp` on it
(`app/(auth)/accept-invite/page.tsx` and `app/(auth)/reset-password/page.tsx`),
which reads nothing from prior browser storage, so the link works wherever it is
opened.

The other three keep `{{ .ConfirmationURL }}`. The app has no page for those
flows, and with public signups off they do not fire. They are branded so that if
one ever does fire, it does not arrive looking like a default Supabase email.

## Related settings

- **Authentication, URL Configuration, Redirect URLs** must allow
  `/accept-invite` and `/reset-password` on every origin that sends mail:
  production, any preview deploy, and `http://localhost:3000` for local work. The
  invite action sends `redirectTo` derived from the request headers, and Supabase
  refuses a redirect that is not on this list.
- **Authentication, Providers, Email**: public signups stay off. Accounts are
  created only by the invite action behind the Team Access screen.
- The default Supabase mail service is heavily rate limited and not meant for
  production sending. If invitations start arriving slowly or not at all, that
  limit is the first thing to check, and custom SMTP under **Authentication,
  Emails, SMTP Settings** is the fix.
