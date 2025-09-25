import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, MessageCircle, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured, PREDEFINED_STATUSES } from '../lib/supabase';
import TimeIndicator from '../components/TimeIndicator';
import SupabaseStatus from '../components/SupabaseStatus';

interface DailyUpdateWithDetails {
  id: string;
  task_id: string;
  update_date: string;
  previous_status?: string;
  new_status: string;
  previous_notes?: string;
  new_notes?: string;
  communicated: boolean;
  communication_method?: string;
  updated_by?: string;
  created_at: string;
  task?: {
    id: string;
    name: string;
    sub_category?: {
      id: string;
      name: string;
      category?: {
        id: string;
        name: string;
        customer?: {
          phone: string;
          display_name: string;
        };
      };
    };
  };
  updater?: {
    id: string;
    name: string;
  };
}

export default function Updates() {
  const [updates, setUpdates] = useState<DailyUpdateWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedServicer, setSelectedServicer] = useState<string>(() => {
    return localStorage.getItem('selectedServicer') || '';
  });
  const [servicers, setServicers] = useState<Array<{id: string, name: string}>>([]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchUpdates();
      fetchServicers();
    } else {
      setLoading(false);
    }
  }, [selectedDate, selectedServicer]);

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

  const fetchUpdates = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      let query = supabase
        .from('daily_updates')
        .select(`
          *,
          task:tasks!inner(
            id,
            name,
            sub_category:sub_categories!inner(
              id,
              name,
              category:categories!inner(
                id,
                name,
                customer:tbl_customer!categories_customer_phone_fkey(
                  phone,
                  display_name
                )
              )
            )
          ),
          updater:tbl_team_member!daily_updates_updated_by_fkey(
            id,
            name
          )
        `)
        .eq('update_date', selectedDate)
        .order('created_at', { ascending: false });

      if (selectedServicer) {
        query = query.eq('updated_by', selectedServicer);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      setUpdates(data || []);
    } catch (error) {
      console.error('Error fetching updates:', error);
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Complete':
        return 'text-green-600 bg-green-50';
      case 'In Progress':
        return 'text-blue-600 bg-blue-50';
      case 'Waiting on Info':
      case 'Waiting on Partner':
        return 'text-yellow-600 bg-yellow-50';
      case 'N/A':
        return 'text-gray-600 bg-gray-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const groupUpdatesByServicer = () => {
    const grouped: Record<string, DailyUpdateWithDetails[]> = {};
    
    updates.forEach(update => {
      const servicerName = update.updater?.name || 'System';
      if (!grouped[servicerName]) {
        grouped[servicerName] = [];
      }
      grouped[servicerName].push(update);
    });

    return grouped;
  };

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const groupedUpdates = groupUpdatesByServicer();

  return (
    <div className="space-y-6">
      {isSupabaseConfigured && <SupabaseStatus />}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Updates</h1>
          <p className="text-gray-600">Track all task status changes and communications</p>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Servicer</label>
            <select
              value={selectedServicer}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedServicer(value);
                if (value) {
                  localStorage.setItem('selectedServicer', value);
                } else {
                  localStorage.removeItem('selectedServicer');
                }
              }}
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
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Updates</p>
              <p className="text-2xl font-bold text-gray-900">{updates.length}</p>
            </div>
            <Clock className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Tasks</p>
              <p className="text-2xl font-bold text-green-600">
                {updates.filter(u => u.new_status === 'Complete').length}
              </p>
            </div>
            <Calendar className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Communications</p>
              <p className="text-2xl font-bold text-blue-600">
                {updates.filter(u => u.communicated).length}
              </p>
            </div>
            <MessageCircle className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Servicers</p>
              <p className="text-2xl font-bold text-purple-600">
                {Object.keys(groupedUpdates).length}
              </p>
            </div>
            <User className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Updates List by Servicer */}
      <div className="space-y-6">
        {Object.keys(groupedUpdates).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No updates found</h3>
            <p className="mt-1 text-sm text-gray-500">
              No task updates for {new Date(selectedDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          Object.entries(groupedUpdates).map(([servicerName, servicerUpdates]) => (
            <div key={servicerName} className="bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <h3 className="text-lg font-medium text-gray-900">{servicerName}</h3>
                    <span className="ml-3 text-sm text-gray-500">
                      {servicerUpdates.length} updates
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="divide-y">
                {servicerUpdates.map((update) => (
                  <div key={update.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="font-medium text-gray-900">
                            {update.task?.sub_category?.category?.customer?.display_name || 'Unknown Customer'}
                          </span>
                          <span className="text-gray-400">→</span>
                          <span className="text-sm text-gray-600">
                            {update.task?.name || 'Unknown Task'}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2 text-sm">
                          {update.previous_status && (
                            <>
                              <span className={`px-2 py-1 rounded ${getStatusColor(update.previous_status)}`}>
                                {update.previous_status}
                              </span>
                              <ArrowRight className="h-4 w-4 text-gray-400" />
                            </>
                          )}
                          <span className={`px-2 py-1 rounded font-medium ${getStatusColor(update.new_status)}`}>
                            {update.new_status}
                          </span>
                        </div>
                        
                        {update.new_notes && update.new_notes !== update.previous_notes && (
                          <p className="mt-2 text-sm text-gray-600">
                            Note: {update.new_notes}
                          </p>
                        )}
                        
                        {update.communicated && (
                          <div className="mt-2 flex items-center text-sm text-green-600">
                            <MessageCircle className="h-4 w-4 mr-1" />
                            Communicated via {update.communication_method || 'unknown method'}
                            {update.communication_method === 'WhatsApp' && 
                             (['Complete', 'Waiting on Info', 'Sent Info', 'Call Arranged'].includes(update.new_status)) && 
                             <span className="ml-1 text-xs text-blue-600">(Auto)</span>
                            }
                          </div>
                        )}
                      </div>
                      
                      <div className="text-right">
                        <TimeIndicator lastUpdate={update.created_at} className="text-xs" />
                        <p className="text-xs text-gray-500 mt-1">
                          {update.task?.sub_category?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}