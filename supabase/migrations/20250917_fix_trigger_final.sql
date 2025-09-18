-- Fix the trigger that's causing task updates to fail
-- The updated_by field is a UUID, so we need to handle it properly

-- Option 1: Make updated_by nullable in daily_updates (BEST OPTION)
ALTER TABLE daily_updates 
ALTER COLUMN updated_by DROP NOT NULL;

-- Option 2: Update the trigger to only insert when updated_by is present
DROP TRIGGER IF EXISTS create_daily_update_on_task_change ON tasks;

CREATE OR REPLACE FUNCTION create_daily_update_on_task_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- Only create daily update if status actually changed
  IF OLD.status IS DISTINCT FROM NEW.status OR OLD.notes IS DISTINCT FROM NEW.notes THEN
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
      NEW.updated_by  -- This can now be NULL
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER create_daily_update_on_task_change
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION create_daily_update_on_task_change();

-- Also ensure the tasks.updated_by column can be null
ALTER TABLE tasks 
ALTER COLUMN updated_by DROP NOT NULL;