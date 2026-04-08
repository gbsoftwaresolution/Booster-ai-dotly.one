import { plainToInstance } from 'class-transformer'
import { Transform } from 'class-transformer'
import { IsString, IsOptional, IsEmail, IsUrl, IsNotIn, Matches, IsBooleanString, ValidateIf, validateSync } from 'class-validator'

class EnvironmentVariables {
  @IsOptional() @IsString() NODE_ENV?: string
  @IsString() DATABASE_URL!: string
  @IsUrl() SUPABASE_URL!: string
  @IsString() SUPABASE_ANON_KEY!: string
  @IsString()
  @IsNotIn(['super-secret-jwt-key-placeholder', 'your-jwt-secret', 'changeme'], {
    message: 'SUPABASE_JWT_SECRET must be set to the real value from your Supabase project — placeholder detected',
  })
  SUPABASE_JWT_SECRET!: string

  // SUPABASE_SERVICE_ROLE_KEY is required for deleteUser() during account deletion.
  // Must be set in production via Railway secrets (never commit to source control).
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsString() SUPABASE_SERVICE_ROLE_KEY?: string

  @IsString() REDIS_URL!: string
  @IsString() WEB_URL!: string

  @IsOptional() @IsString() OPENAI_API_KEY?: string

  // SENTRY_DSN is required in production to ensure errors are always captured.
  // Set via Railway secrets. Validated as a URL so typos are caught at startup.
  @Transform(({ value }) => (typeof value === 'string' && value.trim() === '' ? undefined : value))
  @ValidateIf((o, value) => o.NODE_ENV === 'production' || value !== undefined)
  @IsUrl() SENTRY_DSN?: string

  // Email — at least one provider is expected in production
  @IsOptional() @IsString() MAILGUN_API_KEY?: string
  @IsOptional() @IsString() MAILGUN_DOMAIN?: string
  @IsOptional() @IsEmail()  MAILGUN_FROM_EMAIL?: string
  @IsOptional() @IsString() AWS_SES_ACCESS_KEY?: string
  @IsOptional() @IsString() AWS_SES_SECRET_KEY?: string
  @IsOptional() @IsString() AWS_SES_REGION?: string
  @IsOptional() @IsEmail()  AWS_SES_FROM_EMAIL?: string

  // Cloudflare R2 — required for media uploads
  @IsString() R2_ACCOUNT_ID!: string
  @IsString() R2_ACCESS_KEY_ID!: string
  @IsString() R2_SECRET_ACCESS_KEY!: string
  @IsString() R2_BUCKET!: string
  @IsOptional() @IsString() R2_PUBLIC_URL?: string

  // On-chain billing — required for subscription verification
  @IsString()
  @Matches(/^0x[0-9a-fA-F]{40}$/, { message: 'DOTLY_CONTRACT_ADDRESS must be a valid EVM address (0x + 40 hex chars)' })
  DOTLY_CONTRACT_ADDRESS!: string

  @IsUrl({}, { message: 'POLYGON_RPC_URL must be a valid HTTPS URL' })
  POLYGON_RPC_URL!: string

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
  @IsOptional() @IsUrl() BOOSTERAI_API_URL?: string
  @IsOptional() @IsString() BOOSTERAI_INTERNAL_API_KEY?: string
  // planId mappings (defaults: STARTER=1, PRO=2, BUSINESS=3, AGENCY=4, ENTERPRISE=5)
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_STARTER?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_PRO?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_BUSINESS?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_AGENCY?: string
  @IsOptional() @IsString() BOOSTERAI_PLAN_ID_ENTERPRISE?: string
  @IsOptional() @IsString() BOOSTERAI_COUNTRY_CODE?: string

  // Shared secret for BoosterAI → Dotly internal calls (x-boosterai-api-key header).
  // Required in production. Without this, partner eligibility checks are denied.
  @IsOptional() @IsString() BOOSTERAI_DOTLY_API_KEY?: string
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  })
  const errors = validateSync(validatedConfig, { skipMissingProperties: false })
  if (errors.length > 0) {
    throw new Error(errors.toString())
  }
  return validatedConfig
}
