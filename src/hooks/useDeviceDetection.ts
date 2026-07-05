import { useState, useEffect } from 'react';

export type DeviceInfo = {
  isAndroid: boolean;
  isIOS: boolean;
  isDesktop: boolean;
  isStandalone: boolean;
  isSafari: boolean;
};

export function useDeviceDetection(): DeviceInfo {
  const [device, setDevice] = useState<DeviceInfo>({
    isAndroid: false,
    isIOS: false,
    isDesktop: true,
    isStandalone: false,
    isSafari: false,
  });

  useEffect(() => {
    const detect = () => {
      const userAgent = navigator.userAgent || navigator.vendor || '';
      
      const isAndroid = /android/i.test(userAgent);
      
      const isIOS = 
        /iPad|iPhone|iPod/i.test(userAgent) || 
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
        
      const isSafari = 
        /Safari/i.test(userAgent) && 
        !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);

      const isStandalone = 
        window.matchMedia('(display-mode: standalone)').matches || 
        Boolean((navigator as any).standalone);

      const isDesktop = !isAndroid && !isIOS;

      setDevice({
        isAndroid,
        isIOS,
        isDesktop,
        isStandalone,
        isSafari,
      });
    };

    detect();

    const matchMediaListener = () => {
      setDevice(prev => ({
        ...prev,
        isStandalone: window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as any).standalone)
      }));
    };

    window.matchMedia('(display-mode: standalone)').addEventListener('change', matchMediaListener);
    return () => window.matchMedia('(display-mode: standalone)').removeEventListener('change', matchMediaListener);
  }, []);

  return device;
}
