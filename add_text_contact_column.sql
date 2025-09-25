-- Add last_text_contact column to tbl_customer table
ALTER TABLE tbl_customer 
ADD COLUMN IF NOT EXISTS last_text_contact timestamp with time zone;

-- Add comment for documentation
COMMENT ON COLUMN tbl_customer.last_text_contact IS 'Last time customer was contacted via text/SMS';