import { Request, Response } from 'express';

/**
 * Interface for the timestamp object, tracking request and response times.
 */
export interface Timestamp {
  request?: string; // ISO string of the request start time
  response?: string; // ISO string of the response end time
}

/**
 * Interface for the log data object, containing all information to be logged.
 */
export interface LogData {
  method: string;
  url: string;
  statusCode: number;
  timeTaken: number; // Time taken for the request-response cycle in milliseconds
  requestSize: number; // Size of the request body in bytes
  responseSize: number; // Size of the response body in bytes
  timestamp: Timestamp;
  headers: Record<string, string | string[] | undefined>; // Request headers
  queryParams: Record<string, any>; // Request query parameters
  body?: unknown; // Request body (optional)
  responseBody?: unknown; // Response body (optional)
  ipInfo?: Record<string, any>; // IP information (optional)
  error?: unknown; // Error object (optional)
  userAgent?: string; // User-Agent header from the request
  referer?: string; // Referer header from the request
  requestContentType?: string; // Content-Type of the request
  responseContentType?: string; // Content-Type of the response
  httpVersion?: string; // HTTP protocol version
  requestId?: unknown; // Request ID from headers (if available)
  hostname?: string; // Hostname of the server handling the request
}

/**
 * Interface for the options passed to the logger middleware.
 */
export interface ApiLoggerOptions {
  logBody?: boolean; // Whether to log the request body
  logResponse?: boolean; // Whether to log the response body
  logQueryParams?: boolean; // Whether to log query parameters
  excludedHeaders?: string[]; // List of headers to exclude from logs
  getIpInfo?: (ip: string) => Promise<Record<string, any>>; // Optional function to get IP information
}

/**
 * Interface for the parameters passed to the formatLogData utility.
 */
export interface FormatLogDataParams {
  req: Request;
  res: Response;
  responseBody: unknown;
  timeTaken: number;
  excludedHeaders: string[];
  ipInfo: Record<string, any>;
  logBody: boolean;
  logResponse: boolean;
  timestamp: Timestamp;
  requestSize: number;
  responseSize: number;
  logQueryParams: boolean;
  error: unknown;
}
