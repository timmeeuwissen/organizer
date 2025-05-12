import { IncomingMessage } from 'http';

declare global {
  namespace NodeJS {
    interface Global {
      // Add any global properties if needed
    }
  }
}

// Extend the IncomingMessage interface
declare module 'http' {
  interface IncomingMessage {
    _startTime?: number;
    routeName?: string;
  }
}

// Augment morgan module
declare module 'morgan' {
  interface TokenIndexer {
    [key: string]: any;
  }
}

export {}; // Make this file a module
