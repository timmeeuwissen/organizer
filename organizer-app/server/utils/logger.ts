import { createLogger, format, transports } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import { join } from 'path';
import { mkdir } from 'fs/promises';
import { existsSync } from 'fs';

// Log directory path
const LOG_DIR = join(process.cwd(), 'logs');

// Ensure log directory exists
function ensureLogDir() {
  if (!existsSync(LOG_DIR)) {
    try {
      mkdir(LOG_DIR, { recursive: true });
      console.log(`Created logs directory at ${LOG_DIR}`);
    } catch (error) {
      console.error('Failed to create logs directory:', error);
    }
  }
}

// Initialize the directory
ensureLogDir();

// Create a custom format for the logs
const customFormat = format.combine(
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...meta }) => {
    return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${
      Object.keys(meta).length ? JSON.stringify(meta) : ''
    }`;
  })
);

// Create transports for access logs
const accessFileTransport = new DailyRotateFile({
  filename: join(LOG_DIR, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: customFormat
});

// Create transports for error logs
const errorFileTransport = new DailyRotateFile({
  filename: join(LOG_DIR, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m', 
  maxFiles: '14d', // Keep logs for 14 days
  level: 'error',
  format: customFormat
});

// Create transports for application logs
const appFileTransport = new DailyRotateFile({
  filename: join(LOG_DIR, 'app-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  maxSize: '20m',
  maxFiles: '14d', // Keep logs for 14 days
  format: customFormat
});

// Console transport for development
const consoleTransport = new transports.Console({
  format: format.combine(
    format.colorize(),
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.printf(({ timestamp, level, message, ...meta }) => {
      return `[${timestamp}] [${level}]: ${message} ${
        Object.keys(meta).length ? JSON.stringify(meta) : ''
      }`;
    })
  )
});

// Create different loggers for different purposes
export const accessLogger = createLogger({
  transports: [
    accessFileTransport,
    consoleTransport
  ]
});

export const errorLogger = createLogger({
  transports: [
    errorFileTransport,
    consoleTransport
  ]
});

export const appLogger = createLogger({
  transports: [
    appFileTransport,
    consoleTransport
  ]
});

// Create a stream object for Morgan
export const morganStream = {
  write: (message: string) => {
    // Remove line break that Morgan adds
    const trimmedMessage = message.trim();
    accessLogger.info(trimmedMessage);
  }
};
