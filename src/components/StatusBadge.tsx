import React from 'react';

interface StatusBadgeProps {
  status: string;
  customStatus?: string;
  isComplete?: boolean;
}

export default function StatusBadge({ status, customStatus, isComplete }: StatusBadgeProps) {
  const displayStatus = customStatus || status;
  
  const getStatusColor = (status: string, isComplete?: boolean) => {
    if (isComplete) return 'bg-green-100 text-green-800';
    
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'ongoing':
        return 'bg-blue-100 text-blue-800';
      case 'not started':
        return 'bg-gray-100 text-gray-800';
      case 'waiting on info':
      case 'waiting on partner':
        return 'bg-yellow-100 text-yellow-800';
      case 'blocked':
        return 'bg-red-100 text-red-800';
      case 'slow info':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-purple-100 text-purple-800';
    }
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(displayStatus, isComplete)}`}>
      {displayStatus}
    </span>
  );
}