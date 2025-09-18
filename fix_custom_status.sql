-- Fix to allow custom statuses in tasks table
-- Run this in your Supabase SQL Editor

-- First, drop the existing constraint that restricts status values
ALTER TABLE tasks 
DROP CONSTRAINT IF EXISTS tasks_status_check;

-- Now tasks.status can accept any text value, not just predefined ones
-- This allows both predefined statuses and custom statuses

-- Optional: If you want to add the constraint back with the new statuses including custom
-- (Not recommended since you want flexibility for custom statuses)
/*
ALTER TABLE tasks
ADD CONSTRAINT tasks_status_check CHECK (
  status IN (
    'Not Started',
    'In Progress', 
    'Call Arranged',
    'Sent Info',
    'Waiting on Info',
    'Waiting on Partner',
    'Followed Up',
    'Complete',
    'N/A'
  ) OR status IS NOT NULL  -- This allows any non-null value
);
*/

-- Verify the constraint has been removed
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM 
  pg_constraint 
WHERE 
  conrelid = 'tasks'::regclass
  AND conname LIKE '%status%';