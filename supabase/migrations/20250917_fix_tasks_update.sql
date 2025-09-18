-- Fix tasks table to ensure updates work properly

-- 1. Ensure completed_at column allows null
ALTER TABLE tasks 
ALTER COLUMN completed_at DROP NOT NULL;

-- 2. Ensure last_updated column exists and allows null
ALTER TABLE tasks 
ALTER COLUMN last_updated DROP NOT NULL;

-- 3. Update the check constraint to ensure it matches our statuses exactly
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('Not Started', 'In Progress', 'Sent Info', 'Waiting on Info', 'Waiting on Partner', 'Followed Up', 'Complete', 'N/A'));

-- 4. Ensure RLS is enabled and policies exist
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop and recreate the policy to ensure it's correct
DROP POLICY IF EXISTS "Enable all for anon on tasks" ON tasks;
CREATE POLICY "Enable all for anon on tasks" ON tasks
FOR ALL USING (true) WITH CHECK (true);

-- 5. Grant necessary permissions
GRANT ALL ON tasks TO anon;
GRANT ALL ON tasks TO authenticated;

-- 6. Clean up any tasks with invalid status values
UPDATE tasks 
SET status = 'Not Started' 
WHERE status NOT IN ('Not Started', 'In Progress', 'Sent Info', 'Waiting on Info', 'Waiting on Partner', 'Followed Up', 'Complete', 'N/A');

-- 7. Set completed_at for already completed tasks
UPDATE tasks 
SET completed_at = COALESCE(completed_at, last_updated, NOW())
WHERE status = 'Complete' AND completed_at IS NULL;

-- 8. Clear completed_at for non-complete tasks
UPDATE tasks 
SET completed_at = NULL
WHERE status != 'Complete' AND completed_at IS NOT NULL;