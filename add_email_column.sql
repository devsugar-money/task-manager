-- Add last_email_contact column to tbl_customer table
ALTER TABLE tbl_customer 
ADD COLUMN IF NOT EXISTS last_email_contact TIMESTAMP WITH TIME ZONE;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tbl_customer_last_email_contact 
ON tbl_customer(last_email_contact);