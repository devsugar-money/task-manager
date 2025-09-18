import React, { useState, useEffect } from 'react';
import { FileText, Users, AlertTriangle, TrendingUp, Phone, Clock, CheckCircle, XCircle, ChevronDown, ChevronUp, User, ArrowRight } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import SupabaseStatus from '../components/SupabaseStatus';

interface TaskUpdate {
  task_id: string;
  task_name: string;
  customer_name: string;
  customer_phone: string;
  previous_status?: string;
  new_status: string;
  time: string;
  communicated: boolean;
  communication_method?: string;
  comment?: string;
}

interface ServicerReport {
  servicer_id: string;
  servicer_name: string;
  tasks_updated: number;
  tasks_completed: number;
  tasks_in_progress: number;
  customers_contacted: Set<string>;
  customers_not_contacted: Array<{
    phone: string;
    name: string;
    days_since_contact: number;
    last_contact_date?: string;
    last_contact_method?: string;
  }>;
  task_updates: TaskUpdate[];
  remaining_tasks: Array<{
    task_name: string;
    customer_name: string;
    status: string;
    days_since_update: number;
  }>;
}

interface CustomerCommunication {
  customer_phone: string;
  customer_name: string;
  last_contact_at?: string;
  last_contact_method?: string;
  has_active_tasks: boolean;
  assigned_to?: string;
  servicer_name?: string;
}

