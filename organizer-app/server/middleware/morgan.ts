import { defineEventHandler, getRequestURL } from 'h3';
import morgan from 'morgan';
import { morganStream, errorLogger } from '../utils/logger';

// Create a custom Morgan format string with all the information we need
const morganFormat = ':remote-addr - :date[clf] ":method :url HTTP/:http-version" :status :response-time ms ":user-agent"';

// Response time token
morgan.token('response-time', (req, res) => {
  if (!req._startTime) {
    return '';
  }
  const time = (Date.now() - req._startTime);
  return `${time.toFixed(2)}`;
});

// Create Nuxt server middleware for logging
export default defineEventHandler(async (event) => {
  const req = event.node.req;
  const res = event.node.res;
  
  // Mark the start time for response time calculation
  req._startTime = Date.now();
  
  // Get URL info for detailed logging
  const url = getRequestURL(event);
  req.routeName = url.pathname;
  
  // Set up error logging
  const originalEnd = res.end;
  // @ts-ignore - We need to override the end method but TypeScript doesn't like it
  res.end = function() {
    // Log errors for 4xx and 5xx responses
    const statusCode = res.statusCode;
    if (statusCode >= 400) {
      errorLogger.error(`HTTP ${statusCode} - ${req.method} ${url.pathname}`, {
        method: req.method,
        url: url.pathname,
        query: url.searchParams.toString(),
        statusCode,
        responseTime: Date.now() - (req._startTime || 0),
        userAgent: req.headers['user-agent']
      });
    }
    
    // Call the original end method
    // @ts-ignore - We're just passing through the arguments
    return originalEnd.apply(this, arguments);
  };
  
  // Execute Morgan logging
  return new Promise<void>((resolve) => {
    morgan(morganFormat, { stream: morganStream })(req, res, () => {
      resolve();
    });
  });
});
