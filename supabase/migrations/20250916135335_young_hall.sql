/*
  # Create Task Management Triggers and Functions

  1. Functions
    - update_category_last_update(): Updates category.last_update when sub-category changes
    - update_sub_category_last_update(): Updates sub_category.last_update when task changes
    - create_daily_update_on_task_change(): Creates audit record when task is updated

  2. Triggers
    - Update timestamps when tasks or sub-categories change
    - Automatically create daily_updates records
    - Maintain data consistency across the hierarchy

  3. Purpose
    - Keep last_update timestamps accurate across the hierarchy
    - Ensure complete audit trail of all changes
    - Maintain referential integrity
*/

-- Function to update category last_update when sub-category changes
CREATE OR REPLACE FUNCTION update_category_last_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE categories 
  SET last_update = now()
  WHERE id = (
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.category_id
      ELSE NEW.category_id
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to update sub-category last_update when task changes
CREATE OR REPLACE FUNCTION update_sub_category_last_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE sub_categories 
  SET last_update = now()
  WHERE id = (
    CASE 
      WHEN TG_OP = 'DELETE' THEN OLD.sub_category_id
      ELSE NEW.sub_category_id
    END
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create daily_updates record when task is updated
CREATE OR REPLACE FUNCTION create_daily_update_on_task_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create daily_update if this is an actual update (not insert)
  -- and if significant fields have changed
  IF TG_OP = 'UPDATE' AND (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.notes IS DISTINCT FROM NEW.notes OR
    OLD.communicated IS DISTINCT FROM NEW.communicated
  ) THEN
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
      updated_by
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
      NEW.updated_by
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for sub_categories table
CREATE TRIGGER trigger_update_category_on_sub_category_change
  AFTER INSERT OR UPDATE OR DELETE ON sub_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_category_last_update();

-- Create triggers for tasks table
CREATE TRIGGER trigger_update_sub_category_on_task_change
  AFTER INSERT OR UPDATE OR DELETE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_sub_category_last_update();

CREATE TRIGGER trigger_create_daily_update_on_task_change
  AFTER UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION create_daily_update_on_task_change();

-- Trigger to automatically set last_updated on tasks when they are updated
CREATE OR REPLACE FUNCTION set_task_last_updated()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_task_last_updated
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_task_last_updated();