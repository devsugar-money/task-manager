-- Add bundle columns to sub_categories table if they don't exist
ALTER TABLE sub_categories 
ADD COLUMN IF NOT EXISTS bundle_group VARCHAR(255),
ADD COLUMN IF NOT EXISTS bundle_name VARCHAR(255);

-- Create index for better performance when querying by bundle_group
CREATE INDEX IF NOT EXISTS idx_sub_categories_bundle_group ON sub_categories(bundle_group);