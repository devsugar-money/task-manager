import React, { useState, useEffect } from 'react';
import { ChevronRight, CheckCircle, Clock, MessageCircle, AlertTriangle, Save } from 'lucide-react';
import { supabase, isSupabaseConfigured, Task, PREDEFINED_STATUSES, COMMUNICATION_METHODS } from '../lib/supabase';
import taskService from '../services/taskService';
import TimeIndicator from '../components/TimeIndicator';
import StatusBadge from '../components/StatusBadge';
import SupabaseStatus from '../components/SupabaseStatus';
import { mockTasks } from '../lib/mockData';

interface TaskUpdate {
  id: string;
  status: string;
  customStatus?: string;
  notes?: string;
  communicated: boolean;
  communicationMethod?: string;
  noCommReason?: string;
}

export default function ServicerView() {
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [updates, setUpdates] = useState<Record<string, TaskUpdate>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const currentServicer = 'servicer1'; // This would come from auth context

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchServicerTasks();
    } else {
      // Use mock data filtered for current servicer
      const servicerTasks = mockTasks.filter(task => 
        task.sub_category?.category?.customer?.assigned_servicer === currentServicer
      );
      setTasks(servicerTasks);
      setLoading(false);
    }
  }, []);

  const fetchServicerTasks = async () => {
    
    try {
      // Get all tasks assigned to current servicer using the task service
      const tasksData = await taskService.fetchServicerTasks(currentServicer);
      setTasks(tasksData);
    } catch (error) {
      console.error('Error fetching servicer tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const currentTask = tasks[currentTaskIndex];
  const currentUpdate = updates[currentTask?.id] || {
    id: currentTask?.id || '',
    status: currentTask?.status || '',
    customStatus: currentTask?.custom_status || '',
    notes: currentTask?.notes || '',
    communicated: false,
    communicationMethod: '',
    noCommReason: ''
  };

  const updateCurrentTask = (field: keyof TaskUpdate, value: any) => {
    if (!currentTask) return;
    
    setUpdates(prev => ({
      ...prev,
      [currentTask.id]: {
        ...currentUpdate,
        [field]: value
      }
    }));
  };

  const saveCurrentTask = async () => {
    if (!currentTask || !isSupabaseConfigured) return;
    
    const { supabase } = await import('../lib/supabase');
    if (!supabase) return;
    
    setSaving(true);
    try {
      const updateData = {
        status: currentUpdate.status,
        custom_status: currentUpdate.customStatus || null,
        notes: currentUpdate.notes,
        last_updated: new Date().toISOString(),
        updated_by: currentServicer,
        communicated: currentUpdate.communicated,
        communication_method: currentUpdate.communicated ? currentUpdate.communicationMethod : null,
        no_comm_reason: !currentUpdate.communicated ? currentUpdate.noCommReason : null
      };

      const { error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', currentTask.id);

      if (error) throw error;

      // Create daily update record
      await supabase
        .from('daily_updates')
        .insert({
          task_id: currentTask.id,
          update_date: new Date().toISOString().split('T')[0],
          previous_status: currentTask.status,
          new_status: currentUpdate.status,
          previous_notes: currentTask.notes,
          new_notes: currentUpdate.notes,
          communicated: currentUpdate.communicated,
          communication_method: currentUpdate.communicationMethod,
          no_comm_reason: currentUpdate.noCommReason,
          updated_by: currentServicer
        });

      // Remove from updates and refresh
      const newUpdates = { ...updates };
      delete newUpdates[currentTask.id];
      setUpdates(newUpdates);
      
      fetchServicerTasks();
    } catch (error) {
      console.error('Error saving task:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveAndNext = async () => {
    await saveCurrentTask();
    if (currentTaskIndex < tasks.length - 1) {
      setCurrentTaskIndex(currentTaskIndex + 1);
    }
  };

  const getTaskUrgency = (lastUpdated?: string) => {
    if (!lastUpdated) return 'never';
    const daysSince = Math.floor((Date.now() - new Date(lastUpdated).getTime()) / (1000 * 60 * 60 * 24));
    if (daysSince === 0) return 'today';
    if (daysSince <= 2) return 'recent';
    if (daysSince <= 4) return 'warning';
    return 'critical';
  };

  const urgentTasks = tasks.filter(task => 
    getTaskUrgency(task.last_updated) === 'critical' || 
    getTaskUrgency(task.last_updated) === 'never'
  );

  const tasksNeedingUpdate = tasks.filter(task => 
    getTaskUrgency(task.last_updated) === 'warning' ||
    getTaskUrgency(task.last_updated) === 'critical' ||
    getTaskUrgency(task.last_updated) === 'never'
  );

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {!isSupabaseConfigured && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              <strong>Demo Mode:</strong> You're viewing sample servicer tasks. 
              Connect to Supabase to manage real task updates.
            </p>
          </div>
        </div>
      )}
      
      {isSupabaseConfigured && <SupabaseStatus />}
      
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <p className="text-gray-600">
          Daily task updates for {currentServicer}
        </p>
      </div>

      {/* Task Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-blue-600 mr-2" />
            <div>
              <div className="text-lg font-semibold text-gray-900">{tasks.length}</div>
              <div className="text-xs text-gray-500">Total Tasks</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-yellow-600 mr-2" />
            <div>
              <div className="text-lg font-semibold text-gray-900">{tasksNeedingUpdate.length}</div>
              <div className="text-xs text-gray-500">Need Update</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
            <div>
              <div className="text-lg font-semibold text-gray-900">{urgentTasks.length}</div>
              <div className="text-xs text-gray-500">Urgent</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <div className="flex items-center">
            <MessageCircle className="h-5 w-5 text-green-600 mr-2" />
            <div>
              <div className="text-lg font-semibold text-gray-900">{Object.keys(updates).length}</div>
              <div className="text-xs text-gray-500">Updates Ready</div>
            </div>
          </div>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <CheckCircle className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            You have no tasks assigned to you at the moment.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Task Update Form */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium text-gray-900">Update Task</h2>
                <span className="text-sm text-gray-500">
                  {currentTaskIndex + 1} of {tasks.length}
                </span>
              </div>
            </div>
            
            {currentTask && (
              <div className="p-6 space-y-6">
                {/* Task Info */}
                <div>
                  <div className="flex items-center text-sm text-gray-500 mb-2">
                    <span>{currentTask.sub_category?.category?.customer?.display_name}</span>
                    <ChevronRight className="h-3 w-3 mx-1" />
                    <span>{currentTask.sub_category?.category?.name}</span>
                    <ChevronRight className="h-3 w-3 mx-1" />
                    <span>{currentTask.sub_category?.name}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{currentTask.name}</h3>
                  <TimeIndicator lastUpdate={currentTask.last_updated} />
                </div>

                {/* Status Update */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <div className="space-y-2">
                    <select
                      value={currentUpdate.status}
                      onChange={(e) => updateCurrentTask('status', e.target.value)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {PREDEFINED_STATUSES.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                      <option value="Custom">Custom</option>
                    </select>
                    {currentUpdate.status === 'Custom' && (
                      <input
                        type="text"
                        value={currentUpdate.customStatus}
                        onChange={(e) => updateCurrentTask('customStatus', e.target.value)}
                        placeholder="Enter custom status..."
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    )}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    value={currentUpdate.notes}
                    onChange={(e) => updateCurrentTask('notes', e.target.value)}
                    rows={4}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="Add update notes..."
                  />
                </div>

                {/* Communication Tracking */}
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="communicated"
                      checked={currentUpdate.communicated}
                      onChange={(e) => updateCurrentTask('communicated', e.target.checked)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="communicated" className="ml-2 text-sm font-medium text-gray-700">
                      Communicated to client
                    </label>
                  </div>
                  
                  {currentUpdate.communicated ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Communication Method</label>
                      <select
                        value={currentUpdate.communicationMethod}
                        onChange={(e) => updateCurrentTask('communicationMethod', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select method...</option>
                        {COMMUNICATION_METHODS.map(method => (
                          <option key={method} value={method}>{method}</option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Reason for no communication</label>
                      <select
                        value={currentUpdate.noCommReason}
                        onChange={(e) => updateCurrentTask('noCommReason', e.target.value)}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="">Select reason...</option>
                        <option value="Client unavailable">Client unavailable</option>
                        <option value="Waiting for information">Waiting for information</option>
                        <option value="Technical issues">Technical issues</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-3">
                  <button
                    onClick={saveCurrentTask}
                    disabled={saving}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={saveAndNext}
                    disabled={saving || currentTaskIndex >= tasks.length - 1}
                    className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 transition-colors"
                  >
                    <ChevronRight className="h-4 w-4 mr-2" />
                    Save & Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Task List */}
          <div className="bg-white rounded-lg border shadow-sm">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">All Tasks</h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {tasks.map((task, index) => (
                <div
                  key={task.id}
                  onClick={() => setCurrentTaskIndex(index)}
                  className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                    index === currentTaskIndex ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center text-xs text-gray-500 mb-1">
                        <span className="truncate">{task.sub_category?.category?.customer?.display_name}</span>
                        <ChevronRight className="h-3 w-3 mx-1 flex-shrink-0" />
                        <span className="truncate">{task.sub_category?.category?.name}</span>
                      </div>
                      <p className="text-sm font-medium text-gray-900 truncate">{task.name}</p>
                      <TimeIndicator lastUpdate={task.last_updated} className="mt-1" />
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <StatusBadge status={task.status} customStatus={task.custom_status} />
                      {updates[task.id] && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            Updated
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}