import { useState, useEffect } from 'react';
import { formatDistance } from 'date-fns';

export function useTimeTracking(startTime?: string, lastUpdate?: string) {
  const [timeData, setTimeData] = useState({
    timeSinceStart: '',
    timeSinceUpdate: '',
    urgencyColor: 'text-gray-500'
  });

  useEffect(() => {
    const updateTimes = () => {
      const now = new Date();
      
      let timeSinceStart = '';
      if (startTime) {
        timeSinceStart = formatDistance(new Date(startTime), now, { addSuffix: true });
      }
      
      let timeSinceUpdate = '';
      let urgencyColor = 'text-gray-500';
      
      if (lastUpdate) {
        const updateDate = new Date(lastUpdate);
        timeSinceUpdate = formatDistance(updateDate, now, { addSuffix: true });
        
        const hoursDiff = Math.abs(now.getTime() - updateDate.getTime()) / (1000 * 60 * 60);
        
        if (hoursDiff <= 24) {
          urgencyColor = 'text-green-600';
        } else if (hoursDiff <= 48) {
          urgencyColor = 'text-yellow-600';
        } else if (hoursDiff <= 96) {
          urgencyColor = 'text-orange-600';
        } else {
          urgencyColor = 'text-red-600';
        }
      }
      
      setTimeData({ timeSinceStart, timeSinceUpdate, urgencyColor });
    };
    
    updateTimes();
    const interval = setInterval(updateTimes, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, [startTime, lastUpdate]);
  
  return timeData;
}