export const APP_VERSION = '1.0.0';
export const APP_BUILD_DATE = '2026-01-03';
export const APP_NAME = 'M-Host DMARC';
export const APP_TAGLINE_SL = 'Profesionalno DMARC spremljanje za Slovenijo';
export const APP_TAGLINE_EN = 'Professional DMARC Monitoring for Slovenia';
export const COPYRIGHT = '© 2026 M-Host. Vse pravice pridržane.';
export const COPYRIGHT_EN = '© 2026 M-Host. All rights reserved.';
export const MADE_IN_SLOVENIA = 'Narejeno v Sloveniji za EU';
export const MADE_IN_SLOVENIA_EN = 'Made in Slovenia for EU';

export interface SystemInfo {
  version: string;
  buildDate: string;
  appName: string;
  environment: string;
  database: string;
  auth: string;
}

export function getSystemInfo(): SystemInfo {
  return {
    version: APP_VERSION,
    buildDate: APP_BUILD_DATE,
    appName: APP_NAME,
    environment: process.env.NODE_ENV || 'development',
    database: 'PostgreSQL 16 (On-Premise)',
    auth: 'NextAuth (Credentials Provider)',
  };
}
