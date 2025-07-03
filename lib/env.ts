import { z } from 'zod';

/**
 * Environment variable validation schema using Zod
 * - Required variables must be present for the app to function
 * - Optional variables will use fallbacks if not present
 */
const envSchema = z.object({
  // Supabase configuration (required)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  
  // Service role key (server-only, required for admin operations)
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY is required'),
  
  // Node environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Optional configuration with defaults
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
});

/**
 * Parse and validate environment variables
 * This will throw an error if required variables are missing or invalid
 */
function validateEnv() {
  try {
    // Use process.env values or undefined for type safety
    const env = envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    });
    
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
    
    // Return a type-safe empty object that will fail when used
    // This allows development to continue with proper error messages
    return {} as ReturnType<typeof envSchema.parse>;
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
export const serverOnlyEnv = {
  SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
};

// Export types for environment variables
export type Env = ReturnType<typeof validateEnv>;
export type ServerOnlyEnv = typeof serverOnlyEnv;

// Validate environment variables at startup
validateEnv();
