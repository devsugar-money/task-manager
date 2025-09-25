-- Update the trigger to include automatic WhatsApp communication logic
-- This ensures automatic WhatsApp communications are tracked even if frontend logic is bypassed

CREATE OR REPLACE FUNCTION create_daily_update_on_task_change() 
RETURNS TRIGGER AS $$
BEGIN
  -- Set started_at when task moves from Not Started to any other status
  IF OLD.status = 'Not Started' AND NEW.status != 'Not Started' AND NEW.started_at IS NULL THEN
    NEW.started_at = NOW();
  END IF;
  
  -- Auto-trigger WhatsApp communication for certain status changes (if not already set)
  IF OLD.status IS DISTINCT FROM NEW.status AND NOT NEW.communicated THEN
    -- Send automatic WhatsApp when task is completed
    IF NEW.status = 'Complete' THEN
      NEW.communicated = true;
      NEW.communication_method = 'WhatsApp';
    -- Send automatic WhatsApp when task moves to statuses that indicate customer action needed
    ELSIF NEW.status IN ('Waiting on Info', 'Sent Info', 'Call Arranged') THEN
      NEW.communicated = true;
      NEW.communication_method = 'WhatsApp';
    END IF;
  END IF;
  
  -- Only create daily update if status actually changed OR if communication was logged
  IF OLD.status IS DISTINCT FROM NEW.status OR 
     (NEW.communicated = true AND OLD.communicated IS DISTINCT FROM NEW.communicated) THEN
    BEGIN
      INSERT INTO daily_updates (
        task_id,
        update_date,
        previous_status,
        new_status,
        previous_notes,
        new_notes,
        communicated,
        communication_method,
        no_comm_reason,
        updated_by,
        comment
      ) VALUES (
        NEW.id,
        CURRENT_DATE,
        OLD.status,
        NEW.status,
        OLD.notes,
        NEW.notes,
        NEW.communicated,
        NEW.communication_method,
        NEW.no_comm_reason,
        NEW.updated_by,
        NEW.status_change_comment
      );
    EXCEPTION 
      WHEN unique_violation THEN
        -- If duplicate, update the existing record
        UPDATE daily_updates
        SET 
          new_status = NEW.status,
          new_notes = NEW.notes,
          communicated = CASE WHEN NEW.communicated THEN true ELSE communicated END,
          communication_method = CASE WHEN NEW.communicated THEN NEW.communication_method ELSE communication_method END,
          no_comm_reason = NEW.no_comm_reason,
          updated_by = COALESCE(NEW.updated_by, updated_by),
          comment = COALESCE(NEW.status_change_comment, comment),
          created_at = NOW()
        WHERE task_id = NEW.id 
          AND update_date = CURRENT_DATE;
    END;
  END IF;
  
  -- Clear the temporary comment field after use
  NEW.status_change_comment = NULL;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;