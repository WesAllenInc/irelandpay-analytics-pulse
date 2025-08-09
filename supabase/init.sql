-- Non-automatic helper SQL (manual run):
-- - Dashboard helper views
-- - One-off data fixes and seed values

-- Seed payment methods example (safe to re-run)
INSERT INTO public.payment_methods (name, description)
VALUES
  ('Credit Card', 'Payment via credit card')
ON CONFLICT DO NOTHING;


