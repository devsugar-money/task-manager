-- Add notes field to sub_categories table
ALTER TABLE sub_categories 
ADD COLUMN IF NOT EXISTS notes text DEFAULT '';

-- Add comment for documentation
COMMENT ON COLUMN sub_categories.notes IS 'Notes about the subcategory (e.g., insurance provider changes)';