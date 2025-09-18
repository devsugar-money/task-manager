-- Create or replace the view for servicer task summary
DROP VIEW IF EXISTS v_servicer_customer_summary CASCADE;

CREATE VIEW v_servicer_customer_summary AS
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

-- Grant access to the view
GRANT SELECT ON v_servicer_customer_summary TO anon;
GRANT SELECT ON v_servicer_customer_summary TO authenticated;