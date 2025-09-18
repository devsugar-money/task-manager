import React, { useState, useEffect } from 'react';

interface TimeSinceContactProps {
  lastContactDate: string | null;
  method: string;
}

export default function TimeSinceContact({ lastContactDate, method }: TimeSinceContactProps) {
  const [timeAgo, setTimeAgo] = useState<string>('Never');

  useEffect(() => {
    const calculateTimeAgo = () => {
      if (!lastContactDate) {
        setTimeAgo('Never');
        return;
      }

      const now = new Date();
      const lastContact = new Date(lastContactDate);
      const diffInSeconds = Math.floor((now.getTime() - lastContact.getTime()) / 1000);

      if (diffInSeconds < 60) {
        setTimeAgo('Just now');
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        setTimeAgo(`${minutes} minute${minutes !== 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        setTimeAgo(`${hours} hour${hours !== 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        setTimeAgo(`${days} day${days !== 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 2592000) {
        const weeks = Math.floor(diffInSeconds / 604800);
        setTimeAgo(`${weeks} week${weeks !== 1 ? 's' : ''} ago`);
      } else if (diffInSeconds < 31536000) {
        const months = Math.floor(diffInSeconds / 2592000);
        setTimeAgo(`${months} month${months !== 1 ? 's' : ''} ago`);
      } else {
        const years = Math.floor(diffInSeconds / 31536000);
        setTimeAgo(`${years} year${years !== 1 ? 's' : ''} ago`);
      }
    };

    calculateTimeAgo();
    // Update every minute
    const interval = setInterval(calculateTimeAgo, 60000);

    return () => clearInterval(interval);
  }, [lastContactDate]);

  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-600">{method}:</span>
      <div className="text-right">
        <span className="text-xs font-medium text-gray-800">{timeAgo}</span>
        {lastContactDate && (
          <div className="text-xs text-gray-500">
            {new Date(lastContactDate).toLocaleDateString()} {new Date(lastContactDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
      </div>
    </div>
  );
}