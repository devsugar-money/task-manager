/*
  # Add start_date to tasks table

  1. Changes
    - Add `start_date` column to `tasks` table
    - Default to current timestamp for existing tasks
    - Allow null values for flexibility

  2. Purpose
    - Track when tasks are scheduled to start
    - Support "start now" vs scheduled start functionality
*/

ALTER TABLE tasks ADD COLUMN start_date timestamp with time zone DEFAULT now();

-- Update existing tasks to have their start_date set to their created_at timestamp
UPDATE tasks SET start_date = created_at WHERE start_date IS NULL;