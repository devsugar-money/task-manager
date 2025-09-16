// Mock data for testing the interface without Supabase
export const mockCustomers = [
  {
    id: '1',
    name: 'John & Sarah Mitchell',
    email: 'john.mitchell@email.com',
    phone: '+64 21 123 4567',
    assigned_servicer: 'servicer1',
    created_at: '2024-01-15T09:00:00Z',
    total_tasks: 18,
    overdue_tasks: 2,
    last_activity: '2024-01-19T14:30:00Z'
  },
  {
    id: '2', 
    name: 'Emma Thompson',
    email: 'emma.thompson@email.com',
    phone: '+64 21 765 4321',
    assigned_servicer: 'servicer1',
    created_at: '2024-01-10T10:30:00Z',
    total_tasks: 12,
    overdue_tasks: 0,
    last_activity: '2024-01-20T11:15:00Z'
  },
  {
    id: '3',
    name: 'David & Lisa Chen',
    email: 'david.chen@email.com', 
    phone: '+64 21 555 0123',
    assigned_servicer: 'servicer2',
    created_at: '2024-01-08T14:15:00Z',
    total_tasks: 8,
    overdue_tasks: 1,
    last_activity: '2024-01-18T16:45:00Z'
  },
  {
    id: '4',
    name: 'Michael Roberts',
    email: 'michael.roberts@email.com',
    assigned_servicer: 'servicer1', 
    created_at: '2024-01-12T11:00:00Z',
    total_tasks: 15,
    overdue_tasks: 3,
    last_activity: '2024-01-17T09:30:00Z'
  },
  {
    id: '5',
    name: 'Rachel & James Wilson',
    email: 'rachel.wilson@email.com',
    phone: '+64 21 999 8877',
    assigned_servicer: 'servicer2',
    created_at: '2024-01-20T08:45:00Z',
    total_tasks: 6,
    overdue_tasks: 0,
    last_activity: '2024-01-20T15:20:00Z'
  }
];

export const mockCategories = [
  {
    id: '1',
    customer_id: '1',
    name: 'Insurance',
    start_time: '2024-01-15T09:30:00Z',
    last_update: '2024-01-19T14:30:00Z',
    status: 'Ongoing',
    created_at: '2024-01-15T09:30:00Z',
    task_count: 7,
    overdue_count: 1
  },
  {
    id: '2',
    customer_id: '1', 
    name: 'Investment',
    start_time: '2024-01-15T10:00:00Z',
    last_update: '2024-01-18T16:15:00Z',
    status: 'Waiting on Info',
    created_at: '2024-01-15T10:00:00Z',
    task_count: 5,
    overdue_count: 1
  },
  {
    id: '3',
    customer_id: '1',
    name: 'Utilities',
    start_time: '2024-01-15T11:00:00Z',
    last_update: '2024-01-20T09:45:00Z',
    status: 'Completed',
    created_at: '2024-01-15T11:00:00Z',
    task_count: 3,
    overdue_count: 0
  },
  {
    id: '4',
    customer_id: '1',
    name: 'Banking/Saving',
    start_time: '2024-01-16T14:00:00Z',
    last_update: '2024-01-19T11:30:00Z',
    status: 'Ongoing',
    created_at: '2024-01-16T14:00:00Z',
    task_count: 3,
    overdue_count: 0
  }
];

