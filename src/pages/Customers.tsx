import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Plus, User, AlertTriangle, AlertCircle, Filter } from 'lucide-react';
import { supabase, isSupabaseConfigured, Customer, TeamMember } from '../lib/supabase';
import taskService from '../services/taskService';
import TimeIndicator from '../components/TimeIndicator';
import SupabaseStatus from '../components/SupabaseStatus';
import { mockCustomers } from '../lib/mockData';

interface CustomerWithStats extends Customer {
  total_tasks: number;
  overdue_tasks: number;
  last_activity?: string;
}

export default function Customers() {
  const [customers, setCustomers] = useState<CustomerWithStats[]>(mockCustomers as CustomerWithStats[]);
  const [servicers, setServicers] = useState<TeamMember[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedServicer, setSelectedServicer] = useState<string>(() => {
    return localStorage.getItem('selectedServicer') || '';
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isSupabaseConfigured && supabase) {
      fetchCustomers();
      fetchServicers();
    } else {
      // Use mock data when Supabase is not configured
      setCustomers(mockCustomers as CustomerWithStats[]);
      setLoading(false);
    }
  }, []);

  const fetchServicers = async () => {
    if (!supabase) return;
    
    try {
      const { data: servicersData, error } = await supabase
        .from('tbl_team_member')
        .select('*')
        .order('name');

      if (error) throw error;
      setServicers(servicersData || []);
    } catch (error) {
      console.error('Error fetching servicers:', error);
    }
  };

  const fetchCustomers = async () => {
    if (!supabase) return;
    
    try {
      // Get all active customers with their assigned servicer info
      const { data: customersData, error: customersError } = await supabase
        .from('v_customer_with_assignment')
        .select(`
          *
        `)
        .eq('customer_type', 'active')
        .order('display_name');

      if (customersError) throw customersError;

      if (customersData) {
        // Get task counts and stats for each customer using the task service
        const customersWithStats = await Promise.all(
          customersData.map(async (customer) => {
            const stats = await taskService.getCustomerStats(customer.phone);

            return {
              ...customer,
              assigned_servicer_name: customer.team_member_name || 'Unassigned',
              total_tasks: stats.totalTasks,
              overdue_tasks: stats.staleTasks,
              last_activity: stats.lastUpdate
            };
          })
        );

        setCustomers(customersWithStats);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = customer.display_name?.toLowerCase()?.includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase()?.includes(searchTerm.toLowerCase());
    
    const matchesServicer = !selectedServicer || customer.team_member_id === selectedServicer;
    
    return matchesSearch && matchesServicer;
  });

  if (loading && isSupabaseConfigured) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
              <strong>Demo Mode:</strong> You're viewing sample customers. 
              Connect to Supabase to manage real customer data.
            </p>
          </div>
        </div>
      )}
      
      {isSupabaseConfigured && <SupabaseStatus />}
      
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage customer tasks and track progress</p>
        </div>
        <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors">
          <Plus className="h-4 w-4 mr-2" />
          Add Customer
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex space-x-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-sm"
            placeholder="Search customers by name or email..."
          />
        </div>
        
        {isSupabaseConfigured && (
          <div className="w-64 relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Filter className="h-5 w-5 text-gray-400" />
            </div>
            <select
              value={selectedServicer}
              onChange={(e) => {
                const value = e.target.value;
                setSelectedServicer(value);
                if (value) {
                  localStorage.setItem('selectedServicer', value);
                } else {
                  localStorage.removeItem('selectedServicer');
                }
              }}
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

      {/* Customers Grid */}
      {filteredCustomers.length === 0 ? (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No customers found</h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding a customer.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCustomers.map((customer) => (
            <Link
              key={customer.phone}
              to={`/customers/${customer.phone}`}
              className="block bg-white overflow-hidden shadow-sm rounded-lg border hover:shadow-md transition-shadow group"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                          {customer.display_name}
                        </h3>
                        {customer.flags && customer.flags.length > 0 && (
                          <div className="flex gap-1">
                            {customer.flags.map((flag, idx) => (
                              <span key={idx} className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                {flag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{customer.email}</p>
                      {isSupabaseConfigured && (
                        <p className="text-xs text-gray-400">
                          Servicer: {customer.assigned_servicer_name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-900">{customer.total_tasks}</div>
                    <div className="text-xs text-gray-500">Total Tasks</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${customer.overdue_tasks > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {customer.overdue_tasks}
                    </div>
                    <div className="text-xs text-gray-500">Overdue</div>
                  </div>
                </div>

                {customer.overdue_tasks > 0 && (
                  <div className="flex items-center text-red-600 text-sm mb-3">
                    <AlertTriangle className="h-4 w-4 mr-1" />
                    Needs attention
                  </div>
                )}

                <TimeIndicator 
                  lastUpdate={customer.last_activity || customer.created_at}
                  className="text-xs"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}