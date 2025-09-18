import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, AlertTriangle, User, Filter, Folder, FolderOpen } from 'lucide-react';
import { supabase, isSupabaseConfigured, TeamMember, PREDEFINED_STATUSES } from '../lib/supabase';
import TimeIndicator from '../components/TimeIndicator';
import SupabaseStatus from '../components/SupabaseStatus';

interface TaskWithDetails {
  id: string;
  name: string;
  status: string;
  last_updated?: string;
  completed_at?: string;
  created_at?: string;
  sub_category_id: string;
  sub_category?: {
    id: string;
    name: string;
    overall_status?: string;
    money_saved?: number;
    category_id: string;
    category?: {
      id: string;
      name: string;
      customer_phone: string;
    };
  };
}

interface CustomerGrouped {
  phone: string;
  display_name: string;
  assigned_to?: string;
  flags?: string[];
  last_contact_method?: string;
  last_contact_at?: string;
  categories: Map<string, {
    id: string;
    name: string;
    subcategories: Map<string, {
      id: string;
      name: string;
      overall_status?: string;
      money_saved?: number;
      tasks: TaskWithDetails[];
    }>;
  }>;
  taskCounts: {
    total: number;
    in_progress: number;
    waiting: number;
    complete: number;
  };
}

export default function ServicerView() {
  const [servicers, setServicers] = useState<TeamMember[]>([]);
  const [selectedServicer, setSelectedServicer] = useState<string>('');
  const [customerData, setCustomerData] = useState<Map<string, CustomerGrouped>>(new Map());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedSubcategories, setExpandedSubcategories] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchAllData();
    } else {
      setLoading(false);
    }
  }, [selectedServicer]);

  const fetchAllData = async () => {
    if (!supabase) return;
    
    setLoading(true);
    try {
      // Fetch team members
      const { data: teamMembers, error: teamError } = await supabase
        .from('tbl_team_member')
        .select('*')
        .order('name');

      if (teamError) {
        console.error('Error fetching team members:', teamError);
        return;
      }
      setServicers(teamMembers || []);

      // Fetch customers
      let customerQuery = supabase
        .from('tbl_customer')
        .select('*');
      
      if (selectedServicer) {
        customerQuery = customerQuery.eq('assigned_to', selectedServicer);
      }

      const { data: customers, error: customerError } = await customerQuery;
      if (customerError) {
        console.error('Error fetching customers:', customerError);
        return;
      }

      // Fetch all tasks with full relationships
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          sub_category:sub_categories!inner(
            id,
            name,
            overall_status,
            money_saved,
            category_id,
            category:categories!inner(
              id,
              name,
              customer_phone
            )
          )
        `)
        .order('last_updated', { ascending: false });

      if (tasksError) {
        console.error('Error fetching tasks:', tasksError);
        return;
      }

      // Group data by customer -> category -> subcategory
      const customerMap = new Map<string, CustomerGrouped>();

      // Initialize customers
      customers?.forEach(customer => {
        customerMap.set(customer.phone, {
          phone: customer.phone,
          display_name: customer.display_name,
          assigned_to: customer.assigned_to,
          flags: customer.flags,
          last_contact_method: customer.last_contact_method,
          last_contact_at: customer.last_contact_at,
          categories: new Map(),
          taskCounts: {
            total: 0,
            in_progress: 0,
            waiting: 0,
            complete: 0
          }
        });
      });

      // Process tasks and build hierarchy
      tasks?.forEach((task: TaskWithDetails) => {
        if (!task.sub_category?.category?.customer_phone) return;

        const customerPhone = task.sub_category.category.customer_phone;
        const customer = customerMap.get(customerPhone);
        
        if (!customer) return;
        
        // Filter by servicer if selected
        if (selectedServicer && customer.assigned_to !== selectedServicer) return;

        // Get or create category
        let category = customer.categories.get(task.sub_category.category.id);
        if (!category) {
          category = {
            id: task.sub_category.category.id,
            name: task.sub_category.category.name,
            subcategories: new Map()
          };
          customer.categories.set(task.sub_category.category.id, category);
        }

        // Get or create subcategory
        let subcategory = category.subcategories.get(task.sub_category.id);
        if (!subcategory) {
          subcategory = {
            id: task.sub_category.id,
            name: task.sub_category.name,
            overall_status: task.sub_category.overall_status,
            money_saved: task.sub_category.money_saved,
            tasks: []
          };
          category.subcategories.set(task.sub_category.id, subcategory);
        }

        // Add task
        subcategory.tasks.push(task);

        // Update counts
        customer.taskCounts.total++;
        if (task.status === 'In Progress') customer.taskCounts.in_progress++;
        if (task.status === 'Waiting on Info' || task.status === 'Waiting on Partner') {
          customer.taskCounts.waiting++;
        }
        if (task.status === 'Complete') customer.taskCounts.complete++;
      });

      // Sort tasks within each subcategory by creation date for stable ordering
      customerMap.forEach(customer => {
        customer.categories.forEach(category => {
          category.subcategories.forEach(subcategory => {
            subcategory.tasks.sort((a, b) => {
              const dateA = new Date(a.created_at || 0).getTime();
              const dateB = new Date(b.created_at || 0).getTime();
              return dateA - dateB; // Oldest first, maintains stable order
            });
          });
        });
      });
      
      setCustomerData(customerMap);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, customerAssignedTo?: string) => {
    if (!supabase) return;

    try {
      // Build update data with proper types
      let updateData: any = { 
        status: newStatus,
        last_updated: new Date().toISOString(),
        updated_by: customerAssignedTo || selectedServicer || null  // Include servicer UUID
      };

      // Only set completed_at when status is Complete
      if (newStatus === 'Complete') {
        updateData.completed_at = new Date().toISOString();
      }

      console.log('Updating task:', taskId, 'with data:', updateData);

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Supabase error:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      console.log('Update successful:', data);

      // Refresh data
      await fetchAllData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const toggleCustomer = (customerPhone: string) => {
    const newExpanded = new Set(expandedCustomers);
    if (newExpanded.has(customerPhone)) {
      newExpanded.delete(customerPhone);
    } else {
      newExpanded.add(customerPhone);
    }
    setExpandedCustomers(newExpanded);
  };

  const toggleCategory = (categoryId: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleSubcategory = (subcategoryId: string) => {
    const newExpanded = new Set(expandedSubcategories);
    if (newExpanded.has(subcategoryId)) {
      newExpanded.delete(subcategoryId);
    } else {
      newExpanded.add(subcategoryId);
    }
    setExpandedSubcategories(newExpanded);
  };

  const getUrgencyColor = (customer: CustomerGrouped) => {
    if (customer.taskCounts.waiting > 0) return 'text-yellow-600';
    if (customer.taskCounts.in_progress > 0) return 'text-blue-600';
    if (customer.taskCounts.total === 0) return 'text-gray-400';
    return 'text-green-600';
  };

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Convert Map to array for rendering
  const customersArray = Array.from(customerData.values())
    .filter(c => c.categories.size > 0) // Only show customers with categories
    .sort((a, b) => a.display_name.localeCompare(b.display_name));

  return (
    <div className="space-y-6">
      {isSupabaseConfigured && <SupabaseStatus />}
      
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
          <p className="text-gray-600">Tasks organized by customer, category, and subcategory</p>
        </div>
        
        {isSupabaseConfigured && (
          <div className="w-64 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedServicer}
              onChange={(e) => setSelectedServicer(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            >
              <option value="">All Servicers</option>
              {servicers.map((servicer) => (
                <option key={servicer.id} value={servicer.id}>
                  {servicer.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="space-y-4">
        {customersArray.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <User className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {selectedServicer 
                ? 'No tasks are assigned to this servicer.'
                : 'No tasks are currently available.'}
            </p>
          </div>
        ) : (
          customersArray.map((customer) => {
            const isCustomerExpanded = expandedCustomers.has(customer.phone);
            const urgencyColor = getUrgencyColor(customer);

            return (
              <div key={customer.phone} className="bg-white rounded-lg border shadow-sm">
                {/* Customer Header */}
                <div
                  className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleCustomer(customer.phone)}
                >
                  <div className="flex items-center flex-1">
                    {isCustomerExpanded ? (
                      <ChevronDown className="h-5 w-5 text-gray-400 mr-3" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-400 mr-3" />
                    )}
                    <User className="h-5 w-5 text-gray-400 mr-2" />
                    <span className={`font-medium text-lg ${urgencyColor}`}>{customer.display_name}</span>
                    {customer.flags && customer.flags.length > 0 && (
                      <div className="ml-3 flex items-center space-x-1">
                        {customer.flags.map((flag, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            {flag}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="ml-4 flex items-center space-x-3 text-sm text-gray-500">
                      <span>{customer.taskCounts.in_progress} in progress</span>
                      <span>{customer.taskCounts.waiting} waiting</span>
                      <span>{customer.taskCounts.complete} complete</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {customer.last_contact_at && (
                      <span className="text-sm text-gray-500">
                        Last {customer.last_contact_method?.toLowerCase() || 'contact'}: {new Date(customer.last_contact_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>

                {/* Categories */}
                {isCustomerExpanded && (
                  <div className="border-t">
                    {Array.from(customer.categories.values()).map((category) => {
                      const isCategoryExpanded = expandedCategories.has(category.id);
                      
                      return (
                        <div key={category.id} className="border-t first:border-t-0">
                          {/* Category Header */}
                          <div
                            className="px-8 py-3 flex items-center cursor-pointer hover:bg-gray-50 bg-gray-50"
                            onClick={() => toggleCategory(category.id)}
                          >
                            {isCategoryExpanded ? (
                              <FolderOpen className="h-4 w-4 text-gray-400 mr-2" />
                            ) : (
                              <Folder className="h-4 w-4 text-gray-400 mr-2" />
                            )}
                            <span className="font-medium text-gray-700">{category.name}</span>
                            <span className="ml-2 text-xs text-gray-500">
                              ({category.subcategories.size} subcategories)
                            </span>
                          </div>

                          {/* Subcategories */}
                          {isCategoryExpanded && (
                            <div className="bg-white">
                              {Array.from(category.subcategories.values()).map((subcategory) => {
                                const isSubcategoryExpanded = expandedSubcategories.has(subcategory.id);
                                
                                return (
                                  <div key={subcategory.id} className="border-t">
                                    {/* Subcategory Header */}
                                    <div
                                      className="px-10 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                                      onClick={() => toggleSubcategory(subcategory.id)}
                                    >
                                      <div className="flex items-center">
                                        {isSubcategoryExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-gray-400 mr-2" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-gray-400 mr-2" />
                                        )}
                                        <span className="text-sm font-medium text-gray-600">{subcategory.name}</span>
                                        <span className="ml-2 text-xs text-gray-500">
                                          ({subcategory.tasks.length} tasks)
                                        </span>
                                        {subcategory.overall_status && (
                                          <span className={`ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                            subcategory.overall_status === 'Optimised' ? 'bg-green-100 text-green-800' :
                                            subcategory.overall_status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                                            subcategory.overall_status === "Can't Optimise" ? 'bg-red-100 text-red-800' :
                                            'bg-gray-100 text-gray-800'
                                          }`}>
                                            {subcategory.overall_status}
                                          </span>
                                        )}
                                        {(subcategory.money_saved || 0) > 0 && (
                                          <span className="ml-2 text-xs font-medium text-green-600">
                                            ${(subcategory.money_saved || 0).toFixed(2)} saved
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Tasks */}
                                    {isSubcategoryExpanded && (
                                      <div className="px-12 py-2 bg-gray-50">
                                        {subcategory.tasks.length === 0 ? (
                                          <p className="text-sm text-gray-500 py-1">No tasks</p>
                                        ) : (
                                          <div className="space-y-1">
                                            {subcategory.tasks.map((task) => (
                                              <div key={task.id} className="flex items-center justify-between py-1.5 bg-white px-3 rounded">
                                                <div className="flex items-center flex-1">
                                                  <select
                                                    value={task.status}
                                                    onChange={(e) => {
                                                      const value = e.target.value;
                                                      if (value === 'Custom...') {
                                                        const customStatus = prompt('Enter custom status:');
                                                        if (customStatus) {
                                                          updateTaskStatus(task.id, customStatus, customer.assigned_to);
                                                        }
                                                      } else {
                                                        updateTaskStatus(task.id, value, customer.assigned_to);
                                                      }
                                                    }}
                                                    className="mr-3 text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                                    onClick={(e) => e.stopPropagation()}
                                                  >
                                                    {PREDEFINED_STATUSES.map(status => (
                                                      <option key={status} value={status}>{status}</option>
                                                    ))}
                                                    {/* Show current custom status if it's not in the predefined list */}
                                                    {task.status && !PREDEFINED_STATUSES.includes(task.status) && (
                                                      <option value={task.status}>{task.status}</option>
                                                    )}
                                                  </select>
                                                  <span className={`text-sm ${task.status === 'Complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                                    {task.name}
                                                  </span>
                                                </div>
                                                {task.last_updated && (
                                                  <TimeIndicator lastUpdate={task.last_updated} className="text-xs" />
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}