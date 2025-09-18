-- Fix duplicate updates issue
-- Add unique constraint to prevent duplicate daily updates for the same task on the same date

-- First, remove any existing duplicates (keeping the most recent one)
DELETE FROM daily_updates a
USING daily_updates b
WHERE a.task_id = b.task_id
  AND a.update_date = b.update_date
  AND a.created_at < b.created_at;

-- Add unique constraint on task_id and update_date
ALTER TABLE daily_updates 
ADD CONSTRAINT unique_task_update_per_day UNIQUE (task_id, update_date);

-- Update the trigger to use ON CONFLICT to handle duplicates
CREATE OR REPLACE FUNCTION create_daily_update_on_task_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when task moves from Not Started to any other status
  IF OLD.status = 'Not Started' AND NEW.status != 'Not Started' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Only create daily update if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status THEN
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
      updated_by,
      comment
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
      NEW.updated_by,
      NEW.status_change_comment
    )
    ON CONFLICT (task_id, update_date) 
    DO UPDATE SET
      previous_status = EXCLUDED.previous_status,
      new_status = EXCLUDED.new_status,
      previous_notes = EXCLUDED.previous_notes,
      new_notes = EXCLUDED.new_notes,
      communicated = EXCLUDED.communicated,
      communication_method = EXCLUDED.communication_method,
      no_comm_reason = EXCLUDED.no_comm_reason,
      updated_by = EXCLUDED.updated_by,
      comment = EXCLUDED.comment,
      created_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
