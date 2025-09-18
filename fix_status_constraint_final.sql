-- FINAL FIX: Remove the status check constraint from tasks table
-- The constraint uses an ARRAY check that limits status values

-- 1. Drop the constraint that's blocking custom statuses
ALTER TABLE tasks 
DROP CONSTRAINT tasks_status_check;

-- 2. Verify it's been removed
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM 
  pg_constraint 
WHERE 
  conrelid = 'tasks'::regclass
  AND conname = 'tasks_status_check';

-- 3. The result should be empty (no rows)
-- If you see no results, the constraint has been successfully removed

-- 4. Test that custom statuses now work
-- Try updating a task with a custom status
-- This should now succeed without errors