-- Update Residual Payouts Table to use larger precision numeric fields
ALTER TABLE public.residual_payouts 
ALTER COLUMN sales_amount TYPE NUMERIC,
ALTER COLUMN income TYPE NUMERIC,
ALTER COLUMN expenses TYPE NUMERIC,
ALTER COLUMN net_profit TYPE NUMERIC,
ALTER COLUMN agent_net TYPE NUMERIC,
ALTER COLUMN bps TYPE NUMERIC,
ALTER COLUMN commission_pct TYPE NUMERIC;
