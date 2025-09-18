-- Test to verify data is being saved correctly

-- Check recent daily_updates records
SELECT 
  du.id,
  du.task_id,
  du.update_date,
  du.previous_status,
  du.new_status,
  du.communicated,
  du.communication_method,
  du.updated_by,
  tm.name as updater_name,
  t.name as task_name,
  c.display_name as customer_name
FROM daily_updates du
LEFT JOIN tbl_team_member tm ON tm.id = du.updated_by
LEFT JOIN tasks t ON t.id = du.task_id
LEFT JOIN sub_categories sc ON sc.id = t.sub_category_id
LEFT JOIN categories cat ON cat.id = sc.category_id
LEFT JOIN tbl_customer c ON c.phone = cat.customer_phone
WHERE du.update_date >= CURRENT_DATE - INTERVAL '2 days'
ORDER BY du.created_at DESC
LIMIT 20;

-- Check task assignments to servicers
SELECT 
  c.display_name as customer_name,
  tm.name as servicer_name,
  c.assigned_to as servicer_uuid,
  COUNT(t.id) as total_tasks,
  COUNT(CASE WHEN t.status NOT IN ('Complete', 'N/A') THEN 1 END) as remaining_tasks
FROM tbl_customer c
LEFT JOIN tbl_team_member tm ON tm.id = c.assigned_to
LEFT JOIN categories cat ON cat.customer_phone = c.phone
LEFT JOIN sub_categories sc ON sc.category_id = cat.id
LEFT JOIN tasks t ON t.sub_category_id = sc.id
GROUP BY c.phone, c.display_name, tm.name, c.assigned_to
ORDER BY servicer_name, customer_name;

-- Check if tasks have updated_by field populated
SELECT 
  status,
  COUNT(*) as total,
  COUNT(updated_by) as with_servicer,
  COUNT(*) - COUNT(updated_by) as missing_servicer
FROM tasks
GROUP BY status
ORDER BY status;
