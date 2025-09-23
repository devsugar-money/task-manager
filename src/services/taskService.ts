// services/taskService.ts
// Drop-in replacement service that fixes all Supabase query errors

import { supabase } from '../lib/supabase';

/**
 * Service for handling all task-related queries with proper error handling
 * Fixes UUID type errors and nested relationship filtering issues
 */

// Cache for servicer UUIDs to reduce database calls
const servicerCache = new Map<string, string>();

/**
 * Get servicer UUID from name (with caching)
 */
async function getServicerUUID(servicerName: string): Promise<string | null> {
  // Check cache first
  if (servicerCache.has(servicerName)) {
    return servicerCache.get(servicerName)!;
  }

  if (!supabase) return null;

  try {
    const { data, error } = await supabase
      .from('tbl_team_member')
      .select('id')
      .eq('name', servicerName)
      .single();

    if (!error && data) {
      servicerCache.set(servicerName, data.id);
      return data.id;
    }
  } catch (error) {
    console.error('Error fetching servicer UUID:', error);
  }

  return null;
}

/**
 * Fetch all tasks with complete relationship data
 * This is the base query that includes all necessary relationships
 */
export async function fetchAllTasksWithRelationships() {
  if (!supabase) return [];
  
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select(`
        *,
        sub_category:sub_categories!inner(
          *,
          category:categories!inner(
            *,
            customer:tbl_customer!inner(*)
          )
        )
      `)
      .order('id', { ascending: true }); // Order by ID to maintain consistent position

    if (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Unexpected error fetching tasks:', error);
    return [];
  }
}

/**
 * Fetch tasks for a specific servicer
 * Handles both servicer name and UUID
 */
export async function fetchServicerTasks(servicerIdentifier: string) {
  try {
    // Check if identifier is a UUID (basic check)
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(servicerIdentifier);
    
    let servicerUUID = servicerIdentifier;
    
    // If not a UUID, assume it's a name and fetch the UUID
    if (!isUUID) {
      const uuid = await getServicerUUID(servicerIdentifier);
      if (!uuid) {
        console.error(`Servicer not found: ${servicerIdentifier}`);
        return [];
      }
      servicerUUID = uuid;
    }

    // Fetch all tasks with relationships
    const tasks = await fetchAllTasksWithRelationships();

    // Filter for this servicer's tasks
    return tasks.filter(task => 
      task.sub_category?.category?.customer?.assigned_to === servicerUUID
    );
  } catch (error) {
    console.error('Error in fetchServicerTasks:', error);
    return [];
  }
}

/**
 * Fetch tasks for a specific customer by phone number
 */
export async function fetchCustomerTasks(customerPhone: string) {
  try {
    // Clean phone number (remove spaces, dashes, etc.)
    const cleanPhone = customerPhone.replace(/[\s-()]/g, '');
    
    // Fetch all tasks with relationships
    const tasks = await fetchAllTasksWithRelationships();

    // Filter for this customer's tasks
    return tasks.filter(task => {
      const taskPhone = task.sub_category?.category?.customer?.phone?.replace(/[\s-()]/g, '');
      return taskPhone === cleanPhone;
    });
  } catch (error) {
    console.error('Error in fetchCustomerTasks:', error);
    return [];
  }
}

/**
 * Fetch stale tasks (not updated within threshold days)
 */
export async function fetchStaleTasks(thresholdDays: number = 3, servicerUUID?: string) {
  try {
    let tasks = await fetchAllTasksWithRelationships();
    
    // Filter by servicer if provided
    if (servicerUUID) {
      tasks = tasks.filter(task => 
        task.sub_category?.category?.customer?.assigned_to === servicerUUID
      );
    }
    
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - thresholdDays);

    return tasks.filter(task => 
      task.status !== 'Complete' &&
      (!task.last_updated || new Date(task.last_updated) < thresholdDate)
    );
  } catch (error) {
    console.error('Error in fetchStaleTasks:', error);
    return [];
  }
}

/**
 * Get customer statistics including task counts and last update
 */
export async function getCustomerStats(customerPhone: string) {
  try {
    const tasks = await fetchCustomerTasks(customerPhone);
    
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // Only count incomplete tasks as stale/overdue
    const staleTasks = tasks.filter(task => 
      task.status !== 'Complete' && 
      (!task.last_updated || new Date(task.last_updated) < staleThreshold)
    );

    const sortedTasks = tasks
      .filter(task => task.last_updated)
      .sort((a, b) => 
        new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
      );

    return {
      totalTasks: tasks.length,
      staleTasks: staleTasks.length,
      lastUpdate: sortedTasks[0]?.last_updated || null,
      needsUpdate: staleTasks.length > 0
    };
  } catch (error) {
    console.error('Error in getCustomerStats:', error);
    return {
      totalTasks: 0,
      staleTasks: 0,
      lastUpdate: null,
      needsUpdate: false
    };
  }
}

