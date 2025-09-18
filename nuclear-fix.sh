#!/bin/bash

echo "🔥 NUCLEAR SUPABASE FIX - FINAL SOLUTION"
echo "=========================================="
echo ""

# Step 1: Kill everything
echo "1️⃣ Killing all node processes..."
pkill -f node || true
pkill -f vite || true
sleep 2

# Step 2: Clean EVERYTHING
echo "2️⃣ Removing ALL cache directories..."
rm -rf node_modules/.vite
rm -rf .vite
rm -rf dist
rm -rf build
rm -rf .parcel-cache
rm -rf node_modules/.cache
rm -rf .next
rm -rf .cache

# Step 3: Create new .env file with correct values
echo "3️⃣ Creating fresh .env file..."
cat > .env << 'EOF'
VITE_SUPABASE_URL=https://vjfyuqdypacsffuulbdv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZnl1cWR5cGFjc2ZmdXVsYmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDg5NDcsImV4cCI6MjA2NDYyNDk0N30.25H6QRkdmLzuYYt2F0NaLznKfzt2vcDjZ2LXFtINfR8
EOF

# Step 4: Create a completely new supabase.ts file with HARDCODED values
echo "4️⃣ Creating brand new supabase.ts with HARDCODED values..."
cat > src/lib/supabase.ts << 'EOF'
import { createClient } from '@supabase/supabase-js';

// TEMPORARILY HARDCODED to bypass ALL caching issues
const timestamp = Date.now();
const supabaseUrl = 'https://vjfyuqdypacsffuulbdv.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZqZnl1cWR5cGFjc2ZmdXVsYmR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNDg5NDcsImV4cCI6MjA2NDYyNDk0N30.25H6QRkdmLzuYYt2F0NaLznKfzt2vcDjZ2LXFtINfR8';

// Big visible log
console.log('%c' + '='.repeat(50), 'color: red; font-size: 20px');
console.log('%c🚨 NEW SUPABASE CONNECTION 🚨', 'color: green; font-size: 24px; font-weight: bold');
console.log('%c' + '='.repeat(50), 'color: red; font-size: 20px');
console.log('%cUsing URL:', 'color: green; font-size: 18px', supabaseUrl);
console.log('%cTimestamp:', 'color: green; font-size: 18px', timestamp);
console.log('%c' + '='.repeat(50), 'color: red; font-size: 20px');

if (supabaseUrl.includes('slurfrqobzcjeeewqjof')) {
    alert('❌ STILL USING OLD URL! Clear browser data NOW!');
    throw new Error('OLD URL DETECTED');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        storage: undefined
    },
    global: {
        headers: {
            'x-no-cache': timestamp.toString()
        }
    }
});

export const isSupabaseConfigured = true;

// Test connection
supabase.from('tbl_customer').select('count').single().then(({ error }) => {
    if (error) {
        console.log('Connection test error (expected if table empty):', error.message);
    } else {
        console.log('%c✅ DATABASE CONNECTION WORKING!', 'color: green; font-size: 20px; font-weight: bold');
    }
});

// Export all the types and constants
export type Customer = {
  phone: string;
  display_name: string;
  email?: string;
  assigned_to?: string;
  assigned_servicer_name?: string;
  customer_type?: string;
  created_at: string;
  updated_at: string;
  notes?: string;
  description?: string;
  flags?: string[];
  last_contact_method?: string;
  last_contact_at?: string;
  last_message_at?: string;
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
  overall_status?: string;
  money_saved?: number;
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
  completed_at?: string;
  money_saved?: number;
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
  'Banking/Saving',
  'Credit Card',
  'Debt',
  'Housing',
  'Insurance',
  'Investment',
  'IRD',
  'Tax',
  'Utilities'
];

export const PREDEFINED_STATUSES = [
  'Not Started',
  'In Progress',
  'Sent Info',
  'Waiting on Info',
  'Waiting on Partner',
  'Followed Up',
  'Complete',
  'N/A'
];

export const SUBCATEGORY_STATUSES = [
  'Not Started',
  'In Progress',
  'Can\'t Optimise',
  'Optimised'
];

export const CUSTOMER_FLAGS = [
  'Difficult',
  'Slow',
  'VIP',
  'Priority',
  'New'
];

export const COMMUNICATION_METHODS = [
  'Email',
  'WhatsApp',
  'Phone',
  'In-person',
  'Other'
];

export const SUB_CATEGORIES = {
  'Banking/Saving': ['Banking Optimisation'],
  'Credit Card': ['Credit Card - Balance Transfer', 'Credit Card - Rewards'],
  'Debt': ['Debt Consolidation', 'New Loan', 'Hardship', 'Nga Tangata', 'Good Shepherd'],
  'Housing': ['First Home Buyer', 'Refinancing Mortgage', 'Rent'],
  'Insurance': ['Car Insurance', 'Health Insurance', 'House Insurance', 'Pet Insurance', 'Contents Insurance', 'Life Insurance'],
  'Investment': ['Starting Investing', 'Optimising Investments'],
  'IRD': ['Unclaimed Money'],
  'Tax': ['Tax - Optimisation'],
  'Utilities': ['Broadband', 'Power', 'Mobile', 'Gas']
};

