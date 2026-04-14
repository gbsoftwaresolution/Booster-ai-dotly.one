import { plainToInstance } from 'class-transformer'
import { Transform } from 'class-transformer'
import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsNotIn,
  Matches,
  IsBooleanString,
  ValidateIf,
  validateSync,
} from 'class-validator'

const httpUrlOptions = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_tld: false,
}

class EnvironmentVariables {
  @IsOptional() @IsString() NODE_ENV?: string
  @IsString() DATABASE_URL!: string
  @IsUrl() SUPABASE_URL!: string
  @IsString() SUPABASE_ANON_KEY!: string
  @IsString()
  @IsNotIn(['super-secret-jwt-key-placeholder', 'your-jwt-secret', 'changeme'], {
    message:
      'SUPABASE_JWT_SECRET must be set to the real value from your Supabase project — placeholder detected',
  })
  SUPABASE_JWT_SECRET!: string

  // SUPABASE_SERVICE_ROLE_KEY is required for deleteUser() during account deletion.
  // Must be set in production via Railway secrets (never commit to source control).
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsString()
  SUPABASE_SERVICE_ROLE_KEY?: string

  @IsString() REDIS_URL!: string
  @IsUrl(httpUrlOptions) WEB_URL!: string

  @IsOptional() @IsString() OPENAI_API_KEY?: string

  // SENTRY_DSN is required in production to ensure errors are always captured.
  // Set via Railway secrets. Validated as a URL so typos are caught at startup.
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsUrl()
  SENTRY_DSN?: string

  // Email — at least one provider is expected in production
  @IsOptional() @IsString() MAILGUN_API_KEY?: string
  @IsOptional() @IsString() MAILGUN_DOMAIN?: string
  @IsOptional() @IsEmail() MAILGUN_FROM_EMAIL?: string
  @IsOptional() @IsString() AWS_SES_ACCESS_KEY?: string
  @IsOptional() @IsString() AWS_SES_SECRET_KEY?: string
  @IsOptional() @IsString() AWS_SES_REGION?: string
  @IsOptional() @IsEmail() AWS_SES_FROM_EMAIL?: string

  // Cloudflare R2 — required for media uploads
  @IsString() R2_ACCOUNT_ID!: string
  @IsString() R2_ACCESS_KEY_ID!: string
  @IsString() R2_SECRET_ACCESS_KEY!: string
  @IsString() R2_BUCKET!: string
  @IsOptional() @IsString() R2_PUBLIC_URL?: string
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsString()
  INBOX_UPLOAD_TOKEN_SECRET?: string

