import React, { useState, useEffect } from 'react';
import { ArrowRight, Clock, User, AlertTriangle, CheckSquare } from 'lucide-react';
import { supabase, isSupabaseConfigured, PREDEFINED_STATUSES } from '../lib/supabase';
import TimeIndicator from '../components/TimeIndicator';
import SupabaseStatus from '../components/SupabaseStatus';

interface UpNextTask {
  id: string;
  name: string;
  status: string;
  started_at?: string;
  last_updated?: string;
  created_at: string;
  subcategory_name: string;
  category_name: string;
  customer_name: string;
  customer_phone: string;
  servicer_id?: string;
  servicer_name?: string;
  priority_score: number;
  days_since_update: number;
}

export default function UpNext() {
  const [tasks, setTasks] = useState<UpNextTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServicer, setSelectedServicer] = useState<string>('');
  const [servicers, setServicers] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchUpNextTasks();
      fetchServicers();
    } else {
      setLoading(false);
    }
  }, [selectedServicer]);

  const fetchServicers = async () => {
    if (!supabase) return;

    try {
      const { data, error } = await supabase
        .from('tbl_team_member')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setServicers(data || []);
    } catch (error) {
      console.error('Error fetching servicers:', error);
    }
  };

  const fetchUpNextTasks = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      let query = supabase
        .from('v_up_next_tasks')
        .select('*')
        .limit(50);

      if (selectedServicer) {
        query = query.eq('servicer_id', selectedServicer);
      }

      const { data, error } = await query;

      if (error) {
        console.error('View error, falling back to direct query:', error);
        
        // Fallback to direct query if view doesn't exist
        const fallbackQuery = supabase
          .from('tasks')
          .select(`
            *,
            sub_category:sub_categories!inner(
              name,
              category:categories!inner(
                name,
                customer:tbl_customer!categories_customer_phone_fkey(
                  phone,
                  display_name,
                  assigned_to
                )
              )
            )
          `)
          .not('status', 'in', '("Complete","N/A")')
          .order('last_updated', { ascending: true, nullsFirst: true })
          .limit(50);

        const { data: fallbackData, error: fallbackError } = await fallbackQuery;
        
        if (fallbackError) throw fallbackError;

        // Transform fallback data
        const transformedTasks = fallbackData?.map(task => ({
          ...task,
          subcategory_name: task.sub_category?.name || '',
          category_name: task.sub_category?.category?.name || '',
          customer_name: task.sub_category?.category?.customer?.display_name || '',
          customer_phone: task.sub_category?.category?.customer?.phone || '',
          servicer_id: task.sub_category?.category?.customer?.assigned_to,
          priority_score: getPriorityScore(task.status),
          days_since_update: Math.floor((Date.now() - new Date(task.last_updated || task.created_at).getTime()) / (1000 * 60 * 60 * 24))
        })) || [];

        // Sort by priority
        transformedTasks.sort((a, b) => {
          if (a.priority_score !== b.priority_score) {
            return a.priority_score - b.priority_score;
          }
          return b.days_since_update - a.days_since_update;
        });

        setTasks(selectedServicer 
          ? transformedTasks.filter(t => t.servicer_id === selectedServicer)
          : transformedTasks
        );
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityScore = (status: string) => {
    switch(status) {
      case 'Waiting on Info': return 1;
      case 'Waiting on Partner': return 2;
      case 'In Progress': return 3;
      case 'Sent Info': return 4;
      case 'Followed Up': return 5;
      case 'Not Started': return 6;
      default: return 99;
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, servicerId?: string) => {
    if (!supabase) return;

    try {
      const updateData: any = { 
        status: newStatus,
        last_updated: new Date().toISOString(),
        updated_by: servicerId || selectedServicer || null  // Include servicer UUID
      };

      if (newStatus === 'Complete') {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId);

      if (error) throw error;
      
      // Refresh the list
      fetchUpNextTasks();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Waiting on Info':
      case 'Waiting on Partner':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Sent Info':
      case 'Followed Up':
        return 'bg-purple-100 text-purple-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getDaysColor = (days: number) => {
    if (days > 7) return 'text-red-600';
    if (days > 3) return 'text-yellow-600';
    return 'text-gray-500';
  };

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const waitingTasks = tasks.filter(t => t.status.includes('Waiting'));
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress');
  const notStartedTasks = tasks.filter(t => t.status === 'Not Started');

  return (
    <div className="space-y-6">
      {isSupabaseConfigured && <SupabaseStatus />}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Up Next</h1>
          <p className="text-gray-600">Tasks prioritized by urgency and time since last update</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Servicer</label>
          <select
            value={selectedServicer}
            onChange={(e) => setSelectedServicer(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="">All Servicers</option>
            {servicers.map(servicer => (
              <option key={servicer.id} value={servicer.id}>
                {servicer.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Priority Sections */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">All caught up!</h3>
          <p className="mt-1 text-sm text-gray-500">
            No pending tasks require attention.
          </p>
        </div>
      ) : (
        <>
          {/* Waiting Tasks - Highest Priority */}
          {waitingTasks.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b bg-yellow-50">
                <div className="flex items-center">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Waiting / Follow-up Required</h3>
                  <span className="ml-2 text-sm text-gray-500">({waitingTasks.length} tasks)</span>
                </div>
              </div>
              <div className="divide-y">
                {waitingTasks.map(task => (
                  <TaskRow key={task.id} task={task} onUpdateStatus={updateTaskStatus} />
                ))}
              </div>
            </div>
          )}

          {/* In Progress Tasks */}
          {inProgressTasks.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b bg-blue-50">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-blue-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">In Progress</h3>
                  <span className="ml-2 text-sm text-gray-500">({inProgressTasks.length} tasks)</span>
                </div>
              </div>
              <div className="divide-y">
                {inProgressTasks.map(task => (
                  <TaskRow key={task.id} task={task} onUpdateStatus={updateTaskStatus} />
                ))}
              </div>
            </div>
          )}

          {/* Not Started Tasks */}
          {notStartedTasks.length > 0 && (
            <div className="bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center">
                  <ArrowRight className="h-5 w-5 text-gray-600 mr-2" />
                  <h3 className="text-lg font-medium text-gray-900">Ready to Start</h3>
                  <span className="ml-2 text-sm text-gray-500">({notStartedTasks.length} tasks)</span>
                </div>
              </div>
              <div className="divide-y">
                {notStartedTasks.slice(0, 10).map(task => (
                  <TaskRow key={task.id} task={task} onUpdateStatus={updateTaskStatus} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Task Row Component
function TaskRow({ task, onUpdateStatus }: { task: UpNextTask; onUpdateStatus: (id: string, status: string, servicerId?: string) => void }) {
  const getDaysColor = (days: number) => {
    if (days > 7) return 'text-red-600 font-bold';
    if (days > 3) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Waiting on Info':
      case 'Waiting on Partner':
        return 'bg-yellow-100 text-yellow-800';
      case 'In Progress':
        return 'bg-blue-100 text-blue-800';
      case 'Sent Info':
      case 'Followed Up':
        return 'bg-purple-100 text-purple-800';
      case 'Not Started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="px-6 py-4 hover:bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-3 mb-1">
            <span className="font-medium text-gray-900">{task.customer_name}</span>
            <ArrowRight className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">{task.subcategory_name}</span>
          </div>
          <p className="text-sm text-gray-900 mb-2">{task.name}</p>
          <div className="flex items-center space-x-3">
            <select
              value={task.status}
              onChange={(e) => onUpdateStatus(task.id, e.target.value, task.servicer_id)}
              className="text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
              onClick={(e) => e.stopPropagation()}
            >
              {PREDEFINED_STATUSES.map(status => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
            {task.started_at && (
              <span className="text-xs text-gray-500">
                Started: {new Date(task.started_at).toLocaleDateString()}
              </span>
            )}
            <span className={`text-xs ${getDaysColor(task.days_since_update)}`}>
              {task.days_since_update === 0 
                ? 'Updated today' 
                : `${task.days_since_update} days since update`}
            </span>
            {task.servicer_name && (
              <span className="text-xs text-gray-500 flex items-center">
                <User className="h-3 w-3 mr-1" />
                {task.servicer_name}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}