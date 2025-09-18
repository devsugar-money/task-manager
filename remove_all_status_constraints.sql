-- COMPREHENSIVE FIX: Remove ALL status constraints from tasks table
-- Run this entire script in your Supabase SQL Editor

-- 1. First, let's see what constraints exist on the tasks table
SELECT 
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM 
  pg_constraint 
WHERE 
  conrelid = 'tasks'::regclass
ORDER BY conname;

-- 2. Drop the specific constraint that's causing issues
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check CASCADE;

-- 3. Also check for any other variations of status constraints
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_status_fkey CASCADE;

ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_custom_status_check CASCADE;

ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS check_status CASCADE;

-- 4. Check if there are any triggers that might be enforcing this
DROP TRIGGER IF EXISTS enforce_status_check ON tasks;
DROP FUNCTION IF EXISTS enforce_status_check();

-- 5. Now let's verify all constraints are gone
SELECT 
  'AFTER REMOVAL:' as stage,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM 
  pg_constraint 
WHERE 
  conrelid = 'tasks'::regclass
  AND conname LIKE '%status%';

-- 6. Test that we can now insert a custom status
-- This should work if constraints are removed
UPDATE tasks 
SET status = 'Test Custom Status' 
WHERE id = (SELECT id FROM tasks LIMIT 1);

-- 7. Revert the test (optional)
UPDATE tasks 
SET status = 'Not Started' 
WHERE status = 'Test Custom Status';

-- If you still see the error after running this, 
-- the constraint might be defined at a different level.
-- Run this to find ALL check constraints in the database:
SELECT 
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM 
  pg_constraint con
  JOIN pg_class c ON c.oid = con.conrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE 
  con.contype = 'c'  -- 'c' for check constraints
  AND c.relname = 'tasks'
  AND pg_get_constraintdef(con.oid) LIKE '%status%';