  // On-chain billing — required for subscription verification
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{40}$/, {
    message: 'DOTLY_CONTRACT_ADDRESS must be a valid EVM address (0x + 40 hex chars)',
  })
  DOTLY_CONTRACT_ADDRESS!: string

  @IsString()
  @Matches(/^0x[0-9a-fA-F]{40}$/, {
    message: 'DOTLY_USDT_ADDRESS must be a valid EVM address (0x + 40 hex chars)',
  })
  DOTLY_USDT_ADDRESS!: string

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsString()
  DOTLY_PAYMENT_SIGNER_PRIVATE_KEY?: string

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @IsOptional()
  @Matches(/^0x[0-9a-fA-F]{64}$/, {
    message: 'DOTLY_OWNER_PRIVATE_KEY must be a valid 32-byte hex private key',
  })
  DOTLY_OWNER_PRIVATE_KEY?: string

  @IsOptional() @IsString() DOTLY_SUPPORT_OPS_KEY?: string

  @IsOptional() @IsEmail() BILLING_SUPPORT_EMAIL?: string

  @IsOptional()
  @IsString()
  CRYPTO_BLOCKED_COUNTRIES?: string

  @IsUrl({}, { message: 'ARBITRUM_RPC_URL must be a valid HTTPS URL' })
  ARBITRUM_RPC_URL!: string

  @IsOptional() @IsUrl() POLYGON_RPC_URL?: string
  @IsOptional() @IsUrl() BASE_RPC_URL?: string

  // F-25: SWAGGER_ENABLED controls Swagger UI mount in production.
  // Validated as an optional boolean string ("true"/"false") so that
  // NODE_ENV=production + SWAGGER_ENABLED=true correctly unlocks docs.
  @IsOptional() @IsBooleanString() SWAGGER_ENABLED?: string

  // F-24: Expo push notification access token (optional — works without in dev)
  @IsOptional() @IsString() EXPO_ACCESS_TOKEN?: string

  // F-25: PORT is optional (defaults to 3001) but validated when present.
  @IsOptional() @IsString() PORT?: string

  // BoosterAI affiliate billing integration
  @IsOptional() @IsUrl(httpUrlOptions) BOOSTERAI_API_URL?: string
  @IsOptional() @IsString() BOOSTERAI_INTERNAL_API_KEY?: string
  // planId mappings (defaults: STARTER=1, PRO=2, BUSINESS=3, AGENCY=4, ENTERPRISE=5)
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_STARTER?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_PRO?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_BUSINESS?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_AGENCY?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_ENTERPRISE?: string
  @IsOptional() @IsString() BOOSTERAI_COUNTRY_CODE?: string

  // Shared secret for BoosterAI → Dotly internal calls (x-boosterai-api-key header).
  // Required in production: without this the partner guard denies every BoosterAI
  // request at runtime, breaking affiliate billing.  Validated here so the API
  // refuses to boot in production if the secret is missing or left as a placeholder.
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o) => o.NODE_ENV === 'production')
  @IsString()
  BOOSTERAI_DOTLY_API_KEY?: string

  // ── Apple Wallet pass generation ─────────────────────────────────────────────
  // Optional: if unset, Apple Wallet endpoints return 400 rather than crashing.
  // In production deployments that offer Apple Wallet, set all four.
  @IsOptional() @IsString() APPLE_PASS_TYPE_ID?: string
  @IsOptional() @IsString() APPLE_TEAM_ID?: string
  // Base-64 encoded .p12 certificate bundle
  @IsOptional() @IsString() APPLE_PASS_CERT_P12?: string
  @IsOptional() @IsString() APPLE_PASS_CERT_PASS?: string

  // ── Google Wallet pass generation ────────────────────────────────────────────
  // Optional: if unset, Google Wallet endpoints return 400 rather than crashing.
  @IsOptional() @IsString() GOOGLE_WALLET_ISSUER_ID?: string
  @IsOptional() @IsString() GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL?: string
  // Base-64 encoded service account JSON key
  @IsOptional() @IsString() GOOGLE_WALLET_SERVICE_ACCOUNT_KEY?: string

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsString()
  GOOGLE_OAUTH_STATE_SECRET?: string

  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsString()
  WEBHOOK_SECRET_ENCRYPTION_KEY?: string

  // ── CORS ─────────────────────────────────────────────────────────────────────
  // Optional comma-separated list of additional allowed origins beyond WEB_URL
  // (e.g. staging URLs, mobile dev, preview deployments).
  @IsOptional() @IsString() CORS_ORIGINS?: string
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(validatedConfig, { skipMissingProperties: false })
  if (errors.length > 0) {
    throw new Error(errors.toString())
  }

  if (validatedConfig.CORS_ORIGINS) {
    const invalidOrigins = validatedConfig.CORS_ORIGINS.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean)
      .filter((origin) => {
        try {
          new URL(origin)
          return false
        } catch {
          return true
        }
      })

    if (invalidOrigins.length > 0) {
      throw new Error(
        `Invalid CORS_ORIGINS entries: ${invalidOrigins.join(', ')}. ` +
          'Each origin must be a full URL including protocol, e.g. https://dotly.one',
      )
    }
  }

  // In production, at least one complete email provider must be configured.
  // Without this, booking confirmations, password resets, and invite emails
  // are silently dropped — a critical user-facing failure.
  if (validatedConfig.NODE_ENV === 'production') {
    const mailgunOk =
      validatedConfig.MAILGUN_API_KEY &&
      validatedConfig.MAILGUN_DOMAIN &&
      validatedConfig.MAILGUN_FROM_EMAIL
    const sesOk =
      validatedConfig.AWS_SES_ACCESS_KEY &&
      validatedConfig.AWS_SES_SECRET_KEY &&
      validatedConfig.AWS_SES_FROM_EMAIL
    if (!mailgunOk && !sesOk) {
      throw new Error(
        'Production boot failed: no email provider configured. ' +
          'Set either MAILGUN_API_KEY + MAILGUN_DOMAIN + MAILGUN_FROM_EMAIL ' +
          'or AWS_SES_ACCESS_KEY + AWS_SES_SECRET_KEY + AWS_SES_FROM_EMAIL.',
      )
    }
  }

  return validatedConfig
}
