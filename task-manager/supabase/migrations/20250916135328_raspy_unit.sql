/*
  # Create Daily Updates Audit Table

  1. New Tables
    - `daily_updates`
      - `id` (uuid, primary key)
      - `task_id` (uuid, references tasks.id)
      - `update_date` (date, date of the update)
      - `previous_status` (varchar, status before update)
      - `new_status` (varchar, status after update)
      - `previous_notes` (text, notes before update)
      - `new_notes` (text, notes after update)
      - `communicated` (boolean, if update was communicated)
      - `communication_method` (varchar, method used)
      - `no_comm_reason` (varchar, reason if not communicated)
      - `updated_by` (uuid, references tbl_team_member.id)
      - `created_at` (timestamptz, when record was created)

  2. Security
    - Enable RLS on `daily_updates` table
    - Add policy for all operations for authenticated users

  3. Indexes
    - Index on task_id for task history lookups
    - Index on update_date for date range queries
    - Index on updated_by for servicer activity tracking
    - Composite index for task timeline queries
*/

CREATE TABLE IF NOT EXISTS daily_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  update_date date NOT NULL DEFAULT CURRENT_DATE,
  previous_status character varying(50),
  new_status character varying(50) NOT NULL,
  previous_notes text,
  new_notes text DEFAULT '',
  communicated boolean DEFAULT false,
  communication_method character varying(50),
  no_comm_reason character varying(200),
  updated_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE daily_updates 
ADD CONSTRAINT daily_updates_task_id_fkey 
FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE;

ALTER TABLE daily_updates 
ADD CONSTRAINT daily_updates_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES tbl_team_member(id) ON DELETE SET NULL;

-- Add check constraints
ALTER TABLE daily_updates 
ADD CONSTRAINT daily_updates_communication_method_check 
CHECK (
  communication_method IS NULL OR 
  communication_method IN ('Email', 'WhatsApp', 'Phone', 'In-person', 'Other')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_daily_updates_task_id ON daily_updates(task_id);
CREATE INDEX IF NOT EXISTS idx_daily_updates_update_date ON daily_updates(update_date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_updates_updated_by ON daily_updates(updated_by);
CREATE INDEX IF NOT EXISTS idx_daily_updates_created_at ON daily_updates(created_at DESC);

-- Composite index for task timeline queries
CREATE INDEX IF NOT EXISTS idx_daily_updates_task_timeline ON daily_updates(task_id, update_date DESC);

-- Composite index for servicer activity tracking
CREATE INDEX IF NOT EXISTS idx_daily_updates_servicer_activity ON daily_updates(updated_by, update_date DESC);

-- Enable Row Level Security
ALTER TABLE daily_updates ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage daily updates
CREATE POLICY "Allow all operations for authenticated users" ON daily_updates
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);