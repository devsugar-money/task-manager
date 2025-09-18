/*
  # Create Sub-Categories Table

  1. New Tables
    - `sub_categories`
      - `id` (uuid, primary key)
      - `category_id` (uuid, references categories.id)
      - `name` (varchar, sub-category name like "Life Insurance", "KiwiSaver")
      - `start_time` (timestamptz, when sub-category work began)
      - `last_update` (timestamptz, last update to any task in this sub-category)
      - `status` (varchar, overall sub-category status)
      - `is_complete` (boolean, completion flag)
      - `completed_at` (timestamptz, completion timestamp)
      - `created_at` (timestamptz, record creation time)

  2. Security
    - Enable RLS on `sub_categories` table
    - Add policy for all operations for authenticated users

  3. Indexes
    - Index on category_id for fast parent category lookups
    - Index on status for filtering
    - Index on is_complete for completion tracking
*/

CREATE TABLE IF NOT EXISTS sub_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL,
  name character varying(255) NOT NULL,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  last_update timestamp with time zone,
  status character varying(50) DEFAULT 'Not Started',
  is_complete boolean DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraint
ALTER TABLE sub_categories 
ADD CONSTRAINT sub_categories_category_id_fkey 
FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_categories_category_id ON sub_categories(category_id);
CREATE INDEX IF NOT EXISTS idx_sub_categories_status ON sub_categories(status);
CREATE INDEX IF NOT EXISTS idx_sub_categories_is_complete ON sub_categories(is_complete);
CREATE INDEX IF NOT EXISTS idx_sub_categories_last_update ON sub_categories(last_update DESC);

-- Enable Row Level Security
ALTER TABLE sub_categories ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage sub-categories
CREATE POLICY "Allow all operations for authenticated users" ON sub_categories
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- Add constraint to set completed_at when is_complete is true
CREATE OR REPLACE FUNCTION update_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_complete = true AND OLD.is_complete = false THEN
    NEW.completed_at = now();
  ELSIF NEW.is_complete = false THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_completed_at
  BEFORE UPDATE ON sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_completed_at();