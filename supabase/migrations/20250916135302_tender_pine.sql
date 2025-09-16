/*
  # Create Categories Table

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `customer_phone` (varchar, references tbl_customer.phone)
      - `name` (varchar, category name like "Insurance", "Investment")
      - `start_time` (timestamptz, when category work began)
      - `last_update` (timestamptz, last update to any task in this category)
      - `status` (varchar, overall category status)
      - `created_by` (uuid, references tbl_team_member.id)
      - `created_at` (timestamptz, record creation time)

  2. Security
    - Enable RLS on `categories` table
    - Add policy for all operations for authenticated users

  3. Indexes
    - Index on customer_phone for fast customer lookups
    - Index on created_by for servicer filtering
    - Index on status for dashboard queries
*/

CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_phone character varying(20) NOT NULL,
  name character varying(255) NOT NULL,
  start_time timestamp with time zone NOT NULL DEFAULT now(),
  last_update timestamp with time zone,
  status character varying(50) DEFAULT 'Not Started',
  created_by uuid,
  created_at timestamp with time zone DEFAULT now()
);

-- Add foreign key constraints
ALTER TABLE categories 
ADD CONSTRAINT categories_customer_phone_fkey 
FOREIGN KEY (customer_phone) REFERENCES tbl_customer(phone) ON DELETE CASCADE;

ALTER TABLE categories 
ADD CONSTRAINT categories_created_by_fkey 
FOREIGN KEY (created_by) REFERENCES tbl_team_member(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_categories_customer_phone ON categories(customer_phone);
CREATE INDEX IF NOT EXISTS idx_categories_created_by ON categories(created_by);
CREATE INDEX IF NOT EXISTS idx_categories_status ON categories(status);
CREATE INDEX IF NOT EXISTS idx_categories_last_update ON categories(last_update DESC);

-- Enable Row Level Security
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to manage categories
CREATE POLICY "Allow all operations for authenticated users" ON categories
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);