/*
  # Create Tasks Table

  1. New Tables
    - `tasks`
      - `id` (uuid, primary key)
      - `sub_category_id` (uuid, references sub_categories.id)
      - `name` (varchar, task name)
      - `status` (varchar, current task status)
      - `custom_status` (varchar, optional custom status)
      - `notes` (text, detailed task notes)
      - `last_updated` (timestamptz, when task was last updated)
      - `updated_by` (uuid, references tbl_team_member.id)
      - `communicated` (boolean, if update was communicated to client)
      - `communication_method` (varchar, method used for communication)
      - `no_comm_reason` (varchar, reason if not communicated)
      - `created_at` (timestamptz, record creation time)

  2. Security
    - Enable RLS on `tasks` table
    - Add policy for all operations for authenticated users

  3. Indexes
    - Index on sub_category_id for parent lookups
    - Index on status for filtering
    - Index on last_updated for urgency tracking
    - Index on updated_by for servicer filtering
    - Index on communicated for communication tracking

  4. Constraints
    - Status must be from predefined list or 'Custom'
    - Communication method from predefined list when communicated is true
*/

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sub_category_id uuid NOT NULL,
  name character varying(500) NOT NULL,
  status character varying(50) NOT NULL DEFAULT 'Not Started',
  custom_status character varying(100),
  notes text DEFAULT '',
  last_updated timestamp with time zone,
  updated_by uuid,
  communicated boolean DEFAULT false,
  communication_method character varying(50),
  no_comm_reason character varying(200),
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE tasks 
ADD CONSTRAINT tasks_sub_category_id_fkey 
FOREIGN KEY (sub_category_id) REFERENCES sub_categories(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD CONSTRAINT tasks_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES tbl_team_member(id) ON DELETE SET NULL;

-- Add check constraints for valid values
ALTER TABLE tasks 
ADD CONSTRAINT tasks_status_check 
CHECK (status IN ('Not Started', 'Ongoing', 'Completed', 'Waiting on Info', 'Waiting on Partner', 'Not Done Before', 'Slow Info', 'Blocked', 'Custom'));

ALTER TABLE tasks 
ADD CONSTRAINT tasks_communication_method_check 
CHECK (
  communication_method IS NULL OR 
  communication_method IN ('Email', 'WhatsApp', 'Phone', 'In-person', 'Other')
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tasks_sub_category_id ON tasks(sub_category_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_last_updated ON tasks(last_updated DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON tasks(updated_by);
CREATE INDEX IF NOT EXISTS idx_tasks_communicated ON tasks(communicated);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- Composite index for servicer dashboard queries
CREATE INDEX IF NOT EXISTS idx_tasks_servicer_urgency ON tasks(updated_by, last_updated ASC NULLS FIRST);

-- Enable Row Level Security
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage tasks
CREATE POLICY "Allow all operations for authenticated users" ON tasks
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);