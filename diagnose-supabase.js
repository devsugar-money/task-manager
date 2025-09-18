#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 SUPABASE CONNECTION FIX SCRIPT');
console.log('='.repeat(50));

// Step 1: Check current directory structure
const projectPath = process.cwd();
console.log('\n📁 Project path:', projectPath);

// Step 2: Check .env file
console.log('\n📄 Checking .env file...');
const envPath = path.join(projectPath, '.env');
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    console.log('✅ .env file found');
    console.log('Content:', envContent.replace(/=.*/g, '=***HIDDEN***'));
    
    // Check if it has the new URL
    if (envContent.includes('vjfyuqdypacsffuulbdv.supabase.co')) {
        console.log('✅ New Supabase URL is in .env');
    } else {
        console.log('❌ .env does not contain new Supabase URL');
    }
} else {
    console.log('❌ .env file not found');
}

// Step 3: Search for hardcoded old URLs
console.log('\n🔍 Searching for hardcoded old URLs...');
const oldUrl = 'slurfrqobzcjeeewqjof';
const searchDirs = ['src', 'public', '.'];

function searchForString(dir, searchStr) {
    const results = [];
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules' && file.name !== 'dist') {
                results.push(...searchForString(fullPath, searchStr));
            } else if (file.isFile() && (file.name.endsWith('.js') || file.name.endsWith('.jsx') || file.name.endsWith('.ts') || file.name.endsWith('.tsx') || file.name.endsWith('.json'))) {
                const content = fs.readFileSync(fullPath, 'utf8');
                if (content.includes(searchStr)) {
                    results.push(fullPath);
                }
            }
        }
    } catch (e) {
        // Ignore permission errors
    }
    return results;
}

const foundFiles = searchForString(projectPath, oldUrl);
if (foundFiles.length > 0) {
    console.log('❌ Found old URL in files:');
    foundFiles.forEach(f => console.log('  -', f));
} else {
    console.log('✅ No hardcoded old URLs found');
}

// Step 4: Check service worker
console.log('\n🔍 Checking for service workers...');
const publicDir = path.join(projectPath, 'public');
const srcDir = path.join(projectPath, 'src');
const swFiles = [
    path.join(publicDir, 'sw.js'),
    path.join(publicDir, 'service-worker.js'),
    path.join(srcDir, 'serviceWorker.js'),
    path.join(srcDir, 'service-worker.js')
];

swFiles.forEach(swPath => {
    if (fs.existsSync(swPath)) {
        console.log('⚠️ Found service worker:', swPath);
        console.log('   This might be caching old requests!');
    }
});

// Step 5: Clean everything
console.log('\n🧹 Cleaning all caches and build artifacts...');
const dirsToClean = [
    'node_modules/.vite',
    '.vite',
    'dist',
    'build',
    '.parcel-cache',
    'node_modules/.cache'
];

dirsToClean.forEach(dir => {
    const fullPath = path.join(projectPath, dir);
    if (fs.existsSync(fullPath)) {
        console.log(`  Removing ${dir}...`);
        execSync(`rm -rf "${fullPath}"`, { stdio: 'ignore' });
    }
});

// Step 6: Check package.json for proxy settings
console.log('\n📦 Checking package.json...');
const packageJsonPath = path.join(projectPath, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.proxy) {
        console.log('⚠️ Found proxy setting:', packageJson.proxy);
        console.log('   This might interfere with Supabase connections');
    } else {
        console.log('✅ No proxy settings found');
    }
}

// Step 7: Check for localStorage/sessionStorage
console.log('\n🔍 Checking for localStorage usage...');
const jsFiles = searchForString(srcDir, 'localStorage');
const sessionFiles = searchForString(srcDir, 'sessionStorage');
if (jsFiles.length > 0 || sessionFiles.length > 0) {
    console.log('⚠️ Found localStorage/sessionStorage usage in:');
    [...new Set([...jsFiles, ...sessionFiles])].forEach(f => console.log('  -', f));
    console.log('   These might be caching old credentials!');
}

// Step 8: Create a clean Supabase client file
console.log('\n✨ Creating clean Supabase client...');
const supabaseClientCode = `import { createClient } from '@supabase/supabase-js';

// Force reload environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Add timestamp to force new evaluation
console.log('🚀 Supabase Client Initialization:', {
    url: supabaseUrl || 'NOT SET',
    key: supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'NOT SET',
    timestamp: new Date().toISOString(),
    cacheBuster: Math.random()
});

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('❌ Supabase environment variables are not set!');
    console.error('Please check your .env file and ensure it contains:');
    console.error('VITE_SUPABASE_URL=your_url_here');
    console.error('VITE_SUPABASE_ANON_KEY=your_key_here');
    throw new Error('Supabase configuration missing');
}

// Create client with cache busting
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        persistSession: false, // Disable session persistence to avoid caching issues
        autoRefreshToken: true,
        detectSessionInUrl: false
    },
    global: {
        headers: {
            'x-cache-buster': Date.now().toString()
        }
    }
});

// Add connection test
supabase.from('test').select('count').single()
    .then(({ error }) => {
        if (error && error.code !== 'PGRST116') {
            console.error('❌ Supabase connection test failed:', error.message);
        } else {
            console.log('✅ Supabase connection successful!');
        }
    });

export const isSupabaseConfigured = true;
`;

fs.writeFileSync(path.join(srcDir, 'lib', 'supabase-clean.ts'), supabaseClientCode);
console.log('✅ Created clean Supabase client at src/lib/supabase-clean.ts');

// Final recommendations
console.log('\n' + '='.repeat(50));
console.log('📝 RECOMMENDATIONS:\n');
console.log('1. ⚠️  CRITICAL: Clear your browser completely:');
console.log('   - Open Chrome DevTools (F12)');
console.log('   - Go to Application tab');
console.log('   - Clear Storage > Clear site data');
console.log('   - OR use a completely different browser\n');

console.log('2. Update all imports from:');
console.log('   import { supabase } from \'./lib/supabase\'');
console.log('   TO:');
console.log('   import { supabase } from \'./lib/supabase-clean\'\n');

console.log('3. If you have a service worker, unregister it:');
console.log('   - In Chrome DevTools > Application > Service Workers');
console.log('   - Click "Unregister" for all workers\n');

console.log('4. Start the dev server with:');
console.log('   npm run dev -- --force --port 3000');
console.log('   (Using a different port helps avoid cache)\n');

console.log('5. Test in incognito mode first\n');

console.log('✅ Script complete!');