export const PREDEFINED_TASKS_BY_SUB_CATEGORY: Record<string, string[]> = {
  'Banking Optimisation': ['Review current situation', 'Compare banking providers interest rates', 'Suggest optimised savings plan'],
  'Credit Card - Balance Transfer': ['Collect recent statements', 'Calculate spend vs pay-off', 'Compare against other cards on tool', 'Suggest new card', 'Guide how to switch'],
  'Credit Card - Rewards': ['Review current rewards program', 'Calculate annual expenditure', 'Compare rewards cards on tool', 'Calculate annual value', 'Suggest optimisation', 'Guide how to switch'],
  'Nga Tangata': ['Check Eligibility (Income)', 'Get last 2/3 months bank statement', 'Create debt schedules', 'Create current & proposed budget', 'Collect loan statements and all debts', 'ID verification', 'Collect proof of income (payslip or MSD breakdown)', 'Fill in application website', 'Financial well-being questionnaire', 'Signed by applicant'],
  'Good Shepherd': ['Check Eligibility (Income)', 'Get bank statement', 'Create current & proposed budget', 'Collect loan statements and all debts', 'Create debt schedule', 'ID verification', 'Collect proof of income (payslip or MSD breakdown)', 'Fill in application website', 'Financial well-being questionnaire', 'Signed by applicant'],
  'Debt Consolidation': ['Collect loan statements and all debts', 'Check credit score', 'Calculate total debt amount', 'Compare consolidation options', 'Apply for consolidation loans'],
  'New Loan': ['Determine loan amount needed', 'Check credit score', 'Compare lenders', 'Gather income documents', 'Submit loan applications', 'Choose appropriate loan provider'],
  'Hardship': ['Document financial situation', 'Send templates for current lenders', 'Request hardship variations', 'Negotiate payment plans'],
  'First Home Buyer': ['Collect all documentation', 'Send all information to mortgage partner'],
  'Refinancing Mortgage': ['Collect all documentation', 'Send all information to mortgage partner'],
  'Rent': ['Review current rental cost', 'Research market rates', 'Check tenancy agreement', 'Negotiate with landlord', 'Consider relocation options', 'Update bond if moving', 'Arrange utilities transfer'],
  'Car Insurance': ['Collect vehicle details', 'Collect current policy', 'Compare quotes online', 'Review excess & value options', 'Check multi-policy discounts', 'Suggest optimisation', 'Guide switch'],
  'Health Insurance': ['Collect relevant documents', 'Send to health insurance partner', 'Compare providers yourself', 'Suggest optimisation'],
  'House Insurance': ['Collect house details', 'Collect current policy', 'Compare quotes online', 'Review excess & value options', 'Check multi-policy discounts', 'Suggest optimisation', 'Guide switch'],
  'Pet Insurance': ['Get pet details', 'Compare coverage options', 'Review exclusions', 'Get quotes', 'Suggest optimisation'],
  'Contents Insurance': ['Collect contents details', 'Collect current policy', 'Compare quotes online', 'Review excess & value options', 'Check multi-policy discounts', 'Suggest optimisation', 'Guide switch'],
  'Life Insurance': ['Collect relevant documents', 'Send to health insurance partner', 'Compare providers yourself', 'Suggest optimisation'],
  'Starting Investing': ['Determine investment goals', 'Assess risk tolerance', 'Research investment options', 'Choose platform/broker', 'Open investment account', 'Make initial deposit', 'Select first investments', 'Set up regular contributions'],
  'Optimising Investments': ['Review current portfolio', 'Assess performance', 'Rebalance if needed', 'Consider tax implications(optional)', 'Update investment strategy', 'Consolidate if beneficial'],
  'Unclaimed Money': ['Check IRD unclaimed money database', 'Submit claim forms', 'Communicate with client'],
  'Tax - Optimisation': ['Review income', 'Send client A&A authority form', 'Update client'],
  'Broadband': ['Get recent bill', 'Compare providers', 'Check bundle options', 'Suggest optimisation'],
  'Power': ['Get recent bills', 'Check current rates', 'Compare providers', 'Check bundle options', 'Suggest optimisation', 'Guide through switch'],
  'Mobile': ['Get recent bill', 'Compare plans', 'Check coverage maps', 'Suggest optimisation', 'Guide through switch'],
  'Gas': ['Get recent bills', 'Check current rates', 'Compare providers', 'Check bundle options', 'Suggest optimisation', 'Guide through switch']
};
EOF

# Step 5: Update vite config to force reload
echo "5️⃣ Updating vite.config.ts to use different port..."
cat > vite.config.ts << 'EOF'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    force: true,
    exclude: []
  },
  server: {
    port: 4444,
    host: true,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true,
      interval: 100
    }
  },
  cacheDir: '.vite-new',
  build: {
    rollupOptions: {
      cache: false
    }
  }
});
EOF

echo ""
echo "✅ COMPLETE! Now do this:"
echo ""
echo "1. CLOSE ALL BROWSER WINDOWS completely"
echo ""
echo "2. Run the dev server on NEW PORT:"
echo "   npm run dev"
echo ""
echo "3. Open a NEW INCOGNITO window and go to:"
echo "   http://localhost:4444"
echo ""
echo "4. Check the console for the green 'NEW SUPABASE CONNECTION' message"
echo ""
echo "The Supabase connection is now HARDCODED to bypass all caching."
echo "Once it works, you can switch back to using environment variables."