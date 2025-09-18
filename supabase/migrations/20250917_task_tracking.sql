-- Add better task tracking fields

-- 1. Ensure start_date exists on tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS started_at timestamp with time zone;

-- 2. Update the trigger to properly record all changes with notes
DROP TRIGGER IF EXISTS create_daily_update_on_task_change ON tasks;

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
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER create_daily_update_on_task_change
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION create_daily_update_on_task_change();

-- 3. Create a view for "Up Next" tasks (tasks that should be worked on next)
CREATE OR REPLACE VIEW v_up_next_tasks AS
SELECT 
  t.*,
  sc.name as subcategory_name,
  c.name as category_name,
  cust.display_name as customer_name,
  cust.phone as customer_phone,
  cust.assigned_to as servicer_id,
  tm.name as servicer_name,
  -- Priority score: waiting tasks > in progress > not started
  CASE 
    WHEN t.status = 'Waiting on Info' THEN 1
    WHEN t.status = 'Waiting on Partner' THEN 2
    WHEN t.status = 'In Progress' THEN 3
    WHEN t.status = 'Sent Info' THEN 4
    WHEN t.status = 'Followed Up' THEN 5
    WHEN t.status = 'Not Started' THEN 6
    ELSE 99
  END as priority_score,
  -- Days since last update
  EXTRACT(DAY FROM NOW() - COALESCE(t.last_updated, t.created_at)) as days_since_update
FROM tasks t
INNER JOIN sub_categories sc ON sc.id = t.sub_category_id
INNER JOIN categories c ON c.id = sc.category_id
INNER JOIN tbl_customer cust ON cust.phone = c.customer_phone
LEFT JOIN tbl_team_member tm ON tm.id = cust.assigned_to
WHERE t.status NOT IN ('Complete', 'N/A')
ORDER BY 
  priority_score ASC,
  days_since_update DESC,
  t.created_at ASC;

-- Grant access to the view
GRANT SELECT ON v_up_next_tasks TO anon;
GRANT SELECT ON v_up_next_tasks TO authenticated;

-- 4. Add comment field to daily_updates if it doesn't exist
ALTER TABLE daily_updates
ADD COLUMN IF NOT EXISTS comment text;

-- 5. Set started_at for existing in-progress tasks
UPDATE tasks 
SET started_at = COALESCE(started_at, last_updated, created_at)
WHERE status != 'Not Started' AND started_at IS NULL;