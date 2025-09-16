import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, FolderOpen, Clock, AlertCircle, Settings } from 'lucide-react';
import { supabase, isSupabaseConfigured, Customer, Category, PREDEFINED_CATEGORIES, SUB_CATEGORIES, PREDEFINED_TASKS_BY_SUB_CATEGORY } from '../lib/supabase';
import taskService from '../services/taskService';
import Breadcrumb from '../components/Breadcrumb';
import TimeIndicator from '../components/TimeIndicator';
import StatusBadge from '../components/StatusBadge';
import SupabaseStatus from '../components/SupabaseStatus';
import { mockCustomers, mockCategories } from '../lib/mockData';

interface CategoryWithStats extends Category {
  task_count: number;
  overdue_count: number;
}

export default function CustomerDetail() {
  const { customerId: customerPhone } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [selectedCategoryForSub, setSelectedCategoryForSub] = useState<string>('');
  const [selectedSubCategoryForTask, setSelectedSubCategoryForTask] = useState<string>('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskStartDate, setNewTaskStartDate] = useState('');
  const [subCategories, setSubCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (customerPhone && isSupabaseConfigured && supabase) {
      fetchCustomerAndCategories();
    } else {
      // Use mock data when Supabase is not configured
      const mockCustomer = mockCustomers.find(c => c.phone === customerPhone);
      if (mockCustomer) {
        setCustomer({
          ...mockCustomer,
          phone: mockCustomer.phone,
          display_name: mockCustomer.name || mockCustomer.display_name
        });
        const customerCategories = mockCategories.filter(c => c.customer_phone === customerPhone);
        setCategories(customerCategories as CategoryWithStats[]);
      }
      setLoading(false);
    }
  }, [customerPhone]);

  const fetchCustomerAndCategories = async () => {
    if (!supabase) return;
    
    try {
      // Fetch customer
      const { data: customerData, error: customerError } = await supabase
        .from('tbl_customer')
        .select('*')
        .eq('phone', customerPhone)
        .single();

      if (customerError) throw customerError;
      setCustomer(customerData);

      // Fetch categories with task counts
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          *,
          sub_categories!inner (
            id,
            name,
            tasks!inner (id, last_updated)
          )
        `)
        .eq('customer_phone', customerPhone)
        .order('name');

      if (categoriesError) throw categoriesError;

      if (categoriesData) {
        const categoriesWithStats = categoriesData.map(category => {
          const allTasks = category.sub_categories?.flatMap(sc => sc.tasks || []) || [];
          
          // Use task service to get accurate stats
          const now = new Date();
          const staleThreshold = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
          const overdueTasks = allTasks.filter(task =>
            !task.last_updated || new Date(task.last_updated) < staleThreshold
          );

          return {
            ...category,
            task_count: allTasks.length,
            overdue_count: overdueTasks.length
          };
        });

        setCategories(categoriesWithStats);
        
        // Flatten sub-categories for task creation
        const allSubCategories = categoriesData.flatMap(cat => 
          cat.sub_categories?.map(sub => ({
            ...sub,
            category_name: cat.name
          })) || []
        );
        setSubCategories(allSubCategories);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim() || !customerPhone || !supabase) return;

    try {
      const { error } = await supabase
        .from('categories')
        .insert({
          customer_phone: customerPhone,
          name: newCategoryName.trim(),
          start_time: new Date().toISOString(),
          status: 'Not Started'
        });

      if (error) throw error;

      setNewCategoryName('');
      setShowAddCategory(false);
      fetchCustomerAndCategories();
    } catch (error) {
      console.error('Error adding category:', error);
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCategoryName.trim() || !selectedCategoryForSub || !supabase) return;

    try {
      // Insert sub-category
      const { data: subCategoryData, error: subCategoryError } = await supabase
        .from('sub_categories')
        .insert({
          category_id: selectedCategoryForSub,
          name: newSubCategoryName.trim(),
          start_time: new Date().toISOString(),
          status: 'Not Started'
        })
        .select()
        .single();

      if (subCategoryError) throw subCategoryError;

      // Create predefined tasks for this sub-category
      const predefinedTasks = PREDEFINED_TASKS_BY_SUB_CATEGORY[newSubCategoryName.trim()];
      if (predefinedTasks && predefinedTasks.length > 0) {
        const tasksToInsert = predefinedTasks.map(taskName => ({
          sub_category_id: subCategoryData.id,
          name: taskName,
          status: 'Not Started',
          notes: '',
          start_date: new Date().toISOString(),
          communicated: false
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      setNewSubCategoryName('');
      setSelectedCategoryForSub('');
      setShowAddSubCategory(false);
      fetchCustomerAndCategories();
    } catch (error) {
      console.error('Error adding sub-category:', error);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim() || !selectedSubCategoryForTask || !supabase) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .insert({
          sub_category_id: selectedSubCategoryForTask,
          name: newTaskName.trim(),
          status: 'Not Started',
          notes: '',
          start_date: newTaskStartDate ? new Date(newTaskStartDate).toISOString() : new Date().toISOString(),
          communicated: false
        });

      if (error) throw error;

      setNewTaskName('');
      setNewTaskStartDate('');
      setSelectedSubCategoryForTask('');
      setShowAddTask(false);
      fetchCustomerAndCategories();
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Customer not found</p>
        <Link to="/customers" className="text-blue-600 hover:text-blue-500">
          Back to customers
        </Link>
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
              <strong>Demo Mode:</strong> You're viewing sample customer data. 
              Connect to Supabase to manage real customer categories and tasks.
            </p>
          </div>
        </div>
      )}
      
      {isSupabaseConfigured && <SupabaseStatus />}
      
      <Breadcrumb
        items={[
          { name: 'Customers', href: '/customers' },
          { name: customer.display_name || customer.name }
        ]}
      />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center mb-2">
            <Link
              to="/customers"
              className="mr-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">{customer.display_name || customer.name}</h1>
          </div>
          <p className="text-gray-600">{customer.email}</p>
          {customer.phone && (
            <p className="text-gray-600">{customer.phone}</p>
          )}
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </button>
          {isSupabaseConfigured && (
            <>
              <button
                onClick={() => setShowAddSubCategory(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Add Sub-Category
              </button>
              <button
                onClick={() => setShowAddTask(true)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Category</h3>
            <form onSubmit={handleAddCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category Name
                </label>
                <select
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
                  required
                >
                  <option value="">Select a category...</option>
                  {PREDEFINED_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Or enter custom category name..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddCategory(false);
                    setNewCategoryName('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Sub-Category Modal */}
      {showAddSubCategory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Sub-Category</h3>
            <form onSubmit={handleAddSubCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parent Category
                </label>
                <select
                  value={selectedCategoryForSub}
                  onChange={(e) => setSelectedCategoryForSub(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category...</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Category Name
                </label>
                <select
                  value={newSubCategoryName}
                  onChange={(e) => setNewSubCategoryName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 mb-2"
                >
                  <option value="">Select a sub-category...</option>
                  {selectedCategoryForSub && categories.find(c => c.id === selectedCategoryForSub) && 
                    SUB_CATEGORIES[categories.find(c => c.id === selectedCategoryForSub)!.name]?.map(subCat => (
                      <option key={subCat} value={subCat}>{subCat}</option>
                    ))
                  }
                </select>
                <input
                  type="text"
                  value={newSubCategoryName}
                  onChange={(e) => setNewSubCategoryName(e.target.value)}
                  placeholder="Or enter custom sub-category name..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubCategory(false);
                    setNewSubCategoryName('');
                    setSelectedCategoryForSub('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Add Sub-Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Task</h3>
            <form onSubmit={handleAddTask}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sub-Category
                </label>
                <select
                  value={selectedSubCategoryForTask}
                  onChange={(e) => setSelectedSubCategoryForTask(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a sub-category...</option>
                  {subCategories.map(subCat => (
                    <option key={subCat.id} value={subCat.id}>
                      {subCat.category_name} → {subCat.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Task Name
                </label>
                <input
                  type="text"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  placeholder="Enter task name..."
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Start Date (Optional)
                </label>
                <input
                  type="datetime-local"
                  value={newTaskStartDate}
                  onChange={(e) => setNewTaskStartDate(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to start now</p>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTask(false);
                    setNewTaskName('');
                    setNewTaskStartDate('');
                    setSelectedSubCategoryForTask('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Categories Grid */}
      {categories.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border">
          <FolderOpen className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No categories yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by adding a category for this customer.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((category) => (
            <Link
              key={category.id}
              to={`/customers/${customerPhone}/categories/${category.id}`}
              className="block bg-white overflow-hidden shadow-sm rounded-lg border hover:shadow-md transition-shadow group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {category.name}
                  </h3>
                  <StatusBadge status={category.status || 'Not Started'} />
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-900">{category.task_count}</div>
                    <div className="text-xs text-gray-500">Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-xl font-bold ${category.overdue_count > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {category.overdue_count}
                    </div>
                    <div className="text-xs text-gray-500">Overdue</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <TimeIndicator 
                    startTime={category.start_time}
                    lastUpdate={category.last_update}
                    showStartTime={true}
                    className="text-xs"
                  />
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}