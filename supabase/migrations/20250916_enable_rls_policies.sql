-- Enable RLS and create policies for all tables

-- Categories table
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for authenticated users on categories" ON categories;
CREATE POLICY "Enable all operations for authenticated users on categories" ON categories
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for anon users on categories" ON categories;
CREATE POLICY "Enable read for anon users on categories" ON categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users on categories" ON categories;
CREATE POLICY "Enable insert for anon users on categories" ON categories
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anon users on categories" ON categories;
CREATE POLICY "Enable update for anon users on categories" ON categories
FOR UPDATE USING (true) WITH CHECK (true);

-- Sub-categories table
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for authenticated users on sub_categories" ON sub_categories;
CREATE POLICY "Enable all operations for authenticated users on sub_categories" ON sub_categories
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for anon users on sub_categories" ON sub_categories;
CREATE POLICY "Enable read for anon users on sub_categories" ON sub_categories
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users on sub_categories" ON sub_categories;
CREATE POLICY "Enable insert for anon users on sub_categories" ON sub_categories
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anon users on sub_categories" ON sub_categories;
CREATE POLICY "Enable update for anon users on sub_categories" ON sub_categories
FOR UPDATE USING (true) WITH CHECK (true);

-- Tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for authenticated users on tasks" ON tasks;
CREATE POLICY "Enable all operations for authenticated users on tasks" ON tasks
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for anon users on tasks" ON tasks;
CREATE POLICY "Enable read for anon users on tasks" ON tasks
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users on tasks" ON tasks;
CREATE POLICY "Enable insert for anon users on tasks" ON tasks
FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Enable update for anon users on tasks" ON tasks;
CREATE POLICY "Enable update for anon users on tasks" ON tasks
FOR UPDATE USING (true) WITH CHECK (true);

-- Daily updates table
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for authenticated users on daily_updates" ON daily_updates;
CREATE POLICY "Enable all operations for authenticated users on daily_updates" ON daily_updates
FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable read for anon users on daily_updates" ON daily_updates;
CREATE POLICY "Enable read for anon users on daily_updates" ON daily_updates
FOR SELECT USING (true);

DROP POLICY IF EXISTS "Enable insert for anon users on daily_updates" ON daily_updates;
CREATE POLICY "Enable insert for anon users on daily_updates" ON daily_updates
FOR INSERT WITH CHECK (true);

-- tbl_customer table
ALTER TABLE tbl_customer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for anon users on tbl_customer" ON tbl_customer;
CREATE POLICY "Enable all operations for anon users on tbl_customer" ON tbl_customer
FOR ALL USING (true) WITH CHECK (true);

-- tbl_team_member table  
ALTER TABLE tbl_team_member ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for anon users on tbl_team_member" ON tbl_team_member;
CREATE POLICY "Enable all operations for anon users on tbl_team_member" ON tbl_team_member
FOR ALL USING (true) WITH CHECK (true);

-- Add money_saved column to tasks table if it doesn't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS money_saved numeric DEFAULT 0;

-- Add notes column to customers table if it doesn't exist
ALTER TABLE tbl_customer ADD COLUMN IF NOT EXISTS notes text;