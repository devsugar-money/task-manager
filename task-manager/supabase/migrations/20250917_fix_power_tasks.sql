-- Fix Power subcategory tasks
-- Delete old incorrect tasks and create correct ones

-- First, identify Power subcategory IDs
WITH power_subcategories AS (
  SELECT id 
  FROM sub_categories 
  WHERE name = 'Power'
)
-- Delete existing tasks for Power subcategories
DELETE FROM tasks 
WHERE sub_category_id IN (SELECT id FROM power_subcategories);

-- Now insert the correct tasks for each Power subcategory
INSERT INTO tasks (sub_category_id, name, status, notes, start_date, communicated, money_saved)
SELECT 
  sc.id,
  task_name.name,
  'Not Started',
  '',
  NOW(),
  false,
  0
FROM sub_categories sc
CROSS JOIN (
  VALUES 
    ('Get recent bills'),
    ('Check current rates'),
    ('Compare providers'),
    ('Check bundle options'),
    ('Suggest optimisation'),
    ('Guide through switch')
) AS task_name(name)
WHERE sc.name = 'Power';
