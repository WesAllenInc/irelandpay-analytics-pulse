-- Update Residual Payouts Table to increase numeric field sizes
ALTER TABLE public.residual_payouts 
ALTER COLUMN sales_amount TYPE NUMERIC(30, 2),
ALTER COLUMN income TYPE NUMERIC(30, 2),
ALTER COLUMN expenses TYPE NUMERIC(30, 2),
ALTER COLUMN net_profit TYPE NUMERIC(30, 2),
ALTER COLUMN agent_net TYPE NUMERIC(30, 2);
