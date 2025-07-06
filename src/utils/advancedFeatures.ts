import { Request, Response } from 'express';
import { LogData, LogLevel } from '../types';

/**
 * Generate a UUID v4 for request ID
 */
export const generateRequestId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Add request ID to response headers if auto-generate is enabled
 */
export const addRequestIdToResponse = (
  req: Request,
  res: Response,
  autoGenerateRequestId: boolean,
): string | undefined => {
  let requestId = req.headers['x-request-id'] as string;

  if (!requestId && autoGenerateRequestId) {
    requestId = generateRequestId();
    res.setHeader('X-Request-ID', requestId);
  }

  return requestId;
};

/**
 * Determine if a request should be logged based on sampling rate
 */
export const shouldLogBasedOnSampling = (logSampling?: number): boolean => {
  if (logSampling === undefined || logSampling === 1) {
    return true;
  }

  if (logSampling <= 0) {
    return false;
  }

  return Math.random() < logSampling;
};

/**
 * Default log level function based on status code and errors
 */
export const getDefaultLogLevel = (logData: LogData): LogLevel => {
  if (logData.error) {
    return 'error';
  }

  if (logData.statusCode >= 400) {
    return 'warn';
  }

  return 'info';
};

/**
 * Get the appropriate console method based on log level
 */
export const getConsoleMethod = (
  logLevel: LogLevel,
): 'log' | 'warn' | 'error' => {
  switch (logLevel) {
    case 'error':
      return 'error';
    case 'warn':
      return 'warn';
    case 'info':
    default:
      return 'log';
  }
};
