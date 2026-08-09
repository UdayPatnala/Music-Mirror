import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [showToast, setShowToast] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowToast(true);
      const timer = setTimeout(() => setShowToast(false), 4000);
      return () => clearTimeout(timer);
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowToast(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showToast && isOnline) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 76,
        right: 24,
        zIndex: 9999,
        background: isOnline ? 'rgba(16, 185, 129, 0.95)' : 'rgba(239, 68, 68, 0.95)',
        color: '#FFFFFF',
        padding: '8px 16px',
        borderRadius: '999px',
        fontSize: '0.82rem',
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
        backdropFilter: 'blur(12px)',
        transition: 'all 0.3s ease',
      }}
    >
      {isOnline ? (
        <>
          <Wifi size={15} />
          <span>Connected — Online APIs Restored</span>
        </>
      ) : (
        <>
          <WifiOff size={15} />
          <span>Offline Mode — Serving Local Royalty-Free Audio</span>
        </>
      )}
    </div>
  );
};
