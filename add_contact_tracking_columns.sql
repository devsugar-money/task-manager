-- Add separate tracking columns for Email and WhatsApp last contact times
-- Run this in your Supabase SQL Editor

-- Add columns to track last contact time for each method
ALTER TABLE tbl_customer 
ADD COLUMN IF NOT EXISTS last_email_contact timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_whatsapp_contact timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_phone_contact timestamp with time zone;

-- Optional: Migrate existing data if you have last_contact_method set
UPDATE tbl_customer 
SET last_email_contact = last_contact_at 
WHERE last_contact_method = 'Email' 
  AND last_email_contact IS NULL;

UPDATE tbl_customer 
SET last_whatsapp_contact = last_contact_at 
WHERE last_contact_method = 'WhatsApp' 
  AND last_whatsapp_contact IS NULL;

UPDATE tbl_customer 
SET last_phone_contact = last_contact_at 
WHERE last_contact_method = 'Phone' 
  AND last_phone_contact IS NULL;

-- Verify the columns were added
SELECT 
  column_name, 
  data_type 
FROM 
  information_schema.columns 
WHERE 
  table_name = 'tbl_customer' 
  AND column_name LIKE 'last_%contact';