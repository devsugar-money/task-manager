import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Clock, Users, User, DollarSign } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import taskService from '../services/taskService';
import TimeIndicator from '../components/TimeIndicator';
import StatusBadge from '../components/StatusBadge';
import SupabaseStatus from '../components/SupabaseStatus';
import { mockStats, mockRecentUpdates, mockUrgentTasks } from '../lib/mockData';

interface DashboardStats {
  totalTasks: number;
  tasksNeedingUpdate: number;
  overdueTasks: number;
  customersWithStaleTasks: number;
}

interface RecentUpdate {
  id: string;
  customer_name: string;
  category_name: string;
  task_name: string;
  status: string;
  updated_at: string;
}

interface ServicerAnalytics {
  servicerId: string;
  servicerName: string;
  totalSavings: number;
  totalCustomers: number;
  completedTasks: number;
  activeTasks: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: mockStats.totalTasks,
    tasksNeedingUpdate: mockStats.tasksNeedingUpdate,
    overdueTasks: mockStats.overdueTasks,
    customersWithStaleTasks: mockStats.customersWithStaleTasks
  });
  const [recentUpdates, setRecentUpdates] = useState<RecentUpdate[]>(mockRecentUpdates);
  const [urgentTasks, setUrgentTasks] = useState<Task[]>(mockUrgentTasks);
  const [loading, setLoading] = useState(true);
  const [selectedServicer, setSelectedServicer] = useState<string>('');
  const [servicers, setServicers] = useState<Array<{id: string, name: string}>>([]);
  const [servicerAnalytics, setServicerAnalytics] = useState<ServicerAnalytics[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchServicers();
      fetchDashboardData();
    } else {
      setLoading(false);
      // Use mock data when Supabase is not configured
      setStats(mockStats);
      setRecentUpdates(mockRecentUpdates);
      setUrgentTasks(mockUrgentTasks);
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

  const fetchDashboardData = async () => {
    
    try {
      // Get dashboard stats using the task service
      const dashboardStats = await taskService.getDashboardStats(selectedServicer);
      setStats(dashboardStats);

      // Get urgent tasks (stale for 2+ days)
      const urgentTasksData = await taskService.fetchStaleTasks(2, selectedServicer);
      setUrgentTasks(urgentTasksData.slice(0, 10));
      
      // Calculate servicer analytics
      if (!selectedServicer && supabase) {
        const analytics: ServicerAnalytics[] = [];
        
        for (const servicer of servicers) {
          // Get all customers assigned to this servicer
          const { data: customers } = await supabase
            .from('tbl_customer')
            .select('phone')
            .eq('assigned_to', servicer.id);
          
          const customerPhones = customers?.map(c => c.phone) || [];
          
          // Get savings from subcategories for these customers
          const { data: subcategories } = await supabase
            .from('sub_categories')
            .select(`
              money_saved,
              category:categories!inner(customer_phone)
            `)
            .in('category.customer_phone', customerPhones);
          
          const totalSavings = subcategories?.reduce((sum, sub) => sum + (sub.money_saved || 0), 0) || 0;
          
          // Get task counts
          const { data: tasks } = await supabase
            .from('tasks')
            .select(`
              status,
              sub_category:sub_categories!inner(
                category:categories!inner(customer_phone)
              )
            `)
            .in('sub_category.category.customer_phone', customerPhones);
          
          const completedTasks = tasks?.filter(t => t.status === 'Complete').length || 0;
          const activeTasks = tasks?.filter(t => t.status !== 'Complete' && t.status !== 'N/A').length || 0;
          
          analytics.push({
            servicerId: servicer.id,
            servicerName: servicer.name,
            totalSavings,
            totalCustomers: customerPhones.length,
            completedTasks,
            activeTasks
          });
        }
        
        setServicerAnalytics(analytics);
      }

      // Get recent updates
      const recentUpdatesData = await taskService.getRecentUpdates(10, selectedServicer);
      setRecentUpdates(recentUpdatesData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
            <p className="text-sm text-yellow-800">
              <strong>Demo Mode:</strong> You're viewing the interface with sample data. 
              Connect to Supabase to manage real tasks and customers.
            </p>
          </div>
        </div>
      )}
      
      {isSupabaseConfigured && <SupabaseStatus />}
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Overview of your task management system
          </p>
        </div>
        {isSupabaseConfigured && servicers.length > 0 && (
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-400" />
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
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.totalTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-6 w-6 text-yellow-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Need Update Today</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.tasksNeedingUpdate}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Overdue Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.overdueTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-orange-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Customers w/ Stale Tasks</dt>
                  <dd className="text-lg font-medium text-gray-900">{stats.customersWithStaleTasks}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Servicer Analytics */}
      {isSupabaseConfigured && servicerAnalytics.length > 0 && (
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4 flex items-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              Servicer Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {servicerAnalytics.map((servicer) => (
                <div key={servicer.servicerId} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">{servicer.servicerName}</h4>
                    <User className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Total Savings:</span>
                      <span className="text-sm font-bold text-green-600">
                        ${servicer.totalSavings.toFixed(2)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Customers:</span>
                      <span className="text-sm font-medium text-gray-900">{servicer.totalCustomers}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Completed:</span>
                      <span className="text-sm font-medium text-green-600">{servicer.completedTasks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Active:</span>
                      <span className="text-sm font-medium text-blue-600">{servicer.activeTasks}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Tasks */}
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Urgent Tasks Requiring Attention
            </h3>
            {urgentTasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No urgent tasks!</p>
            ) : (
              <div className="space-y-3">
                {urgentTasks.map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {task.sub_category?.category?.customer?.display_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {task.sub_category?.category?.name} → {task.sub_category?.name} → {task.name}
                      </p>
                      <TimeIndicator lastUpdate={task.last_updated} className="mt-1" />
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <StatusBadge status={task.status} customStatus={task.custom_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Updates */}
        <div className="bg-white shadow-sm rounded-lg border">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              Recent Updates (Last 24 Hours)
            </h3>
            {recentUpdates.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No recent updates</p>
            ) : (
              <div className="space-y-3">
                {recentUpdates.map((update) => (
                  <div key={update.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {update.customer_name}
                      </p>
                      <p className="text-sm text-gray-500 truncate">
                        {update.category_name} → {update.task_name}
                      </p>
                      <TimeIndicator lastUpdate={update.updated_at} className="mt-1" />
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      <StatusBadge status={update.status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg border">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              to="/customers"
              className="flex items-center p-4 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors group"
            >
              <Users className="h-6 w-6 text-blue-600 mr-3" />
              <span className="text-sm font-medium text-blue-900 group-hover:text-blue-700">
                View All Customers
              </span>
            </Link>
            <Link
              to="/updates"
              className="flex items-center p-4 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors group"
            >
              <Clock className="h-6 w-6 text-green-600 mr-3" />
              <span className="text-sm font-medium text-green-900 group-hover:text-green-700">
                Daily Updates
              </span>
            </Link>
            <Link
              to="/reports"
              className="flex items-center p-4 bg-purple-50 rounded-lg border border-purple-200 hover:bg-purple-100 transition-colors group"
            >
              <AlertCircle className="h-6 w-6 text-purple-600 mr-3" />
              <span className="text-sm font-medium text-purple-900 group-hover:text-purple-700">
                View Reports
              </span>
            </Link>
            <button
              onClick={() => {
                if (isSupabaseConfigured) {
                  fetchDashboardData();
                }
              }}
              className="flex items-center p-4 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors group"
            >
              <CheckCircle className="h-6 w-6 text-gray-600 mr-3" />
              <span className="text-sm font-medium text-gray-900 group-hover:text-gray-700">
                Refresh Data
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}