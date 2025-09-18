import React from 'react';
import { Clock } from 'lucide-react';
import { useTimeTracking } from '../hooks/useTimeTracking';

interface TimeIndicatorProps {
  startTime?: string;
  lastUpdate?: string;
  startDate?: string;
  showStartTime?: boolean;
  showStartDate?: boolean;
  className?: string;
}

export default function TimeIndicator({ 
  startTime, 
  lastUpdate, 
  startDate,
  showStartTime = false,
  showStartDate = false,
  className = ''
}: TimeIndicatorProps) {
  const { timeSinceStart, timeSinceUpdate, urgencyColor } = useTimeTracking(startDate || startTime, lastUpdate);
  
  return (
    <div className={`flex items-center space-x-4 text-xs ${className}`}>
      {(showStartTime && startTime) && (
        <div className="flex items-center text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          Started {timeSinceStart}
        </div>
      )}
      {(showStartDate && startDate) && (
        <div className="flex items-center text-gray-500">
          <Clock className="w-3 h-3 mr-1" />
          Started {timeSinceStart}
        </div>
      )}
      {lastUpdate && (
        <div className={`flex items-center ${urgencyColor} font-medium`}>
          <Clock className="w-3 h-3 mr-1" />
          Updated {timeSinceUpdate}
        </div>
      )}
      {!lastUpdate && (
        <div className="flex items-center text-red-600 font-medium">
          <Clock className="w-3 h-3 mr-1" />
          Never updated
        </div>
      )}
    </div>
  );
}