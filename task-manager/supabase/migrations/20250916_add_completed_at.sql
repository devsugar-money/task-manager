-- Add completed_at column to tasks table if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;