/**
 * Get dashboard statistics
 */
export async function getDashboardStats(servicerUUID?: string) {
  try {
    let tasks = await fetchAllTasksWithRelationships();
    
    // Filter by servicer if provided
    if (servicerUUID) {
      tasks = tasks.filter(task => 
        task.sub_category?.category?.customer?.assigned_to === servicerUUID
      );
    }
    
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const overdueThreshold = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const tasksNeedingUpdate = tasks.filter(task => 
      task.status !== 'Complete' &&
      (!task.last_updated || new Date(task.last_updated) < staleThreshold)
    );

    const overdueTasks = tasks.filter(task => 
      task.status !== 'Complete' &&
      (!task.last_updated || new Date(task.last_updated) < overdueThreshold)
    );

    // Get unique customers with stale tasks
    const customersWithStaleTasks = new Set(
      tasksNeedingUpdate
        .map(task => task.sub_category?.category?.customer?.phone)
        .filter(Boolean)
    );

    return {
      totalTasks: tasks.length,
      tasksNeedingUpdate: tasksNeedingUpdate.length,
      overdueTasks: overdueTasks.length,
      customersWithStaleTasks: customersWithStaleTasks.size
    };
  } catch (error) {
    console.error('Error in getDashboardStats:', error);
    return {
      totalTasks: 0,
      tasksNeedingUpdate: 0,
      overdueTasks: 0,
      customersWithStaleTasks: 0
    };
  }
}

/**
 * Get recent task updates
 */
export async function getRecentUpdates(limit: number = 10, servicerUUID?: string) {
  try {
    let tasks = await fetchAllTasksWithRelationships();
    
    // Filter by servicer if provided
    if (servicerUUID) {
      tasks = tasks.filter(task => 
        task.sub_category?.category?.customer?.assigned_to === servicerUUID
      );
    }
    
    // Filter for tasks with updates and sort by most recent
    const recentTasks = tasks
      .filter(task => task.last_updated)
      .sort((a, b) => 
        new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
      )
      .slice(0, limit);

    return recentTasks.map(task => ({
      id: task.id,
      task_name: task.name || 'Unnamed Task',
      customer_name: task.sub_category?.category?.customer?.display_name || 'Unknown Customer',
      category_name: task.sub_category?.category?.name || 'Unknown Category',
      subcategory_name: task.sub_category?.name || 'Unknown Subcategory',
      status: task.status || 'pending',
      updated_at: task.last_updated
    }));
  } catch (error) {
    console.error('Error in getRecentUpdates:', error);
    return [];
  }
}

/**
 * Batch fetch multiple customers' stats (optimized for performance)
 */
export async function batchGetCustomerStats(customerPhones: string[]) {
  try {
    const tasks = await fetchAllTasksWithRelationships();
    
    const now = new Date();
    const staleThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    const statsMap = new Map();

    // Initialize all customers with default stats
    customerPhones.forEach(phone => {
      statsMap.set(phone, {
        totalTasks: 0,
        staleTasks: 0,
        lastUpdate: null,
        needsUpdate: false
      });
    });

    // Process tasks and update stats
    tasks.forEach(task => {
      const customerPhone = task.sub_category?.category?.customer?.phone;
      if (customerPhone && statsMap.has(customerPhone)) {
        const stats = statsMap.get(customerPhone);
        
        stats.totalTasks++;
        
        if (!task.last_updated || new Date(task.last_updated) < staleThreshold) {
          stats.staleTasks++;
          stats.needsUpdate = true;
        }

        if (task.last_updated) {
          if (!stats.lastUpdate || new Date(task.last_updated) > new Date(stats.lastUpdate)) {
            stats.lastUpdate = task.last_updated;
          }
        }
      }
    });

    return Array.from(statsMap.entries()).map(([phone, stats]) => ({
      customer_phone: phone,
      ...stats
    }));
  } catch (error) {
    console.error('Error in batchGetCustomerStats:', error);
    return customerPhones.map(phone => ({
      customer_phone: phone,
      totalTasks: 0,
      staleTasks: 0,
      lastUpdate: null,
      needsUpdate: false
    }));
  }
}

// Export all functions as default object for easy importing
export default {
  fetchAllTasksWithRelationships,
  fetchServicerTasks,
  fetchCustomerTasks,
  fetchStaleTasks,
  getCustomerStats,
  getDashboardStats,
  getRecentUpdates,
  batchGetCustomerStats
};