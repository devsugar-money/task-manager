-- Complete setup migration for task manager

-- 1. Enable RLS on all tables and create policies
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_customer ENABLE ROW LEVEL SECURITY;
ALTER TABLE tbl_team_member ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable all for anon on categories" ON categories;
DROP POLICY IF EXISTS "Enable all for anon on sub_categories" ON sub_categories;
DROP POLICY IF EXISTS "Enable all for anon on tasks" ON tasks;
DROP POLICY IF EXISTS "Enable all for anon on daily_updates" ON daily_updates;
DROP POLICY IF EXISTS "Enable all for anon on tbl_customer" ON tbl_customer;
DROP POLICY IF EXISTS "Enable all for anon on tbl_team_member" ON tbl_team_member;

-- Create policies for anon users (public access)
CREATE POLICY "Enable all for anon on categories" ON categories
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anon on sub_categories" ON sub_categories
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anon on tasks" ON tasks
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anon on daily_updates" ON daily_updates
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anon on tbl_customer" ON tbl_customer
FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Enable all for anon on tbl_team_member" ON tbl_team_member
FOR ALL USING (true) WITH CHECK (true);

-- 2. Add new columns to tbl_customer
ALTER TABLE tbl_customer 
ADD COLUMN IF NOT EXISTS notes text,
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS flags text[], -- Array for multiple flags like 'difficult', 'slow', 'vip'
ADD COLUMN IF NOT EXISTS last_contact_method text,
ADD COLUMN IF NOT EXISTS last_contact_at timestamp with time zone;

-- 3. Add columns to tasks table
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS money_saved numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;

-- 4. Add money_saved to sub_categories
ALTER TABLE sub_categories
ADD COLUMN IF NOT EXISTS money_saved numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS overall_status text DEFAULT 'Not Started';

-- 5. Update task status check constraint to match new statuses
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('Not Started', 'In Progress', 'Sent Info', 'Waiting on Info', 'Waiting on Partner', 'Followed Up', 'Complete', 'N/A', 'Custom'));

-- 6. Update existing task statuses to new format
UPDATE tasks SET status = 'In Progress' WHERE status = 'Ongoing';
UPDATE tasks SET status = 'Complete' WHERE status = 'Completed';
UPDATE tasks SET status = 'N/A' WHERE status = 'Blocked';
UPDATE tasks SET status = 'Waiting on Info' WHERE status IN ('Slow Info', 'Waiting on Info');
UPDATE tasks SET status = 'Waiting on Partner' WHERE status = 'Waiting on Partner';
UPDATE tasks SET status = 'Not Started' WHERE status NOT IN ('In Progress', 'Complete', 'N/A', 'Waiting on Info', 'Waiting on Partner', 'Sent Info', 'Followed Up');

-- 7. Update sub_categories overall_status values
UPDATE sub_categories SET overall_status = 'Not Started' WHERE status = 'Not Started' OR status IS NULL;
UPDATE sub_categories SET overall_status = 'In Progress' WHERE status IN ('Ongoing', 'In Progress');
UPDATE sub_categories SET overall_status = 'Optimised' WHERE is_complete = true;

-- 8. Create function to update sub_category money saved and status
CREATE OR REPLACE FUNCTION update_subcategory_totals()
RETURNS TRIGGER AS $$
BEGIN
  -- Update money_saved total for the subcategory
  UPDATE sub_categories
  SET money_saved = (
    SELECT COALESCE(SUM(money_saved), 0)
    FROM tasks
    WHERE sub_category_id = NEW.sub_category_id
  ),
  overall_status = CASE
    WHEN (SELECT COUNT(*) FROM tasks WHERE sub_category_id = NEW.sub_category_id AND status != 'Complete' AND status != 'N/A') = 0 THEN 'Optimised'
    WHEN (SELECT COUNT(*) FROM tasks WHERE sub_category_id = NEW.sub_category_id AND status = 'In Progress') > 0 THEN 'In Progress'
    WHEN (SELECT COUNT(*) FROM tasks WHERE sub_category_id = NEW.sub_category_id AND status = 'Waiting on Info') > 0 THEN 'Waiting on Info'
    WHEN (SELECT COUNT(*) FROM tasks WHERE sub_category_id = NEW.sub_category_id AND status = 'Waiting on Partner') > 0 THEN 'Waiting on Partner'
    ELSE 'In Progress'
  END
  WHERE id = NEW.sub_category_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 9. Create trigger for auto-updating subcategory totals
DROP TRIGGER IF EXISTS update_subcategory_on_task_change ON tasks;
CREATE TRIGGER update_subcategory_on_task_change
AFTER INSERT OR UPDATE OR DELETE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_subcategory_totals();

-- 10. Create view for servicer task summary
CREATE OR REPLACE VIEW v_servicer_customer_summary AS
SELECT 
  tm.id as servicer_id,
  tm.name as servicer_name,
  c.phone as customer_phone,
  c.display_name as customer_name,
  c.flags as customer_flags,
  c.last_contact_method,
  c.last_contact_at,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.status = 'Waiting on Info' THEN t.id END) as waiting_info_count,
  COUNT(DISTINCT CASE WHEN t.status = 'In Progress' THEN t.id END) as in_progress_count,
  COUNT(DISTINCT CASE WHEN t.status = 'Complete' THEN t.id END) as complete_count,
  MAX(t.last_updated) as last_task_update
FROM tbl_team_member tm
LEFT JOIN tbl_customer c ON c.assigned_to = tm.id
LEFT JOIN categories cat ON cat.customer_phone = c.phone
LEFT JOIN sub_categories sc ON sc.category_id = cat.id
LEFT JOIN tasks t ON t.sub_category_id = sc.id
WHERE c.phone IS NOT NULL
GROUP BY tm.id, tm.name, c.phone, c.display_name, c.flags, c.last_contact_method, c.last_contact_at
ORDER BY tm.name, c.display_name;

-- 11. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_customer_assigned_to ON tbl_customer(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_sub_category ON tasks(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_category ON sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_customer ON categories(customer_phone);