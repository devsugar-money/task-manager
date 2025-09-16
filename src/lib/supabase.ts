import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export type Customer = {
  phone: string;
  display_name: string;
  email?: string;
  assigned_to?: string;
  assigned_servicer_name?: string;
  customer_type?: string;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  customer_phone: string;
  name: string;
  start_time: string;
  last_update?: string;
  status?: string;
  created_by?: string;
  created_at: string;
  customer?: Customer;
};

export type SubCategory = {
  id: string;
  category_id: string;
  name: string;
  start_time: string;
  last_update?: string;
  status?: string;
  is_complete: boolean;
  completed_at?: string;
  created_at: string;
  category?: Category;
};

export type Task = {
  id: string;
  sub_category_id: string;
  name: string;
  status: string;
  custom_status?: string;
  notes?: string;
  start_date?: string;
  last_updated?: string;
  updated_by?: string;
  communicated: boolean;
  communication_method?: string;
  no_comm_reason?: string;
  created_at: string;
  sub_category?: SubCategory;
};

export type TeamMember = {
  id: string;
  name: string;
  email?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
};

export type DailyUpdate = {
  id: string;
  task_id: string;
  update_date: string;
  previous_status?: string;
  new_status: string;
  previous_notes?: string;
  new_notes?: string;
  communicated: boolean;
  communication_method?: string;
  no_comm_reason?: string;
  updated_by: string;
  created_at: string;
  task?: Task;
};

export const PREDEFINED_CATEGORIES = [
  'Insurance',
  'Utilities', 
  'Housing',
  'Investment',
  'Debt',
  'Credit Card',
  'KiwiSaver',
  'Income',
  'Tax',
  'Big Purchases',
  'Banking/Saving',
  'IRD'
];

export const PREDEFINED_STATUSES = [
  'Not Started',
  'Ongoing',
  'Completed',
  'Waiting on Info',
  'Waiting on Partner',
  'Not Done Before',
  'Slow Info',
  'Blocked'
];

export const COMMUNICATION_METHODS = [
  'Email',
  'WhatsApp',
  'Phone',
  'In-person',
  'Other'
];

export const SUB_CATEGORIES = {
  'Insurance': [
    'Life Insurance',
    'Health Insurance',
    'Car Insurance', 
    'Home Insurance',
    'Contents Insurance',
    'Income Protection',
    'Trauma Insurance'
  ],
  'Investment': [
    'KiwiSaver',
    'Managed Funds',
    'Term Deposits',
    'Shares',
    'Property Investment',
    'Crypto',
    'Retirement Planning'
  ],
  'Utilities': [
    'Power',
    'Gas',
    'Internet/Broadband',
    'Mobile Plans',
    'Water',
    'Home Security'
  ],
  'Banking/Saving': [
    'Current Accounts',
    'Savings Accounts',
    'Credit Cards',
    'Overdrafts',
    'Automatic Payments',
    'Direct Debits'
  ],
  'Debt': [
    'Mortgage',
    'Personal Loans',
    'Student Loans',
    'Car Loans',
    'Hire Purchase',
    'Store Cards'
  ],
  'Tax': [
    'Tax Returns',
    'GST Registration',
    'PAYE',
    'Tax Codes',
    'Working for Families',
    'Tax Refunds'
  ],
  'Housing': [
    'Rent/Mortgage',
    'Rates',
    'Body Corporate',
    'Maintenance',
    'Renovations'
  ],
  'Income': [
    'Employment',
    'Benefits',
    'Side Income',
    'Passive Income',
    'Business Income'
  ]
};

export const PREDEFINED_TASKS_BY_SUB_CATEGORY: Record<string, string[]> = {
  // Insurance
  'Life Insurance': [
    'Review current policy coverage',
    'Compare quotes from other providers',
    'Update beneficiary details',
    'Assess coverage amount adequacy'
  ],
  'Health Insurance': [
    'Review current policy benefits',
    'Compare provider options',
    'Check waiting periods',
    'Update personal details'
  ],
  'Car Insurance': [
    'Review current policy',
    'Compare quotes',
    'Update vehicle details',
    'Check excess amounts'
  ],
  'Home Insurance': [
    'Review coverage amounts',
    'Update property value',
    'Check policy exclusions',
    'Compare provider quotes'
  ],

  // Investment
  'KiwiSaver': [
    'Review current fund performance',
    'Consider fund type appropriateness',
    'Update contribution rate',
    'Check fees and charges'
  ],
  'Managed Funds': [
    'Review portfolio performance',
    'Assess risk tolerance',
    'Compare management fees',
    'Rebalance investments'
  ],

  // Utilities
  'Power': [
    'Compare electricity providers',
    'Review current plan rates',
    'Check for better deals',
    'Submit switch application'
  ],
  'Internet/Broadband': [
    'Compare internet providers',
    'Check speed requirements',
    'Review contract terms',
    'Schedule installation'
  ],
  'Mobile Plans': [
    'Review current usage',
    'Compare plan options',
    'Check contract end date',
    'Port number if switching'
  ],

  // Banking/Saving
  'Savings Accounts': [
    'Compare interest rates',
    'Review account fees',
    'Set up automatic transfers',
    'Open new account if beneficial'
  ],
  'Credit Cards': [
    'Review interest rates',
    'Compare reward programs',
    'Check annual fees',
    'Consider balance transfer'
  ],

  // Debt
  'Mortgage': [
    'Review current interest rate',
    'Compare lender options',
    'Consider refinancing',
    'Update loan structure'
  ],
  'Personal Loans': [
    'Review loan terms',
    'Compare refinancing options',
    'Create repayment strategy',
    'Consider consolidation'
  ]
};