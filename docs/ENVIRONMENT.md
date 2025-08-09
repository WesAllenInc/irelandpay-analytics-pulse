# Environment Variables

This project uses a minimal, standardized set of environment variables for Next.js + Supabase + Ireland Pay CRM.

## Required (client + server)
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY

## Required (server-only)
- SUPABASE_SERVICE_ROLE_KEY
- IRELANDPAY_CRM_API_KEY

## Optional
- IRELANDPAY_CRM_BASE_URL (defaults to https://crm.ireland-pay.com/api/v1)
- NEXT_PUBLIC_APP_URL (used by cron/test)
- SUPABASE_JWT_SECRET (only if you configure custom JWT)
- SUPABASE_DB_PASSWORD (only if used in server-only scripts)
- CRON_SECRET (used by scheduled sync endpoint)

## Where to set them
- Local: create .env.local (not committed) based on .env.example
- Vercel: Project → Settings → Environment Variables (Production, Preview, Development)
- Supabase: Project → Settings → API (copy URL and keys); Functions → Secrets for Edge Functions

## Security rules
- Never commit real secrets to Git. Only .env.example with placeholders is in version control.
- Do not expose server-only keys (e.g., SUPABASE_SERVICE_ROLE_KEY) to the browser. Use them only in API routes or server components.
- Rotate keys in Supabase if secrets were previously committed.

## Key rotation checklist
1. In Supabase → Settings → API, rotate anon and service role keys.
2. Update Vercel envs with new values for all environments.
3. Update local .env.local.
4. Re-deploy.

## Notes
- The code enforces connecting only to the `ainmbbtycciukbjjdjtl` project to prevent misconfiguration.
- Remove any Vercel Supabase integration tied to other projects to stop automatic injection of unused variables.
