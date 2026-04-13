Must have to start at all: DATABASE*URL, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_JWT_SECRET, REDIS_URL, WEB_URL/NEXT_PUBLIC_APP_URL, R2*_ (fix R2*BUCKET_NAME → R2_BUCKET)
Must have for full functionality: MAILGUN_API_KEY + MAILGUN_DOMAIN (or SES equivalent), OPENAI_API_KEY, DOTLY_CONTRACT_ADDRESS, POLYGON_RPC_URL
Must have for Google Calendar scheduling: API_URL, GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_STATE_SECRET
Should have for production: SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, NEXT_PUBLIC_POSTHOG_KEY
Nice to have: BASE_RPC_URL, AWS_SES*_ (only if you want SES as email fallback)

supaDB password: [REDACTED — rotate this credential immediately; never commit secrets to source control]

Mobile (apps/mobile) — values to fill before publishing:
app.json extra.eas.projectId — run `eas init` to generate; paste the UUID here
eas.json submit.production.ios.appleId — your Apple ID email (Apple Developer account)
eas.json submit.production.ios.ascAppId — App Store Connect numeric app ID (visible in App Store Connect > App Information)
eas.json submit.production.ios.appleTeamId — 10-character Apple Developer Team ID (visible at developer.apple.com/account)
eas.json submit.production.android.serviceAccountKeyPath — path to your Google Play service-account JSON key
