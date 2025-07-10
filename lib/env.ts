import { z } from 'zod';

// Determine if the code is running on the server. During client-side
// execution `window` is defined and server-only environment variables are
// stripped out by Next.js. We use this flag to avoid requiring server-only
// variables in the browser bundle.
const isServer = typeof window === 'undefined';

/**
 * Environment variable validation schema using Zod
 * - Required variables must be present for the app to function
 * - Optional variables will use fallbacks if not present
 */
// Base schema shared between server and client environments. Server-only
// variables are appended when running on the server.
const baseEnvSchema = z.object({
  // Supabase configuration (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),

  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Optional configuration with defaults
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
});

// Extend the base schema with server-only variables when running on the server.
const serverEnvSchema = baseEnvSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
});

type ServerEnv = z.infer<typeof serverEnvSchema>;
type ClientEnv = z.infer<typeof baseEnvSchema>;

/**
 * Parse and validate environment variables
 * This will throw an error if required variables are missing or invalid
 */
function validateEnv(): ServerEnv | ClientEnv {
  try {
    // Use process.env values or undefined for type safety
    const schema = isServer ? serverEnvSchema : baseEnvSchema;

    const rawEnv = {
      NEXT_PUBLIC_SUPABASE_URL:
        process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.supabase_url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY:
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.supabase_anon_key,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL:
        process.env.NEXT_PUBLIC_APP_URL ?? process.env.app_url,
      ...(isServer && {
        SUPABASE_SERVICE_ROLE_KEY:
          process.env.SUPABASE_SERVICE_ROLE_KEY ??
          process.env.supabase_service_role_key,
      }),
    };

    const env = schema.parse(rawEnv);
    
    return env;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingVars = error.errors.map(err => err.path.join('.'));
      console.error('\n🔴 Environment Variable Validation Error:');
      console.error('---------------------------------------');
      error.errors.forEach(err => {
        console.error(`❌ ${err.path.join('.')}: ${err.message}`);
      });
      console.error('\nPlease check your .env file and ensure all required variables are set.\n');
      
      // In production, crash the app if env vars are missing
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
      }
    } else {
      console.error('❌ Unknown error validating environment variables:', error);
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }
    
    // Return a type-safe empty object that will fail when used. Using the
    // server schema ensures all variables are typed while avoiding exposure on
    // the client.
    return {} as ServerEnv;
  }
}

/**
 * Type-safe environment variables
 * Usage: import { env } from '@/lib/env'
 */
export const env = validateEnv();

/**
 * Server-only environment variables
 * These should only be imported in server components or API routes
 */
export const serverOnlyEnv = isServer
  ? { SUPABASE_SERVICE_ROLE_KEY: (env as ServerEnv).SUPABASE_SERVICE_ROLE_KEY }
  : { SUPABASE_SERVICE_ROLE_KEY: undefined as never };

// Export types for environment variables
export type Env = ServerEnv | ClientEnv;
export type ServerOnlyEnv = typeof serverOnlyEnv;

// Validate environment variables at startup
validateEnv();
