import { createClient } from '@supabase/supabase-js';

// CRITICAL: These MUST match your .env file exactly
const EXPECTED_URL = 'https://vjfyuqdypacsffuulbdv.supabase.co';
const EXPECTED_KEY_START = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9';

// Force fresh read of environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Diagnostic logging with colors
console.log('%c🔍 SUPABASE DIAGNOSTIC', 'color: blue; font-weight: bold; font-size: 16px');
console.log('%c================================', 'color: blue');

// Check URL
if (supabaseUrl === EXPECTED_URL) {
    console.log('%c✅ URL is correct:', 'color: green', supabaseUrl);
} else {
    console.error('%c❌ URL MISMATCH!', 'color: red; font-weight: bold');
    console.error('Expected:', EXPECTED_URL);
    console.error('Got:', supabaseUrl || 'UNDEFINED');
    console.error('%cCheck your .env file!', 'color: red; font-weight: bold');
}

// Check Key
if (supabaseAnonKey && supabaseAnonKey.startsWith(EXPECTED_KEY_START)) {
    console.log('%c✅ Key appears valid', 'color: green');
} else {
    console.error('%c❌ KEY ISSUE!', 'color: red; font-weight: bold');
    console.error('Key is:', supabaseAnonKey ? 'Present but might be wrong' : 'UNDEFINED');
}

// Check for old URL in window or document
if (typeof window !== 'undefined') {
    const pageSource = document.documentElement.innerHTML;
    if (pageSource.includes('slurfrqobzcjeeewqjof')) {
        console.error('%c❌ OLD URL FOUND IN PAGE!', 'color: red; font-weight: bold; font-size: 20px');
        console.error('The old Supabase URL is still being loaded somewhere!');
        console.error('Try: 1) Clear ALL browser data, 2) Use incognito, 3) Try different browser');
    }
}

console.log('%c================================', 'color: blue');
console.log('Cache buster:', Date.now());

// Fail fast if not configured
if (!supabaseUrl || !supabaseAnonKey) {
    const error = new Error('🚫 SUPABASE NOT CONFIGURED! Check console for details.');
    console.error(error);
    throw error;
}

// Create client with aggressive cache busting
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
        storage: {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {}
        }
    },
    global: {
        headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'X-Request-ID': crypto.randomUUID()
        }
    }
});

// Test connection immediately
const testConnection = async () => {
    try {
        const timestamp = Date.now();
        console.log(`%c⏳ Testing connection to ${supabaseUrl}...`, 'color: orange');
        
        // Try a simple query
        const { data, error } = await supabase
            .from('any_table')
            .select('count')
            .limit(1);
        
        if (error && error.code === 'PGRST116') {
            // Table doesn't exist, but connection works!
            console.log('%c✅ CONNECTION SUCCESSFUL!', 'color: green; font-weight: bold; font-size: 16px');
            console.log('(Table not found is expected - connection works!)');
        } else if (error) {
            console.error('%c❌ CONNECTION FAILED:', 'color: red; font-weight: bold', error);
            console.error('Full error:', error);
        } else {
            console.log('%c✅ CONNECTION SUCCESSFUL!', 'color: green; font-weight: bold; font-size: 16px');
            console.log('Response:', data);
        }
        console.log(`Test took ${Date.now() - timestamp}ms`);
    } catch (e) {
        console.error('%c❌ CRITICAL ERROR:', 'color: red; font-weight: bold', e);
    }
};

// Run test after a short delay to ensure page is loaded
setTimeout(testConnection, 100);

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Export for debugging
export const DEBUG_INFO = {
    url: supabaseUrl,
    hasKey: Boolean(supabaseAnonKey),
    timestamp: Date.now(),
    expectedUrl: EXPECTED_URL
};

// Emergency fallback data for development
export const DEMO_MODE = !isSupabaseConfigured;
if (DEMO_MODE) {
    console.warn('%c⚠️ RUNNING IN DEMO MODE - No Supabase connection', 'color: orange; font-weight: bold');
}

// Re-export all types from original file
export type { Customer, Category, SubCategory, Task, TeamMember, DailyUpdate } from './supabase';
export { 
    PREDEFINED_CATEGORIES,
    PREDEFINED_STATUSES,
    SUBCATEGORY_STATUSES,
    CUSTOMER_FLAGS,
    COMMUNICATION_METHODS,
    SUB_CATEGORIES,
    PREDEFINED_TASKS_BY_SUB_CATEGORY
} from './supabase';