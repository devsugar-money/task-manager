import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, ChevronDown, ChevronRight, MessageCircle, CheckCircle, User, DollarSign, FileText, Save, Flag, Trash2 } from 'lucide-react';
import { supabase, isSupabaseConfigured, Customer, SubCategory, Task, SUB_CATEGORIES, PREDEFINED_TASKS_BY_SUB_CATEGORY, PREDEFINED_STATUSES, PREDEFINED_CATEGORIES, CUSTOMER_FLAGS, SUBCATEGORY_STATUSES } from '../lib/supabase';
import Breadcrumb from '../components/Breadcrumb';
import SupabaseStatus from '../components/SupabaseStatus';

interface ExtendedSubCategory extends SubCategory {
  tasks?: ExtendedTask[];
  category_name?: string;
}

interface ExtendedTask extends Task {
  money_saved?: number;
  completed_at?: string;
  started_at?: string;
}

export default function CustomerDetail() {
  const { customerId: customerPhone } = useParams<{ customerId: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subCategories, setSubCategories] = useState<ExtendedSubCategory[]>([]);
  const [expandedSubCategories, setExpandedSubCategories] = useState<Set<string>>(new Set());
  const [showAddSubCategory, setShowAddSubCategory] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [newSubCategoryName, setNewSubCategoryName] = useState('');
  const [loading, setLoading] = useState(true);
  const [communications, setCommunications] = useState<Array<{
    id: string;
    created_at: string;
    new_notes: string;
    communication_method: string;
    task?: {
      name: string;
      sub_category?: {
        name: string;
        category?: {
          name: string;
        };
      };
    };
  }>>([]);
  const [showCommLog, setShowCommLog] = useState(false);
  const [newCommNote, setNewCommNote] = useState('');
  const [newCommMethod, setNewCommMethod] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [customerDescription, setCustomerDescription] = useState('');
  const [customerFlags, setCustomerFlags] = useState<string[]>([]);
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);
  const [totalMoneySaved, setTotalMoneySaved] = useState(0);
  const [statusChangeModal, setStatusChangeModal] = useState<{taskId: string, taskName: string, newStatus: string} | null>(null);
  const [statusChangeComment, setStatusChangeComment] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{
    subCategoryId: string;
    subCategoryName: string;
  } | null>(null);

  useEffect(() => {
    if (customerPhone && isSupabaseConfigured && supabase) {
      fetchCustomerData();
    } else {
      setLoading(false);
    }
  }, [customerPhone]);

  const fetchCustomerData = async () => {
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
      setCustomerNotes(customerData.notes || '');
      setCustomerDescription(customerData.description || '');
      setCustomerFlags(customerData.flags || []);

      // Fetch all categories and subcategories with tasks
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          id,
          name,
          sub_categories (
            *,
            tasks (
              *
            )
          )
        `)
        .eq('customer_phone', customerPhone)
        .order('name');

      if (categoriesError) throw categoriesError;

      // Flatten subcategories and add category name
      const allSubCategories: ExtendedSubCategory[] = [];
      categoriesData?.forEach(category => {
        category.sub_categories?.forEach((subCat: ExtendedSubCategory) => {
          allSubCategories.push({
            ...subCat,
            category_name: category.name
          });
        });
      });

      // Sort by category name then subcategory name
      allSubCategories.sort((a, b) => {
        const categoryCompare = (a.category_name || '').localeCompare(b.category_name || '');
        if (categoryCompare !== 0) return categoryCompare;
        return a.name.localeCompare(b.name);
      });

      setSubCategories(allSubCategories);

      // Calculate total money saved from subcategories
      const total = allSubCategories.reduce((sum, subCat) => {
        return sum + (subCat.money_saved || 0);
      }, 0);
      setTotalMoneySaved(total);

      // Fetch recent communications from daily_updates
      const { data: commsData, error: commsError } = await supabase
        .from('daily_updates')
        .select(`
          *,
          task:tasks(name, sub_category:sub_categories(name, category:categories(name)))
        `)
        .eq('communicated', true)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!commsError && commsData) {
        const customerComms = commsData.filter(comm => 
          comm.task?.sub_category?.category?.customer_phone === customerPhone
        );
        setCommunications(customerComms);
      }
    } catch (error) {
      console.error('Error fetching customer data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSubCategory = (subCategoryId: string) => {
    const newExpanded = new Set(expandedSubCategories);
    if (newExpanded.has(subCategoryId)) {
      newExpanded.delete(subCategoryId);
    } else {
      newExpanded.add(subCategoryId);
    }
    setExpandedSubCategories(newExpanded);
  };

  const updateTaskStatus = async (taskId: string, newStatus: string, comment?: string) => {
    if (!supabase) return;

    try {
      // First get the current task to check if we're starting it
      const { data: currentTask } = await supabase
        .from('tasks')
        .select('status, started_at')
        .eq('id', taskId)
        .single();

      // Build update data - don't send completed_at unless needed
      let updateData: any = { 
        status: newStatus,
        last_updated: new Date().toISOString(),
        updated_by: customer?.assigned_to || null  // Include servicer UUID
      };

      // Set started_at if moving from Not Started to any other status
      if (currentTask?.status === 'Not Started' && newStatus !== 'Not Started' && !currentTask.started_at) {
        updateData.started_at = new Date().toISOString();
      }

      // Only set completed_at when status is Complete
      if (newStatus === 'Complete') {
        updateData.completed_at = new Date().toISOString();
      }

      // Add notes/comment if provided
      if (comment) {
        updateData.notes = comment;
        updateData.status_change_comment = comment;  // For the trigger to use
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select();

      if (error) {
        console.error('Supabase error details:', error);
        console.error('Error breakdown:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        alert(`Failed to update task: ${error.message || 'Unknown error'}`);
        throw error;
      }

      fetchCustomerData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleStatusChange = (taskId: string, taskName: string, newStatus: string) => {
    // Show modal for comment
    setStatusChangeModal({ taskId, taskName, newStatus });
    setStatusChangeComment('');
  };

  const confirmStatusChange = async () => {
    if (!statusChangeModal) return;
    
    await updateTaskStatus(
      statusChangeModal.taskId, 
      statusChangeModal.newStatus,
      statusChangeComment
    );
    
    setStatusChangeModal(null);
    setStatusChangeComment('');
  };

  const toggleTaskComplete = async (taskId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Complete' ? 'Not Started' : 'Complete';
    await updateTaskStatus(taskId, newStatus);
  };

  const updateTaskCompletedDate = async (taskId: string, date: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          completed_at: date ? new Date(date).toISOString() : null,
          last_updated: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchCustomerData();
    } catch (error) {
      console.error('Error updating completed date:', error);
    }
  };

  const updateTaskLastUpdated = async (taskId: string, date: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .update({ 
          last_updated: date ? new Date(date).toISOString() : new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      fetchCustomerData();
    } catch (error) {
      console.error('Error updating last updated date:', error);
    }
  };


  const saveCustomerNotes = async () => {
    if (!supabase || !customer) return;

    try {
      const { error } = await supabase
        .from('tbl_customer')
        .update({ notes: customerNotes })
        .eq('phone', customer.phone);

      if (error) throw error;
      setEditingNotes(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const saveCustomerDescription = async () => {
    if (!supabase || !customer) return;

    try {
      const { error } = await supabase
        .from('tbl_customer')
        .update({ description: customerDescription })
        .eq('phone', customer.phone);

      if (error) throw error;
      setEditingDescription(false);
    } catch (error) {
      console.error('Error saving description:', error);
    }
  };

  const toggleCustomerFlag = async (flag: string) => {
    if (!supabase || !customer) return;

    const newFlags = customerFlags.includes(flag)
      ? customerFlags.filter(f => f !== flag)
      : [...customerFlags, flag];

    try {
      const { error } = await supabase
        .from('tbl_customer')
        .update({ flags: newFlags })
        .eq('phone', customer.phone);

      if (error) throw error;
      setCustomerFlags(newFlags);
    } catch (error) {
      console.error('Error updating flags:', error);
    }
  };

  const updateSubCategoryMoneySaved = async (subCategoryId: string, amount: number) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('sub_categories')
        .update({ 
          money_saved: amount,
          last_update: new Date().toISOString()
        })
        .eq('id', subCategoryId);

      if (error) throw error;
      fetchCustomerData();
    } catch (error) {
      console.error('Error updating money saved:', error);
    }
  };

  const updateSubCategoryStatus = async (subCategoryId: string, newStatus: string) => {
    if (!supabase) return;

    try {
      const { error } = await supabase
        .from('sub_categories')
        .update({ 
          overall_status: newStatus,
          last_update: new Date().toISOString()
        })
        .eq('id', subCategoryId);

      if (error) throw error;
      fetchCustomerData();
    } catch (error) {
      console.error('Error updating subcategory status:', error);
    }
  };

  const handleAddSubCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubCategoryName.trim() || !selectedCategory || !customerPhone || !supabase) return;

    try {
      // First create or get the category
      let categoryId = '';
      
      // Check if category exists
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('customer_phone', customerPhone)
        .eq('name', selectedCategory)
        .single();

      if (existingCategory) {
        categoryId = existingCategory.id;
      } else {
        // Create new category
        const { data: newCategory, error: categoryError } = await supabase
          .from('categories')
          .insert({
            customer_phone: customerPhone,
            name: selectedCategory,
            start_time: new Date().toISOString(),
            status: 'Not Started'
          })
          .select()
          .single();

        if (categoryError) throw categoryError;
        categoryId = newCategory.id;
      }

      // Insert sub-category
      const { data: subCategoryData, error: subCategoryError } = await supabase
        .from('sub_categories')
        .insert({
          category_id: categoryId,
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
          communicated: false,
          money_saved: 0
        }));

        const { error: tasksError } = await supabase
          .from('tasks')
          .insert(tasksToInsert);

        if (tasksError) throw tasksError;
      }

      setNewSubCategoryName('');
      setSelectedCategory('');
      setShowAddSubCategory(false);
      fetchCustomerData();
    } catch (error) {
      console.error('Error adding sub-category:', error);
    }
  };

  const logCommunication = async () => {
    if (!newCommNote.trim() || !newCommMethod || !supabase) return;

    // This would typically update a task or create a communication log
    // For now, we'll just refresh the data
    setNewCommNote('');
    setNewCommMethod('');
    setShowCommLog(false);
    fetchCustomerData();
  };

  const deleteSubCategory = async (subCategoryId: string) => {
    if (!supabase) return;

    try {
      // First delete all tasks in this subcategory
      const { error: tasksError } = await supabase
        .from('tasks')
        .delete()
        .eq('sub_category_id', subCategoryId);

      if (tasksError) throw tasksError;

      // Then delete the subcategory itself
      const { error: subCategoryError } = await supabase
        .from('sub_categories')
        .delete()
        .eq('id', subCategoryId);

      if (subCategoryError) throw subCategoryError;

      setDeleteConfirmModal(null);
      fetchCustomerData();
    } catch (error) {
      console.error('Error deleting subcategory:', error);
      alert('Failed to delete subcategory. Please try again.');
    }
  };

  const quickLogCommunication = async (method: string) => {
    if (!supabase || !customer) return;

    try {
      // Update customer's last contact time and method
      const { error: customerError } = await supabase
        .from('tbl_customer')
        .update({ 
          last_contact_at: new Date().toISOString(),
          last_contact_method: method
        })
        .eq('phone', customer.phone);

      if (customerError) throw customerError;

      // Also create a daily_update record for communication tracking
      if (customer.assigned_to) {
        // Find any task for this customer to record the communication
        const { data: tasks } = await supabase
          .from('tasks')
          .select('id')
          .in('sub_category_id', subCategories.map(sc => sc.id))
          .limit(1);
        
        if (tasks && tasks.length > 0) {
          await supabase
            .from('daily_updates')
            .insert({
              task_id: tasks[0].id,
              update_date: new Date().toISOString().split('T')[0],
              previous_status: null,
              new_status: 'Communication Logged',
              communicated: true,
              communication_method: method,
              updated_by: customer.assigned_to
            });
        }
      }
      
      fetchCustomerData();
    } catch (error) {
      console.error('Error logging communication:', error);
    }
  };

  const getProgressForSubCategory = (subCategory: ExtendedSubCategory) => {
    const tasks = subCategory.tasks || [];
    const completedTasks = tasks.filter(t => t.status === 'Complete').length;
    return { completed: completedTasks, total: tasks.length };
  };

  // Group subcategories by category for display
  const groupedSubCategories = subCategories.reduce((acc, subCat) => {
    const category = subCat.category_name || 'Uncategorized';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(subCat);
    return acc;
  }, {} as Record<string, ExtendedSubCategory[]>);

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
      {isSupabaseConfigured && <SupabaseStatus />}
      
      <Breadcrumb
        items={[
          { name: 'Customers', href: '/customers' },
          { name: customer.display_name }
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
            <h1 className="text-2xl font-bold text-gray-900">{customer.display_name}</h1>
            {/* Customer Flags */}
            <div className="ml-4 flex items-center space-x-2">
              {CUSTOMER_FLAGS.map((flag) => (
                <button
                  key={flag}
                  onClick={() => toggleCustomerFlag(flag)}
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                    customerFlags.includes(flag)
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  <Flag className="h-3 w-3 mr-1" />
                  {flag}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-gray-600">
            {customer.email && <p>{customer.email}</p>}
            {customer.phone && <p>{customer.phone}</p>}
            {customer.assigned_to && (
              <div className="flex items-center text-sm">
                <User className="h-4 w-4 mr-1" />
                <span>Assigned to: {customer.assigned_servicer_name || 'Team Member'}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setShowCommLog(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            Communication Log
          </button>
          <button
            onClick={() => setShowAddSubCategory(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Service
          </button>
        </div>
      </div>

      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Money Saved Card */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="h-5 w-5 text-green-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-green-900">Total Savings</h3>
                <p className="text-2xl font-bold text-green-700">${totalMoneySaved.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Communication Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <MessageCircle className="h-5 w-5 text-blue-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-blue-900">Last Contact</h3>
                <p className="text-sm text-blue-700">
                  {customer.last_message_at ? new Date(customer.last_message_at).toLocaleDateString() : 'No recent communication'}
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => quickLogCommunication('WhatsApp')}
                className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded"
                title="Log WhatsApp contact"
              >
                WhatsApp
              </button>
              <button
                onClick={() => quickLogCommunication('Phone')}
                className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
                title="Log phone contact"
              >
                Phone
              </button>
              <button
                onClick={() => quickLogCommunication('Email')}
                className="px-3 py-1 text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 rounded"
                title="Log email contact"
              >
                Email
              </button>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />
              <div>
                <h3 className="text-sm font-medium text-purple-900">Overall Progress</h3>
                <p className="text-sm text-purple-700">
                  {subCategories.reduce((acc, sc) => acc + (sc.tasks?.filter(t => t.status === 'Complete').length || 0), 0)} / 
                  {subCategories.reduce((acc, sc) => acc + (sc.tasks?.length || 0), 0)} tasks complete
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Description Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Customer Description / Portfolio</h3>
          </div>
          {!editingDescription ? (
            <button
              onClick={() => setEditingDescription(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={saveCustomerDescription}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </button>
          )}
        </div>
        <div className="p-6">
          {editingDescription ? (
            <textarea
              value={customerDescription}
              onChange={(e) => setCustomerDescription(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe customer situation, portfolio details, financial goals..."
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {customerDescription || <span className="text-gray-400 italic">No description yet. Click Edit to add customer details.</span>}
            </p>
          )}
        </div>
      </div>

      {/* Customer Notes Section */}
      <div className="bg-white rounded-lg border shadow-sm">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center">
            <FileText className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Customer Notes</h3>
          </div>
          {!editingNotes ? (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          ) : (
            <button
              onClick={saveCustomerNotes}
              className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded"
            >
              <Save className="h-4 w-4 mr-1" />
              Save
            </button>
          )}
        </div>
        <div className="p-6">
          {editingNotes ? (
            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="Add notes about this customer..."
            />
          ) : (
            <p className="text-gray-700 whitespace-pre-wrap">
              {customerNotes || <span className="text-gray-400 italic">No notes yet. Click Edit to add notes.</span>}
            </p>
          )}
        </div>
      </div>

      {/* Services (SubCategories) Accordion */}
      <div className="space-y-4">
        {Object.keys(groupedSubCategories).length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg border">
            <Plus className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No services yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by adding a service for this customer.
            </p>
          </div>
        ) : (
          Object.entries(groupedSubCategories).map(([categoryName, subCats]) => (
            <div key={categoryName} className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">{categoryName}</h3>
              {subCats.map((subCategory) => {
                const isExpanded = expandedSubCategories.has(subCategory.id);
                const progress = getProgressForSubCategory(subCategory);
                
                return (
                  <div key={subCategory.id} className="bg-white rounded-lg border shadow-sm">
                    {/* SubCategory Header */}
                    <div
                      className="px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSubCategory(subCategory.id)}
                    >
                      <div className="flex items-center flex-1">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400 mr-3" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400 mr-3" />
                        )}
                        <h4 className="text-lg font-medium text-gray-900">{subCategory.name}</h4>
                        <div className="ml-4 flex items-center space-x-4">
                          <span className="text-sm text-gray-500">
                            {progress.completed}/{progress.total} complete
                          </span>
                          {progress.total > 0 && (
                            <div className="w-24 bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                              />
                            </div>
                          )}
                          {(subCategory.money_saved || 0) > 0 && (
                            <span className="text-sm font-medium text-green-600">
                              ${(subCategory.money_saved || 0).toFixed(2)} saved
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <select
                          value={subCategory.overall_status || 'Not Started'}
                          onChange={(e) => {
                            e.stopPropagation();
                            updateSubCategoryStatus(subCategory.id, e.target.value);
                          }}
                          className="text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {SUBCATEGORY_STATUSES.map(status => (
                            <option key={status} value={status}>{status}</option>
                          ))}
                        </select>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmModal({
                              subCategoryId: subCategory.id,
                              subCategoryName: subCategory.name
                            });
                          }}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete subcategory"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Tasks */}
                    {isExpanded && (
                      <div className="border-t px-8 py-4 bg-gray-50">
                        {/* Subcategory Money Saved */}
                        <div className="mb-4 flex items-center justify-between bg-green-50 p-3 rounded">
                          <div className="flex items-center">
                            <DollarSign className="h-5 w-5 text-green-600 mr-2" />
                            <span className="text-sm font-medium text-green-900">Money Saved for {subCategory.name}:</span>
                          </div>
                          <div className="flex items-center">
                            <span className="text-sm text-green-700 mr-1">$</span>
                            <input
                              type="number"
                              value={subCategory.money_saved || ''}
                              onChange={(e) => updateSubCategoryMoneySaved(subCategory.id, parseFloat(e.target.value) || 0)}
                              className="w-24 text-sm border-green-300 rounded focus:ring-green-500 focus:border-green-500"
                              placeholder="0.00"
                              step="0.01"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        </div>
                        {subCategory.tasks?.length === 0 ? (
                          <p className="text-sm text-gray-500">No tasks yet</p>
                        ) : (
                          <div className="space-y-3">
                            {subCategory.tasks?.map((task) => (
                              <div
                                key={task.id}
                                className="bg-white rounded-lg p-3 border"
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center flex-1">
                                    <input
                                      type="checkbox"
                                      checked={task.status === 'Complete'}
                                      onChange={() => toggleTaskComplete(task.id, task.status)}
                                      className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <select
                                      value={task.status}
                                      onChange={(e) => handleStatusChange(task.id, task.name, e.target.value)}
                                      className="mr-3 text-sm border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {PREDEFINED_STATUSES.map(status => (
                                        <option key={status} value={status}>{status}</option>
                                      ))}
                                    </select>
                                    <span className={`text-sm flex-1 ${task.status === 'Complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                      {task.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {/* Show appropriate date based on status */}
                                    {task.status !== 'Not Started' && (
                                      <>
                                        {task.started_at && task.status !== 'Complete' && (
                                          <span className="text-xs text-gray-500" title="Started">
                                            S: {new Date(task.started_at).toLocaleDateString()}
                                          </span>
                                        )}
                                        <input
                                          type="date"
                                          value={
                                            task.status === 'Complete' && task.completed_at 
                                              ? new Date(task.completed_at).toISOString().split('T')[0]
                                              : task.last_updated 
                                              ? new Date(task.last_updated).toISOString().split('T')[0]
                                              : ''
                                          }
                                          onChange={(e) => {
                                            if (task.status === 'Complete') {
                                              updateTaskCompletedDate(task.id, e.target.value);
                                            } else {
                                              updateTaskLastUpdated(task.id, e.target.value);
                                            }
                                          }}
                                          className="text-xs border-gray-300 rounded focus:ring-blue-500 focus:border-blue-500"
                                          title={task.status === 'Complete' ? "Completion date" : "Last action date"}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                      </>
                                    )}
                                    {task.communicated && (
                                      <MessageCircle className="h-4 w-4 text-green-600" title="Communicated" />
                                    )}
                                  </div>
                                </div>
                                {task.notes && (
                                  <p className="mt-2 text-xs text-gray-600 pl-8">{task.notes}</p>
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
          ))
        )}
      </div>

      {/* Add Service (Sub-Category) Modal */}
      {showAddSubCategory && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Service</h3>
            <form onSubmit={handleAddSubCategory}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a category...</option>
                  {PREDEFINED_CATEGORIES.map(category => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Service Name
                </label>
                <select
                  value={newSubCategoryName}
                  onChange={(e) => setNewSubCategoryName(e.target.value)}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  required
                >
                  <option value="">Select a service...</option>
                  {selectedCategory && SUB_CATEGORIES[selectedCategory]?.map(subCat => (
                    <option key={subCat} value={subCat}>{subCat}</option>
                  ))}
                </select>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-700">
                <p className="font-medium">Note:</p>
                <p>Tasks will be automatically added based on the service type.</p>
              </div>
              <div className="flex justify-end space-x-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubCategory(false);
                    setNewSubCategoryName('');
                    setSelectedCategory('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Add Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {statusChangeModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Task Status</h3>
            <p className="text-sm text-gray-600 mb-2">
              Task: <span className="font-medium">{statusChangeModal.taskName}</span>
            </p>
            <p className="text-sm text-gray-600 mb-4">
              New Status: <span className="font-medium">{statusChangeModal.newStatus}</span>
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comment (optional)
              </label>
              <textarea
                value={statusChangeComment}
                onChange={(e) => setStatusChangeComment(e.target.value)}
                className="w-full h-24 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Add notes about this status change..."
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setStatusChangeModal(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmStatusChange}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
              >
                Update Status
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Subcategory</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong>"{deleteConfirmModal.subCategoryName}"</strong>?
            </p>
            <p className="text-sm text-red-600 mb-6">
              This will permanently delete the subcategory and all its tasks. This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmModal(null)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteSubCategory(deleteConfirmModal.subCategoryId)}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Communication Log Modal */}
      {showCommLog && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Communication Log</h3>
            
            {/* Add new communication */}
            <div className="border-b pb-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Log New Communication</h4>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newCommNote}
                  onChange={(e) => setNewCommNote(e.target.value)}
                  placeholder="Communication notes..."
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                />
                <select
                  value={newCommMethod}
                  onChange={(e) => setNewCommMethod(e.target.value)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                >
                  <option value="">Method...</option>
                  <option value="Email">Email</option>
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="Phone">Phone</option>
                  <option value="In-person">In-person</option>
                </select>
                <button
                  onClick={logCommunication}
                  className="px-3 py-1 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  Log
                </button>
              </div>
            </div>

            {/* Communication history */}
            <div className="space-y-3">
              {communications.length === 0 ? (
                <p className="text-sm text-gray-500">No communication history</p>
              ) : (
                communications.map((comm) => (
                  <div key={comm.id} className="border-l-4 border-blue-200 pl-3 py-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {comm.task?.name || 'General communication'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {comm.task?.sub_category?.name} → {comm.task?.sub_category?.category?.name}
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{comm.new_notes}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {new Date(comm.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-blue-600">
                          {comm.communication_method}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowCommLog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}