export const mockTasks = [
  {
    id: '1',
    sub_category_id: '1',
    name: 'Review Life Insurance Policy',
    status: 'Ongoing',
    custom_status: null,
    notes: 'Contacted client, waiting for current policy documents. Client mentioned they want to increase cover.',
    last_updated: '2024-01-19T14:30:00Z',
    updated_by: 'servicer1',
    communicated: true,
    communication_method: 'Email',
    created_at: '2024-01-15T09:30:00Z',
    sub_category: {
      name: 'Life Insurance',
      category: {
        name: 'Insurance',
        customer: {
          name: 'John & Sarah Mitchell'
        }
      }
    }
  },
  {
    id: '2',
    sub_category_id: '1', 
    name: 'Health Insurance Comparison',
    status: 'Waiting on Info',
    notes: 'Requested current health insurance details from client. No response for 3 days.',
    last_updated: '2024-01-17T10:15:00Z',
    updated_by: 'servicer1',
    communicated: false,
    no_comm_reason: 'Client unavailable',
    created_at: '2024-01-15T09:45:00Z',
    sub_category: {
      name: 'Life Insurance', 
      category: {
        name: 'Insurance',
        customer: {
          name: 'John & Sarah Mitchell'
        }
      }
    }
  },
  {
    id: '3',
    sub_category_id: '2',
    name: 'KiwiSaver Review',
    status: 'Completed',
    notes: 'Reviewed client KiwiSaver performance. Recommended switching to growth fund. Client agreed.',
    last_updated: '2024-01-20T11:15:00Z',
    updated_by: 'servicer1',
    communicated: true,
    communication_method: 'WhatsApp',
    created_at: '2024-01-10T10:30:00Z',
    sub_category: {
      name: 'KiwiSaver',
      category: {
        name: 'Investment',
        customer: {
          name: 'Emma Thompson'
        }
      }
    }
  },
  {
    id: '4',
    sub_category_id: '3',
    name: 'Power Company Switch',
    status: 'Blocked',
    custom_status: 'Waiting on Meter Reading',
    notes: 'Application submitted but power company needs final meter reading before switch can complete.',
    last_updated: '2024-01-18T16:45:00Z',
    updated_by: 'servicer2',
    communicated: true,
    communication_method: 'Phone',
    created_at: '2024-01-08T14:15:00Z',
    sub_category: {
      name: 'Power',
      category: {
        name: 'Utilities',
        customer: {
          name: 'David & Lisa Chen'
        }
      }
    }
  },
  {
    id: '5',
    sub_category_id: '4',
    name: 'Mortgage Application',
    status: 'Ongoing',
    notes: 'Bank has requested additional income documentation. Client gathering payslips.',
    last_updated: '2024-01-15T13:20:00Z',
    updated_by: 'servicer1',
    communicated: true,
    communication_method: 'Email',
    created_at: '2024-01-12T11:00:00Z',
    sub_category: {
      name: 'Mortgage',
      category: {
        name: 'Debt',
        customer: {
          name: 'Michael Roberts'
        }
      }
    }
  }
];

export const mockRecentUpdates = [
  {
    id: '1',
    customer_name: 'Emma Thompson',
    category_name: 'Investment',
    task_name: 'KiwiSaver Review',
    status: 'Completed',
    updated_at: '2024-01-20T11:15:00Z'
  },
  {
    id: '2',
    customer_name: 'Rachel & James Wilson',
    category_name: 'Insurance',
    task_name: 'Car Insurance Renewal',
    status: 'Ongoing',
    updated_at: '2024-01-20T15:20:00Z'
  },
  {
    id: '3',
    customer_name: 'John & Sarah Mitchell',
    category_name: 'Banking/Saving',
    task_name: 'Savings Account Setup',
    status: 'Waiting on Info',
    updated_at: '2024-01-19T11:30:00Z'
  }
];

export const mockStats = {
  totalTasks: 53,
  tasksNeedingUpdate: 8,
  overdueTasks: 6,
  customersWithStaleTasks: 2
};

export const mockUrgentTasks = [
  {
    id: '2',
    name: 'Health Insurance Comparison',
    status: 'Waiting on Info',
    last_updated: '2024-01-17T10:15:00Z',
    sub_category: {
      name: 'Life Insurance',
      category: {
        name: 'Insurance',
        customer: {
          name: 'John & Sarah Mitchell'
        }
      }
    }
  },
  {
    id: '5',
    name: 'Mortgage Application', 
    status: 'Ongoing',
    last_updated: '2024-01-15T13:20:00Z',
    sub_category: {
      name: 'Mortgage',
      category: {
        name: 'Debt',
        customer: {
          name: 'Michael Roberts'
        }
      }
    }
  }
];