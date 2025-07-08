import { Request, Response } from 'express';

export interface Config {
  logBody: boolean;
  logResponse: boolean;
  retryLimit: number;
  excludedHeaders: string[];
  debug: boolean;
  externalApiUrl?: string;
  getIpInfo?: unknown;
}

/**
 * Interface for the timestamp object, tracking request and response times.
 */
export interface Timestamp {
  request: string; // ISO string of the request start time
  response?: string; // ISO string of the response end time
}

/**
 * Interface for IP information that can be returned by getIpInfo function
 */
export interface IpInfo {
  ip?: string;
  country?: string;
  region?: string;
  city?: string;
  timezone?: string;
  [key: string]: unknown;
}

/**
 * Interface for error information in logs
 */
export interface LogError {
  message: string;
  name?: string;
  stack?: string;
  code?: string | number;
  [key: string]: unknown;
}

/**
 * Log level types
 */
export type LogLevel = 'info' | 'warn' | 'error';

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
  queryParams: Record<string, unknown>; // Request query parameters
  body?: unknown; // Request body (optional)
  responseBody?: unknown; // Response body (optional)
  ipInfo?: IpInfo; // IP information (optional)
  error?: LogError; // Error object (optional)
  userAgent?: string; // User-Agent header from the request
  referer?: string; // Referer header from the request
  requestContentType?: string; // Content-Type of the request
  responseContentType?: string; // Content-Type of the response
  httpVersion?: string; // HTTP protocol version
  requestId?: string; // Request ID from headers (if available)
  hostname?: string; // Hostname of the server handling the request
  logLevel?: LogLevel; // Log level for this request
}

/**
 * Interface for the options passed to the logger middleware.
 */
export interface ApiLoggerOptions {
  logBody?: boolean; // Whether to log the request body
  logResponse?: boolean; // Whether to log the response body
  logQueryParams?: boolean; // Whether to log query parameters
  excludedHeaders?: string[]; // List of headers to exclude from logs (case-insensitive)
  getIpInfo?: (ip: string) => Promise<IpInfo>; // Optional function to get IP information
  onLog?: (logData: LogData) => void | Promise<void>; // Optional callback to receive log data
  maskFields?: string[]; // List of field names to mask in body, headers, and query params
  customLogLevel?: (logData: LogData) => LogLevel; // Custom function to determine log level
  customFormatter?: (logData: LogData) => unknown; // Custom function to format log data
  autoGenerateRequestId?: boolean; // Whether to auto-generate request ID if not present
  shouldLog?: (req: Request, res: Response) => boolean; // Function to decide whether to log
  logSampling?: number; // Sampling rate (0-1, e.g., 0.1 = 10% of requests)
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
  ipInfo: IpInfo;
  logBody: boolean;
  logResponse: boolean;
  timestamp: Timestamp;
  requestSize: number;
  responseSize: number;
  logQueryParams: boolean;
  error: unknown;
  maskFields?: string[];
  customFormatter?: ((logData: LogData) => unknown) | undefined;
  customLogLevel?: ((logData: LogData) => LogLevel) | undefined;
}
