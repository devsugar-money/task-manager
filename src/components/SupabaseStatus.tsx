import React from 'react';
import { Database, AlertCircle, ExternalLink } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export default function SupabaseStatus() {
  if (isSupabaseConfigured) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Database className="h-6 w-6 text-blue-600" />
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-blue-900">
            Connect to Supabase Database
          </h3>
          <div className="mt-2 text-sm text-blue-700">
            <p className="mb-3">
              This application requires a Supabase database connection to store and manage your task data. 
              Click the "Connect to Supabase" button in the top right corner to set up your database.
            </p>
            <div className="bg-blue-100 rounded p-3 mb-3">
              <h4 className="font-medium text-blue-900 mb-2">What you'll get:</h4>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>Customer and task management</li>
                <li>Real-time update tracking</li>
                <li>Complete audit trail</li>
                <li>Dashboard analytics</li>
              </ul>
            </div>
            <div className="flex items-center text-blue-600">
              <AlertCircle className="h-4 w-4 mr-1" />
              <span className="text-xs">
                Once connected, the database schema will be automatically created
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}