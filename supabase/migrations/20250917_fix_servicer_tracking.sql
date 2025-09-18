-- Add status_change_comment field to tasks for temporary comment storage
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS status_change_comment text;

-- Update any NULL updated_by fields to get servicer from customer assignment
UPDATE daily_updates du
SET updated_by = (
  SELECT c.assigned_to 
  FROM tasks t
  JOIN sub_categories sc ON sc.id = t.sub_category_id
  JOIN categories cat ON cat.id = sc.category_id
  JOIN tbl_customer c ON c.phone = cat.customer_phone
  WHERE t.id = du.task_id
  LIMIT 1
)
WHERE du.updated_by IS NULL;

-- Create an index to improve Reports query performance
CREATE INDEX IF NOT EXISTS idx_daily_updates_date_servicer 
ON daily_updates(update_date, updated_by);

-- Update the trigger to better handle communication logging
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
          comment = COALESCE(NEW.status_change_comment, comment),
          created_at = NOW()
        WHERE task_id = NEW.id 
          AND update_date = CURRENT_DATE;
    END;
  END IF;
  
  -- Clear the temporary comment field after use
  NEW.status_change_comment = NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
