// This file provides compatibility functions for the @supabase/auth-helpers-nextjs package
// which is being deprecated in favor of @supabase/ssr
// 
// These functions are drop-in replacements for the functions from @supabase/auth-helpers-nextjs
// and should be used in place of those functions in all components and pages

/**
 * This file provides compatibility with @supabase/auth-helpers-nextjs
 * by re-exporting functions from @supabase/auth-helpers-nextjs
 * 
 * This ensures that any code using the auth-helpers-nextjs package
 * will continue to work without changes.
 */

// Re-export directly from auth-helpers-nextjs
export { 
  createClientComponentClient,
  createServerComponentClient,
  createRouteHandlerClient 
} from '@supabase/auth-helpers-nextjs'
