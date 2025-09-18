-- Add position column to tasks table to maintain explicit ordering
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS position INTEGER;

-- Set initial position values based on current ID order for each subcategory
WITH numbered_tasks AS (
  SELECT 
    id,
    sub_category_id,
    ROW_NUMBER() OVER (PARTITION BY sub_category_id ORDER BY id) as row_num
  FROM tasks
)
UPDATE tasks t
SET position = nt.row_num
FROM numbered_tasks nt
WHERE t.id = nt.id;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_tasks_position 
ON tasks(sub_category_id, position);