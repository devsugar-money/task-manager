-- Check what's in the daily_updates table for today
SELECT 
  du.id,
  du.task_id,
  du.update_date,
  du.previous_status,
  du.new_status,
  du.communicated,
  du.updated_by,
  tm.name as updater_name,
  t.name as task_name
FROM daily_updates du
LEFT JOIN tbl_team_member tm ON tm.id = du.updated_by
LEFT JOIN tasks t ON t.id = du.task_id
WHERE du.update_date = CURRENT_DATE
ORDER BY du.created_at DESC
LIMIT 20;

-- Count updates by servicer for today
SELECT 
  COALESCE(tm.name, 'System') as servicer,
  COUNT(*) as update_count,
  COUNT(CASE WHEN du.new_status = 'Complete' THEN 1 END) as completed_count,
  COUNT(CASE WHEN du.communicated = true THEN 1 END) as communicated_count
FROM daily_updates du
LEFT JOIN tbl_team_member tm ON tm.id = du.updated_by
WHERE du.update_date = CURRENT_DATE
GROUP BY tm.name
ORDER BY update_count DESC;
