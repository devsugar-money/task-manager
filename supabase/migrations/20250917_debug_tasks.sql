-- Debug script to check what's preventing task updates

-- 1. Check current constraints on tasks table
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'tasks'::regclass;

-- 2. Check column definitions
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'tasks'
ORDER BY ordinal_position;

-- 3. Check triggers on tasks table
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'tasks';

-- 4. Check if RLS is enabled and what policies exist
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'tasks';

-- 5. Try a simple update to see what happens
-- UPDATE tasks 
-- SET status = 'In Progress', 
--     last_updated = NOW()
-- WHERE id = 'dbf403a0-d0af-4001-8d03-c6b282ae261d'
-- RETURNING *;