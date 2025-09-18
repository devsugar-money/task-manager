-- Fix the trigger that's causing task updates to fail

-- Option 1: Make updated_by nullable in daily_updates
ALTER TABLE daily_updates 
ALTER COLUMN updated_by DROP NOT NULL;

-- Option 2: Update the trigger to handle null updated_by
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
      COALESCE(NEW.updated_by, 'system')  -- Use 'system' as default when updated_by is null
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Option 3: Add a default value to the updated_by column
ALTER TABLE daily_updates 
ALTER COLUMN updated_by SET DEFAULT 'system';

-- Also ensure the tasks.updated_by column can be null
ALTER TABLE tasks 
ALTER COLUMN updated_by DROP NOT NULL;