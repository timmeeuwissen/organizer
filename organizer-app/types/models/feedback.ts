export interface Feedback {
  id: string;
  message: string;
  screenshot: string; // Base64 encoded image
  consoleMessages: string;
  timestamp: number;
  seen: boolean;
  userAction?: string; // 'yes' or 'no'
  improved?: boolean; // Marked when feedback is processed and fixed
  improvedAt?: Date; // When the improvement was marked
  archived?: boolean; // Whether this feedback is archived (preserves history)
  archivedAt?: Date; // When the feedback was archived
  processedByClaude?: boolean; // Whether this was sent to Claude
  processedAt?: Date; // When it was processed
}
