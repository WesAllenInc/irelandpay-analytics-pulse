-- Harden sync queue view and functions per advisor warnings
BEGIN;

-- Ensure the view runs with caller privileges (not definer semantics)
DO $$
BEGIN
  IF to_regclass('public.sync_queue_status') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.sync_queue_status SET (security_invoker = true)';
  END IF;
END $$;

-- Fix mutable search_path on sync queue helper functions
-- Use separate ALTER FUNCTION statements per action and omit IF EXISTS for compatibility
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = 'public.cancel_sync_job(uuid)'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.cancel_sync_job(uuid) SECURITY DEFINER';
    EXECUTE 'ALTER FUNCTION public.cancel_sync_job(uuid) SET search_path TO public, auth';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = 'public.get_next_sync_job()'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_next_sync_job() SECURITY DEFINER';
    EXECUTE 'ALTER FUNCTION public.get_next_sync_job() SET search_path TO public, auth';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = 'public.get_sync_queue_stats()'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.get_sync_queue_stats() SECURITY DEFINER';
    EXECUTE 'ALTER FUNCTION public.get_sync_queue_stats() SET search_path TO public, auth';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.oid::regprocedure::text = 'public.enqueue_sync_job(text, jsonb, integer, integer)'
  ) THEN
    EXECUTE 'ALTER FUNCTION public.enqueue_sync_job(text, jsonb, integer, integer) SECURITY DEFINER';
    EXECUTE 'ALTER FUNCTION public.enqueue_sync_job(text, jsonb, integer, integer) SET search_path TO public, auth';
  END IF;
END $$;

COMMIT;


