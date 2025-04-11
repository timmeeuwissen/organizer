export interface Feedback {
  id: string;
  message: string;
  screenshot: string; // Base64 encoded image
  consoleMessages: string;
  timestamp: number;
  seen: boolean;
  userAction?: string; // 'yes' or 'no'
}
