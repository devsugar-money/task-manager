-- Fix database schema to match application requirements
-- Run this in your Supabase SQL Editor

-- Option 1: Add the missing column (RECOMMENDED)
-- This adds the status_change_comment column that the trigger expects
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS status_change_comment text;

-- If you prefer Option 2: Remove/fix the trigger instead
-- Uncomment the following to remove the problematic trigger:
/*
DROP TRIGGER IF EXISTS on_task_update ON tasks;
DROP FUNCTION IF EXISTS create_daily_update_on_task_change();

-- Create a simplified trigger without status_change_comment
CREATE OR REPLACE FUNCTION create_daily_update_on_task_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when task moves from Not Started to any other status
  IF OLD.status = 'Not Started' AND NEW.status != 'Not Started' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Only create daily update if status actually changed OR if communication was logged
  IF OLD.status IS DISTINCT FROM NEW.status OR 
     (NEW.communicated = true AND OLD.communicated IS DISTINCT FROM NEW.communicated) THEN
    BEGIN
      INSERT INTO daily_updates (
        task_id,
        update_date,
        previous_status,
        new_status,
        previous_notes,
        new_notes,
        communicated,
        communication_method,
        no_comm_reason,
        updated_by
      ) VALUES (
        NEW.id,
        CURRENT_DATE,
        OLD.status,
        NEW.status,
        OLD.notes,
        NEW.notes,
        NEW.communicated,
        NEW.communication_method,
        NEW.no_comm_reason,
        NEW.updated_by
      );
    EXCEPTION 
      WHEN unique_violation THEN
        -- If duplicate, update the existing record
        UPDATE daily_updates
        SET 
          new_status = NEW.status,
          new_notes = NEW.notes,
          communicated = CASE WHEN NEW.communicated THEN true ELSE communicated END,
          communication_method = CASE WHEN NEW.communicated THEN NEW.communication_method ELSE communication_method END,
          no_comm_reason = NEW.no_comm_reason,
          updated_by = COALESCE(NEW.updated_by, updated_by),
          created_at = NOW()
        WHERE task_id = NEW.id 
          AND update_date = CURRENT_DATE;
    END;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_task_update 
AFTER UPDATE ON tasks 
FOR EACH ROW 
EXECUTE FUNCTION create_daily_update_on_task_change();
*/