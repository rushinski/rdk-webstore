-- Migration: Add tax_collected column to state_sales_tracking
-- This tracks the total tax amount collected for each state

-- Add tax_collected column to state_sales_tracking
ALTER TABLE state_sales_tracking
ADD COLUMN IF NOT EXISTS tax_collected NUMERIC(10, 2) DEFAULT 0 NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN state_sales_tracking.tax_collected IS 'Total tax amount collected for this state in this period';

-- Create index for efficient tax reporting queries
CREATE INDEX IF NOT EXISTS idx_state_sales_tracking_tax_collected 
ON state_sales_tracking(tenant_id, state_code, tax_collected);

-- Update existing records to have 0 tax_collected (if any exist)
UPDATE state_sales_tracking 
SET tax_collected = 0 
WHERE tax_collected IS NULL;