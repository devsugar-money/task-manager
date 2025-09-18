-- Add bundle_group column to sub_categories table for grouping related services
ALTER TABLE sub_categories 
ADD COLUMN IF NOT EXISTS bundle_group VARCHAR(50);

-- Set default bundle groups for common utilities
UPDATE sub_categories
SET bundle_group = 'utilities'
WHERE name IN ('Power', 'Broadband', 'Gas', 'Water', 'Mobile');

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_sub_categories_bundle_group 
ON sub_categories(bundle_group);