export default function Reports() {
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [servicerReports, setServicerReports] = useState<ServicerReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailed, setShowDetailed] = useState(false);
  const [expandedServicer, setExpandedServicer] = useState<string | null>(null);
  const [allCustomers, setAllCustomers] = useState<any[]>([]);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      generateReport();
    } else {
      setLoading(false);
    }
  }, [reportDate]);

  const generateReport = async () => {
    if (!supabase) return;

    setLoading(true);
    try {
      // Fetch all updates for the selected date
      const { data: updates, error: updatesError } = await supabase
        .from('daily_updates')
        .select(`
          *,
          task:tasks!inner(
            id,
            name,
            sub_category:sub_categories!inner(
              category:categories!inner(
                customer_phone,
                customer:tbl_customer!categories_customer_phone_fkey(
                  phone,
                  display_name,
                  assigned_to,
                  last_contact_at,
                  last_contact_method
                )
              )
            )
          ),
          updater:tbl_team_member!daily_updates_updated_by_fkey(
            id,
            name
          )
        `)
        .eq('update_date', reportDate);

      if (updatesError) throw updatesError;

      // Fetch all customers with active tasks
      const { data: customers, error: customersError } = await supabase
        .from('tbl_customer')
        .select(`
          phone,
          display_name,
          assigned_to,
          last_contact_at,
          last_contact_method,
          servicer:tbl_team_member!tbl_customer_assigned_to_fkey(
            id,
            name
          ),
          categories!categories_customer_phone_fkey(
            sub_categories!sub_categories_category_id_fkey(
              tasks!tasks_sub_category_id_fkey(
                id,
                status
              )
            )
          )
        `);

      if (customersError) throw customersError;

      // Process data by servicer
      const reports: Map<string, ServicerReport> = new Map();
      
      // Initialize reports for all servicers who have customers
      const servicersSet = new Set<string>();
      customers?.forEach((customer: any) => {
        if (customer.assigned_to && customer.servicer) {
          servicersSet.add(JSON.stringify({
            id: customer.assigned_to,
            name: customer.servicer.name
          }));
        }
      });

      servicersSet.forEach(servicerStr => {
        const servicer = JSON.parse(servicerStr);
        reports.set(servicer.id, {
          servicer_id: servicer.id,
          servicer_name: servicer.name,
          tasks_updated: 0,
          tasks_completed: 0,
          tasks_in_progress: 0,
          customers_contacted: new Set(),
          customers_not_contacted: [],
          task_updates: [],
          remaining_tasks: []
        });
      });

      // Process updates
      updates?.forEach((update: any) => {
        // Use the updated_by field if present, otherwise try to get from task's customer
        const servicerId = update.updated_by || update.task?.sub_category?.category?.customer?.assigned_to;
        if (!servicerId) return;

        let report = reports.get(servicerId);
        if (!report) {
          // Try to find the servicer name
          const servicerInfo = [...servicersSet].find(s => {
            const parsed = JSON.parse(s);
            return parsed.id === servicerId;
          });
          const servicerName = servicerInfo ? JSON.parse(servicerInfo).name : update.updater?.name || 'Unknown';
          
          report = {
            servicer_id: servicerId,
            servicer_name: servicerName,
            tasks_updated: 0,
            tasks_completed: 0,
            tasks_in_progress: 0,
            customers_contacted: new Set(),
            customers_not_contacted: [],
            task_updates: [],
            remaining_tasks: []
          };
          reports.set(servicerId, report);
        }

        if (report) {
          report.tasks_updated++;
          
          if (update.new_status === 'Complete') {
            report.tasks_completed++;
          } else if (update.new_status === 'In Progress') {
            report.tasks_in_progress++;
          }

          if (update.communicated && update.task?.sub_category?.category?.customer_phone) {
            report.customers_contacted.add(update.task.sub_category.category.customer_phone);
          }

          // Add task update detail
          report.task_updates.push({
            task_id: update.task_id,
            task_name: update.task?.name || 'Unknown Task',
            customer_name: update.task?.sub_category?.category?.customer?.display_name || 'Unknown',
            customer_phone: update.task?.sub_category?.category?.customer_phone || '',
            previous_status: update.previous_status,
            new_status: update.new_status,
            time: new Date(update.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
            communicated: update.communicated,
            communication_method: update.communication_method,
            comment: update.comment
          });
        }
      });

      // Process customers to find who wasn't contacted
      customers?.forEach((customer: any) => {
        if (!customer.assigned_to) return;

        const report = reports.get(customer.assigned_to);
        if (!report) return;

        // Check if customer has active tasks (not Complete or N/A)
        let hasActiveTasks = false;
        customer.categories?.forEach((category: any) => {
          category.sub_categories?.forEach((subCat: any) => {
            subCat.tasks?.forEach((task: any) => {
              if (task.status !== 'Complete' && task.status !== 'N/A') {
                hasActiveTasks = true;
              }
            });
          });
        });

        if (hasActiveTasks && !report.customers_contacted.has(customer.phone)) {
          const daysSinceContact = customer.last_contact_at 
            ? Math.floor((new Date().getTime() - new Date(customer.last_contact_at).getTime()) / (1000 * 60 * 60 * 24))
            : 999;

          report.customers_not_contacted.push({
            phone: customer.phone,
            name: customer.display_name,
            days_since_contact: daysSinceContact,
            last_contact_date: customer.last_contact_at,
            last_contact_method: customer.last_contact_method
          });
        }
      });

      // Sort customers not contacted by days since contact
      reports.forEach(report => {
        report.customers_not_contacted.sort((a, b) => b.days_since_contact - a.days_since_contact);
        report.task_updates.sort((a, b) => b.time.localeCompare(a.time));
      });

      // Save customers for reference
      setAllCustomers(customers || []);

      // Fetch all remaining tasks and filter by servicer
      const { data: allRemainingTasks } = await supabase
        .from('tasks')
        .select(`
          id,
          name,
          status,
          last_updated,
          sub_category:sub_categories!inner(
            category:categories!inner(
              customer:tbl_customer!categories_customer_phone_fkey(
                display_name,
                assigned_to
              )
            )
          )
        `)
        .not('status', 'in', '("Complete","N/A")');

      // Group remaining tasks by servicer
      if (allRemainingTasks) {
        allRemainingTasks.forEach((task: any) => {
          const servicerId = task.sub_category?.category?.customer?.assigned_to;
          if (servicerId && reports.has(servicerId)) {
            const report = reports.get(servicerId)!;
            report.remaining_tasks.push({
              task_name: task.name,
              customer_name: task.sub_category?.category?.customer?.display_name || 'Unknown',
              status: task.status,
              days_since_update: task.last_updated 
                ? Math.floor((new Date().getTime() - new Date(task.last_updated).getTime()) / (1000 * 60 * 60 * 24))
                : 999
            });
          }
        });

        // Sort remaining tasks
        reports.forEach(report => {
          report.remaining_tasks.sort((a, b) => b.days_since_update - a.days_since_update);
        });
      }

      setServicerReports(Array.from(reports.values()));
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysColor = (days: number) => {
    if (days === 999) return 'text-red-600 font-bold';
    if (days > 7) return 'text-red-600';
    if (days > 3) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const totalUpdates = servicerReports.reduce((sum, r) => sum + r.tasks_updated, 0);
  const totalCompleted = servicerReports.reduce((sum, r) => sum + r.tasks_completed, 0);
  const totalCustomersContacted = servicerReports.reduce((sum, r) => sum + r.customers_contacted.size, 0);
  const totalCustomersNotContacted = servicerReports.reduce((sum, r) => sum + r.customers_not_contacted.length, 0);

  return (
    <div className="space-y-6">
      {isSupabaseConfigured && <SupabaseStatus />}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Daily Reports</h1>
          <p className="text-gray-600">Servicer performance and communication tracking</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
          <div className="flex items-center mt-6">
            <input
              type="checkbox"
              id="detailed"
              checked={showDetailed}
              onChange={(e) => setShowDetailed(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="detailed" className="ml-2 text-sm text-gray-700">
              Show detailed view
            </label>
          </div>
        </div>
      </div>

      {/* Overall Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Updates</p>
              <p className="text-2xl font-bold text-gray-900">{totalUpdates}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Tasks Completed</p>
              <p className="text-2xl font-bold text-green-600">{totalCompleted}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Customers Contacted</p>
              <p className="text-2xl font-bold text-blue-600">{totalCustomersContacted}</p>
            </div>
            <Phone className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Need Contact</p>
              <p className="text-2xl font-bold text-red-600">{totalCustomersNotContacted}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Servicer Reports */}
      <div className="space-y-6">
        {servicerReports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No activity</h3>
            <p className="mt-1 text-sm text-gray-500">
              No updates recorded for {new Date(reportDate).toLocaleDateString()}
            </p>
          </div>
        ) : (
          servicerReports.map((report) => (
            <div key={report.servicer_id} className="bg-white rounded-lg border shadow-sm">
              <div className="px-6 py-4 border-b bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <button
                      onClick={() => setExpandedServicer(expandedServicer === report.servicer_id ? null : report.servicer_id)}
                      className="flex items-center hover:bg-gray-100 rounded px-2 py-1 transition-colors"
                    >
                      {expandedServicer === report.servicer_id ? <ChevronUp className="h-5 w-5 text-gray-400 mr-1" /> : <ChevronDown className="h-5 w-5 text-gray-400 mr-1" />}
                      <Users className="h-5 w-5 text-gray-400 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">{report.servicer_name}</h3>
                    </button>
                  </div>
                  <div className="flex items-center space-x-6 text-sm">
                    <div className="flex items-center">
                      <span className="text-gray-500">Updates:</span>
                      <span className="ml-1 font-medium">{report.tasks_updated}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">Completed:</span>
                      <span className="ml-1 font-medium text-green-600">{report.tasks_completed}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">Contacted:</span>
                      <span className="ml-1 font-medium text-blue-600">{report.customers_contacted.size}</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-gray-500">Remaining:</span>
                      <span className="ml-1 font-medium text-orange-600">{report.remaining_tasks.length}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Communication Status */}
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Customers Contacted */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                      Customers Contacted ({report.customers_contacted.size})
                    </h4>
                    {showDetailed && report.customers_contacted.size > 0 ? (
                      <ul className="space-y-1">
                        {Array.from(report.customers_contacted).map(phone => (
                          <li key={phone} className="text-sm text-gray-600">
                            • Customer {phone}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {report.customers_contacted.size > 0 
                          ? `${report.customers_contacted.size} customers were contacted today`
                          : 'No customers contacted today'}
                      </p>
                    )}
                  </div>
                  
                  {/* Customers Not Contacted */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <XCircle className="h-4 w-4 text-red-500 mr-2" />
                      Need Contact ({report.customers_not_contacted.length})
                    </h4>
                    {report.customers_not_contacted.length > 0 ? (
                      <ul className="space-y-2">
                        {report.customers_not_contacted.slice(0, showDetailed ? undefined : 3).map(customer => (
                          <li key={customer.phone} className="text-sm">
                            <div className="flex items-center justify-between">
                              <span className="text-gray-900 font-medium">{customer.name}</span>
                              <span className={`text-xs ${getDaysColor(customer.days_since_contact)}`}>
                                {customer.days_since_contact === 999 
                                  ? 'Never contacted' 
                                  : `${customer.days_since_contact} days ago`}
                              </span>
                            </div>
                            {customer.last_contact_method && (
                              <span className="text-xs text-gray-500">
                                Last: {customer.last_contact_method}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">
                        All active customers have been contacted
                      </p>
                    )}
                    {!showDetailed && report.customers_not_contacted.length > 3 && (
                      <p className="text-xs text-gray-500 mt-2">
                        +{report.customers_not_contacted.length - 3} more...
                      </p>
                    )}
                  </div>
                </div>
                
                {/* Priority Alert */}
                {report.customers_not_contacted.filter(c => c.days_since_contact > 7).length > 0 && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                    <div className="flex items-center">
                      <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                      <p className="text-sm text-red-800">
                        <strong>Priority:</strong> {report.customers_not_contacted.filter(c => c.days_since_contact > 7).length} customers 
                        haven't been contacted in over a week
                      </p>
                    </div>
                  </div>
                )}

                {/* Expanded Details */}
                {expandedServicer === report.servicer_id && (
                  <div className="mt-6 space-y-6 border-t pt-6">
                    {/* Task Updates Detail */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Today's Task Updates</h4>
                      {report.task_updates.length > 0 ? (
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {report.task_updates.map((update, idx) => (
                            <div key={idx} className="bg-gray-50 rounded p-3 text-sm">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2 mb-1">
                                    <span className="font-medium text-gray-900">{update.customer_name}</span>
                                    <ArrowRight className="h-3 w-3 text-gray-400" />
                                    <span className="text-gray-600">{update.task_name}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {update.previous_status && (
                                      <>
                                        <span className="px-2 py-0.5 bg-white rounded text-xs">{update.previous_status}</span>
                                        <ArrowRight className="h-3 w-3 text-gray-400" />
                                      </>
                                    )}
                                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                      update.new_status === 'Complete' ? 'bg-green-100 text-green-800' :
                                      update.new_status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>{update.new_status}</span>
                                    {update.communicated && (
                                      <span className="text-xs text-green-600 flex items-center">
                                        <Phone className="h-3 w-3 mr-1" />
                                        {update.communication_method}
                                      </span>
                                    )}
                                  </div>
                                  {update.comment && (
                                    <p className="text-xs text-gray-500 mt-1 italic">Note: {update.comment}</p>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{update.time}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No task updates today</p>
                      )}
                    </div>

                    {/* Remaining Tasks */}
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Remaining Active Tasks ({report.remaining_tasks.length})</h4>
                      {report.remaining_tasks.length > 0 ? (
                        <div className="space-y-1 max-h-48 overflow-y-auto">
                          {report.remaining_tasks.map((task, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm p-2 hover:bg-gray-50 rounded">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium text-gray-900">{task.customer_name}</span>
                                <ArrowRight className="h-3 w-3 text-gray-400" />
                                <span className="text-gray-600">{task.task_name}</span>
                              </div>
                              <div className="flex items-center space-x-3">
                                <span className={`px-2 py-0.5 rounded text-xs ${
                                  task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                  task.status.includes('Waiting') ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>{task.status}</span>
                                <span className={`text-xs ${
                                  task.days_since_update > 7 ? 'text-red-600 font-bold' :
                                  task.days_since_update > 3 ? 'text-yellow-600' :
                                  'text-gray-500'
                                }`}>
                                  {task.days_since_update === 999 ? 'Never updated' : `${task.days_since_update}d ago`}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No active tasks</p>
                      )}
                    </div>

                    {/* Communication Details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Customers Contacted Today</h4>
                        {report.customers_contacted.size > 0 ? (
                          <ul className="space-y-1">
                            {Array.from(report.customers_contacted).map(phone => {
                              const customer = allCustomers.find((c: any) => c.phone === phone);
                              return (
                                <li key={phone} className="text-sm text-gray-600 flex items-center">
                                  <CheckCircle className="h-3 w-3 text-green-500 mr-2" />
                                  {customer?.display_name || phone}
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">No customers contacted</p>
                        )}
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Customers Needing Contact</h4>
                        {report.customers_not_contacted.length > 0 ? (
                          <ul className="space-y-1 max-h-48 overflow-y-auto">
                            {report.customers_not_contacted.map(customer => (
                              <li key={customer.phone} className="text-sm flex items-center justify-between">
                                <span className="text-gray-900">{customer.name}</span>
                                <span className={`text-xs ${getDaysColor(customer.days_since_contact)}`}>
                                  {customer.days_since_contact === 999 ? 'Never' : `${customer.days_since_contact}d`}
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-gray-500">All customers contacted</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}