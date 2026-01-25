// src/lib/utils/device.ts
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check user agent
  const ua = navigator.userAgent.toLowerCase();
  const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
  
  // Check screen size as backup
  const isSmallScreen = window.innerWidth < 768;
  
  return isMobile || isSmallScreen;
}