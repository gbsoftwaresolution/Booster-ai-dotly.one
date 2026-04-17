# Auth Rollout Checklist

## Secrets

- [ ] Generate and store `AUTH_JWT_SECRET` in the API runtime
- [ ] Generate and store `GOOGLE_AUTH_STATE_SECRET` in the API runtime
- [ ] Set `GOOGLE_AUTH_CLIENT_ID` in the API runtime
- [ ] Set `GOOGLE_AUTH_CLIENT_SECRET` in the API runtime
- [ ] Confirm `WEB_URL` matches the real web origin
- [ ] Confirm `API_URL` matches the public API origin

## Google OAuth

- [ ] Create or update the Google OAuth web app in Google Cloud Console
- [ ] Add authorized redirect URI: `<API_URL>/auth/google/callback`
- [ ] Add authorized JavaScript origin for the production web app
- [ ] Add local redirect URI for development if needed
- [ ] Verify the consent screen branding and support email

## Web

- [ ] Set `NEXT_PUBLIC_API_URL`
- [ ] Set `NEXT_PUBLIC_APP_URL`
- [ ] Set `NEXT_PUBLIC_WEB_URL`
- [ ] Set `NEXT_PUBLIC_SITE_URL`
- [ ] Verify `/auth`, Google sign-in, sign-out, and `/auth/reset-password`

## Mobile

- [ ] Set `EXPO_PUBLIC_API_URL`
- [ ] Set `EXPO_PUBLIC_EAS_PROJECT_ID`
- [ ] Verify the app scheme is `dotly`
- [ ] Verify Google sign-in deep link returns to `dotly://auth/callback`
- [ ] Verify password reset deep link returns to `dotly://auth/callback?type=recovery`

## Database

- [ ] Run Prisma migrations in the target environment
- [ ] Confirm `auth_sessions` table exists
- [ ] Confirm `password_reset_tokens` table exists
- [ ] Confirm `users.supabaseId` has been removed

## Smoke Test

- [ ] Email/password sign-up works on web
- [ ] Email/password sign-in works on web and mobile
- [ ] Google sign-in works on web and mobile
- [ ] Refresh token rotation works after access token expiry
- [ ] Password reset email is delivered and the reset link works
- [ ] Sign-out clears the session on web and mobile
