/**
 * NextStudy OS — Application Configuration (M1)
 * Extracts environment-specific endpoints and runtime configuration.
 */

export interface AppConfig {
  apiBaseUrl: string;
  spreadsheetId: string;
  environment: 'development' | 'production';
  appName: string;
  version: string;
}

export const appConfig: AppConfig = {
  apiBaseUrl:
    import.meta.env.VITE_API_BASE_URL ||
    'https://script.google.com/macros/s/AKfycbxXeb2rAbVYzSu072j6Z5s8vLi1FJ8VgEkkXDCnVq0ugYq-fCRQ25TNGyg6EP8wwhV9/exec',
  spreadsheetId:
    import.meta.env.VITE_SPREADSHEET_ID ||
    '1i9yRvYVmAdTquwcAZaGzgfJOIjyvaXvC07hDKDMA3yU',
  environment: import.meta.env.DEV ? 'development' : 'production',
  appName: 'NextStudy OS',
  version: '3.0.0',
};
