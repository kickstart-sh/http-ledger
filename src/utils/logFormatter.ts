import os from 'os';
import {
  FormatLogDataParams,
  LogData,
  LogError,
  IpInfo,
  LogLevel,
} from '../types';

/**
 * Safely converts an error object to a LogError interface
 */
const normalizeError = (error: unknown): LogError | undefined => {
  if (!error) return undefined;

  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack,
      ...((error as any).code && { code: (error as any).code }),
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    const result: any = {
      message: String(
        errorObj.message || errorObj.msg || errorObj.error || 'Unknown error',
      ),
      ...errorObj,
    };

    if (errorObj.name) {
      result.name = String(errorObj.name);
    }
    if (errorObj.stack) {
      result.stack = String(errorObj.stack);
    }
    if (errorObj.code !== undefined) {
      result.code = errorObj.code as string | number;
    }

    return result;
  }

  return { message: String(error) };
};

/**
 * Deep clone an object to avoid mutating the original
 */
const deepClone = (obj: unknown): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(deepClone);
  }

  const cloned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    cloned[key] = deepClone(value);
  }

  return cloned;
};

/**
 * Recursively mask sensitive fields in an object
 */
const maskSensitiveFields = (obj: unknown, maskFields: string[]): unknown => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => maskSensitiveFields(item, maskFields));
  }

  const masked: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (maskFields.some((field) => field.toLowerCase() === key.toLowerCase())) {
      masked[key] = typeof value === 'string' ? '***MASKED***' : '***MASKED***';
    } else if (typeof value === 'object' && value !== null) {
      masked[key] = maskSensitiveFields(value, maskFields);
    } else {
      masked[key] = value;
    }
  }

  return masked;
};

/**
 * Safely filters headers based on excluded headers list
 */
const filterHeaders = (
  headers: Record<string, string | string[] | undefined>,
  excludedHeaders: string[],
): Record<string, string | string[] | undefined> => {
  const filteredHeaders: Record<string, string | string[] | undefined> = {};
  const excludedSet = new Set(excludedHeaders.map((h) => h.toLowerCase()));

  for (const [key, value] of Object.entries(headers)) {
    if (!excludedSet.has(key.toLowerCase())) {
      filteredHeaders[key] = value;
    }
  }

  return filteredHeaders;
};

/**
 * Safely extracts query parameters
 */
const extractQueryParams = (
  query: Record<string, unknown>,
): Record<string, unknown> => {
  try {
    return { ...query };
  } catch {
    return {};
  }
};

/**
 * The `formatLogData` function formats log data based on specified parameters.
 * @param params - The parameters containing request, response, and formatting options
 * @returns A LogData object containing formatted log information
 */
export const formatLogData = (params: FormatLogDataParams): LogData => {
  const {
    req,
    res,
    responseBody,
    timeTaken,
    excludedHeaders,
    ipInfo,
    logBody,
    logResponse,
    timestamp,
    requestSize,
    responseSize,
    logQueryParams,
    error,
    maskFields = [],
    customFormatter,
    customLogLevel,
  } = params;

  // Filter headers based on excluded list
  const filteredHeaders = filterHeaders(req.headers, excludedHeaders);

  // Extract query parameters safely
  const queryParamsToLog = logQueryParams ? extractQueryParams(req.query) : {};

  // Normalize error if present
  const normalizedError = normalizeError(error);

  // Build the log data object
  const log: LogData = {
    method: req.method,
    url: req.originalUrl || req.url,
    statusCode: res.statusCode,
    timeTaken,
    requestSize,
    responseSize,
    timestamp,
    headers: filteredHeaders,
    queryParams: queryParamsToLog,
    hostname: os.hostname(),
  };

  // Add optional properties only if they exist
  const userAgent = req.headers['user-agent'];
  if (userAgent) {
    log.userAgent = userAgent;
  }
  const referer = req.headers['referer'];
  if (referer) {
    log.referer = referer;
  }
  const contentType = req.headers['content-type'];
  if (contentType) {
    log.requestContentType = contentType;
  }
  const responseContentType = res.get('Content-Type');
  if (responseContentType) {
    log.responseContentType = responseContentType;
  }
  if (req.httpVersion) {
    log.httpVersion = req.httpVersion;
  }
  const requestId = req.headers['x-request-id'];
  if (requestId) {
    log.requestId = requestId as string;
  }

  // Add request body if logging is enabled and body exists
  if (logBody && req.body !== undefined && req.body !== null) {
    log.body = req.body;
  }

  // Add response body if logging is enabled and body exists
  if (logResponse && responseBody !== undefined && responseBody !== null) {
    log.responseBody = responseBody;
  }

  // Add IP info if available
  if (ipInfo && Object.keys(ipInfo).length > 0) {
    log.ipInfo = ipInfo as IpInfo;
  }

  // Add error if present
  if (normalizedError) {
    log.error = normalizedError;
  }

  // Apply masking if maskFields are provided
  if (maskFields.length > 0) {
    log.headers = maskSensitiveFields(log.headers, maskFields) as Record<
      string,
      string | string[] | undefined
    >;
    log.queryParams = maskSensitiveFields(
      log.queryParams,
      maskFields,
    ) as Record<string, unknown>;
    if (log.body) {
      log.body = maskSensitiveFields(log.body, maskFields);
    }
    if (log.responseBody) {
      log.responseBody = maskSensitiveFields(log.responseBody, maskFields);
    }
  }

  // Apply custom log level if provided
  if (customLogLevel) {
    log.logLevel = customLogLevel(log);
  }

  // Apply custom formatter if provided
  if (customFormatter) {
    return customFormatter(log) as LogData;
  }

  return log;
};
